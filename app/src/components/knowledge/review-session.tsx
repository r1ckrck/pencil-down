"use client";
import { sessionFetch } from "@/lib/session-fetch";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/label";
import { Panel, Rule } from "@/components/ui/panel";
import { Metric } from "@/components/ui/stat";
import { Markdown } from "@/lib/markdown";
import { cn } from "@/lib/cn";
import { CATEGORY_LABELS, CardImage, type CardCredit } from "./card-image";

type DueCard = {
  id: string;
  category: string;
  priority: "P1" | "P2" | "P3";
  front: { text: string; image: string | null };
  back: string;
  credit: CardCredit;
  isNew: boolean;
};

const GRADES = [
  { grade: 1, label: "Again", note: "forgot" },
  { grade: 2, label: "Hard", note: "slow recall" },
  { grade: 3, label: "Good", note: "recalled" },
  { grade: 4, label: "Easy", note: "instant" },
] as const;

function interval(days: number) {
  if (days < 1) return "later today";
  if (days === 1) return "tomorrow";
  if (days < 31) return `in ${days} days`;
  return `in ${Math.round(days / 30)} months`;
}

export function ReviewSession() {
  const [cards, setCards] = useState<DueCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tally, setTally] = useState<number[]>([0, 0, 0, 0]);
  const [last, setLast] = useState<string | null>(null);
  const gradesRef = useRef<HTMLDivElement>(null);

  // On a phone the grades sit below the fold once the back appears; bring them into reach.
  useEffect(() => {
    if (revealed) gradesRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [revealed]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await sessionFetch("/api/cards/due", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const d = (await r.json()) as { cards: DueCard[] };
      setCards(d.cards);
      setIndex(0);
      setRevealed(false);
    } catch {
      setError("Could not load cards. Check the connection and reload.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
  }, [load]);

  const card = cards?.[index] ?? null;

  const rate = useCallback(
    async (grade: number) => {
      if (!card || busy) return;
      setBusy(true);
      setError(null);
      try {
        const r = await sessionFetch("/api/cards/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card.id, grade }),
        });
        if (!r.ok) throw new Error();
        const d = (await r.json()) as { scheduledDays: number };
        setTally((t) => t.map((n, i) => (i === grade - 1 ? n + 1 : n)));
        setLast(`${GRADES[grade - 1].label} · next ${interval(d.scheduledDays)}`);
        setIndex((i) => i + 1);
        setRevealed(false);
      } catch {
        setError("That rating did not save. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [card, busy],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        if (t?.tagName === "BUTTON" || t?.tagName === "A") return;
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        rate(Number(e.key));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, rate]);

  if (error && !cards) return <p className="text-small text-mute">{error}</p>;
  if (!cards) return <p className="text-small text-mute" aria-busy>Loading cards…</p>;

  const reviewed = tally.reduce((a, b) => a + b, 0);

  if (!card) {
    return (
      <Panel label={reviewed ? "Session done" : "Nothing due"} index="01">
        <div className="flex flex-col gap-6">
          {reviewed ? (
            <>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {GRADES.map((g, i) => (
                  <Metric key={g.grade} value={tally[i]} label={g.label} />
                ))}
              </div>
              <p className="text-small text-mute">
                {reviewed} reviewed. Cards marked Again come back within minutes; check for them before you stop.
              </p>
            </>
          ) : (
            <p className="text-small text-mute">No cards are due and today’s new cards are done. Browse a category instead.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {reviewed > 0 && (
              <Button variant="primary" onClick={load}>
                Check for more
              </Button>
            )}
            <Link href="/knowledge" className={buttonClasses()}>
              Back to Knowledge
            </Link>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6" data-testid="review-card">
      <div className="flex items-baseline justify-between gap-4">
        <Eyebrow>
          {CATEGORY_LABELS[card.category] ?? card.category} · {card.priority}
          {card.isNew ? " · new" : ""}
        </Eyebrow>
        <p className="font-mono text-caption text-mute" aria-live="polite">
          {index + 1} / {cards.length}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {card.front.image && <CardImage src={card.front.image} alt={card.front.text} credit={card.credit} size={revealed ? "md" : "lg"} />}
        <p className="text-lead font-medium">{card.front.text}</p>
      </div>

      {revealed ? (
        <div className="flex flex-col gap-6">
          <Rule />
          <Markdown source={card.back} className="text-body" />
          <div className="flex flex-col gap-2">
            <div ref={gradesRef} role="group" aria-label="Rate your recall" className="grid scroll-mb-24 grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADES.map((g) => (
                <button
                  key={g.grade}
                  type="button"
                  disabled={busy}
                  onClick={() => rate(g.grade)}
                  className={cn(
                    buttonClasses({ size: "lg", className: "flex-col gap-0 py-2" }),
                    g.grade === 3 && "border-fg",
                  )}
                >
                  <span>{g.label}</span>
                  <span className="font-mono text-label tracking-normal text-mute">
                    {g.grade} · {g.note}
                  </span>
                </button>
              ))}
            </div>
            {error && <p className="text-caption text-bad">{error}</p>}
          </div>
        </div>
      ) : (
        <Button variant="primary" size="lg" block onClick={() => setRevealed(true)} hint="space">
          Show answer
        </Button>
      )}

      <p className="min-h-5 font-mono text-caption text-mute" aria-live="polite">
        {last ?? "Recall first, then reveal. Rate honestly: the schedule is only as good as the ratings."}
      </p>
    </div>
  );
}
