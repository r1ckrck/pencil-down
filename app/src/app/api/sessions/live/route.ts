import { liveSessionId, settle } from "@/engine/session";
import { sessionState } from "@/engine/view";
import { getCtx, handle } from "@/server/api";

export const GET = () =>
  handle(() => {
    const ctx = getCtx();
    const id = liveSessionId(ctx.db);
    if (id === null || settle(ctx, id).status !== "live") return { serverNow: ctx.now(), live: null };
    return { serverNow: ctx.now(), live: sessionState(ctx, id) };
  });
