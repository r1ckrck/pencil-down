import { tagIdea } from "@/engine/session";
import { partBResults } from "@/engine/view";
import { type IdCtx, body, getCtx, handle, idOf, intParam } from "@/server/api";

export const POST = (req: Request, c: IdCtx) =>
  handle(async () => {
    const ctx = getCtx();
    const id = await idOf(c);
    const b = await body(req);
    tagIdea(ctx, id, intParam(b.ideaId, "ideaId"), typeof b.tag === "string" ? b.tag : null);
    return { partB: partBResults(ctx, id) };
  });
