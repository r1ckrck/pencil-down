import { ArrowRight, Check, Minus, X } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow, RoleLabel } from "@/components/ui/label";
import { Metric, Stat } from "@/components/ui/stat";
import { cn } from "@/lib/cn";
import { PromptView } from "./prompt-view";
import { RevealPanel, type RevealCard } from "./reveal-card";
import { SLOT_NAME, mmss, type BResult } from "./types";

const CHECKS: { key: "rules" | "notObvious" | "drawable"; label: string }[] = [
  { key: "rules", label: "Obeys every rule" },
  { key: "notObvious", label: "Not my first obvious idea" },
  { key: "drawable", label: "Drawable in the time left" },
];

/** Five squares, filled up to the self-rating. Ink only: a self-rating is not right or wrong. */
function RatingBar({ name, value }: { name: string; value: number | null }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-hairline py-2 last:border-b-0">
      <span className="text-small text-fg">{name}</span>
      <span className="flex items-center gap-2">
        <span aria-hidden className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={cn("size-3 rounded-xs border", value !== null && i <= value ? "border-fg bg-fg" : "border-hairline")} />
          ))}
        </span>
        <span className="w-6 text-right font-mono text-caption text-mute">{value ?? "–"}</span>
      </span>
    </li>
  );
}

function CheckList({ checks }: { checks: Record<string, boolean | null> | null }) {
  if (!checks) return null;
  return (
    <ul className="flex flex-col">
      {CHECKS.map((c) => {
        const v = checks[c.key];
        const I = v === true ? Check : v === false ? X : Minus;
        return (
          <li key={c.key} className="flex items-center gap-3 py-1 text-small">
            <I size={16} weight="bold" aria-hidden className={v === null || v === undefined ? "text-mute" : "text-fg"} />
            <span className={v === null || v === undefined ? "text-mute" : "text-fg"}>{c.label}</span>
            <span className="sr-only">{v === true ? "yes" : v === false ? "no" : "not answered"}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Everything recorded for one slot. `stat` is set when this slot carries the screen's Stat. */
export function SlotSummary({
  r,
  deadline,
  stat,
  reveal,
  heading,
}: {
  r: BResult;
  deadline: number | null;
  stat: boolean;
  reveal: RevealCard[];
  heading?: string;
}) {
  const ratio = r.ideaCount ? `${r.distinctTags}/${r.ideaCount}` : "–";
  const committedIdea = r.ideas.find((i) => i.id === r.committedIdeaId);
  return (
    <section className="flex flex-col gap-8" data-testid={`slot-${r.pos}`}>
      {heading && <Eyebrow index={heading}>{SLOT_NAME[r.slot]}</Eyebrow>}
      {stat ? (
        <Stat
          label="Seconds to commit"
          value={r.secondsToCommit !== null ? mmss(r.secondsToCommit) : "–"}
          unit={r.secondsToCommit !== null ? `${r.secondsToCommit} s` : undefined}
          size="lg"
          accent
          note={
            r.status === "abandoned"
              ? "Abandoned before the commit point."
              : `Commit point ${deadline !== null ? mmss(deadline) : "–"}${r.autoCommitted ? " · the clock committed for you" : ""}`
          }
        />
      ) : null}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {!stat && <Metric value={mmss(r.secondsToCommit)} label="To commit" />}
        <Metric value={r.ideaCount} label="Ideas" />
        <Metric value={ratio} label="Distinct tags" />
        <Metric value={r.status === "abandoned" ? "–" : r.autoCommitted ? "Auto" : "Self"} label="Commit" tone={r.autoCommitted ? "mute" : "fg"} />
      </div>

      {r.status === "committed" && (
        <div className="flex flex-col gap-3 border-l-2 border-fg pl-4">
          <p className="font-mono text-label uppercase text-mute">
            Committed{committedIdea ? ` · idea ${String(committedIdea.n).padStart(2, "0")}` : ""}
          </p>
          <p className="text-lead text-fg">{r.label ?? "No label"}</p>
          <CheckList checks={r.checks} />
        </div>
      )}

      {r.ideas.some((i) => i.tag) && (
        <div className="flex flex-col gap-2">
          <Eyebrow>Idea tags</Eyebrow>
          <p className="flex flex-wrap gap-2">
            {r.ideas.map((i) =>
              i.tag ? (
                <span key={i.id} className="rounded-xs border border-hairline px-2 py-1 font-mono text-caption text-fg">
                  {i.tag}
                </span>
              ) : null,
            )}
          </p>
        </div>
      )}

      {r.prompt && (
        <div className="flex flex-col gap-1">
          <Eyebrow>Self-rating · trend only</Eyebrow>
          <ul>
            {r.prompt.criteria.map((c, ci) => (
              <RatingBar key={ci} name={c.name} value={r.ratings.find((x) => x.criterion === ci)?.value ?? null} />
            ))}
          </ul>
        </div>
      )}

      {r.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {r.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element -- user photo served by the API
            <img key={p.id} src={p.url} alt="Your page" className="aspect-[3/4] w-full rounded-md border border-hairline object-cover" />
          ))}
        </div>
      )}

      {r.prompt && reveal.length > 0 && <RevealPanel promptId={r.prompt.id} cards={reveal} />}

      {r.prompt && (
        <details className="group rounded-lg border border-hairline">
          <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-4 px-4 text-small font-medium text-fg">
            The prompt · {r.prompt.title}
            <ArrowRight size={16} weight="duotone" aria-hidden className="shrink-0 transition-transform group-open:rotate-90" />
          </summary>
          <div className="border-t border-hairline p-4 md:p-6">
            <PromptView prompt={r.prompt} showSlot={false} />
          </div>
        </details>
      )}
    </section>
  );
}

export function DebriefLink({ href }: { href: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-hairline p-4 sm:flex-row sm:items-center sm:justify-between">
      <RoleLabel>Tags and self-ratings are still open.</RoleLabel>
      <Link href={href} className={buttonClasses({ variant: "quiet" })}>
        Finish the debrief
      </Link>
    </div>
  );
}
