// What the start screens can offer: papers, topics, slots, playbooks, pool counts.
import { SLOTS, TOPICS } from "../content/types";
import { getSettings } from "./settings";
import { type Ctx, poolState } from "./session";
import { isEligible } from "./selection";

export function catalog(ctx: Ctx) {
  const { content, generators, db } = ctx;
  const pool = poolState(db);
  const sittings = db
    .prepare(
      `SELECT COALESCE(json_extract(config, '$.paperId'), json_extract(config, '$.bPaperId')) AS paper, COUNT(*) AS n
       FROM sessions WHERE kind IN ('past-paper', 'b-past-paper') GROUP BY paper`,
    )
    .all() as { paper: string; n: number }[];
  const sat = new Map(sittings.map((r) => [r.paper, r.n]));
  return {
    serverNow: ctx.now(),
    defaultMode: getSettings(db).lastMode,
    papers: content.papers
      .filter((p) => p.pastPaperEligible)
      .sort((a, b) => b.year - a.year || a.id.localeCompare(b.id))
      .map((p) => ({
        id: p.id,
        exam: p.exam,
        year: p.year,
        label: p.label,
        durationMin: p.durationMin,
        totalMarks: p.totalMarks,
        questionCount: p.questionIds.length,
        cutoff: p.cutoff,
        sittings: sat.get(p.id) ?? 0,
      })),
    bPapers: [...content.bPapers]
      .sort((a, b) => b.year - a.year)
      .map((p) => ({ id: p.id, year: p.year, label: p.label, durationMin: p.durationMin, sittings: sat.get(p.id) ?? 0 })),
    topics: TOPICS.map((t) => ({
      topic: t,
      eligible: content.questions.filter((q) => q.topic === t && isEligible(q, pool)).length,
      unseen: content.questions.filter((q) => q.topic === t && isEligible(q, pool) && !pool.seen.has(q.id)).length,
      generators: generators.filter((g) => g.topic === t).map((g) => ({ id: g.id, formats: g.formats })),
    })),
    slots: SLOTS.map((s) => ({
      slot: s,
      prompts: content.prompts.filter((p) => p.slot === s).length,
      unseen: content.prompts.filter((p) => p.slot === s && !pool.seen.has(p.id)).length,
    })),
    playbooks: content.playbooks,
    counts: {
      questions: content.questions.length,
      retired: pool.retired.size,
      prompts: content.prompts.length,
      cards: content.cards.length,
    },
  };
}
