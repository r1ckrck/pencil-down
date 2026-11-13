// Shared SVG + geometry helpers for the 2D generators.
//
// Styling contract (the UI supplies the CSS):
//   root     stroke="currentColor", fill="none", 2-unit strokes, round caps/joins
//   solid    fill="currentColor"
//   .soft    light fill, e.g. `.soft { fill: var(--tint) }`
//   .mute    secondary ink, e.g. `.mute { color: var(--mute) }` (children draw with currentColor)
// Figures use a 280-unit-wide viewBox and options a 140-unit one, so a stroke-width of 2
// renders as ~2px at the intended display size. No hex colours, no '#' anywhere, no fonts.

export type Pt = [number, number];
export type Mat = [number, number, number, number]; // (x, y) -> (a x + b y, c x + d y)

// Screen coordinates (y down): r90 turns clockwise as seen on screen.
export const D4: Record<string, Mat> = {
  r0: [1, 0, 0, 1],
  r90: [0, -1, 1, 0],
  r180: [-1, 0, 0, -1],
  r270: [0, 1, -1, 0],
  fh: [-1, 0, 0, 1], // mirror across a vertical line
  fv: [1, 0, 0, -1], // mirror across a horizontal line (water image)
  fd: [0, 1, 1, 0], // across the leading diagonal
  fa: [0, -1, -1, 0], // across the other diagonal
};
export const ROTATIONS = ["r90", "r180", "r270"] as const;
export const REFLECTIONS = ["fh", "fv", "fd", "fa"] as const;

export const apply = (m: Mat, p: Pt): Pt => [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]];
export const compose = (a: Mat, b: Mat): Mat => [
  // a after b
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
];
export const invert = (m: Mat): Mat => {
  const det = m[0] * m[3] - m[1] * m[2];
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det];
};

// Number formatting: 2 decimals, no "-0".
export function n(v: number): string {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) || r === 0 ? "0" : String(r);
}
const key = (v: number) => {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? "0" : String(r);
};

export function pathD(pts: Pt[], close = false): string {
  return pts.map((p, i) => `${i ? "L" : "M"}${n(p[0])} ${n(p[1])}`).join("") + (close ? "Z" : "");
}

export type Fill = "solid" | "soft" | "none";
export function fillAttr(fill: Fill): string {
  if (fill === "solid") return ` fill="currentColor"`;
  if (fill === "soft") return ` class="soft"`;
  return "";
}

// Data attributes carry the structured model a solver re-reads. JSON is escaped so the
// attribute holds no raw quotes and no '#'.
export function encodeData(v: unknown): string {
  return JSON.stringify(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
export function readData<T>(svg: string, name: string): T {
  const m = svg.match(new RegExp(`data-${name}="([^"]*)"`));
  if (!m) throw new Error(`missing data-${name}`);
  return JSON.parse(m[1].replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&amp;/g, "&")) as T;
}

export function svgRoot(w: number, h: number, body: string, data: Record<string, unknown> = {}): string {
  const attrs = Object.entries(data)
    .map(([k, v]) => ` data-${k}="${encodeData(v)}"`)
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(w)} ${n(h)}" fill="none" stroke="currentColor"` +
    ` stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${attrs}>${body}</svg>`
  );
}

// Short stable hash (FNV-1a) for option keys.
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

// ---------- Drawings: line art + atomic fills + dots, centred on the origin ----------

export interface Drawing {
  strokes: Pt[][]; // open polylines (a closed loop repeats its first point)
  fills: { pts: Pt[]; fill: "solid" | "soft" }[]; // convex atoms (cells, half-cells, wedges)
  dots: { c: Pt; r: number; fill: "solid" | "none" }[];
}

export function transformDrawing(d: Drawing, m: Mat, shift: Pt = [0, 0]): Drawing {
  const t = (p: Pt): Pt => {
    const q = apply(m, p);
    return [q[0] + shift[0], q[1] + shift[1]];
  };
  return {
    strokes: d.strokes.map((s) => s.map(t)),
    fills: d.fills.map((f) => ({ pts: f.pts.map(t), fill: f.fill })),
    dots: d.dots.map((o) => ({ c: t(o.c), r: o.r, fill: o.fill })),
  };
}

