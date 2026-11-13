// Fairness invariants: every question has one defensible answer from the stem and the picture, with the needed
// conventions stated, and the levels are genuinely different.
import { describe, expect, it } from "vitest";
import type { Difficulty, GeneratedQuestion, Generator } from "@/content/types";
import { GENERATORS } from "@/generators";
import { readData as readFlat } from "@/generators/flat/svg";
import { isoAlternatives } from "@/generators/solid/iso-reading";
import { visibleCounts } from "@/generators/solid/iso";
import { hiddenAdditions } from "@/generators/solid/objects";
import { VIEW_DIRS, decodeView, project, signature } from "@/generators/solid/ortho";
import { readData } from "@/generators/solid/svg";
import { parseVoxels } from "@/generators/solid/voxel";

const gen = (id: string) => GENERATORS.find((g) => g.id === id)!;
const D: Difficulty[] = [1, 2, 3];
const SEEDS = 300;
const voxelsOf = (svg: string) => parseVoxels(readData(svg, "voxels"));
const isoDrawings = (q: GeneratedQuestion) =>
  [q.figure, ...(q.options ?? []).map((o) => o.svg)].filter((s) => s.includes("data-voxels"));

describe("isometric solids: all cubes visible, one reading", () => {
  for (const id of ["iso-to-ortho", "ortho-to-iso", "rotation-3d"])
    it(`${id}: every drawn cube shows, no other all-visible reading, rule stated`, () => {
      for (const d of D)
        for (let seed = 0; seed < SEEDS; seed++) {
          const q = gen(id).generate(seed, d, "MCQ");
          expect(q.stem).toContain("no hidden cubes");
          for (const svg of isoDrawings(q)) {
            const vs = voxelsOf(svg);
            expect(Math.min(...visibleCounts(vs))).toBeGreaterThanOrEqual(2);
            expect(isoAlternatives(vs, 3, 1)).toEqual([]);
          }
        }
    }, 60_000);

  it("iso-to-ortho: no completely hidden extra cube turns the view into a wrong option", () => {
    for (const d of D)
      for (let seed = 0; seed < SEEDS; seed++) {
        const q = gen("iso-to-ortho").generate(seed, d, "MCQ");
        const ask = readData(q.figure, "ask") as "top" | "front" | "side";
        const key = q.answer.kind === "MCQ" ? q.answer.option : "";
        const wrong = new Set(
          q.options!.filter((o) => o.label !== key).map((o) => signature(decodeView(readData(o.svg, "view")))),
        );
        for (const vs of hiddenAdditions(voxelsOf(q.figure))) expect(wrong.has(signature(project(vs, ask)))).toBe(false);
      }
  }, 60_000);

  it("ortho-to-iso: no wrong option fits all three views even with a hidden extra cube", () => {
    for (const d of D)
      for (let seed = 0; seed < SEEDS; seed++) {
        const q = gen("ortho-to-iso").generate(seed, d, "MCQ");
        const target = VIEW_DIRS.map((v) => signature(decodeView(readData(q.figure, v)))).join("|");
        const key = q.answer.kind === "MCQ" ? q.answer.option : "";
        for (const o of q.options!.filter((o) => o.label !== key))
          for (const vs of hiddenAdditions(voxelsOf(o.svg)))
            expect(VIEW_DIRS.map((v) => signature(project(vs, v))).join("|")).not.toBe(target);
      }
  }, 60_000);

  it("rotation-3d: figure and options have the same number of cubes, and the stem states it", () => {
    for (const d of D)
      for (let seed = 0; seed < SEEDS; seed++) {
        const q = gen("rotation-3d").generate(seed, d, "MCQ");
        const n = voxelsOf(q.figure).length;
        expect(q.stem).toContain(`made of ${n} identical cubes`);
        for (const o of q.options!) expect(voxelsOf(o.svg).length).toBe(n);
      }
  }, 60_000);

  it("iso-to-ortho: the line convention is stated; level 1 has no distractor that differs only in depth lines", () => {
    for (const d of D)
      for (let seed = 0; seed < SEEDS; seed++) {
        const q = gen("iso-to-ortho").generate(seed, d, "MCQ");
        expect(q.stem).toContain("thick lines are the edge of the view or a step in depth");
        const key = q.answer.kind === "MCQ" ? q.answer.option : "";
        const outline = (svg: string) => signature(decodeView(readData(svg, "view")), false);
        const keyOutline = outline(q.options!.find((o) => o.label === key)!.svg);
        const same = q.options!.filter((o) => o.label !== key && outline(o.svg) === keyOutline).length;
        expect(same).toBeLessThanOrEqual(d === 1 ? 0 : d === 2 ? 1 : 3);
      }
  }, 60_000);
});

describe("numeric options", () => {
  for (const id of ["visible-faces-2", "cubes-from-views"])
    it(`${id}: the key is the smallest or largest option about half the time`, () => {
      for (const d of D) {
        let edge = 0;
        const N = 600;
        for (let seed = 0; seed < N; seed++) {
          const q = gen(id).generate(seed, d, "MCQ");
          const vals = q.options!.map((o) => Number(readData(o.svg, "value")));
          const key = q.answer.kind === "MCQ" ? "ABCD".indexOf(q.answer.option) : -1;
          if (vals[key] === Math.min(...vals) || vals[key] === Math.max(...vals)) edge++;
        }
        expect(edge / N).toBeGreaterThan(0.35);
        expect(edge / N).toBeLessThan(0.65);
      }
    }, 60_000);
});

