"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Part B Generate phase: one big target, tapped once per idea while drawing on paper.
 * The whole face is the button (≥ 176px tall) so it can be hit without looking.
 * Count reads in mono; a quiet undo sits outside the target to avoid accidental taps.
 */
export function TapCounter({
  count,
  onIncrement,
  onUndo,
  label = "Ideas",
  hint = "Tap once per idea",
  disabled,
  className,
}: {
  count: number;
  onIncrement: () => void;
  onUndo?: () => void;
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  function tap() {
    onIncrement();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  }
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <button
        type="button"
        onClick={tap}
        disabled={disabled}
        aria-label={`Add idea. ${count} so far`}
        className={cn(
          "flex min-h-44 w-full select-none flex-col items-start justify-between rounded-lg border border-fg p-4 text-left",
          "touch-manipulation transition-[background-color,transform] duration-(--dur-instant) ease-measured",
          "hover:bg-tint active:scale-[0.99] active:bg-tint disabled:opacity-40",
        )}
      >
        <span className="font-mono text-label uppercase text-mute">{label}</span>
        <span aria-live="polite" className="font-mono text-counter font-medium tabular text-fg">
          {String(count).padStart(2, "0")}
        </span>
        <span className="text-caption text-mute">{hint}</span>
      </button>
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          disabled={disabled || count === 0}
          className="inline-flex min-h-touch items-center gap-2 self-end rounded-sm px-3 text-small text-mute hover:bg-tint hover:text-fg disabled:opacity-40"
        >
          <ArrowCounterClockwise size={18} weight="duotone" />
          Undo last
        </button>
      )}
    </div>
  );
}
