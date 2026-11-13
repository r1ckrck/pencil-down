"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Eyebrow, RoleLabel } from "@/components/ui/label";
import type { Playbook, Slot } from "@/content/types";
import type { Mode, Switches } from "@/engine/modes";
import { slotScript } from "@/engine/partb";
import { cn } from "@/lib/cn";
import { sessionHref } from "./api";
import { BStartDialog } from "./start-dialog";
import { KIND_NAME, PHASE_NAME, SLOT_NAME } from "./types";

export type BHubData = {
  defaultMode: Mode;
  custom: Switches;
  live: { id: number; kind: string } | null;
  leastPractised: Slot;
  slots: { slot: Slot; prompts: number; unseen: number }[];
  bPapers: { id: string; year: number; label: string; durationMin: number; sittings: number }[];
  playbooks: Playbook[];
  reattempts: number;
  photos: number;
};

function Section({ index, title, note, id, children }: { index: string; title: string; note: ReactNode; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-8 gap-4 border-t border-hairline py-8 first:border-t-0 first:pt-0 md:grid-cols-[200px_1fr] md:gap-8">
      <div className="flex flex-col gap-2">
        <Eyebrow index={index}>{title}</Eyebrow>
        <RoleLabel>{note}</RoleLabel>
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  );
}

/** "Read 0–2 · Generate 2–4 · Commit 4–5 · …" from the engine's own slot script. */
function scriptLine(slot: Slot): string {
  const merged: { phase: string; from: number; to: number }[] = [];
  for (const p of slotScript(slot)) {
    const last = merged.at(-1);
    if (last && last.phase === p.phase) last.to = p.to;
    else merged.push({ phase: p.phase, from: p.from, to: p.to });
  }
  return merged.map((p) => `${PHASE_NAME[p.phase]} ${p.from / 60}–${p.to / 60}`).join(" · ");
}

function RowLink({ href, title, meta }: { href: string; title: ReactNode; meta?: ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex min-h-touch items-center justify-between gap-4 border-b border-hairline py-3 last:border-b-0 hover:bg-tint"
    >
      <span className="flex min-w-0 flex-col">
        <span className="text-body text-fg">{title}</span>
        {meta && <span className="truncate text-caption text-mute">{meta}</span>}
      </span>
      <ArrowRight size={18} weight="duotone" aria-hidden className="shrink-0 text-mute group-hover:text-fg" />
    </Link>
  );
}

