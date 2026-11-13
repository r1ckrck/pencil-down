"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Eyebrow, RoleLabel } from "@/components/ui/label";
import type { Slot } from "@/content/types";
import { cn } from "@/lib/cn";
import type { JournalPhoto } from "./load";
import { SLOT_NAME } from "./types";

type Reattempt = { promptId: string; title: string; slot: Slot; sessionId: number; daysAgo: number };

const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** Photos of her pages, grouped by day, filterable by slot. Nothing here is scored. */
export function Journal({ photos, reattempts }: { photos: JournalPhoto[]; reattempts: Reattempt[] }) {
  const [slot, setSlot] = useState<Slot | "all">("all");
  const shown = photos.filter((p) => slot === "all" || p.slot === slot);
  const days = new Map<string, JournalPhoto[]>();
  for (const p of shown) {
    const d = dayFmt.format(new Date(p.at));
    days.set(d, [...(days.get(d) ?? []), p]);
  }
  const chip = (selected: boolean) =>
    cn(
      "inline-flex min-h-touch items-center gap-2 rounded-sm border px-3 text-small font-medium",
      "transition-colors duration-(--dur-fast) ease-measured",
      selected ? "border-fg bg-fg text-on-fg" : "border-hairline text-fg hover:border-fg",
    );
  const slots = Object.keys(SLOT_NAME) as Slot[];

  return (
    <div className="flex flex-col gap-12">
      {reattempts.length > 0 && (
        <section className="flex flex-col gap-3" data-testid="reattempts">
          <Eyebrow>Due for a re-attempt</Eyebrow>
          <RoleLabel>Same prompt, 10–14 days on. Re-read it, set a 24-minute clock on paper, then compare pages.</RoleLabel>
          <ul className="flex flex-col">
            {reattempts.map((r) => (
              <li key={r.promptId}>
                <Link
                  href={`/part-b/results/${r.sessionId}`}
                  className="group flex min-h-touch items-center justify-between gap-4 border-b border-hairline py-3 hover:bg-tint"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-body text-fg">{r.title}</span>
                    <span className="text-caption text-mute">
                      {SLOT_NAME[r.slot]} · last tried <span className="font-mono">{r.daysAgo}</span> days ago
                    </span>
                  </span>
                  <ArrowRight size={18} weight="duotone" aria-hidden className="shrink-0 text-mute group-hover:text-fg" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-6">
        <div role="radiogroup" aria-label="Slot" className="flex flex-wrap gap-2">
          <button type="button" role="radio" aria-checked={slot === "all"} className={chip(slot === "all")} onClick={() => setSlot("all")}>
            All
          </button>
          {slots.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={slot === s} className={chip(slot === s)} onClick={() => setSlot(s)}>
              {SLOT_NAME[s]}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="text-body text-mute">
            {photos.length === 0
              ? "No pages yet. In a debrief, photograph your page; it lands here."
              : "No pages for this slot yet."}
          </p>
        ) : (
          [...days.entries()].map(([day, list]) => (
            <div key={day} className="flex flex-col gap-3">
              <Eyebrow>{day}</Eyebrow>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((p) => (
                  <li key={p.id}>
                    <Link href={`/part-b/results/${p.sessionId}`} className="group flex flex-col gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- user photo served by the API */}
                      <img
                        src={p.url}
                        alt={`Page for ${p.title}`}
                        loading="lazy"
                        className="aspect-[3/4] w-full rounded-md border border-hairline object-cover group-hover:border-fg"
                      />
                      <span className="flex flex-col">
                        <span className="font-mono text-label uppercase text-mute">{SLOT_NAME[p.slot]}</span>
                        <span className="line-clamp-2 text-small text-fg">{p.label ?? p.title}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
