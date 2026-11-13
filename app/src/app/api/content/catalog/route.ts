import { catalog } from "@/engine/catalog";
import { getCtx, handle } from "@/server/api";

export const GET = () => handle(() => catalog(getCtx()));
