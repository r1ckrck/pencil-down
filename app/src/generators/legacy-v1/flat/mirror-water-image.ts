// mirror-water-image: mirror (vertical mirror line) or water (horizontal surface) image of a
// grid figure (difficulty 1), a word (2) or a clock face (3).
//
// Construction: figure/word — apply the axis reflection matrix; clock — reflect the hand
// angles arithmetically (mirror: -a, water: 180 - a) and redraw.
// Solver: reads each option's drawing from data-fig, reflects it back across the axis in
// data-axis and keeps the option whose canonical form equals the original figure's.
import type { Difficulty, Format, GeneratedQuestion, Generator, SimpleAnswer } from "@/content/types";
import { createRng, type Rng } from "../rng";
import { answerFromFlags, genId, placeOptions, takeDistinct } from "./common";
import { makeGridFigure } from "./gridfig";
import { wordDrawing, WORDS } from "./letters";
import { bounds, canonDrawing, D4, hash, n, readData, renderDrawing, svgRoot, transformDrawing, type Drawing, type Pt } from "./svg";

const ID = "mirror-water-image";
type Axis = "fh" | "fv";
interface Cand {
  d: Drawing;
  key: string;
  correct: boolean;
  note: string;
}
const cand = (d: Drawing, correct: boolean, note: string): Cand => ({ d, key: canonDrawing(d), correct, note });

// ---------- clock ----------
const polar = (deg: number, len: number): Pt => {
  const a = (deg * Math.PI) / 180;
  return [Math.sin(a) * len, -Math.cos(a) * len];
};
function clockDrawing(hourDeg: number, minDeg: number): Drawing {
  const strokes: Pt[][] = [];
  for (let i = 0; i < 12; i++) strokes.push([polar(i * 30, i % 3 === 0 ? 0.74 : 0.84), polar(i * 30, 0.94)]);
  strokes.push([[0, 0], polar(minDeg, 0.8)]);
  // hour hand: a solid convex kite
  const hour = [polar(hourDeg + 90, 0.07), polar(hourDeg, 0.52), polar(hourDeg - 90, 0.07), polar(hourDeg + 180, 0.1)];
  return {
    strokes,
    fills: [{ pts: hour, fill: "solid" }],
    dots: [
      { c: [0, 0], r: 1.06, fill: "none" },
      { c: [0, 0], r: 0.06, fill: "solid" },
    ],
  };
}
const norm = (a: number) => ((a % 360) + 360) % 360;
const fmtTime = (h: number, m: number) => `${h}:${String(m).padStart(2, "0")}`;

function build(rng: Rng, difficulty: Difficulty, axis: Axis): { fig: Drawing; cands: Cand[]; kind: string; what: string } {
  const other: Axis = axis === "fh" ? "fv" : "fh";
  const otherName = axis === "fh" ? "the water image" : "the mirror image";
  if (difficulty === 1) {
    const fig = makeGridFigure(rng, { n: 4, cells: 5, tris: 1, dots: 1, symmetric: false });
    const t = (m: string) => transformDrawing(fig, D4[m]);
    const extra = rng.pick(["fd", "fa", "r90", "r270"]);
    return {
      fig,
      kind: "figure",
      what: "",
      cands: [
        cand(t(axis), true, ""),
        cand(t(other), false, otherName),
        cand(t("r180"), false, "a half turn"),
        cand(t(extra), false, extra.startsWith("r") ? "a quarter turn" : "a reflection across a diagonal"),
      ],
    };
  }
  if (difficulty === 2) {
    const word = rng.pick(WORDS.filter((w) => w.length <= 6));
    const fig = wordDrawing(word);
    const t = (m: string) => transformDrawing(fig, D4[m]);
    const pool =
      axis === "fh"
        ? [
            cand(wordDrawing(word, { flipEach: "h" }), false, "letters flipped but left in reading order"),
            cand(wordDrawing(word, { reverse: true }), false, "order reversed but letters not flipped"),
            cand(t("fv"), false, otherName),
            cand(t("r180"), false, "a half turn"),
          ]
        : [
            cand(wordDrawing(word, { flipEach: "v", reverse: true }), false, "a half turn"),
            cand(wordDrawing(word, { flipEach: "h" }), false, "letters flipped sideways instead of upside down"),
            cand(t("fh"), false, otherName),
            cand(wordDrawing(word, { reverse: true }), false, "order reversed but letters not flipped"),
          ];
    return { fig, kind: "word", what: word, cands: [cand(t(axis), true, ""), ...rng.shuffle(pool)] };
  }
  let h: number;
  let m: number;
  do {
    h = rng.int(1, 11);
    m = rng.int(1, 11) * 5;
    // keep the hands at least 40° apart so neither hides the other
  } while (h === 6 || m === 30 || Math.abs(norm(h * 30 + m / 2 - m * 6) - 180) > 140);
  const H = norm(h * 30 + m / 2);
  const M = m * 6;
  const fig = clockDrawing(H, M);
  const refl = (a: number, ax: Axis) => norm(ax === "fh" ? -a : 180 - a);
  const pool = rng.shuffle([
    cand(clockDrawing(refl(H, other), refl(M, other)), false, otherName),
    cand(clockDrawing(norm(H + 180), norm(M + 180)), false, "a half turn"),
    cand(clockDrawing(H, M), false, "the original clock"),
    cand(clockDrawing(norm(refl(H, axis) + 30), refl(M, axis)), false, "the hour hand one hour off"),
  ]);
  return {
    fig,
    kind: "clock",
    what: (() => {
      const t = 720 - (h * 60 + m);
      return `the clock shows ${fmtTime(h, m)}, so its mirror image reads ${fmtTime(Math.floor(t / 60) || 12, t % 60)}`;
    })(),
    cands: [cand(clockDrawing(refl(H, axis), refl(M, axis)), true, ""), ...pool],
  };
}

