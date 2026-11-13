// cubes-from-views (NAT, MCQ): top, front and right-side silhouettes of a stack of cubes;
// find the MINIMUM number of cubes that produces all three views.
//
// Data on the figure <svg>:
//   data-top="x,y x,y ..."   occupied columns (x = row from the back, y = column from the left)
//   data-front="h h h"       front-view column heights, left to right (indexed by y)
//   data-side="h h h"        side-view heights indexed by x (row of the top view)
//
// Construction: every top-view cell needs one cube; every front column and side row needs one cube
// raised to its height. A raised cube can serve a front column and a side row at once only when both
// have the same height, so min = |top| + Σ(front−1) + Σ(side−1) − Σ_levels (level−1)·maxMatching(level).
// Solver: exhaustive branch-and-bound over every cell height in {1, min(front, side)}.
import type { Difficulty, Format, GeneratedQuestion, Generator, SimpleAnswer } from "@/content/types";
import { createRng } from "../rng";
import { arrange, answerFrom, optionValue, qid, spreadDistractors } from "./common";
import { threeViewPiece, type View } from "./ortho";
import { numberOption, readData, root } from "./svg";
import { randomHeights } from "./voxel";

// Levels do not overlap in grid size: 2 x 3 up to 2 high, 3 x 3 up to 3 high, 3-4 x 4 up to 4 high.
const DIMS: Record<Difficulty, { rows: [number, number]; cols: [number, number]; maxH: number; fill: number }> = {
  1: { rows: [2, 2], cols: [3, 3], maxH: 2, fill: 0.85 },
  2: { rows: [3, 3], cols: [3, 3], maxH: 3, fill: 0.8 },
  3: { rows: [3, 4], cols: [4, 4], maxH: 4, fill: 0.8 },
};

/** Maximum bipartite matching between front columns and side rows sharing `level`, over top cells. */
function matching(cells: [number, number][], front: number[], side: number[], level: number): number {
  const xs = side.map((_, x) => x).filter((x) => side[x] === level);
  const ys = front.map((_, y) => y).filter((y) => front[y] === level);
  const adj = new Map(xs.map((x) => [x, ys.filter((y) => cells.some(([a, b]) => a === x && b === y))]));
  const matchY = new Map<number, number>();
  const augment = (x: number, seen: Set<number>): boolean => {
    for (const y of adj.get(x)!) {
      if (seen.has(y)) continue;
      seen.add(y);
      if (!matchY.has(y) || augment(matchY.get(y)!, seen)) {
        matchY.set(y, x);
        return true;
      }
    }
    return false;
  };
  let m = 0;
  for (const x of xs) if (augment(x, new Set())) m++;
  return m;
}

export function minByFormula(cells: [number, number][], front: number[], side: number[]): number {
  let total = cells.length + front.reduce((a, h) => a + h - 1, 0) + side.reduce((a, h) => a + h - 1, 0);
  for (const level of new Set([...front, ...side]))
    if (level > 1) total -= (level - 1) * matching(cells, front, side, level);
  return total;
}

export function minBySearch(cells: [number, number][], front: number[], side: number[]): number {
  const cap = cells.map(([x, y]) => Math.min(front[y], side[x]));
  let best = Infinity;
  const fMax = front.map(() => 0);
  const sMax = side.map(() => 0);
  // cells still to come per front column / side row, for the "can this still be met" check
  const fLeft = front.map((_, y) => cells.filter((c) => c[1] === y).length);
  const sLeft = side.map((_, x) => cells.filter((c) => c[0] === x).length);
  const dfs = (i: number, cost: number) => {
    if (cost + (cells.length - i) >= best) return;
    if (i === cells.length) {
      if (fMax.every((m, y) => m === front[y]) && sMax.every((m, x) => m === side[x])) best = cost;
      return;
    }
    const [x, y] = cells[i];
    fLeft[y]--;
    sLeft[x]--;
    for (const h of cap[i] > 1 ? [1, cap[i]] : [1]) {
      const pf = fMax[y];
      const ps = sMax[x];
      fMax[y] = Math.max(pf, h);
      sMax[x] = Math.max(ps, h);
      const dead = (fLeft[y] === 0 && fMax[y] !== front[y]) || (sLeft[x] === 0 && sMax[x] !== side[x]);
      if (!dead) dfs(i + 1, cost + h);
      fMax[y] = pf;
      sMax[x] = ps;
    }
    fLeft[y]++;
    sLeft[x]++;
  };
  dfs(0, 0);
  return best;
}

