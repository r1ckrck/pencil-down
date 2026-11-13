import { starIdea } from "@/engine/session";
import { sessionState } from "@/engine/view";
import { type IdCtx, body, getCtx, handle, idOf, intParam } from "@/server/api";

export const POST = (req: Request, c: IdCtx) =>
  handle(async () => {
    const ctx = getCtx();
    const id = await idOf(c);
    const b = await body(req);
    starIdea(ctx, id, intParam(b.ideaId, "ideaId"), b.starred !== false);
    return sessionState(ctx, id);
  });
