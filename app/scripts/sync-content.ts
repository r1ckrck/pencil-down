// Copies image assets from /content into public/content so Next serves them statically.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const src = join(root, "content");
const dest = join(import.meta.dirname, "..", "public", "content");

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const area of ["part-a", "part-b", "cards"]) {
  for (const dir of ["images"]) {
    const from = join(src, area, dir);
    if (existsSync(from)) cpSync(from, join(dest, area, dir), { recursive: true });
  }
}
console.log("content images synced");
