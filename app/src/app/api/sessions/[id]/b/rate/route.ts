import { selfRate } from "@/engine/session";
import { partBResults } from "@/engine/view";
import { type IdCtx, body, getCtx, handle, idOf, intParam } from "@/server/api";

export const POST = (req: Request, c: IdCtx) =>
  handle(async () => {
    const ctx = getCtx();
    const id = await idOf(c);
    const b = await body(req);
    selfRate(ctx, id, intParam(b.pos, "pos"), intParam(b.criterion, "criterion"), intParam(b.value, "value"));
    return { partB: partBResults(ctx, id) };
  });
