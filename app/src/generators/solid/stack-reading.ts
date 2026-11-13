// Complete reading search for isometric drawings of piles of cubes.
//
// Reader's rule (stated in the stem): cubes stand in piles on one floor, every cube sits on the floor or on
// another cube, and the top of every pile shows. A visible top face at lattice cell (i, j) then belongs to the
// pile at (i + h, j + h) for some height h >= 1, so a reading is one height per visible top cell. This module
// enumerates every such assignment and counts those that draw exactly the same picture (same filled triangles,
// same face shading, same line between every pair of neighbouring triangles: none, outline, edge or grid).
//
// Picture model, independent of iso.ts: lattice point (p, q) holds the cube with the largest z among
// (p + z, q + z, z); a triangle belongs to whichever of its three lattice points holds the cube nearest the
// viewer (largest x + y + z; never tied). Piles live on one lattice diagonal p - q, and a triangle depends only
// on two neighbouring diagonals, so the search assigns piles diagonal by diagonal and checks each triangle as
// soon as every pile that could cover it is placed.

const U = 0;
const L = 1;
export type Tri = [number, number, number]; // i, j, half
export const tkey = (i: number, j: number, h: number) => ((i + 512) * 1024 + (j + 512)) * 2 + h;

export interface Owner {
  p: number;
  q: number;
  z: number;
  face: 0 | 1 | 2;
}

/** Vertices of a triangle with the face that vertex's cube shows on it (0 top, 1 front +x, 2 right +y). */
export function vertices([i, j, h]: Tri): [number, number, 0 | 1 | 2][] {
  return h === U
    ? [
        [i, j, 2],
        [i + 1, j + 1, 0],
        [i, j + 1, 1],
      ]
    : [
        [i, j, 1],
        [i + 1, j, 2],
        [i + 1, j + 1, 0],
      ];
}

/** Neighbouring triangles across each of the three edges. */
export function neighbours([i, j, h]: Tri): Tri[] {
  return h === U
    ? [
        [i, j, L],
        [i - 1, j, L],
        [i, j + 1, L],
      ]
    : [
        [i, j, U],
        [i, j - 1, U],
        [i + 1, j, U],
      ];
}

/** Largest diagonal index p - q among a triangle's vertices: piles on diagonals up to this one decide it. */
const lastDiag = ([i, j, h]: Tri) => (h === U ? i - j : i - j + 1);

export type Field = Map<number, number>; // fk(p, q) -> z of the front cube there
export const fk = (p: number, q: number) => (p + 512) * 1024 + (q + 512);
export const fdecode = (k: number): [number, number] => [Math.floor(k / 1024) - 512, (k % 1024) - 512];

export function owner(field: Field, t: Tri): Owner | null {
  let best: Owner | null = null;
  let bestS = -Infinity;
  for (const [p, q, face] of vertices(t)) {
    const z = field.get(fk(p, q));
    if (z === undefined) continue;
    const s = p + q + 3 * z;
    if (s > bestS) {
      bestS = s;
      best = { p, q, z, face };
    }
  }
  return best;
}

const plane = (o: Owner) => (o.face === 0 ? o.z : o.face === 1 ? o.p + o.z : o.q + o.z);

/** -1 nothing drawn, 0 no line (same face of one cube), 1 outline, 2 edge, 3 grid. */
export function lineClass(a: Owner | null, b: Owner | null): number {
  if (!a && !b) return -1;
  if (!a || !b) return 1;
  const same = a.p === b.p && a.q === b.q && a.z === b.z;
  if (same && a.face === b.face) return 0;
  if (!same && a.face === b.face && plane(a) === plane(b)) return 3;
  return 2;
}

export interface Pile {
  x: number;
  y: number;
  h: number;
}

function fieldOf(piles: Pile[]): Field {
  const f: Field = new Map();
  for (const { x, y, h } of piles)
    for (let z = 0; z < h; z++) {
      const k = fk(x - z, y - z);
      const cur = f.get(k);
      if (cur === undefined || z > cur) f.set(k, z);
    }
  return f;
}

/** Triangle signature: face shown (or -1 when empty), then the class of each of its three edges. */
export function sig(field: Field, t: Tri): number[] {
  const o = owner(field, t);
  return [o ? o.face : -1, ...neighbours(t).map((n) => lineClass(o, owner(field, n)))];
}
export const EMPTY_SIG = [-1, -1, -1, -1];

export function region(field: Field): Tri[] {
  const out = new Map<number, Tri>();
  for (const k of field.keys()) {
    const [p, q] = fdecode(k);
    // the six triangles round (p, q) and their neighbours
    for (let i = p - 2; i <= p + 1; i++)
      for (let j = q - 2; j <= q + 1; j++) for (const h of [U, L]) out.set(tkey(i, j, h), [i, j, h]);
  }
  return [...out.values()];
}

export interface ReadingResult {
  count: number; // readings that draw the same picture (1 = determined); stops counting at `limit`
  alternatives: Pile[][]; // the readings other than the true one, up to limit - 1
}

