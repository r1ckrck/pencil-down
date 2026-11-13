// Orthographic views of voxel solids, third-angle convention matching the isometric drawings:
//   front  = seen from +x (the left face in the isometric drawing): right = +y, up = +z, depth = x
//   side   = right side, seen from +y (the right face):             right = -x, up = +z, depth = y
//   top    = seen from +z, front edge at the bottom:                right = +y, up = -x, depth = z
// A view is a grid of cells (c across, r up) holding the depth of the nearest face.
import { type Vox, vkey } from "./voxel";
import { type Piece, n2, stroke, FILL_SOFT, W_EDGE, W_GRID, W_OUTLINE, GRID_LINE, text } from "./svg";

export type ViewDir = "top" | "front" | "side";
export const VIEW_DIRS: ViewDir[] = ["top", "front", "side"];
export const VIEW_LABEL: Record<ViewDir, string> = { top: "Top view", front: "Front view", side: "Side view" };

export interface View {
  w: number;
  h: number;
  depth: (number | null)[][]; // [r][c]
}

const toCell = (v: Vox, dir: ViewDir): [number, number, number] =>
  dir === "top" ? [v[1], -v[0], v[2]] : dir === "front" ? [v[1], v[2], v[0]] : [-v[0], v[2], v[1]];

/** Construction path: drop every voxel onto the picture plane, keep the nearest. */
export function project(vs: Vox[], dir: ViewDir): View {
  const pts = vs.map((v) => toCell(v, dir));
  const c0 = Math.min(...pts.map((p) => p[0]));
  const r0 = Math.min(...pts.map((p) => p[1]));
  const d0 = Math.min(...pts.map((p) => p[2]));
  const w = Math.max(...pts.map((p) => p[0])) - c0 + 1;
  const h = Math.max(...pts.map((p) => p[1])) - r0 + 1;
  const depth: (number | null)[][] = Array.from({ length: h }, () => Array(w).fill(null));
  for (const [c, r, d] of pts) {
    const cur = depth[r - r0][c - c0];
    if (cur === null || d - d0 > cur) depth[r - r0][c - c0] = d - d0;
  }
  return trim({ w, h, depth });
}

/** Solver path: cast a ray through every cell of the bounding box, nearest voxel first. */
export function rayView(vs: Vox[], dir: ViewDir): View {
  const set = new Set(vs.map(vkey));
  const lo = [0, 1, 2].map((a) => Math.min(...vs.map((v) => v[a])));
  const hi = [0, 1, 2].map((a) => Math.max(...vs.map((v) => v[a])));
  // picture axes as (world axis, sign) for c, r, and the viewing (depth) axis
  const axes: Record<ViewDir, [number, number][]> = {
    top: [[1, 1], [0, -1], [2, 1]],
    front: [[1, 1], [2, 1], [0, 1]],
    side: [[0, -1], [2, 1], [1, 1]],
  };
  const [ac, ar, ad] = axes[dir];
  const span = (a: [number, number]) => hi[a[0]] - lo[a[0]] + 1;
  const w = span(ac);
  const h = span(ar);
  const nd = span(ad);
  const depth: (number | null)[][] = [];
  for (let r = 0; r < h; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < w; c++) {
      let hit: number | null = null;
      for (let k = nd - 1; k >= 0 && hit === null; k--) {
        const p = [0, 0, 0];
        p[ac[0]] = ac[1] > 0 ? lo[ac[0]] + c : hi[ac[0]] - c;
        p[ar[0]] = ar[1] > 0 ? lo[ar[0]] + r : hi[ar[0]] - r;
        p[ad[0]] = lo[ad[0]] + k;
        if (set.has(`${p[0]},${p[1]},${p[2]}`)) hit = k;
      }
      row.push(hit);
    }
    depth.push(row);
  }
  return trim({ w, h, depth });
}

/** Crop empty border rows/columns and rebase depths. */
function trim(v: View): View {
  const occ = (r: number, c: number) => v.depth[r][c] !== null;
  const rows = [...Array(v.h).keys()].filter((r) => [...Array(v.w).keys()].some((c) => occ(r, c)));
  const cols = [...Array(v.w).keys()].filter((c) => [...Array(v.h).keys()].some((r) => occ(r, c)));
  const depth = rows.map((r) => cols.map((c) => v.depth[r][c]));
  const d0 = Math.min(...depth.flat().filter((d): d is number => d !== null));
  return { w: cols.length, h: rows.length, depth: depth.map((row) => row.map((d) => (d === null ? null : d - d0))) };
}

export const flipH = (v: View): View => ({ ...v, depth: v.depth.map((row) => [...row].reverse()) });
export const flipV = (v: View): View => ({ ...v, depth: [...v.depth].reverse() });

