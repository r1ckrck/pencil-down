// Session lifecycle (spec §5.2, §5.3, §5.7). The server owns the clock: every state change is
// derived from stored timestamps, and `settle` replays whatever the clock implies (forced skips,
// section expiry, Part B auto-commits) before any read or write. Nothing here can pause a session.
import type { Content } from "../content/load";
import type { Format, Generator, MarkScheme, Slot, Topic } from "../content/types";
import { KINDS, type Kind, hasPartA, hasPartB } from "./kinds";
import { type Db, tx } from "../db/db";
import { ApiError, badRequest, conflict, notFound } from "./errors";
import { dueQuestionIds, recordOutcome } from "./errorlog";
import { questionKey } from "./items";
import { type Mode, type Switches, isMode, switchesFor } from "./modes";
import { type Timeline, B_MOCK_MINUTES, drillTimeline, paperTimeline } from "./partb";
import { CURRENT_SCHEME, type AnswerInput, fullMarks, normaliseInput, scoreAnswer } from "./scoring";
import {
  type PoolState,
  type Rand,
  type ServedItem,
  assembleDrill,
  assembleMock,
  assemblePastPaper,
  assembleRevisit,
  leastPractisedSlot,
  selectDrillPrompt,
  selectMockPrompts,
  selectPastPaperPrompts,
} from "./selection";
import { getSettings, updateSettings } from "./settings";
import { generatedQuestion, saveSnapshot } from "./snapshots";

export interface Ctx {
  db: Db;
  content: Content;
  generators: Generator[]; // current registry: new generated items come from here
  legacyGenerators?: Generator[]; // frozen first generators for ids served before snapshots; defaults to legacy-v1
  now: () => number; // epoch ms; injectable for tests
  rand: Rand;
}

export const MOCK_MINUTES = 60;
const MIN = 60_000;

export interface SessionConfig {
  switches: Switches;
  budgets: Record<Format, number>; // seconds
  scheme: MarkScheme;
  paperId?: string;
  bPaperId?: string;
  topic?: Topic | null;
  format?: Format | null;
  n?: number;
  slot?: Slot;
  retake?: boolean;
  timeline?: Timeline; // Part B; seconds relative to b_started_at
}

export interface SessionRow {
  id: number;
  kind: Kind;
  mode: Mode;
  config: SessionConfig;
  started_at: number;
  ends_at: number;
  ended_at: number | null;
  status: "live" | "completed" | "quit" | "expired";
  a_ends_at: number | null;
  a_closed_at: number | null;
  a_status: string | null;
  a_phase: "first-pass" | "revisit" | null;
  b_started_at: number | null;
  score: number | null;
  max_score: number | null;
}

export interface ResponseRow {
  session_id: number;
  pos: number;
  question_id: string;
  source: "real" | "generated";
  format: Format;
  topic: Topic;
  budget_ms: number;
  answer: string | null;
  confidence: "sure" | "unsure";
  marked: number;
  in_queue: number;
  time_ms: number;
  visits: number;
  forced_skip: number;
  outcome: string | null;
  marks: number | null;
}

export interface VisitRow {
  id: number;
  session_id: number;
  pos: number;
  started_at: number;
  budget_ms: number;
  ended_at: number | null;
  end_reason: string | null;
}

export interface AttemptRow {
  id: number;
  session_id: number;
  pos: number;
  prompt_id: string;
  slot: Slot;
  phases: string;
  block_start_s: number;
  block_end_s: number;
  commit_deadline_s: number;
  status: "pending" | "committed" | "abandoned";
  committed_at: number | null;
  seconds_to_commit: number | null;
  idea_count: number;
  auto_committed: number;
  committed_idea_id: number | null;
  commit_label: string | null;
  checks: string | null;
}

// ---------- rows ----------

export function getSession(db: Db, id: number): SessionRow {
  const r = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as (Omit<SessionRow, "config"> & { config: string }) | undefined;
  if (!r) throw notFound("session");
  return { ...r, config: JSON.parse(r.config) };
}

export function liveSessionId(db: Db): number | null {
  const r = db.prepare("SELECT id FROM sessions WHERE status = 'live'").get() as { id: number } | undefined;
  return r?.id ?? null;
}

