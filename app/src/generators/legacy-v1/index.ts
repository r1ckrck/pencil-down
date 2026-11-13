// Frozen copy of the generators as first shipped. Used only to replay generated questions served before
// served-question snapshots existed (engine/selection.ts regenerate fallback). Never edit; never select from.
import type { Generator } from "@/content/types";
import { FLAT_GENERATORS } from "./flat";
import { SOLID_GENERATORS } from "./solid";

export const LEGACY_V1_GENERATORS: Generator[] = [...FLAT_GENERATORS, ...SOLID_GENERATORS];
