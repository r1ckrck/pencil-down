import { describe, expect, it } from "vitest";
import { stackDetermined, visibleFaces, visibleFaces2 } from "@/generators/solid/visible-faces";
import { generatorsFor } from "@/generators";
import { readableStack } from "@/generators/solid/iso";
import { readData } from "@/generators/solid/svg";
import { fromHeights } from "@/generators/solid/voxel";

const heights = (fig: string) => readData(fig, "heights").split("/").map((r) => r.split(",").map(Number));

describe("visible-faces stacks", () => {
  it("the reported stack is pinned down once hidden cubes may only be support", () => {
    // rows x back→front, columns y left→right. The corner x0,y0 could hide a lone cube, but a lone hidden cube holds
    // nothing up, so the stated rule rules it out; the two hidden cubes that do hold others up are implied.
    expect(stackDetermined([[0, 2, 1], [3, 1, 1], [3, 0, 0]])).toBe(true);
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
          expect(q.stem).toContain("count those too");
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
