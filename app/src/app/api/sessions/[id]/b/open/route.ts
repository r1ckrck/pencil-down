import { openQuestion } from "@/engine/session";
import { sessionState } from "@/engine/view";
import { type IdCtx, body, getCtx, handle, idOf, intParam } from "@/server/api";

export const POST = (req: Request, c: IdCtx) =>
  handle(async () => {
    const ctx = getCtx();
    const id = await idOf(c);
    const b = await body(req);
    openQuestion(ctx, id, intParam(b.pos, "pos"));
    return sessionState(ctx, id);
  });
