// matrix-completion: a 3 × 3 grid of figures whose attributes (shape, count, rotation, fill)
// follow row/column rules; the bottom-right cell is missing.
//
// Construction: pick a rule per attribute and evaluate it at (row 2, col 2).
// Solver: reads the eight visible cells from data-grid and, per attribute, fits every rule
// family it knows (constant, by row, by column, two Latin diagonals, chequerboard, linear
// progression) to those eight cells; every family that fits must agree on the missing value.
// The option whose data-cell matches all four predicted values is the answer.
// The generator rejects grids where fitting rules disagree, so every puzzle has one reading.
import type { Difficulty, Format, GeneratedQuestion, Generator, SimpleAnswer } from "@/content/types";
import { createRng, type Rng } from "../rng";
import { answerFromFlags, genId, placeOptions, takeDistinct } from "./common";
import { hash, n, pathD, readData, svgRoot, type Pt } from "./svg";

const ID = "matrix-completion";

const SHAPES = ["circle", "square", "triangle", "diamond", "hexagon", "arrow"] as const;
const SYMMETRIC = [0, 1, 2, 3, 4]; // indices into SHAPES
const ARROW = 5;
const FILLS = ["none", "soft", "solid"] as const;
type Attr = "shape" | "count" | "angle" | "fill";
const ATTRS: Attr[] = ["shape", "count", "angle", "fill"];
type Cell = Record<Attr, number>;

type Rule =
  | { t: "const"; v: number }
  | { t: "byCol" | "byRow" | "latinPlus" | "latinMinus"; vals: number[] }
  | { t: "checker"; vals: number[] }
  | { t: "linear"; a: number; b: number; d: number; mod: number };

const evalRule = (rule: Rule, r: number, c: number): number => {
  switch (rule.t) {
    case "const":
      return rule.v;
    case "byCol":
      return rule.vals[c];
    case "byRow":
      return rule.vals[r];
    case "latinPlus":
      return rule.vals[(c + r) % 3];
    case "latinMinus":
      return rule.vals[(c - r + 3) % 3];
    case "checker":
      return rule.vals[(r + c) % 2];
    case "linear": {
      const v = rule.a + rule.b * c + rule.d * r;
      return rule.mod ? ((v % rule.mod) + rule.mod) % rule.mod : v;
    }
  }
};

function pickDistinct(rng: Rng, pool: number[], k: number) {
  return rng.shuffle(pool).slice(0, k);
}

function varyingRule(rng: Rng, attr: Attr, difficulty: Difficulty): Rule {
  if (attr === "shape") {
    const t = rng.pick(difficulty === 1 ? (["byCol", "byRow", "latinPlus"] as const) : (["byCol", "byRow", "latinPlus", "latinMinus"] as const));
    return { t, vals: pickDistinct(rng, SYMMETRIC, 3) };
  }
  if (attr === "fill") {
    const t = rng.pick(["byCol", "latinPlus", "latinMinus", "checker"] as const);
    return t === "checker" ? { t, vals: pickDistinct(rng, [0, 1, 2], 2) } : { t, vals: rng.shuffle([0, 1, 2]) };
  }
  if (attr === "count") {
    if (rng.bool(0.3)) return { t: rng.pick(["latinPlus", "latinMinus"] as const), vals: rng.shuffle(rng.pick([[1, 2, 3], [2, 3, 4]])) };
    const opts: [number, number, number][] = [];
    for (let a = 1; a <= 4; a++)
      for (const b of [-1, 0, 1])
        for (const d of [-1, 0, 1]) {
          if (b === 0) continue; // must change along a row
          if (difficulty === 1 && d !== 0) continue;
          const vals = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => a + b * c + d * r));
          if (Math.min(...vals) >= 1 && Math.max(...vals) <= 4) opts.push([a, b, d]);
        }
    const [a, b, d] = rng.pick(opts);
    return { t: "linear", a, b, d, mod: 0 };
  }
  // angle, in 45° steps
  const b = rng.pick(difficulty === 1 ? [2, 6] : [1, 2, 6, 7]);
  const d = difficulty === 1 ? 0 : rng.int(0, 7);
  return { t: "linear", a: rng.int(0, 7), b, d, mod: 8 };
}

