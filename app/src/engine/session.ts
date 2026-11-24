// Session lifecycle (spec §5.2, §5.3, §5.7). The server owns the clock: every state change is
// derived from stored timestamps, and `settle` replays whatever the clock implies (forced skips,
// section expiry, Part B forced advance) before any read or write. Nothing here can pause a session.
import type { Content } from "../content/load";
import type { Format, Generator, MarkScheme, Slot, Topic } from "../content/types";
import { KINDS, type Kind, hasPartA, hasPartB } from "./kinds";
import { type Db, tx } from "../db/db";
import { ApiError, badRequest, conflict, notFound } from "./errors";
import { dueQuestionIds, recordOutcome } from "./errorlog";
import { questionKey } from "./items";
import { type Mode, type Switches, isMode, switchesFor } from "./modes";
import {
  type PartBPlan,
  type Step,
  B_MOCK_MINUTES,
  drillPlan,
  nextReread,
  paperPlan,
  questionScript,
  targetsOf,
} from "./partb";
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
  partB?: PartBPlan; // Part B read-all, per-question budget and section length
  timeline?: { total: number }; // Part B plan of sessions made before the self-paced flow
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
  progress: "unseen" | "open" | "skipped" | "done" | "out";
  step: Step;
  used_ms: number;
  steps_log: string | null;
  rereads: number;
  reveal_until: number | null;
}

export interface BVisitRow {
  id: number;
  session_id: number;
  attempt_id: number;
  pos: number;
  started_at: number;
  ended_at: number | null;
  end_reason: string | null;
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

export function openBVisit(db: Db, sid: number): BVisitRow | null {
  return (db.prepare("SELECT * FROM b_visits WHERE session_id = ? AND ended_at IS NULL").get(sid) as BVisitRow | undefined) ?? null;
}

export function anyBVisit(db: Db, sid: number): boolean {
  return !!db.prepare("SELECT 1 FROM b_visits WHERE session_id = ? LIMIT 1").get(sid);
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
      config.partB = drillPlan();
    } else if (kind === "b-mock" || kind === "full") {
      prompts = selectMockPrompts(content, pool, ctx.rand);
      if (!prompts.length) throw new ApiError(422, "no prompts available");
      config.partB = paperPlan(B_MOCK_MINUTES);
    } else if (kind === "b-past-paper") {
      const paper = req.bPaperId ? content.bPaperById.get(req.bPaperId) : undefined;
      if (!paper) throw badRequest("unknown bPaperId");
      prompts = selectPastPaperPrompts(content, paper.id);
      config.bPaperId = paper.id;
      config.retake = !!db
        .prepare("SELECT 1 FROM sessions WHERE kind = 'b-past-paper' AND json_extract(config, '$.bPaperId') = ?")
        .get(paper.id);
      config.partB = paperPlan(paper.durationMin);
    }

    const aMs = Math.round(aMinutes * MIN);
    const bMs = config.partB ? config.partB.total * 1000 : 0;
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
    if (config.partB) {
      const budget = config.partB.budget;
      prompts.forEach((p, pos) => {
        const script = questionScript(p.slot, budget);
        insAttempt.run(sid, pos, p.id, p.slot, JSON.stringify(script), 0, budget, targetsOf(script).commit);
      });
    }

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
    const bMs = (s.config.partB?.total ?? s.config.timeline?.total ?? 0) * 1000;
    db.prepare("UPDATE sessions SET b_started_at = ?, ends_at = ? WHERE id = ?").run(at, at + bMs, sid);
  } else {
    closeSession(db, sid, at, status);
  }
}

function closeSession(db: Db, sid: number, at: number, status: "completed" | "quit" | "expired") {
  const v = openBVisit(db, sid);
  if (v) endBVisit(db, getSession(db, sid), v, at, "closed");
  db.prepare("UPDATE b_attempts SET status = 'abandoned' WHERE session_id = ? AND status = 'pending'").run(sid);
  db.prepare("UPDATE sessions SET status = ?, ended_at = ? WHERE id = ?").run(status, at, sid);
}

// ---------- Part B question clock ----------

function attemptById(db: Db, id: number): AttemptRow {
  return db.prepare("SELECT * FROM b_attempts WHERE id = ?").get(id) as unknown as AttemptRow;
}

/** Target end of each step, in question-clock ms. */
export function targetsMs(a: AttemptRow) {
  const t = targetsOf(JSON.parse(a.phases));
  return { read: t.read * 1000, ideas: t.ideas * 1000, commit: t.commit * 1000, draw: t.draw * 1000 };
}

