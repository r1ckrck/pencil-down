import type { Difficulty, Format, Option, SimpleAnswer } from "@/content/types";
import { OPTIONS } from "@/content/types";
import type { Rng } from "../rng";

export const genId = (gen: string, format: Format, d: Difficulty, seed: number) => `gen:${gen}:${format}:${d}:${seed}`;

export interface Candidate {
  key: string; // canonical form; two candidates with equal keys look identical
  correct: boolean;
}

// Shuffle four candidates into A–D and build the answer. Throws if any two share a key.
export function placeOptions<T extends Candidate>(rng: Rng, items: T[], format: "MCQ" | "MSQ") {
  if (items.length !== 4) throw new Error("need four options");
  if (new Set(items.map((i) => i.key)).size !== 4) throw new Error("duplicate options");
  const placed = rng.shuffle(items);
  const correct = OPTIONS.filter((_, i) => placed[i].correct);
  const answer: SimpleAnswer =
    format === "MCQ" ? { kind: "MCQ", option: correct[0] } : { kind: "MSQ", options: correct };
  return { placed, answer, labels: OPTIONS };
}

// Pick up to `count` candidates whose keys are new, in order.
export function takeDistinct<T extends { key: string }>(pool: T[], count: number, seen: Set<string>): T[] {
  const out: T[] = [];
  for (const c of pool) {
    if (out.length === count) break;
    if (seen.has(c.key)) continue;
    seen.add(c.key);
    out.push(c);
  }
  return out;
}

export function answerFromFlags(flags: boolean[], format: "MCQ" | "MSQ"): SimpleAnswer {
  const opts = OPTIONS.filter((_, i) => flags[i]);
  if (format === "MCQ") {
    if (opts.length !== 1) throw new Error(`solver found ${opts.length} matches`);
    return { kind: "MCQ", option: opts[0] };
  }
  return { kind: "MSQ", options: opts };
}

export const LABELS: Option[] = OPTIONS;
