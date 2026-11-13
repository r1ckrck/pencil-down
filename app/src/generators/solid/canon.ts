// Identity of an option independent of how it happens to be drawn, for "no two options alike" checks:
// voxel solids up to rotation, cube views up to turning the cube, nets up to rotation/reflection,
// orthographic views by what they draw, numbers by value.
import { cubeViewCanon, netCanon } from "./cube-net";
import { decodeView, signature } from "./ortho";
import { readData } from "./svg";
import { canonical, parseVoxels } from "./voxel";

export function canonicalOption(svg: string): string {
  const kind = readData(svg, "kind");
  switch (kind) {
    case "voxels":
      return `voxels:${canonical(parseVoxels(readData(svg, "voxels")))}`;
    case "cube":
      return `cube:${cubeViewCanon(readData(svg, "cube"))}`;
    case "net":
      return `net:${netCanon(readData(svg, "net").split(" ").map((t) => t.split(",").slice(0, 2).map(Number) as [number, number]))}`;
    case "view":
      return `view:${signature(decodeView(readData(svg, "view")))}`;
    case "number":
      return `number:${readData(svg, "value")}`;
    default:
      throw new Error(`unknown option kind ${kind}`);
  }
}
