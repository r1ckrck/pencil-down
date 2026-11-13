import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Journal } from "@/components/part-b/journal";
import { journalPhotos, reattempts } from "@/components/part-b/load";
import { PageHeader } from "@/components/shell/page-header";
import { today } from "@/engine/progress";
import { getSettings } from "@/engine/settings";
import { getCtx } from "@/server/api";

export const metadata: Metadata = { title: "Journal · Part B" };

const DAY_MS = 86_400_000;

async function Pages() {
  await connection();
  const ctx = getCtx();
  const now = ctx.now();
  const t = today(ctx);
  const due = reattempts(t.reattemptPromptIds).map((r) => ({
    promptId: r.promptId,
    title: r.title,
    slot: r.slot,
    sessionId: r.sessionId,
    daysAgo: Math.floor((now - r.lastAt) / DAY_MS),
  }));
  return (
    <Journal
      photos={journalPhotos()}
      reattempts={due}
      defaultMode={t.defaultMode}
      custom={getSettings(ctx.db).custom}
      locked={t.liveSession !== null}
    />
  );
}

export default function JournalPage() {
  return (
    <>
      <PageHeader eyebrow="Part B" index="02" title="Journal">
        Your pages by slot and date. Never scored: the record is for you to see how your decisions change.
      </PageHeader>
      <Suspense fallback={<p className="font-mono text-label uppercase text-mute">Loading</p>}>
        <Pages />
      </Suspense>
    </>
  );
}