export function responses(db: Db, sid: number): ResponseRow[] {
  return db.prepare("SELECT * FROM a_responses WHERE session_id = ? ORDER BY pos").all(sid) as unknown as ResponseRow[];
}

function response(db: Db, sid: number, pos: number): ResponseRow {
  const r = db.prepare("SELECT * FROM a_responses WHERE session_id = ? AND pos = ?").get(sid, pos) as ResponseRow | undefined;
  if (!r) throw notFound("question position");
  return r;
}

export function openVisit(db: Db, sid: number): VisitRow | null {
  return (db.prepare("SELECT * FROM a_visits WHERE session_id = ? AND ended_at IS NULL").get(sid) as VisitRow | undefined) ?? null;
}

export function attempts(db: Db, sid: number): AttemptRow[] {
  return db.prepare("SELECT * FROM b_attempts WHERE session_id = ? ORDER BY pos").all(sid) as unknown as AttemptRow[];
}

export function poolState(db: Db): PoolState {
  const retired = new Set(
    (db.prepare("SELECT question_id FROM mastery WHERE retired_at IS NOT NULL").all() as { question_id: string }[]).map(
      (r) => r.question_id,
    ),
  );
  const seen = new Map(
    (db.prepare("SELECT item_id, last_seen FROM seen").all() as { item_id: string; last_seen: number }[]).map((r) => [
      r.item_id,
      r.last_seen,
    ]),
  );
  return { retired, seen };
}

function markSeen(db: Db, ids: string[], kind: "a" | "b" | "card", now: number) {
  const stmt = db.prepare(
    `INSERT INTO seen (item_id, kind, first_seen, last_seen, times) VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(item_id) DO UPDATE SET last_seen = excluded.last_seen, times = times + 1`,
  );
  for (const id of ids) stmt.run(id, kind, now, now);
}

// ---------- create ----------

export interface CreateRequest {
  kind: Kind;
  mode?: Mode;
  paperId?: string;
  bPaperId?: string;
  topic?: Topic | null;
  format?: Format | null;
  n?: number;
  slot?: Slot | null;
  promptId?: string; // b-drill: re-attempt this exact prompt (journal)
}

