// fold-punch-unfold: a square sheet (12 × 12 units) is folded 1–3 times, punched through all
// layers, then unfolded.
//
// Construction (unfold): start from the punch points and, folds in reverse order, add each
// hole's reflection across that crease. A punch centred on a crease is its own reflection,
// so it opens into one hole.
// Solver (fold forward): reads folds and punches from data-fold on the figure, then takes every
// lattice point of the open sheet, folds it forward through each crease, and keeps it if it
// lands on a punch. MCQ options are compared through their data-holes lists.
import type { Difficulty, Format, GeneratedQuestion, Generator, SimpleAnswer } from "@/content/types";
import { createRng, type Rng } from "../rng";
import { answerFromFlags, genId, placeOptions, takeDistinct } from "./common";
import { arrowHead, hash, n, pathD, readData, svgRoot, type Pt } from "./svg";

const ID = "fold-punch-unfold";
const SIDE = 12;
const R = 0.75; // punch size (circle radius / square half-side), sheet units

type Shape = "circle" | "square";
interface Fold {
  a: number;
  b: number;
  c: number; // crease: a x + b y = c
  s: 1 | -1; // the side where s(ax + by - c) > 0 stays put; the other side folds onto it
}
interface Punch {
  x: number;
  y: number;
  shape: Shape;
}
type Hole = Punch;

const side = (f: Fold, p: Pt) => f.s * (f.a * p[0] + f.b * p[1] - f.c);
const reflect = (f: Fold, p: Pt): Pt => {
  const k = (2 * (f.a * p[0] + f.b * p[1] - f.c)) / (f.a * f.a + f.b * f.b);
  return [p[0] - k * f.a, p[1] - k * f.b];
};
const hk = (h: Hole) => `${h.shape[0]}:${h.x},${h.y}`;
const holesKey = (hs: Hole[]) => hs.map(hk).sort().join(";");
const clean = (v: number) => Math.round(v * 2) / 2 + 0; // lattice is 0.5; also kills -0

