import { describe, expect, it } from "vitest";
import type { Option } from "@/content/types";
import { CURRENT_SCHEME, normaliseInput, scoreAnswer } from "@/engine/scoring";
import { OLD_SCHEME } from "./fixtures";

const ALL: Option[] = ["A", "B", "C", "D"];
const subsets = (): Option[][] => {
  const out: Option[][] = [];
  for (let mask = 1; mask < 16; mask++) out.push(ALL.filter((_, i) => mask & (1 << i)));
  return out;
};

// Spec §9 restated as a lookup on (|C|, |S|) for strict correct subsets.
const PARTIAL: Record<string, number> = { "4,3": 3, "4,2": 2, "3,2": 2, "4,1": 1, "3,1": 1, "2,1": 1 };
function expected(key: Option[], sel: Option[]): number {
  if (!sel.every((o) => key.includes(o))) return -1;
  if (sel.length === key.length) return 4;
  return PARTIAL[`${key.length},${sel.length}`];
}

describe("MSQ, current scheme: every selection for every key of size 1–4", () => {
  const keys = subsets();
  for (const size of [1, 2, 3, 4]) {
    it(`key size ${size}: all 15 non-empty selections`, () => {
      const ofSize = keys.filter((k) => k.length === size);
      let checked = 0;
      for (const key of ofSize)
        for (const sel of subsets()) {
          const s = scoreAnswer({ kind: "MSQ", options: key }, { kind: "MSQ", options: sel }, CURRENT_SCHEME);
          expect(s.marks, `key ${key} sel ${sel}`).toBe(expected(key, sel));
          checked++;
        }
      expect(checked).toBe(ofSize.length * 15);
    });
  }

  it("spot checks from the spec", () => {
    const k = (o: Option[]) => ({ kind: "MSQ" as const, options: o });
    expect(scoreAnswer(k(["A", "B", "C", "D"]), k(["A", "B", "C"]), CURRENT_SCHEME).marks).toBe(3);
    expect(scoreAnswer(k(["A", "B", "C"]), k(["A", "B"]), CURRENT_SCHEME).marks).toBe(2);
    expect(scoreAnswer(k(["A", "B"]), k(["A", "B"]), CURRENT_SCHEME).marks).toBe(4);
    expect(scoreAnswer(k(["A", "B"]), k(["B"]), CURRENT_SCHEME)).toEqual({ outcome: "partial", marks: 1 });
    expect(scoreAnswer(k(["A"]), k(["A", "B"]), CURRENT_SCHEME).marks).toBe(-1);
  });

  it("blank MSQ scores 0", () => {
    expect(scoreAnswer({ kind: "MSQ", options: ["A"] }, null, CURRENT_SCHEME)).toEqual({ outcome: "blank", marks: 0 });
    expect(scoreAnswer({ kind: "MSQ", options: ["A"] }, { kind: "MSQ", options: [] }, CURRENT_SCHEME).outcome).toBe("blank");
  });
});

describe("MSQ, non-partial scheme (2020–2023)", () => {
  it("exact set = full, any other non-empty selection = wrong, blank = 0", () => {
    for (const key of subsets())
      for (const sel of subsets()) {
        const s = scoreAnswer({ kind: "MSQ", options: key }, { kind: "MSQ", options: sel }, OLD_SCHEME);
        expect(s.marks).toBe(sel.join() === key.join() ? 3 : -0.2);
      }
    expect(scoreAnswer({ kind: "MSQ", options: ["A"] }, null, OLD_SCHEME).marks).toBe(0);
  });
});

