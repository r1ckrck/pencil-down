// Eligibility and selection for Part A and Part B (spec §7.4, §7.5, §8). Pure: the caller passes
// the pool state (retired, seen) and a random source.
import type { Content } from "../content/load";
import type {
  Difficulty,
  Format,
  GeneratedQuestion,
  Generator,
  PartAQuestion,
  PartBPrompt,
  Slot,
  Topic,
} from "../content/types";
import { SLOTS, TOPICS } from "../content/types";

export const MOCK_FORMATS: Record<Format, number> = { NAT: 8, MSQ: 10, MCQ: 26 };
export const MOCK_SIZE = 44;
export const VISUAL_TOPICS: Topic[] = ["3d-visualisation", "folding-and-patterns", "logic-and-counting"];
export const GENERATED_SHARE = 0.3; // of visual-topic slots in a mock
export const DRILL_GENERATED_SHARE = 0.7; // drills are "mostly generated where available"
export const DEFAULT_DRILL_SIZE = 10;
const FORMAT_ORDER: Format[] = ["NAT", "MSQ", "MCQ"]; // CEED section order

export interface PoolState {
  retired: Set<string>;
  seen: Map<string, number>; // item id → last_seen
}

export type Rand = () => number; // [0, 1)

export interface ServedItem {
  questionId: string;
  source: "real" | "generated";
  format: Format;
  topic: Topic;
}

const pick = <T>(items: T[], rand: Rand): T => items[Math.floor(rand() * items.length)];

function shuffle<T>(items: T[], rand: Rand): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Eligible for mocks, drills and revisit: not retired, not animated, not dropped by the key.
export function isEligible(q: PartAQuestion, pool: PoolState): boolean {
  return !q.animated && q.answer.kind !== "DROPPED" && !pool.retired.has(q.id);
}

// ---------- generated questions ----------

export function parseGeneratedId(id: string): { generator: string; format: Format; difficulty: Difficulty; seed: number } | null {
  if (!id.startsWith("gen:")) return null;
  const parts = id.split(":");
  if (parts.length < 5) return null;
  const seed = Number(parts[parts.length - 1]);
  const difficulty = Number(parts[parts.length - 2]) as Difficulty;
  const format = parts[parts.length - 3] as Format;
  const generator = parts.slice(1, parts.length - 3).join(":");
  if (!Number.isInteger(seed) || ![1, 2, 3].includes(difficulty) || !FORMAT_ORDER.includes(format)) return null;
  return { generator, format, difficulty, seed };
}

export function regenerate(id: string, generators: Generator[]): GeneratedQuestion | null {
  const p = parseGeneratedId(id);
  if (!p) return null;
  const g = generators.find((x) => x.id === p.generator);
  if (!g) return null;
  try {
    return g.generate(p.seed, p.difficulty, p.format);
  } catch {
    return null;
  }
}

// Seeds are chosen by the server; a seed whose question id was already served is skipped.
function generate(
  gens: Generator[],
  format: Format | null,
  rand: Rand,
  pool: PoolState,
  used: Set<string>,
): ServedItem | null {
  for (let attempt = 0; attempt < 20 && gens.length; attempt++) {
    const g = pick(gens, rand);
    const f = format ?? pick(g.formats, rand);
    if (!g.formats.includes(f)) continue;
    const seed = 1 + Math.floor(rand() * 2_147_483_646);
    const difficulty = (1 + Math.floor(rand() * 3)) as Difficulty;
    try {
      const q = g.generate(seed, difficulty, f);
      if (used.has(q.id) || pool.seen.has(q.id)) continue;
      used.add(q.id);
      return { questionId: q.id, source: "generated", format: q.format, topic: q.topic };
    } catch {
      continue;
    }
  }
  return null;
}

const gensFor = (generators: Generator[], topic: Topic | null, format: Format | null) =>
  generators.filter((g) => (!topic || g.topic === topic) && (!format || g.formats.includes(format)));

// Unseen first (random among them); otherwise the least recently seen.
function pickReal(cands: PartAQuestion[], pool: PoolState, rand: Rand, allowSeen = true): PartAQuestion | null {
  const unseen = cands.filter((q) => !pool.seen.has(q.id));
  if (unseen.length) return pick(unseen, rand);
  if (!allowSeen || !cands.length) return null;
  return cands.reduce((a, b) => ((pool.seen.get(b.id) ?? 0) < (pool.seen.get(a.id) ?? 0) ? b : a));
}

const realItem = (q: PartAQuestion): ServedItem => ({ questionId: q.id, source: "real", format: q.format, topic: q.topic });

// ---------- mock ----------