export function createSession(ctx: Ctx, req: CreateRequest): SessionRow {
  const { db, content, generators } = ctx;
  if (!KINDS.includes(req.kind)) throw badRequest("unknown session kind");
  return tx(db, () => {
    const live = liveSessionId(db);
    if (live !== null) {
      settle(ctx, live);
      if (getSession(db, live).status === "live") throw conflict("a session is already live", { sessionId: live });
    }
    const now = ctx.now();
    const settings = getSettings(db);
    const mode: Mode = req.mode ?? settings.lastMode;
    if (!isMode(mode)) throw badRequest("mode must be easy | hard | custom");
    const pool = poolState(db);
    const config: SessionConfig = {
      switches: switchesFor(mode, settings.custom),
      budgets: settings.budgets,
      scheme: CURRENT_SCHEME,
    };
    const kind = req.kind;

    // Part A items and section length
    let items: ServedItem[] = [];
    let aMinutes = 0;
    if (kind === "mock" || kind === "full") {
      items = assembleMock(content, generators, pool, ctx.rand);
      aMinutes = MOCK_MINUTES;
    } else if (kind === "drill") {
      const n = req.n ?? 10;
      if (!Number.isInteger(n) || n < 1 || n > 44) throw badRequest("n must be 1–44");
      items = assembleDrill(content, generators, pool, ctx.rand, { topic: req.topic, format: req.format, n });
      Object.assign(config, { topic: req.topic ?? null, format: req.format ?? null, n });
    } else if (kind === "revisit") {
      items = assembleRevisit(content, (id) => generatedQuestion(ctx, id), pool, dueQuestionIds(db, now));
    } else if (kind === "past-paper") {
      const paper = req.paperId ? content.paperById.get(req.paperId) : undefined;
      if (!paper) throw badRequest("unknown paperId");
      items = assemblePastPaper(content, paper.id);
      aMinutes = paper.durationMin;
      config.scheme = paper.scheme;
      config.paperId = paper.id;
      config.retake = !!db
        .prepare("SELECT 1 FROM sessions WHERE kind = 'past-paper' AND json_extract(config, '$.paperId') = ?")
        .get(paper.id);
    }
    if (hasPartA(kind) && !items.length) throw new ApiError(422, "no questions available for this session");
    if (kind === "drill" || kind === "revisit")
      aMinutes = items.reduce((s, it) => s + config.budgets[it.format], 0) / 60;

    // Part B prompts and timeline
    let prompts: { id: string; slot: Slot }[] = [];
    if (kind === "b-drill") {
      const counts = Object.fromEntries(
        (db.prepare("SELECT slot, COUNT(*) AS n FROM b_attempts GROUP BY slot").all() as { slot: Slot; n: number }[]).map(
          (r) => [r.slot, r.n],
        ),
      );
      // A re-attempt names its prompt; otherwise the slot picked (or least practised), unseen first.
      const again = req.promptId != null ? content.promptById.get(req.promptId) : undefined;
      if (req.promptId != null && !again) throw badRequest("unknown promptId");
      if (again && req.slot && req.slot !== again.slot) throw badRequest("promptId belongs to another slot");
      const slot = again?.slot ?? req.slot ?? leastPractisedSlot(counts);
      const p = again ?? selectDrillPrompt(content, pool, ctx.rand, slot);
      if (!p) throw new ApiError(422, `no prompts available for ${slot}`);
      prompts = [p];
      config.slot = slot;
      config.timeline = drillTimeline(slot);
    } else if (kind === "b-mock" || kind === "full") {
      prompts = selectMockPrompts(content, pool, ctx.rand);
      if (!prompts.length) throw new ApiError(422, "no prompts available");
      config.timeline = paperTimeline(prompts.map((p) => p.slot), B_MOCK_MINUTES);
    } else if (kind === "b-past-paper") {
      const paper = req.bPaperId ? content.bPaperById.get(req.bPaperId) : undefined;
      if (!paper) throw badRequest("unknown bPaperId");
      prompts = selectPastPaperPrompts(content, paper.id);
      config.bPaperId = paper.id;
      config.retake = !!db
        .prepare("SELECT 1 FROM sessions WHERE kind = 'b-past-paper' AND json_extract(config, '$.bPaperId') = ?")
        .get(paper.id);
      config.timeline = paperTimeline(prompts.map((p) => p.slot), paper.durationMin);
    }

    const aMs = Math.round(aMinutes * MIN);
    const bMs = config.timeline ? config.timeline.total * 1000 : 0;
    const aEnds = hasPartA(kind) ? now + aMs : null;
    const bStart = hasPartA(kind) ? null : now;
    const endsAt = now + aMs + bMs;

    const sid = Number(
      db
        .prepare(
          `INSERT INTO sessions (kind, mode, config, started_at, ends_at, status, a_ends_at, a_phase, b_started_at)
           VALUES (?, ?, ?, ?, ?, 'live', ?, ?, ?)`,
        )
        .run(kind, mode, JSON.stringify(config), now, endsAt, aEnds, hasPartA(kind) ? "first-pass" : null, bStart)
        .lastInsertRowid,
    );

    const insItem = db.prepare(
      `INSERT INTO a_responses (session_id, pos, question_id, source, format, topic, budget_ms) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    items.forEach((it, pos) => {
      insItem.run(sid, pos, it.questionId, it.source, it.format, it.topic, config.budgets[it.format] * 1000);
      if (it.question) saveSnapshot(db, it.question, "current", now);
    });
    if (items.length) startVisit(db, sid, 0, now);

    const insAttempt = db.prepare(
      `INSERT INTO b_attempts (session_id, pos, prompt_id, slot, phases, block_start_s, block_end_s, commit_deadline_s)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    config.timeline?.blocks.forEach((b) =>
      insAttempt.run(sid, b.pos, prompts[b.pos].id, b.slot, JSON.stringify(b.phases), b.start, b.end, b.commitDeadline),
    );

    markSeen(db, items.map((i) => i.questionId), "a", now);
    markSeen(db, prompts.map((p) => p.id), "b", now);
    updateSettings(db, { lastMode: mode });
    return getSession(db, sid);
  });
}

// ---------- Part A visits ----------

function startVisit(db: Db, sid: number, pos: number, at: number) {
  const r = response(db, sid, pos);
  db.prepare("INSERT INTO a_visits (session_id, pos, started_at, budget_ms) VALUES (?, ?, ?, ?)").run(sid, pos, at, r.budget_ms);
  db.prepare("UPDATE a_responses SET visits = visits + 1 WHERE session_id = ? AND pos = ?").run(sid, pos);
}

function endVisit(db: Db, v: VisitRow, at: number, reason: "advance" | "jump" | "forced" | "closed") {
  db.prepare("UPDATE a_visits SET ended_at = ?, end_reason = ? WHERE id = ?").run(at, reason, v.id);
  const forced = reason === "forced" ? 1 : 0;
  db.prepare(
    `UPDATE a_responses SET time_ms = time_ms + ?, forced_skip = MAX(forced_skip, ?),
       in_queue = CASE WHEN ? = 'closed' THEN in_queue ELSE (? OR answer IS NULL OR marked) END
     WHERE session_id = ? AND pos = ?`,
  ).run(at - v.started_at, forced, reason, forced, v.session_id, v.pos);
}

// The question after `pos`: the next one in the first pass, then cycling the revisit queue.
function nextPos(db: Db, s: SessionRow, pos: number): number | null {
  const rows = responses(db, s.id);
  if (s.a_phase === "first-pass" && pos < rows.length - 1) return pos + 1;
  if (s.a_phase === "first-pass") db.prepare("UPDATE sessions SET a_phase = 'revisit' WHERE id = ?").run(s.id);
  const queue = rows.filter((r) => r.in_queue).map((r) => r.pos);
  if (!queue.length) return null;
  return queue.find((p) => p > pos) ?? queue[0];
}

function moveOn(db: Db, s: SessionRow, v: VisitRow, at: number, reason: "advance" | "forced") {
  endVisit(db, v, at, reason);
  const next = nextPos(db, s, v.pos);
  if (next !== null) startVisit(db, s.id, next, at);
}

// Replays forced skips up to time t. Each expired visit closes exactly at its budget end and
// the next visit starts at that same instant, so the result doesn't depend on when we look.
function settleVisits(db: Db, sid: number, t: number) {
  for (;;) {
    const s = getSession(db, sid);
    if (!s.config.switches.forcedSkip) return;
    const v = openVisit(db, sid);
    if (!v) return;
    const expiry = v.started_at + v.budget_ms;
    if (expiry > t) return;
    moveOn(db, s, v, expiry, "forced");
  }
}

// ---------- closing ----------

function closeA(ctx: Ctx, sid: number, at: number, status: "completed" | "quit" | "expired") {
  const { db } = ctx;
  const s = getSession(db, sid);
  const v = openVisit(db, sid);
  if (v) endVisit(db, v, at, "closed");
  let score = 0;
  let max = 0;
  const upd = db.prepare("UPDATE a_responses SET outcome = ?, marks = ? WHERE session_id = ? AND pos = ?");
  for (const r of responses(db, sid)) {
    const key = questionKey(ctx, r.question_id);
    if (!key) continue;
    const input = r.answer ? (JSON.parse(r.answer) as AnswerInput) : null;
    const scored = scoreAnswer(key.answer, input, s.config.scheme);
    upd.run(scored.outcome, scored.marks, sid, r.pos);
    score += scored.marks;
    max += key.answer.kind === "DROPPED" ? key.answer.marks : fullMarks(r.format, s.config.scheme);
    if (scored.outcome === "dropped") continue;
    if (scored.outcome === "correct" && r.source === "real") {
      db.prepare(
        `INSERT INTO mastery (question_id, correct_count) VALUES (?, 1)
         ON CONFLICT(question_id) DO UPDATE SET correct_count = correct_count + 1`,
      ).run(r.question_id);
      db.prepare("UPDATE mastery SET retired_at = ? WHERE question_id = ? AND correct_count >= 2 AND retired_at IS NULL").run(
        at,
        r.question_id,
      );
    }
    recordOutcome(db, r.question_id, scored.outcome, r.confidence, !!r.forced_skip, at, sid);
  }
  db.prepare("UPDATE sessions SET a_closed_at = ?, a_status = ?, score = ?, max_score = ? WHERE id = ?").run(
    at,
    status,
    score,
    max,
    sid,
  );
  if (hasPartB(s.kind) && status !== "quit") {
    // Full exam: Part A locks and Part B starts now, with its full 120 minutes.
    const bMs = (s.config.timeline?.total ?? 0) * 1000;
    db.prepare("UPDATE sessions SET b_started_at = ?, ends_at = ? WHERE id = ?").run(at, at + bMs, sid);
  } else {
    closeSession(db, sid, at, status);
  }
}

function closeSession(db: Db, sid: number, at: number, status: "completed" | "quit" | "expired") {
  db.prepare("UPDATE b_attempts SET status = 'abandoned' WHERE session_id = ? AND status = 'pending'").run(sid);
  db.prepare("UPDATE sessions SET status = ?, ended_at = ? WHERE id = ?").run(status, at, sid);
}

// ---------- Part B commits ----------

function commitAttempt(
  db: Db,
  s: SessionRow,
  a: AttemptRow,
  at: number,
  opts: { ideaId: number | null; label: string | null; checks: unknown; auto: boolean },
) {
  const blockStart = s.b_started_at! + a.block_start_s * 1000;
  db.prepare(
    `UPDATE b_attempts SET status = 'committed', committed_at = ?, seconds_to_commit = ?, auto_committed = ?,
       committed_idea_id = ?, commit_label = ?, checks = ? WHERE id = ?`,
  ).run(
    at,
    Math.round((at - blockStart) / 1000),
    opts.auto ? 1 : 0,
    opts.ideaId,
    opts.label,
    opts.checks === undefined || opts.checks === null ? null : JSON.stringify(opts.checks),
    a.id,
  );
}

// Commit deadline passed without a commit: lock the last starred idea (or the last idea, or none).
function settleCommits(db: Db, sid: number, t: number) {
  const s = getSession(db, sid);
  if (s.b_started_at === null) return;
  for (const a of attempts(db, sid)) {
    if (a.status !== "pending") continue;
    const deadline = s.b_started_at + a.commit_deadline_s * 1000;
    if (deadline > t) continue;
    const idea = db
      .prepare(
        `SELECT id FROM b_ideas WHERE attempt_id = ?
         ORDER BY (starred_at IS NOT NULL) DESC, starred_at DESC, n DESC LIMIT 1`,
      )
      .get(a.id) as { id: number } | undefined;
    commitAttempt(db, s, a, deadline, { ideaId: idea?.id ?? null, label: null, checks: null, auto: true });
  }
}

// ---------- settle ----------

// Applies everything the clock implies up to now. Safe to call on every request.
export function settle(ctx: Ctx, sid: number): SessionRow {
  const { db } = ctx;
  const now = ctx.now();
  let s = getSession(db, sid);
  if (s.status !== "live") return s;
  if (hasPartA(s.kind) && s.a_closed_at === null) {
    settleVisits(db, sid, Math.min(now, s.a_ends_at!));
    if (now >= s.a_ends_at!) closeA(ctx, sid, s.a_ends_at!, "expired");
    s = getSession(db, sid);
  }
  if (s.status === "live" && s.b_started_at !== null) {
    settleCommits(db, sid, Math.min(now, s.ends_at));
    // Part B's clock running out is its normal end, not a walk-away.
    if (now >= s.ends_at) closeSession(db, sid, s.ends_at, "completed");
    s = getSession(db, sid);
  }
  return s;
}

function settled(ctx: Ctx, sid: number): SessionRow {
  return tx(ctx.db, () => settle(ctx, sid));
}

function requireLiveA(ctx: Ctx, sid: number): SessionRow {
  const s = settle(ctx, sid);
  if (s.status !== "live" || !hasPartA(s.kind) || s.a_closed_at !== null) throw conflict("Part A is not running");
  return s;
}

function requireCurrent(ctx: Ctx, sid: number, pos: number): VisitRow {
  const v = openVisit(ctx.db, sid);
  if (!v || v.pos !== pos) throw conflict("that question is no longer on screen", { currentPos: v?.pos ?? null });
  return v;
}

// ---------- Part A actions ----------

export function answer(ctx: Ctx, sid: number, pos: number, raw: unknown, confidence?: unknown) {
  return tx(ctx.db, () => {
    requireLiveA(ctx, sid);
    requireCurrent(ctx, sid, pos);
    const r = response(ctx.db, sid, pos);
    if (raw !== undefined) {
      let input: AnswerInput | null;
      try {
        input = normaliseInput(r.format, raw);
      } catch (e) {
        throw badRequest((e as Error).message);
      }
      ctx.db.prepare("UPDATE a_responses SET answer = ? WHERE session_id = ? AND pos = ?").run(
        input ? JSON.stringify(input) : null,
        sid,
        pos,
      );
    }
    if (confidence !== undefined) {
      if (confidence !== "sure" && confidence !== "unsure") throw badRequest("confidence must be sure | unsure");
      ctx.db.prepare("UPDATE a_responses SET confidence = ? WHERE session_id = ? AND pos = ?").run(confidence, sid, pos);
    }
  });
}

export function mark(ctx: Ctx, sid: number, pos: number, marked: boolean) {
  return tx(ctx.db, () => {
    requireLiveA(ctx, sid);
    requireCurrent(ctx, sid, pos);
    ctx.db.prepare("UPDATE a_responses SET marked = ? WHERE session_id = ? AND pos = ?").run(marked ? 1 : 0, sid, pos);
  });
}

export function advance(ctx: Ctx, sid: number) {
  return tx(ctx.db, () => {
    const s = requireLiveA(ctx, sid);
    const v = openVisit(ctx.db, sid);
    if (!v) throw conflict("no question on screen");
    moveOn(ctx.db, s, v, ctx.now(), "advance");
  });
}

// Jump to any question from the palette; it gets a fresh budget.
export function visit(ctx: Ctx, sid: number, pos: number) {
  return tx(ctx.db, () => {
    requireLiveA(ctx, sid);
    response(ctx.db, sid, pos);
    const v = openVisit(ctx.db, sid);
    if (v?.pos === pos) return;
    const now = ctx.now();
    if (v) endVisit(ctx.db, v, now, "jump");
    startVisit(ctx.db, sid, pos, now);
  });
}

// Submit early: closes Part A (in a full exam, Part B starts) or ends a Part B session.
export function finish(ctx: Ctx, sid: number) {
  return tx(ctx.db, () => {
    const s = settle(ctx, sid);
    if (s.status !== "live") throw conflict("session is not live");
    if (hasPartA(s.kind) && s.a_closed_at === null) closeA(ctx, sid, ctx.now(), "completed");
    else closeSession(ctx.db, sid, ctx.now(), "completed");
  });
}

// Quit: every unanswered Part A question is skipped; every uncommitted Part B slot is abandoned.
export function quit(ctx: Ctx, sid: number) {
  return tx(ctx.db, () => {
    const s = settle(ctx, sid);
    if (s.status !== "live") throw conflict("session is not live");
    if (hasPartA(s.kind) && s.a_closed_at === null) closeA(ctx, sid, ctx.now(), "quit");
    else closeSession(ctx.db, sid, ctx.now(), "quit");
  });
}

// ---------- Part B actions ----------

function requireAttempt(ctx: Ctx, sid: number, pos: number): { s: SessionRow; a: AttemptRow } {
  const a = attempts(ctx.db, sid).find((x) => x.pos === pos);
  if (!a) throw notFound("Part B slot");
  return { s: getSession(ctx.db, sid), a };
}

function requireCommitWindow(ctx: Ctx, sid: number, pos: number) {
  const s = settle(ctx, sid);
  if (s.status !== "live" || s.b_started_at === null) throw conflict("Part B is not running");
  const { a } = requireAttempt(ctx, sid, pos);
  const sec = (ctx.now() - s.b_started_at) / 1000;
  if (a.status !== "pending") throw conflict("this slot is already committed");
  if (sec < a.block_start_s || sec >= a.commit_deadline_s) throw conflict("outside this slot's idea window");
  return { s, a };
}

export function tapIdea(ctx: Ctx, sid: number, pos: number): { ideaId: number; n: number } {
  return tx(ctx.db, () => {
    const { a } = requireCommitWindow(ctx, sid, pos);
    const n = a.idea_count + 1;
    const id = Number(
      ctx.db.prepare("INSERT INTO b_ideas (attempt_id, n, created_at) VALUES (?, ?, ?)").run(a.id, n, ctx.now()).lastInsertRowid,
    );
    ctx.db.prepare("UPDATE b_attempts SET idea_count = ? WHERE id = ?").run(n, a.id);
    return { ideaId: id, n };
  });
}

function ideaOf(ctx: Ctx, sid: number, ideaId: number): { attemptId: number; pos: number } {
  const r = ctx.db
    .prepare("SELECT i.attempt_id, a.pos FROM b_ideas i JOIN b_attempts a ON a.id = i.attempt_id WHERE i.id = ? AND a.session_id = ?")
    .get(ideaId, sid) as { attempt_id: number; pos: number } | undefined;
  if (!r) throw notFound("idea");
  return { attemptId: r.attempt_id, pos: r.pos };
}

export function starIdea(ctx: Ctx, sid: number, ideaId: number, starred: boolean) {
  return tx(ctx.db, () => {
    const { pos } = ideaOf(ctx, sid, ideaId);
    requireCommitWindow(ctx, sid, pos);
    ctx.db.prepare("UPDATE b_ideas SET starred_at = ? WHERE id = ?").run(starred ? ctx.now() : null, ideaId);
  });
}

export function commit(ctx: Ctx, sid: number, pos: number, body: { ideaId?: number | null; label?: string; checks?: unknown }) {
  return tx(ctx.db, () => {
    const { s, a } = requireCommitWindow(ctx, sid, pos);
    if (body.ideaId != null && ideaOf(ctx, sid, body.ideaId).pos !== pos) throw badRequest("idea belongs to another slot");
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 200) || null : null;
    commitAttempt(ctx.db, s, a, ctx.now(), { ideaId: body.ideaId ?? null, label, checks: body.checks ?? null, auto: false });
  });
}

