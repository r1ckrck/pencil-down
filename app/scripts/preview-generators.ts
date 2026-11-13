// Writes an HTML contact sheet of generator samples for visual review.
// Usage: tsx scripts/preview-generators.ts <out.html> [generatorId] [seedsPerCell]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Difficulty } from "@/content/types";
import { FLAT_GENERATORS } from "@/generators/flat";

const out = process.argv[2] ?? "generator-preview.html";
const only = process.argv[3];
const perCell = Number(process.argv[4] ?? 2);
const tokens = readFileSync(join(import.meta.dirname, "..", "src", "styles", "tokens.css"), "utf8");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
let body = "";
for (const g of FLAT_GENERATORS) {
  if (only && g.id !== only) continue;
  body += `<h1>${g.id}</h1>`;
  for (const f of g.formats)
    for (const d of [1, 2, 3] as Difficulty[])
      for (let seed = 1; seed <= perCell; seed++) {
        const q = g.generate(seed, d, f);
        const key =
          q.answer.kind === "MCQ" ? q.answer.option : q.answer.kind === "MSQ" ? q.answer.options.join(",") : String(q.answer.min);
        body += `<section><div class="meta">${esc(q.id)} · answer ${key}</div><p>${esc(q.stem)}</p>`;
        body += `<div class="fig">${q.figure}</div>`;
        if (q.options)
          body += `<div class="opts">${q.options.map((o) => `<figure>${o.svg}<figcaption>${o.label}</figcaption></figure>`).join("")}</div>`;
        body += `<p class="exp">${esc(q.explanation)}</p></section>`;
      }
}

const html = `<!doctype html><meta charset="utf-8"><title>Generator preview</title>
<style>${tokens}
body { background: var(--bg); color: var(--fg); font-family: var(--font-body); margin: 24px; }
.soft { fill: color-mix(in srgb, currentColor 14%, transparent); }
.mute { color: var(--mute); }
section { display: inline-block; vertical-align: top; width: 620px; margin: 0 24px 32px 0; padding: 16px; border: 1px solid var(--hairline); }
.meta { font-family: var(--font-mono); font-size: 12px; color: var(--mute); }
p { font-size: 14px; margin: 6px 0 10px; }
.exp { font-size: 12px; color: var(--mute); }
.fig svg { width: 280px; display: block; margin: 0 auto 12px; }
.opts { display: flex; gap: 8px; }
figure { margin: 0; text-align: center; font-size: 12px; }
figure svg { width: 140px; display: block; border: 1px solid var(--hairline); }
</style>${body}`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`wrote ${out}`);
