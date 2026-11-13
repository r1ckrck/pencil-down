import type { Generator } from "@/content/types";
import { cubeNet } from "./cube-net";
import { cubesFromViews } from "./cubes-from-views";
import { isoToOrtho } from "./iso-to-ortho";
import { orthoToIso } from "./ortho-to-iso";
import { rotation3d } from "./rotation-3d";
import { visibleFaces } from "./visible-faces";

export const SOLID_GENERATORS: Generator[] = [cubeNet, rotation3d, cubesFromViews, isoToOrtho, orthoToIso, visibleFaces];
