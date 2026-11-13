// Complete reading search for isometric drawings under the rule "all cubes are visible; there are no hidden
// cubes" (stated in every stem that shows an isometric solid).
//
// In the isometric lattice every cube sits on a lattice point (x - z, y - z) and only its distance along the
// line of sight (z) is lost. With no hidden cubes, each visible lattice point holds exactly one cube, so a reading
// is one z per visible lattice point. The search tries every z within `range` of the drawn one (the first point
// fixed, since moving the whole solid along the line of sight is the same solid) and keeps the readings that draw
// exactly the same picture — same shading per triangle, same line on every edge — with every cube visible and the
// cubes joined face to face. Triangles are checked as soon as their three lattice points are placed.
import { EMPTY_SIG, type Field, type Tri, fdecode, fk, lineClass, neighbours, owner, region, sig, tkey, vertices } from "./stack-reading";
import { type Vox, isConnected, normalize, serial } from "./voxel";

const around = (p: number, q: number): Tri[] => [
  [p - 1, q - 1, 0],
  [p - 1, q - 1, 1],
  [p, q - 1, 0],
  [p, q, 1],
  [p - 1, q, 1],
  [p, q, 0],
];

/** Readings of the drawing of `vs` that are a different solid (up to translation). Stops at `limit`. */
export function isoAlternatives(vs: Vox[], range = 3, limit = 8): Vox[][] {
  const truth: Field = new Map();
  for (const v of vs) {
    const k = fk(v[0] - v[2], v[1] - v[2]);
    if ((truth.get(k) ?? -Infinity) < v[2]) truth.set(k, v[2]);
  }
  const target = new Map<number, number[]>();
  for (const t of region(truth)) target.set(tkey(...t), sig(truth, t));
  const points = [...truth.keys()]
    .map(fdecode)
    .sort((a, b) => a[0] - a[1] - (b[0] - b[1]) || a[0] - b[0]);
  const truthSerial = serial(vs);
  const field: Field = new Map();
  const placed = (p: number, q: number) => !truth.has(fk(p, q)) || field.has(fk(p, q));
  const decided = (t: Tri) => vertices(t).every(([p, q]) => placed(p, q));

  const ok = (p: number, q: number) => {
    for (const t of around(p, q)) {
      if (!decided(t)) continue;
      const o = owner(field, t);
      const want = target.get(tkey(...t)) ?? EMPTY_SIG;
      if ((o ? o.face : -1) !== want[0]) return false;
      const nb = neighbours(t);
      for (let e = 0; e < 3; e++) if (decided(nb[e]) && lineClass(o, owner(field, nb[e])) !== want[e + 1]) return false;
    }
    return true;
  };

  const out: Vox[][] = [];
  const search = (k: number) => {
    if (out.length >= limit) return;
    if (k === points.length) {
      const cubes = [...field].map(([key, z]) => {
        const [p, q] = fdecode(key);
        return [p + z, q + z, z] as Vox;
      });
      // every cube shows: each lattice point owns at least one triangle
      const shown = new Set<number>();
      for (const t of region(field)) {
        const o = owner(field, t);
        if (o) shown.add(fk(o.p, o.q));
      }
      if (shown.size !== field.size || !isConnected(cubes)) return;
      if (serial(cubes) !== truthSerial) out.push(normalize(cubes));
      return;
    }
    const [p, q] = points[k];
    const z0 = truth.get(fk(p, q))!;
    const zs = k === 0 ? [z0] : [...Array(2 * range + 1).keys()].map((i) => z0 - range + i);
    for (const z of zs) {
      field.set(fk(p, q), z);
      if (ok(p, q)) search(k + 1);
      field.delete(fk(p, q));
      if (out.length >= limit) return;
    }
  };
  search(0);
  return out;
}
