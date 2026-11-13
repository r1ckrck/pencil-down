// cube-net
// MCQ: a marked net is shown; pick the isometric cube view it folds into.
// MSQ: four plain hexominoes; pick every one that folds into a cube.
//
// Data embedded for the solver:
//   net  <svg data-net="c,r,symbol,upSide c,r,...">  (r grows downward; upSide 0 N, 1 E, 2 S, 3 W)
//   cube <svg data-cube="sym@dir sym@dir sym@dir">   faces top (+z), front (+x, drawn left), side (+y, drawn right);
//                                                     dir = where the mark's "up" points, as a world axis
//   MSQ  <svg data-net="c,r c,r ...">
//
// Construction folds by rolling a cube across the net (3D rotation matrices).
// The solver never rolls: it zips the net's boundary edges together (edge gluing at 270° corners) to get
// the face-adjacency graph with edge orientation, then tests each view against it. MSQ: construction
// checks the shape against the 11 known nets; the solver rolls the cube and checks six distinct faces.
import type { Difficulty, Format, GeneratedQuestion, Generator, SimpleAnswer } from "@/content/types";
import { createRng, type Rng } from "../rng";
import { arrange, answerFrom, qid } from "./common";
import { isoPiece, project } from "./iso";
import { viewPiece, CELL } from "./ortho";
import { type Piece, n2, readData, root, rootAll } from "./svg";
import { ORIENTED, SYMBOLS, SYMMETRIC, isOriented } from "./symbols";
import { ROTATIONS, apply, type Vox } from "./voxel";

type Cell = [number, number];

// ---------- net shapes ----------

const ELEVEN: Cell[][] = [
  ...[
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 1],
    [1, 2],
  ].map(([a, b]) => [[a, 0], [0, 1], [1, 1], [2, 1], [3, 1], [b, 2]] as Cell[]),
  ...[1, 2, 3].map((b) => [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [b, 2]] as Cell[]),
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
];

const normCells = (cs: Cell[]): Cell[] => {
  const c0 = Math.min(...cs.map((c) => c[0]));
  const r0 = Math.min(...cs.map((c) => c[1]));
  return cs.map(([c, r]) => [c - c0, r - r0] as Cell).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
};
const D4 = [
  ([c, r]: Cell): Cell => [c, r],
  ([c, r]: Cell): Cell => [-c, r],
  ([c, r]: Cell): Cell => [c, -r],
  ([c, r]: Cell): Cell => [-c, -r],
  ([c, r]: Cell): Cell => [r, c],
  ([c, r]: Cell): Cell => [-r, c],
  ([c, r]: Cell): Cell => [r, -c],
  ([c, r]: Cell): Cell => [-r, -c],
];
const cellStr = (cs: Cell[]) => normCells(cs).map((c) => c.join(",")).join(" ");
export const netCanon = (cs: Cell[]) => D4.map((t) => cellStr(cs.map(t))).sort()[0];
const VALID = new Set(ELEVEN.map(netCanon));

const SIDE_STEP: Cell[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
const has = (cs: Cell[], c: number, r: number) => cs.some((x) => x[0] === c && x[1] === r);

function connected2(cs: Cell[]): boolean {
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const i = stack.pop()!;
    cs.forEach((c, j) => {
      if (!seen.has(j) && Math.abs(c[0] - cs[i][0]) + Math.abs(c[1] - cs[i][1]) === 1) {
        seen.add(j);
        stack.push(j);
      }
    });
  }
  return seen.size === cs.length;
}
const hasBlock = (cs: Cell[]) => cs.some(([c, r]) => has(cs, c + 1, r) && has(cs, c, r + 1) && has(cs, c + 1, r + 1));
const longRun = (cs: Cell[]) =>
  cs.some(([c, r]) => [1, 2, 3, 4].every((k) => has(cs, c + k, r)) || [1, 2, 3, 4].every((k) => has(cs, c, r + k)));

function randomValidNet(rng: Rng): Cell[] {
  return normCells(rng.pick(ELEVEN).map(rng.pick(D4)));
}

