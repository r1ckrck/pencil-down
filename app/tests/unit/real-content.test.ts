import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContentFrom } from "@/content/load";
import { SLOTS, TOPICS } from "@/content/types";
import { DAY_MS } from "@/engine/errorlog";
import { topicQuotas, VISUAL_TOPICS } from "@/engine/selection";
import { attempts, createSession, quit, responses } from "@/engine/session";
import { GENERATORS } from "@/generators";
import { makeCtx } from "./fixtures";

// The same rules as the fixture tests, run against the committed pool and the real generators.
const content = loadContentFrom(join(__dirname, "../../../content"));
const ineligible = new Set(content.questions.filter((q) => q.animated || q.answer.kind === "DROPPED").map((q) => q.id));

describe("committed pool", () => {
  it("20 consecutive mocks: 8 / 10 / 26, topic quotas ± 1, ~30% visual generated, no repeats, no animated or dropped", () => {
    const ctx = makeCtx(content, GENERATORS, 7);
    const quotas = topicQuotas(content.topicWeights!.weights);
    const served = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const s = createSession(ctx, { kind: "mock" });
      const rows = responses(ctx.db, s.id);
      expect(rows).toHaveLength(44);
      const count = (f: (r: (typeof rows)[0]) => boolean) => rows.filter(f).length;
      expect([count((r) => r.format === "NAT"), count((r) => r.format === "MSQ"), count((r) => r.format === "MCQ")]).toEqual([8, 10, 26]);
      for (const t of TOPICS) expect(Math.abs(count((r) => r.topic === t) - quotas[t]), `mock ${i} ${t}`).toBeLessThanOrEqual(1);
      const visual = rows.filter((r) => VISUAL_TOPICS.includes(r.topic));
      expect(Math.abs(visual.filter((r) => r.source === "generated").length - Math.round(visual.length * 0.3))).toBeLessThanOrEqual(1);
      for (const r of rows) {
        expect(ineligible.has(r.question_id), `mock ${i} serves ${r.question_id}`).toBe(false);
        expect(served.has(r.question_id), `mock ${i} repeats ${r.question_id}`).toBe(false);
        served.add(r.question_id);
      }
      quit(ctx, s.id);
      ctx.advance(DAY_MS);
    }
  });

  it("20 consecutive Part B mocks: one prompt per slot in paper order, no repeats", () => {
    const ctx = makeCtx(content, GENERATORS, 11);
    const served = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const s = createSession(ctx, { kind: "b-mock" });
      const atts = attempts(ctx.db, s.id);
      expect(atts.map((a) => a.slot)).toEqual([...SLOTS]);
      for (const a of atts) {
        expect(served.has(a.prompt_id), `b-mock ${i} repeats ${a.prompt_id}`).toBe(false);
        served.add(a.prompt_id);
      }
      quit(ctx, s.id);
      ctx.advance(DAY_MS);
    }
  });

  it("every eligible past paper serves its whole printed paper, animated and dropped included", () => {
    const ctx = makeCtx(content, GENERATORS, 3);
    const papers = content.papers.filter((p) => p.pastPaperEligible);
    expect(papers.map((p) => p.year).sort()).toEqual([2020, 2021, 2022, 2023, 2024, 2025, 2026]);
    for (const p of papers) {
      const s = createSession(ctx, { kind: "past-paper", paperId: p.id });
      expect(responses(ctx.db, s.id).map((r) => r.question_id)).toEqual(p.questionIds);
      expect(s.config.scheme).toEqual(p.scheme);
      quit(ctx, s.id);
    }
    expect(papers.some((p) => p.questionIds.some((id) => ineligible.has(id)))).toBe(true);
  });
});
