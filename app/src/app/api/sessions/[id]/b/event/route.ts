import { ApiError } from "@/engine/errors";
import { recordEvent } from "@/engine/session";
import { type IdCtx, body, getCtx, handle, idOf, intParam } from "@/server/api";

export const POST = (req: Request, c: IdCtx) =>
  handle(async () => {
    const ctx = getCtx();
    const id = await idOf(c);
    const b = await body(req);
    if (typeof b.type !== "string") throw new ApiError(400, "type must be a string");
    recordEvent(ctx, id, intParam(b.pos, "pos"), b.type, b.data);
    return { ok: true, serverNow: ctx.now() };
  });