export function PartBHub({ data }: { data: BHubData }) {
  const [slot, setSlot] = useState<Slot | "least">("least");
  const locked = data.live !== null;
  const start = { defaultMode: data.defaultMode, custom: data.custom };
  const chosen = slot === "least" ? data.leastPractised : slot;
  const book = data.playbooks.find((p) => p.slot === chosen);

  const chip = (selected: boolean) =>
    cn(
      "inline-flex min-h-touch items-center gap-2 rounded-sm border px-3 text-small font-medium",
      "transition-colors duration-(--dur-fast) ease-measured disabled:opacity-40",
      selected ? "border-fg bg-fg text-on-fg" : "border-hairline text-fg hover:border-fg",
    );

  return (
    <div className="flex flex-col">
      {data.live && (
        <div className="mb-8 flex flex-col gap-4 rounded-lg border border-fg p-4 sm:flex-row sm:items-center sm:justify-between md:p-6">
          <div>
            <p className="text-body font-medium text-fg">A {(KIND_NAME[data.live.kind] ?? "session").toLowerCase()} is running.</p>
            <p className="text-small text-mute">The clock has not stopped. New sessions wait until it ends.</p>
          </div>
          <Link href={sessionHref(data.live.id, data.live.kind)} className={buttonClasses({ variant: "primary", size: "lg" })}>
            Return to session
            <ArrowRight weight="bold" aria-hidden />
          </Link>
        </div>
      )}

      <Section index="01" title="Single drill" note="One slot, 24 minutes, one commit.">
        <div role="radiogroup" aria-label="Slot" className="flex flex-wrap gap-2">
          <button type="button" role="radio" aria-checked={slot === "least"} className={chip(slot === "least")} onClick={() => setSlot("least")}>
            Least practised
            <span className="font-mono text-label opacity-70">{SLOT_NAME[data.leastPractised]}</span>
          </button>
          {data.slots.map((s) => (
            <button
              key={s.slot}
              type="button"
              role="radio"
              aria-checked={slot === s.slot}
              disabled={s.prompts === 0}
              className={chip(slot === s.slot)}
              onClick={() => setSlot(s.slot)}
            >
              {SLOT_NAME[s.slot]}
              <span className="font-mono text-label opacity-70">{s.unseen}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {book && <p className="text-lead text-fg">Decide: {book.decision.toLowerCase()}</p>}
          <p className="font-mono text-caption text-mute">{scriptLine(chosen)}</p>
        </div>
        <BStartDialog
          title={`Drill · ${SLOT_NAME[chosen]}`}
          summary={`24 min · ${scriptLine(chosen)}`}
          request={slot === "least" ? { kind: "b-drill" } : { kind: "b-drill", slot }}
          trigger={
            <Button variant={locked ? "quiet" : "primary"} size="lg" disabled={locked} className="self-start">
              Start drill
            </Button>
          }
          {...start}
        />
      </Section>

      <Section index="02" title="Full paper" note="The real 120 minutes. Commit screens fire at each slot's commit point.">
        <div className="flex flex-col gap-1">
          <p className="text-lead text-fg">Part B mock · 120 min</p>
          <p className="font-mono text-caption text-mute">read all 6 · 5 × 22 with hard stamps · final buffer 4</p>
        </div>
        <BStartDialog
          title="Part B mock"
          summary="120 min · read all 6 · five blocks of 22 · final buffer 4"
          request={{ kind: "b-mock" }}
          trigger={
            <Button size="lg" disabled={locked} className="self-start">
              Start mock
            </Button>
          }
          {...start}
        />
        <div className="flex flex-col gap-1 border-t border-hairline pt-6">
          <p className="text-lead text-fg">Full exam · 3 hours</p>
          <p className="font-mono text-caption text-mute">Part A mock 60 → lock → Part B mock 120 · mirrors 17 Jan</p>
        </div>
        <BStartDialog
          title="Full exam"
          summary="180 min · Part A mock 60 min, then Part B mock 120 min, no break"
          request={{ kind: "full" }}
          trigger={
            <Button size="lg" disabled={locked} className="self-start">
              Start full exam
            </Button>
          }
          {...start}
        />
      </Section>

      <Section index="03" title="Past papers" note="Opt-in. One real year's five questions as printed, in printed order.">
        {data.bPapers.length ? (
          <ul className="flex flex-col">
            {data.bPapers.map((p) => {
              const retake = p.sittings > 0;
              return (
                <li key={p.id} className="flex items-center justify-between gap-4 border-b border-hairline py-3 first:pt-0 last:border-b-0">
                  <div className="flex min-w-0 flex-col">
                    <p className="text-body font-medium text-fg">
                      {p.label}
                      {retake && <span className="ml-2 font-mono text-label uppercase text-mute">sat {p.sittings}×</span>}
                    </p>
                    <p className="font-mono text-caption text-mute">{p.durationMin} min · 5 questions</p>
                  </div>
                  <BStartDialog
                    title={retake ? `${p.label} · retake` : p.label}
                    summary={`${p.durationMin} min · that year's five questions and criteria`}
                    request={{ kind: "b-past-paper", bPaperId: p.id }}
                    trigger={
                      <Button disabled={locked} className="shrink-0">
                        {retake ? "Retake" : "Sit paper"}
                      </Button>
                    }
                    {...start}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-small text-mute">No past papers in the pool.</p>
        )}
      </Section>

      <Section index="04" title="Playbooks" note="One per slot: the decision, the minute script, the traps.">
        <div className="flex flex-col">
          {data.playbooks.map((p) => (
            <RowLink key={p.slot} href={`/part-b/playbooks#${p.slot}`} title={SLOT_NAME[p.slot]} meta={`Decide: ${p.decision}`} />
          ))}
        </div>
      </Section>

      <Section index="05" title="Journal" note="Your pages by slot and date. Never scored.">
        <div className="flex flex-col">
          <RowLink
            href="/part-b/journal"
            title="Open journal"
            meta={
              data.reattempts > 0
                ? `${data.reattempts} ${data.reattempts === 1 ? "prompt" : "prompts"} due for a re-attempt`
                : `${data.photos} ${data.photos === 1 ? "photo" : "photos"}`
            }
          />
        </div>
      </Section>
    </div>
  );
}