function clip(poly: Pt[], f: Fold): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const sp = side(f, p);
    const sq = side(f, q);
    if (sp >= -1e-9) out.push(p);
    if ((sp > 1e-9 && sq < -1e-9) || (sp < -1e-9 && sq > 1e-9)) {
      const t = sp / (sp - sq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}
const flip = (f: Fold): Fold => ({ ...f, s: (-f.s) as 1 | -1 });

function isSymmetric(poly: Pt[], f: Fold): boolean {
  const k = (p: Pt) => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`;
  const set = new Set(poly.map(k));
  return poly.every((p) => set.has(k(reflect(f, p))));
}

const SQUARE: Pt[] = [
  [0, 0],
  [SIDE, 0],
  [SIDE, SIDE],
  [0, SIDE],
];

function candidateFolds(poly: Pt[], diagonals: boolean): Omit<Fold, "s">[] {
  const out: Omit<Fold, "s">[] = [];
  const fams: [number, number, number, number][] = [
    [1, 0, 1, SIDE - 1],
    [0, 1, 1, SIDE - 1],
  ];
  if (diagonals) fams.push([1, 1, 1, 2 * SIDE - 1], [1, -1, 1 - SIDE, SIDE - 1]);
  for (const [a, b, lo, hi] of fams) {
    for (let c = lo; c <= hi; c++) {
      const f: Fold = { a, b, c, s: 1 };
      const sides = poly.map((p) => side(f, p));
      if (!sides.some((v) => v > 1e-9) || !sides.some((v) => v < -1e-9)) continue;
      if (isSymmetric(poly, f)) out.push({ a, b, c });
    }
  }
  return out;
}

function unfold(punches: Punch[], folds: Fold[]): Hole[] {
  const map = new Map<string, Hole>();
  for (const p of punches) map.set(hk(p), p);
  for (const f of [...folds].reverse()) {
    for (const h of [...map.values()]) {
      const [x, y] = reflect(f, [h.x, h.y]);
      const r = { x: clean(x), y: clean(y), shape: h.shape };
      map.set(hk(r), r);
    }
  }
  return [...map.values()];
}

function validHoles(hs: Hole[]): boolean {
  const lo = 1;
  const hi = SIDE - 1;
  if (hs.some((h) => h.x < lo || h.x > hi || h.y < lo || h.y > hi)) return false;
  for (let i = 0; i < hs.length; i++)
    for (let j = i + 1; j < hs.length; j++)
      if (Math.hypot(hs[i].x - hs[j].x, hs[i].y - hs[j].y) < 2) return false;
  return true;
}

const lineOf = (f: { a: number; b: number; c: number }) => `${f.a},${f.b},${f.c}`;

function edgesOf(poly: Pt[]): { p: Pt; q: Pt; line: string }[] {
  return poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length];
    // normalise the edge's line to the a x + b y = c families used by folds
    let a = q[1] - p[1];
    let b = p[0] - q[0];
    const m = Math.max(Math.abs(a), Math.abs(b));
    a = Math.round(a / m);
    b = Math.round(b / m);
    if (a < 0 || (a === 0 && b < 0)) {
      a = -a;
      b = -b;
    }
    return { p, q, line: lineOf({ a, b, c: Math.round((a * p[0] + b * p[1]) * 1000) / 1000 }) };
  });
}
const distToLine = (e: { p: Pt; q: Pt }, x: Pt) => {
  const dx = e.q[0] - e.p[0];
  const dy = e.q[1] - e.p[1];
  return Math.abs(dy * (x[0] - e.p[0]) - dx * (x[1] - e.p[1])) / Math.hypot(dx, dy);
};

interface Built {
  folds: Fold[];
  regions: Pt[][]; // regions[i] = shape before fold i; last = final folded shape
  punches: Punch[];
  holes: Hole[];
}

function build(rng: Rng, difficulty: Difficulty, edgeBias: number): Built {
  for (let attempt = 0; ; attempt++) {
    if (attempt > 2000) throw new Error(`${ID}: no valid fold sequence`);
    const nFolds = difficulty;
    const folds: Fold[] = [];
    const regions: Pt[][] = [SQUARE];
    for (let i = 0; i < nFolds; i++) {
      const cur = regions[i];
      const cands = candidateFolds(cur, difficulty > 1);
      if (!cands.length) break;
      const f: Fold = { ...rng.pick(cands), s: rng.bool() ? 1 : -1 };
      folds.push(f);
      regions.push(clip(cur, f));
    }
    if (folds.length !== nFolds) continue;
    if (difficulty === 3 && !folds.some((f) => f.a === 1 && f.b !== 0)) continue;

    const final = regions[nFolds];
    const edges = edgesOf(final);
    const foldLines = new Set(folds.map(lineOf));
    const interior: Pt[] = [];
    const onCrease: Pt[] = [];
    for (let x = 0.5; x < SIDE; x += 0.5)
      for (let y = 0.5; y < SIDE; y += 0.5) {
        const p: Pt = [x, y];
        const inside = edges.every((e) => (e.q[0] - e.p[0]) * (y - e.p[1]) - (e.q[1] - e.p[1]) * (x - e.p[0]) >= -1e-9);
        if (!inside) continue;
        const d = edges.map((e) => distToLine(e, p));
        const touching = edges.filter((_, i) => d[i] < 1e-9);
        if (d.some((v) => v > 1e-9 && v < 1)) continue;
        if (!touching.length) {
          if (x % 1 === 0.5 && y % 1 === 0.5) interior.push(p);
        } else if (touching.length === 1 && foldLines.has(touching[0].line)) onCrease.push(p); // never at a corner
      }
    const count = difficulty === 3 ? 2 : rng.int(1, 2);
    const useEdge = difficulty > 1 && onCrease.length > 0 && rng.bool(edgeBias);
    const pts: Pt[] = [];
    if (useEdge) pts.push(rng.pick(onCrease));
    const pool = rng.shuffle(interior);
    while (pts.length < count && pool.length) pts.push(pool.pop()!);
    if (pts.length < count) continue;
    const shapes: Shape[] = difficulty === 3 ? rng.shuffle(["circle", "square"] as Shape[]) : [rng.pick(["circle", "square"] as Shape[])];
    const punches = pts.map((p, i) => ({ x: p[0], y: p[1], shape: shapes[i % shapes.length] }));
    // every punch must read as a clear mark on the folded sheet: at least 45% of its shape inside the paper
    if (punches.some((h) => area(clipToPoly(shapePoly(h), final)) < 0.45 * area(shapePoly(h)))) continue;
    const holes = unfold(punches, folds);
    if (!validHoles(holes)) continue;
    return { folds, regions, punches, holes };
  }
}

function area(poly: Pt[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}

// ---------- distractors ----------
function variants(rng: Rng, b: Built, difficulty: Difficulty): { holes: Hole[]; note: string }[] {
  const out: { holes: Hole[]; note: string }[] = [];
  const target = b.holes.length;
  // punch in the wrong place on the folded sheet, then unfolded correctly: the pattern keeps the right symmetry,
  // so checking the mirror lines alone does not rule it out
  const sym: { holes: Hole[]; note: string }[] = [];
  b.punches.forEach((p, i) => {
    for (const [dx, dy] of rng.shuffle([
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const)) {
      const punches = b.punches.map((q, j) => (j === i ? { ...q, x: q.x + dx, y: q.y + dy } : q));
      const hs = unfold(punches, b.folds);
      if (hs.length === target && validHoles(hs)) sym.push({ holes: hs, note: "the punch one square out of place" });
    }
    const swapped = b.punches.map((q, j) => (j === i ? { ...q, shape: q.shape === "circle" ? ("square" as const) : ("circle" as const) } : q));
    sym.push({ holes: unfold(swapped, b.folds), note: `the ${p.shape} punch drawn as the wrong shape` });
  });
  // wrong crease: unfold one fold across the perpendicular line through the same point
  b.folds.forEach((f, i) => {
    const chord = b.regions[i].filter((p) => Math.abs(f.a * p[0] + f.b * p[1] - f.c) < 1e-9);
    const all = [...chord];
    const poly = b.regions[i];
    for (let j = 0; j < poly.length; j++) {
      const p = poly[j];
      const q = poly[(j + 1) % poly.length];
      const sp = f.a * p[0] + f.b * p[1] - f.c;
      const sq = f.a * q[0] + f.b * q[1] - f.c;
      if (sp * sq < -1e-12) {
        const t = sp / (sp - sq);
        all.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
    if (all.length < 2) return;
    const m: Pt = [(all[0][0] + all[1][0]) / 2, (all[0][1] + all[1][1]) / 2];
    const a = f.b === 0 ? 0 : f.a === 0 ? 1 : 1;
    const bb = f.b === 0 ? 1 : f.a === 0 ? 0 : -f.b;
    const g: Fold = { a, b: bb, c: a * m[0] + bb * m[1], s: 1 };
    const folds = b.folds.map((x, j) => (j === i ? g : x));
    const hs = unfold(b.punches, folds);
    if (hs.length === target && validHoles(hs)) out.push({ holes: hs, note: "unfolded across the wrong crease" });
  });
  // whole pattern mirrored or turned
  const tf: [(h: Hole) => Hole, string][] = [
    [(h) => ({ ...h, x: SIDE - h.x }), "the correct pattern mirrored"],
    [(h) => ({ ...h, y: SIDE - h.y }), "the correct pattern flipped"],
    [(h) => ({ ...h, x: SIDE - h.y, y: h.x }), "the correct pattern turned"],
  ];
  for (const [t, note] of tf) out.push({ holes: b.holes.map(t), note });
  // one hole moved by one unit
  for (let k = 0; k < 4; k++) {
    const i = rng.int(0, b.holes.length - 1);
    const [dx, dy] = rng.pick([
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const);
    const hs = b.holes.map((h, j) => (j === i ? { ...h, x: h.x + dx, y: h.y + dy } : h));
    if (validHoles(hs)) out.push({ holes: hs, note: "one hole out of place" });
  }
  // one hole of the wrong shape
  const i = rng.int(0, b.holes.length - 1);
  out.push({
    holes: b.holes.map((h, j) => (j === i ? { ...h, shape: h.shape === "circle" ? "square" : "circle" } : h)),
    note: "one hole of the wrong shape",
  });
  const shuffled = difficulty === 1 ? [...rng.shuffle(sym), ...rng.shuffle(out)] : rng.shuffle([...out, ...sym]);
  // fallback: forgetting one unfold (fewer holes)
  b.folds.forEach((_, k) => {
    const hs = unfold(
      b.punches,
      b.folds.filter((_, j) => j !== k),
    );
    shuffled.push({ holes: hs, note: "one unfold missed" });
  });
  return shuffled;
}

// ---------- rendering ----------
function circlePoly(c: Pt, r: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 32; i++) pts.push([c[0] + r * Math.cos((i * Math.PI) / 16), c[1] + r * Math.sin((i * Math.PI) / 16)]);
  return pts;
}
function shapePoly(h: Punch): Pt[] {
  if (h.shape === "circle") return circlePoly([h.x, h.y], R);
  const r = R * 0.88;
  return [
    [h.x - r, h.y - r],
    [h.x + r, h.y - r],
    [h.x + r, h.y + r],
    [h.x - r, h.y + r],
  ];
}
function clipToPoly(shape: Pt[], region: Pt[]): Pt[] {
  let out = shape;
  // region is convex and counter-clockwise on screen (clockwise in maths): keep the inner side of each edge
  for (let i = 0; i < region.length; i++) {
    const p = region[i];
    const q = region[(i + 1) % region.length];
    const a = -(q[1] - p[1]);
    const b = q[0] - p[0];
    const f: Fold = { a, b, c: a * p[0] + b * p[1], s: 1 };
    out = clip(out, f);
  }
  return out;
}

function figureSvg(b: Built): string {
  const k = b.folds.length;
  const panels = b.regions.map((poly) => {
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    return { poly, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });
  const rows = k === 1 ? [[0, 1]] : [[0, 1], panels.map((_, i) => i).slice(2)];
  const GAP = 34;
  const PAD = 10;
  const widest = Math.max(...rows.map((r) => r.reduce((acc, i) => acc + panels[i].x1 - panels[i].x0, 0)));
  const gaps = Math.max(...rows.map((r) => (r.length - 1 + (r[0] === 0 ? 0 : 1)) * GAP));
  const s = Math.min(13, (280 - 2 * PAD - gaps) / widest);
  let body = "";
  let y = PAD;
  const T = (ox: number, oy: number) => (p: Pt): Pt => [ox + p[0] * s, oy + p[1] * s];
  for (const row of rows) {
    const rowH = Math.max(...row.map((i) => panels[i].y1 - panels[i].y0)) * s;
    const rowW = row.reduce((acc, i) => acc + (panels[i].x1 - panels[i].x0) * s, 0) + (row.length - 1 + (row[0] === 0 ? 0 : 1)) * GAP;
    let x = (280 - rowW) / 2;
    for (const i of row) {
      const P = panels[i];
      if (i > 0) {
        // step arrow
        const ay = y + rowH / 2;
        body += `<g class="mute"><path d="M${n(x + 7)} ${n(ay)}L${n(x + GAP - 7)} ${n(ay)}"/>${arrowHead([x + GAP - 7, ay], 1, 0, 6)}</g>`;
        x += GAP;
      }
      const ox = x - P.x0 * s;
      const oy = y + (rowH - (P.y1 - P.y0) * s) / 2 - P.y0 * s;
      const t = T(ox, oy);
      body += `<path class="soft" d="${pathD(P.poly.map(t), true)}"/>`;
      if (i < k) {
        const f = b.folds[i];
        // crease: the chord of the crease line through this region
        const pts: Pt[] = [];
        for (let j = 0; j < P.poly.length; j++) {
          const p = P.poly[j];
          const q = P.poly[(j + 1) % P.poly.length];
          const sp = f.a * p[0] + f.b * p[1] - f.c;
          const sq = f.a * q[0] + f.b * q[1] - f.c;
          if (Math.abs(sp) < 1e-9) pts.push(p);
          else if (sp * sq < 0) {
            const tt = sp / (sp - sq);
            pts.push([p[0] + tt * (q[0] - p[0]), p[1] + tt * (q[1] - p[1])]);
          }
        }
        body += `<path d="${pathD(P.poly.map(t), true)}"/>`;
        body += `<path class="mute" stroke-dasharray="4 5" d="${pathD([t(pts[0]), t(pts[1])])}"/>`;
        // fold arrow: from the moving half to its mirror position
        const moving = clip(P.poly, flip(f));
        const cen: Pt = [moving.reduce((a2, p) => a2 + p[0], 0) / moving.length, moving.reduce((a2, p) => a2 + p[1], 0) / moving.length];
        const mid: Pt = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
        const from: Pt = [cen[0] + (mid[0] - cen[0]) * 0.1, cen[1] + (mid[1] - cen[1]) * 0.1];
        const to = reflect(f, from);
        const dir: Pt = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]];
        const dl = Math.hypot(dir[0], dir[1]);
        const bulge = Math.hypot(to[0] - from[0], to[1] - from[1]) * 0.45;
        const cp: Pt = [(from[0] + to[0]) / 2 + (dir[0] / dl) * bulge, (from[1] + to[1]) / 2 + (dir[1] / dl) * bulge];
        const [A, C, B] = [t(from), t(cp), t(to)];
        body += `<g class="mute"><path d="M${n(A[0])} ${n(A[1])}Q${n(C[0])} ${n(C[1])} ${n(B[0])} ${n(B[1])}"/>${arrowHead(B, B[0] - C[0], B[1] - C[1], 7)}</g>`;
      } else {
        body += `<path d="${pathD(P.poly.map(t), true)}"/>`;
        const holes = b.punches.map((h) => clipToPoly(shapePoly(h), P.poly).map(t));
        body += `<path fill="currentColor" stroke="none" d="${holes.map((h) => pathD(h, true)).join("")}"/>`;
      }
      x += (P.x1 - P.x0) * s;
    }
    y += rowH + 22;
  }
  return svgRoot(280, y - 22 + PAD, body, { fold: { folds: b.folds, punches: b.punches } });
}

function optionSvg(holes: Hole[]): string {
  const s = 120 / SIDE;
  const o = 10;
  const t = (p: Pt): Pt => [o + p[0] * s, o + p[1] * s];
  const sorted = [...holes].sort((p, q) => hk(p).localeCompare(hk(q)));
  const body =
    `<path class="soft" d="${pathD(SQUARE.map(t), true)}"/><path d="${pathD(SQUARE.map(t), true)}"/>` +
    `<path fill="currentColor" stroke="none" d="${sorted.map((h) => pathD(shapePoly(h).map(t), true)).join("")}"/>`;
  return svgRoot(140, 140, body, { holes: sorted.map(hk), key: hash(holesKey(holes)) });
}

function generate(seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion {
  if (format !== "MCQ" && format !== "NAT") throw new Error(`${ID}: unsupported format ${format}`);
  const rng = createRng(seed);
  const b = build(rng, difficulty, format === "NAT" ? 0.7 : 0.4);
  const count = b.holes.length;
  const onCrease = b.punches.filter((p) => b.folds.some((f) => Math.abs(f.a * p.x + f.b * p.y - f.c) < 1e-9)).length;
  const k = b.folds.length;
  const layers = 2 ** k;
  const orbits = b.punches.map((p) => unfold([p], b.folds).length);
  const parts = b.punches.map((p, i) => {
    const onEdge = b.folds.some((f) => Math.abs(f.a * p.x + f.b * p.y - f.c) < 1e-9);
    return onEdge
      ? `the ${p.shape} punch on the folded edge makes ${orbits[i]} (its mirrored halves join into whole holes)`
      : `the ${p.shape} punch away from the edges makes ${orbits[i]}`;
  });
  const why =
    `Unfold in reverse order: each unfold mirrors every hole across that crease, so a punch through all ${layers} layers ` +
    `away from the creases makes ${layers} holes. ` +
    (onCrease
      ? `Here ${parts.join(" and ")}, ${count} in all.`
      : `${b.punches.length === 1 ? "One punch" : "Two punches"} × ${layers} = ${count} holes.`);

  const base = {
    id: genId(ID, format, difficulty, seed),
    generator: ID,
    seed,
    difficulty,
    format,
    topic: "folding-and-patterns" as const,
    figure: figureSvg(b),
  };
  if (format === "NAT") {
    return {
      ...base,
      stem: "A square sheet of paper is folded as shown and then punched through all layers in the last step. A punch made across a folded edge opens into a single hole. How many separate holes will the sheet have when it is fully unfolded?",
      options: null,
      answer: { kind: "NAT", min: count, max: count },
      explanation: `**${count}**. ${why}`,
    };
  }
  const correct = { holes: b.holes, note: "", key: holesKey(b.holes), correct: true };
  const seen = new Set([correct.key]);
  const pool = variants(rng, b, difficulty).map((v) => ({ ...v, key: holesKey(v.holes), correct: false }));
  const items = [correct, ...takeDistinct(pool, 3, seen)];
  if (items.length !== 4) throw new Error(`${ID}: not enough distractors for seed ${seed}`);
  const { placed, answer, labels } = placeOptions(rng, items, "MCQ");
  const wrong = placed
    .map((p, i) => (p.correct ? null : `${labels[i]}: ${p.note}`))
    .filter(Boolean)
    .join("; ");
  return {
    ...base,
    stem: "A square sheet of paper is folded as shown and then punched through all layers in the last step. A punch made across a folded edge opens into a single hole. Which option shows the sheet when it is fully unfolded?",
    options: placed.map((p, i) => ({ label: labels[i], svg: optionSvg(p.holes) })),
    answer,
    explanation: `**${labels[placed.findIndex((p) => p.correct)]}**, with ${count} holes. ${why} Others — ${wrong}.`,
  };
}

function solve(q: GeneratedQuestion): SimpleAnswer {
  const { folds, punches } = readData<{ folds: Fold[]; punches: Punch[] }>(q.figure, "fold");
  const punched = new Map(punches.map((p) => [`${p.x},${p.y}`, p.shape]));
  const holes: string[] = [];
  for (let x = 0.5; x < SIDE; x += 0.5)
    for (let y = 0.5; y < SIDE; y += 0.5) {
      let p: Pt = [x, y];
      for (const f of folds) if (side(f, p) < -1e-9) p = reflect(f, p);
      const shape = punched.get(`${clean(p[0])},${clean(p[1])}`);
      if (shape) holes.push(`${shape[0]}:${x},${y}`);
    }
  if (q.format === "NAT") return { kind: "NAT", min: holes.length, max: holes.length };
  const target = holes.sort().join(";");
  const flags = q.options!.map((o) => readData<string[]>(o.svg, "holes").sort().join(";") === target);
  return answerFromFlags(flags, "MCQ");
}

export const foldPunchUnfold: Generator = { id: ID, topic: "folding-and-patterns", formats: ["MCQ", "NAT"], generate, solve };
