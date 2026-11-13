// Test solids shared by the view generators: stepped stacks (columns on a floor) for difficulty 1–2,
// free polycubes with overhangs for difficulty 3.
import type { Difficulty } from "@/content/types";
import type { Rng } from "../rng";
import { isoScene, project as isoProject, readableFree, readableStack, visibleCounts, visibleFaces } from "./iso";
import { isoAlternatives } from "./iso-reading";
import { type ViewDir } from "./ortho";
import { arrow, text } from "./svg";
import {
  DIRS6,
  type Vox,
  vkey,
  fromHeights,
  growPolycube,
  isConnected,
  moveOne,
  normalize,
} from "./voxel";

export interface Solid {
  vs: Vox[];
  heights: number[][] | null; // set for stacks
}

/**
 * Drawable under the stated rule "all cubes are visible; there are no hidden cubes": every cube shows at least
 * two triangles, and no other solid with every cube visible draws the same picture (iso-reading.ts).
 */
export function readable(s: Solid): boolean {
  if (s.heights ? !readableStack(s.vs, 1) || visibleCounts(s.vs).some((c) => c < 2) : !readableFree(s.vs, 2)) return false;
  return isoAlternatives(s.vs, 3, 1).length === 0;
}

/** Empty cells next to the solid where a cube would be completely hidden in the isometric drawing. */
export function hiddenAdditions(vs: Vox[]): Vox[][] {
  const set = new Set(vs.map(vkey));
  const out: Vox[][] = [];
  const seen = new Set<string>();
  for (const v of vs)
    for (const d of DIRS6) {
      const c: Vox = [v[0] + d[0], v[1] + d[1], v[2] + d[2]];
      const k = vkey(c);
      if (set.has(k) || seen.has(k)) continue;
      seen.add(k);
      const next = [...vs, c];
      if (visibleCounts(next)[vs.length] === 0) out.push(next);
    }
  return out;
}

/**
 * Random height map in which every cube shows at least two triangles. A cube can only be covered by cubes in
 * columns at or in front of it on both axes (x' >= x, y' >= y), so columns are filled front to back and each
 * one takes a random height among those that leave all of its cubes visible.
 */
function visibleHeights(rng: Rng, rows: number, cols: number, maxH: number, fill: number): number[][] {
  const h = Array.from({ length: rows }, () => Array(cols).fill(0) as number[]);
  const placed: Vox[] = [];
  for (let x = rows - 1; x >= 0; x--)
    for (let y = cols - 1; y >= 0; y--) {
      if (!rng.bool(fill)) continue;
      const ok: number[] = [];
      for (let n = 1; n <= maxH; n++) {
        const col = Array.from({ length: n }, (_, z): Vox => [x, y, z]);
        const counts = visibleCounts([...placed, ...col]);
        if (counts.slice(placed.length).every((c) => c >= 2)) ok.push(n);
      }
      if (!ok.length) continue;
      h[x][y] = rng.pick(ok);
      for (let z = 0; z < h[x][y]; z++) placed.push([x, y, z]);
    }
  return h;
}

export function randomSolid(rng: Rng, d: Difficulty): Solid {
  for (;;) {
    let s: Solid;
    if (d === 3) {
      const vs = growPolycube(rng, rng.int(8, 10), 3);
      s = { vs: normalize(vs), heights: null };
    } else {
      const rows = 3;
      const cols = d === 1 ? 3 : rng.int(3, 4);
      const maxH = d === 1 ? 2 : 3;
      const heights = visibleHeights(rng, rows, cols, maxH, 0.82);
      const vs = fromHeights(heights);
      if (vs.length < 4 || !isConnected(vs)) continue;
      if (new Set(vs.map((v) => v[0])).size !== rows || new Set(vs.map((v) => v[1])).size !== cols) continue;
      if (Math.max(...vs.map((v) => v[2])) < 1) continue;
      s = { vs, heights };
    }
    if (readable(s)) return s;
  }
}

/** One-step variant: a column one cube taller/shorter, or (free solids) one cube moved. */
export function nearMiss(rng: Rng, s: Solid): Solid | null {
  if (!s.heights) {
    const vs = moveOne(rng, s.vs);
    return vs ? { vs, heights: null } : null;
  }
  for (let t = 0; t < 20; t++) {
    const h = s.heights.map((r) => [...r]);
    const x = rng.int(0, h.length - 1);
    const y = rng.int(0, h[0].length - 1);
    const delta = rng.bool() ? 1 : -1;
    const nv = h[x][y] + delta;
    if (nv < 0 || nv > 3) continue;
    h[x][y] = nv;
    const vs = fromHeights(h);
    if (vs.length < 3 || !isConnected(vs)) continue;
    return { vs, heights: h };
  }
  return null;
}

/** Mirror left-right (y), so the front stays the front. */
export function mirrorSolid(s: Solid): Solid {
  const vs = normalize(s.vs.map((v) => [v[0], -v[1], v[2]] as Vox));
  return { vs, heights: s.heights ? s.heights.map((r) => [...r].reverse()) : null };
}

const FACE_OF: Record<ViewDir, 0 | 1 | 2> = { top: 0, front: 1, side: 2 };
const AXIS: Record<ViewDir, number> = { top: 2, front: 0, side: 1 };

/** Every face seen in the `dir` view also shows (at least partly) in the isometric drawing. */
export function viewVisibleInIso(vs: Vox[], dir: ViewDir): boolean {
  const seen = visibleFaces(vs, isoScene(vs));
  const a = AXIS[dir];
  const nearest = new Map<string, number>();
  vs.forEach((v, i) => {
    const k = [0, 1, 2].filter((j) => j !== a).map((j) => v[j]).join(",");
    const cur = nearest.get(k);
    if (cur === undefined || vs[cur][a] < v[a]) nearest.set(k, i);
  });
  return [...nearest.values()].every((i) => seen.has(`${i}:${FACE_OF[dir]}`));
}

/** Arrow showing a viewing direction, drawn clear of the solid. Returns markup in iso screen space. */
export function viewArrow(vs: Vox[], dir: ViewDir, label: string): { body: string; pts: [number, number][] } {
  const mx = Math.max(...vs.map((v) => v[0])) + 1;
  const my = Math.max(...vs.map((v) => v[1])) + 1;
  const mz = Math.max(...vs.map((v) => v[2])) + 1;
  let a: [number, number, number];
  let b: [number, number, number];
  // front and side arrows point straight at the middle of that face
  if (dir === "front") {
    a = [mx + 2.6, my / 2, mz / 2];
    b = [mx + 0.4, my / 2, mz / 2];
  } else if (dir === "side") {
    a = [mx / 2, my + 2.6, mz / 2];
    b = [mx / 2, my + 0.4, mz / 2];
  } else {
    a = [0.3, 0.3, mz + 2];
    b = [0.3, 0.3, mz + 0.45];
  }
  const [x0, y0] = isoProject(...a);
  const [x1, y1] = isoProject(...b);
  const lx = x0 + (x0 - x1) * 0.18;
  const ly = y0 + (y0 - y1) * 0.18 + 4;
  const body = arrow(x0, y0, x1, y1, 8) + text(lx, ly, label);
  const half = label.length * 3.2;
  return {
    body,
    pts: [
      [x0, y0],
      [x1, y1],
      [lx - half, ly - 10],
      [lx + half, ly + 3],
    ],
  };
}



