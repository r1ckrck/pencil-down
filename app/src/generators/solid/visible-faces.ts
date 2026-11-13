// visible-faces (NAT, MCQ): a stack of cubes on a floor, every cube resting on the floor or another cube.
// Two registrations share this file:
//   visible-faces    — retired; kept so questions already served still regenerate identically.
//   visible-faces-2  — current; the stem states the convention (hidden cubes only hold up visible ones) and
//                      generation rejects any stack whose drawing does not pin down every column height under it.
// Asks one of:
//   hidden     — how many cubes cannot be seen in this drawing
//   painted    — the stack is painted on every exposed surface except the base; how many cube faces get paint
//   painted:k  — how many cubes end up with exactly k painted faces
//
// Data: figure <svg data-heights="h,h,h/h,h,h" data-ask="hidden|painted|painted:k">; rows are x (back to
// front), columns y (left to right). Construction works voxel by voxel: hidden via the isometric
// triangle-ownership map, paint via six-neighbour checks. The solver works column by column: paint from
// height differences with neighbouring columns, hidden cubes by marching a ray from each visible face
// towards the viewer.
import type { Difficulty, Format, GeneratedQuestion, Generator, SimpleAnswer } from "@/content/types";
import { createRng } from "../rng";
import { arrange, answerFrom, numericDistractors, optionValue, qid } from "./common";
import { isoPiece, isoScene, readableStack } from "./iso";
import { numberOption, readData, root } from "./svg";
import { DIRS6, type Vox, fromHeights, isConnected, vkey } from "./voxel";

type Ask = "hidden" | "painted" | `painted:${number}`;

const SHAPE: Record<Difficulty, { rows: number; cols: [number, number]; maxH: number; asks: ("hidden" | "painted" | "k")[] }> = {
  1: { rows: 3, cols: [3, 3], maxH: 2, asks: ["hidden", "k"] },
  2: { rows: 3, cols: [3, 4], maxH: 3, asks: ["hidden", "k"] },
  3: { rows: 3, cols: [4, 4], maxH: 4, asks: ["k", "painted", "hidden"] },
};

function paintedPerCube(vs: Vox[]): number[] {
  const set = new Set(vs.map(vkey));
  return vs.map(
    (v) =>
      DIRS6.filter(([dx, dy, dz]) => {
        if (dz === -1 && v[2] === 0) return false; // base on the floor stays bare
        return !set.has(vkey([v[0] + dx, v[1] + dy, v[2] + dz]));
      }).length,
  );
}

// Drawing signature in absolute lattice coordinates: per visible triangle its face, and for each lattice neighbour
// whether it is empty, the same cube, or another cube (that decides which lines are drawn). Equal signatures
// mean identical pictures.
function picture(vs: Vox[]): string {
  const scene = isoScene(vs);
  const parts: string[] = [];
  const rel = (vi: number, k: number) => {
    const o = scene.get(k);
    return o === undefined ? 0 : o.vi === vi ? 1 : 2;
  };
  for (const [k, o] of scene) {
    const h = k & 1;
    const r = k >> 1;
    const i = Math.floor(r / 512);
    const j = r % 512;
    const tk = (a: number, b: number, c: number) => ((a * 512 + b) << 1) + c;
    const nb = h === 0 ? [tk(i, j, 1), tk(i - 1, j, 1), tk(i, j + 1, 1)] : [tk(i, j, 0), tk(i, j - 1, 0), tk(i + 1, j, 0)];
    parts.push(`${k}:${o.face}:${nb.map((n) => rel(o.vi, n)).join("")}`);
  }
  return parts.sort().join("|");
}

const columns = (H: number[][]): Vox[] =>
  H.flatMap((row, x) => row.flatMap((n, y) => Array.from({ length: n }, (_, z): Vox => [x, y, z])));

/**
 * True when, under the stem's rule (a hidden cube is only ever there to hold up a cube you can see, so every
 * column's top shows), no single-column change, one cube more or less including a new column in a one-cell
 * margin, draws the same picture.
 */
