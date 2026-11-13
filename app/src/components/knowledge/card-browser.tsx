"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Markdown } from "@/lib/markdown";
import { cn } from "@/lib/cn";
import { CATEGORY_LABELS, CardImage, type CardCredit } from "./card-image";

export type BrowseCard = {
  id: string;
  category: string;
  priority: "P1" | "P2" | "P3";
  front: { text: string; image: string | null };
  back: string;
  credit: CardCredit;
};

type Priority = "all" | "P1" | "P2" | "P3";
const PAGE = 12;

/** Every card, by category, filterable by priority. Reading only; reviews happen in the session. */
export function CardBrowser({ cards }: { cards: BrowseCard[] }) {
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cards) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [cards]);

  const [category, setCategory] = useState<string>(categories[0]?.[0] ?? "");
  const [priority, setPriority] = useState<Priority>("all");
  const [limit, setLimit] = useState(PAGE);

  const shown = cards.filter((c) => c.category === category && (priority === "all" || c.priority === priority));

  if (!cards.length) return <p className="text-small text-mute">No cards in the content pool yet.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-2">
        {categories.map(([cat, n]) => {
          const on = cat === category;
          return (
            <button
              key={cat}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setCategory(cat);
                setLimit(PAGE);
              }}
              className={cn(
                "inline-flex min-h-touch items-center gap-2 rounded-sm border px-3 text-small transition-colors",
                on ? "border-fg bg-fg text-on-fg" : "border-hairline text-mute hover:border-fg hover:text-fg",
              )}
            >
              {CATEGORY_LABELS[cat] ?? cat}
              <span className="font-mono text-caption opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl<Priority>
          aria-label="Priority"
          value={priority}
          onValueChange={(v) => {
            setPriority(v);
            setLimit(PAGE);
          }}
          options={[
            { value: "all", label: "All" },
            { value: "P1", label: "P1", hint: "asked" },
            { value: "P2", label: "P2", hint: "likely" },
            { value: "P3", label: "P3", hint: "canon" },
          ]}
        />
        <p className="font-mono text-caption text-mute">{shown.length} cards</p>
      </div>

      {shown.length === 0 ? (
        <p className="text-small text-mute">No {priority} cards in this category. Pick another priority.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.slice(0, limit).map((c) => (
            <li key={c.id}>
              <BrowseItem card={c} />
            </li>
          ))}
        </ul>
      )}

      {shown.length > limit && (
        <Button onClick={() => setLimit((l) => l + PAGE)} className="self-center">
          Show more · {shown.length - limit}
        </Button>
      )}
    </div>
  );
}

function BrowseItem({ card }: { card: BrowseCard }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-hairline p-4">
      {card.front.image && <CardImage src={card.front.image} alt={card.front.text} credit={card.credit} />}
      <div className="flex items-start justify-between gap-3">
        <p className="text-body font-medium">{card.front.text}</p>
        <span className="shrink-0 font-mono text-caption text-mute">{card.priority}</span>
      </div>
      <div className="mt-auto flex flex-col gap-3">
        {open && <Markdown source={card.back} className="border-t border-hairline pt-3 text-small" />}
        <Button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="self-start">
          {open ? "Hide answer" : "Show answer"}
        </Button>
      </div>
    </article>
  );
}
