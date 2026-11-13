import { tapIdea } from "@/engine/session";
import { sessionState } from "@/engine/view";
import { type IdCtx, body, getCtx, handle, idOf, intParam } from "@/server/api";

export const POST = (req: Request, c: IdCtx) =>
  handle(async () => {
    const ctx = getCtx();
    const id = await idOf(c);
    const b = await body(req);
    const idea = tapIdea(ctx, id, intParam(b.pos, "pos"));
    return { idea, state: sessionState(ctx, id) };
  });
