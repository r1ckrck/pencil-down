import type { Generator } from "@/content/types";
import { foldPunchUnfold } from "./fold-punch-unfold";
import { matrixCompletion } from "./matrix-completion";
import { mirrorWaterImage } from "./mirror-water-image";
import { rotation2d } from "./rotation-2d";
import { transparentOverlay } from "./transparent-overlay";

export const FLAT_GENERATORS: Generator[] = [foldPunchUnfold, rotation2d, mirrorWaterImage, matrixCompletion, transparentOverlay];