function scaleFor(kind: string, d: Drawing, maxW: number, maxH: number): number {
  const b = bounds(d);
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  return Math.min(maxW / w, maxH / h, kind === "word" ? 8 : 100);
}

// Figures are drawn centred on their bounding box, with the mirror line 18 units clear of it.
function figureSvg(fig: Drawing, axis: Axis, kind: string): string {
  const line = (a: Pt, b: Pt) => `<path class="mute" stroke-dasharray="6 7" d="M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}"/>`;
  const b = bounds(fig);
  const mx = (b.x0 + b.x1) / 2;
  const my = (b.y0 + b.y1) / 2;
  if (axis === "fh") {
    const s = scaleFor(kind, fig, 200, 150);
    const h = (b.y1 - b.y0) * s + 40;
    const w = (b.x1 - b.x0) * s;
    const cx = 130;
    const xm = cx + w / 2 + 20;
    return svgRoot(280, h, renderDrawing(fig, s, cx - mx * s, h / 2 - my * s) + line([xm, 8], [xm, h - 8]), { fig, axis });
  }
  const s = scaleFor(kind, fig, 240, 130);
  const fh = (b.y1 - b.y0) * s;
  const ym = 16 + fh + 18;
  return svgRoot(280, ym + 14, renderDrawing(fig, s, 140 - mx * s, 16 + fh / 2 - my * s) + line([20, ym], [260, ym]), {
    fig,
    axis,
  });
}

function optionSvg(d: Drawing, s: number): string {
  const b = bounds(d);
  return svgRoot(140, 140, renderDrawing(d, s, 70 - ((b.x0 + b.x1) / 2) * s, 70 - ((b.y0 + b.y1) / 2) * s), {
    fig: d,
    key: hash(canonDrawing(d)),
  });
}

function generate(seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion {
  if (format !== "MCQ") throw new Error(`${ID}: unsupported format ${format}`);
  const rng = createRng(seed);
  const axis: Axis = rng.bool() ? "fh" : "fv";
  const { fig, cands, kind, what } = build(rng, difficulty, axis);
  const seen = new Set<string>([cands[0].key]);
  const items = [cands[0], ...takeDistinct(cands.slice(1), 3, seen)];
  if (items.length !== 4) throw new Error(`${ID}: not enough distinct options for seed ${seed}`);
  const { placed, answer, labels } = placeOptions(rng, items, "MCQ");
  const optScale = Math.min(...placed.map((p) => scaleFor(kind, p.d, 124, 124)), kind === "word" ? 4.6 : 100);

  const noun = kind === "word" ? "the word" : kind === "clock" ? "the clock" : "the figure";
  const stem =
    axis === "fh"
      ? `A mirror is placed along the dashed line beside ${noun}. Which option shows its mirror image?`
      : `The dashed line below ${noun} is the surface of still water. Which option shows its reflection in the water?`;
  const correctLabel = labels[placed.findIndex((p) => p.correct)];
  const how =
    axis === "fh"
      ? kind === "word"
        ? `A vertical mirror reverses left and right: the letter order runs backwards **and** each letter is flipped.`
        : kind === "clock"
          ? `A vertical mirror swaps left and right, so each hand's angle from 12 is reversed: ${what}.`
          : `A vertical mirror swaps left and right only; top and bottom stay put.`
      : kind === "word"
        ? `Water flips top and bottom only: the letters stay in reading order but each is upside down.`
        : kind === "clock"
          ? `Water swaps top and bottom, so each hand is reflected across the 3–9 line.`
          : `Water flips top and bottom only; left and right stay put.`;
  const wrong = placed
    .map((p, i) => (p.correct ? null : `${labels[i]} is ${p.note}`))
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
    figure: figureSvg(fig, axis, kind),
    options: placed.map((p, i) => ({ label: labels[i], svg: optionSvg(p.d, optScale) })),
    answer,
    explanation: `**${correctLabel}**. ${how} ${wrong}.`,
  };
}

function solve(q: GeneratedQuestion): SimpleAnswer {
  const fig = readData<Drawing>(q.figure, "fig");
  const axis = readData<Axis>(q.figure, "axis");
  const target = canonDrawing(fig);
  const flags = q.options!.map((o) => canonDrawing(transformDrawing(readData<Drawing>(o.svg, "fig"), D4[axis])) === target);
  return answerFromFlags(flags, "MCQ");
}

export const mirrorWaterImage: Generator = { id: ID, topic: "folding-and-patterns", formats: ["MCQ"], generate, solve };