function generate(seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion {
  const rng = createRng(seed);
  const p = DIMS[difficulty];
  const rows = rng.int(...p.rows);
  const cols = rng.int(...p.cols);
  const h = randomHeights(rng, rows, cols, p.maxH, p.fill);
  const cells: [number, number][] = [];
  h.forEach((row, x) => row.forEach((v, y) => v > 0 && cells.push([x, y])));
  const front = [...Array(cols).keys()].map((y) => Math.max(...h.map((row) => row[y])));
  const side = h.map((row) => Math.max(...row));
  const answer = minByFormula(cells, front, side);
  const maxCount = cells.reduce((a, [x, y]) => a + Math.min(front[y], side[x]), 0);
  const actual = h.flat().reduce((a, v) => a + v, 0);

  // views as silhouettes; top view: r counts up from the front row (x = rows-1)
  const top: View = {
    w: cols,
    h: rows,
    depth: [...Array(rows).keys()].map((r) => [...Array(cols).keys()].map((y) => (h[rows - 1 - r][y] > 0 ? 0 : null))),
  };
  const bars = (heights: number[]): View => {
    const H = Math.max(...heights);
    return {
      w: heights.length,
      h: H,
      depth: [...Array(H).keys()].map((r) => heights.map((v) => (v > r ? 0 : null))),
    };
  };
  const sideLR = [...side].reverse(); // right-side view: front row on the left
  const figure = root(threeViewPiece({ top, front: bars(front), side: bars(sideLR) }, false), {
    kind: "views",
    top: cells.map((c) => c.join(",")).join(" "),
    front: front.join(" "),
    side: side.join(" "),
  });

  const stem =
    "Top, front and right side views of a stack of identical cubes are shown: the top view above the front view, and the right side view, seen from the right so the front of the stack is on its left, beside it. Lines inside a view only separate squares; they do not show height or depth. What is the minimum number of cubes needed to make this stack?";
  const explanation =
    `**${answer}**. Every square of the top view needs at least one cube (${cells.length}). ` +
    `Each column of the front view and each column of the side view then needs one cube raised to its height; ` +
    `where a front column and a side column share a height and meet on an occupied top-view square, one raised stack serves both. ` +
    `The largest stack the views allow is ${maxCount}.`;

  const base = {
    id: qid("cubes-from-views", format, difficulty, seed),
    generator: "cubes-from-views",
    seed,
    difficulty,
    format,
    topic: "3d-visualisation" as const,
    stem,
    figure,
    explanation,
  };
  if (format === "NAT") return { ...base, options: null, answer: { kind: "NAT", min: answer, max: answer } };
  const wrong = spreadDistractors(rng, answer, [maxCount, actual, cells.length], 1);
  const { options, answer: key } = arrange(
    rng,
    [answer, ...wrong].map((v, i) => ({ svg: numberOption(v), correct: i === 0 })),
    "MCQ",
  );
  return { ...base, options, answer: key };
}

function solve(q: GeneratedQuestion): SimpleAnswer {
  const cells = readData(q.figure, "top")
    .split(" ")
    .map((t) => t.split(",").map(Number) as [number, number]);
  const front = readData(q.figure, "front").split(" ").map(Number);
  const side = readData(q.figure, "side").split(" ").map(Number);
  const v = minBySearch(cells, front, side);
  if (q.format === "NAT") return { kind: "NAT", min: v, max: v };
  return answerFrom("MCQ", q.options!.map((o) => optionValue(q, o.svg) === v));
}

export const cubesFromViews: Generator = {
  id: "cubes-from-views",
  topic: "3d-visualisation",
  formats: ["NAT", "MCQ"],
  generate,
  solve,
};
