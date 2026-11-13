import type { NextRequest } from "next/server";
import { history } from "@/engine/progress";
import { getCtx, handle } from "@/server/api";

export const GET = (req: NextRequest) =>
  handle(() => ({ sessions: history(getCtx(), req.nextUrl.searchParams.get("mode") ?? undefined) }));
