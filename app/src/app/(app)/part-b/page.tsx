import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PartBHub } from "@/components/part-b/hub";
import { journalPhotos } from "@/components/part-b/load";
import { PageHeader } from "@/components/shell/page-header";
import { catalog } from "@/engine/catalog";
import { today } from "@/engine/progress";
import { getSettings } from "@/engine/settings";
import { getCtx } from "@/server/api";

export const metadata: Metadata = { title: "Part B" };

async function Hub() {
  await connection();
  const ctx = getCtx();
  const t = today(ctx);
  const cat = catalog(ctx);
  return (
    <PartBHub
      data={{
        defaultMode: cat.defaultMode,
        custom: getSettings(ctx.db).custom,
        live: t.liveSession ? { id: t.liveSession.id, kind: t.liveSession.kind } : null,
        leastPractised: t.suggested.partBSlot,
        slots: cat.slots,
        bPapers: cat.bPapers,
        playbooks: cat.playbooks,
        reattempts: t.reattemptPromptIds.length,
        photos: journalPhotos().length,
      }}
    />
  );
}

export default function PartBPage() {
  return (
    <>
      <PageHeader eyebrow="Part B" index="02" title="Part B">
        Read once, decide fast, commit, then draw. The paper does the drawing; this is the coach and the clock.
      </PageHeader>
      <Suspense fallback={<p className="font-mono text-label uppercase text-mute">Loading</p>}>
        <Hub />
      </Suspense>
    </>
  );
}