/**
 * Count readings of the drawing of `piles` under the reader's rule. Requires every pile's top to show (else the
 * rule is broken and the count is 0). With `grid`, readings must also fit a rows x cols floor grid (the stem
 * states its size).
 */
export function countReadings(piles: Pile[], limit = 2, grid?: { rows: number; cols: number }): ReadingResult {
  const fits = (ps: Pile[]) => {
    if (!grid) return true;
    const xs = ps.map((p) => p.x);
    const ys = ps.map((p) => p.y);
    return Math.max(...xs) - Math.min(...xs) < grid.rows && Math.max(...ys) - Math.min(...ys) < grid.cols;
  };
  const truth = fieldOf(piles);
  const target = new Map<number, number[]>();
  for (const t of region(truth)) target.set(tkey(...t), sig(truth, t));
  const filled = (t: Tri) => owner(truth, t) !== null;

  // visible top cells: a top triangle whose owner's face is 0
  const tops = new Map<string, [number, number]>();
  for (const t of region(truth)) {
    const o = owner(truth, t);
    if (o && o.face === 0) tops.set(`${t[0]},${t[1]}`, [t[0], t[1]]);
  }
  // rule check on the truth: each pile's top cell must show
  for (const { x, y, h } of piles) if (!tops.has(`${x - h},${y - h}`)) return { count: 0, alternatives: [] };

  // candidate heights per top cell: the pile's cubes cover lattice points (i+1+t, j+1+t), t < h, and every
  // triangle round a covered point must be filled in the picture
  const cells = [...tops.values()].map(([i, j]) => {
    const hs: number[] = [];
    for (let h = 1; h <= 12; h++) {
      const p = i + h;
      const q = j + h;
      const ok = [
        [p - 1, q - 1, U],
        [p - 1, q - 1, L],
        [p, q - 1, U],
        [p, q, L],
        [p - 1, q, L],
        [p, q, U],
      ].every((t) => filled(t as Tri));
      if (!ok) break;
      hs.push(h);
    }
    return { i, j, d: i - j, hs };
  });
  cells.sort((a, b) => a.d - b.d || a.i - b.i);
  const tris = region(truth);
  const triByDiag = new Map<number, Tri[]>();
  for (const t of tris) {
    const d = lastDiag(t);
    const list = triByDiag.get(d);
    if (list) list.push(t);
    else triByDiag.set(d, [t]);
  }
  const allDiags = [...triByDiag.keys()].sort((a, b) => a - b);
  const trueKey = piles.map((p) => `${p.x},${p.y},${p.h}`).sort().join(" ");

  let count = 0;
  const alternatives: Pile[][] = [];
  const chosen: number[] = cells.map(() => 0);

  // check every triangle decided by diagonals in (lo, hi]
  const check = (lo: number, hi: number, n: number): boolean => {
    const field = fieldOf(cells.slice(0, n).map((c, k) => ({ x: c.i + chosen[k], y: c.j + chosen[k], h: chosen[k] })));
    for (const d of allDiags) {
      if (d <= lo || d > hi) continue;
      for (const t of triByDiag.get(d)!) {
        const o = owner(field, t);
        const want = target.get(tkey(...t))!;
        if ((o ? o.face : -1) !== want[0]) return false;
        const nb = neighbours(t);
        for (let e = 0; e < 3; e++) {
          // compare only edges whose other triangle is decided too
          if (lastDiag(nb[e]) > hi) continue;
          if (lineClass(o, owner(field, nb[e])) !== want[e + 1]) return false;
        }
      }
    }
    return true;
  };

  const search = (k: number, checkedTo: number) => {
    if (count >= limit) return;
    if (k === cells.length) {
      const ps = cells.map((c, n) => ({ x: c.i + chosen[n], y: c.j + chosen[n], h: chosen[n] }));
      if (!fits(ps) || !check(checkedTo, Infinity, k)) return;
      count++;
      if (ps.map((p) => `${p.x},${p.y},${p.h}`).sort().join(" ") !== trueKey) alternatives.push(ps);
      return;
    }
    for (const h of cells[k].hs) {
      chosen[k] = h;
      const endOfDiag = k + 1 === cells.length || cells[k + 1].d !== cells[k].d;
      if (endOfDiag && k + 1 < cells.length) {
        // every pile on diagonals <= this one is placed; triangles up to this diagonal are now final
        const upto = cells[k].d;
        if (!check(checkedTo, upto, k + 1)) continue;
        search(k + 1, upto);
      } else search(k + 1, checkedTo);
      if (count >= limit) return;
    }
  };
  search(0, -Infinity);
  return { count, alternatives };
}

/** Height map (rows x, columns y) to piles. */
export const pilesOf = (H: number[][]): Pile[] =>
  H.flatMap((row, x) => row.flatMap((h, y) => (h > 0 ? [{ x, y, h }] : [])));
