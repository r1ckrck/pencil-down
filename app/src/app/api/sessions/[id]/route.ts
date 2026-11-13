import { sessionState } from "@/engine/view";
import { type IdCtx, getCtx, handle, idOf } from "@/server/api";

export const GET = (_req: Request, c: IdCtx) => handle(async () => sessionState(getCtx(), await idOf(c)));
