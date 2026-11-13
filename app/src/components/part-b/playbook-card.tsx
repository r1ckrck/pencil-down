import { Eyebrow, RoleLabel } from "@/components/ui/label";
import type { Playbook } from "@/content/types";
import { SLOT_NAME } from "./types";

/** One slot's playbook: the decision, the minute script, the failure modes, the criteria. Static. */
export function PlaybookCard({ book, index }: { book: Playbook; index: string }) {
  return (
    <article id={book.slot} className="flex scroll-mt-8 flex-col gap-8 rounded-lg border border-hairline p-4 md:p-8">
      <header className="flex flex-col gap-2">
        <Eyebrow index={index}>{SLOT_NAME[book.slot]}</Eyebrow>
        <h2 className="text-heading font-medium">{book.name}</h2>
      </header>

      <section className="flex flex-col gap-1">
        <Eyebrow>The decision</Eyebrow>
        <p className="text-lead text-fg">{book.decision}</p>
      </section>

      <section className="flex flex-col gap-2">
        <Eyebrow>Minute script</Eyebrow>
        <ol className="flex flex-col">
          {book.script.map((s, i) => (
            <li key={i} className="grid grid-cols-[56px_1fr] gap-x-3 gap-y-1 border-b border-hairline py-3 last:border-b-0 md:grid-cols-[72px_112px_1fr]">
              <span className="font-mono text-caption leading-6 text-mute">
                {s.from}–{s.to}
              </span>
              <span className="text-body font-medium text-fg">{s.phase}</span>
              <span className="col-start-2 text-small text-fg md:col-start-3 md:row-start-1">{s.doThis}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <Eyebrow>Failure modes</Eyebrow>
          <ul className="flex flex-col gap-2">
            {book.failureModes.map((f, i) => (
              <li key={i} className="flex gap-3 text-small text-fg">
                <span aria-hidden className="mt-2 h-px w-3 shrink-0 bg-fg" />
                {f}
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <Eyebrow>Criteria</Eyebrow>
          <ol className="flex flex-col gap-2">
            {book.criteria.map((c, i) => (
              <li key={i} className="flex gap-3 text-small text-fg">
                <span className="w-6 shrink-0 font-mono text-caption text-mute">{String(i + 1).padStart(2, "0")}</span>
                {c}
              </li>
            ))}
          </ol>
          <RoleLabel>Self-rated 0–5 in every debrief.</RoleLabel>
        </section>
      </div>
    </article>
  );
}
