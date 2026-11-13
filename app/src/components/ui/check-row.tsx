"use client";

import { Check, X } from "@phosphor-icons/react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * One yes/no check on the Commit screen ("obeys every rule", "not my first obvious idea", …).
 * `value` starts null (unanswered). Two 44px targets; the chosen one fills with ink.
 * Yes/no stay neutral ink — a "no" is information, not an error.
 */
export function CheckRow({
  index,
  label,
  hint,
  value,
  onValueChange,
  disabled,
  className,
}: {
  index?: string;
  label: ReactNode;
  hint?: ReactNode;
  value: boolean | null;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const choice = (v: boolean) =>
    cn(
      "inline-flex min-h-touch min-w-16 items-center justify-center gap-1 rounded-sm border px-3 text-small font-medium",
      "transition-colors duration-(--dur-fast) ease-measured disabled:opacity-40",
      value === v ? "border-fg bg-fg text-on-fg" : "border-hairline text-mute hover:border-fg hover:text-fg",
    );
  return (
    <div
      role="radiogroup"
      aria-labelledby={id}
      className={cn("flex items-center gap-4 border-b border-hairline py-3 last:border-b-0", className)}
    >
      {index && <span className="w-6 shrink-0 font-mono text-caption text-mute">{index}</span>}
      <div className="min-w-0 flex-1">
        <p id={id} className="text-body text-fg">
          {label}
        </p>
        {hint && <p className="text-caption text-mute">{hint}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={value === true}
          disabled={disabled}
          onClick={() => onValueChange(true)}
          className={choice(true)}
        >
          <Check size={16} weight="bold" aria-hidden />
          Yes
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === false}
          disabled={disabled}
          onClick={() => onValueChange(false)}
          className={choice(false)}
        >
          <X size={16} weight="bold" aria-hidden />
          No
        </button>
      </div>
    </div>
  );
}