/** Question clock at server time t: closed visits plus the open one, if it is this question. */
export function questionMs(a: AttemptRow, v: BVisitRow | null, t: number): number {
  return a.used_ms + (v && v.attempt_id === a.id && a.progress !== "out" ? t - v.started_at : 0);
}

function logEvent(db: Db, attemptId: number, at: number, type: string, data?: unknown) {
  db.prepare("INSERT INTO b_events (attempt_id, at, type, data) VALUES (?, ?, ?, ?)").run(
    attemptId,
    at,
    type,
    data === undefined ? null : JSON.stringify(data),
  );
}

type StepsLog = Partial<Record<Step, { from: number; to: number | null }>>;

// Moves the attempt to another step, recording where on the question clock each step began and ended.
function changeStep(db: Db, a: AttemptRow, to: Step, qms: number, at: number) {
  const log: StepsLog = a.steps_log ? JSON.parse(a.steps_log) : {};
  const cur = log[a.step];
  if (cur) cur.to = qms;
  log[to] = { from: log[to]?.from ?? qms, to: null };
  db.prepare("UPDATE b_attempts SET step = ?, steps_log = ? WHERE id = ?").run(to, JSON.stringify(log), a.id);
  logEvent(db, a.id, at, "step", { from: a.step, to, qms });
}

function startBVisit(db: Db, sid: number, a: AttemptRow, at: number) {
  db.prepare("INSERT INTO b_visits (session_id, attempt_id, pos, started_at) VALUES (?, ?, ?, ?)").run(sid, a.id, a.pos, at);
  if (a.progress === "unseen")
    db.prepare("UPDATE b_attempts SET progress = 'open', steps_log = ? WHERE id = ?").run(
      JSON.stringify({ read: { from: 0, to: null } }),
      a.id,
    );
  else if (a.progress === "skipped") db.prepare("UPDATE b_attempts SET progress = 'open' WHERE id = ?").run(a.id);
}

// An out-of-time question's clock is stopped: viewing it adds nothing.
function endBVisit(db: Db, s: SessionRow, v: BVisitRow, at: number, reason: string) {
  const a = attemptById(db, v.attempt_id);
  db.prepare("UPDATE b_visits SET ended_at = ?, end_reason = ? WHERE id = ?").run(at, reason, v.id);
  if (a.progress === "out") return;
  let used = a.used_ms + (at - v.started_at);
  if (s.config.switches.forcedAdvance) used = Math.min(used, targetsMs(a).draw);
  db.prepare("UPDATE b_attempts SET used_ms = ? WHERE id = ?").run(used, a.id);
}

// The next question still worth opening after `pos`, in paper order, wrapping round.
function nextOpenPos(db: Db, sid: number, pos: number): number | null {
  const atts = attempts(db, sid);
  for (let k = 1; k < atts.length; k++) {
    const a = atts[(pos + k) % atts.length];
    if (a.progress !== "done" && a.progress !== "out") return a.pos;
  }
  return null;
}

function moveOnB(db: Db, s: SessionRow, v: BVisitRow, at: number, reason: string) {
  endBVisit(db, s, v, at, reason);
  const next = nextOpenPos(db, s.id, v.pos);
  if (next !== null) startBVisit(db, s.id, attempts(db, s.id)[next], at);
}

function commitAttempt(db: Db, a: AttemptRow, at: number, qms: number, auto: boolean) {
  db.prepare(
    "UPDATE b_attempts SET status = 'committed', committed_at = ?, seconds_to_commit = ?, auto_committed = ? WHERE id = ?",
  ).run(at, Math.round(qms / 1000), auto ? 1 : 0, a.id);
  changeStep(db, attemptById(db, a.id), "draw", qms, at);
}

/** The next thing forced advance will do on the open question, and at what question-clock ms. */
export function nextForced(a: AttemptRow): { at: number; action: "ideas" | "commit" | "auto" | "out" } | null {
  if (a.progress === "out") return null;
  const t = targetsMs(a);
  if (a.step === "read") return { at: t.read, action: "ideas" };
  if (a.status === "pending" && a.step === "ideas") return { at: t.ideas, action: "commit" };
  if (a.status === "pending") return { at: t.commit, action: "auto" };
  return { at: t.draw, action: "out" };
}

