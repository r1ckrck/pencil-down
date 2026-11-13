"use client";

import { Check } from "@phosphor-icons/react";
import { Figure } from "@/components/ui/figure";
import { NumericKeypad } from "@/components/ui/numeric-keypad";
import { OptionButton, OptionGroup } from "@/components/ui/option-button";
import { cn } from "@/lib/cn";
import type { AnswerInput, Format, Option } from "./types";

export const LETTERS: Option[] = ["A", "B", "C", "D"];

export function selectedOptions(answer: AnswerInput | null): Option[] {
  if (!answer) return [];
  if (answer.kind === "MCQ") return [answer.option];
  if (answer.kind === "MSQ") return answer.options;
  return [];
}

/** MCQ replaces, MSQ toggles; an emptied MSQ is a blank answer. */
export function pick(format: Format, answer: AnswerInput | null, letter: Option): AnswerInput | null {
  if (format === "MCQ") {
    return answer?.kind === "MCQ" && answer.option === letter ? null : { kind: "MCQ", option: letter };
  }
  const cur = selectedOptions(answer);
  const next = cur.includes(letter) ? cur.filter((l) => l !== letter) : [...cur, letter].sort();
  return next.length ? { kind: "MSQ", options: next as Option[] } : null;
}

/** "12", "-3.5" → number; "", "-", "." → blank. */
export function parseNat(v: string): number | null {
  if (!/\d/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Generated-question option as a large SVG tile: the option is a picture, so the picture is the target.
 * Part A-local variant of OptionButton (which lays its content out in a single row).
 */
export function OptionTile({
  letter,
  svg,
  mode,
  selected,
  onSelect,
  review,
}: {
  letter: Option;
  svg: string;
  mode: "radio" | "checkbox";
  selected: boolean;
  onSelect?: () => void;
  review?: "correct" | "wrong" | "key";
}) {
  const reviewing = review !== undefined;
  return (
    <button
      type="button"
      role={mode}
      aria-checked={selected}
      aria-label={`Option ${letter}`}
      onClick={onSelect}
      disabled={!onSelect}
      className={cn(
        "group flex min-w-0 flex-col gap-2 rounded-md border p-2 text-left",
        "transition-colors duration-(--dur-fast) ease-measured disabled:cursor-default",
        !reviewing && (selected ? "border-fg bg-tint" : "border-hairline hover:border-fg"),
        review === "correct" && "border-good",
        review === "wrong" && "border-bad",
        review === "key" && "border-dashed border-good",
      )}
    >
      <Figure svg={svg} label={`Option ${letter}`} maxWidth={320} className="mx-auto" />
      <span className="flex items-center justify-between gap-2">
        <span
          aria-hidden
          className={cn(
            "flex size-8 items-center justify-center rounded-sm border font-mono text-small font-medium",
            selected ? "border-fg bg-fg text-on-fg" : "border-hairline text-fg group-hover:border-fg",
          )}
        >
          {letter}
        </span>
        {reviewing ? (
          <span className={cn("font-mono text-label uppercase", review === "wrong" ? "text-bad" : "text-good")}>
            {review === "key" ? "key" : review}
          </span>
        ) : (
          <span
            aria-hidden
            className={cn(
              "flex size-5 items-center justify-center border",
              mode === "radio" ? "rounded-sm" : "rounded-xs",
              selected ? "border-fg" : "border-hairline",
            )}
          >
            {selected &&
              (mode === "radio" ? <span className="size-2.5 rounded-xs bg-fg" /> : <Check size={14} weight="bold" />)}
          </span>
        )}
      </span>
    </button>
  );
}

/** Option tiles for a generated MCQ/MSQ, shown under its figure. */
export function OptionTiles({
  options,
  format,
  answer,
  onAnswer,
}: {
  options: { label: Option; svg: string }[];
  format: Format;
  answer: AnswerInput | null;
  onAnswer?: (a: AnswerInput | null) => void;
}) {
  const sel = selectedOptions(answer);
  const mode = format === "MSQ" ? "checkbox" : "radio";
  return (
    <OptionGroup
      mode={mode}
      label="Options"
      className="grid! grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {options.map((o) => (
        <OptionTile
          key={o.label}
          letter={o.label}
          svg={o.svg}
          mode={mode}
          selected={sel.includes(o.label)}
          onSelect={onAnswer ? () => onAnswer(pick(format, answer, o.label)) : undefined}
        />
      ))}
    </OptionGroup>
  );
}

/**
 * The right-hand answer control. MCQ: four radios. MSQ: four checkboxes. NAT: keypad.
 * For NAT the raw entry string is owned by the caller so partial entries ("3.") survive.
 */
export function AnswerControl({
  format,
  answer,
  onAnswer,
  natValue,
  onNatChange,
}: {
  format: Format;
  answer: AnswerInput | null;
  onAnswer: (a: AnswerInput | null) => void;
  natValue: string;
  onNatChange: (v: string) => void;
}) {
  if (format === "NAT") {
    return <NumericKeypad value={natValue} onValueChange={onNatChange} captureKeyboard className="max-w-none" />;
  }
  const mode = format === "MSQ" ? "checkbox" : "radio";
  const sel = selectedOptions(answer);
  return (
    <OptionGroup mode={mode} label={format === "MSQ" ? "Choose all that apply" : "Choose one"} className="grid! grid-cols-2">
      {LETTERS.map((l) => (
        <OptionButton key={l} letter={l} mode={mode} selected={sel.includes(l)} onSelect={() => onAnswer(pick(format, answer, l))}>
          <span className="sr-only">Option {l}</span>
        </OptionButton>
      ))}
    </OptionGroup>
  );
}