// Topic quotas over 44 slots by largest remainder; uniform when weights are missing.
export function topicQuotas(weights: Record<Topic, number> | null, total = MOCK_SIZE): Record<Topic, number> {
  const w = TOPICS.map((t) => (weights ? Math.max(0, weights[t] ?? 0) : 1));
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  const exact = w.map((x) => (x / sum) * total);
  const floor = exact.map(Math.floor);
  let left = total - floor.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (left-- <= 0) break;
    floor[i]++;
  }
  return Object.fromEntries(TOPICS.map((t, i) => [t, floor[i]])) as Record<Topic, number>;
}

// Splits the 44 slots over the topic × format grid in proportion to unseen questions left in each
// cell (iterative proportional fitting to the topic quotas and 8/10/26), so cells drain evenly.
export function slotPlan(
  content: Content,
  generators: Generator[],
  pool: PoolState,
): { topic: Topic; format: Format }[] {
  const rowT = topicQuotas(content.topicWeights?.weights ?? null);
  const colT = MOCK_FORMATS;
  const m = TOPICS.map((t) =>
    FORMAT_ORDER.map((f) => {
      const unseen = content.questions.filter(
        (q) => q.topic === t && q.format === f && isEligible(q, pool) && !pool.seen.has(q.id),
      ).length;
      return Math.max(unseen + (gensFor(generators, t, f).length ? 5 : 0), 0.01);
    }),
  );
  for (let it = 0; it < 100; it++) {
    m.forEach((row, i) => {
      const sum = row.reduce((a, b) => a + b, 0);
      row.forEach((_, j) => (row[j] *= rowT[TOPICS[i]] / sum));
    });
    FORMAT_ORDER.forEach((f, j) => {
      const sum = m.reduce((a, row) => a + row[j], 0);
      m.forEach((row) => (row[j] *= colT[f] / sum));
    });
  }
  // Integer cells that keep both margins exact: floor, then hand out the rest by largest remainder.
  const n = m.map((row) => row.map(Math.floor));
  const rowLeft = TOPICS.map((t, i) => rowT[t] - n[i].reduce((a, b) => a + b, 0));
  const colLeft = FORMAT_ORDER.map((f, j) => colT[f] - n.reduce((a, row) => a + row[j], 0));
  const cells = TOPICS.flatMap((_, i) => FORMAT_ORDER.map((_, j) => ({ i, j, r: m[i][j] - n[i][j] }))).sort((a, b) => b.r - a.r);
  for (const strict of [true, false])
    for (const c of cells)
      while (rowLeft[c.i] > 0 && colLeft[c.j] > 0 && (!strict || c.r > 0)) {
        n[c.i][c.j]++;
        rowLeft[c.i]--;
        colLeft[c.j]--;
        if (strict) break;
      }
  return TOPICS.flatMap((t, i) => FORMAT_ORDER.flatMap((f, j) => Array.from({ length: n[i][j] }, () => ({ topic: t, format: f }))));
}

export function assembleMock(content: Content, generators: Generator[], pool: PoolState, rand: Rand): ServedItem[] {
  const plan = slotPlan(content, generators, pool);
  const visualWithGen = plan
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => VISUAL_TOPICS.includes(s.topic));
  const genTarget = Math.round(visualWithGen.length * GENERATED_SHARE);
  const genSlots = new Set(
    shuffle(visualWithGen.filter(({ s }) => gensFor(generators, s.topic, s.format).length), rand)
      .slice(0, genTarget)
      .map(({ i }) => i),
  );

  const used = new Set<string>();
  const items: ServedItem[] = [];
  plan.forEach((slot, i) => {
    const gens = gensFor(generators, slot.topic, slot.format);
    let item: ServedItem | null = null;
    if (genSlots.has(i)) item = generate(gens, slot.format, rand, pool, used);
    if (!item) {
      const cands = content.questions.filter(
        (q) => q.topic === slot.topic && q.format === slot.format && isEligible(q, pool) && !used.has(q.id),
      );
      const unseen = pickReal(cands, pool, rand, false);
      if (unseen) item = realItem(unseen);
      else if (gens.length) item = generate(gens, slot.format, rand, pool, used);
      if (!item) {
        const seenPick = pickReal(cands, pool, rand);
        if (seenPick) item = realItem(seenPick);
      }
    }
    // Last resort: same format, any topic (quota slips rather than the mock shrinking).
    if (!item) {
      const any = content.questions.filter((q) => q.format === slot.format && isEligible(q, pool) && !used.has(q.id));
      const q = pickReal(any, pool, rand);
      if (q) item = realItem(q);
      else item = generate(gensFor(generators, null, slot.format), slot.format, rand, pool, used);
    }
    if (item) {
      used.add(item.questionId);
      items.push(item);
    }
  });
  // CEED order: NAT, MSQ, MCQ sections, shuffled within each.
  return FORMAT_ORDER.flatMap((f) => shuffle(items.filter((x) => x.format === f), rand));
}

