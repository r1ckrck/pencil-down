// Content contract. Every file under /content and every generator conforms to these types.
// Loaders merge every file matching content/part-a/questions*.json, papers*.json and content/part-b/prompts*.json, papers*.json.
// Validated by app/scripts/validate-content.ts.

export type Option = "A" | "B" | "C" | "D";
export const OPTIONS: Option[] = ["A", "B", "C", "D"];

export type Format = "NAT" | "MSQ" | "MCQ";

export type Topic =
  | "3d-visualisation"
  | "folding-and-patterns"
  | "mechanisms"
  | "everyday-science"
  | "observation"
  | "logic-and-counting"
  | "design-knowledge"
  | "language";

export const TOPICS: Topic[] = [
  "3d-visualisation",
  "folding-and-patterns",
  "mechanisms",
  "everyday-science",
  "observation",
  "logic-and-counting",
  "design-knowledge",
  "language",
];

export type SimpleAnswer =
  | { kind: "MCQ"; option: Option }
  | { kind: "MSQ"; options: Option[] } // sorted, 1–4 entries
  | { kind: "NAT"; min: number; max: number }; // inclusive range; min === max for exact keys

// Official keys sometimes accept alternatives or drop a question.
// ANY: the response is scored against each alternative and the best result counts (e.g. NAT "7 OR 9", MSQ "B OR B,C").
// DROPPED: every candidate, including blank, receives `marks`. Excluded from mocks, drills and revisit; kept whole in past papers.
// Generators only ever produce SimpleAnswer.
export type Answer =
  | SimpleAnswer
  | { kind: "ANY"; of: SimpleAnswer[] }
  | { kind: "DROPPED"; marks: number };

export type AnswerStatus = "official" | "solved" | "constructed";

export type Difficulty = 1 | 2 | 3;

// ---------- Part A: real questions (content/part-a/questions.json) ----------

export interface PartAQuestion {
  id: string; // "ceed-2026-q14", "uceed-2025-q03"
  exam: "CEED" | "UCEED";
  year: number;
  paperId: string; // matches PartAPaper.id
  qno: number; // number as printed in the paper
  format: Format;
  image: string; // path relative to content/part-a/, e.g. "images/ceed-2026-q14.png"; includes stem and option visuals
  imageWidth: number; // px
  imageHeight: number; // px
  optionCount: 4; // real questions always show A–D (ignored for NAT)
  answer: Answer;
  answerStatus: Exclude<AnswerStatus, "constructed">;
  topic: Topic;
  difficulty: Difficulty;
  animated: boolean; // original used an animated GIF: excluded from mocks, drills and revisit; shown as a still with a note in past papers
  explanation: string | null; // markdown; must reach the stored answer
}

// ---------- Part A: papers (content/part-a/papers.json) ----------

export interface MarkScheme {
  NAT: { correct: number; wrong: number };
  MCQ: { correct: number; wrong: number }; // wrong is negative, e.g. -0.5
  MSQ: { correct: number; wrong: number; partial: boolean }; // partial = current CEED partial-credit table
}

export interface PartAPaper {
  id: string; // "ceed-2026", "ceed-2016-s1", "uceed-2025"
  exam: "CEED" | "UCEED";
  year: number;
  label: string; // "CEED 2026"
  durationMin: number; // Part A time as printed
  scheme: MarkScheme;
  totalMarks: number; // as printed
  questionIds: string[]; // printed order
  pastPaperEligible: boolean; // true when every question was extracted and keyed/solved, none animated-only gaps
  cutoff: number | null; // general-category Part A cutoff for that year, when known
}

// ---------- Part A: generated questions (app/src/generators) ----------

export interface GeneratedQuestion {
  id: string; // "gen:<generator>:<format>:<difficulty>:<seed>"
  generator: string;
  seed: number;
  difficulty: Difficulty;
  format: Format;
  topic: Topic;
  stem: string; // one or two sentences, plain text
  figure: string; // SVG markup; uses currentColor and CSS classes only (no hex), viewBox set, no width/height
  options: { label: Option; svg: string }[] | null; // null for NAT
  answer: SimpleAnswer;
  explanation: string; // markdown
}

export interface Generator {
  id: string;
  topic: Topic;
  formats: Format[];
  generate(seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion;
  // Independent solver: derives the answer by a different method than generate() used.
  solve(q: GeneratedQuestion): SimpleAnswer;
  // Retired generators still regenerate questions already served (history, review) but are never selected again.
  retired?: boolean;
}

// ---------- Part B (content/part-b/prompts.json, papers.json) ----------

export type Slot = "sketching" | "creativity" | "visual" | "form" | "problem-id";
export const SLOTS: Slot[] = ["sketching", "creativity", "visual", "form", "problem-id"];

export interface Criterion {
  name: string; // "Proportion and composition"
  marks: number; // usually 5; the four sum to 20
}

export interface PartBPrompt {
  id: string; // "ceed-2026-b-q1", "pb-sketching-0042"
  source: "real" | "authored";
  origin:
    | { exam: "CEED"; year: number; qno: number; originalSection: string; adapted: boolean }
    | null; // null for authored
  slot: Slot;
  title: string; // short label for lists, e.g. "Kitchen from a chair's view"
  text: string; // markdown, CEED register, second person
  rules: string[]; // hard constraints: "Black/HB pencil only", "No text"
  criteria: Criterion[]; // as printed for real; 4 × 5 for authored unless the split is part of the design
  images: { path: string; alt: string }[]; // relative to content/part-b/
  tags: {
    user?: string;
    setting?: string;
    object?: string;
    pov?: string;
    twist?: string;
    hook?: string;
  };
}

export interface PartBPaper {
  id: string; // "ceed-2026-b"
  year: number;
  label: string; // "CEED 2026 Part B"
  durationMin: number; // 120
  promptIds: string[]; // five, printed order
}

// ---------- Cards (content/cards/cards.json) ----------

export type CardCategory =
  | "art-movement"
  | "indian-painting"
  | "indian-dance"
  | "indian-monument"
  | "craft-process"
  | "anthropometry"
  | "gestalt"
  | "ui-component"
  | "design-icon"
  | "indian-design-history"
  | "colour-and-type";

export interface Card {
  id: string; // "card-de-stijl"
  category: CardCategory;
  priority: "P1" | "P2" | "P3"; // P1 asked in a paper, P2 same family as P1, P3 canon only
  front: { text: string; image: string | null }; // image relative to content/cards/
  back: string; // markdown, 1–4 short lines
  credit: { author: string; licence: string; sourceUrl: string } | null; // required for sourced raster images; null for in-house SVG diagrams
  revealsPromptIds?: string[]; // Part B prompts whose unnamed stimulus this card names
}

// ---------- Meta (content/meta) ----------

export interface TopicWeights {
  // share of the 44 Part A slots per topic, from the 2024–2026 papers; sums to 1
  weights: Record<Topic, number>;
}

export interface Playbook {
  slot: Slot;
  name: string;
  decision: string; // the one decision to make, e.g. "Camera height and framing"
  script: { from: number; to: number; phase: string; doThis: string }[]; // minutes
  failureModes: string[];
  criteria: string[];
}
