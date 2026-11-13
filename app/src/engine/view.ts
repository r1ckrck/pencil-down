// Read models for the API: live session state and results. Every read settles first.
import type { Format, Topic } from "../content/types";
import { promptPayload, questionKey, questionPayload } from "./items";
import { hasPartA, hasPartB } from "./kinds";
import { type Timeline, phaseAt, promptVisible } from "./partb";
import { fullMarks } from "./scoring";
import { type Ctx, type ResponseRow, attempts, openVisit, responses, settled } from "./session";

export const CUTOFF_BAND = { low: 48, high: 54 };
export const TARGET = 60;

type PaletteState = "unseen" | "answered" | "skipped";

function paletteState(r: ResponseRow): PaletteState {
  if (r.answer !== null) return "answered";
  return r.visits > 0 ? "skipped" : "unseen";
}

function ideasOf(ctx: Ctx, attemptId: number) {
  return (
    ctx.db.prepare("SELECT id, n, created_at, starred_at, tag FROM b_ideas WHERE attempt_id = ? ORDER BY n").all(attemptId) as {
      id: number;
      n: number;
      created_at: number;
      starred_at: number | null;
      tag: string | null;
    }[]
  ).map((i) => ({ id: i.id, n: i.n, createdAt: i.created_at, starred: i.starred_at !== null, tag: i.tag }));
}

export function sessionState(ctx: Ctx, sid: number) {
  const s = settled(ctx, sid);
  const now = ctx.now();
  const live = s.status === "live";
  const aRunning = live && hasPartA(s.kind) && s.a_closed_at === null;
  const bRunning = live && s.b_started_at !== null;
  const events: number[] = [];

  let partA = null;
  if (hasPartA(s.kind)) {
    const rows = responses(ctx.db, sid);
    const v = aRunning ? openVisit(ctx.db, sid) : null;
    let current = null;
    if (v) {
      const r = rows[v.pos];
      const budgetEndsAt = v.started_at + v.budget_ms;
      if (s.config.switches.forcedSkip && budgetEndsAt > now) events.push(budgetEndsAt);
      current = {
        pos: v.pos,
        visitStartedAt: v.started_at,
        budgetMs: v.budget_ms,
        budgetEndsAt,
        overBudget: now >= budgetEndsAt,
        elapsedMs: r.time_ms + (now - v.started_at), // total on this question across visits
        question: questionPayload(ctx, r.question_id),
        answer: r.answer ? JSON.parse(r.answer) : null,
        confidence: r.confidence,
        marked: !!r.marked,
      };
    }
    if (aRunning) events.push(s.a_ends_at!);
    partA = {
      endsAt: s.a_ends_at,
      closedAt: s.a_closed_at,
      status: s.a_status,
      phase: s.a_phase,
      current,
      palette: rows.map((r) => ({
        pos: r.pos,
        format: r.format,
        state: paletteState(r),
        marked: !!r.marked,
        inQueue: !!r.in_queue,
        forcedSkip: !!r.forced_skip,
      })),
      queue: rows.filter((r) => r.in_queue).map((r) => r.pos),
    };
  }

  let partB = null;
  if (hasPartB(s.kind)) {
    const tl = s.config.timeline as Timeline;
    const start = s.b_started_at;
    const sec = start === null ? null : (now - start) / 1000;
    const at = sec === null ? null : phaseAt(tl, live ? sec : tl.total);
    if (bRunning && at && at.phase !== "done") events.push(start! + at.to * 1000);
    const atts = attempts(ctx.db, sid);
    partB = {
      startedAt: start,
      timeline: tl,
      now: at,
      attempts: atts.map((a) => {
        const prompt = ctx.content.promptById.get(a.prompt_id);
        const visible = sec !== null && (!live || promptVisible(tl, a.pos, sec, s.config.switches.questionHiding));
        if (bRunning && a.status === "pending") events.push(start! + a.commit_deadline_s * 1000);
        return {
          id: a.id,
          pos: a.pos,
          slot: a.slot,
          status: a.status,
          visible,
          prompt: visible && prompt ? promptPayload(prompt) : null,
          ideaCount: a.idea_count,
          ideas: ideasOf(ctx, a.id),
          committedAt: a.committed_at,
          secondsToCommit: a.seconds_to_commit,
          autoCommitted: !!a.auto_committed,
          committedIdeaId: a.committed_idea_id,
          label: a.commit_label,
        };
      }),
    };
  }
  if (live) events.push(s.ends_at);

  return {
    serverNow: now,
    session: {
      id: s.id,
      kind: s.kind,
      mode: s.mode,
      status: s.status,
      startedAt: s.started_at,
      endsAt: s.ends_at,
      endedAt: s.ended_at,
      switches: s.config.switches,
      retake: !!s.config.retake,
      paperId: s.config.paperId ?? null,
      bPaperId: s.config.bPaperId ?? null,
    },
    section: aRunning ? "A" : bRunning ? "B" : live ? "A" : "closed",
    nextEventAt: events.filter((e) => e > now).sort((a, b) => a - b)[0] ?? null,
    partA,
    partB,
  };
}

// ---------- results ----------