/** One square of a real net moved: looks plausible, does not fold. */
function nearMissNet(rng: Rng): Cell[] {
  for (;;) {
    const base = randomValidNet(rng);
    const i = rng.int(0, 5);
    const rest = base.filter((_, j) => j !== i);
    const anchor = rng.pick(rest);
    const step = rng.pick(SIDE_STEP);
    const c: Cell = [anchor[0] + step[0], anchor[1] + step[1]];
    if (has(rest, c[0], c[1]) || (c[0] === base[i][0] && c[1] === base[i][1])) continue;
    const next = [...rest, c];
    if (!connected2(next) || hasBlock(next) || longRun(next) || VALID.has(netCanon(next))) continue;
    return normCells(next);
  }
}

/** A hexomino that visibly cannot fold: a 2x2 block or a run of five. */
function obviousBadNet(rng: Rng): Cell[] {
  for (;;) {
    const cs: Cell[] = rng.bool()
      ? [[0, 0], [1, 0], [0, 1], [1, 1]]
      : [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]];
    while (cs.length < 6) {
      const a = rng.pick(cs);
      const s = rng.pick(SIDE_STEP);
      if (!has(cs, a[0] + s[0], a[1] + s[1])) cs.push([a[0] + s[0], a[1] + s[1]]);
    }
    if (!VALID.has(netCanon(cs))) return normCells(cs.map(rng.pick(D4)));
  }
}

// ---------- folding by rolling (construction, and the MSQ solver) ----------

type V3 = [number, number, number];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const PAGE: V3[] = [
  [0, 1, 0],
  [1, 0, 0],
  [0, -1, 0],
  [-1, 0, 0],
]; // N E S W on the page, net lying on z = 0 seen from +z, cube hanging below it
const Z: V3 = [0, 0, 1];
const matOf = (f: (v: V3) => V3) => {
  const cols = [f([1, 0, 0]), f([0, 1, 0]), f([0, 0, 1])];
  return [0, 1, 2].flatMap((r) => cols.map((c) => c[r]));
};
const mul = (a: number[], b: number[]) =>
  [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]));
const tApply = (m: number[], v: V3): V3 => [
  m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
  m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
  m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
];
/** Rolling one square towards page direction d: the face pointing along d turns up to +z. */
const ROLL = PAGE.map((d) => {
  const k = cross(d, Z);
  return matOf((v) => {
    const kv = cross(k, v);
    const s = dot(k, v);
    return [kv[0] + k[0] * s, kv[1] + k[1] * s, kv[2] + k[2] * s];
  });
});

/** For each net square: the cube face normal it lands on and where each of its sides points. */
function roll(cells: Cell[]): { n: V3; side: V3[] }[] {
  const out: { n: V3; side: V3[] }[] = [];
  const Q: (number[] | null)[] = cells.map(() => null);
  Q[0] = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const queue = [0];
  while (queue.length) {
    const i = queue.shift()!;
    for (let s = 0; s < 4; s++) {
      const j = cells.findIndex((c) => c[0] === cells[i][0] + SIDE_STEP[s][0] && c[1] === cells[i][1] + SIDE_STEP[s][1]);
      if (j >= 0 && !Q[j]) {
        Q[j] = mul(ROLL[s], Q[i]!);
        queue.push(j);
      }
    }
  }
  cells.forEach((_, i) => {
    const clean = (v: V3) => v.map((x) => x || 0) as V3; // no -0
    out.push({ n: clean(tApply(Q[i]!, Z)), side: PAGE.map((p) => clean(tApply(Q[i]!, p))) });
  });
  return out;
}

const DIR_NAMES: [string, V3][] = [
  ["+x", [1, 0, 0]],
  ["-x", [-1, 0, 0]],
  ["+y", [0, 1, 0]],
  ["-y", [0, -1, 0]],
  ["+z", [0, 0, 1]],
  ["-z", [0, 0, -1]],
];
const dirName = (v: V3) => DIR_NAMES.find(([, d]) => d[0] === v[0] && d[1] === v[1] && d[2] === v[2])![0];
const dirVec = (s: string) => DIR_NAMES.find(([n]) => n === s)![1];

// ---------- cube views ----------

