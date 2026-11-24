import { Eyebrow } from "@/components/ui/label";
import { Markdown } from "@/lib/markdown";
import { cn } from "@/lib/cn";
import { Stimulus } from "./stimulus";
import { SLOT_NAME, type Prompt } from "./types";

/**
 * The prompt as printed: text, stimuli, rules, criteria.
 * `compact` drops the stimuli and criteria (used for quiet reference while drawing).
 */
export function PromptView({
  prompt,
  index,
  compact = false,
  showSlot = true,
  className,
}: {
  prompt: Prompt;
  index?: string;
  compact?: boolean;
  showSlot?: boolean;
  className?: string;
}) {
  return (
    <article className={cn("flex flex-col gap-6", className)} data-testid="prompt">
      <header className="flex flex-col gap-2">
        {showSlot && (
          <Eyebrow index={index}>
            {SLOT_NAME[prompt.slot]}
            {prompt.year ? ` · CEED ${prompt.year}` : ""}
          </Eyebrow>
        )}
        <h2 className="text-heading font-medium">{prompt.title}</h2>
      </header>

      <Markdown source={prompt.text} className="max-w-prose text-lead" />

      {!compact && prompt.images.length > 0 && (
        <div className="flex flex-col gap-4">
          {prompt.images.map((im) => (
            <Stimulus key={im.url} url={im.url} alt={im.alt} />
          ))}
        </div>
      )}

      {prompt.rules.length > 0 && (
        <section className="flex flex-col gap-2">
          <Eyebrow>Rules</Eyebrow>
          <ul className="flex flex-col">
            {prompt.rules.map((r, i) => (
              <li key={i} className="flex gap-3 border-b border-hairline py-2 text-body last:border-b-0">
                <span className="w-6 shrink-0 font-mono text-caption leading-6 text-mute">{String(i + 1).padStart(2, "0")}</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!compact && <CriteriaList criteria={prompt.criteria} />}
    </article>
  );
}

export function CriteriaList({ criteria }: { criteria: Prompt["criteria"] }) {
  return (
    <section className="flex flex-col gap-2">
      <Eyebrow>Criteria</Eyebrow>
      <ul className="flex flex-col">
        {criteria.map((c, i) => (
          <li key={i} className="flex items-baseline justify-between gap-4 border-b border-hairline py-2 text-body last:border-b-0">
            <span>{c.name}</span>
            <span className="shrink-0 font-mono text-caption text-mute">{c.marks}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Hard mode outside the visible windows: a blank panel naming only the slot and the phase. */
/**
 * The prompt's place while it is hidden (question hiding on): which question and step this is,
 * and the Reread control, which says what it costs before she taps it.
 */
export function HiddenPrompt({
  slot,
  step,
  out,
  nextRereadS,
  rereadsLeft,
  busy,
  onReread,
  className,
}: {
  slot: Prompt["slot"];
  step: string;
  out: boolean;
  nextRereadS: number | null;
  rereadsLeft: number;
  busy?: boolean;
  onReread?: () => void;
  className?: string;
}) {
  return (
    <div
      data-testid="prompt-hidden"
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-hairline p-6 text-center",
        className,
      )}
    >
      <p className="text-body text-fg">{SLOT_NAME[slot]}</p>
      <p className="font-mono text-label uppercase text-mute">{step} · prompt hidden</p>
      {out ? (
        <p className="text-small text-mute">Out of time. Opening a question shows it for 15 s.</p>
      ) : nextRereadS !== null ? (
        <>
          <button
            type="button"
            onClick={onReread}
            disabled={busy}
            className="mt-2 inline-flex min-h-touch items-center rounded-sm border border-hairline px-4 text-small font-medium text-fg hover:border-fg hover:bg-tint disabled:opacity-40"
          >
            Reread · {nextRereadS} s
          </button>
          <p className="text-caption text-mute">
            {rereadsLeft} of 3 left. The time comes out of this question.
          </p>
        </>
      ) : (
        <p className="text-caption text-mute">No rereads left.</p>
      )}
    </div>
  );
}
