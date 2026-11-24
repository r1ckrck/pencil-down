// Client-side shapes of the Part B API (docs/api.md), derived from the engine's read models
// so the contract has one definition. Type-only imports: nothing server-side is bundled.
import type { Slot } from "@/content/types";
import type { promptPayload } from "@/engine/items";
import type { partBResults, sessionState } from "@/engine/view";

export type SessionState = ReturnType<typeof sessionState>;
export type PartBState = NonNullable<SessionState["partB"]>;
export type Attempt = PartBState["attempts"][number];
export type Prompt = ReturnType<typeof promptPayload>;
export type BResult = NonNullable<ReturnType<typeof partBResults>>[number];

export const SLOT_NAME: Record<Slot, string> = {
  sketching: "Sketching",
  creativity: "Creativity",
  visual: "Visual sensitivity",
  form: "Form sensitivity",
  "problem-id": "Problem identification",
};

export const STEP_NAME: Record<string, string> = {
  read: "Read",
  ideas: "Ideas",
  commit: "Commit",
  draw: "Draw",
};

/** What each question's palette cell says about it. */
export const PROGRESS_NAME: Record<string, string> = {
  unseen: "not opened",
  open: "in progress",
  skipped: "skipped",
  committed: "committed",
  done: "done",
  out: "out of time",
};

/** Short names for the live screen's top line (fits 360 px). */
export const KIND_SHORT: Record<string, string> = {
  "b-drill": "Drill",
  "b-mock": "Mock",
  "b-past-paper": "Past paper",
  full: "Full exam",
};

export const KIND_NAME: Record<string, string> = {
  "b-drill": "Single drill",
  "b-mock": "Part B mock",
  "b-past-paper": "Part B past paper",
  full: "Full exam",
};

/** m:ss for seconds-to-commit and other second counts. */
export function mmss(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "–";
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
