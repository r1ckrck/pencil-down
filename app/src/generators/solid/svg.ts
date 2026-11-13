// SVG assembly for the 3D generators.
// Rules: viewBox only (no width/height), colour only through currentColor / none / class="soft|mute",
// strokes are non-scaling so figure (~280 px) and options (~140 px) share one line weight.
// Structured data rides on the root as data-* attributes so solvers can read the question back.

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export interface Piece {
  body: string;
  box: Box;
}

export const n2 = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r);
};

// Line weights (px, non-scaling): outline > real edge > unit grid.
export const W_OUTLINE = 2.2;
export const W_EDGE = 1.5;
export const W_GRID = 0.6;
export const W_FLOOR = 0.9;

export const stroke = (w: number, extra = "") =>
  `fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"${extra}`;

// Shading, three clear tones in both themes: top faces light (the app paints .soft with a faint ink fill; the
// opacity here keeps tops lighter than flat .soft areas), front faces mid (secondary ink), side faces open.
export const FILL_SOFT = `class="soft" fill="currentColor" fill-opacity="0.6"`;
export const FILL_MUTE = `class="mute" fill="currentColor" fill-opacity="0.45"`;
// Unit-grid lines between coplanar faces recede so real edges and depth steps read first.
export const GRID_LINE = ` stroke-opacity="0.5"`;

export const emptyBox = (): Box => ({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
export function grow(b: Box, x: number, y: number) {
  if (x < b.x0) b.x0 = x;
  if (y < b.y0) b.y0 = y;
  if (x > b.x1) b.x1 = x;
  if (y > b.y1) b.y1 = y;
}
export const union = (a: Box, b: Box): Box => ({
  x0: Math.min(a.x0, b.x0),
  y0: Math.min(a.y0, b.y0),
  x1: Math.max(a.x1, b.x1),
  y1: Math.max(a.y1, b.y1),
});

export const translate = (p: Piece, dx: number, dy: number): Piece => ({
  body: `<g transform="translate(${n2(dx)} ${n2(dy)})">${p.body}</g>`,
  box: { x0: p.box.x0 + dx, y0: p.box.y0 + dy, x1: p.box.x1 + dx, y1: p.box.y1 + dy },
});

// Labels inside figures are sized by root() so every figure shows them at the same on-screen size, whatever its
// viewBox: a figure is drawn ~360 px wide, so LABEL_PX / 360 of the frame width gives ~15 px text.
const LABEL = "label";
const LABEL_PX = 15;
const FIGURE_PX = 360;

/** Text at a fixed size, or (no size) a figure label sized by root(). */
export function text(x: number, y: number, s: string, size?: number, anchor = "middle"): string {
  return `<text x="${n2(x)}" y="${n2(y)}" font-size="${size ?? LABEL}" text-anchor="${anchor}" fill="currentColor">${s}</text>`;
}

const attrs = (data: Record<string, string>) =>
  Object.entries(data)
    .map(([k, v]) => ` data-${k}="${v}"`)
    .join("");

/** Wrap a piece in a root <svg>. When `size` is given the piece is centred in that frame. */
export function root(p: Piece, data: Record<string, string> = {}, pad = 6, size?: { w: number; h: number }): string {
  const w = p.box.x1 - p.box.x0;
  const h = p.box.y1 - p.box.y0;
  const W = Math.max(w, size?.w ?? 0) + 2 * pad;
  const H = Math.max(h, size?.h ?? 0) + 2 * pad;
  const x = p.box.x0 - (W - w) / 2;
  const y = p.box.y0 - (H - h) / 2;
  const body = p.body.replaceAll(`font-size="${LABEL}"`, `font-size="${n2((W * LABEL_PX) / FIGURE_PX)}"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n2(x)} ${n2(y)} ${n2(W)} ${n2(H)}"${attrs(data)}>${body}</svg>`;
}

/** Root several pieces in one shared frame so options draw at the same scale. */
export function rootAll(pieces: Piece[], data: Record<string, string>[], pad = 6): string[] {
  const w = Math.max(...pieces.map((p) => p.box.x1 - p.box.x0));
  const h = Math.max(...pieces.map((p) => p.box.y1 - p.box.y0));
  return pieces.map((p, i) => root(p, data[i], pad, { w, h }));
}

export function numberOption(v: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" data-kind="number" data-value="${v}">${text(30, 25, String(v), 20)}</svg>`;
}

export function readData(svg: string, name: string): string {
  const m = new RegExp(`data-${name}="([^"]*)"`).exec(svg);
  if (!m) throw new Error(`missing data-${name}`);
  return m[1];
}

/** Arrow from (x0,y0) to (x1,y1) with a filled head. */
export function arrow(x0: number, y0: number, x1: number, y1: number, head = 6): string {
  const a = Math.atan2(y1 - y0, x1 - x0);
  const hx = (t: number) => x1 - head * Math.cos(a + t);
  const hy = (t: number) => y1 - head * Math.sin(a + t);
  const bx = x1 - head * 0.8 * Math.cos(a);
  const by = y1 - head * 0.8 * Math.sin(a);
  return (
    `<path d="M${n2(x0)} ${n2(y0)}L${n2(bx)} ${n2(by)}" ${stroke(W_EDGE)}/>` +
    `<path d="M${n2(x1)} ${n2(y1)}L${n2(hx(0.45))} ${n2(hy(0.45))}L${n2(hx(-0.45))} ${n2(hy(-0.45))}Z" fill="currentColor"/>`
  );
}
