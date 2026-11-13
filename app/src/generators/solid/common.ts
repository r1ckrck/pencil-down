import { OPTIONS, type Difficulty, type Format, type GeneratedQuestion, type Option, type SimpleAnswer } from "@/content/types";
import type { Rng } from "../rng";

export const qid = (gen: string, f: Format, d: Difficulty, seed: number) => `gen:${gen}:${f}:${d}:${seed}`;

/** Shuffle (svg, correct) pairs into labelled options and the matching answer. */
export function arrange(
  rng: Rng,
  items: { svg: string; correct: boolean }[],
  format: "MCQ" | "MSQ",
): { options: { label: Option; svg: string }[]; answer: SimpleAnswer; correct: Option[] } {
  const order = rng.shuffle(items);
  const options = order.map((it, i) => ({ label: OPTIONS[i], svg: it.svg }));
  const correct = order.flatMap((it, i) => (it.correct ? [OPTIONS[i]] : []));
  const answer: SimpleAnswer =
    format === "MCQ" ? { kind: "MCQ", option: correct[0] } : { kind: "MSQ", options: correct };
  return { options, answer, correct };
}

export function answerFrom(format: Format, flags: boolean[]): SimpleAnswer {
  const opts = OPTIONS.filter((_, i) => flags[i]);
  if (format === "MCQ") {
    if (opts.length !== 1) throw new Error(`MCQ solver found ${opts.length} matches`);
    return { kind: "MCQ", option: opts[0] };
  }
  return { kind: "MSQ", options: opts };
}

/** Numeric MCQ: correct value plus three distinct non-negative near values. */
export function numericDistractors(rng: Rng, answer: number, preferred: number[]): number[] {
  const out: number[] = [];
  const add = (v: number) => {
    if (v >= 0 && v !== answer && !out.includes(v) && out.length < 3) out.push(v);
  };
  for (const v of preferred) add(v);
  for (const d of rng.shuffle([1, -1, 2, -2, 3, -3, 4, 5])) add(answer + d);
  return out;
}

/**
 * Numeric MCQ distractors placed so the key is the smallest or largest of the four options about half the time
 * (a solver cannot lean on "the answer is a middle value"). Distractors come from `preferred` first (plausible wrong counts), then from near
 * values on the needed side. Values stay >= `floor`.
 */
export function spreadDistractors(rng: Rng, answer: number, preferred: number[], floor = 0): number[] {
  const uniq = (vs: number[]) => [...new Set(vs)].filter((v) => v !== answer && v >= floor);
  const below = uniq([...rng.shuffle(preferred.filter((v) => v < answer)), ...[1, 2, 3, 4, 5, 6].map((d) => answer - d)]);
  const above = uniq([...rng.shuffle(preferred.filter((v) => v > answer)), ...[1, 2, 3, 4, 5, 6].map((d) => answer + d)]);
  // half the time the key sits at an end (smallest or largest), half the time inside, as far as values allow
  const ends = [0, 3].filter((r) => r <= below.length);
  const inner = [1, 2].filter((r) => r <= below.length);
  const rank = inner.length && !rng.bool() ? rng.pick(inner) : rng.pick(ends);
  return [...below.slice(0, rank), ...above.slice(0, 3 - rank)];
}

export const optionValue = (q: GeneratedQuestion, svg: string) => {
  const m = /data-value="(-?\d+)"/.exec(svg);
  if (!m) throw new Error(`${q.id}: option without data-value`);
  return Number(m[1]);
};
