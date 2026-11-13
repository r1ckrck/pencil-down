import { ApiError } from "@/engine/errors";
import { getSettings, updateSettings } from "@/engine/settings";
import { body, getCtx, handle } from "@/server/api";

export const GET = () => handle(() => getSettings(getCtx().db));

export const PUT = (req: Request) =>
  handle(async () => {
    const patch = await body(req);
    try {
      return updateSettings(getCtx().db, patch);
    } catch (e) {
      throw new ApiError(400, (e as Error).message);
    }
  });
