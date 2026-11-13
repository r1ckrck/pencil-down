// Server-side reads for the Part A screens: the same engine read models the API routes return.
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { MarkScheme } from "@/content/types";
import { ApiError } from "@/engine/errors";
import { getSession } from "@/engine/session";
import { results, sessionState } from "@/engine/view";
import { getCtx } from "@/server/api";
import type { SessionState } from "./types";

export async function sessionId(params: Promise<{ id: string }>): Promise<number> {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  return id;
}

function orNotFound<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

type Config = { scheme: MarkScheme; paperId?: string; topic?: string | null; format?: string | null };

function paperExtras(paperId: string | undefined) {
  const { content } = getCtx();
  const paper = paperId ? content.paperById.get(paperId) : undefined;
  const animatedIds = paper ? paper.questionIds.filter((q) => content.questionById.get(q)?.animated) : [];
  return { paperLabel: paper?.label ?? null, animatedIds };
}

/** Live state plus what the runner needs that the state does not carry (scheme, animated stills, paper label). */
export async function liveSession(id: number) {
  await connection();
  const ctx = getCtx();
  const state = orNotFound(() => sessionState(ctx, id)) as unknown as SessionState;
  const config = getSession(ctx.db, id).config as Config;
  return { state, scheme: config.scheme, ...paperExtras(config.paperId) };
}

export async function sessionResults(id: number) {
  await connection();
  const ctx = getCtx();
  const r = orNotFound(() => results(ctx, id));
  const config = getSession(ctx.db, id).config as Config;
  return {
    results: r,
    animatedIds: paperExtras(config.paperId).animatedIds,
    drill: { topic: config.topic ?? null, format: config.format ?? null },
  };
}
