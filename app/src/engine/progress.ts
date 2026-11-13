// History, dashboard aggregates (spec §5.5) and the Today summary (spec §5.1).
import type { Slot, Topic } from "../content/types";
import { SLOTS, TOPICS } from "../content/types";
import { cardStats, dueQueue } from "./cards";
import { dueQuestionIds } from "./errorlog";
import { hasPartA } from "./kinds";
import { type Mode, isMode } from "./modes";
import { type Ctx, liveSessionId, settle } from "./session";
import { getSettings } from "./settings";
import { CUTOFF_BAND, TARGET } from "./view";

export const EXAM_DATE = "2027-01-17";
const DAY_MS = 86_400_000;

interface SessionLite {
  id: number;
  kind: string;
  mode: Mode;
  started_at: number;
  ended_at: number | null;
  status: string;
  a_status: string | null;
  score: number | null;
  max_score: number | null;
  config: string;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function modeFilter(mode: unknown): { sql: string; args: string[] } {
  return isMode(mode) ? { sql: " AND s.mode = ?", args: [mode] } : { sql: "", args: [] };
}

// Settles the live session first so a walked-away session shows as expired, not live.
function settleLive(ctx: Ctx) {
  const live = liveSessionId(ctx.db);
  if (live !== null) settle(ctx, live);
}

export function history(ctx: Ctx, mode?: unknown) {
  settleLive(ctx);
  const f = modeFilter(mode);
  const rows = ctx.db
    .prepare(`SELECT s.* FROM sessions s WHERE 1 = 1${f.sql} ORDER BY s.started_at DESC, s.id DESC`)
    .all(...f.args) as unknown as SessionLite[];
  const stc = ctx.db.prepare("SELECT seconds_to_commit FROM b_attempts WHERE session_id = ? AND seconds_to_commit IS NOT NULL");
  return rows.map((s) => {
    const config = JSON.parse(s.config);
    const secs = (stc.all(s.id) as { seconds_to_commit: number }[]).map((r) => r.seconds_to_commit);
    return {
      id: s.id,
      kind: s.kind,
      mode: s.mode,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      status: s.status,
      quit: s.status === "quit",
      score: s.score,
      maxScore: s.max_score,
      medianSecondsToCommit: median(secs),
      paperId: config.paperId ?? config.bPaperId ?? null,
      retake: !!config.retake,
      slot: config.slot ?? null,
    };
  });
}

export function dashboard(ctx: Ctx, mode?: unknown) {
  settleLive(ctx);
  const { db } = ctx;
  const f = modeFilter(mode);
  const closed = `s.status != 'live'${f.sql}`;

  const mockTrend = (
    db
      .prepare(
        `SELECT s.id, s.kind, s.started_at, s.score, s.max_score, s.status FROM sessions s
         WHERE s.kind IN ('mock', 'full', 'past-paper') AND s.score IS NOT NULL AND ${closed} ORDER BY s.started_at`,
      )
      .all(...f.args) as { id: number; kind: string; started_at: number; score: number; max_score: number; status: string }[]
  ).map((r) => ({ id: r.id, kind: r.kind, at: r.started_at, score: r.score, maxScore: r.max_score, quit: r.status === "quit" }));

  const resp = db
    .prepare(
      `SELECT r.topic, r.outcome, r.marks, r.forced_skip, r.format, s.config FROM a_responses r
       JOIN sessions s ON s.id = r.session_id WHERE r.outcome IS NOT NULL${f.sql}`,
    )
    .all(...f.args) as { topic: Topic; outcome: string; marks: number; forced_skip: number; format: "NAT" | "MSQ" | "MCQ"; config: string }[];
  const byTopic = Object.fromEntries(TOPICS.map((t) => [t, { answered: 0, correct: 0, total: 0, accuracy: null as number | null }]));
  let lostToWrong = 0;
  let leftBySkipping = 0;
  let forced = 0;
  for (const r of resp) {
    if (r.outcome === "dropped") continue;
    const t = byTopic[r.topic];
    t.total++;
    if (r.outcome !== "blank") t.answered++;
    if (r.outcome === "correct") t.correct++;
    if (r.marks < 0) lostToWrong -= r.marks;
    if (r.outcome === "blank") leftBySkipping += JSON.parse(r.config).scheme[r.format].correct;
    if (r.forced_skip) forced++;
  }
  for (const t of Object.values(byTopic)) t.accuracy = t.answered ? t.correct / t.answered : null;

  const retired = (db.prepare("SELECT retired_at FROM mastery WHERE retired_at IS NOT NULL ORDER BY retired_at").all() as {
    retired_at: number;
  }[]).map((r, i) => ({ at: r.retired_at, total: i + 1 }));

  const atts = db
    .prepare(
      `SELECT a.id, a.slot, a.seconds_to_commit, a.idea_count, a.session_id, s.started_at FROM b_attempts a
       JOIN sessions s ON s.id = a.session_id WHERE a.status = 'committed' AND ${closed} ORDER BY s.started_at`,
    )
    .all(...f.args) as { id: number; slot: Slot; seconds_to_commit: number; idea_count: number; session_id: number; started_at: number }[];
  const perSlot = Object.fromEntries(
    SLOTS.map((slot) => {
      const xs = atts.filter((a) => a.slot === slot).map((a) => a.seconds_to_commit);
      return [slot, { attempts: xs.length, medianSecondsToCommit: median(xs) }];
    }),
  );
  const tagStmt = db.prepare("SELECT COUNT(tag) AS tagged, COUNT(DISTINCT tag) AS distinct_tags FROM b_ideas WHERE attempt_id = ?");
  const rateStmt = db.prepare("SELECT AVG(value) AS avg FROM b_self_ratings WHERE attempt_id = ?");
  const attemptsSeries = atts.map((a) => {
    const t = tagStmt.get(a.id) as { tagged: number; distinct_tags: number };
    const r = rateStmt.get(a.id) as { avg: number | null };
    return {
      attemptId: a.id,
      sessionId: a.session_id,
      at: a.started_at,
      slot: a.slot,
      secondsToCommit: a.seconds_to_commit,
      ideas: a.idea_count,
      distinctTagRatio: t.tagged ? t.distinct_tags / t.tagged : null,
      selfRating: r.avg,
    };
  });

  return {
    serverNow: ctx.now(),
    mode: isMode(mode) ? mode : null,
    partA: {
      band: CUTOFF_BAND,
      target: TARGET,
      mockTrend,
      accuracyByTopic: byTopic,
      forcedSkipRate: resp.length ? forced / resp.length : null,
      lostToWrong,
      leftBySkipping,
      retiredOverTime: retired,
    },
    partB: { perSlot, attempts: attemptsSeries },
    cards: cardStats(ctx),
  };
}

export function daysToExam(now: number): number {
  const exam = new Date(`${EXAM_DATE}T00:00:00`).getTime();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((exam - today.getTime()) / DAY_MS));
}

