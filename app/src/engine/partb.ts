// Part B phase clock (spec §5.3) and question-hiding windows (spec §5.0). Pure; all times in seconds.
import type { Slot } from "../content/types";

export type Phase = "read-all" | "read" | "generate" | "commit" | "execute" | "buffer" | "final-buffer";

export interface PhaseSpan {
  phase: Phase;
  from: number; // seconds, inclusive
  to: number; // seconds, exclusive
  label?: string; // sub-step shown to her, e.g. "framing", "pick"
}

const m = (min: number) => min * 60;

// Single-slot script, seconds from the start of the slot's own 24 minutes.
// Problem ID: framing 2–10, pick 10–12, commit 12–13, so the commit lands "by min 13".
export function slotScript(slot: Slot): PhaseSpan[] {
  if (slot === "sketching")
    return [
      { phase: "read", from: 0, to: m(2) },
      { phase: "generate", from: m(2), to: m(4) },
      { phase: "commit", from: m(4), to: m(5) },
      { phase: "execute", from: m(5), to: m(21) },
      { phase: "buffer", from: m(21), to: m(24) },
    ];
  if (slot === "problem-id")
    return [
      { phase: "read", from: 0, to: m(2) },
      { phase: "generate", from: m(2), to: m(10), label: "framing" },
      { phase: "generate", from: m(10), to: m(12), label: "pick" },
      { phase: "commit", from: m(12), to: m(13) },
      { phase: "execute", from: m(13), to: m(22) },
      { phase: "buffer", from: m(22), to: m(24) },
    ];
  return [
    { phase: "read", from: 0, to: m(2) },
    { phase: "generate", from: m(2), to: m(10) },
    { phase: "commit", from: m(10), to: m(11) },
    { phase: "execute", from: m(11), to: m(22) },
    { phase: "buffer", from: m(22), to: m(24) },
  ];
}

export const DRILL_SECONDS = m(24);
export const READ_ALL_SECONDS = m(6);
export const BLOCK_SECONDS = m(22);
export const B_MOCK_MINUTES = 120;
export const HIDE_AFTER_SECONDS = m(2); // prompt stays visible for the first 2 min of its own block

export interface Block {
  pos: number;
  slot: Slot;
  start: number;
  end: number;
  commitDeadline: number;
  phases: PhaseSpan[]; // absolute seconds from Part B start
}

export interface Timeline {
  kind: "drill" | "paper"; // paper = full mock or past paper
  total: number;
  readAll: PhaseSpan | null;
  finalBuffer: PhaseSpan | null;
  blocks: Block[];
}

function shift(spans: PhaseSpan[], by: number, clipTo: number): PhaseSpan[] {
  return spans
    .filter((s) => s.from < clipTo)
    .map((s) => ({ ...s, from: s.from + by, to: Math.min(s.to, clipTo) + by }));
}

function commitEnd(spans: PhaseSpan[]): number {
  return spans.find((s) => s.phase === "commit")!.to;
}

export function drillTimeline(slot: Slot): Timeline {
  const phases = slotScript(slot);
  return {
    kind: "drill",
    total: DRILL_SECONDS,
    readAll: null,
    finalBuffer: null,
    blocks: [{ pos: 0, slot, start: 0, end: DRILL_SECONDS, commitDeadline: commitEnd(phases), phases }],
  };
}

// Full mock / past paper: 6 min read-all, 5 × 22 min blocks with hard stamps (each slot script
// clipped at 22 min), then the remaining minutes as the final buffer (4 min at 120 min total:
// 6 + 110 + 6 would overrun the 120-minute paper).
export function paperTimeline(slots: Slot[], durationMin = B_MOCK_MINUTES): Timeline {
  const total = m(durationMin);
  const blocks = slots.map((slot, pos) => {
    const start = READ_ALL_SECONDS + pos * BLOCK_SECONDS;
    const phases = shift(slotScript(slot), start, BLOCK_SECONDS);
    return { pos, slot, start, end: start + BLOCK_SECONDS, commitDeadline: commitEnd(phases), phases };
  });
  const lastEnd = blocks.length ? blocks[blocks.length - 1].end : READ_ALL_SECONDS;
  return {
    kind: "paper",
    total,
    readAll: { phase: "read-all", from: 0, to: READ_ALL_SECONDS },
    finalBuffer: lastEnd < total ? { phase: "final-buffer", from: lastEnd, to: total } : null,
    blocks,
  };
}

export interface PhaseAt {
  phase: Phase | "done";
  label?: string;
  pos: number | null; // block in progress
  from: number;
  to: number;
}

export function phaseAt(t: Timeline, s: number): PhaseAt {
  if (s >= t.total) return { phase: "done", pos: null, from: t.total, to: t.total };
  if (t.readAll && s < t.readAll.to) return { phase: "read-all", pos: null, from: 0, to: t.readAll.to };
  for (const b of t.blocks) {
    if (s < b.start || s >= b.end) continue;
    const span = b.phases.find((p) => s >= p.from && s < p.to);
    if (span) return { phase: span.phase, label: span.label, pos: b.pos, from: span.from, to: span.to };
  }
  const fb = t.finalBuffer;
  if (fb && s >= fb.from) return { phase: "final-buffer", pos: null, from: fb.from, to: fb.to };
  return { phase: "done", pos: null, from: s, to: s };
}

// Is the prompt for block `pos` visible at second s? Debrief (after the end) always shows it.
export function promptVisible(t: Timeline, pos: number, s: number, hiding: boolean): boolean {
  if (!hiding || s >= t.total) return true;
  if (t.readAll && s >= t.readAll.from && s < t.readAll.to) return true;
  const b = t.blocks[pos];
  return s >= b.start && s < b.start + HIDE_AFTER_SECONDS;
}

// Ideas can be tapped and a commit made from the block's start until its commit deadline.
export function commitOpen(b: Block, s: number): boolean {
  return s >= b.start && s < b.commitDeadline;
}
