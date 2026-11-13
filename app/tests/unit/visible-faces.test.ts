import { describe, expect, it } from "vitest";
import { stackDetermined, visibleFaces, visibleFaces2 } from "@/generators/solid/visible-faces";
import { generatorsFor } from "@/generators";
import { isoPiece, readableStack } from "@/generators/solid/iso";
import { countReadings, pilesOf } from "@/generators/solid/stack-reading";
import type { Vox } from "@/generators/solid/voxel";
import { readData } from "@/generators/solid/svg";
import { fromHeights } from "@/generators/solid/voxel";

// What the drawing shows, independent of how paths happen to be ordered: every path's segments, sorted.
const drawn = (vs: Vox[]) =>
  [...isoPiece(vs).body.matchAll(/d="([^"]*)" ([^>]*)\/>/g)]
    .flatMap((m) => m[1].split(/(?=M)/).map((t) => m[2] + t.split(/[MLZ]/).filter(Boolean).sort().join(";")))
    .sort()
    .join("|");
const heights = (fig: string) => readData(fig, "heights").split("/").map((r) => r.split(",").map(Number));

describe("visible-faces stacks", () => {
  it("the reported stack is pinned down once every pile top shows and the grid size is stated", () => {
    // rows x back→front, columns y left→right. Without the stated 3 x 3 grid the back pile could stand one square
    // further back and one cube shorter; the grid size rules that out.
    expect(stackDetermined([[0, 2, 1], [3, 1, 1], [3, 0, 0]])).toBe(true);
    expect(countReadings(pilesOf([[0, 2, 1], [3, 1, 1], [3, 0, 0]])).count).toBe(2);
  });

  it("finds a second reading that really draws the same picture, and rejects that stack", () => {
    const H = [[0, 0, 3], [0, 3, 1], [2, 1, 0]];
    expect(stackDetermined(H)).toBe(false);
    const { alternatives } = countReadings(pilesOf(H), 2, { rows: 3, cols: 3 });
    expect(alternatives.length).toBe(1);
    // checked with the renderer, an independent path: same drawing, different stack
    const asVox = (ps: { x: number; y: number; h: number }[]) =>
      ps.flatMap((p) => Array.from({ length: p.h }, (_, z): Vox => [p.x, p.y, z]));
    expect(drawn(asVox(alternatives[0]))).toBe(drawn(asVox(pilesOf(H))));
  });

  it("a back row hidden behind a taller front row breaks the column-top rule, so it is never drawn", () => {
    expect(readableStack(fromHeights([[1, 1, 1], [2, 2, 2], [3, 3, 3]]))).toBe(false);
    expect(readableStack(fromHeights([[3, 3, 3], [2, 2, 2], [1, 1, 1]]))).toBe(true);
  });

  it("accepts a stack whose drawing pins every column", () => {
    expect(stackDetermined([[1, 1], [1, 1]])).toBe(true);
  });

  it("every visible-faces-2 drawing pins down every column height (all formats and difficulties)", () => {
    for (const format of visibleFaces2.formats)
      for (const d of [1, 2, 3] as const)
        for (let seed = 0; seed < 300; seed++) {
          const q = visibleFaces2.generate(seed, d, format);
          expect(stackDetermined(heights(q.figure))).toBe(true);
          expect(q.stem).toContain("the top of every pile can be seen");
          expect(q.stem).toMatch(/on a \d × \d grid of squares/);
        }
  });

  it("the retired generator still regenerates served questions but is never selected", () => {
    const old = visibleFaces.generate(7, 2, "NAT");
    expect(old.id).toBe("gen:visible-faces:NAT:2:7");
    expect(visibleFaces.retired).toBe(true);
    expect(generatorsFor("3d-visualisation", "NAT").map((g) => g.id)).not.toContain("visible-faces");
    expect(generatorsFor("3d-visualisation", "NAT").map((g) => g.id)).toContain("visible-faces-2");
  });
});
