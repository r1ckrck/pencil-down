import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PartAHub, type HubData } from "@/components/part-a/hub";
import type { Kind, Topic } from "@/components/part-a/types";
import { PageHeader } from "@/components/shell/page-header";
import { TOPICS } from "@/content/types";
import { catalog } from "@/engine/catalog";
import { today } from "@/engine/progress";
import { getSettings } from "@/engine/settings";
import { getCtx } from "@/server/api";

export const metadata: Metadata = { title: "Part A" };

async function Hub({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { topic } = await searchParams;
  await connection();
  const ctx = getCtx();
  const t = today(ctx);
  const cat = catalog(ctx);
  const settings = getSettings(ctx.db);
  const data: HubData = {
    defaultMode: cat.defaultMode,
    custom: settings.custom,
    budgets: settings.budgets,
    revisitDue: t.revisitDue,
    live: t.liveSession ? { id: t.liveSession.id, kind: t.liveSession.kind as Kind } : null,
    initialTopic: typeof topic === "string" && (TOPICS as string[]).includes(topic) ? (topic as Topic) : null,
    topics: cat.topics.map((x) => ({ topic: x.topic, eligible: x.eligible, unseen: x.unseen, generators: x.generators.length })),
    papers: cat.papers.filter((p) => p.exam === "CEED"),
  };
  return <PartAHub data={data} />;
}

export default function PartAPage(props: PageProps<"/part-a">) {
  return (
    <>
      <PageHeader eyebrow="Part A" index="01" title="Part A">
        Answer fast, skip without guilt, clear the cutoff. Target 60 of 150; the cutoff band sits at 48–54.
      </PageHeader>
      <Suspense fallback={<p className="font-mono text-label uppercase text-mute">Loading</p>}>
        <Hub searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
