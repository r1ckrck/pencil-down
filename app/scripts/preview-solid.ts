// Sample sheet for the 3D generators: figure at ~280 px, options at ~140 px, answer underneath.
// Usage: pnpm exec tsx scripts/preview-solid.ts [outFile] [seedsPerCase]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { SOLID_GENERATORS } from "../src/generators/solid";

const out = process.argv[2] ?? "solid.html";
const perCase = Number(process.argv[3] ?? 2);
const only = process.argv[4];

let html = `<!doctype html><meta charset="utf-8"><title>Solid generators</title>
<style>
body{font:14px/1.4 system-ui,sans-serif;color:#1d1b18;background:#f6f2ea;margin:24px}
.q{background:#fffdf8;border:1px solid #ddd5c6;border-radius:8px;padding:16px;margin:0 0 16px;display:grid;grid-template-columns:300px 1fr;gap:16px;break-inside:avoid}
.id{font:12px ui-monospace,monospace;color:#7a7266;grid-column:1/-1}
.fig svg{width:280px;height:auto;max-height:300px}
.opts{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}
.opt{text-align:center}.opt svg{width:140px;height:auto;max-height:150px;display:block;border:1px solid #eee6d8;border-radius:6px}
.ok{outline:2px solid #3d7a4a}.ans{color:#3d7a4a;font-weight:600}
</style>`;
for (const g of SOLID_GENERATORS) {
  if (only && g.id !== only) continue;
  for (const f of g.formats)
    for (const d of [1, 2, 3] as const)
      for (let s = 0; s < perCase; s++) {
        const seed = 1000 + s * 7919 + d;
        const q = g.generate(seed, d, f);
        const key =
          q.answer.kind === "MCQ" ? [q.answer.option] : q.answer.kind === "MSQ" ? q.answer.options : [];
        html += `<div class="q"><div class="id">${q.id}</div><div class="fig">${q.figure}</div><div><p>${q.stem}</p>`;
        if (q.options)
          html += `<div class="opts">${q.options
            .map((o) => `<div class="opt"><div class="${key.includes(o.label) ? "ok" : ""}">${o.svg}</div>${o.label}</div>`)
            .join("")}</div>`;
        html += `<p class="ans">Answer: ${JSON.stringify(q.answer)}</p><p>${q.explanation}</p></div></div>`;
      }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`wrote ${out}`);