/** What a drawing of the view shows: occupancy, plus depth steps between neighbours when `edges`. */
export function signature(v: View, edges = true): string {
  const rows: string[] = [];
  for (let r = 0; r < v.h; r++) {
    let s = "";
    for (let c = 0; c < v.w; c++) {
      const d = v.depth[r][c];
      s += d === null ? "." : "#";
      if (edges && c + 1 < v.w) {
        const e = v.depth[r][c + 1];
        s += d !== null && e !== null && d !== e ? "|" : " ";
      }
      if (edges && r + 1 < v.h) {
        const e = v.depth[r + 1][c];
        s += d !== null && e !== null && d !== e ? "-" : "_";
      }
    }
    rows.push(s);
  }
  return `${v.w}x${v.h}:${rows.join("/")}`;
}

export const encodeView = (v: View) =>
  `${v.w} ${v.h} ${v.depth.map((row) => row.map((d) => (d === null ? "." : d)).join(",")).join("/")}`;
export function decodeView(s: string): View {
  const [w, h, body] = s.split(" ");
  return {
    w: +w,
    h: +h,
    depth: body.split("/").map((row) => row.split(",").map((d) => (d === "." ? null : +d))),
  };
}

export const CELL = 16;

/** Draw a view: soft fill, unit grid, heavier lines at depth steps (when `edges`), heaviest outline. */
export function viewPiece(v: View, edges = true, label?: string): Piece {
  const occ = (r: number, c: number) => r >= 0 && c >= 0 && r < v.h && c < v.w && v.depth[r][c] !== null;
  const d = (r: number, c: number) => v.depth[r][c];
  const X = (c: number) => c * CELL;
  const Y = (r: number) => (v.h - r) * CELL; // r counts up from the bottom edge
  let fill = "";
  for (let r = 0; r < v.h; r++)
    for (let c = 0; c < v.w; c++)
      if (occ(r, c)) fill += `M${X(c)} ${Y(r + 1)}h${CELL}v${CELL}h${-CELL}Z`;
  const lines = ["", "", ""];
  const cls = (a: [number, number], b: [number, number]) => {
    const oa = occ(...a);
    const ob = occ(...b);
    if (!oa && !ob) return -1;
    if (oa !== ob) return 0;
    return edges && d(...a) !== d(...b) ? 1 : 2;
  };
  // vertical lines x = c, merged along r
  for (let c = 0; c <= v.w; c++) {
    let run: [number, number, number] | null = null; // cls, start r, end r
    for (let r = 0; r <= v.h; r++) {
      const k = r < v.h ? cls([r, c - 1], [r, c]) : -1;
      if (run && run[0] === k) run[2] = r + 1;
      else {
        if (run && run[0] >= 0) lines[run[0]] += `M${X(c)} ${Y(run[1])}V${Y(run[2])}`;
        run = [k, r, r + 1];
      }
    }
  }
  for (let r = 0; r <= v.h; r++) {
    let run: [number, number, number] | null = null;
    for (let c = 0; c <= v.w; c++) {
      const k = c < v.w ? cls([r - 1, c], [r, c]) : -1;
      if (run && run[0] === k) run[2] = c + 1;
      else {
        if (run && run[0] >= 0) lines[run[0]] += `M${X(run[1])} ${Y(r)}H${X(run[2])}`;
        run = [k, c, c + 1];
      }
    }
  }
  let body =
    `<path d="${fill}" ${FILL_SOFT}/>` +
    (lines[2] ? `<path d="${lines[2]}" ${stroke(W_GRID, GRID_LINE)}/>` : "") +
    (lines[1] ? `<path d="${lines[1]}" ${stroke(W_EDGE)}/>` : "") +
    (lines[0] ? `<path d="${lines[0]}" ${stroke(W_OUTLINE)}/>` : "");
  let y1 = v.h * CELL;
  if (label) {
    body += text((v.w * CELL) / 2, y1 + 11, label, 8);
    y1 += 14;
  }
  return { body, box: { x0: 0, y0: 0, x1: Math.max(v.w * CELL, label ? label.length * 4.2 : 0), y1 } };
}

/** Top view above the front view, side view to the right of the front view (third-angle layout). */
export function threeViewPiece(views: Record<ViewDir, View>, edges: boolean): Piece {
  const gap = CELL * 1.25;
  const top = viewPiece(views.top, edges, VIEW_LABEL.top);
  const front = viewPiece(views.front, edges, VIEW_LABEL.front);
  const side = viewPiece(views.side, edges, VIEW_LABEL.side);
  const frontY = top.box.y1 + gap * 0.6;
  const sideX = Math.max(views.front.w * CELL + gap, front.box.x1 + gap * 0.6);
  // align baselines of front and side views
  const sideY = frontY + (views.front.h - views.side.h) * CELL;
  const body =
    top.body +
    `<g transform="translate(0 ${n2(frontY)})">${front.body}</g>` +
    `<g transform="translate(${n2(sideX)} ${n2(sideY)})">${side.body}</g>`;
  return {
    body,
    box: {
      x0: 0,
      y0: Math.min(0, sideY),
      x1: Math.max(top.box.x1, sideX + side.box.x1),
      y1: Math.max(frontY + front.box.y1, sideY + side.box.y1),
    },
  };
}
