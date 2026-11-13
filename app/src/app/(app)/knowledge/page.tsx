import type { Metadata } from "next";
import { CardBrowser, type BrowseCard } from "@/components/knowledge/card-browser";
import { DuePanel } from "@/components/knowledge/due-panel";
import { PageHeader } from "@/components/shell/page-header";
import { Panel } from "@/components/ui/panel";
import { getContent } from "@/content/load";

export const metadata: Metadata = { title: "Knowledge" };

// Card content is static (bundled pool), so the browse list renders into the static shell.
function browseCards(): BrowseCard[] {
  return getContent().cards.map((c) => ({
    id: c.id,
    category: c.category,
    priority: c.priority,
    front: { text: c.front.text, image: c.front.image ? `/content/cards/${c.front.image}` : null },
    back: c.back,
    credit: c.credit,
  }));
}

export default function KnowledgePage() {
  return (
    <>
      <PageHeader eyebrow="Knowledge" index="03" title="Knowledge">
        Image flashcards for the design-knowledge questions: movements, Indian art and craft, anthropometry, Gestalt, UI,
        icons. Review what is due; browse to read ahead.
      </PageHeader>
      <div className="flex flex-col gap-8">
        <DuePanel />
        <Panel label="Browse" index="02" aside="by category">
          <CardBrowser cards={browseCards()} />
        </Panel>
      </div>
    </>
  );
}
