import { commit } from "@/engine/session";
import { sessionState } from "@/engine/view";
import { type IdCtx, body, getCtx, handle, idOf, intParam } from "@/server/api";

export const POST = (req: Request, c: IdCtx) =>
  handle(async () => {
    const ctx = getCtx();
    const id = await idOf(c);
    const b = await body(req);
    commit(ctx, id, intParam(b.pos, "pos"), {
      ideaId: b.ideaId == null ? null : intParam(b.ideaId, "ideaId"),
      label: typeof b.label === "string" ? b.label : undefined,
      checks: b.checks,
    });
    return sessionState(ctx, id);
  });
