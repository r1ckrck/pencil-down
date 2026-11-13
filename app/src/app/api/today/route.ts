import { today } from "@/engine/progress";
import { getCtx, handle } from "@/server/api";

export const GET = () => handle(() => today(getCtx()));
