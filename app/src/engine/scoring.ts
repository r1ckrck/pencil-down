import type { Answer, Format, MarkScheme, Option, SimpleAnswer } from "../content/types";
import { OPTIONS } from "../content/types";

// Current CEED scheme (spec §9). Every non-past-paper session scores with this.
export const CURRENT_SCHEME: MarkScheme = {
  NAT: { correct: 4, wrong: 0 },
  MCQ: { correct: 3, wrong: -0.5 },
  MSQ: { correct: 4, wrong: -1, partial: true },
};

// What the candidate submitted. null = blank.
export type AnswerInput =
  | { kind: "MCQ"; option: Option }
  | { kind: "MSQ"; options: Option[] }
  | { kind: "NAT"; value: number };

export type Outcome = "correct" | "partial" | "wrong" | "blank" | "dropped";

export interface Scored {
  outcome: Outcome;
  marks: number;
}

export function isBlank(input: AnswerInput | null): input is null {
  return input === null || (input.kind === "MSQ" && input.options.length === 0);
}

// Validates and normalises a client-supplied answer for a question format. Throws on bad input.
export function normaliseInput(format: Format, raw: unknown): AnswerInput | null {
  if (raw === null || raw === undefined) return null;
  const r = raw as Record<string, unknown>;
  if (r.kind !== format) throw new Error(`answer kind must be ${format}`);
  if (format === "MCQ") {
    if (!OPTIONS.includes(r.option as Option)) throw new Error("MCQ option must be A–D");
    return { kind: "MCQ", option: r.option as Option };
  }
  if (format === "MSQ") {
    const opts = r.options;
    if (!Array.isArray(opts) || !opts.every((o) => OPTIONS.includes(o as Option)))
      throw new Error("MSQ options must be a list of A–D");
    const set = [...new Set(opts as Option[])].sort();
    return set.length === 0 ? null : { kind: "MSQ", options: set };
  }
  const v = r.value;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("NAT value must be a finite number");
  return { kind: "NAT", value: v };
}

// MSQ partial-credit table (spec §9). key and sel are non-empty option sets.
export function msqPartialMarks(key: Option[], sel: Option[], scheme: MarkScheme["MSQ"]): Scored {
  const C = new Set(key);
  if (sel.some((o) => !C.has(o))) return { outcome: "wrong", marks: scheme.wrong };
  if (sel.length === C.size) return { outcome: "correct", marks: scheme.correct };
  if (!scheme.partial) return { outcome: "wrong", marks: scheme.wrong };
  // sel is a strict, non-empty subset of C
  if (C.size === 4 && sel.length === 3) return { outcome: "partial", marks: 3 };
  if (C.size >= 3 && sel.length === 2) return { outcome: "partial", marks: 2 };
  if (C.size >= 2 && sel.length === 1) return { outcome: "partial", marks: 1 };
  return { outcome: "wrong", marks: scheme.wrong }; // unreachable for subsets; kept for safety
}

function scoreSimple(key: SimpleAnswer, input: AnswerInput, scheme: MarkScheme): Scored {
  if (key.kind !== input.kind) return { outcome: "wrong", marks: scheme[key.kind].wrong };
  if (key.kind === "MCQ") {
    const ok = (input as { option: Option }).option === key.option;
    return ok ? { outcome: "correct", marks: scheme.MCQ.correct } : { outcome: "wrong", marks: scheme.MCQ.wrong };
  }
  if (key.kind === "MSQ") return msqPartialMarks(key.options, (input as { options: Option[] }).options, scheme.MSQ);
  const v = (input as { value: number }).value;
  const ok = v >= key.min && v <= key.max;
  return ok ? { outcome: "correct", marks: scheme.NAT.correct } : { outcome: "wrong", marks: scheme.NAT.wrong };
}

export function scoreAnswer(key: Answer, input: AnswerInput | null, scheme: MarkScheme): Scored {
  if (key.kind === "DROPPED") return { outcome: "dropped", marks: key.marks };
  if (isBlank(input)) return { outcome: "blank", marks: 0 };
  if (key.kind === "ANY") {
    let best: Scored | null = null;
    for (const alt of key.of) {
      const s = scoreSimple(alt, input, scheme);
      if (!best || s.marks > best.marks) best = s;
    }
    return best ?? { outcome: "wrong", marks: 0 };
  }
  return scoreSimple(key, input, scheme);
}

export function fullMarks(format: Format, scheme: MarkScheme): number {
  return scheme[format].correct;
}

export function isDropped(key: Answer): boolean {
  return key.kind === "DROPPED";
}