export function today(ctx: Ctx) {
  settleLive(ctx);
  const now = ctx.now();
  const live = liveSessionId(ctx.db);
  const liveRow = live === null ? null : (ctx.db.prepare("SELECT id, kind, ends_at FROM sessions WHERE id = ?").get(live) as {
    id: number;
    kind: string;
    ends_at: number;
  });
  const dash = dashboard(ctx);

  // Suggested next: weakest Part A topic (lowest accuracy; unpractised first) and least-practised slot.
  const topics = Object.entries(dash.partA.accuracyByTopic) as [Topic, { answered: number; accuracy: number | null }][];
  const weakest = topics.reduce((a, b) => ((b[1].accuracy ?? -1) < (a[1].accuracy ?? -1) ? b : a))[0];
  const slot = SLOTS.reduce((a, b) => (dash.partB.perSlot[b].attempts < dash.partB.perSlot[a].attempts ? b : a));

  const weekAgo = now - 7 * DAY_MS;
  const recent = history(ctx).filter((h) => h.startedAt >= weekAgo);
  const lastA = recent.find((h) => hasPartA(h.kind as never) && h.score !== null && h.kind !== "drill");
  const recentStc = dash.partB.attempts.filter((a) => a.at >= weekAgo).map((a) => a.secondsToCommit);

  // Same prompt re-attempt surfaces 10–14 days after the last attempt (spec §5.3 journal).
  const reattempt = ctx.db
    .prepare(
      `SELECT a.prompt_id, MAX(s.started_at) AS last FROM b_attempts a JOIN sessions s ON s.id = a.session_id
       WHERE a.status = 'committed' GROUP BY a.prompt_id HAVING last BETWEEN ? AND ?`,
    )
    .all(now - 14 * DAY_MS, now - 10 * DAY_MS) as { prompt_id: string; last: number }[];

  return {
    serverNow: now,
    examDate: EXAM_DATE,
    daysToExam: daysToExam(now),
    liveSession: liveRow ? { id: liveRow.id, kind: liveRow.kind, endsAt: liveRow.ends_at } : null,
    defaultMode: getSettings(ctx.db).lastMode,
    suggested: { partATopic: weakest, partBSlot: slot },
    last7Days: {
      sessions: recent.length,
      lastPartAScore: lastA ? { score: lastA.score, maxScore: lastA.maxScore, sessionId: lastA.id } : null,
      band: CUTOFF_BAND,
      medianSecondsToCommit: median(recentStc),
    },
    cardsDue: dueQueue(ctx).dueCount,
    revisitDue: dueQuestionIds(ctx.db, now).length,
    reattemptPromptIds: reattempt.map((r) => r.prompt_id),
  };
}
