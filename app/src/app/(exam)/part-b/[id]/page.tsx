import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { sessionHref } from "@/components/part-b/api";
import { loadSession } from "@/components/part-b/load";
import { PartBRunner } from "@/components/part-b/part-b-runner";

export const metadata: Metadata = { title: "Part B" };

async function Live({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = Number((await params).id);
  const data = loadSession(id);
  if (!data) notFound();
  const { kind } = data.state.session;
  if (!kind.startsWith("b-")) redirect(sessionHref(id, kind));
  return <PartBRunner sessionId={id} initial={data.state} playbooks={data.playbooks} initialResults={data.results} />;
}

export default function PartBSessionPage({ params }: PageProps<"/part-b/[id]">) {
  return (
    <Suspense fallback={<p className="p-8 text-center font-mono text-caption text-mute">Loading session…</p>}>
      <Live params={params} />
    </Suspense>
  );
}
