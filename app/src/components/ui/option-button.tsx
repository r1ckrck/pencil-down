"use client";

import { Check } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type OptionLetter = "A" | "B" | "C" | "D";

/** Review-mode marking after a section ends. `key` = the correct option she did not pick. */
export type OptionReview = "correct" | "wrong" | "key";

/**
 * One answer option. `mode="radio"` for MCQ (one of four), `"checkbox"` for MSQ (any of four).
 * The marker shape says which: radio → solid inner square, checkbox → check mark.
 * Content can be text or an image/Figure. Wrap a set in <OptionGroup>.
 */
export function OptionButton({
  letter,
  mode,
  selected,
  onSelect,
  review,
  disabled,
  children,
  className,
}: {
  letter: OptionLetter;
  mode: "radio" | "checkbox";
  selected: boolean;
  onSelect?: () => void;
  review?: OptionReview;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const reviewing = review !== undefined;
  return (
    <button
      type="button"
      role={mode}
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group flex min-h-14 w-full items-center gap-4 rounded-md border p-3 pr-4 text-left",
        "transition-colors duration-(--dur-fast) ease-measured disabled:cursor-default",
        !reviewing && (selected ? "border-fg bg-tint" : "border-hairline hover:border-fg"),
        review === "correct" && "border-good",
        review === "wrong" && "border-bad",
        review === "key" && "border-dashed border-good",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-touch shrink-0 items-center justify-center rounded-sm border font-mono text-body font-medium",
          "transition-colors duration-(--dur-fast) ease-measured",
          selected ? "border-fg bg-fg text-on-fg" : "border-hairline text-fg group-hover:border-fg",
        )}
      >
        {letter}
      </span>
      <span className="min-w-0 flex-1 text-body">{children}</span>
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center border",
          mode === "radio" ? "rounded-sm" : "rounded-xs",
          selected ? "border-fg" : "border-hairline",
        )}
      >
        {selected &&
          (mode === "radio" ? (
            <span className="size-2.5 rounded-xs bg-fg" />
          ) : (
            <Check size={14} weight="bold" />
          ))}
      </span>
      {reviewing && (
        <span
          className={cn(
            "shrink-0 font-mono text-label uppercase",
            review === "wrong" ? "text-bad" : "text-good",
          )}
        >
          {review === "correct" ? "correct" : review === "wrong" ? "wrong" : "key"}
        </span>
      )}
    </button>
  );
}

/** Groups options with the right ARIA role and spacing. */
export function OptionGroup({
  mode,
  label,
  children,
  className,
}: {
  mode: "radio" | "checkbox";
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role={mode === "radio" ? "radiogroup" : "group"} aria-label={label} className={cn("flex flex-col gap-2", className)}>
      {children}
    </div>
  );
}
