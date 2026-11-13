import { conflict, notFound } from "@/engine/errors";
import { promptPayload } from "@/engine/items";
import { liveSessionId, settle } from "@/engine/session";
import { getCtx, handle } from "@/server/api";

// Refuses prompts of the live session: during a session the prompt comes only through its state,
// which applies question hiding (no peek route).
export const GET = (_req: Request, c: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    const ctx = getCtx();
    const id = decodeURIComponent((await c.params).id);
    const p = ctx.content.promptById.get(id);
    if (!p) throw notFound("prompt");
    const live = liveSessionId(ctx.db);
    if (live !== null && settle(ctx, live).status === "live") {
      const inLive = ctx.db.prepare("SELECT 1 FROM b_attempts WHERE session_id = ? AND prompt_id = ?").get(live, id);
      if (inLive) throw conflict("prompt belongs to the live session");
    }
    return promptPayload(p);
  });
