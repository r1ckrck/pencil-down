import { review } from "@/engine/cards";
import { ApiError } from "@/engine/errors";
import { body, getCtx, handle, intParam } from "@/server/api";

export const POST = (req: Request) =>
  handle(async () => {
    const b = await body(req);
    if (typeof b.cardId !== "string") throw new ApiError(400, "cardId required");
    return review(getCtx(), b.cardId, intParam(b.grade, "grade"));
  });
