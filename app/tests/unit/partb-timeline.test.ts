import { describe, expect, it } from "vitest";
import type { Slot } from "@/content/types";
import { SLOTS } from "@/content/types";
import { drillPlan, nextReread, paperPlan, questionScript, slotScript, targetsOf } from "@/engine/partb";

const M = 60;

// [bar name, step, fromMin, toMin] per slot, straight from the spec §5.3 table.
const TABLE: Record<Slot, [string, string, number, number][]> = {
  sketching: [["Read", "read", 0, 2], ["Ideas", "ideas", 2, 4], ["Commit", "commit", 4, 5], ["Draw", "draw", 5, 21], ["Buffer", "draw", 21, 24]],
  creativity: [["Read", "read", 0, 2], ["Ideas", "ideas", 2, 10], ["Commit", "commit", 10, 11], ["Draw", "draw", 11, 22], ["Buffer", "draw", 22, 24]],
  visual: [["Read", "read", 0, 2], ["Ideas", "ideas", 2, 10], ["Commit", "commit", 10, 11], ["Draw", "draw", 11, 22], ["Buffer", "draw", 22, 24]],
  form: [["Read", "read", 0, 2], ["Ideas", "ideas", 2, 10], ["Commit", "commit", 10, 11], ["Draw", "draw", 11, 22], ["Buffer", "draw", 22, 24]],
  "problem-id": [
    ["Read", "read", 0, 2],
    ["Framing", "ideas", 2, 10],
    ["Pick", "ideas", 10, 12],
    ["Commit", "commit", 12, 13],
    ["Draw", "draw", 13, 22],
    ["Buffer", "draw", 22, 24],
  ],
};

describe("slot scripts (spec §5.3)", () => {
  it("match the table to the second, contiguous from 0 to 24 min", () => {
    for (const slot of SLOTS) {
      const script = slotScript(slot);
      expect(script.map((s) => [s.name, s.step, s.from / M, s.to / M])).toEqual(TABLE[slot]);
      script.forEach((s, i) => expect(s.from).toBe(i === 0 ? 0 : script[i - 1].to));
    }
  });

  it("step targets: read 2, commit by min 5 / 11 / 13, draw = budget", () => {
    const commitBy = { sketching: 5, creativity: 11, visual: 11, form: 11, "problem-id": 13 };
    const ideasBy = { sketching: 4, creativity: 10, visual: 10, form: 10, "problem-id": 12 };
    for (const slot of SLOTS) {
      expect(targetsOf(slotScript(slot))).toEqual({ read: 2 * M, ideas: ideasBy[slot] * M, commit: commitBy[slot] * M, draw: 24 * M });
    }
  });

  it("a paper question is the script clipped at 22 min", () => {
    for (const slot of SLOTS) {
      const q = questionScript(slot, 22 * M);
      expect(q.at(-1)!.to).toBe(22 * M);
      expect(q.every((s) => s.to <= 22 * M && s.from < s.to)).toBe(true);
      expect(targetsOf(q).draw).toBe(22 * M);
    }
    // Sketching keeps one minute of Buffer; the others lose theirs.
    expect(questionScript("sketching", 22 * M).map((s) => s.name)).toEqual(["Read", "Ideas", "Commit", "Draw", "Buffer"]);
    expect(questionScript("form", 22 * M).map((s) => s.name)).toEqual(["Read", "Ideas", "Commit", "Draw"]);
  });

  it("plans: drill 24 min, paper 6 read-all + 22 per question in 120", () => {
    expect(drillPlan()).toEqual({ readAll: 0, budget: 24 * M, total: 24 * M });
    expect(paperPlan()).toEqual({ readAll: 6 * M, budget: 22 * M, total: 120 * M });
    const p = paperPlan();
    expect(p.readAll + 5 * p.budget).toBe(116 * M); // 4 min spare
  });

  it("rereads: 60, 30, 15, then none", () => {
    expect([0, 1, 2, 3].map(nextReread)).toEqual([60, 30, 15, null]);
  });
});
