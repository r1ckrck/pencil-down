// Voxel geometry shared by the 3D generators.
// Axes: x = towards the viewer's front-left (the "Front" face in every isometric drawing),
//       y = towards the front-right (the "Right side" face), z = up.
import type { Rng } from "../rng";

export type Vox = [number, number, number];
export type Mat = number[]; // 3x3 row-major

export const vkey = (v: Vox) => `${v[0]},${v[1]},${v[2]}`;

export const DIRS6: Vox[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

const cmp = (a: Vox, b: Vox) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** Translate so every axis starts at 0, sorted. */
export function normalize(vs: Vox[]): Vox[] {
  let mx = Infinity, my = Infinity, mz = Infinity;
  for (const v of vs) {
    if (v[0] < mx) mx = v[0];
    if (v[1] < my) my = v[1];
    if (v[2] < mz) mz = v[2];
  }
  return vs.map((v) => [v[0] - mx, v[1] - my, v[2] - mz] as Vox).sort(cmp);
}

export const serial = (vs: Vox[]) => normalize(vs).map(vkey).join(" ");

export function parseVoxels(s: string): Vox[] {
  return s
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((t) => t.split(",").map(Number) as Vox);
}

/** The 24 proper rotations: signed permutation matrices with determinant +1. */
export const ROTATIONS: Mat[] = (() => {
  const perms = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
  const out: Mat[] = [];
  for (const p of perms)
    for (let s = 0; s < 8; s++) {
      const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (let r = 0; r < 3; r++) m[r * 3 + p[r]] = s & (1 << r) ? -1 : 1;
      const det =
        m[0] * (m[4] * m[8] - m[5] * m[7]) -
        m[1] * (m[3] * m[8] - m[5] * m[6]) +
        m[2] * (m[3] * m[7] - m[4] * m[6]);
      if (det === 1) out.push(m);
    }
  return out;
})();

export const apply = (m: Mat, v: Vox): Vox => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

export const rotate = (vs: Vox[], m: Mat) => normalize(vs.map((v) => apply(m, v)));

/** Rotation-invariant identity of a voxel set. */
export function canonical(vs: Vox[]): string {
  let best = "";
  for (const m of ROTATIONS) {
    const s = serial(vs.map((v) => apply(m, v)));
    if (best === "" || s < best) best = s;
  }
  return best;
}

export const mirror = (vs: Vox[]) => normalize(vs.map((v) => [-v[0], v[1], v[2]] as Vox));

export function isConnected(vs: Vox[]): boolean {
  if (vs.length === 0) return false;
  const set = new Set(vs.map(vkey));
  const seen = new Set([vkey(vs[0])]);
  const stack = [vs[0]];
  while (stack.length) {
    const v = stack.pop()!;
    for (const d of DIRS6) {
      const k = vkey([v[0] + d[0], v[1] + d[1], v[2] + d[2]]);
      if (set.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push(k.split(",").map(Number) as Vox);
      }
    }
  }
  return seen.size === vs.length;
}

/** Random connected polycube grown face by face. */
export function growPolycube(rng: Rng, n: number, maxSpan = 3): Vox[] {
  const vs: Vox[] = [[0, 0, 0]];
  const set = new Set([vkey(vs[0])]);
  let guard = 0;
  while (vs.length < n && guard++ < 500) {
    const b = rng.pick(vs);
    const d = rng.pick(DIRS6);
    const c: Vox = [b[0] + d[0], b[1] + d[1], b[2] + d[2]];
    if (set.has(vkey(c))) continue;
    const span = [0, 1, 2].every((a) => {
      const vals = [...vs.map((v) => v[a]), c[a]];
      return Math.max(...vals) - Math.min(...vals) < maxSpan;
    });
    if (!span) continue;
    vs.push(c);
    set.add(vkey(c));
  }
  return normalize(vs);
}

/** Move one voxel to a new face-adjacent spot, keeping the solid connected. */
export function moveOne(rng: Rng, vs: Vox[], gravity = false): Vox[] | null {
  for (let t = 0; t < 30; t++) {
    const i = rng.int(0, vs.length - 1);
    const rest = vs.filter((_, j) => j !== i);
    const set = new Set(rest.map(vkey));
    const b = rng.pick(rest);
    const d = rng.pick(DIRS6);
    const c: Vox = [b[0] + d[0], b[1] + d[1], b[2] + d[2]];
    if (set.has(vkey(c)) || vkey(c) === vkey(vs[i])) continue;
    if (gravity && c[2] < 0) continue;
    const next = [...rest, c];
    if (!isConnected(next)) continue;
    if (gravity && !supported(next)) continue;
    return normalize(next);
  }
  return null;
}

/** Every voxel above the floor rests on another voxel. */
export function supported(vs: Vox[]): boolean {
  const minZ = Math.min(...vs.map((v) => v[2]));
  const set = new Set(vs.map(vkey));
  return vs.every((v) => v[2] === minZ || set.has(vkey([v[0], v[1], v[2] - 1])));
}

/** Height map (rows = x, cols = y) to voxel columns standing on z = 0. */
export function fromHeights(h: number[][]): Vox[] {
  const out: Vox[] = [];
  h.forEach((row, x) => row.forEach((n, y) => {
    for (let z = 0; z < n; z++) out.push([x, y, z]);
  }));
  return normalize(out);
}

/** Random height map with a 4-connected footprint. */
export function randomHeights(rng: Rng, rows: number, cols: number, maxH: number, fill: number): number[][] {
  for (;;) {
    const h = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (rng.bool(fill) ? rng.int(1, maxH) : 0)),
    );
    const vs = fromHeights(h);
    if (vs.length === 0) continue;
    // footprint must span the full grid and be connected
    const xs = new Set(vs.map((v) => v[0]));
    const ys = new Set(vs.map((v) => v[1]));
    if (xs.size !== rows || ys.size !== cols) continue;
    if (!isConnected(vs)) continue;
    if (Math.max(...vs.map((v) => v[2])) < Math.min(2, maxH) - 1) continue;
    return h;
  }
}