// Canonical form: strokes broken into segments and merged into maximal collinear runs,
// fills as sorted vertex sets, dots by centre. Two drawings that look the same have the
// same canonical string regardless of how their polylines were authored.
export function canonDrawing(d: Drawing): string {
  const lines = new Map<string, [number, number][]>();
  for (const s of d.strokes) {
    for (let i = 0; i + 1 < s.length; i++) {
      const [a, b] = [s[i], s[i + 1]];
      let dx = b[0] - a[0];
      let dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len < 1e-9) continue;
      dx /= len;
      dy /= len;
      if (dx < -1e-9 || (Math.abs(dx) < 1e-9 && dy < 0)) {
        dx = -dx;
        dy = -dy;
      }
      const off = dx * a[1] - dy * a[0];
      const k = `${key(dx)},${key(dy)},${key(off)}`;
      const t0 = dx * a[0] + dy * a[1];
      const t1 = dx * b[0] + dy * b[1];
      const list = lines.get(k) ?? [];
      list.push([Math.min(t0, t1), Math.max(t0, t1)]);
      lines.set(k, list);
    }
  }
  const segs: string[] = [];
  for (const [k, list] of lines) {
    list.sort((p, q) => p[0] - q[0]);
    let cur = [...list[0]] as [number, number];
    for (const iv of list.slice(1)) {
      if (iv[0] <= cur[1] + 1e-6) cur[1] = Math.max(cur[1], iv[1]);
      else {
        segs.push(`${k}:${key(cur[0])}-${key(cur[1])}`);
        cur = [...iv] as [number, number];
      }
    }
    segs.push(`${k}:${key(cur[0])}-${key(cur[1])}`);
  }
  const fills = d.fills.map(
    (f) =>
      f.fill +
      ":" +
      f.pts
        .map((p) => `${key(p[0])},${key(p[1])}`)
        .sort()
        .join(";"),
  );
  const dots = d.dots.map((o) => `${o.fill}:${key(o.c[0])},${key(o.c[1])},${key(o.r)}`);
  return [segs.sort().join("|"), [...new Set(fills)].sort().join("|"), [...new Set(dots)].sort().join("|")].join(
    "/",
  );
}

// Render a drawing scaled by s and translated to (cx, cy).
export function renderDrawing(d: Drawing, s: number, cx: number, cy: number): string {
  const t = (p: Pt): Pt => [cx + p[0] * s, cy + p[1] * s];
  let out = "";
  const soft = d.fills.filter((f) => f.fill === "soft");
  if (soft.length) out += `<path class="soft" stroke="none" d="${soft.map((f) => pathD(f.pts.map(t), true)).join("")}"/>`;
  const solid = d.fills.filter((f) => f.fill === "solid");
  if (solid.length)
    out += `<path fill="currentColor" stroke="currentColor" stroke-width="1" d="${solid.map((f) => pathD(f.pts.map(t), true)).join("")}"/>`;
  if (d.strokes.length) out += `<path d="${d.strokes.map((p) => pathD(p.map(t))).join("")}"/>`;
  for (const o of d.dots) {
    const c = t(o.c);
    out += `<circle cx="${n(c[0])}" cy="${n(c[1])}" r="${n(o.r * s)}"${o.fill === "solid" ? ` fill="currentColor"` : ""}/>`;
  }
  return out;
}

export function bounds(d: Drawing): { x0: number; y0: number; x1: number; y1: number } {
  const pts: Pt[] = [...d.strokes.flat(), ...d.fills.flatMap((f) => f.pts)];
  for (const o of d.dots) pts.push([o.c[0] - o.r, o.c[1] - o.r], [o.c[0] + o.r, o.c[1] + o.r]);
  return {
    x0: Math.min(...pts.map((p) => p[0])),
    y0: Math.min(...pts.map((p) => p[1])),
    x1: Math.max(...pts.map((p) => p[0])),
    y1: Math.max(...pts.map((p) => p[1])),
  };
}

// Arrowhead (<path>) at `tip`, pointing along direction (dx, dy).
export function arrowHead(tip: Pt, dx: number, dy: number, size = 7): string {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const a: Pt = [tip[0] - ux * size - uy * size * 0.6, tip[1] - uy * size + ux * size * 0.6];
  const b: Pt = [tip[0] - ux * size + uy * size * 0.6, tip[1] - uy * size - ux * size * 0.6];
  return `<path d="${pathD([a, tip, b])}"/>`;
}
