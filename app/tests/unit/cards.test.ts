import { describe, expect, it } from "vitest";
import { cardStats, dueQueue, reveal, review } from "@/engine/cards";
import { makeCtx } from "./fixtures";

const DAY = 86_400_000;

describe("cards (FSRS)", () => {
  it("new cards come P1 first; a review schedules the card into the future", async () => {
    const ctx = makeCtx();
    const q = dueQueue(ctx);
    expect(q.cards.map((c) => c.id)).toEqual(["card-a", "card-c", "card-b"]);
    expect(q.cards.every((c) => c.isNew)).toBe(true);
    const r = await review(ctx, "card-a", 3);
    expect(r.dueAt).toBeGreaterThan(ctx.now());
    expect(dueQueue(ctx).cards.map((c) => c.id)).not.toContain("card-a");
    ctx.advance(r.dueAt - ctx.now());
    const due = dueQueue(ctx);
    expect(due.dueCount).toBe(1);
    expect(due.cards[0]).toMatchObject({ id: "card-a", isNew: false });
  });

  it("Again keeps a card due soon; Easy pushes it further than Good", async () => {
    const ctx = makeCtx();
    const again = await review(ctx, "card-a", 1);
    const good = await review(ctx, "card-b", 3);
    const easy = await review(ctx, "card-c", 4);
    expect(again.dueAt).toBeLessThan(good.dueAt);
    expect(easy.dueAt).toBeGreaterThan(good.dueAt);
  });

  it("retention counts review-state reviews only", async () => {
    const ctx = makeCtx();
    const r = await review(ctx, "card-a", 3);
    expect(cardStats(ctx).retention30d).toBeNull();
    ctx.advance(r.dueAt - ctx.now() + DAY);
    await review(ctx, "card-a", 3);
    expect(cardStats(ctx).retention30d).toBe(1);
    expect(cardStats(ctx).introduced).toBe(1);
  });

  it("reveal introduces the card naming a prompt's stimulus, due now", async () => {
    const ctx = makeCtx();
    const cards = await reveal(ctx, "real-form-0");
    expect(cards.map((c) => c.id)).toEqual(["card-c"]);
    expect(dueQueue(ctx).cards[0]).toMatchObject({ id: "card-c", isNew: false });
  });

  it("rejects unknown cards and grades", async () => {
    const ctx = makeCtx();
    await expect(review(ctx, "nope", 3)).rejects.toThrow();
    await expect(review(ctx, "card-a", 5)).rejects.toThrow();
  });
});