// Replays what the clock implies up to server time t: the first question opening when read-all
// ends (at once in a drill) and, with forced advance on, every target the open question passes.
// Each event lands at the exact instant its target was reached, so the result never depends on
// when we look.
function settleB(db: Db, sid: number, t: number) {
  const s = getSession(db, sid);
  const plan = s.config.partB;
  if (!plan || s.b_started_at === null) return;
  if (!anyBVisit(db, sid)) {
    const opensAt = s.b_started_at + plan.readAll * 1000;
    if (opensAt > t) return;
    startBVisit(db, sid, attempts(db, sid)[0], opensAt);
  }
  if (!s.config.switches.forcedAdvance) return;
  for (;;) {
    const v = openBVisit(db, sid);
    if (!v) return;
    const a = attemptById(db, v.attempt_id);
    const next = nextForced(a);
    if (!next) return;
    const at = Math.max(v.started_at, v.started_at + (next.at - a.used_ms));
    if (at > t) return;
    if (next.action === "ideas" || next.action === "commit") changeStep(db, a, next.action, next.at, at);
    else if (next.action === "auto") commitAttempt(db, a, at, next.at, true);
    else {
      endBVisit(db, s, v, at, "budget");
      db.prepare("UPDATE b_attempts SET progress = 'out', used_ms = ? WHERE id = ?").run(next.at, a.id);
      const after = nextOpenPos(db, sid, a.pos);
      if (after !== null) startBVisit(db, sid, attempts(db, sid)[after], at);
    }
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
  // A Part B session made before the self-paced flow cannot run on this engine: it ends here.
  if (s.status === "live" && s.b_started_at !== null && !s.config.partB) {
    closeSession(db, sid, now, "quit");
    s = getSession(db, sid);
  }
  if (s.status === "live" && s.b_started_at !== null) {
    settleB(db, sid, Math.min(now, s.ends_at));
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

function requireB(ctx: Ctx, sid: number): SessionRow {
  const s = settle(ctx, sid);
  if (s.status !== "live" || s.b_started_at === null || !s.config.partB) throw conflict("Part B is not running");
  return s;
}

function requireAttempt(ctx: Ctx, sid: number, pos: number): AttemptRow {
  const a = attempts(ctx.db, sid).find((x) => x.pos === pos);
  if (!a) throw notFound("Part B question");
  return a;
}

// The action names the question on her screen; anything else is stale.
function requireOnScreen(ctx: Ctx, sid: number, pos: number): { s: SessionRow; v: BVisitRow; a: AttemptRow } {
  const s = requireB(ctx, sid);
  const v = openBVisit(ctx.db, sid);
  if (!v || v.pos !== pos) throw conflict("that question is no longer on screen", { currentPos: v?.pos ?? null });
  return { s, v, a: requireAttempt(ctx, sid, pos) };
}

const isPaper = (s: SessionRow) => (s.config.partB?.readAll ?? 0) > 0;

/** Open a question (palette, Prev, Next, or "Start Q1", which ends read-all early). */
export function openQuestion(ctx: Ctx, sid: number, pos: number) {
  return tx(ctx.db, () => {
    const s = requireB(ctx, sid);
    const a = requireAttempt(ctx, sid, pos);
    const v = openBVisit(ctx.db, sid);
    if (v?.pos === pos) return;
    const now = ctx.now();
    if (v) endBVisit(ctx.db, s, v, now, "jump");
    startBVisit(ctx.db, sid, a, now);
  });
}

/** "Got it" (read → ideas), "I've picked one" (ideas → commit), "Back to ideas" (commit → ideas). */
export function changeQuestionStep(ctx: Ctx, sid: number, pos: number, to: unknown) {
  return tx(ctx.db, () => {
    const { s, v, a } = requireOnScreen(ctx, sid, pos);
    if (a.status !== "pending" || a.progress === "out") throw conflict("this question is already committed or closed");
    const allowed = (a.step === "read" && to === "ideas") || (a.step === "ideas" && to === "commit") || (a.step === "commit" && to === "ideas");
    if (!allowed) throw conflict(`cannot move from ${a.step} to ${String(to)}`);
    const now = ctx.now();
    const qms = questionMs(a, v, now);
    if (to === "ideas" && a.step === "commit" && s.config.switches.forcedAdvance && qms >= targetsMs(a).ideas)
      throw conflict("ideas time is over");
    changeStep(ctx.db, a, to as Step, qms, now);
  });
}

/** Commit: final. Records seconds-to-commit on the question clock and opens Draw. */
export function commit(ctx: Ctx, sid: number, pos: number) {
  return tx(ctx.db, () => {
    const { v, a } = requireOnScreen(ctx, sid, pos);
    if (a.status !== "pending") throw conflict("this question is already committed");
    if (a.progress === "out") throw conflict("this question is out of time");
    if (a.step === "read") throw conflict("read the question first");
    const now = ctx.now();
    commitAttempt(ctx.db, a, now, questionMs(a, v, now), false);
  });
}

/** Skip an uncommitted question: it stays open to come back to while it has time. */
export function skipQuestion(ctx: Ctx, sid: number, pos: number) {
  return tx(ctx.db, () => {
    const { s, v, a } = requireOnScreen(ctx, sid, pos);
    if (!isPaper(s)) throw conflict("a drill has one question");
    if (a.status !== "pending") throw conflict("a committed question is not skipped");
    if (a.progress === "out") throw conflict("this question is out of time");
    const now = ctx.now();
    ctx.db.prepare("UPDATE b_attempts SET progress = 'skipped' WHERE id = ?").run(a.id);
    logEvent(ctx.db, a.id, now, "skip", { qms: questionMs(a, v, now) });
    moveOnB(ctx.db, s, v, now, "skip");
  });
}

/** "Done · next question": the drawing is finished. */
export function doneQuestion(ctx: Ctx, sid: number, pos: number) {
  return tx(ctx.db, () => {
    const { s, v, a } = requireOnScreen(ctx, sid, pos);
    if (!isPaper(s)) throw conflict("a drill ends with pencil down");
    if (a.status !== "committed") throw conflict("commit before finishing");
    ctx.db.prepare("UPDATE b_attempts SET progress = 'done' WHERE id = ?").run(a.id);
    moveOnB(ctx.db, s, v, ctx.now(), "done");
  });
}

/** The end page: no question on screen. Any question with time left can still be opened. */
export function openEndPage(ctx: Ctx, sid: number) {
  return tx(ctx.db, () => {
    const s = requireB(ctx, sid);
    if (!isPaper(s)) throw conflict("a drill has no end page");
    if (!anyBVisit(ctx.db, sid)) throw conflict("read-all is still running");
    const v = openBVisit(ctx.db, sid);
    if (v) endBVisit(ctx.db, s, v, ctx.now(), "end");
  });
}

/** Reread (question hiding on): 60, 30, then 15 s of the prompt; the question clock keeps running. */
export function reread(ctx: Ctx, sid: number, pos: number) {
  return tx(ctx.db, () => {
    const { s, v, a } = requireOnScreen(ctx, sid, pos);
    if (!s.config.switches.questionHiding) throw conflict("the prompt is not hidden in this mode");
    if (a.progress === "out") throw conflict("this question is out of time");
    const now = ctx.now();
    const qms = questionMs(a, v, now);
    if (qms >= targetsMs(a).draw) throw conflict("this question's time is up");
    const len = nextReread(a.rereads);
    if (len === null) throw conflict("no rereads left");
    ctx.db.prepare("UPDATE b_attempts SET rereads = rereads + 1, reveal_until = ? WHERE id = ?").run(now + len * 1000, a.id);
    logEvent(ctx.db, a.id, now, "reread", { n: a.rereads + 1, seconds: len, qms });
  });
}

export function recordEvent(ctx: Ctx, sid: number, pos: number, type: string, data: unknown) {
  return tx(ctx.db, () => {
    settle(ctx, sid);
    const a = requireAttempt(ctx, sid, pos);
    if (!type || type.length > 64) throw badRequest("type required (≤ 64 chars)");
    logEvent(ctx.db, a.id, ctx.now(), type, data);
  });
}

// Debrief writes are allowed once the session is over, or once a question is done or out of time.
function requireDebrief(ctx: Ctx, sid: number, pos: number): AttemptRow {
  const s = settle(ctx, sid);
  const a = requireAttempt(ctx, sid, pos);
  if (s.status === "live" && a.progress !== "done" && a.progress !== "out") throw conflict("debrief opens after the question");
  return a;
}

/** "How many ideas did you sketch?" — one number per question, reported in the debrief. */
export function reportIdeas(ctx: Ctx, sid: number, pos: number, count: number) {
  return tx(ctx.db, () => {
    const a = requireDebrief(ctx, sid, pos);
    if (!Number.isInteger(count) || count < 0 || count > 99) throw badRequest("count must be 0–99");
    ctx.db.prepare("UPDATE b_attempts SET idea_count = ? WHERE id = ?").run(count, a.id);
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
