"use client";

import { formatClock, useCountdown } from "@/components/ui/countdown";
import { cn } from "@/lib/cn";

/**
 * Part B variant of CountdownText: the same server-anchored clock, but sized for reading at
 * arm's length while drawing ("counter" = 96px for Execute). Accent marks the active phase.
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

/**
 * Proportional strip of spans (phases of a slot, or blocks of a paper) with the current one
 * filling as time passes. Past spans are solid ink, future ones hairline.
 */
export function PhaseStrip({
  spans,
  current,
  progress,
  className,
}: {
  spans: { key: string; weight: number; label: string }[];
  current: number;
  /** 0–1 through the current span. */
  progress: number;
  className?: string;
}) {
  return (
    <ol aria-label="Timeline" className={cn("flex w-full gap-1", className)}>
      {spans.map((s, i) => (
        <li
          key={s.key}
          aria-current={i === current ? "step" : undefined}
          aria-label={s.label}
          title={s.label}
          className={cn(
            "relative h-1.5 overflow-hidden rounded-xs",
            i < current ? "bg-fg" : "bg-hairline",
          )}
          style={{ flexGrow: s.weight, flexBasis: 0 }}
        >
          {i === current && (
            <span className="absolute inset-y-0 left-0 bg-fg" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
          )}
        </li>
      ))}
    </ol>
  );
}
