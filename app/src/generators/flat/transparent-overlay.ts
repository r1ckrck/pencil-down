// transparent-overlay: two or three transparent sheets printed with black triangles on a grid;
// some are turned or flipped, then all are stacked. The visible pattern is the union.
//
// Each grid cell is split by its diagonals into four wedges (N, E, S, W); a sheet is a set of
// wedges. Construction pushes each sheet's wedges forward through its transform and unions them.
// Solver pulls back instead: for every wedge position of the stacked grid it asks each sheet
// (from data-ov) whether the inverse transform lands on a printed wedge, then compares the
// result with each option's data-wedges.
import type { Difficulty, Format, GeneratedQuestion, Generator, SimpleAnswer } from "@/content/types";
import { createRng, type Rng } from "../rng";
import { answerFromFlags, genId, placeOptions, takeDistinct } from "./common";
import { apply, D4, hash, invert, n, pathD, readData, svgRoot, type Mat, type Pt } from "./svg";

const ID = "transparent-overlay";
type T = "r0" | "r90" | "r180" | "r270" | "fh" | "fv";
interface Sheet {
  marks: string[]; // wedge ids "r,c,s"
  t: T;
}
const DIRS: Pt[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
const TURN: Record<T, string> = {
  r0: "",
  r90: "rotated 90° clockwise",
  r180: "rotated 180°",
  r270: "rotated 90° anticlockwise",
  fh: "flipped over sideways (face down, its left and right edges swap)",
  fv: "flipped over top to bottom (face down, its top and bottom edges swap)",
};
const NAMES = ["P", "Q", "R"];

function moveWedge(id: string, m: Mat, g: number): string {
  const [r, c, s] = id.split(",").map(Number);
  const h = g / 2;
  const p: Pt = [c - h + 0.5 + DIRS[s][0] * 0.3, r - h + 0.5 + DIRS[s][1] * 0.3];
  const [x, y] = apply(m, p);
  const nc = Math.floor(x + h);
  const nr = Math.floor(y + h);
  const dx = x - (nc - h + 0.5);
  const dy = y - (nr - h + 0.5);
  const ns = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
  return `${nr},${nc},${ns}`;
}
const placeSheet = (sh: Sheet, g: number, t: T = sh.t) => sh.marks.map((w) => moveWedge(w, D4[t], g));
const keyOf = (ws: Iterable<string>) => [...new Set(ws)].sort().join(";");
const union = (sheets: Sheet[], g: number, ts?: T[]) => new Set(sheets.flatMap((s, i) => placeSheet(s, g, ts ? ts[i] : s.t)));

function makeSheet(rng: Rng, g: number, motifs: number): string[] {
  const out = new Set<string>();
  const cells = rng.shuffle([...Array(g * g).keys()]).slice(0, motifs);
  for (const cell of cells) {
    const r = Math.floor(cell / g);
    const c = cell % g;
    const s = rng.int(0, 3);
    const kind = rng.pick(["one", "half", "half", "bow", "full"] as const);
    const sides = kind === "one" ? [s] : kind === "half" ? [s, (s + 1) % 4] : kind === "bow" ? [s, (s + 2) % 4] : [0, 1, 2, 3];
    for (const x of sides) out.add(`${r},${c},${x}`);
  }
  return [...out];
}

function wedgePts(id: string, size: number, ox: number, oy: number, g: number): Pt[] {
  const [r, c, s] = id.split(",").map(Number);
  const u = size / g;
  const corner = (q: number): Pt => [ox + (c + (q === 1 || q === 2 ? 1 : 0)) * u, oy + (r + (q >= 2 ? 1 : 0)) * u];
  const center: Pt = [ox + (c + 0.5) * u, oy + (r + 0.5) * u];
  // side s spans corners s and s+1 (N: TL-TR, E: TR-BR, S: BR-BL, W: BL-TL)
  return [center, corner(s), corner((s + 1) % 4)];
}

function sheetBody(marks: Iterable<string>, g: number, size: number, ox: number, oy: number): string {
  const sorted = [...new Set(marks)].sort();
  let grid = "";
  for (let i = 1; i < g; i++) {
    const v = ox + (i * size) / g;
    const w = oy + (i * size) / g;
    grid += `M${n(v)} ${n(oy)}L${n(v)} ${n(oy + size)}M${n(ox)} ${n(w)}L${n(ox + size)} ${n(w)}`;
  }
  const square: Pt[] = [
    [ox, oy],
    [ox + size, oy],
    [ox + size, oy + size],
    [ox, oy + size],
  ];
  return (
    `<path class="mute" stroke-width="1" stroke-dasharray="2 4" d="${grid}"/>` +
    (sorted.length
      ? `<path fill="currentColor" stroke="currentColor" stroke-width="1" d="${sorted.map((w) => pathD(wedgePts(w, size, ox, oy, g), true)).join("")}"/>`
      : "") +
    `<path d="${pathD(square, true)}"/>`
  );
}

function generate(seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion {
  if (format !== "MCQ") throw new Error(`${ID}: unsupported format ${format}`);
  const rng = createRng(seed);
  const g = difficulty === 1 ? 3 : 4;
  const nSheets = difficulty === 3 ? 3 : 2;
  for (;;) {
    const sheets: Sheet[] = [];
    for (let i = 0; i < nSheets; i++) {
      let t: T = "r0";
      if (i > 0 && difficulty > 1) t = rng.pick(i === 1 ? (["r90", "r180", "r270", "fh", "fv"] as T[]) : (["r90", "r270", "fh", "fv"] as T[]));
      sheets.push({ marks: makeSheet(rng, g, difficulty === 1 ? 3 : difficulty === 2 ? 4 : 3), t });
    }
    const placed = sheets.map((s) => new Set(placeSheet(s, g)));
    const result = union(sheets, g);
    // each transform must matter, and every sheet must add something the others do not
    if (sheets.some((s) => s.t !== "r0" && keyOf(placeSheet(s, g)) === keyOf(s.marks))) continue;
    if (placed.some((p, i) => [...p].every((w) => placed.some((q, j) => j !== i && q.has(w))))) continue;
    if (result.size > g * g * 4 * 0.6) continue;

    const ts = sheets.map((s) => s.t);
    const pool: { ws: Set<string>; note: string }[] = [];
    const alt = (i: number, t: T, note: string) => {
      const x = [...ts];
      x[i] = t;
      pool.push({ ws: union(sheets, g, x), note });
    };
    sheets.forEach((s, i) => {
      if (i === 0) return;
      const nm = NAMES[i];
      if (s.t === "r0") {
        alt(i, "fh", `${nm} flipped`);
        alt(i, "r180", `${nm} turned`);
        alt(i, "r90", `${nm} turned`);
      } else {
        alt(i, "r0", `${nm} left as it is`);
        if (s.t === "r90") alt(i, "r270", `${nm} turned the wrong way`);
        if (s.t === "r270") alt(i, "r90", `${nm} turned the wrong way`);
        if (s.t === "r180") alt(i, rng.pick(["fh", "fv"] as T[]), `${nm} flipped instead of turned`);
        if (s.t === "fh") alt(i, "fv", `${nm} flipped the wrong way`);
        if (s.t === "fv") alt(i, "fh", `${nm} flipped the wrong way`);
        if (s.t.startsWith("f")) alt(i, rng.pick(["r90", "r270"] as T[]), `${nm} turned instead of flipped`);
      }
    });
    // one wedge missing / one extra
    const own = [...result].filter((w) => placed.filter((p) => p.has(w)).length === 1);
    const drop = rng.pick(own);
    pool.push({ ws: new Set([...result].filter((w) => w !== drop)), note: "one triangle missing" });
    const free = [];
    for (let r = 0; r < g; r++) for (let c = 0; c < g; c++) for (let s = 0; s < 4; s++) if (!result.has(`${r},${c},${s}`)) free.push(`${r},${c},${s}`);
    pool.push({ ws: new Set([...result, rng.pick(free)]), note: "one triangle too many" });

    const transformErrors = rng.shuffle(pool.slice(0, -2));
    const ordered = [...transformErrors, ...rng.shuffle(pool.slice(-2))].map((p) => ({ ...p, key: keyOf(p.ws), correct: false }));
    const right = { ws: result, note: "", key: keyOf(result), correct: true };
    const items = [right, ...takeDistinct(ordered, 3, new Set([right.key]))];
    if (items.length !== 4) continue;
    const { placed: opts, answer, labels } = placeOptions(rng, items, "MCQ");

    // figure: sheets side by side, labelled
    const size = nSheets === 2 ? 108 : 78;
    const gap = nSheets === 2 ? 28 : 17;
    const x0 = (280 - nSheets * size - (nSheets - 1) * gap) / 2;
    let body = "";
    sheets.forEach((s, i) => {
      const ox = x0 + i * (size + gap);
      body += sheetBody(s.marks, g, size, ox, 8);
      body += `<text x="${n(ox + size / 2)}" y="${n(size + 30)}" text-anchor="middle" fill="currentColor" stroke="none" font-size="15">${NAMES[i]}</text>`;
    });

    const moved = sheets.map((s, i) => (s.t === "r0" ? null : `${NAMES[i]} is ${TURN[s.t]}`)).filter(Boolean);
    const all = nSheets === 2 ? "P and Q" : "P, Q and R";
    const intro = `${all} are transparent sheets with black triangles printed on them.`;
    const stem = !moved.length
      ? `${intro} If Q is placed exactly on top of P, which option shows the result?`
      : nSheets === 2
        ? `${intro} ${moved[0]} and then placed exactly on top of P. Which option shows the result?`
        : `${intro} ${moved.join(" and ")}; then both are placed exactly on top of P. Which option shows the result?`;

    const wrong = opts
      .map((p, i) => (p.correct ? null : `${labels[i]} has ${p.note}`))
      .filter(Boolean)
      .join("; ");
    return {
      id: genId(ID, "MCQ", difficulty, seed),
      generator: ID,
      seed,
      difficulty,
      format: "MCQ",
      topic: "folding-and-patterns",
      stem,
      figure: svgRoot(280, size + 40, body, { ov: { g, sheets } }),
      options: opts.map((p, i) => ({
        label: labels[i],
        svg: svgRoot(140, 140, sheetBody(p.ws, g, 120, 10, 10), { wedges: [...p.ws].sort(), key: hash(p.key) }),
      })),
      answer,
      explanation:
        `**${labels[opts.findIndex((p) => p.correct)]}**. ` +
        (moved.length ? `Move each sheet first (${moved.join("; ")}), then stack: ` : `Stack the sheets: `) +
        `a triangle is black if it is black on any sheet. ${wrong}.`,
    };
  }
}

function solve(q: GeneratedQuestion): SimpleAnswer {
  const { g, sheets } = readData<{ g: number; sheets: Sheet[] }>(q.figure, "ov");
  const printed = sheets.map((s) => new Set(s.marks));
  const seen: string[] = [];
  for (let r = 0; r < g; r++)
    for (let c = 0; c < g; c++)
      for (let s = 0; s < 4; s++) {
        const w = `${r},${c},${s}`;
        if (sheets.some((sh, i) => printed[i].has(moveWedge(w, invert(D4[sh.t]), g)))) seen.push(w);
      }
  const target = seen.sort().join(";");
  const flags = q.options!.map((o) => readData<string[]>(o.svg, "wedges").sort().join(";") === target);
  return answerFromFlags(flags, "MCQ");
}

export const transparentOverlay: Generator = { id: ID, topic: "folding-and-patterns", formats: ["MCQ"], generate, solve };
