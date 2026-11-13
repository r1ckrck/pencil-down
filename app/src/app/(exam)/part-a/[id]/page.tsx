import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sessionHref } from "@/components/part-a/labels";
import { PartARunner } from "@/components/part-a/part-a-runner";
import { liveSession, sessionId } from "@/components/part-a/server";

export const metadata: Metadata = { title: "Part A · live" };

async function Live({ params }: { params: Promise<{ id: string }> }) {
  const id = await sessionId(params);
  const { state, scheme, animatedIds, paperLabel } = await liveSession(id);
  const kind = state.session.kind;
  // The full exam embeds the runner in its own route.
  if (kind === "full" || !state.partA) redirect(sessionHref(kind, id));
  if (state.partA.closedAt !== null || state.session.status !== "live") redirect(`/part-a/results/${id}`);
  return (
    <PartARunner sessionId={id} initial={state} scheme={scheme} animatedIds={animatedIds} title={paperLabel ?? undefined} />
  );
}

export default function PartALivePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="font-mono text-label uppercase text-mute">Opening session</p>
        </div>
      }
    >
      <Live params={params} />
    </Suspense>
  );
}
