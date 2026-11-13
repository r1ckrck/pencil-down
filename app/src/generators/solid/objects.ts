// Test solids shared by the view generators: stepped stacks (columns on a floor) for difficulty 1–2,
// free polycubes with overhangs for difficulty 3.
import type { Difficulty } from "@/content/types";
import type { Rng } from "../rng";
import { isoScene, project as isoProject, readableFree, readableStack, visibleFaces } from "./iso";
import { type ViewDir } from "./ortho";
import { arrow, text } from "./svg";
import {
  type Vox,
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

export function readable(s: Solid): boolean {
  return s.heights ? readableStack(s.vs) : readableFree(s.vs, 2);
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
      const heights: number[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => (rng.bool(0.82) ? rng.int(1, maxH) : 0)),
      );
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
  if (dir === "front") {
    a = [mx + 2.4, my / 2, 0.3];
    b = [mx + 0.45, my / 2, 0.3];
  } else if (dir === "side") {
    a = [mx / 2, my + 2.4, 0.3];
    b = [mx / 2, my + 0.45, 0.3];
  } else {
    a = [0.3, 0.3, mz + 2];
    b = [0.3, 0.3, mz + 0.45];
  }
  const [x0, y0] = isoProject(...a);
  const [x1, y1] = isoProject(...b);
  const lx = x0 + (x0 - x1) * 0.18;
  const ly = y0 + (y0 - y1) * 0.18 + 4;
  const body = arrow(x0, y0, x1, y1, 8) + text(lx, ly, label, 10);
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



