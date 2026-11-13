import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Eyebrow } from "./label";

/**
 * THE number of a screen, in the display face (days to exam, the results score).
 * At most one Stat per screen. Pass `accent` when it is also the screen's accent moment.
 * For every other number use <Metric>.
 */
export function Stat({
  value,
  unit,
  label,
  note,
  size = "xl",
  accent = false,
  className,
}: {
  value: ReactNode;
  unit?: ReactNode;
  label: ReactNode;
  note?: ReactNode;
  size?: "xl" | "lg";
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Eyebrow>{label}</Eyebrow>
      <p className="flex items-baseline gap-3">
        <span
          className={cn(
            "font-display tabular",
            size === "xl" ? "text-display" : "text-display-sm",
            accent ? "text-accent" : "text-fg",
          )}
        >
          {value}
        </span>
        {unit && <span className="font-mono text-small text-mute">{unit}</span>}
      </p>
      {note && <div className="text-small text-mute">{note}</div>}
    </div>
  );
}

/**
 * Supporting number: mono value + caption label. Repeats freely.
 * `tone` uses data colours for correct / wrong readouts only.
 */
export function Metric({
  value,
  unit,
  label,
  tone = "fg",
  size = "md",
  className,
}: {
  value: ReactNode;
  unit?: ReactNode;
  label: ReactNode;
  tone?: "fg" | "good" | "bad" | "mute";
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p
        className={cn(
          "font-mono font-medium",
          size === "lg" ? "text-title" : "text-heading",
          tone === "fg" && "text-fg",
          tone === "good" && "text-good",
          tone === "bad" && "text-bad",
          tone === "mute" && "text-mute",
        )}
      >
        {value}
        {unit && <span className="ml-1 text-caption font-normal text-mute">{unit}</span>}
      </p>
      <p className="text-caption text-mute">{label}</p>
    </div>
  );
}
