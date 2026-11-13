import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { photosDir } from "@/db/db";
import { ApiError } from "@/engine/errors";
import { addPhoto, attemptForPhoto } from "@/engine/session";
import { partBResults } from "@/engine/view";
import { type IdCtx, getCtx, handle, idOf, intParam } from "@/server/api";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };
const MAX_BYTES = 15 * 1024 * 1024;

// multipart/form-data: pos (number), file (image)
export const POST = (req: Request, c: IdCtx) =>
  handle(async () => {
    const ctx = getCtx();
    const id = await idOf(c);
    const form = await req.formData().catch(() => {
      throw new ApiError(400, "multipart/form-data body required");
    });
    const pos = intParam(form.get("pos"), "pos");
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "file required");
    const ext = EXT[file.type];
    if (!ext) throw new ApiError(415, "photo must be jpeg, png, webp or heic");
    if (file.size > MAX_BYTES) throw new ApiError(413, "photo larger than 15 MB");
    const attempt = attemptForPhoto(ctx, id, pos); // checks the debrief is open before writing
    const name = `s${id}-a${attempt.id}-${ctx.now()}.${ext}`;
    writeFileSync(join(photosDir(), name), Buffer.from(await file.arrayBuffer()));
    const photoId = addPhoto(ctx, id, pos, name, file.type);
    return { photoId, url: `/api/photos/${photoId}`, partB: partBResults(ctx, id) };
  });
