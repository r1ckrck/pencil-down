import { notFound } from "@/engine/errors";
import { questionPayload } from "@/engine/items";
import { getCtx, handle } from "@/server/api";

// Display payload only; keys are revealed through session results.
export const GET = (_req: Request, c: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    const ctx = getCtx();
    const q = questionPayload(ctx.content, ctx.generators, decodeURIComponent((await c.params).id));
    if (!q) throw notFound("question");
    return q;
  });