interface Face {
  sym: string;
  up: string;
}
type CubeView = [Face, Face, Face]; // top (+z), front (+x), side (+y)
const FACE_N: V3[] = [
  [0, 0, 1],
  [1, 0, 0],
  [0, 1, 0],
];
const DEFAULT_UP = ["-x", "+z", "+z"];
const tidy = (v: CubeView): CubeView =>
  v.map((f, i) => ({ sym: f.sym, up: isOriented(f.sym) ? f.up : DEFAULT_UP[i] })) as CubeView;

/** Same physical view turned a third about the body diagonal: top→front→side→top. */
const RHO = (v: V3): V3 => [v[2], v[0], v[1]];
function turnView(v: CubeView): CubeView {
  const r = (f: Face): Face => ({ sym: f.sym, up: dirName(RHO(dirVec(f.up))) });
  return [r(v[2]), r(v[0]), r(v[1])];
}
export function cubeViewCanon(s: string): string {
  let v = parseCube(s);
  const keys: string[] = [];
  for (let i = 0; i < 3; i++) {
    keys.push(v.map((f) => (isOriented(f.sym) ? `${f.sym}@${f.up}` : f.sym)).join(" "));
    v = turnView(v);
  }
  return keys.sort()[0];
}
const encodeCube = (v: CubeView) => v.map((f) => `${f.sym}@${f.up}`).join(" ");
const parseCube = (s: string): CubeView => s.split(" ").map((t) => {
  const [sym, up] = t.split("@");
  return { sym, up };
}) as CubeView;

function cubePiece(v: CubeView): Piece {
  const base = isoPiece([[0, 0, 0]]);
  let marks = "";
  v.forEach((f, i) => {
    const n = FACE_N[i];
    const up = dirVec(f.up);
    const right = cross(up, n);
    const c: V3 = [0.5 + n[0] / 2, 0.5 + n[1] / 2, 0.5 + n[2] / 2];
    const [ex, ey] = project(...c);
    const [ax, ay] = project(...right);
    const [ux, uy] = project(...up);
    // local (a, b) with b downward → centre + a·right − b·up
    const m = [ax, ay, -ux, -uy, ex, ey].map(n2).join(" ");
    marks += `<g transform="matrix(${m})">${SYMBOLS[f.sym]}</g>`;
  });
  return { body: base.body + marks, box: base.box };
}

function netPiece(cells: Cell[], marks?: { sym: string; up: number }[]): Piece {
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const depth = Array.from({ length: h }, (_, r) =>
    Array.from({ length: w }, (_, c) => (has(cells, c, h - 1 - r) ? 0 : null)),
  );
  const p = viewPiece({ w, h, depth }, false);
  if (!marks) return p;
  const body =
    p.body +
    cells
      .map(([c, r], i) => {
        const t = `translate(${n2((c + 0.5) * CELL)} ${n2((r + 0.5) * CELL)}) rotate(${marks[i].up * 90}) scale(${CELL})`;
        return `<g transform="${t}">${SYMBOLS[marks[i].sym]}</g>`;
      })
      .join("");
  return { body, box: p.box };
}

// ---------- generate ----------

