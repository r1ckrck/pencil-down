import type { Format, Generator, Topic } from "@/content/types";
import { FLAT_GENERATORS } from "./flat";
import { SOLID_GENERATORS } from "./solid";

// Registry of every Part A generator.
// flat/  : 2D generators (folding, rotation, mirror, matrix, overlay)
// solid/ : 3D voxel generators (nets, rotation, views, counting, faces)
export const GENERATORS: Generator[] = [...FLAT_GENERATORS, ...SOLID_GENERATORS];

export function generatorsFor(topic: Topic, format: Format): Generator[] {
  return GENERATORS.filter((g) => !g.retired && g.topic === topic && g.formats.includes(format));
}
