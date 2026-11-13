// Asymmetric grid figures: a polyomino (soft cells, outlined) with solid half-cell triangles and
// dots as orientation cues. Shared by rotation-2d and mirror-water-image.
import type { Rng } from "../rng";
import { canonDrawing, D4, transformDrawing, type Drawing, type Pt } from "./svg";

export interface GridSpec {
  n: number; // grid size
  cells: number; // polyomino size (for symmetric figures: cells in the left half incl. centre column)
  tris: number;
  dots: number;
  symmetric: boolean; // mirror-symmetric base plus a single asymmetric dot (subtle)
}

const k = (r: number, c: number) => `${r},${c}`;

function grow(rng: Rng, n: number, size: number, ok: (r: number, c: number) => boolean): [number, number][] {
  const cells: [number, number][] = [];
  const has = new Set<string>();
  let start: [number, number];
  do start = [rng.int(0, n - 1), rng.int(0, n - 1)];
  while (!ok(...start));
  cells.push(start);
  has.add(k(...start));
  let guard = 0;
  while (cells.length < size && guard++ < 500) {
    const [r, c] = rng.pick(cells);
    const [dr, dc] = rng.pick([
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ] as const);
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= n || nc >= n || !ok(nr, nc) || has.has(k(nr, nc))) continue;
    has.add(k(nr, nc));
    cells.push([nr, nc]);
  }
  return cells;
}

export function cellsDrawing(n: number, cells: [number, number][], tris: [number, number, number][], dots: [number, number][]): Drawing {
  const h = n / 2;
  const corner = (r: number, c: number, q: number): Pt => {
    // q: 0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left
    const x = c - h + (q === 1 || q === 2 ? 1 : 0);
    const y = r - h + (q >= 2 ? 1 : 0);
    return [x, y];
  };
  const has = new Set(cells.map(([r, c]) => k(r, c)));
  const strokes: Pt[][] = [];
  for (const [r, c] of cells) {
    if (!has.has(k(r - 1, c))) strokes.push([corner(r, c, 0), corner(r, c, 1)]);
    if (!has.has(k(r, c + 1))) strokes.push([corner(r, c, 1), corner(r, c, 2)]);
    if (!has.has(k(r + 1, c))) strokes.push([corner(r, c, 2), corner(r, c, 3)]);
    if (!has.has(k(r, c - 1))) strokes.push([corner(r, c, 3), corner(r, c, 0)]);
  }
  return {
    strokes,
    fills: [
      ...cells.map(([r, c]) => ({ pts: [0, 1, 2, 3].map((q) => corner(r, c, q)), fill: "soft" as const })),
      ...tris.map(([r, c, q]) => ({
        pts: [corner(r, c, (q + 3) % 4), corner(r, c, q), corner(r, c, (q + 1) % 4)],
        fill: "solid" as const,
      })),
    ],
    dots: dots.map(([r, c]) => ({ c: [c - h + 0.5, r - h + 0.5] as Pt, r: 0.2, fill: "solid" as const })),
  };
}

// Returns a figure whose eight D4 images are all distinct.
export function makeGridFigure(rng: Rng, spec: GridSpec): Drawing {
  for (;;) {
    const { n } = spec;
    let cells: [number, number][];
    let tris: [number, number, number][] = [];
    let dots: [number, number][] = [];
    if (!spec.symmetric) {
      cells = grow(rng, n, spec.cells, () => true);
      const pool = rng.shuffle(cells);
      tris = pool.slice(0, spec.tris).map(([r, c]) => [r, c, rng.int(0, 3)]);
      dots = pool.slice(spec.tris, spec.tris + spec.dots);
    } else {
      const mid = (n - 1) / 2;
      const half = grow(rng, n, spec.cells, (_r, c) => c <= mid);
      if (!half.some(([, c]) => c === mid)) continue;
      const set = new Map<string, [number, number]>();
      for (const [r, c] of half) {
        set.set(k(r, c), [r, c]);
        set.set(k(r, n - 1 - c), [r, n - 1 - c]);
      }
      cells = [...set.values()];
      const side = rng.shuffle(half.filter(([, c]) => c < mid));
      // mirrored triangle pairs: corner q mirrors to 0<->1, 2<->3
      const mq = [1, 0, 3, 2];
      for (const [r, c] of side.slice(0, spec.tris)) {
        const q = rng.int(0, 3);
        tris.push([r, c, q], [r, n - 1 - c, mq[q]]);
      }
      // the one asymmetric cue: a dot on one side only
      const free = side.slice(spec.tris);
      if (!free.length) continue;
      dots = [rng.pick(free)];
    }
    const d = cellsDrawing(n, cells, tris, dots);
    const forms = new Set(Object.values(D4).map((m) => canonDrawing(transformDrawing(d, m))));
    if (forms.size === 8) return d;
  }
}