function determined(H: number[][]): boolean {
  const P = [new Array(H[0].length + 2).fill(0), ...H.map((r) => [0, ...r, 0]), new Array(H[0].length + 2).fill(0)];
  const base = picture(columns(P));
  for (let x = 0; x < P.length; x++)
    for (let y = 0; y < P[0].length; y++)
      for (const d of [1, -1]) {
        if (P[x][y] + d < 0) continue;
        const Q = P.map((r) => [...r]);
        Q[x][y] += d;
        const q = columns(Q);
        if (q.length && readableStack(q) && picture(q) === base) return false;
      }
  return true;
}

function hiddenCount(vs: Vox[]): number {
  const seen = new Set([...isoScene(vs).values()].map((o) => o.vi));
  return vs.length - seen.size;
}

function generateWith(strict: boolean, seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion {
  const name = strict ? "visible-faces-2" : "visible-faces";
  const rng = createRng(seed);
  const p = SHAPE[difficulty];
  for (;;) {
    const cols = rng.int(...p.cols);
    const h = Array.from({ length: p.rows }, () => Array.from({ length: cols }, () => (rng.bool(0.85) ? rng.int(1, p.maxH) : 0)));
    const vs = fromHeights(h);
    if (vs.length < 5 || !isConnected(vs)) continue;
    if (new Set(vs.map((v) => v[0])).size !== p.rows || new Set(vs.map((v) => v[1])).size !== cols) continue;
    if (!readableStack(vs)) continue;
    // fromHeights normalises; rebuild heights from the voxels so data matches the drawing
    const H = Array.from({ length: p.rows }, (_, x) => Array.from({ length: cols }, (_, y) => vs.filter((v) => v[0] === x && v[1] === y).length));
    if (strict && !determined(H)) continue;

    const kind = rng.pick(p.asks);
    const per = paintedPerCube(vs);
    let ask: Ask;
    let answer: number;
    let alt: number[];
    if (kind === "hidden") {
      answer = hiddenCount(vs);
      if (answer === 0) continue;
      ask = "hidden";
      alt = [vs.length - answer, answer + 1];
    } else if (kind === "painted") {
      answer = per.reduce((a, b) => a + b, 0);
      ask = "painted";
      const bases = vs.filter((v) => v[2] === 0).length;
      alt = [answer + bases, answer - vs.filter((v) => v[0] === 0 || v[1] === 0).length];
    } else {
      const ks = [1, 2, 3, 4].filter((k) => per.filter((n) => n === k).length > 0);
      const k = rng.pick(ks);
      answer = per.filter((n) => n === k).length;
      ask = `painted:${k}`;
      alt = [per.filter((n) => n === k + 1).length, per.filter((n) => n === k - 1).length];
    }

    const stemBase = strict
      ? "The stack of identical cubes rests on a floor, and every cube sits on the floor or on another cube. A cube you cannot see is there only to hold up a cube you can see; count those too."
      : "The stack of identical cubes rests on a floor, and every cube sits on the floor or on another cube.";
    const stem =
      ask === "hidden"
        ? `${stemBase} How many cubes cannot be seen in this view?`
        : ask === "painted"
          ? `${stemBase} Every exposed surface except the base is painted. How many cube faces are painted in all?`
          : `${stemBase} Every exposed surface except the base is painted. How many cubes have exactly ${ask.slice(8)} painted face${ask.slice(8) === "1" ? "" : "s"}?`;
    const explanation =
      ask === "hidden"
        ? `**${answer}**. Read each column's height from its top face: ${vs.length} cubes in all. Subtract every cube that shows at least part of a face; ${answer} ${answer === 1 ? "stays" : "stay"} hidden behind or under others.`
        : ask === "painted"
          ? `**${answer}**. Count the top of each column, then the side faces column by column: a side is painted for every level above the neighbouring column's height. Faces resting on the floor stay bare.`
          : `**${answer}**. Read each column's height from its top face; every column is solid down to the floor, so cubes hidden behind or under others count too. For each cube, count its exposed sides and top (a top counts only for the highest cube in its column); faces on the floor stay bare. ${answer} cube${answer === 1 ? " has" : "s have"} exactly ${ask.slice(8)}.`;

    const figure = root(isoPiece(vs), {
      kind: "stack",
      heights: H.map((r) => r.join(",")).join("/"),
      ask,
    });
    const base = {
      id: qid(name, format, difficulty, seed),
      generator: name,
      seed,
      difficulty,
      format,
      topic: "3d-visualisation" as const,
      stem,
      figure,
      explanation,
    };
    if (format === "NAT") return { ...base, options: null, answer: { kind: "NAT", min: answer, max: answer } };
    const wrong = numericDistractors(rng, answer, rng.shuffle(alt));
    const { options, answer: key } = arrange(
      rng,
      [answer, ...wrong].map((v, i) => ({ svg: numberOption(v), correct: i === 0 })),
      "MCQ",
    );
    return { ...base, options, answer: key };
  }
}

// ---------- solver ----------

function solveCount(H: number[][], ask: string): number {
  const rows = H.length;
  const cols = H[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= rows || y >= cols ? 0 : H[x][y]);
  if (ask.startsWith("painted")) {
    // per cube at level z in column (x, y): top if it is the column's highest, plus each side whose
    // neighbouring column is no taller than z
    const per: number[] = [];
    for (let x = 0; x < rows; x++)
      for (let y = 0; y < cols; y++)
        for (let z = 0; z < H[x][y]; z++) {
          let n = z === H[x][y] - 1 ? 1 : 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(x + dx, y + dy) <= z) n++;
          per.push(n);
        }
    if (ask === "painted") return per.reduce((a, b) => a + b, 0);
    const k = Number(ask.slice(8));
    return per.filter((n) => n === k).length;
  }
  // hidden: a cube is seen if a ray from the centre of any of its six visible triangles, marched towards
  // the viewer along (1,1,1), leaves the stack without entering another cube
  const filled = (x: number, y: number, z: number) => z >= 0 && z < at(x, y);
  const maxH = Math.max(...H.flat());
  const span = rows + cols + maxH + 2;
  const third = 1 / 3;
  let hidden = 0;
  for (let x = 0; x < rows; x++)
    for (let y = 0; y < cols; y++)
      for (let z = 0; z < H[x][y]; z++) {
        const starts = [
          [x + 2 * third, y + third, z + 1],
          [x + third, y + 2 * third, z + 1],
          [x + 1, y + third, z + 2 * third],
          [x + 1, y + 2 * third, z + third],
          [x + third, y + 1, z + 2 * third],
          [x + 2 * third, y + 1, z + third],
        ];
        const seen = starts.some(([sx, sy, sz]) => {
          for (let t = 0.05; t < span; t += 0.1) {
            if (filled(Math.floor(sx + t), Math.floor(sy + t), Math.floor(sz + t))) return false;
          }
          return true;
        });
        if (!seen) hidden++;
      }
  return hidden;
}

function solve(q: GeneratedQuestion): SimpleAnswer {
  const H = readData(q.figure, "heights").split("/").map((r) => r.split(",").map(Number));
  const v = solveCount(H, readData(q.figure, "ask"));
  if (q.format === "NAT") return { kind: "NAT", min: v, max: v };
  return answerFrom("MCQ", q.options!.map((o) => optionValue(q, o.svg) === v));
}

export const visibleFaces: Generator = {
  id: "visible-faces",
  topic: "3d-visualisation",
  formats: ["NAT", "MCQ"],
  generate: (seed, difficulty, format) => generateWith(false, seed, difficulty, format),
  solve,
  retired: true,
};

export const visibleFaces2: Generator = {
  id: "visible-faces-2",
  topic: "3d-visualisation",
  formats: ["NAT", "MCQ"],
  generate: (seed, difficulty, format) => generateWith(true, seed, difficulty, format),
  solve,
};

export { determined as stackDetermined };
