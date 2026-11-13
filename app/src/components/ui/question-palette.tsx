"use client";

import { cn } from "@/lib/cn";

export type PaletteState = "unseen" | "answered" | "skipped" | "marked";

export type PaletteItem = {
  /** Display number, 1-based. */
  n: number;
  state: PaletteState;
};

const STATE_LABEL: Record<PaletteState, string> = {
  unseen: "not seen",
  answered: "answered",
  skipped: "skipped",
  marked: "marked for review",
};

/**
 * Rounded-square cell. Each state differs in shape language, not colour alone:
 *   unseen   hairline outline, mute number
 *   answered solid ink
 *   skipped  dashed ink outline
 *   marked   ink outline + corner flag
 *   current  heavier ring offset from the cell
 */
function cellClasses(state: PaletteState, current: boolean) {
  return cn(
    "relative flex aspect-square min-h-touch items-center justify-center rounded-xs border font-mono text-small",
    "transition-colors duration-(--dur-fast) ease-measured",
    state === "unseen" && "border-hairline text-mute hover:border-fg hover:text-fg",
    state === "answered" && "border-fg bg-fg text-on-fg",
    state === "skipped" && "border-dashed border-fg text-fg hover:bg-tint",
    state === "marked" && "border-fg text-fg hover:bg-tint",
    current && "outline-2 outline-offset-2 outline-fg outline-solid",
  );
}

function CornerFlag({ inverted }: { inverted?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("absolute top-[3px] right-[3px] size-1.5 rounded-none", inverted ? "bg-on-fg" : "bg-fg")}
    />
  );
}

/** Grid of question cells. Fills its container; cells never shrink below 44px. */
export function QuestionPalette({
  items,
  current,
  onSelect,
  className,
  "aria-label": ariaLabel = "Questions",
}: {
  items: PaletteItem[];
  /** Index into `items` of the question on screen. */
  current?: number;
  onSelect?: (index: number) => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
        {items.map((it, i) => {
          const isCurrent = i === current;
          return (
            <li key={it.n}>
              <button
                type="button"
                onClick={() => onSelect?.(i)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Question ${it.n}, ${STATE_LABEL[it.state]}`}
                className={cn(cellClasses(it.state, isCurrent), "w-full")}
              >
                {String(it.n).padStart(2, "0")}
                {it.state === "marked" && <CornerFlag />}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Key for the palette states, mono caption. */
export function PaletteLegend({ className }: { className?: string }) {
  const states: PaletteState[] = ["unseen", "answered", "skipped", "marked"];
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-2 text-caption text-mute", className)}>
      {states.map((s) => (
        <li key={s} className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "relative block size-3.5 rounded-xs border",
              s === "unseen" && "border-hairline",
              s === "answered" && "border-fg bg-fg",
              s === "skipped" && "border-dashed border-fg",
              s === "marked" && "border-fg",
            )}
          >
            {s === "marked" && <span className="absolute top-px right-px size-1 rounded-none bg-fg" />}
          </span>
          {STATE_LABEL[s]}
        </li>
      ))}
    </ul>
  );
}
