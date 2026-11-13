"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SegmentOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** One-line mono note under the label, e.g. "timer hidden". */
  hint?: ReactNode;
  disabled?: boolean;
};

/**
 * Single choice from 2–4 peers (Easy / Hard / Custom, theme).
 * ARIA radiogroup with roving focus: arrows move and select, like native radios.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  block = false,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  "aria-label": string;
  block?: boolean;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = options.filter((o) => !o.disabled);

  function move(from: T, step: 1 | -1) {
    const i = enabled.findIndex((o) => o.value === from);
    const next = enabled[(i + step + enabled.length) % enabled.length];
    onValueChange(next.value);
    refs.current[options.indexOf(next)]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, v: T) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      move(v, 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      move(v, -1);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-grid auto-cols-fr grid-flow-col gap-1 rounded-md border border-hairline p-1",
        block && "grid w-full",
        className,
      )}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onValueChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, o.value)}
            className={cn(
              "flex min-h-touch select-none flex-col items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-small font-medium",
              "transition-colors duration-(--dur-fast) ease-measured disabled:opacity-40",
              selected ? "bg-fg text-on-fg" : "text-mute hover:bg-tint hover:text-fg",
            )}
          >
            <span>{o.label}</span>
            {o.hint && (
              <span className={cn("font-mono text-label tracking-normal", selected ? "opacity-70" : "opacity-80")}>
                {o.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