describe("levels are genuinely different", () => {
  const same = (g: Generator, format: "MCQ" | "MSQ" | "NAT", a: Difficulty, b: Difficulty, part: (q: GeneratedQuestion) => string) => {
    let n = 0;
    for (let seed = 0; seed < SEEDS; seed++) if (part(g.generate(seed, a, format)) === part(g.generate(seed, b, format))) n++;
    return n;
  };
  const optionSet = (q: GeneratedQuestion) => (q.options ?? []).map((o) => o.svg).sort().join("");

  it("cube-net: MCQ nets never repeat across levels 1 and 2; MSQ option sets almost never", () => {
    const g = gen("cube-net");
    expect(same(g, "MCQ", 1, 2, (q) => readData(q.figure, "net"))).toBe(0);
    expect(same(g, "MSQ", 1, 2, optionSet)).toBeLessThan(SEEDS * 0.02);
    expect(same(g, "MSQ", 2, 3, optionSet)).toBeLessThan(SEEDS * 0.02);
  });

  it("matrix-completion: levels never share a grid", () => {
    const g = gen("matrix-completion");
    expect(same(g, "MCQ", 1, 2, (q) => JSON.stringify(readFlat<unknown>(q.figure, "grid")))).toBe(0);
    expect(same(g, "MCQ", 2, 3, (q) => JSON.stringify(readFlat<unknown>(q.figure, "grid")))).toBe(0);
  });

  it("cubes-from-views: levels 1 and 2 never draw the same views", () => {
    const g = gen("cubes-from-views");
    expect(same(g, "NAT", 1, 2, (q) => q.figure)).toBe(0);
    expect(same(g, "NAT", 2, 3, (q) => q.figure)).toBe(0);
  });

  it("cube-net: no two face marks can be read as each other once turned (no cross, no outlined square)", () => {
    for (const d of D)
      for (let seed = 0; seed < SEEDS; seed++) {
        const net = readData(gen("cube-net").generate(seed, d, "MCQ").figure, "net");
        expect(net).not.toMatch(/cross|square/);
      }
  });
});

describe("matrix-completion", () => {
  type Cell = Record<"shape" | "count" | "angle" | "fill", number>;
  it("level 1: every option uses only values that appear in the grid", () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const q = gen("matrix-completion").generate(seed, 1, "MCQ");
      const grid = readFlat<(Cell | null)[]>(q.figure, "grid").filter((c): c is Cell => c !== null);
      for (const o of q.options!) {
        const c = readFlat<Cell>(o.svg, "cell");
        for (const a of ["shape", "count", "angle", "fill"] as const) expect(grid.map((g) => g[a])).toContain(c[a]);
      }
    }
  });
  it("no grid is solved by copying the row above or the column to the left", () => {
    for (const d of D)
      for (let seed = 0; seed < SEEDS; seed++) {
        const grid = readFlat<(Cell | null)[]>(gen("matrix-completion").generate(seed, d, "MCQ").figure, "grid");
        const k = (i: number) => JSON.stringify(grid[i]);
        expect(k(6) === k(0) && k(7) === k(1)).toBe(false);
        expect(k(6) === k(3) && k(7) === k(4)).toBe(false);
        expect(k(2) === k(0) && k(5) === k(3)).toBe(false);
        expect(k(2) === k(1) && k(5) === k(4)).toBe(false);
      }
  });
});

describe("fold-punch-unfold", () => {
  type Fold = { a: number; b: number; c: number };
  it("level 1: most distractors keep the crease symmetry, so the mirror check alone does not give the key", () => {
    let strong = 0;
    for (let seed = 0; seed < SEEDS; seed++) {
      const q = gen("fold-punch-unfold").generate(seed, 1, "MCQ");
      const [f] = readFlat<{ folds: Fold[] }>(q.figure, "fold").folds;
      const key = q.answer.kind === "MCQ" ? q.answer.option : "";
      const symmetric = q.options!.filter((o) => {
        if (o.label === key) return false;
        const holes = new Set(readFlat<string[]>(o.svg, "holes"));
        return [...holes].every((h) => {
          const [s, xy] = h.split(":");
          const [x, y] = xy.split(",").map(Number);
          const t = (2 * (f.a * x + f.b * y - f.c)) / (f.a * f.a + f.b * f.b);
          return holes.has(`${s}:${x - t * f.a},${y - t * f.b}`);
        });
      }).length;
      if (symmetric >= 2) strong++;
    }
    expect(strong / SEEDS).toBeGreaterThan(0.9);
  });
  it("every stem states how a punch across a fold opens", () => {
    for (const format of ["MCQ", "NAT"] as const)
      for (const d of D) expect(gen("fold-punch-unfold").generate(1, d, format).stem).toContain("opens into a single hole");
  });
});

describe("wording", () => {
  it("no stem points at a figure 'on the left' (the app shows the figure above the options)", () => {
    for (const g of GENERATORS.filter((x) => !x.retired))
      for (const format of g.formats)
        for (const d of D)
          for (let seed = 0; seed < 20; seed++)
            expect(g.generate(seed, d, format).stem.replace("front face on the left", "")).not.toContain("on the left");
  });
  it("cubes-from-views says which side the side view is seen from", () => {
    const q = gen("cubes-from-views").generate(1, 2, "NAT");
    expect(q.stem).toContain("seen from the right");
    expect(q.figure).toContain("Right side view");
  });
});
