// Isometric voxel renderer with exact hidden-surface removal.
//
// The viewer looks along -(1,1,1). Every point (x,y,z) maps to lattice coords u = x - z, v = y - z,
// so the picture plane is a triangular lattice: unit square (i,j) in (u,v) split by its (1,1) diagonal
// into an upper half U (v - j > u - i) and a lower half L. Each cube covers the six triangles around its
// lattice point (x - z, y - z); among cubes covering a triangle the one with the largest x + y + z is in
// front. So each triangle has exactly one owner (cube, face) and edges are drawn only where owners differ.
//
// Faces: 0 = top (+z, soft), 1 = front (+x, drawn on the left, mute), 2 = right side (+y, open).
import { type Vox, vkey } from "./voxel";
import {
  type Box,
  type Piece,
  emptyBox,
  grow,
  n2,
  stroke,
  FILL_MUTE,
  FILL_SOFT,
  W_EDGE,
  W_GRID,
  GRID_LINE,
  W_OUTLINE,
  W_FLOOR,
} from "./svg";

export const UNIT = 20;
const C = Math.cos(Math.PI / 6);

export interface Owner {
  vi: number;
  face: 0 | 1 | 2;
}

const tk = (i: number, j: number, h: number) => ((i + 200) * 512 + (j + 200)) * 2 + h;
const tDecode = (k: number): [number, number, number] => {
  const h = k & 1;
  const r = k >> 1;
  return [Math.floor(r / 512) - 200, (r % 512) - 200, h];
};
const U = 0;
const L = 1;

/** The six triangles of the cube whose lattice point is (p, q), tagged with face. */
function cubeTris(p: number, q: number): [number, 0 | 1 | 2][] {
  return [
    [tk(p - 1, q - 1, U), 0],
    [tk(p - 1, q - 1, L), 0],
    [tk(p, q - 1, U), 1],
    [tk(p, q, L), 1],
    [tk(p - 1, q, L), 2],
    [tk(p, q, U), 2],
  ];
}

export function isoScene(vs: Vox[]): Map<number, Owner> {
  const tri = new Map<number, Owner>();
  const sum = (i: number) => vs[i][0] + vs[i][1] + vs[i][2];
  vs.forEach((v, vi) => {
    const s = sum(vi);
    for (const [k, face] of cubeTris(v[0] - v[2], v[1] - v[2])) {
      const o = tri.get(k);
      if (!o || s > sum(o.vi)) tri.set(k, { vi, face });
    }
  });
  return tri;
}

/** Visible triangle count per cube. */
export function visibleCounts(vs: Vox[], scene = isoScene(vs)): number[] {
  const c = vs.map(() => 0);
  for (const o of scene.values()) c[o.vi]++;
  return c;
}

/** Faces with at least one visible triangle, as "vi:face". */
export function visibleFaces(vs: Vox[], scene = isoScene(vs)): Set<string> {
  const s = new Set<string>();
  for (const o of scene.values()) s.add(`${o.vi}:${o.face}`);
  return s;
}

const LATTICE_NB = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, -1],
];

/**
 * Free-standing solids: every cube shows at least `minTris` triangles, and any cube drawn in front of
 * another touches it by a face or an edge (no floating overlaps that read as depth illusions).
 */
export function readableFree(vs: Vox[], minTris = 2): boolean {
  if (visibleCounts(vs).some((c) => c < minTris)) return false;
  const byLattice = new Map<string, Vox[]>();
  for (const v of vs) {
    const k = `${v[0] - v[2]},${v[1] - v[2]}`;
    const list = byLattice.get(k);
    if (list) list.push(v);
    else byLattice.set(k, [v]);
  }
  for (const a of vs) {
    const p = a[0] - a[2];
    const q = a[1] - a[2];
    const sa = a[0] + a[1] + a[2];
    for (const [du, dv] of LATTICE_NB) {
      for (const b of byLattice.get(`${p + du},${q + dv}`) ?? []) {
        if (b[0] + b[1] + b[2] <= sa) continue;
        const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]].map(Math.abs);
        if (d.some((x) => x > 1) || d[0] + d[1] + d[2] > 2) return false;
      }
    }
  }
  return true;
}

/** Stacks on a floor: the top face of every column shows, so every height can be read. */
export function readableStack(vs: Vox[], minTris = 1): boolean {
  const scene = isoScene(vs);
  const set = new Set(vs.map(vkey));
  const count = vs.map(() => 0);
  for (const o of scene.values()) if (o.face === 0) count[o.vi]++;
  return vs.every((v, i) => set.has(vkey([v[0], v[1], v[2] + 1])) || count[i] >= minTris);
}

