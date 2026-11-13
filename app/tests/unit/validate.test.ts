import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadContentFrom } from "@/content/load";
import { bannedMatcher, validateContent } from "@/content/validate";
import { CURRENT_SCHEME } from "@/engine/scoring";
import { prompt, question } from "./fixtures";

let dir = "";
afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

function tree(files: Record<string, unknown>) {
  dir = mkdtempSync(join(tmpdir(), "pd-content-"));
  for (const [path, data] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), typeof data === "string" ? data : JSON.stringify(data));
  }
  return dir;
}

const paper = (ids: string[], total: number) => ({
  id: "pool",
  exam: "CEED",
  year: 2024,
  label: "CEED 2024",
  durationMin: 60,
  scheme: CURRENT_SCHEME,
  totalMarks: total,
  questionIds: ids,
  pastPaperEligible: true,
  cutoff: 50.26,
});

describe("content validation", () => {
  it("empty content is valid", () => {
    expect(validateContent(tree({ "meta/banned.txt": "# none\n" }))).toEqual([]);
  });

  it("a clean set passes and loads merged across files", () => {
    const d = tree({
      "part-a/questions-a.json": [question("q1", "mechanisms", "MCQ")],
      "part-a/questions-b.json": { questions: [question("q2", "observation", "NAT")] },
      "part-a/papers.json": [paper(["q1", "q2"], 7)],
      "part-a/images/q1.png": "x",
      "part-a/images/q2.png": "x",
      "part-b/prompts.json": [prompt("p1", "form", "authored")],
      "meta/banned.txt": "funeral\npolitical party\n",
    });
    expect(validateContent(d)).toEqual([]);
    const c = loadContentFrom(d);
    expect(c.questions.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(c.prompts).toHaveLength(1);
  });

  it("catches structure, cross-reference, answer and banned-term problems", () => {
    const bad = prompt("p1", "form", "authored");
    bad.text = "A Funeral procession.";
    bad.criteria = [{ name: "a", marks: 5 }, { name: "b", marks: 5 }];
    const d = tree({
      "part-a/questions.json": [
        question("q1", "mechanisms", "MSQ", { answer: { kind: "MSQ", options: [] } }),
        question("q1", "mechanisms", "MCQ"),
        question("q3", "mechanisms", "NAT", { answer: { kind: "NAT", min: 5, max: 2 } }),
        question("q4", "mechanisms", "NAT", { answer: { kind: "ANY", of: [{ kind: "NAT", min: 1, max: 1 }] } }),
      ],
      "part-a/papers.json": [paper(["q1", "missing"], 150)],
      "part-b/prompts.json": [bad],
      "part-b/papers.json": [{ id: "b", year: 2024, label: "x", durationMin: 120, promptIds: ["p1", "nope"] }],
      "meta/banned.txt": "funeral\n",
    });
    const problems = validateContent(d).join("\n");
    expect(problems).toMatch(/MSQ must have 1–4 correct options/);
    expect(problems).toMatch(/duplicate question id q1/);
    expect(problems).toMatch(/NAT min > max/);
    expect(problems).toMatch(/ANY needs ≥ 2 alternatives/);
    expect(problems).toMatch(/question missing not found/);
    expect(problems).toMatch(/image missing/);
    expect(problems).toMatch(/criteria sum to 10/);
    expect(problems).toMatch(/banned terms: funeral/);
    expect(problems).toMatch(/promptIds must list five prompts/);
    expect(problems).toMatch(/prompt nope not found/);
  });

  it("paper marks must sum to the printed total", () => {
    const d = tree({
      "part-a/questions.json": [question("q1", "mechanisms", "MCQ"), question("q2", "mechanisms", "MCQ", { answer: { kind: "DROPPED", marks: 3 } })],
      "part-a/papers.json": [paper(["q1", "q2"], 7)],
      "part-a/images/q1.png": "x",
      "part-a/images/q2.png": "x",
    });
    expect(validateContent(d).join()).toMatch(/marks sum to 6, printed total is 7/);
  });

  it("banned terms match whole words, case-insensitive", () => {
    const m = bannedMatcher(["riot", "political party", "BJP"]);
    expect(m("A RIOT of colour")).toEqual(["riot"]);
    expect(m("a patriot")).toEqual([]);
    expect(m("Political  party")).toEqual([]);
    expect(m("the political party office")).toEqual(["political party"]);
    expect(m("bjp")).toEqual(["BJP"]);
  });
});
