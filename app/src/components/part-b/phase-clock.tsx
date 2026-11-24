"use client";

import { formatClock, useCountdown } from "@/components/ui/countdown";
import { cn } from "@/lib/cn";
import { STEP_NAME, type Attempt } from "./types";

/**
 * Server-anchored countdown to a deadline, sized for reading at arm's length while drawing.
 * Accent marks the one live clock on the screen.
 */
export function PhaseClock({
  deadline,
  serverNow,
  size = "timer",
  accent = false,
  label,
  className,
}: {
  deadline: number;
  serverNow: number;
  size?: "counter" | "timer" | "caption";
  accent?: boolean;
  label: string;
  className?: string;
}) {
  const remaining = useCountdown({ deadline, serverNow });
  const s = Math.ceil(remaining / 1000);
  return (
    <span
      role="timer"
      aria-label={`${label}: ${Math.floor(s / 60)} minutes ${s % 60} seconds remaining`}
      data-testid="phase-clock"
      className={cn(
        "font-mono font-medium tabular",
        size === "counter" && "text-counter",
        size === "timer" && "text-timer",
        size === "caption" && "text-caption",
        accent ? "text-accent" : size === "caption" ? "text-mute" : "text-fg",
        className,
      )}
    >
      {formatClock(remaining)}
    </span>
  );
}

/** m:ss for a span of question-clock ms; "+m:ss" when it is an overrun. */
export function spanText(ms: number, over = false): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${over ? "+" : ""}${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export type BarSegment = {
  key: string;
  name: string;
  kind: "past" | "current" | "future";
  from: number; // question-clock ms
  to: number;
  target: number; // the script's end for this window
  last: boolean; // the current step's final window: the one that stretches and shows an overrun
};

const ORDER = ["read", "ideas", "commit", "draw"];

/**
 * The step bar as she has lived it: finished steps at the time they took, the current step from
 * when she entered it to its target (stretched to now when over, in Easy), and the windows still
 * ahead from the slot script. A reread or a slow step pushes what follows later, visibly.
 */
export function barSegments(a: Attempt, qms: number): BarSegment[] {
  const cur = a.progress === "out" ? ORDER.length : ORDER.indexOf(a.step);
  const stepEnd = (a.targets?.[a.step as keyof NonNullable<Attempt["targets"]>] ?? 0) * 1000;
  const out: BarSegment[] = [];
  for (const step of ORDER.slice(0, cur)) {
    const log = a.steps[step];
    if (!log) continue;
    out.push({ key: step, name: STEP_NAME[step], kind: "past", from: log.from, to: log.to ?? qms, target: log.to ?? qms, last: false });
  }
  let prevTo: number | null = null;
  let first = true;
  a.script.forEach((s, i) => {
    const k = ORDER.indexOf(s.step);
    if (k < cur) return;
    let from = s.from * 1000;
    let to = s.to * 1000;
    if (k === cur && first) {
      from = a.steps[a.step]?.from ?? from;
      first = false;
    } else if (prevTo !== null) from = Math.max(from, prevTo);
    const last = k === cur && to === stepEnd;
    if (last) to = Math.max(to, qms);
    to = Math.max(to, from);
    out.push({ key: `${s.name}-${i}`, name: s.name, kind: k === cur ? "current" : "future", from, to, target: s.to * 1000, last });
    prevTo = to;
  });
  return out;
}

/**
 * Labelled, proportional step bar. Every segment names itself on screen (never a tooltip) and,
 * with the step timer on, shows its time: taken (past), left (current), length (ahead).
 */
export function StepBar({ segments, qms, showTimes, className }: { segments: BarSegment[]; qms: number; showTimes: boolean; className?: string }) {
  return (
    <ol aria-label="Steps" className={cn("flex w-full gap-1", className)} data-testid="step-bar">
      {segments.map((s) => {
        const over = s.last && qms > s.target;
        const fill = s.kind === "past" ? 1 : s.to > s.from ? Math.min(1, Math.max(0, (qms - s.from) / (s.to - s.from))) : 0;
        const time =
          s.kind === "past"
            ? spanText(s.to - s.from)
            : over
              ? spanText(qms - s.target, true)
              : spanText(Math.max(0, s.to - Math.max(qms, s.from)));
        return (
          <li
            key={s.key}
            aria-current={s.kind === "current" ? "step" : undefined}
            className="flex min-w-12 flex-col gap-1.5"
            style={{ flexGrow: Math.max(1, s.to - s.from), flexBasis: 0 }}
          >
            <span
              className={cn(
                "relative h-1.5 overflow-hidden rounded-xs bg-hairline",
                s.kind === "current" && "outline outline-1 outline-offset-1 outline-fg",
              )}
            >
              <span className={cn("absolute inset-y-0 left-0", over ? "bg-bad" : "bg-fg")} style={{ width: `${fill * 100}%` }} />
            </span>
            <span
              className={cn(
                "truncate font-mono text-label uppercase",
                s.kind === "current" ? "font-medium text-fg" : "text-mute",
              )}
            >
              {s.name}
            </span>
            {showTimes && (
              <span className={cn("font-mono text-caption tabular", over ? "text-bad" : s.kind === "current" ? "font-medium text-fg" : "text-mute")}>
                {time}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