export function recordEvent(ctx: Ctx, sid: number, pos: number, type: string, data: unknown) {
  return tx(ctx.db, () => {
    settle(ctx, sid);
    const { a } = requireAttempt(ctx, sid, pos);
    if (!type || type.length > 64) throw badRequest("type required (≤ 64 chars)");
    ctx.db.prepare("INSERT INTO b_events (attempt_id, at, type, data) VALUES (?, ?, ?, ?)").run(
      a.id,
      ctx.now(),
      type,
      data === undefined ? null : JSON.stringify(data),
    );
  });
}

// Debrief writes are allowed once the slot's block has ended or the session is over.
function requireDebrief(ctx: Ctx, sid: number, pos: number): AttemptRow {
  const s = settle(ctx, sid);
  const { a } = requireAttempt(ctx, sid, pos);
  const blockOver = s.b_started_at !== null && ctx.now() >= s.b_started_at + a.block_end_s * 1000;
  if (s.status === "live" && !blockOver && a.status === "pending") throw conflict("debrief opens after the slot");
  return a;
}

export function tagIdea(ctx: Ctx, sid: number, ideaId: number, tag: string | null) {
  return tx(ctx.db, () => {
    const { pos } = ideaOf(ctx, sid, ideaId);
    requireDebrief(ctx, sid, pos);
    const clean = tag?.trim().toLowerCase().split(/\s+/)[0]?.slice(0, 40) || null; // one word
    ctx.db.prepare("UPDATE b_ideas SET tag = ? WHERE id = ?").run(clean, ideaId);
  });
}

