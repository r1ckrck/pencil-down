import { cn } from "@/lib/cn";
import { formatClock } from "./countdown";

/**
 * Per-question time budget drawn as an architectural dimension line:
 *   end ticks with 45° obliques mark the span (= budget); the fill is elapsed time.
 * Past the budget the whole line turns --data-bad and the overrun prints on the right.
 *
 * `live` makes the fill the screen's accent (the running per-question timer, spec §4).
 * `concealed` keeps the frame but hides progress (Hard mode: the budget runs unseen).
 * Pure display: feed `elapsedMs` from useServerNow / useCountdown.
 */
export function DimensionBar({
  budgetMs,
  elapsedMs,
  live = false,
  concealed = false,
  label = "budget",
  className,
}: {
  budgetMs: number;
  elapsedMs: number;
  live?: boolean;
  concealed?: boolean;
  label?: string;
  className?: string;
}) {
  const over = !concealed && elapsedMs > budgetMs;
  const pct = concealed ? 0 : Math.min(100, Math.max(0, (elapsedMs / budgetMs) * 100));
  const ink = over ? "bg-bad" : "bg-fg";

  return (
    <div
      className={cn("w-full select-none", className)}
      role="meter"
      aria-label={`${label} ${formatClock(budgetMs)}`}
      aria-valuemin={0}
      aria-valuemax={Math.round(budgetMs / 1000)}
      aria-valuenow={concealed ? undefined : Math.round(Math.min(elapsedMs, budgetMs) / 1000)}
      aria-valuetext={
        concealed
          ? "hidden"
          : over
            ? `over by ${formatClock(elapsedMs - budgetMs)}`
            : `${formatClock(elapsedMs)} of ${formatClock(budgetMs)}`
      }
    >
      <div className="relative h-5">
        {/* dimension line */}
        <span
          aria-hidden
          className={cn("absolute inset-x-0 top-1/2 h-px -translate-y-1/2", over ? "bg-bad" : "bg-hairline")}
        />
        {/* elapsed fill */}
        <span
          aria-hidden
          className={cn(
            "absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-xs",
            "transition-[width,background-color] duration-(--dur-fast) ease-linear",
            over ? "bg-bad" : live ? "bg-accent" : "bg-fg",
          )}
          style={{ width: `${pct}%` }}
        />
        {/* end ticks + obliques */}
        {(["left-0", "right-0"] as const).map((side) => (
          <span key={side} aria-hidden className={cn("absolute inset-y-0 w-px", side, ink)}>
            <span className={cn("absolute top-1/2 left-1/2 h-2.5 w-px -translate-1/2 rotate-45", ink)} />
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-baseline gap-2 font-mono text-caption">
        <span className={over ? "text-bad" : "text-mute"}>
          {concealed ? "--:--" : formatClock(Math.min(elapsedMs, budgetMs))}
        </span>
        <span className="text-mute uppercase tracking-[0.12em] text-label">
          {label} {formatClock(budgetMs)}
        </span>
        <span className="text-right font-medium text-bad">
          {over ? `+${formatClock(elapsedMs - budgetMs)}` : ""}
        </span>
      </div>
    </div>
  );
}