// ---------- solver-side rule fitting ----------
function predict(grid: (Cell | null)[], attr: Attr): Set<number> {
  const known: [number, number, number][] = [];
  grid.forEach((cell, i) => {
    if (cell) known.push([Math.floor(i / 3), i % 3, cell[attr]]);
  });
  const out = new Set<number>();
  const fitClass = (cls: (r: number, c: number) => number) => {
    const m = new Map<number, number>();
    for (const [r, c, v] of known) {
      const k = cls(r, c);
      if (m.has(k) && m.get(k) !== v) return;
      m.set(k, v);
    }
    const p = m.get(cls(2, 2));
    if (p !== undefined) out.add(p);
  };
  fitClass(() => 0);
  fitClass((_r, c) => c);
  fitClass((r) => r);
  fitClass((r, c) => (r + c) % 3);
  fitClass((r, c) => (c - r + 3) % 3);
  fitClass((r, c) => (r + c) % 2);
  if (attr === "count" || attr === "angle") {
    const mod = attr === "angle" ? 8 : 0;
    const norm = (v: number) => (mod ? ((v % mod) + mod) % mod : v);
    const v = (r: number, c: number) => known.find((k) => k[0] === r && k[1] === c)![2];
    const a = v(0, 0);
    const b = norm(v(0, 1) - a);
    const d = norm(v(1, 0) - a);
    if (known.every(([r, c, x]) => norm(a + b * c + d * r) === x)) out.add(norm(a + 2 * b + 2 * d));
  }
  return out;
}

// ---------- rendering ----------
const UNIT: Record<string, Pt[]> = {
  square: [
    [-0.8, -0.8],
    [0.8, -0.8],
    [0.8, 0.8],
    [-0.8, 0.8],
  ],
  triangle: [
    [0, -0.95],
    [0.95, 0.75],
    [-0.95, 0.75],
  ],
  diamond: [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ],
  hexagon: [0, 1, 2, 3, 4, 5].map((i) => [Math.cos((i * Math.PI) / 3), Math.sin((i * Math.PI) / 3) * 1] as Pt),
  arrow: [
    [0, -1],
    [0.75, -0.15],
    [0.3, -0.15],
    [0.3, 1],
    [-0.3, 1],
    [-0.3, -0.15],
    [-0.75, -0.15],
  ],
};
const LAYOUT: Record<number, { pos: Pt[]; size: number }> = {
  1: { pos: [[0, 0]], size: 0.26 },
  2: { pos: [[-0.2, 0], [0.2, 0]], size: 0.15 },
  3: { pos: [[-0.2, 0.15], [0.2, 0.15], [0, -0.19]], size: 0.14 },
  4: { pos: [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]], size: 0.14 },
};

function cellBody(cell: Cell, cx: number, cy: number, S: number): string {
  const { pos, size } = LAYOUT[cell.count];
  const r = size * S;
  const fill = FILLS[cell.fill];
  const fa = fill === "solid" ? ` fill="currentColor"` : fill === "soft" ? ` class="soft"` : "";
  const shape = SHAPES[cell.shape];
  const rot = (cell.angle * Math.PI) / 4;
  return pos
    .map(([px, py]) => {
      const x = cx + px * S;
      const y = cy + py * S;
      if (shape === "circle") return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.88)}"${fa}/>`;
      const pts = UNIT[shape].map(([ux, uy]): Pt => {
        const rx = ux * Math.cos(rot) - uy * Math.sin(rot);
        const ry = ux * Math.sin(rot) + uy * Math.cos(rot);
        return [x + rx * r, y + ry * r];
      });
      return `<path${fa} d="${pathD(pts, true)}"/>`;
    })
    .join("");
}

const cellKey = (c: Cell) => ATTRS.map((a) => c[a]).join(",");

function describe(attr: Attr, rule: Rule): string {
  const name = { shape: "shape", count: "number of figures", angle: "direction of the arrow", fill: "shading" }[attr];
  switch (rule.t) {
    case "const":
      return "";
    case "byCol":
      return `the ${name} is the same all the way down each column`;
    case "byRow":
      return `the ${name} is the same all the way along each row`;
    case "latinPlus":
    case "latinMinus":
      return `each row and each column has one of each ${name}, shifting one place per row`;
    case "checker":
      return `the ${name} alternates like a chessboard`;
    case "linear":
      if (attr === "count") {
        const along = rule.b === 1 ? "goes up by one" : "goes down by one";
        const down = rule.d === 0 ? "" : rule.d === 1 ? ", and each row starts one higher" : ", and each row starts one lower";
        return `the ${name} ${along} along each row${down}`;
      }
      {
        const step = rule.b <= 4 ? `${rule.b * 45}° clockwise` : `${(8 - rule.b) * 45}° anticlockwise`;
        const down = rule.d === 0 ? "" : `, and each row starts ${rule.d <= 4 ? `${rule.d * 45}° clockwise` : `${(8 - rule.d) * 45}° anticlockwise`} from the row above`;
        return `the arrow turns ${step} from each cell to the next along a row${down}`;
      }
  }
}

