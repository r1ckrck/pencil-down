// iso-to-ortho (MCQ): isometric drawing with an arrow; pick the orthographic view in that direction.
// Views show the unit grid thinly and every depth step as a heavier line, like a technical drawing.
//
// Data: figure <svg data-voxels="..." data-ask="top|front|side">; options <svg data-view="w h d,d,./...">.
// Construction projects voxels onto the picture plane (nearest wins). The solver casts a ray per cell
// (rayView) and compares what each option would draw: occupancy plus depth steps.
import type { Difficulty, Format, GeneratedQuestion, Generator, SimpleAnswer } from "@/content/types";
import { createRng } from "../rng";
import { arrange, answerFrom, qid } from "./common";
import { isoPiece } from "./iso";
import { mirrorSolid, nearMiss, randomSolid, viewArrow, viewVisibleInIso } from "./objects";
import {
  type View,
  type ViewDir,
  VIEW_DIRS,
  decodeView,
  encodeView,
  flipH,
  flipV,
  project,
  rayView,
  signature,
  viewPiece,
} from "./ortho";
import { grow, readData, root, rootAll } from "./svg";
import { parseVoxels, serial } from "./voxel";

const ASK: Record<Difficulty, ViewDir[]> = { 1: ["top"], 2: ["top", "front", "side"], 3: ["front", "side"] };

function generate(seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion {
  const rng = createRng(seed);
  for (;;) {
    const solid = randomSolid(rng, difficulty);
    const ask = rng.pick(ASK[difficulty]);
    if (!viewVisibleInIso(solid.vs, ask)) continue;
    const correct = project(solid.vs, ask);
    const seen = new Set([signature(correct)]);
    const outline = signature(correct, false);
    const wrong: View[] = [];
    const later: View[] = [];
    const add = (v: View | null) => {
      if (!v || wrong.length >= 3) return;
      // easy level: first take distractors whose outline already differs
      if (difficulty === 1 && signature(v, false) === outline) {
        later.push(v);
        return;
      }
      const s = signature(v);
      if (seen.has(s)) return;
      seen.add(s);
      wrong.push(v);
    };
    const others = VIEW_DIRS.filter((d) => d !== ask).map((d) => project(solid.vs, d));
    const near = () => {
      const n = nearMiss(rng, solid);
      return n ? project(n.vs, ask) : null;
    };
    add(ask === "top" ? flipV(correct) : flipH(correct));
    if (difficulty === 1) {
      add(rng.pick(others));
      add(flipH(correct));
    } else {
      add(project(mirrorSolid(solid).vs, ask));
    }
    for (let i = 0; i < 12 && wrong.length < 3; i++) add(near());
    for (const o of others) add(o);
    for (const v of later) {
      const s = signature(v);
      if (wrong.length < 3 && !seen.has(s)) {
        seen.add(s);
        wrong.push(v);
      }
    }
    if (wrong.length < 3) continue;

    const views = [correct, ...wrong];
    const svgs = rootAll(
      views.map((v) => viewPiece(v, true)),
      views.map((v) => ({ kind: "view", view: encodeView(v) })),
    );
    const piece = isoPiece(solid.vs);
    const arrows =
      ask === "top"
        ? [viewArrow(solid.vs, "top", "Top"), viewArrow(solid.vs, "front", "Front")]
        : [viewArrow(solid.vs, ask, "View")];
    for (const a of arrows) for (const [x, y] of a.pts) grow(piece.box, x, y);
    const figure = root(
      { body: piece.body + arrows.map((a) => a.body).join(""), box: piece.box },
      { kind: "voxels", voxels: serial(solid.vs), ask },
    );
    const { options, answer, correct: label } = arrange(
      rng,
      svgs.map((svg, i) => ({ svg, correct: i === 0 })),
      "MCQ",
    );
    const stem =
      ask === "top"
        ? "Which option is the top view of the object, drawn with its front edge at the bottom?"
        : "Which option shows the object as seen in the direction of the arrow?";
    return {
      id: qid("iso-to-ortho", format, difficulty, seed),
      generator: "iso-to-ortho",
      seed,
      difficulty,
      format,
      topic: "3d-visualisation",
      stem,
      figure,
      options,
      answer,
      explanation:
        `**${label[0]}**. Count cubes across and up in the viewing direction to get the outline, then mark a heavier line wherever two neighbouring faces sit at different depths. ` +
        `The other options are mirrored, seen from another side, or belong to a solid with one cube changed.`,
    };
  }
}

function solve(q: GeneratedQuestion): SimpleAnswer {
  const vs = parseVoxels(readData(q.figure, "voxels"));
  const ask = readData(q.figure, "ask") as ViewDir;
  const target = signature(rayView(vs, ask));
  return answerFrom("MCQ", q.options!.map((o) => signature(decodeView(readData(o.svg, "view"))) === target));
}

export const isoToOrtho: Generator = {
  id: "iso-to-ortho",
  topic: "3d-visualisation",
  formats: ["MCQ"],
  generate,
  solve,
};