describe("MCQ and NAT", () => {
  it("MCQ +3 / −0.5 / 0", () => {
    const key = { kind: "MCQ" as const, option: "C" as Option };
    expect(scoreAnswer(key, { kind: "MCQ", option: "C" }, CURRENT_SCHEME).marks).toBe(3);
    expect(scoreAnswer(key, { kind: "MCQ", option: "A" }, CURRENT_SCHEME).marks).toBe(-0.5);
    expect(scoreAnswer(key, null, CURRENT_SCHEME).marks).toBe(0);
    expect(scoreAnswer(key, { kind: "MCQ", option: "A" }, OLD_SCHEME).marks).toBe(-0.5);
    expect(scoreAnswer(key, { kind: "MCQ", option: "C" }, OLD_SCHEME).marks).toBe(2);
  });

  it("NAT range edges are inclusive; wrong and blank score 0", () => {
    const key = { kind: "NAT" as const, min: 2.5, max: 2.7 };
    const v = (value: number) => scoreAnswer(key, { kind: "NAT", value }, CURRENT_SCHEME).marks;
    expect(v(2.5)).toBe(4);
    expect(v(2.7)).toBe(4);
    expect(v(2.6)).toBe(4);
    expect(v(2.4999)).toBe(0);
    expect(v(2.7001)).toBe(0);
    expect(scoreAnswer(key, null, CURRENT_SCHEME).marks).toBe(0);
    expect(scoreAnswer({ kind: "NAT", min: 7, max: 7 }, { kind: "NAT", value: 7 }, OLD_SCHEME).marks).toBe(3);
  });
});

describe("ANY and DROPPED keys", () => {
  it("ANY takes the best alternative (NAT 7 OR 9)", () => {
    const key = { kind: "ANY" as const, of: [{ kind: "NAT" as const, min: 7, max: 7 }, { kind: "NAT" as const, min: 9, max: 9 }] };
    expect(scoreAnswer(key, { kind: "NAT", value: 7 }, CURRENT_SCHEME).marks).toBe(4);
    expect(scoreAnswer(key, { kind: "NAT", value: 9 }, CURRENT_SCHEME).marks).toBe(4);
    expect(scoreAnswer(key, { kind: "NAT", value: 8 }, CURRENT_SCHEME).marks).toBe(0);
    expect(scoreAnswer(key, null, CURRENT_SCHEME).marks).toBe(0);
  });

  it("ANY with MSQ alternatives (B OR B,C)", () => {
    const key = {
      kind: "ANY" as const,
      of: [{ kind: "MSQ" as const, options: ["B"] as Option[] }, { kind: "MSQ" as const, options: ["B", "C"] as Option[] }],
    };
    const s = (o: Option[]) => scoreAnswer(key, { kind: "MSQ", options: o }, CURRENT_SCHEME);
    expect(s(["B"])).toEqual({ outcome: "correct", marks: 4 });
    expect(s(["B", "C"])).toEqual({ outcome: "correct", marks: 4 });
    expect(s(["C"])).toEqual({ outcome: "partial", marks: 1 });
    expect(s(["A"]).marks).toBe(-1);
  });

  it("DROPPED gives everyone the marks, blank included", () => {
    const key = { kind: "DROPPED" as const, marks: 4 };
    expect(scoreAnswer(key, null, CURRENT_SCHEME)).toEqual({ outcome: "dropped", marks: 4 });
    expect(scoreAnswer(key, { kind: "MCQ", option: "A" }, CURRENT_SCHEME).marks).toBe(4);
  });
});

describe("input normalisation", () => {
  it("validates kinds and sorts MSQ", () => {
    expect(normaliseInput("MSQ", { kind: "MSQ", options: ["C", "A", "C"] })).toEqual({ kind: "MSQ", options: ["A", "C"] });
    expect(normaliseInput("MSQ", { kind: "MSQ", options: [] })).toBeNull();
    expect(normaliseInput("MCQ", null)).toBeNull();
    expect(() => normaliseInput("MCQ", { kind: "MCQ", option: "E" })).toThrow();
    expect(() => normaliseInput("NAT", { kind: "NAT", value: Number.NaN })).toThrow();
    expect(() => normaliseInput("NAT", { kind: "MCQ", option: "A" })).toThrow();
  });
});
