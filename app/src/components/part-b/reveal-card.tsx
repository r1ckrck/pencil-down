"use client";

import { Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { CardImage, type CardCredit } from "@/components/knowledge/card-image";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/label";
import { Markdown } from "@/lib/markdown";
import { postJSON } from "./api";

export type RevealCard = {
  id: string;
  front: { text: string; image: string | null };
  back: string;
  credit: CardCredit;
  inDeck: boolean;
};

/** "This was …": names the unnamed stimulus of this prompt, with the card and an add-to-review action. */
export function RevealPanel({ promptId, cards }: { promptId: string; cards: RevealCard[] }) {
  const [added, setAdded] = useState(cards.every((c) => c.inDeck));
  const [busy, setBusy] = useState(false);
  return (
    <section className="flex flex-col gap-6 rounded-lg border border-hairline p-4 md:p-6" data-testid="reveal">
      <Eyebrow>This was …</Eyebrow>
      {cards.map((c) => (
        <div key={c.id} className="grid gap-4 md:grid-cols-[minmax(0,240px)_1fr]">
          {c.front.image && <CardImage src={c.front.image} alt={c.front.text} credit={c.credit} />}
          <div className="flex flex-col gap-2">
            <p className="text-heading font-medium">{c.front.text}</p>
            <Markdown source={c.back} className="text-small text-fg" />
          </div>
        </div>
      ))}
      <Button
        icon={<Plus weight="bold" />}
        disabled={added || busy}
        className="self-start"
        onClick={async () => {
          setBusy(true);
          try {
            await postJSON("/api/cards/reveal", { promptId });
            setAdded(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        {added ? "In your review deck" : "Add to review"}
      </Button>
    </section>
  );
}
