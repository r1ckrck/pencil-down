import type { AnswerInput, Format, Key, Kind, Mode, Option, QuestionPayload, SimpleAnswer, Switches, Topic } from "./types";

const OPTION_LETTERS: Option[] = ["A", "B", "C", "D"];

/** Printed labels in A–D order: the paper's own (1–4, a–d…) when it does not print A–D. */
export function printedLabels(q: QuestionPayload | null): readonly string[] {
  return (q?.source === "real" && q.optionLabels) || OPTION_LETTERS;
}

/** The label printed on the paper for an option, so it matches the scan. */
export function optionLabel(q: QuestionPayload | null, o: Option): string {
  return printedLabels(q)[OPTION_LETTERS.indexOf(o)] ?? o;
}

/** Printed label with the internal letter when they differ: "2 (B)". */
export function optionText(q: QuestionPayload | null, o: Option): string {
  const p = optionLabel(q, o);
  return p === o ? o : `${p} (${o})`;
}

/** Keyboard pick: the printed label first, then A–D (case-insensitive); null when the key names no option. */
export function optionForKey(q: QuestionPayload | null, key: string): Option | null {
  const k = key.toLowerCase();
  const printed = printedLabels(q).findIndex((l) => l.toLowerCase() === k);
  if (printed >= 0) return OPTION_LETTERS[printed];
  return OPTION_LETTERS.find((l) => l.toLowerCase() === k) ?? null;
}

/** "A–D", "1–4": the key range shown in hints. */
export function optionRange(q: QuestionPayload | null): string {
  const l = printedLabels(q);
  return `${l[0]}–${l[3]}`;
}

export const TOPIC_LABEL: Record<Topic, string> = {
  "3d-visualisation": "3D visualisation",
  "folding-and-patterns": "Folding and patterns",
  mechanisms: "Mechanisms",
  "everyday-science": "Everyday science",
  observation: "Observation",
  "logic-and-counting": "Logic and counting",
  "design-knowledge": "Design knowledge",
  language: "Language",
};

export const FORMAT_LABEL: Record<Format, string> = {
  MCQ: "Single choice",
  MSQ: "Multiple choice",
  NAT: "Numerical",
};

export const KIND_LABEL: Record<Kind, string> = {
  mock: "Mock",
  drill: "Drill",
  revisit: "Revisit",
  "past-paper": "Past paper",
  "b-drill": "Part B drill",
  "b-mock": "Part B mock",
  "b-past-paper": "Part B past paper",
  full: "Full exam",
};

export const MODE_LABEL: Record<Mode, string> = { easy: "Easy", hard: "Hard", custom: "Custom" };

/** One line on what a mode does to the Part A clock. */
export function modeLine(mode: Mode, custom: Switches): string {
  if (mode === "easy") return "Question timer visible. At zero the bar marks the overrun; you move on when you choose.";
  if (mode === "hard") return "Question timer hidden. At zero the question is saved as it stands and sent to the revisit queue.";
  const timer = custom.questionTimer ? "visible" : "hidden";
  const skip = custom.forcedSkip ? "forced skip at zero" : "no forced skip";
  return `From Settings: question timer ${timer}, ${skip}.`;
}

const PART_A_KINDS: Kind[] = ["mock", "drill", "revisit", "past-paper"];

/** Where a live session runs. Part A kinds are served here; Part B and full exam routes belong to their screens. */
export function sessionHref(kind: Kind | string, id: number): string {
  if ((PART_A_KINDS as string[]).includes(kind)) return `/part-a/${id}`;
  if (kind === "full") return `/exam/${id}`;
  return `/part-b/${id}`;
}

/** Marks with at most two decimals, no trailing zeros; signed when asked. */
export function marks(n: number, signed = false): string {
  const r = Math.round(n * 100) / 100;
  const s = String(Math.abs(r));
  if (!signed) return r < 0 ? `−${s}` : s;
  return r > 0 ? `+${s}` : r < 0 ? `−${s}` : "0";
}

export function seconds(ms: number): string {
  return `${Math.round(ms / 1000)}`;
}

// Options read as printed on the question, with the letter when they differ: "2 (B)".
export function answerText(a: AnswerInput | null, q: QuestionPayload | null): string {
  if (!a) return "—";
  if (a.kind === "MCQ") return optionText(q, a.option);
  if (a.kind === "MSQ") return a.options.map((o) => optionText(q, o)).join(", ");
  return String(a.value);
}

function simpleKey(k: SimpleAnswer, q: QuestionPayload | null): string {
  if (k.kind === "MCQ") return optionText(q, k.option);
  if (k.kind === "MSQ") return k.options.map((o) => optionText(q, o)).join(", ");
  return k.min === k.max ? String(k.min) : `${k.min} to ${k.max}`;
}

export function keyText(k: Key | null, q: QuestionPayload | null): string {
  if (!k) return "—";
  if (k.kind === "DROPPED") return "dropped by the paper";
  if (k.kind === "ANY") return k.of.map((x) => simpleKey(x, q)).join(" or ");
  return simpleKey(k, q);
}
