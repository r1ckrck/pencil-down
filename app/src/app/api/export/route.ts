import { photosDir } from "@/db/db";
import { exportArchive } from "@/engine/export";
import { getCtx, handle } from "@/server/api";

export const GET = () =>
  handle(() => {
    const ctx = getCtx();
    const now = ctx.now();
    const stamp = new Date(now).toISOString().slice(0, 10);
    return new Response(new Uint8Array(exportArchive(ctx.db, photosDir(), now)), {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="pencil-down-${stamp}.tar.gz"`,
      },
    });
  });