function describeCell(c: Cell): string {
  const shape = SHAPES[c.shape];
  const fill = ["outlined", "lightly shaded", "solid"][c.fill];
  return `${c.count} ${fill} ${shape}${c.count > 1 ? "s" : ""}`;
}

function generate(seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion {
  if (format !== "MCQ") throw new Error(`${ID}: unsupported format ${format}`);
  // each level draws its own grids (levels 1 and 2 share rule families, so a shared stream would repeat grids)
  const rng = createRng(seed + difficulty * 1_000_003);
  for (;;) {
    const turning = rng.bool(0.35);
    const pool: Attr[] = [turning ? "angle" : "shape", "count", "fill"];
    // level 1: two attributes on simple rules; level 2: two attributes, any rule; level 3: all three
    const varying = difficulty === 3 ? pool : rng.shuffle(pool).slice(0, 2);
    const rules = {} as Record<Attr, Rule>;
    for (const a of ATTRS) {
      if (varying.includes(a)) rules[a] = varyingRule(rng, a, difficulty);
      else if (a === "shape") rules[a] = { t: "const", v: turning ? ARROW : rng.pick(SYMMETRIC) };
      else if (a === "angle") rules[a] = { t: "const", v: turning ? rng.int(0, 7) : 0 };
      else if (a === "count") rules[a] = { t: "const", v: rng.int(1, 3) };
      else rules[a] = { t: "const", v: rng.int(0, 2) };
    }
    // level 2 needs at least one rule beyond "same down a column / along a row / shift one place"
    const simple = (r: Rule) => r.t === "const" || r.t === "byCol" || r.t === "byRow" || r.t === "latinPlus" || (r.t === "linear" && r.d === 0);
    if (difficulty === 2 && varying.every((a) => simple(rules[a]))) continue;
    const cells: Cell[] = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) cells.push(Object.fromEntries(ATTRS.map((a) => [a, evalRule(rules[a], r, c)])) as Cell);
    const answer = cells[8];
    const grid: (Cell | null)[] = [...cells.slice(0, 8), null];
    // reject grids that admit more than one reading
    if (ATTRS.some((a) => predict(grid, a).size !== 1)) continue;
    // no copy-the-neighbour grids: the bottom row must not repeat a row above, nor the right column a column
    const same = (i: number, j: number) => cellKey(cells[i]) === cellKey(cells[j]);
    if ([0, 1, 2].every((c) => same(6 + c, c)) || [0, 1, 2].every((c) => same(6 + c, 3 + c))) continue;
    if ([0, 1, 2].every((r) => same(3 * r + 2, 3 * r)) || [0, 1, 2].every((r) => same(3 * r + 2, 3 * r + 1))) continue;

    // distractors: one attribute off, preferring values that appear in the grid
    const cand: { cell: Cell; key: string; correct: boolean }[] = [];
    const attrsByPriority = [...rng.shuffle(varying), ...rng.shuffle(ATTRS.filter((a) => !varying.includes(a)))];
    for (const a of attrsByPriority) {
      if (a === "angle" && !turning) continue;
      if (a === "shape" && turning) continue;
      const seenVals = [...new Set(cells.slice(0, 8).map((c) => c[a]))].filter((v) => v !== answer[a]);
      const extra =
        a === "count"
          ? [answer.count - 1, answer.count + 1].filter((v) => v >= 1 && v <= 4)
          : a === "fill"
            ? [0, 1, 2]
            : a === "angle"
              ? [(answer.angle + 2) % 8, (answer.angle + 4) % 8, (answer.angle + 1) % 8]
              : SYMMETRIC;
      for (const v of [...rng.shuffle(seenVals), ...rng.shuffle(extra)]) {
        if (v === answer[a]) continue;
        const cell = { ...answer, [a]: v };
        cand.push({ cell, key: cellKey(cell), correct: false });
      }
    }
    // interleave so the three distractors spread over attributes where possible
    const byAttr = attrsByPriority.map((a) => cand.filter((c) => c.cell[a] !== answer[a]));
    let ordered: typeof cand = [];
    for (let i = 0; ordered.length < cand.length && i < 12; i++) for (const list of byAttr) if (list[i]) ordered.push(list[i]);
    if (difficulty === 1) {
      // every option uses only values that appear in the grid: one or both varying attributes swapped for another
      // value seen in the grid, so all four options look like they belong
      const seen = (a: Attr) => [...new Set(cells.slice(0, 8).map((c) => c[a]))].filter((v) => v !== answer[a]);
      const [a, b] = varying;
      const singles = [...seen(a).map((v) => ({ ...answer, [a]: v })), ...seen(b).map((v) => ({ ...answer, [b]: v }))];
      const doubles = seen(a).flatMap((va) => seen(b).map((vb) => ({ ...answer, [a]: va, [b]: vb })));
      ordered = [...rng.shuffle(singles), ...rng.shuffle(doubles)].map((cell) => ({ cell, key: cellKey(cell), correct: false }));
    }
    const right = { cell: answer, key: cellKey(answer), correct: true };
    const items = [right, ...takeDistinct(ordered, 3, new Set([right.key]))];
    if (items.length !== 4) continue;
    const { placed, answer: key, labels } = placeOptions(rng, items, "MCQ");

    const C = 84;
    const X0 = 14;
    const Y0 = 10;
    let body = `<g class="mute"><path d="${pathD([[X0, Y0], [X0 + 3 * C, Y0], [X0 + 3 * C, Y0 + 3 * C], [X0, Y0 + 3 * C]], true)}`;
    for (let i = 1; i < 3; i++) body += `M${X0 + i * C} ${Y0}L${X0 + i * C} ${Y0 + 3 * C}M${X0} ${Y0 + i * C}L${X0 + 3 * C} ${Y0 + i * C}`;
    body += `"/></g>`;
    cells.slice(0, 8).forEach((cell, i) => {
      body += cellBody(cell, X0 + (i % 3) * C + C / 2, Y0 + Math.floor(i / 3) * C + C / 2, C);
    });
    // question mark, drawn as a path
    const qx = X0 + 2.5 * C;
    const qy = Y0 + 2.5 * C;
    body += `<g class="mute"><path stroke-width="3" d="M${qx - 9} ${qy - 10}Q${qx - 9} ${qy - 21} ${qx} ${qy - 21}Q${qx + 10} ${qy - 21} ${qx + 10} ${qy - 11}Q${qx + 10} ${qy - 4} ${qx} ${qy}L${qx} ${qy + 6}"/><circle cx="${qx}" cy="${qy + 15}" r="2" fill="currentColor"/></g>`;

    const rulesText = varying.map((a) => describe(a, rules[a])).filter(Boolean);
    const explanation =
      `**${labels[placed.findIndex((p) => p.correct)]}**. ` +
      rulesText.join("; ").replace(/^./, (ch) => ch.toUpperCase()) +
      `. So the missing cell holds ${describeCell(answer)}${turning ? `, the arrow pointing ${answer.angle * 45}° clockwise from straight up` : ""}.`;

    return {
      id: genId(ID, "MCQ", difficulty, seed),
      generator: ID,
      seed,
      difficulty,
      format: "MCQ",
      topic: "logic-and-counting",
      stem: "The figures in the grid follow a pattern along the rows and down the columns. Which option completes the grid?",
      figure: svgRoot(280, 3 * C + 2 * Y0, body, { grid }),
      options: placed.map((p, i) => ({
        label: labels[i],
        svg: svgRoot(140, 140, cellBody(p.cell, 70, 70, 96), { cell: p.cell, key: hash(p.key) }),
      })),
      answer: key,
      explanation,
    };
  }
}

function solve(q: GeneratedQuestion): SimpleAnswer {
  const grid = readData<(Cell | null)[]>(q.figure, "grid");
  const want = Object.fromEntries(ATTRS.map((a) => [a, [...predict(grid, a)]])) as Record<Attr, number[]>;
  const flags = q.options!.map((o) => {
    const c = readData<Cell>(o.svg, "cell");
    return ATTRS.every((a) => want[a].length === 1 && want[a][0] === c[a]);
  });
  return answerFromFlags(flags, "MCQ");
}

export const matrixCompletion: Generator = { id: ID, topic: "logic-and-counting", formats: ["MCQ"], generate, solve };