function genMCQ(rng: Rng, d: Difficulty) {
  const cells = randomValidNet(rng);
  const nOriented = d === 3 ? rng.int(2, 3) : 0;
  const syms = [...rng.shuffle(ORIENTED).slice(0, nOriented), ...rng.shuffle(SYMMETRIC).slice(0, 6 - nOriented)];
  const marks = rng.shuffle(syms).map((sym) => ({ sym, up: isOriented(sym) ? rng.int(0, 3) : 0 }));
  const folded = roll(cells);
  // body face for each net square, in the cube frame
  const bodies = folded.map((f, i) => ({ n: f.n, up: f.side[marks[i].up], sym: marks[i].sym }));
  const opposite = (sym: string) => {
    const b = bodies.find((x) => x.sym === sym)!;
    return bodies.find((x) => dot(x.n, b.n) === -1)!.sym;
  };

  let view: CubeView | null = null;
  for (const G of rng.shuffle(ROTATIONS)) {
    const v = FACE_N.map((n) => {
      const b = bodies.find((x) => {
        const g = apply(G, x.n as Vox);
        return g[0] === n[0] && g[1] === n[1] && g[2] === n[2];
      })!;
      return { sym: b.sym, up: dirName(apply(G, b.up as Vox) as V3) };
    }) as CubeView;
    if (d === 3 && v.filter((f) => isOriented(f.sym)).length < 1) continue;
    view = tidy(v);
    break;
  }
  const correct = view!;

  const inPlane = (i: number) => DIR_NAMES.map(([s]) => s).filter((s) => dot(dirVec(s), FACE_N[i]) === 0);
  const withFace = (v: CubeView, i: number, sym: string): CubeView => {
    const out = v.map((f) => ({ ...f })) as CubeView;
    out[i] = { sym, up: rng.pick(inPlane(i)) };
    return tidy(out);
  };
  const swapLR = (v: CubeView): CubeView => {
    const sw = (s: string) => {
      const u = dirVec(s);
      return dirName([u[1], u[0], u[2]]);
    };
    return tidy([
      { sym: v[0].sym, up: sw(v[0].up) },
      { sym: v[2].sym, up: sw(v[2].up) },
      { sym: v[1].sym, up: sw(v[1].up) },
    ]);
  };
  const opp = (i: number) => withFace(correct, i, opposite(correct[i].sym)); // mirror corner
  const oppPair = (i: number, j: number) => withFace(correct, i, opposite(correct[j].sym)); // two opposite faces shown
  const turnMark = (i: number, quarter: number): CubeView => {
    const out = correct.map((f) => ({ ...f })) as CubeView;
    let u = dirVec(out[i].up);
    for (let k = 0; k < quarter; k++) u = cross(FACE_N[i], u);
    out[i].up = dirName(u);
    return out;
  };

  let pool: CubeView[];
  if (d === 1) {
    const pairs = rng.shuffle([[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]]);
    pool = [oppPair(pairs[0][0], pairs[0][1]), oppPair(pairs[1][0], pairs[1][1]), ...rng.shuffle([swapLR(correct), opp(0), opp(1), opp(2)])];
  } else if (d === 2) {
    pool = rng.shuffle([swapLR(correct), opp(0), opp(1), opp(2)]);
  } else {
    const turns = [0, 1, 2].filter((i) => isOriented(correct[i].sym)).flatMap((i) => [turnMark(i, 1), turnMark(i, 2), turnMark(i, 3)]);
    pool = [...rng.shuffle(turns).slice(0, 2), ...rng.shuffle([swapLR(correct), opp(0), opp(1), opp(2)])];
  }
  const chosen: CubeView[] = [correct];
  const seen = new Set([cubeViewCanon(encodeCube(correct))]);
  for (const v of pool) {
    const k = cubeViewCanon(encodeCube(v));
    if (chosen.length < 4 && !seen.has(k)) {
      seen.add(k);
      chosen.push(v);
    }
  }
  if (chosen.length < 4) throw new Error("cube-net: not enough distractors");

  const svgs = rootAll(
    chosen.map(cubePiece),
    chosen.map((v) => ({ kind: "cube", cube: encodeCube(v) })),
  );
  const figure = root(netPiece(cells, marks), {
    kind: "net",
    net: cells.map(([c, r], i) => `${c},${r},${marks[i].sym},${marks[i].up}`).join(" "),
  });
  const { options, answer, correct: label } = arrange(
    rng,
    svgs.map((svg, i) => ({ svg, correct: i === 0 })),
    "MCQ",
  );
  return {
    stem:
      d === 3
        ? "The net on the left is folded into a cube with the marks on the outside. Which option shows the folded cube, marks turned the right way?"
        : "The net on the left is folded into a cube with the marks on the outside. Which option shows the folded cube?",
    figure,
    options,
    answer,
    explanation:
      `Fold the net around any square: squares two apart in a straight line become opposite faces, so they never show together. ` +
      `In **${label[0]}** the three faces meet at one corner in the same turning order as on the net` +
      (d === 3 ? ", and each oriented mark points along the same edge it points to on the net." : ".") +
      ` The others show opposite faces together, a mirror-image corner, or a mark turned the wrong way.`,
  };
}

