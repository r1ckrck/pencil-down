import { dueQueue } from "@/engine/cards";
import { getCtx, handle } from "@/server/api";

export const GET = () => handle(() => dueQueue(getCtx()));
