import { openEndPage } from "@/engine/session";
import { sessionState } from "@/engine/view";
import { type IdCtx, getCtx, handle, idOf } from "@/server/api";

export const POST = (_req: Request, c: IdCtx) =>
  handle(async () => {
    const ctx = getCtx();
    const id = await idOf(c);
    openEndPage(ctx, id);
    return sessionState(ctx, id);
  });