function genMSQ(rng: Rng, d: Difficulty) {
  const k = rng.pick([1, 2, 2, 3, 3, 4]);
  const nets: { cells: Cell[]; ok: boolean }[] = [];
  const seen = new Set<string>();
  const push = (cells: Cell[], ok: boolean) => {
    const c = netCanon(cells);
    if (seen.has(c)) return false;
    seen.add(c);
    nets.push({ cells, ok });
    return true;
  };
  while (nets.length < k) push(randomValidNet(rng), true);
  let obvious = d === 1 ? 4 - k : d === 2 ? Math.min(1, 4 - k) : 0;
  while (nets.length < 4) {
    if (obvious > 0) {
      if (push(obviousBadNet(rng), false)) obvious--;
    } else push(nearMissNet(rng), false);
  }
  const svgs = rootAll(
    nets.map((n) => netPiece(n.cells)),
    nets.map((n) => ({ kind: "net", net: n.cells.map((c) => c.join(",")).join(" ") })),
  );
  const { options, answer, correct } = arrange(
    rng,
    svgs.map((svg, i) => ({ svg, correct: nets[i].ok })),
    "MSQ",
  );
  return {
    stem: "Which of the following nets can be folded into a closed cube? Fold along the lines between squares.",
    figure: root(isoPiece([[0, 0, 0]]), { kind: "illustration" }),
    options,
    answer,
    explanation:
      `Folds into a cube: **${correct.join(", ")}**. A net works only when each square lands on a different face: ` +
      `a 2×2 block, five in a row, or two squares that roll onto the same face all fail.`,
  };
}

// ---------- solver: edge gluing ----------

type Side = [number, number]; // [cell index, side]

/** Zip the net's boundary: at every 270° corner the two edges meeting there are glued. */
export function glue(cells: Cell[]): Map<string, Side> | null {
  const idx = (c: number, r: number) => cells.findIndex((x) => x[0] === c && x[1] === r);
  const segs: { from: string; to: string; side: Side }[] = [];
  const corners: Cell[][] = [
    [[0, 0], [1, 0]],
    [[1, 0], [1, 1]],
    [[1, 1], [0, 1]],
    [[0, 1], [0, 0]],
  ];
  cells.forEach(([c, r], i) => {
    for (let s = 0; s < 4; s++) {
      if (idx(c + SIDE_STEP[s][0], r + SIDE_STEP[s][1]) >= 0) continue;
      const [a, b] = corners[s];
      segs.push({ from: `${c + a[0]},${r + a[1]}`, to: `${c + b[0]},${r + b[1]}`, side: [i, s] });
    }
  });
  const out = new Map<string, Side>();
  // internal adjacencies
  cells.forEach(([c, r], i) => {
    for (let s = 0; s < 4; s++) {
      const j = idx(c + SIDE_STEP[s][0], r + SIDE_STEP[s][1]);
      if (j >= 0) out.set(`${i}:${s}`, [j, (s + 2) % 4]);
    }
  });
  // boundary cycle
  const ring: { side: Side }[] = [];
  const angle: number[] = [];
  let cur = segs[0];
  for (let guard = 0; guard < segs.length; guard++) {
    ring.push({ side: cur.side });
    const [vx, vy] = cur.to.split(",").map(Number);
    angle.push(90 * [[-1, -1], [0, -1], [-1, 0], [0, 0]].filter(([dx, dy]) => idx(vx + dx, vy + dy) >= 0).length);
    const next = segs.filter((s) => s.from === cur.to);
    if (next.length !== 1) return null;
    cur = next[0];
    if (cur === segs[0]) break;
  }
  if (ring.length !== segs.length) return null;
  // angle[i] sits between ring[i] and ring[i+1]
  while (ring.length) {
    if (ring.length === 2) {
      out.set(`${ring[0].side[0]}:${ring[0].side[1]}`, ring[1].side);
      out.set(`${ring[1].side[0]}:${ring[1].side[1]}`, ring[0].side);
      break;
    }
    if (angle.some((a) => a > 270)) return null;
    const k = angle.indexOf(270);
    if (k < 0) return null;
    const n = ring.length;
    const k1 = (k + 1) % n;
    const a = ring[k].side;
    const b = ring[k1].side;
    if (a[0] === b[0]) return null;
    out.set(`${a[0]}:${a[1]}`, b);
    out.set(`${b[0]}:${b[1]}`, a);
    const before = (k - 1 + n) % n;
    const merged = angle[before] + angle[k1];
    // remove ring[k], ring[k1]; the vertex before k and after k1 merge
    const keep = [...Array(n).keys()].filter((i) => i !== k && i !== k1);
    const nr = keep.map((i) => ring[i]);
    const na = keep.map((i) => (i === before ? merged : angle[i]));
    ring.length = 0;
    angle.length = 0;
    ring.push(...nr);
    angle.push(...na);
  }
  return out.size === 24 ? out : null;
}

