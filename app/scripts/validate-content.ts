// pnpm validate:content — checks every content file against the contract. Exits 1 on any problem.
import { contentDir, loadContentFrom } from "../src/content/load";
import { validateContent } from "../src/content/validate";

const dir = contentDir();
const problems = validateContent(dir);
if (problems.length) {
  for (const p of problems) console.error(`✗ ${p}`);
  console.error(`\n${problems.length} problem(s) in ${dir}`);
  process.exit(1);
}
const c = loadContentFrom(dir);
console.log(
  `content ok: ${c.questions.length} questions, ${c.papers.length} papers, ${c.prompts.length} prompts, ` +
    `${c.bPapers.length} Part B papers, ${c.cards.length} cards`,
);
