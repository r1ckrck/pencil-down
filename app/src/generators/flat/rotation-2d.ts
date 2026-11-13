// rotation-2d: an asymmetric grid figure; options are rotations and mirror images.
//
// Construction: apply a chosen D4 element (rotation or reflection) to the figure.
// Solver: reads the figure and each option's drawing back from data-fig and searches the
// four rotations for one that maps the figure onto the option (canonical-form equality).
// It never sees which transform was used.
import type { Difficulty, Format, GeneratedQuestion, Generator, SimpleAnswer } from "@/content/types";
import { createRng } from "../rng";
import { answerFromFlags, genId, placeOptions } from "./common";
import { makeGridFigure, type GridSpec } from "./gridfig";
import { bounds, canonDrawing, D4, hash, readData, REFLECTIONS, renderDrawing, ROTATIONS, svgRoot, transformDrawing, type Drawing } from "./svg";

const ID = "rotation-2d";

const SPEC: Record<Difficulty, GridSpec> = {
  1: { n: 4, cells: 5, tris: 1, dots: 1, symmetric: false },
  2: { n: 4, cells: 7, tris: 2, dots: 1, symmetric: false },
  3: { n: 5, cells: 6, tris: 1, dots: 1, symmetric: true },
};

const TURN: Record<string, string> = { r90: "90° clockwise", r180: "180°", r270: "90° anticlockwise" };

// Drawings are centred on their own bounding box so no space is wasted around the figure.
export function figureSvg(d: Drawing, n: number): string {
  const cell = n === 4 ? 40 : 34;
  const b = bounds(d);
  const h = (b.y1 - b.y0) * cell + 24;
  return svgRoot(280, h, renderDrawing(d, cell, 140 - ((b.x0 + b.x1) / 2) * cell, h / 2 - ((b.y0 + b.y1) / 2) * cell), { fig: d });
}
export function optionSvg(d: Drawing, n: number): string {
  const cell = 112 / n;
  const b = bounds(d);
  return svgRoot(140, 140, renderDrawing(d, cell, 70 - ((b.x0 + b.x1) / 2) * cell, 70 - ((b.y0 + b.y1) / 2) * cell), {
    fig: d,
    key: hash(canonDrawing(d)),
  });
}

function generate(seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion {
  if (format !== "MCQ" && format !== "MSQ") throw new Error(`${ID}: unsupported format ${format}`);
  const rng = createRng(seed);
  const spec = SPEC[difficulty];
  const fig = makeGridFigure(rng, spec);
  const nCorrect = format === "MCQ" ? 1 : rng.int(1, 3);
  const rots = rng.shuffle([...ROTATIONS]).slice(0, nCorrect);
  const refl = rng.shuffle([...REFLECTIONS]).slice(0, 4 - nCorrect);
  const items = [...rots, ...refl].map((t) => {
    const d = transformDrawing(fig, D4[t]);
    return { t, d, key: canonDrawing(d), correct: t.startsWith("r") };
  });
  const { placed, answer, labels } = placeOptions(rng, items, format);

  const right = placed.map((p, i) => (p.correct ? `**${labels[i]}** (turned ${TURN[p.t]})` : null)).filter(Boolean);
  const subtle =
    difficulty === 3
      ? " The figure is almost symmetric, so track the single dot: a mirror image puts it on the wrong side."
      : " Track the dot and the solid triangle: in a mirror image they run round the figure in the opposite order.";
  const explanation =
    (format === "MCQ" ? `${right[0]} is a rotation.` : `Rotations: ${right.join(", ")}.`) +
    ` Every other option is a mirror image, which no turn in the plane can produce.` +
    subtle;

  return {
    id: genId(ID, format, difficulty, seed),
    generator: ID,
    seed,
    difficulty,
    format,
    topic: "3d-visualisation",
    stem:
      format === "MCQ"
        ? "Shown below is a flat figure. Which option shows the same figure rotated in its own plane, without flipping it over?"
        : "Shown below is a flat figure. Which of the options show the same figure rotated in its own plane, without flipping it over?",
    figure: figureSvg(fig, spec.n),
    options: placed.map((p, i) => ({ label: labels[i], svg: optionSvg(p.d, spec.n) })),
    answer,
    explanation,
  };
}

function solve(q: GeneratedQuestion): SimpleAnswer {
  const fig = readData<Drawing>(q.figure, "fig");
  const turned = new Set(["r0", ...ROTATIONS].map((r) => canonDrawing(transformDrawing(fig, D4[r]))));
  const flags = q.options!.map((o) => turned.has(canonDrawing(readData<Drawing>(o.svg, "fig"))));
  return answerFromFlags(flags, q.format as "MCQ" | "MSQ");
}

export const rotation2d: Generator = { id: ID, topic: "3d-visualisation", formats: ["MCQ", "MSQ"], generate, solve };
