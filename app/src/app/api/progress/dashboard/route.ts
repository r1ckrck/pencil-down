import type { NextRequest } from "next/server";
import { dashboard } from "@/engine/progress";
import { getCtx, handle } from "@/server/api";

export const GET = (req: NextRequest) => handle(() => dashboard(getCtx(), req.nextUrl.searchParams.get("mode") ?? undefined));