export const project = (x: number, y: number, z: number): [number, number] => [
  (y - x) * C * UNIT,
  ((x + y) / 2 - z) * UNIT,
];
const lat = (u: number, v: number): [number, number] => [(v - u) * C * UNIT, ((u + v) / 2) * UNIT];

function triPoints(k: number): [number, number][] {
  const [i, j, h] = tDecode(k);
  return h === U
    ? [lat(i, j), lat(i + 1, j + 1), lat(i, j + 1)]
    : [lat(i, j), lat(i + 1, j), lat(i + 1, j + 1)];
}

/** Edges of a triangle: [from, to, the other triangle across the edge]. */
function triEdges(k: number): [[number, number], [number, number], number][] {
  const [i, j, h] = tDecode(k);
  return h === U
    ? [
        [[i, j], [i + 1, j + 1], tk(i, j, L)],
        [[i, j], [i, j + 1], tk(i - 1, j, L)],
        [[i, j + 1], [i + 1, j + 1], tk(i, j + 1, L)],
      ]
    : [
        [[i, j], [i + 1, j + 1], tk(i, j, U)],
        [[i, j], [i + 1, j], tk(i, j - 1, U)],
        [[i + 1, j], [i + 1, j + 1], tk(i + 1, j, U)],
      ];
}

/** Render cubes. Returns the drawing and its bounding box. */
export function isoPiece(vs: Vox[]): Piece {
  const scene = isoScene(vs);
  const fills = ["", "", ""];
  const box: Box = emptyBox();
  for (const [k, o] of scene) {
    const pts = triPoints(k);
    fills[o.face] += `M${pts.map(([x, y]) => `${n2(x)} ${n2(y)}`).join("L")}Z`;
    for (const [x, y] of pts) grow(box, x, y);
  }
  const plane = (o: Owner) => vs[o.vi][o.face === 0 ? 2 : o.face === 1 ? 0 : 1];
  const lines = ["", "", ""]; // outline, edge, grid
  for (const [k, o] of scene) {
    const [, , h] = tDecode(k);
    for (const [a, b, other] of triEdges(k)) {
      const p = scene.get(other);
      if (p && h === L) continue; // shared edges are drawn once, from the U side
      let cls: number;
      if (!p) cls = 0;
      else if (p.vi === o.vi && p.face === o.face) continue;
      else if (p.face === o.face && plane(p) === plane(o)) cls = 2;
      else cls = 1;
      const [x0, y0] = lat(a[0], a[1]);
      const [x1, y1] = lat(b[0], b[1]);
      lines[cls] += `M${n2(x0)} ${n2(y0)}L${n2(x1)} ${n2(y1)}`;
    }
  }
  const body =
    (fills[0] ? `<path d="${fills[0]}" ${FILL_SOFT}/>` : "") +
    (fills[1] ? `<path d="${fills[1]}" ${FILL_MUTE}/>` : "") +
    (lines[2] ? `<path d="${lines[2]}" ${stroke(W_GRID, GRID_LINE)}/>` : "") +
    (lines[1] ? `<path d="${lines[1]}" ${stroke(W_EDGE)}/>` : "") +
    (lines[0] ? `<path d="${lines[0]}" ${stroke(W_OUTLINE)}/>` : "");
  return { body, box };
}

/**
 * The floor grid under a pile stack: rows x cols squares at z = 0, drawn only where no cube covers it, in thin
 * secondary ink. Floor square (x, y) is the top face of a virtual cube at (x, y, -1), so its two triangles are
 * lattice cell (x, y) and it shows exactly where the cubes leave that cell empty.
 */
export function floorPiece(vs: Vox[], rows: number, cols: number): Piece {
  const scene = isoScene(vs);
  const seg = new Set<string>();
  const box = emptyBox();
  const add = (a: [number, number], b: [number, number]) => {
    const [x0, y0] = lat(...a);
    const [x1, y1] = lat(...b);
    grow(box, x0, y0);
    grow(box, x1, y1);
    seg.add(`M${n2(x0)} ${n2(y0)}L${n2(x1)} ${n2(y1)}`);
  };
  for (let x = 0; x < rows; x++)
    for (let y = 0; y < cols; y++) {
      if (!scene.has(tk(x, y, U))) {
        add([x, y], [x, y + 1]);
        add([x, y + 1], [x + 1, y + 1]);
      }
      if (!scene.has(tk(x, y, L))) {
        add([x, y], [x + 1, y]);
        add([x + 1, y], [x + 1, y + 1]);
      }
    }
  const body = seg.size ? `<g class="mute"><path d="${[...seg].sort().join("")}" ${stroke(W_FLOOR)}/></g>` : "";
  return { body, box };
}