// Sides of each visible face, clockwise as seen from outside, named by the neighbouring face direction.
const CW: string[][] = [
  ["+y", "+x", "-y", "-x"], // top
  ["+z", "+y", "-z", "-y"], // front (+x)
  ["+z", "-x", "-z", "+x"], // side (+y)
];

function viewMatches(cells: { sym: string; up: number }[], nb: Map<string, Side>, v: CubeView): boolean {
  const sq = v.map((f) => cells.findIndex((c) => c.sym === f.sym));
  if (sq.some((i) => i < 0) || new Set(sq).size < 3) return false;
  for (let k = 0; k < 4; k++) {
    // net side s of the top square points to CW[0][(s + k) % 4]
    const maps: ((s: number) => string)[] = [(s) => CW[0][(s + k) % 4]];
    const sTop = (dir: string) => [0, 1, 2, 3].find((s) => maps[0](s) === dir)!;
    const toFront = nb.get(`${sq[0]}:${sTop("+x")}`)!;
    const toSide = nb.get(`${sq[0]}:${sTop("+y")}`)!;
    if (toFront[0] !== sq[1] || toSide[0] !== sq[2]) continue;
    // the glued side on each neighbour faces +z (index 0 in its clockwise list)
    maps.push((s) => CW[1][(s - toFront[1] + 4) % 4]);
    maps.push((s) => CW[2][(s - toSide[1] + 4) % 4]);
    const sFront = [0, 1, 2, 3].find((s) => maps[1](s) === "+y")!;
    const fs = nb.get(`${sq[1]}:${sFront}`)!;
    if (fs[0] !== sq[2] || maps[2](fs[1]) !== "+x") continue;
    const marksOk = v.every((f, i) => !isOriented(f.sym) || maps[i](cells[sq[i]].up) === f.up);
    if (marksOk) return true;
  }
  return false;
}

function solve(q: GeneratedQuestion): SimpleAnswer {
  if (q.format === "MCQ") {
    const parsed = readData(q.figure, "net").split(" ").map((t) => t.split(","));
    const cells = parsed.map((p) => [+p[0], +p[1]] as Cell);
    const marks = parsed.map((p) => ({ sym: p[2], up: +p[3] }));
    const nb = glue(cells);
    if (!nb) throw new Error(`${q.id}: net does not glue`);
    return answerFrom("MCQ", q.options!.map((o) => viewMatches(marks, nb, parseCube(readData(o.svg, "cube")))));
  }
  return answerFrom(
    "MSQ",
    q.options!.map((o) => {
      const cells = readData(o.svg, "net").split(" ").map((t) => t.split(",").map(Number) as Cell);
      const normals = roll(cells).map((f) => f.n.join(","));
      return new Set(normals).size === 6;
    }),
  );
}

export const cubeNet: Generator = {
  id: "cube-net",
  topic: "3d-visualisation",
  formats: ["MCQ", "MSQ"],
  generate(seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion {
    const rng = createRng(seed);
    const body = format === "MSQ" ? genMSQ(rng, difficulty) : genMCQ(rng, difficulty);
    return {
      id: qid("cube-net", format, difficulty, seed),
      generator: "cube-net",
      seed,
      difficulty,
      format,
      topic: "3d-visualisation",
      ...body,
    };
  },
  solve,
};

// exported for tests
export const _netInternals = { ELEVEN, roll, glue, netCanon };
