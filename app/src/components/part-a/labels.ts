import type { Format, Kind, Mode, Switches, Topic } from "./types";

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
