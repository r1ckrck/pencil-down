import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { sessionHref } from "@/components/part-b/api";
import { FullExam } from "@/components/part-b/full-exam";
import { loadSession } from "@/components/part-b/load";
import { getSession } from "@/engine/session";
import { getCtx } from "@/server/api";

export const metadata: Metadata = { title: "Full exam" };

async function Live({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = Number((await params).id);
  const data = loadSession(id);
  if (!data) notFound();
  const { kind } = data.state.session;
  if (kind !== "full") redirect(sessionHref(id, kind));
  const scheme = getSession(getCtx().db, id).config.scheme;
  return (
    <FullExam sessionId={id} initial={data.state} playbooks={data.playbooks} scheme={scheme} initialResults={data.results} />
  );
}

export default function FullExamPage({ params }: PageProps<"/exam/[id]">) {
  return (
    <Suspense fallback={<p className="p-8 text-center font-mono text-caption text-mute">Opening session…</p>}>
      <Live params={params} />
    </Suspense>
  );
}
