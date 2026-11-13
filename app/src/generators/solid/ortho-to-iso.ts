// ortho-to-iso (MCQ): top, front and right-side views; pick the isometric solid that produces all three.
// Every option is drawn with its front face on the left. Wrong options are the mirror image or a solid
// with one cube added, removed or moved, each failing at least one view.
//
// Data: figure <svg data-top data-front data-side> each an encoded view ("w h d,d,./...");
// options <svg data-voxels="...">. Construction keeps the generating solid as the key. The solver
// ray-casts the three views of every option and compares them with the figure's views.
import type { Difficulty, Format, GeneratedQuestion, Generator, SimpleAnswer } from "@/content/types";
import { createRng } from "../rng";
import { arrange, answerFrom, qid } from "./common";
import { isoPiece } from "./iso";
import { type Solid, hiddenAdditions, mirrorSolid, nearMiss, randomSolid, readable } from "./objects";
import { VIEW_DIRS, decodeView, encodeView, project, rayView, signature, threeViewPiece } from "./ortho";
import { readData, root, rootAll } from "./svg";
import { canonical, parseVoxels, serial } from "./voxel";

const viewsKey = (s: Solid) => VIEW_DIRS.map((d) => signature(project(s.vs, d))).join("|");

function generate(seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion {
  const rng = createRng(seed);
  for (;;) {
    const solid = randomSolid(rng, difficulty);
    const key = viewsKey(solid);
    const canon = new Set([canonical(solid.vs)]);
    const wrong: Solid[] = [];
    const add = (s: Solid | null) => {
      if (!s || wrong.length >= 3 || !readable(s)) return;
      const c = canonical(s.vs);
      if (canon.has(c) || viewsKey(s) === key) return;
      // no completely hidden extra cube may make this wrong option fit all three views
      if (hiddenAdditions(s.vs).some((vs) => viewsKey({ vs, heights: null }) === key)) return;
      canon.add(c);
      wrong.push(s);
    };
    if (difficulty > 1) add(mirrorSolid(solid));
    for (let i = 0; i < 30 && wrong.length < 3; i++) add(nearMiss(rng, solid));
    if (wrong.length < 3) continue;

    const views = Object.fromEntries(VIEW_DIRS.map((d) => [d, project(solid.vs, d)])) as Record<
      (typeof VIEW_DIRS)[number],
      ReturnType<typeof project>
    >;
    const figure = root(threeViewPiece(views, true), {
      kind: "views",
      top: encodeView(views.top),
      front: encodeView(views.front),
      side: encodeView(views.side),
    });
    const sets = [solid, ...wrong];
    const svgs = rootAll(
      sets.map((s) => isoPiece(s.vs)),
      sets.map((s) => ({ kind: "voxels", voxels: serial(s.vs) })),
    );
    const { options, answer, correct } = arrange(
      rng,
      svgs.map((svg, i) => ({ svg, correct: i === 0 })),
      "MCQ",
    );
    return {
      id: qid("ortho-to-iso", format, difficulty, seed),
      generator: "ortho-to-iso",
      seed,
      difficulty,
      format,
      topic: "3d-visualisation",
      stem: "Top, front and right side views of a solid made of identical cubes are shown. In the views, thick lines are the edge of the view or a step in depth; thin lines separate cubes at the same depth. In the options all cubes are visible: there are no hidden cubes. Which option is the solid, drawn with its front face on the left?",
      figure,
      options,
      answer,
      explanation:
        `**${correct[0]}**. Check one view at a time and strike out options: the front view fixes the left-hand faces, the side view the right-hand faces, the top view the footprint. ` +
        `Each wrong option breaks at least one view.`,
    };
  }
}

function solve(q: GeneratedQuestion): SimpleAnswer {
  const target = VIEW_DIRS.map((d) => signature(decodeView(readData(q.figure, d))));
  return answerFrom(
    "MCQ",
    q.options!.map((o) => {
      const vs = parseVoxels(readData(o.svg, "voxels"));
      return VIEW_DIRS.every((d, i) => signature(rayView(vs, d)) === target[i]);
    }),
  );
}

export const orthoToIso: Generator = {
  id: "ortho-to-iso",
  topic: "3d-visualisation",
  formats: ["MCQ"],
  generate,
  solve,
};