interface Tally {
  correct: number;
  partial: number;
  wrong: number;
  skipped: number;
  dropped: number;
  marks: number;
  max: number;
}
const tally = (): Tally => ({ correct: 0, partial: 0, wrong: 0, skipped: 0, dropped: 0, marks: 0, max: 0 });

export function partAResults(ctx: Ctx, sid: number) {
  const s = settled(ctx, sid);
  if (!hasPartA(s.kind) || s.a_closed_at === null) return null;
  const scheme = s.config.scheme;
  const total = tally();
  const byFormat: Partial<Record<Format, Tally>> = {};
  const byTopic: Partial<Record<Topic, Tally>> = {};
  const cal = { sure: { answered: 0, correct: 0 }, unsure: { answered: 0, correct: 0 } };
  let lostToWrong = 0;
  let leftBySkipping = 0;
  let forcedSkips = 0;
  const questions = responses(ctx.db, sid).map((r) => {
    const key = questionKey(ctx, r.question_id);
    const max = key?.answer.kind === "DROPPED" ? key.answer.marks : fullMarks(r.format, scheme);
    const outcome = r.outcome ?? "blank";
    const marks = r.marks ?? 0;
    for (const t of [total, (byFormat[r.format] ??= tally()), (byTopic[r.topic] ??= tally())]) {
      t.marks += marks;
      t.max += max;
      if (outcome === "blank") t.skipped++;
      else t[outcome as "correct" | "partial" | "wrong" | "dropped"]++;
    }
    if (marks < 0) lostToWrong += -marks;
    if (outcome === "blank") leftBySkipping += max;
    if (r.forced_skip) forcedSkips++;
    if (outcome !== "blank" && outcome !== "dropped") {
      cal[r.confidence].answered++;
      if (outcome === "correct") cal[r.confidence].correct++;
    }
    return {
      pos: r.pos,
      id: r.question_id,
      source: r.source,
      format: r.format,
      topic: r.topic,
      answer: r.answer ? JSON.parse(r.answer) : null,
      confidence: r.confidence,
      key: key?.answer ?? null,
      answerStatus: key?.answerStatus ?? null,
      explanation: key?.explanation ?? null,
      outcome,
      marks,
      maxMarks: max,
      timeMs: r.time_ms,
      budgetMs: r.budget_ms,
      visits: r.visits,
      forcedSkip: !!r.forced_skip,
      question: questionPayload(ctx, r.question_id),
    };
  });
  const paper = s.config.paperId ? ctx.content.paperById.get(s.config.paperId) : undefined;
  const acc = (c: { answered: number; correct: number }) => ({ ...c, accuracy: c.answered ? c.correct / c.answered : null });
  return {
    status: s.a_status,
    score: s.score,
    maxScore: s.max_score,
    band: paper ? null : CUTOFF_BAND,
    target: paper ? null : TARGET,
    cutoff: paper?.cutoff ?? null,
    paper: paper ? { id: paper.id, label: paper.label, totalMarks: paper.totalMarks } : null,
    retake: !!s.config.retake,
    totals: total,
    byFormat,
    byTopic,
    lostToWrong,
    leftBySkipping,
    forcedSkips,
    calibration: { sure: acc(cal.sure), unsure: acc(cal.unsure) },
    questions,
  };
}

export function partBResults(ctx: Ctx, sid: number) {
  const s = settled(ctx, sid);
  if (!hasPartB(s.kind)) return null;
  return attempts(ctx.db, sid).map((a) => {
    const prompt = ctx.content.promptById.get(a.prompt_id);
    const ideas = ideasOf(ctx, a.id);
    const tags = ideas.map((i) => i.tag).filter((t): t is string => !!t);
    const ratings = ctx.db
      .prepare("SELECT criterion, value FROM b_self_ratings WHERE attempt_id = ? ORDER BY criterion")
      .all(a.id) as { criterion: number; value: number }[];
    const photos = ctx.db.prepare("SELECT id, created_at FROM photos WHERE attempt_id = ? ORDER BY id").all(a.id) as {
      id: number;
      created_at: number;
    }[];
    const reveals = ctx.content.cards.filter((c) => c.revealsPromptIds?.includes(a.prompt_id)).map((c) => c.id);
    return {
      id: a.id,
      pos: a.pos,
      slot: a.slot,
      status: a.status,
      prompt: prompt ? promptPayload(prompt) : null,
      secondsToCommit: a.seconds_to_commit,
      autoCommitted: !!a.auto_committed,
      committedIdeaId: a.committed_idea_id,
      label: a.commit_label,
      checks: a.checks ? JSON.parse(a.checks) : null,
      ideaCount: a.idea_count,
      ideas,
      distinctTags: new Set(tags).size,
      ratings,
      photos: photos.map((p) => ({ id: p.id, url: `/api/photos/${p.id}`, createdAt: p.created_at })),
      revealsCardIds: reveals,
    };
  });
}

export function results(ctx: Ctx, sid: number) {
  const st = sessionState(ctx, sid);
  return { serverNow: st.serverNow, session: st.session, partA: partAResults(ctx, sid), partB: partBResults(ctx, sid) };
}
