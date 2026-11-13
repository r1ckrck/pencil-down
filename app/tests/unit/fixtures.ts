// Small synthetic content + a fake clock for engine tests. No dependency on real content.
import { buildContent, type Content } from "@/content/load";
import type {
  Answer,
  Card,
  Difficulty,
  Format,
  GeneratedQuestion,
  Generator,
  PartAPaper,
  PartAQuestion,
  PartBPaper,
  PartBPrompt,
  SimpleAnswer,
  Topic,
} from "@/content/types";
import { SLOTS, TOPICS } from "@/content/types";
import { openDb } from "@/db/db";
import { CURRENT_SCHEME } from "@/engine/scoring";
import type { Ctx } from "@/engine/session";
import { createRng } from "@/generators/rng";

export const FORMATS: Format[] = ["NAT", "MSQ", "MCQ"];
export const T0 = Date.UTC(2026, 10, 13, 9, 0, 0); // a fixed start instant

export const KEY: Record<Format, SimpleAnswer> = {
  MCQ: { kind: "MCQ", option: "B" },
  MSQ: { kind: "MSQ", options: ["A", "C"] },
  NAT: { kind: "NAT", min: 5, max: 5 },
};
export const RIGHT = { MCQ: { kind: "MCQ", option: "B" }, MSQ: { kind: "MSQ", options: ["A", "C"] }, NAT: { kind: "NAT", value: 5 } };
export const WRONG = { MCQ: { kind: "MCQ", option: "D" }, MSQ: { kind: "MSQ", options: ["B"] }, NAT: { kind: "NAT", value: 9 } };

export function question(id: string, topic: Topic, format: Format, extra: Partial<PartAQuestion> = {}): PartAQuestion {
  return {
    id,
    exam: "CEED",
    year: 2024,
    paperId: "pool",
    qno: 1,
    format,
    image: `images/${id}.png`,
    imageWidth: 800,
    imageHeight: 600,
    optionCount: 4,
    answer: KEY[format] as Answer,
    answerStatus: "official",
    topic,
    difficulty: 2,
    animated: false,
    explanation: null,
    ...extra,
  };
}

export function fakeGenerator(id: string, topic: Topic, formats: Format[]): Generator {
  return {
    id,
    topic,
    formats,
    generate(seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion {
      return {
        id: `gen:${id}:${format}:${difficulty}:${seed}`,
        generator: id,
        seed,
        difficulty,
        format,
        topic,
        stem: `Generated ${id} ${seed}`,
        figure: `<svg viewBox="0 0 10 10"><text>${seed}</text></svg>`,
        options: format === "NAT" ? null : (["A", "B", "C", "D"] as const).map((label) => ({ label, svg: `<svg>${label}</svg>` })),
        answer: KEY[format],
        explanation: "by construction",
      };
    },
    solve: (q) => q.answer,
  };
}

export const GENS: Generator[] = [
  fakeGenerator("cube-net", "3d-visualisation", ["MCQ", "MSQ"]),
  fakeGenerator("visible-faces", "3d-visualisation", ["NAT", "MCQ"]),
  fakeGenerator("fold-punch", "folding-and-patterns", ["MCQ", "NAT"]),
  fakeGenerator("matrix", "logic-and-counting", ["MCQ"]),
];

export const WEIGHTS: Record<Topic, number> = {
  "3d-visualisation": 0.1591,
  "folding-and-patterns": 0.2197,
  mechanisms: 0.0833,
  "everyday-science": 0.0606,
  observation: 0.1742,
  "logic-and-counting": 0.1288,
  "design-knowledge": 0.1591,
  language: 0.0152,
};

export function prompt(id: string, slot: PartBPrompt["slot"], source: "real" | "authored"): PartBPrompt {
  return {
    id,
    source,
    origin: source === "real" ? { exam: "CEED", year: 2024, qno: 1, originalSection: "Q1", adapted: false } : null,
    slot,
    title: `Prompt ${id}`,
    text: `Draw ${id}.`,
    rules: ["Pencil only"],
    criteria: [
      { name: "a", marks: 5 },
      { name: "b", marks: 5 },
      { name: "c", marks: 5 },
      { name: "d", marks: 5 },
    ],
    images: [],
    tags: {},
  };
}

// perCell real questions for every topic × format.
export function fixtureContent(
  opts: { perCell?: number; perFormat?: Record<Format, number>; extraQuestions?: PartAQuestion[]; papers?: PartAPaper[] } = {},
): Content {
  const perCell = opts.perCell ?? 40;
  const questions: PartAQuestion[] = [];
  for (const t of TOPICS)
    for (const f of FORMATS)
      for (let i = 0; i < (opts.perFormat?.[f] ?? perCell); i++) questions.push(question(`q-${t}-${f}-${i}`, t, f));
  questions.push(...(opts.extraQuestions ?? []));

  const prompts: PartBPrompt[] = SLOTS.flatMap((s) => [
    ...[0, 1].map((i) => prompt(`real-${s}-${i}`, s, "real")),
    ...[0, 1, 2].map((i) => prompt(`auth-${s}-${i}`, s, "authored")),
  ]);
  const bPapers: PartBPaper[] = [
    { id: "b-2024", year: 2024, label: "CEED 2024 Part B", durationMin: 120, promptIds: SLOTS.map((s) => `real-${s}-0`) },
  ];
  const cards: Card[] = [
    { id: "card-a", category: "gestalt", priority: "P1", front: { text: "Closure", image: null }, back: "x", credit: null },
    { id: "card-b", category: "gestalt", priority: "P3", front: { text: "Proximity", image: null }, back: "y", credit: null },
    {
      id: "card-c",
      category: "design-icon",
      priority: "P2",
      front: { text: "Corkscrew", image: null },
      back: "z",
      credit: null,
      revealsPromptIds: ["real-form-0"],
    },
  ];
  return buildContent({
    questions,
    papers: opts.papers ?? [],
    prompts,
    bPapers,
    cards,
    topicWeights: { weights: WEIGHTS },
  });
}

export interface TestCtx extends Ctx {
  clock: { t: number };
  advance(ms: number): void;
}

export function makeCtx(content: Content = fixtureContent(), generators: Generator[] = GENS, seed = 42): TestCtx {
  const rng = createRng(seed);
  const clock = { t: T0 };
  return {
    db: openDb(":memory:"),
    content,
    generators,
    now: () => clock.t,
    rand: () => rng.next(),
    clock,
    advance(ms: number) {
      clock.t += ms;
    },
  };
}

export const OLD_SCHEME = {
  NAT: { correct: 3, wrong: 0 },
  MCQ: { correct: 2, wrong: -0.5 },
  MSQ: { correct: 3, wrong: -0.2, partial: false },
};
export { CURRENT_SCHEME };
