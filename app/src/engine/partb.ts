// Part B question clock (spec §5.3) and prompt-visibility rules (spec §5.0). Pure; times in seconds
// on the question clock unless named otherwise.
import type { Slot } from "../content/types";

/** The four steps she moves through on one question. */
export type Step = "read" | "ideas" | "commit" | "draw";
export const STEPS: Step[] = ["read", "ideas", "commit", "draw"];

/** One window of the slot script: the step it belongs to and the name the step bar shows. */
export interface ScriptSpan {
  step: Step;
  name: string; // Read · Ideas · Framing · Pick · Commit · Draw · Buffer
  from: number; // seconds on the question clock, inclusive
  to: number; // exclusive
}

const m = (min: number) => min * 60;
const span = (step: Step, name: string, from: number, to: number): ScriptSpan => ({ step, name, from: m(from), to: m(to) });

// Slot scripts over a 24-minute question. Buffer is the tail of Draw.
export function slotScript(slot: Slot): ScriptSpan[] {
  if (slot === "sketching")
    return [
      span("read", "Read", 0, 2),
      span("ideas", "Ideas", 2, 4),
      span("commit", "Commit", 4, 5),
      span("draw", "Draw", 5, 21),
      span("draw", "Buffer", 21, 24),
    ];
  if (slot === "problem-id")
    return [
      span("read", "Read", 0, 2),
      span("ideas", "Framing", 2, 10),
      span("ideas", "Pick", 10, 12),
      span("commit", "Commit", 12, 13),
      span("draw", "Draw", 13, 22),
      span("draw", "Buffer", 22, 24),
    ];
  return [
    span("read", "Read", 0, 2),
    span("ideas", "Ideas", 2, 10),
    span("commit", "Commit", 10, 11),
    span("draw", "Draw", 11, 22),
    span("draw", "Buffer", 22, 24),
  ];
}

export const DRILL_BUDGET_SECONDS = m(24);
export const PAPER_BUDGET_SECONDS = m(22);
export const READ_ALL_SECONDS = m(6);
export const B_MOCK_MINUTES = 120;
export const PEEK_SECONDS = 15; // prompt shown each time a question is opened (hiding on)
export const REREAD_SECONDS = [60, 30, 15]; // the three rereads, each shorter

/** The script for one question, clipped to its budget (a paper question gets 22 of the 24 minutes). */
export function questionScript(slot: Slot, budget: number): ScriptSpan[] {
  return slotScript(slot)
    .filter((s) => s.from < budget)
    .map((s) => ({ ...s, to: Math.min(s.to, budget) }));
}

/** Target end of each step on the question clock; draw's target is the budget. */
export interface Targets {
  read: number;
  ideas: number;
  commit: number;
  draw: number;
}

export function targetsOf(script: ScriptSpan[]): Targets {
  const end = (step: Step) => Math.max(...script.filter((s) => s.step === step).map((s) => s.to));
  return { read: end("read"), ideas: end("ideas"), commit: end("commit"), draw: end("draw") };
}

/** Part B shape stored on the session: how long read-all, each question and the whole section run. */
export interface PartBPlan {
  readAll: number; // 0 for a drill
  budget: number; // per question
  total: number; // the section's wall clock
}

export function drillPlan(): PartBPlan {
  return { readAll: 0, budget: DRILL_BUDGET_SECONDS, total: DRILL_BUDGET_SECONDS };
}

// Full mock / past paper: 6 min read-all, then 22 min per question; the rest of the paper is spare.
export function paperPlan(durationMin = B_MOCK_MINUTES): PartBPlan {
  return { readAll: READ_ALL_SECONDS, budget: PAPER_BUDGET_SECONDS, total: m(durationMin) };
}

/** Seconds of the next reread, or null when all three are used. */
export function nextReread(used: number): number | null {
  return REREAD_SECONDS[used] ?? null;
}
