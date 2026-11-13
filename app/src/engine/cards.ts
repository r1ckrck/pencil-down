// Flashcards on ts-fsrs (spec §5.4): due queue, review recording, Part B reveals.
import { DefaultScheduler } from "ts-fsrs";
import type { Card } from "../content/types";
import type { Db } from "../db/db";
import { badRequest, notFound } from "./errors";
import type { Ctx } from "./session";

export const NEW_PER_DAY = 20;
const DAY_MS = 86_400_000;
const PRIORITY = { P1: 0, P2: 1, P3: 2 } as const;

type Scheduler = Awaited<ReturnType<typeof makeScheduler>>;
const makeScheduler = () => DefaultScheduler({ version: "FSRS-7", enableFuzz: false });
type FsrsCard = Parameters<Scheduler["review"]>[0]["card"];

let scheduler: Promise<Scheduler> | null = null;
const getScheduler = () => (scheduler ??= makeScheduler());

interface StateRow {
  card_id: string;
  state: string;
  due_at: number;
  reps: number;
  lapses: number;
  last_review_at: number | null;
  introduced_at: number;
}

function revive(json: string): FsrsCard {
  const c = JSON.parse(json);
  return { ...c, dueAt: new Date(c.dueAt), lastReviewAt: c.lastReviewAt ? new Date(c.lastReviewAt) : null };
}

function stateRows(db: Db): Map<string, StateRow> {
  const rows = db.prepare("SELECT * FROM card_reviews").all() as unknown as StateRow[];
  return new Map(rows.map((r) => [r.card_id, r]));
}

function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function cardPayload(c: Card) {
  return {
    id: c.id,
    category: c.category,
    priority: c.priority,
    front: { text: c.front.text, image: c.front.image ? `/content/cards/${c.front.image}` : null },
    back: c.back,
    credit: c.credit,
  };
}

// Due reviews (oldest first), then new cards up to today's allowance (P1 first).
export function dueQueue(ctx: Ctx) {
  const now = ctx.now();
  const states = stateRows(ctx.db);
  const due = ctx.content.cards
    .filter((c) => {
      const st = states.get(c.id);
      return st && st.due_at <= now;
    })
    .sort((a, b) => states.get(a.id)!.due_at - states.get(b.id)!.due_at);
  const introducedToday = [...states.values()].filter((s) => s.introduced_at >= startOfDay(now) && s.reps > 0).length;
  const allowance = Math.max(0, NEW_PER_DAY - introducedToday);
  const fresh = ctx.content.cards
    .filter((c) => !states.has(c.id))
    .sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority] || a.id.localeCompare(b.id))
    .slice(0, allowance);
  return {
    serverNow: now,
    dueCount: due.length,
    newCount: fresh.length,
    cards: [...due.map((c) => ({ ...cardPayload(c), isNew: false })), ...fresh.map((c) => ({ ...cardPayload(c), isNew: true }))],
  };
}

export async function review(ctx: Ctx, cardId: string, grade: number) {
  if (!ctx.content.cardById.has(cardId)) throw notFound("card");
  if (![1, 2, 3, 4].includes(grade)) throw badRequest("grade must be 1 (again) – 4 (easy)");
  const s = await getScheduler();
  const now = ctx.now();
  const row = stateRows(ctx.db).get(cardId);
  const before = row ? revive(row.state) : s.newCard({ now: new Date(now) });
  const result = s.review({ card: before, grade: grade as 1 | 2 | 3 | 4, now: new Date(now) });
  const after = result.card;
  ctx.db
    .prepare(
      `INSERT INTO card_reviews (card_id, state, due_at, reps, lapses, last_review_at, introduced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(card_id) DO UPDATE SET state = excluded.state, due_at = excluded.due_at, reps = excluded.reps,
         lapses = excluded.lapses, last_review_at = excluded.last_review_at`,
    )
    .run(cardId, JSON.stringify(after), after.dueAt.getTime(), after.reps, after.lapses, now, row?.introduced_at ?? now);
  ctx.db
    .prepare("INSERT INTO card_review_log (card_id, at, grade, was_review, scheduled_days) VALUES (?, ?, ?, ?, ?)")
    .run(cardId, now, grade, before.scheduleStatus === "review" ? 1 : 0, after.scheduledDays);
  ctx.db
    .prepare(
      `INSERT INTO seen (item_id, kind, first_seen, last_seen, times) VALUES (?, 'card', ?, ?, 1)
       ON CONFLICT(item_id) DO UPDATE SET last_seen = excluded.last_seen, times = times + 1`,
    )
    .run(cardId, now, now);
  return { cardId, dueAt: after.dueAt.getTime(), scheduledDays: after.scheduledDays, reps: after.reps };
}

// Part B debrief: introduce the cards naming a prompt's unnamed stimulus (due now).
export async function reveal(ctx: Ctx, promptId: string) {
  const s = await getScheduler();
  const now = ctx.now();
  const cards = ctx.content.cards.filter((c) => c.revealsPromptIds?.includes(promptId));
  const states = stateRows(ctx.db);
  for (const c of cards) {
    if (states.has(c.id)) continue;
    const fresh = s.newCard({ now: new Date(now) });
    ctx.db
      .prepare("INSERT INTO card_reviews (card_id, state, due_at, introduced_at) VALUES (?, ?, ?, ?)")
      .run(c.id, JSON.stringify(fresh), now, now);
  }
  return cards.map(cardPayload);
}

// Retention: share of review-state reviews in the last 30 days not graded Again.
export function cardStats(ctx: Ctx) {
  const now = ctx.now();
  const r = ctx.db
    .prepare("SELECT COUNT(*) AS n, SUM(grade > 1) AS ok FROM card_review_log WHERE was_review = 1 AND at >= ?")
    .get(now - 30 * DAY_MS) as { n: number; ok: number | null };
  const states = [...stateRows(ctx.db).values()];
  const dueBy = (t: number) => states.filter((s) => s.due_at <= t).length;
  return {
    total: ctx.content.cards.length,
    introduced: states.length,
    retention30d: r.n ? (r.ok ?? 0) / r.n : null,
    dueToday: dueBy(startOfDay(now) + DAY_MS),
    dueNext7Days: Array.from({ length: 7 }, (_, i) => dueBy(startOfDay(now) + (i + 1) * DAY_MS) - (i ? dueBy(startOfDay(now) + i * DAY_MS) : 0)),
  };
}
