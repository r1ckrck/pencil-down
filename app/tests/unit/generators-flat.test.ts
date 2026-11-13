import { describe, expect, it } from "vitest";
import type { Difficulty, GeneratedQuestion } from "@/content/types";
import { FLAT_GENERATORS } from "@/generators/flat";

const SEEDS = 1000;
const DIFFICULTIES: Difficulty[] = [1, 2, 3];

// Strip data-* attributes: what is left is exactly what renders.
const rendered = (svg: string) => svg.replace(/ data-[a-z]+="[^"]*"/g, "");
const rootTag = (svg: string) => svg.slice(0, svg.indexOf(">") + 1);

function checkSvg(svg: string) {
  expect(svg.includes("#")).toBe(false);
  const root = rendered(rootTag(svg));
  expect(root).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/);
  expect(root).not.toMatch(/\s(width|height)=/);
  expect(svg).not.toMatch(/font-family|rgb\(|hsl\(/);
}

for (const gen of FLAT_GENERATORS) {
  describe(gen.id, () => {
    for (const format of gen.formats) {
      for (const d of DIFFICULTIES) {
        it(`${format} d${d}: deterministic, solvable, distinct options`, () => {
          for (let seed = 1; seed <= SEEDS; seed++) {
            const q: GeneratedQuestion = gen.generate(seed, d, format);
            expect(gen.generate(seed, d, format)).toEqual(q);
            expect(q.id).toBe(`gen:${gen.id}:${format}:${d}:${seed}`);
            expect(q.format).toBe(format);
            expect(q.topic).toBe(gen.topic);
            expect(gen.solve(q)).toEqual(q.answer);
            checkSvg(q.figure);
            if (format === "NAT") {
              expect(q.options).toBeNull();
              expect(q.answer.kind).toBe("NAT");
              continue;
            }
            const opts = q.options!;
            expect(opts.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
            for (const o of opts) checkSvg(o.svg);
            expect(new Set(opts.map((o) => rendered(o.svg))).size).toBe(4);
            const keys = opts.map((o) => o.svg.match(/data-key="([^"]*)"/)![1]);
            expect(new Set(keys).size).toBe(4);
            if (q.answer.kind === "MSQ") {
              expect(q.answer.options.length).toBeGreaterThanOrEqual(1);
              expect(q.answer.options.length).toBeLessThanOrEqual(4);
              expect([...q.answer.options].sort()).toEqual(q.answer.options);
            } else expect(q.answer.kind).toBe("MCQ");
          }
        });
      }
    }
  });
}
