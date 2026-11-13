// rotation-3d (MCQ): a polycube on the left; one option is the same solid turned, the others are its
// mirror image or a near-miss (one cube moved), each drawn in its own random orientation.
//
// Data: every <svg> carries data-voxels="x,y,z x,y,z ..." for exactly the cubes drawn.
// Construction applies a known rotation to the figure's voxel set. The solver ignores that and tests each
// option against all 24 rotations of the figure for set equality.
import type { Difficulty, Format, GeneratedQuestion, Generator, SimpleAnswer } from "@/content/types";
import { createRng, type Rng } from "../rng";
import { arrange, answerFrom, qid } from "./common";
import { isoPiece, readableFree } from "./iso";
import { readData, root, rootAll } from "./svg";
import {
  ROTATIONS,
  type Vox,
  canonical,
  growPolycube,
  mirror,
  moveOne,
  normalize,
  parseVoxels,
  rotate,
  serial,
} from "./voxel";

const SIZE: Record<Difficulty, [number, number]> = { 1: [4, 5], 2: [5, 6], 3: [7, 8] };

/** A random orientation of `vs` that draws without hidden or floating-looking cubes. */
export function readableTurn(rng: Rng, vs: Vox[], avoid: string[] = [], minTris = 2): Vox[] | null {
  for (const m of rng.shuffle(ROTATIONS)) {
    const r = rotate(vs, m);
    if (avoid.includes(serial(r))) continue;
    if (readableFree(r, minTris)) return r;
  }
  return null;
}

export const enc = (vs: Vox[]) => serial(vs);

function build(rng: Rng, d: Difficulty) {
  for (;;) {
    const [lo, hi] = SIZE[d];
    const base = growPolycube(rng, rng.int(lo, hi), 3);
    const c0 = canonical(base);
    const mir = mirror(base);
    if (canonical(mir) === c0) continue; // need a chiral solid so the mirror is a real distractor
    const shown = readableTurn(rng, base);
    if (!shown) continue;
    const answer = readableTurn(rng, base, [serial(shown)]);
    if (!answer) continue;

    const used = new Set([c0]);
    const wrong: Vox[][] = [];
    const tryAdd = (vs: Vox[] | null) => {
      if (!vs || wrong.length >= 3) return;
      const c = canonical(vs);
      if (used.has(c)) return;
      const t = readableTurn(rng, vs);
      if (!t) return;
      used.add(c);
      wrong.push(t);
    };
    tryAdd(mir);
    for (let i = 0; i < 20 && wrong.length < 3; i++) {
      const near = moveOne(rng, base);
      tryAdd(i % 2 === 0 || !near ? near : mirror(near));
    }
    if (wrong.length < 3) continue;
    return { shown, answer, wrong };
  }
}

function generate(seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion {
  const rng = createRng(seed);
  const { shown, answer, wrong } = build(rng, difficulty);
  const sets = [answer, ...wrong];
  const svgs = rootAll(
    sets.map(isoPiece),
    sets.map((vs) => ({ kind: "voxels", voxels: enc(vs) })),
  );
  const { options, answer: key, correct } = arrange(
    rng,
    svgs.map((svg, i) => ({ svg, correct: i === 0 })),
    "MCQ",
  );
  return {
    id: qid("rotation-3d", format, difficulty, seed),
    generator: "rotation-3d",
    seed,
    difficulty,
    format,
    topic: "3d-visualisation",
    stem: "Which option shows the same solid as the one on the left, only turned to a different position?",
    figure: root(isoPiece(shown), { kind: "voxels", voxels: enc(shown) }),
    options,
    answer: key,
    explanation:
      `**${correct[0]}**. Pick one distinctive feature (an end arm, a bend) and track where the arms around it go. ` +
      `One wrong option is the mirror image, which no turn can produce; the others have one cube moved.`,
  };
}

function solve(q: GeneratedQuestion): SimpleAnswer {
  const target = normalize(parseVoxels(readData(q.figure, "voxels")));
  const keyOf = (vs: Vox[]) => serial(vs);
  const t = keyOf(target);
  return answerFrom(
    "MCQ",
    q.options!.map((o) => {
      const vs = parseVoxels(readData(o.svg, "voxels"));
      return vs.length === target.length && ROTATIONS.some((m) => keyOf(rotate(vs, m)) === t);
    }),
  );
}

export const rotation3d: Generator = {
  id: "rotation-3d",
  topic: "3d-visualisation",
  formats: ["MCQ"],
  generate,
  solve,
};