export function selfRate(ctx: Ctx, sid: number, pos: number, criterion: number, value: number) {
  return tx(ctx.db, () => {
    const a = requireDebrief(ctx, sid, pos);
    const prompt = ctx.content.promptById.get(a.prompt_id);
    const nCriteria = prompt?.criteria.length ?? 4;
    if (!Number.isInteger(criterion) || criterion < 0 || criterion >= nCriteria) throw badRequest("criterion out of range");
    if (!Number.isInteger(value) || value < 0 || value > 5) throw badRequest("value must be 0–5");
    ctx.db
      .prepare(
        `INSERT INTO b_self_ratings (attempt_id, criterion, value) VALUES (?, ?, ?)
         ON CONFLICT(attempt_id, criterion) DO UPDATE SET value = excluded.value`,
      )
      .run(a.id, criterion, value);
  });
}

export function addPhoto(ctx: Ctx, sid: number, pos: number, relPath: string, mime: string): number {
  return tx(ctx.db, () => {
    const a = requireDebrief(ctx, sid, pos);
    return Number(
      ctx.db
        .prepare("INSERT INTO photos (attempt_id, path, mime, created_at) VALUES (?, ?, ?, ?)")
        .run(a.id, relPath, mime, ctx.now()).lastInsertRowid,
    );
  });
}

export function attemptForPhoto(ctx: Ctx, sid: number, pos: number): AttemptRow {
  return tx(ctx.db, () => requireDebrief(ctx, sid, pos));
}

export { settled };
