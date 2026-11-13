// Structural and cross-reference checks for everything under content/. Returns a list of problems.
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { asArray, matchingFiles, readBanned, readJson } from "./load";
import { OPTIONS, SLOTS, TOPICS } from "./types";
import type { Answer, Format, MarkScheme } from "./types";

type Rec = Record<string, unknown>;

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const FORMATS: Format[] = ["NAT", "MSQ", "MCQ"];
const CATEGORIES = [
  "art-movement",
  "indian-painting",
  "indian-dance",
  "indian-monument",
  "craft-process",
  "anthropometry",
  "gestalt",
  "ui-component",
  "design-icon",
  "indian-design-history",
  "colour-and-type",
];

export function bannedMatcher(terms: string[]): (text: string) => string[] {
  const res = terms.map((t) => ({
    t,
    re: new RegExp(`(?<![\\p{L}\\p{N}])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu"),
  }));
  return (text) => res.filter(({ re }) => re.test(text)).map(({ t }) => t);
}

export function simpleAnswerProblems(a: unknown, format: Format): string[] {
  const x = a as Rec;
  if (!x || x.kind !== format) return [`answer kind must be ${format}`];
  if (format === "MCQ") return OPTIONS.includes(x.option as never) ? [] : ["MCQ option must be A–D"];
  if (format === "MSQ") {
    const o = x.options;
    if (!Array.isArray(o) || o.length < 1 || o.length > 4) return ["MSQ must have 1–4 correct options"];
    if (!o.every((v) => OPTIONS.includes(v))) return ["MSQ options must be A–D"];
    if (new Set(o).size !== o.length) return ["MSQ options repeat"];
    if ([...o].sort().join() !== o.join()) return ["MSQ options must be sorted"];
    return [];
  }
  if (!isNum(x.min) || !isNum(x.max)) return ["NAT min/max must be numbers"];
  return x.min <= x.max ? [] : ["NAT min > max"];
}

export function answerProblems(a: unknown, format: Format): string[] {
  const x = a as Rec;
  if (x?.kind === "DROPPED") return isNum(x.marks) ? [] : ["DROPPED needs numeric marks"];
  if (x?.kind === "ANY") {
    if (!Array.isArray(x.of) || x.of.length < 2) return ["ANY needs ≥ 2 alternatives"];
    return x.of.flatMap((alt: unknown, i: number) => simpleAnswerProblems(alt, format).map((p) => `ANY[${i}]: ${p}`));
  }
  return simpleAnswerProblems(a, format);
}

function schemeProblems(s: unknown): string[] {
  const x = s as MarkScheme;
  const out: string[] = [];
  for (const f of FORMATS) {
    const e = x?.[f] as Rec | undefined;
    if (!e || !isNum(e.correct) || !isNum(e.wrong)) out.push(`scheme.${f} needs numeric correct/wrong`);
  }
  if (x?.MSQ && typeof (x.MSQ as Rec).partial !== "boolean") out.push("scheme.MSQ.partial must be boolean");
  return out;
}

function maxMarks(answer: Answer, format: Format, scheme: MarkScheme): number {
  return answer.kind === "DROPPED" ? answer.marks : scheme[format].correct;
}

export function validateContent(dir: string): string[] {
  const problems: string[] = [];
  const err = (where: string, msg: string) => problems.push(`${where}: ${msg}`);
  const banned = bannedMatcher(readBanned(dir));
  const load = (sub: string, prefix: string): { file: string; rec: Rec }[] =>
    matchingFiles(join(dir, sub), prefix).flatMap((f) => {
      try {
        return asArray<Rec>(readJson(f), f).map((rec) => ({ file: `${sub}/${basename(f)}`, rec }));
      } catch (e) {
        err(`${sub}/${basename(f)}`, (e as Error).message);
        return [];
      }
    });
  const uniq = (items: { file: string; rec: Rec }[], what: string) => {
    const seen = new Set<string>();
    for (const { file, rec } of items) {
      if (!isStr(rec.id)) err(file, `${what} without id`);
      else if (seen.has(rec.id)) err(file, `duplicate ${what} id ${rec.id}`);
      else seen.add(rec.id);
    }
  };

  // ---------- Part A questions ----------
  const questions = load("part-a", "questions");
  uniq(questions, "question");
  const qById = new Map(questions.map(({ rec }) => [rec.id as string, rec]));
  for (const { file, rec: q } of questions) {
    const at = `${file} ${q.id}`;
    if (q.exam !== "CEED" && q.exam !== "UCEED") err(at, "exam must be CEED | UCEED");
    if (!isInt(q.year)) err(at, "year must be an integer");
    if (!isStr(q.paperId)) err(at, "paperId required");
    if (!isInt(q.qno)) err(at, "qno must be an integer");
    if (!FORMATS.includes(q.format as Format)) err(at, "format must be NAT | MSQ | MCQ");
    else answerProblems(q.answer, q.format as Format).forEach((p) => err(at, p));
    if (!isStr(q.image)) err(at, "image required");
    else if (!existsSync(join(dir, "part-a", q.image))) err(at, `image missing: part-a/${q.image}`);
    if (!isInt(q.imageWidth) || !isInt(q.imageHeight) || (q.imageWidth as number) <= 0 || (q.imageHeight as number) <= 0)
      err(at, "imageWidth/imageHeight must be positive integers");
    if (q.optionCount !== 4) err(at, "optionCount must be 4");
    if (q.answerStatus !== "official" && q.answerStatus !== "solved") err(at, "answerStatus must be official | solved");
    if (!TOPICS.includes(q.topic as never)) err(at, "topic not in the topic list");
    if (![1, 2, 3].includes(q.difficulty as number)) err(at, "difficulty must be 1–3");
    if (typeof q.animated !== "boolean") err(at, "animated must be boolean");
    if (q.explanation !== null && typeof q.explanation !== "string") err(at, "explanation must be string | null");
    if (q.excluded !== undefined && !(isStr(q.excluded) && q.excluded.trim()))
      err(at, "excluded must be a non-empty reason string");
    if (q.optionLabels !== undefined) {
      const l = q.optionLabels;
      if (!Array.isArray(l) || l.length !== 4 || !l.every((x) => isStr(x) && x.trim() === x && x.length <= 3))
        err(at, "optionLabels must be four short non-empty strings");
      else if (new Set(l.map((x: string) => x.toLowerCase())).size !== 4) err(at, "optionLabels repeat");
    }
  }

  // ---------- Part A papers ----------
  const papers = load("part-a", "papers");
  uniq(papers, "paper");
  for (const { file, rec: p } of papers) {
    const at = `${file} ${p.id}`;
    if (p.exam !== "CEED" && p.exam !== "UCEED") err(at, "exam must be CEED | UCEED");
    if (!isInt(p.year)) err(at, "year must be an integer");
    if (!isStr(p.label)) err(at, "label required");
    if (!isNum(p.durationMin) || (p.durationMin as number) <= 0) err(at, "durationMin must be positive");
    const sp = schemeProblems(p.scheme);
    sp.forEach((x) => err(at, x));
    if (!isNum(p.totalMarks)) err(at, "totalMarks must be a number");
    if (typeof p.pastPaperEligible !== "boolean") err(at, "pastPaperEligible must be boolean");
    if (p.cutoff !== null && !isNum(p.cutoff)) err(at, "cutoff must be number | null");
    if (!Array.isArray(p.questionIds) || !p.questionIds.length) {
      err(at, "questionIds must be a non-empty list");
      continue;
    }
    const ids = p.questionIds as string[];
    if (new Set(ids).size !== ids.length) err(at, "questionIds repeat");
    let sum = 0;
    let complete = true;
    for (const id of ids) {
      const q = qById.get(id);
      if (!q) {
        err(at, `question ${id} not found`);
        complete = false;
        continue;
      }
      if (q.paperId !== p.id) err(at, `question ${id} has paperId ${q.paperId}`);
      if (!sp.length && FORMATS.includes(q.format as Format)) sum += maxMarks(q.answer as Answer, q.format as Format, p.scheme as MarkScheme);
    }
    if (p.pastPaperEligible && complete && !sp.length && Math.abs(sum - (p.totalMarks as number)) > 1e-6)
      err(at, `marks sum to ${sum}, printed total is ${p.totalMarks}`);
  }
  const paperIds = new Set(papers.map(({ rec }) => rec.id));
  for (const { file, rec: q } of questions) if (isStr(q.paperId) && !paperIds.has(q.paperId)) err(`${file} ${q.id}`, `paper ${q.paperId} not found`);

  // ---------- Part B prompts ----------
  const prompts = load("part-b", "prompts");
  uniq(prompts, "prompt");
  for (const { file, rec: p } of prompts) {
    const at = `${file} ${p.id}`;
    if (p.source !== "real" && p.source !== "authored") err(at, "source must be real | authored");
    if (p.source === "authored" && p.origin !== null) err(at, "authored prompts have origin null");
    if (p.source === "real") {
      const o = p.origin as Rec | null;
      if (!o || o.exam !== "CEED" || !isInt(o.year) || !isInt(o.qno) || !isStr(o.originalSection) || typeof o.adapted !== "boolean")
        err(at, "real prompts need origin { exam, year, qno, originalSection, adapted }");
    }
    if (!SLOTS.includes(p.slot as never)) err(at, "slot not in the slot list");
    if (!isStr(p.title)) err(at, "title required");
    if (!isStr(p.text)) err(at, "text required");
    if (!Array.isArray(p.rules) || !p.rules.every(isStr)) err(at, "rules must be a list of strings");
    const crit = p.criteria as Rec[] | undefined;
    if (!Array.isArray(crit) || !crit.length || !crit.every((c) => isStr(c.name) && isNum(c.marks)))
      err(at, "criteria must be a list of { name, marks }");
    else {
      const total = crit.reduce((s, c) => s + (c.marks as number), 0);
      if (total !== 20) err(at, `criteria sum to ${total}, not 20`);
    }
    const imgs = p.images as Rec[] | undefined;
    if (!Array.isArray(imgs)) err(at, "images must be a list");
    else
      for (const im of imgs) {
        if (!isStr(im.path) || typeof im.alt !== "string") err(at, "image needs path and alt");
        else if (!existsSync(join(dir, "part-b", im.path))) err(at, `image missing: part-b/${im.path}`);
      }
    if (!p.tags || typeof p.tags !== "object") err(at, "tags must be an object");
    const text = [p.title, p.text, ...((p.rules as string[]) ?? []), ...Object.values((p.tags as Rec) ?? {})].join("\n");
    const hits = banned(String(text));
    if (hits.length) err(at, `banned terms: ${hits.join(", ")}`);
  }
  const promptIds = new Set(prompts.map(({ rec }) => rec.id));

  // ---------- Part B papers ----------
  const bPapers = load("part-b", "papers");
  uniq(bPapers, "Part B paper");
  for (const { file, rec: p } of bPapers) {
    const at = `${file} ${p.id}`;
    if (!isInt(p.year)) err(at, "year must be an integer");
    if (!isStr(p.label)) err(at, "label required");
    if (!isNum(p.durationMin)) err(at, "durationMin must be a number");
    if (!Array.isArray(p.promptIds) || p.promptIds.length !== 5) err(at, "promptIds must list five prompts");
    for (const id of (p.promptIds as string[]) ?? []) if (!promptIds.has(id)) err(at, `prompt ${id} not found`);
  }

  // ---------- Cards ----------
  const cardsFile = join(dir, "cards", "cards.json");
  if (existsSync(cardsFile)) {
    let cards: Rec[] = [];
    try {
      cards = asArray<Rec>(readJson(cardsFile), cardsFile);
    } catch (e) {
      err("cards/cards.json", (e as Error).message);
    }
    uniq(cards.map((rec) => ({ file: "cards/cards.json", rec })), "card");
    for (const c of cards) {
      const at = `cards/cards.json ${c.id}`;
      if (!CATEGORIES.includes(c.category as string)) err(at, "category not in the category list");
      if (!["P1", "P2", "P3"].includes(c.priority as string)) err(at, "priority must be P1 | P2 | P3");
      const front = c.front as Rec | undefined;
      if (!front || !isStr(front.text)) err(at, "front.text required");
      if (front && front.image !== null) {
        if (!isStr(front.image)) err(at, "front.image must be a path or null");
        else if (!existsSync(join(dir, "cards", front.image))) err(at, `image missing: cards/${front.image}`);
        const cr = c.credit as Rec | null;
        // In-house SVG diagrams carry no credit; every sourced (raster) image must.
        const drawnInHouse = isStr(front.image) && front.image.endsWith(".svg");
        if (!drawnInHouse && (!cr || !isStr(cr.author) || !isStr(cr.licence) || !isStr(cr.sourceUrl))) err(at, "sourced image cards need credit { author, licence, sourceUrl }");
      }
      if (!isStr(c.back)) err(at, "back required");
      for (const id of (c.revealsPromptIds as string[] | undefined) ?? [])
        if (!promptIds.has(id)) err(at, `revealsPromptIds: prompt ${id} not found`);
      const hits = banned([front?.text, c.back].join("\n"));
      if (hits.length) err(at, `banned terms: ${hits.join(", ")}`);
    }
  }

  // ---------- Meta ----------
  const tw = join(dir, "meta", "topic-weights.json");
  if (existsSync(tw)) {
    const w = (readJson(tw) as Rec).weights as Record<string, unknown> | undefined;
    if (!w || !TOPICS.every((t) => isNum(w[t]))) err("meta/topic-weights.json", "weights needs a number for every topic");
    else {
      const sum = TOPICS.reduce((s, t) => s + (w[t] as number), 0);
      if (Math.abs(sum - 1) > 0.01) err("meta/topic-weights.json", `weights sum to ${sum.toFixed(3)}, not 1`);
    }
  }
  const pb = join(dir, "meta", "playbooks.json");
  if (existsSync(pb))
    for (const p of asArray<Rec>(readJson(pb), pb))
      if (!SLOTS.includes(p.slot as never) || !Array.isArray(p.script)) err("meta/playbooks.json", `bad playbook ${String(p.slot)}`);

  return problems;
}

