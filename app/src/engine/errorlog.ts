// Error log (spec §5.2 results): wrong, unsure-correct and forced-skip questions come back on a
// spacing ladder; a sure, correct answer later resolves the entry.
import type { Db } from "../db/db";
import type { Outcome } from "./scoring";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const LADDER_DAYS = [1, 3, 7, 14, 30];

export type Reason = "wrong" | "unsure-correct" | "forced-skip";

// The reason a response enters the log, or null when it doesn't (sure + correct, plain skip, dropped).
export function errorReason(outcome: Outcome, confidence: "sure" | "unsure", forcedSkip: boolean): Reason | null {
  if (outcome === "dropped") return null;
  if (outcome === "correct") return confidence === "unsure" ? "unsure-correct" : null;
  if (outcome === "wrong" || outcome === "partial") return "wrong";
  return forcedSkip ? "forced-skip" : null;
}

// Next ladder step: a miss restarts at 1 day; unsure-correct climbs one rung (first entry at 3 days).
export function nextStep(reason: Reason, currentStep: number | null): number {
  if (reason !== "unsure-correct") return 0;
  return currentStep === null ? 1 : Math.min(currentStep + 1, LADDER_DAYS.length - 1);
}

export function dueAt(now: number, step: number): number {
  return now + LADDER_DAYS[step] * DAY_MS;
}

interface OpenEntry {
  id: number;
  step: number;
}

export function recordOutcome(
  db: Db,
  questionId: string,
  outcome: Outcome,
  confidence: "sure" | "unsure",
  forcedSkip: boolean,
  now: number,
  sessionId: number,
): void {
  if (outcome === "dropped") return;
  const open = db
    .prepare("SELECT id, step FROM error_log WHERE question_id = ? AND resolved_at IS NULL")
    .get(questionId) as OpenEntry | undefined;
  const reason = errorReason(outcome, confidence, forcedSkip);
  if (!reason) {
    if (open && outcome === "correct") db.prepare("UPDATE error_log SET resolved_at = ? WHERE id = ?").run(now, open.id);
    return;
  }
  const step = nextStep(reason, open ? open.step : null);
  if (open)
    db.prepare("UPDATE error_log SET reason = ?, step = ?, due_at = ?, last_session_id = ? WHERE id = ?").run(
      reason,
      step,
      dueAt(now, step),
      sessionId,
      open.id,
    );
  else
    db.prepare(
      "INSERT INTO error_log (question_id, reason, created_at, due_at, step, last_session_id) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(questionId, reason, now, dueAt(now, step), step, sessionId);
}

export function dueQuestionIds(db: Db, now: number): string[] {
  return (
    db
      .prepare("SELECT question_id FROM error_log WHERE resolved_at IS NULL AND due_at <= ? ORDER BY due_at, id")
      .all(now) as { question_id: string }[]
  ).map((r) => r.question_id);
}
