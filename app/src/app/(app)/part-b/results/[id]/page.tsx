import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { sessionHref } from "@/components/part-b/api";
import { loadSession } from "@/components/part-b/load";
import { DebriefLink, SlotSummary } from "@/components/part-b/results-view";
import { KIND_NAME, SLOT_NAME, mmss } from "@/components/part-b/types";
import { PageHeader } from "@/components/shell/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/label";
import { Stat } from "@/components/ui/stat";
import { partBResults } from "@/engine/view";
import { getCtx } from "@/server/api";

export const metadata: Metadata = { title: "Part B results" };

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

async function Results({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = Number((await params).id);
  const data = loadSession(id);
  if (!data) notFound();
  const { state } = data;
  const { session } = state;
  if (session.status === "live") redirect(sessionHref(id, session.kind));
  const ctx = getCtx();
  const results = partBResults(ctx, id);
  if (!results) redirect(`/part-a/results/${id}`);

  const timeline = state.partB?.timeline;
  const inDeck = new Set(
    (ctx.db.prepare("SELECT card_id FROM card_reviews").all() as { card_id: string }[]).map((r) => r.card_id),
  );
  const revealFor = (ids: string[]) =>
    ids.flatMap((cid) => {
      const c = ctx.content.cards.find((x) => x.id === cid);
      return c
        ? [
            {
              id: c.id,
              front: { text: c.front.text, image: c.front.image ? `/content/cards/${c.front.image}` : null },
              back: c.back,
              credit: c.credit,
              inDeck: inDeck.has(c.id),
            },
          ]
        : [];
    });
  const deadline = (pos: number) => {
    const b = timeline?.blocks[pos];
    return b ? b.commitDeadline - b.start : null;
  };

  const single = results.length === 1;
  const kindName = KIND_NAME[session.kind] ?? "Part B";
  const title = single ? (results[0].prompt?.title ?? SLOT_NAME[results[0].slot]) : kindName;
  const debriefOpen = state.partB?.startedAt !== null && results.some((r) => r.ratings.length === 0 && r.status !== "abandoned");
  const stcs = results.map((r) => r.secondsToCommit).filter((s): s is number => s !== null);
  const med = median(stcs);

  return (
    <>
      <PageHeader
        eyebrow={`${kindName}${single ? ` · ${SLOT_NAME[results[0].slot]}` : ""}`}
        index="02"
        title={title}
        aside={
          <span>
            {dateFmt.format(new Date(session.startedAt))} · {session.mode}
            {session.status === "quit" ? " · quit" : ""}
            {session.retake ? " · retake" : ""}
          </span>
        }
      />

      <div className="flex flex-col gap-12">
        {debriefOpen && <DebriefLink href={sessionHref(id, session.kind)} />}

        {single ? (
          <SlotSummary r={results[0]} deadline={deadline(0)} stat reveal={revealFor(results[0].revealsCardIds)} />
        ) : (
          <>
            <Stat
              label="Median seconds to commit"
              value={med !== null ? mmss(med) : "–"}
              unit={med !== null ? `${med} s · ${stcs.length} of ${results.length} committed` : undefined}
              size="lg"
              accent
            />
            {session.kind === "full" && (
              <Link href={`/part-a/results/${id}`} className={buttonClasses({ className: "self-start" })}>
                Part A results
              </Link>
            )}
            {results.map((r) => (
              <div key={r.id} className="border-t border-hairline pt-8">
                <SlotSummary r={r} deadline={deadline(r.pos)} stat={false} heading={`Q${r.pos + 1}`} reveal={revealFor(r.revealsCardIds)} />
              </div>
            ))}
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href="/part-b" className={buttonClasses({ variant: "quiet" })}>
            Part B
          </Link>
          <Link href="/part-b/journal" className={buttonClasses({ variant: "quiet" })}>
            Journal
          </Link>
        </div>
      </div>
    </>
  );
}

export default function PartBResultsPage({ params }: PageProps<"/part-b/results/[id]">) {
  return (
    <Suspense fallback={<Eyebrow>Loading</Eyebrow>}>
      <Results params={params} />
    </Suspense>
  );
}
