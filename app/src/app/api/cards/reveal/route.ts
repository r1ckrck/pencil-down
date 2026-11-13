import { reveal } from "@/engine/cards";
import { ApiError } from "@/engine/errors";
import { body, getCtx, handle } from "@/server/api";

export const POST = (req: Request) =>
  handle(async () => {
    const b = await body(req);
    if (typeof b.promptId !== "string") throw new ApiError(400, "promptId required");
    return { cards: await reveal(getCtx(), b.promptId) };
  });
