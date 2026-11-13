// Server-only: reads the committed pool from content/ and caches it in memory.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type {
  Card,
  PartAPaper,
  PartAQuestion,
  PartBPaper,
  PartBPrompt,
  Playbook,
  TopicWeights,
} from "./types";

export interface Content {
  dir: string;
  questions: PartAQuestion[];
  papers: PartAPaper[];
  prompts: PartBPrompt[];
  bPapers: PartBPaper[];
  cards: Card[];
  topicWeights: TopicWeights | null;
  playbooks: Playbook[];
  meta: Record<string, unknown>; // every content/meta/*.json by basename
  banned: string[];
  questionById: Map<string, PartAQuestion>;
  paperById: Map<string, PartAPaper>;
  promptById: Map<string, PartBPrompt>;
  bPaperById: Map<string, PartBPaper>;
  cardById: Map<string, Card>;
}

export interface ContentParts {
  dir?: string;
  questions?: PartAQuestion[];
  papers?: PartAPaper[];
  prompts?: PartBPrompt[];
  bPapers?: PartBPaper[];
  cards?: Card[];
  topicWeights?: TopicWeights | null;
  playbooks?: Playbook[];
  meta?: Record<string, unknown>;
  banned?: string[];
}

const byId = <T extends { id: string }>(items: T[]) => new Map(items.map((i) => [i.id, i]));

export function buildContent(p: ContentParts): Content {
  const questions = p.questions ?? [];
  const papers = p.papers ?? [];
  const prompts = p.prompts ?? [];
  const bPapers = p.bPapers ?? [];
  const cards = p.cards ?? [];
  return {
    dir: p.dir ?? "",
    questions,
    papers,
    prompts,
    bPapers,
    cards,
    topicWeights: p.topicWeights ?? null,
    playbooks: p.playbooks ?? [],
    meta: p.meta ?? {},
    banned: p.banned ?? [],
    questionById: byId(questions),
    paperById: byId(papers),
    promptById: byId(prompts),
    bPaperById: byId(bPapers),
    cardById: byId(cards),
  };
}

export function contentDir(): string {
  // Resolved at runtime; turbopackIgnore keeps the bundler from tracing the whole project.
  return resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.PENCIL_CONTENT_DIR ?? "../content");
}

// A content file is either a bare array or an object holding one array (e.g. { "questions": [...] }).
export function asArray<T>(data: unknown, file: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const arrays = Object.values(data).filter(Array.isArray);
    if (arrays.length === 1) return arrays[0] as T[];
  }
  throw new Error(`${file}: expected an array or an object holding one array`);
}

export function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

// Files in dir whose name matches `<prefix>*.json`, sorted for stable merge order.
export function matchingFiles(dir: string, prefix: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    .sort()
    .map((f) => join(dir, f));
}

function readAll<T>(dir: string, prefix: string): T[] {
  return matchingFiles(dir, prefix).flatMap((f) => asArray<T>(readJson(f), f));
}

export function readBanned(dir: string): string[] {
  const file = join(dir, "meta", "banned.txt");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

export function loadContentFrom(dir: string): Content {
  const meta: Record<string, unknown> = {};
  for (const f of matchingFiles(join(dir, "meta"), "")) meta[basename(f, ".json")] = readJson(f);
  const cardsFile = join(dir, "cards", "cards.json");
  return buildContent({
    dir,
    questions: readAll<PartAQuestion>(join(dir, "part-a"), "questions"),
    papers: readAll<PartAPaper>(join(dir, "part-a"), "papers"),
    prompts: readAll<PartBPrompt>(join(dir, "part-b"), "prompts"),
    bPapers: readAll<PartBPaper>(join(dir, "part-b"), "papers"),
    cards: existsSync(cardsFile) ? asArray<Card>(readJson(cardsFile), cardsFile) : [],
    topicWeights: (meta["topic-weights"] as TopicWeights | undefined) ?? null,
    playbooks: meta.playbooks ? asArray<Playbook>(meta.playbooks, "meta/playbooks.json") : [],
    meta,
    banned: readBanned(dir),
  });
}

let cached: Content | null = null;

export function getContent(): Content {
  if (!cached) cached = loadContentFrom(contentDir());
  return cached;
}

export function setContentForTests(c: Content | null): void {
  cached = c;
}
