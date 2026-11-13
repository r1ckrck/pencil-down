// Route-handler glue: the shared engine context and JSON error handling.
import { randomInt } from "node:crypto";
import { connection } from "next/server";
import { getContent } from "@/content/load";
import { getDb } from "@/db/db";
import { ApiError } from "@/engine/errors";
import type { Ctx } from "@/engine/session";
import { backfillSnapshots } from "@/engine/snapshots";
import { GENERATORS } from "@/generators";

let backfilled = false;

export function getCtx(): Ctx {
  const db = getDb();
  if (!backfilled) {
    // Freeze every generated question served before snapshots existed (first request after start).
    backfillSnapshots(db, Date.now());
    backfilled = true;
  }
  return {
    db,
    content: getContent(),
    generators: GENERATORS,
    now: () => Date.now(),
    rand: () => randomInt(0, 2 ** 47) / 2 ** 47, // randomInt caps the range below 2^48
  };
}

// Runs a handler at request time (never prerendered) and maps engine errors to JSON responses.
export async function handle(fn: () => unknown | Promise<unknown>): Promise<Response> {
  await connection();
  try {
    const out = await fn();
    return out instanceof Response ? out : Response.json(out ?? { ok: true });
  } catch (e) {
    if (e instanceof ApiError) return Response.json({ error: e.message, ...e.extra }, { status: e.status });
    console.error(e);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    if (b && typeof b === "object" && !Array.isArray(b)) return b as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new ApiError(400, "JSON object body required");
}

export function intParam(v: unknown, name: string): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n)) throw new ApiError(400, `${name} must be an integer`);
  return n;
}

export type IdCtx = { params: Promise<{ id: string }> };

export async function idOf(c: IdCtx): Promise<number> {
  return intParam((await c.params).id, "id");
}
