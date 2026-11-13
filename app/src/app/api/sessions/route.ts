import type { CreateRequest } from "@/engine/session";
import { createSession } from "@/engine/session";
import { sessionState } from "@/engine/view";
import { body, getCtx, handle } from "@/server/api";

export const POST = (req: Request) =>
  handle(async () => {
    const ctx = getCtx();
    const s = createSession(ctx, (await body(req)) as unknown as CreateRequest);
    return sessionState(ctx, s.id);
  });
