import { describe, expect, it } from "vitest";
import type { Difficulty, GeneratedQuestion } from "@/content/types";
import { SOLID_GENERATORS } from "@/generators/solid";
import { canonicalOption } from "@/generators/solid/canon";
import { _netInternals } from "@/generators/solid/cube-net";
import { minByFormula, minBySearch } from "@/generators/solid/cubes-from-views";

const SEEDS = 1000;
const DIFFICULTIES: Difficulty[] = [1, 2, 3];
const stripData = (svg: string) => svg.replace(/ data-[a-z-]+="[^"]*"/g, "");

function checkSvg(svg: string) {
  expect(svg).not.toContain("#");
  const rootTag = svg.slice(0, svg.indexOf(">"));
  expect(rootTag).toMatch(/viewBox="[^"]+"/);
  expect(rootTag).not.toMatch(/\swidth=/);
  expect(rootTag).not.toMatch(/\sheight=/);
}

describe("solid generators", () => {
  for (const g of SOLID_GENERATORS)
    for (const format of g.formats)
      for (const d of DIFFICULTIES)
        it(`${g.id} ${format} d${d}: ${SEEDS} seeds`, () => {
          for (let seed = 0; seed < SEEDS; seed++) {
            const q: GeneratedQuestion = g.generate(seed, d, format);
            // deterministic, byte for byte
            expect(JSON.stringify(g.generate(seed, d, format))).toBe(JSON.stringify(q));
            expect(q.id).toBe(`gen:${g.id}:${format}:${d}:${seed}`);
            expect(q.format).toBe(format);
            // independent solver agrees
            expect(g.solve(q)).toEqual(q.answer);
            checkSvg(q.figure);
            if (format === "NAT") {
              expect(q.options).toBeNull();
              expect(q.answer.kind).toBe("NAT");
              if (q.answer.kind === "NAT") {
                expect(q.answer.min).toBe(q.answer.max);
                expect(Number.isInteger(q.answer.min)).toBe(true);
              }
              continue;
            }
            const opts = q.options!;
            expect(opts.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
            opts.forEach((o) => checkSvg(o.svg));
            expect(new Set(opts.map((o) => stripData(o.svg))).size).toBe(4);
            expect(new Set(opts.map((o) => canonicalOption(o.svg))).size).toBe(4);
            if (q.answer.kind === "MSQ") {
              expect(q.answer.options.length).toBeGreaterThanOrEqual(1);
              expect(q.answer.options.length).toBeLessThanOrEqual(4);
              expect([...q.answer.options].sort()).toEqual(q.answer.options);
            }
          }
        }, 60_000);
});

describe("cube-net folding", () => {
  const { ELEVEN, roll, glue, netCanon } = _netInternals;
  it("the eleven nets are distinct and fold to six faces", () => {
    expect(new Set(ELEVEN.map(netCanon)).size).toBe(11);
    for (const n of ELEVEN) expect(new Set(roll(n).map((f) => f.n.join())).size).toBe(6);
  });
  it("edge gluing agrees with rolling on every side of every net", () => {
    for (const n of ELEVEN) {
      const r = roll(n);
      const nb = glue(n)!;
      expect(nb.size).toBe(24);
      n.forEach((_, i) => {
        for (let s = 0; s < 4; s++) {
          const [j, t] = nb.get(`${i}:${s}`)!;
          // side s of square i points at the face j lands on, and j's side t points back at i
          expect(r[i].side[s]).toEqual(r[j].n);
          expect(r[j].side[t]).toEqual(r[i].n);
        }
      });
    }
  });
});

describe("cubes-from-views", () => {
  it("formula and exhaustive search agree on a known case", () => {
    // CEED 2026 Q19 shape class: full 3x3 top, front 3 2 1, side 3 2 1
    const cells: [number, number][] = [];
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) cells.push([x, y]);
    expect(minByFormula(cells, [3, 2, 1], [3, 2, 1])).toBe(minBySearch(cells, [3, 2, 1], [3, 2, 1]));
    expect(minBySearch(cells, [3, 2, 1], [3, 2, 1])).toBe(9 + 2 + 1);
  });
});
