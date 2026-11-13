import { describe, expect, it } from "vitest";
import type { Slot } from "@/content/types";
import { SLOTS } from "@/content/types";
import { drillTimeline, paperTimeline, phaseAt, promptVisible } from "@/engine/partb";

const M = 60;

// [phase, fromMin, toMin] per slot, straight from the spec §5.3 table.
const TABLE: Record<Slot, [string, number, number][]> = {
  sketching: [["read", 0, 2], ["generate", 2, 4], ["commit", 4, 5], ["execute", 5, 21], ["buffer", 21, 24]],
  creativity: [["read", 0, 2], ["generate", 2, 10], ["commit", 10, 11], ["execute", 11, 22], ["buffer", 22, 24]],
  visual: [["read", 0, 2], ["generate", 2, 10], ["commit", 10, 11], ["execute", 11, 22], ["buffer", 22, 24]],
  form: [["read", 0, 2], ["generate", 2, 10], ["commit", 10, 11], ["execute", 11, 22], ["buffer", 22, 24]],
  "problem-id": [["read", 0, 2], ["generate", 2, 12], ["commit", 12, 13], ["execute", 13, 22], ["buffer", 22, 24]],
};

describe("single-slot drill timeline", () => {
  for (const slot of SLOTS)
    it(`${slot}: phase boundaries to the second`, () => {
      const t = drillTimeline(slot);
      expect(t.total).toBe(24 * M);
      for (const [phase, from, to] of TABLE[slot]) {
        expect(phaseAt(t, from * M).phase, `${slot} ${phase} start`).toBe(phase);
        expect(phaseAt(t, to * M - 1).phase, `${slot} ${phase} last second`).toBe(phase);
      }
      expect(phaseAt(t, 24 * M).phase).toBe("done");
      const commitBy = TABLE[slot].find(([p]) => p === "commit")![2];
      expect(t.blocks[0].commitDeadline).toBe(commitBy * M);
    });

  it("problem ID splits generate into framing (2–10) and pick (10–12)", () => {
    const t = drillTimeline("problem-id");
    expect(phaseAt(t, 10 * M - 1).label).toBe("framing");
    expect(phaseAt(t, 10 * M).label).toBe("pick");
  });
});

describe("full Part B mock / past paper: 6 / 5 × 22 / buffer", () => {
  const t = paperTimeline(SLOTS);

  it("stamps", () => {
    expect(t.readAll).toEqual({ phase: "read-all", from: 0, to: 6 * M });
    t.blocks.forEach((b, i) => {
      expect(b.start).toBe((6 + 22 * i) * M);
      expect(b.end).toBe((6 + 22 * (i + 1)) * M);
    });
    expect(t.finalBuffer).toEqual({ phase: "final-buffer", from: 116 * M, to: 120 * M });
    expect(t.total).toBe(120 * M);
  });

  it("phase at every boundary second", () => {
    expect(phaseAt(t, 0).phase).toBe("read-all");
    expect(phaseAt(t, 6 * M - 1).phase).toBe("read-all");
    t.blocks.forEach((b) => {
      expect(phaseAt(t, b.start)).toMatchObject({ phase: "read", pos: b.pos });
      expect(phaseAt(t, b.end - 1).pos).toBe(b.pos);
      for (const [phase, from, to] of TABLE[b.slot]) {
        if (from >= 22) continue; // clipped by the 22-minute hard stamp
        expect(phaseAt(t, b.start + from * M).phase).toBe(phase);
        expect(phaseAt(t, b.start + Math.min(to, 22) * M - 1).phase).toBe(phase);
      }
      expect(b.commitDeadline - b.start).toBe(TABLE[b.slot].find(([p]) => p === "commit")![2] * M);
    });
    expect(phaseAt(t, 116 * M).phase).toBe("final-buffer");
    expect(phaseAt(t, 120 * M).phase).toBe("done");
  });
});

describe("question hiding windows (spec §5.0)", () => {
  it("drill: visible for Read only, then hidden, back in the debrief", () => {
    const t = drillTimeline("creativity");
    expect(promptVisible(t, 0, 0, true)).toBe(true);
    expect(promptVisible(t, 0, 2 * M - 1, true)).toBe(true);
    expect(promptVisible(t, 0, 2 * M, true)).toBe(false);
    expect(promptVisible(t, 0, 23 * M, true)).toBe(false);
    expect(promptVisible(t, 0, 24 * M, true)).toBe(true);
    expect(promptVisible(t, 0, 10 * M, false)).toBe(true);
  });

  it("mock: all visible in read-all, each again for 2 min of its own block", () => {
    const t = paperTimeline(SLOTS);
    for (let pos = 0; pos < 5; pos++) {
      expect(promptVisible(t, pos, 6 * M - 1, true)).toBe(true);
      const start = (6 + 22 * pos) * M;
      expect(promptVisible(t, pos, start, true)).toBe(true);
      expect(promptVisible(t, pos, start + 2 * M - 1, true)).toBe(true);
      expect(promptVisible(t, pos, start + 2 * M, true)).toBe(false);
      expect(promptVisible(t, pos, start - 1, true)).toBe(pos === 0); // pos 0's block starts right after read-all
      for (let other = 0; other < 5; other++)
        if (other !== pos) expect(promptVisible(t, other, start + 30, true)).toBe(false);
    }
  });
});