// ---------- drill ----------

export function assembleDrill(
  content: Content,
  generators: Generator[],
  pool: PoolState,
  rand: Rand,
  opts: { topic?: Topic | null; format?: Format | null; n?: number },
): ServedItem[] {
  const topic = opts.topic ?? null;
  const format = opts.format ?? null;
  const n = opts.n ?? DEFAULT_DRILL_SIZE;
  const gens = gensFor(generators, topic, format);
  const used = new Set<string>();
  const items: ServedItem[] = [];
  const genTarget = gens.length ? Math.round(n * DRILL_GENERATED_SHARE) : 0;
  for (let k = 0; k < genTarget; k++) {
    const it = generate(gens, format, rand, pool, used);
    if (it) items.push(it);
  }
  const cands = content.questions.filter(
    (q) => (!topic || q.topic === topic) && (!format || q.format === format) && isEligible(q, pool),
  );
  while (items.length < n) {
    const q = pickReal(cands.filter((c) => !used.has(c.id)), pool, rand);
    let it: ServedItem | null = q ? realItem(q) : null;
    if (!it) it = generate(gens, format, rand, pool, used);
    if (!it) break;
    used.add(it.questionId);
    items.push(it);
  }
  return shuffle(items, rand);
}

// ---------- revisit ----------

// dueIds: open error-log question ids with due_at <= now, oldest due first.
export function assembleRevisit(
  content: Content,
  generators: Generator[],
  pool: PoolState,
  dueIds: string[],
  limit = MOCK_SIZE,
): ServedItem[] {
  const items: ServedItem[] = [];
  for (const id of dueIds) {
    if (items.length >= limit) break;
    const real = content.questionById.get(id);
    if (real) {
      if (isEligible(real, pool)) items.push(realItem(real));
      continue;
    }
    const g = regenerate(id, generators);
    if (g) items.push({ questionId: g.id, source: "generated", format: g.format, topic: g.topic });
  }
  return items;
}

// ---------- past paper ----------

// The whole paper in printed order, retired and dropped questions included.
export function assemblePastPaper(content: Content, paperId: string): ServedItem[] {
  const paper = content.paperById.get(paperId);
  if (!paper) throw new Error(`unknown paper ${paperId}`);
  return paper.questionIds
    .map((id) => content.questionById.get(id))
    .filter((q): q is PartAQuestion => !!q)
    .map(realItem);
}

// ---------- Part B ----------

function pickPrompt(cands: PartBPrompt[], pool: PoolState, rand: Rand, used: Set<string>): PartBPrompt | null {
  const free = cands.filter((p) => !used.has(p.id));
  const unseen = free.filter((p) => !pool.seen.has(p.id));
  if (unseen.length) return pick(unseen, rand);
  if (!free.length) return null;
  return free.reduce((a, b) => ((pool.seen.get(b.id) ?? 0) < (pool.seen.get(a.id) ?? 0) ? b : a));
}

// attemptsPerSlot: how many Part B attempts each slot has had (for "least practised").
export function leastPractisedSlot(attemptsPerSlot: Partial<Record<Slot, number>>): Slot {
  return SLOTS.reduce((a, b) => ((attemptsPerSlot[b] ?? 0) < (attemptsPerSlot[a] ?? 0) ? b : a));
}

export function selectDrillPrompt(content: Content, pool: PoolState, rand: Rand, slot: Slot): PartBPrompt | null {
  return pickPrompt(content.prompts.filter((p) => p.slot === slot), pool, rand, new Set());
}

// One prompt per slot in paper order; real first while unseen real remain.
export function selectMockPrompts(content: Content, pool: PoolState, rand: Rand): PartBPrompt[] {
  const used = new Set<string>();
  const out: PartBPrompt[] = [];
  for (const slot of SLOTS) {
    const inSlot = content.prompts.filter((p) => p.slot === slot);
    const realUnseen = inSlot.filter((p) => p.source === "real" && !pool.seen.has(p.id));
    const p = realUnseen.length ? pick(realUnseen, rand) : pickPrompt(inSlot, pool, rand, used);
    if (p) {
      used.add(p.id);
      out.push(p);
    }
  }
  return out;
}

export function selectPastPaperPrompts(content: Content, bPaperId: string): PartBPrompt[] {
  const paper = content.bPaperById.get(bPaperId);
  if (!paper) throw new Error(`unknown Part B paper ${bPaperId}`);
  return paper.promptIds.map((id) => content.promptById.get(id)).filter((p): p is PartBPrompt => !!p);
}
