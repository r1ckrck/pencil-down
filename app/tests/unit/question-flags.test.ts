// PartAQuestion.excluded (never served outside its paper) and optionLabels (printed labels for A–D).
import { describe, expect, it } from "vitest";
import { answerText, keyText, optionForKey, optionLabel, optionRange, optionText } from "@/components/part-a/labels";
import type { QuestionPayload } from "@/components/part-a/types";
import { questionPayload } from "@/engine/items";
import { assembleRevisit } from "@/engine/selection";
import { createSession, poolState, responses } from "@/engine/session";
import { catalog } from "@/engine/catalog";
import { OLD_SCHEME, fixtureContent, makeCtx, question } from "./fixtures";

const ids = ["x-q1", "x-q2"];
const content = fixtureContent({
  perCell: 3,
  extraQuestions: [
    question("x-q1", "observation", "MCQ", { paperId: "ceed-2022", excluded: "duplicate of ceed-2021-q4" }),
    question("x-q2", "observation", "MCQ", { paperId: "ceed-2022", optionLabels: ["1", "2", "3", "4"] }),
  ],
  papers: [
    {
      id: "ceed-2022",
      exam: "CEED",
      year: 2022,
      label: "CEED 2022",
      durationMin: 60,
      scheme: OLD_SCHEME,
      totalMarks: 4,
      questionIds: ids,
      pastPaperEligible: true,
      cutoff: null,
    },
  ],
});

describe("excluded questions", () => {
  it("never enter mocks, drills or revisit", () => {
    const ctx = makeCtx(content, []);
    for (let i = 0; i < 10; i++) {
      const d = createSession(ctx, { kind: "drill", topic: "observation", format: "MCQ", n: 4 });
      expect(responses(ctx.db, d.id).map((r) => r.question_id)).not.toContain("x-q1");
      ctx.db.prepare("UPDATE sessions SET status = 'quit' WHERE id = ?").run(d.id);
      const m = createSession(ctx, { kind: "mock" });
      expect(responses(ctx.db, m.id).map((r) => r.question_id)).not.toContain("x-q1");
      ctx.db.prepare("UPDATE sessions SET status = 'quit' WHERE id = ?").run(m.id);
    }
    const due = assembleRevisit(content, () => null, poolState(ctx.db), ["x-q1", "x-q2"]);
    expect(due.map((d) => d.questionId)).toEqual(["x-q2"]);
    const obs = catalog(ctx).topics.find((t) => t.topic === "observation")!;
    expect(obs.eligible).toBe(3 * 3 + 1);
  });

  it("stay in their paper for past-paper mode", () => {
    const ctx = makeCtx(content, []);
    const s = createSession(ctx, { kind: "past-paper", paperId: "ceed-2022" });
    expect(responses(ctx.db, s.id).map((r) => r.question_id)).toEqual(ids);
  });
});

describe("option labels", () => {
  const ctx = makeCtx(content, []);
  const labelled = questionPayload(ctx, "x-q2") as QuestionPayload;
  const plain = questionPayload(ctx, "x-q1") as QuestionPayload;

  it("the payload carries the printed labels, null when the paper prints A–D", () => {
    expect(labelled).toMatchObject({ source: "real", options: ["A", "B", "C", "D"], optionLabels: ["1", "2", "3", "4"] });
    expect(plain).toMatchObject({ optionLabels: null });
  });

  it("buttons, hints and keys use the printed label; A–D still works", () => {
    expect(optionLabel(labelled, "A")).toBe("1");
    expect(optionLabel(plain, "A")).toBe("A");
    expect(optionRange(labelled)).toBe("1–4");
    expect(optionRange(plain)).toBe("A–D");
    expect(optionForKey(labelled, "2")).toBe("B");
    expect(optionForKey(labelled, "c")).toBe("C");
    expect(optionForKey(labelled, "D")).toBe("D");
    expect(optionForKey(labelled, "5")).toBeNull();
    expect(optionForKey(plain, "2")).toBeNull();
    expect(optionForKey(null, "a")).toBe("A");
  });

  it("a printed label wins over a clashing letter", () => {
    const q = { ...labelled, optionLabels: ["b", "c", "d", "e"] } as QuestionPayload;
    expect(optionForKey(q, "b")).toBe("A");
    expect(optionForKey(q, "a")).toBe("A");
  });

  it("review shows answer and key in printed labels with the letter", () => {
    expect(optionText(labelled, "B")).toBe("2 (B)");
    expect(optionText(plain, "B")).toBe("B");
    expect(answerText({ kind: "MCQ", option: "B" }, labelled)).toBe("2 (B)");
    expect(answerText({ kind: "MSQ", options: ["A", "C"] }, labelled)).toBe("1 (A), 3 (C)");
    expect(keyText({ kind: "MCQ", option: "D" }, labelled)).toBe("4 (D)");
    expect(keyText({ kind: "ANY", of: [{ kind: "MCQ", option: "A" }, { kind: "MCQ", option: "B" }] }, labelled)).toBe(
      "1 (A) or 2 (B)",
    );
    expect(keyText({ kind: "NAT", min: 3, max: 3 }, labelled)).toBe("3");
    expect(answerText(null, labelled)).toBe("—");
  });
});
