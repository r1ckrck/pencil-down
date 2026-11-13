import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { photosDir } from "@/db/db";
import { notFound } from "@/engine/errors";
import { type IdCtx, getCtx, handle, idOf } from "@/server/api";

export const GET = (_req: Request, c: IdCtx) =>
  handle(async () => {
    const row = getCtx().db.prepare("SELECT path, mime FROM photos WHERE id = ?").get(await idOf(c)) as
      | { path: string; mime: string }
      | undefined;
    const file = row && join(photosDir(), row.path);
    if (!row || !file || !existsSync(file)) throw notFound("photo");
    return new Response(readFileSync(file), {
      headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=31536000, immutable" },
    });
  });
