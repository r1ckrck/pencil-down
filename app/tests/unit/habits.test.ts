import { describe, expect, it } from "vitest";
import { review } from "@/engine/cards";
import { habits, istDay } from "@/engine/progress";
import { answer, createSession, quit } from "@/engine/session";
import { sessionState } from "@/engine/view";
import { RIGHT, makeCtx } from "./fixtures";

const DAY = 86_400_000;
const HOUR = 3_600_000;

describe("habit tracker", () => {
  it("is empty with no activity: 3 rows × 7 days, today last, no streak", () => {
    const h = habits(makeCtx());
    expect(h.days).toHaveLength(7);
    expect(h.days[6].isToday).toBe(true);
    expect(h.rows.map((r) => r.key)).toEqual(["partA", "partB", "cards"]);
    expect(h.rows.every((r) => r.done.every((d) => !d))).toBe(true);
    expect(h).toMatchObject({ doneToday: 0, streak: 0 });
  });

  it("marks a card review today and counts a streak across consecutive days", async () => {
    const ctx = makeCtx();
    await review(ctx, "card-a", 3);
    ctx.advance(DAY);
    await review(ctx, "card-b", 3);
    ctx.advance(DAY);
    await review(ctx, "card-c", 3);
    const h = habits(ctx);
    expect(h.rows.find((r) => r.key === "cards")!.done.slice(-3)).toEqual([true, true, true]);
    expect(h).toMatchObject({ doneToday: 1, streak: 3 });
  });

  it("keeps yesterday's streak alive while today is still open, and breaks it after a missed day", async () => {
    const ctx = makeCtx();
    await review(ctx, "card-a", 3);
    ctx.advance(DAY);
    expect(habits(ctx)).toMatchObject({ doneToday: 0, streak: 1 });
    ctx.advance(DAY);
    expect(habits(ctx).streak).toBe(0);
  });

  it("counts Part A only when a question was actually answered", () => {
    const ctx = makeCtx();
    const empty = createSession(ctx, { kind: "drill", topic: "mechanisms", format: "MCQ", n: 3 });
    quit(ctx, empty.id);
    expect(habits(ctx).rows[0].done[6]).toBe(false);
    const s = createSession(ctx, { kind: "drill", topic: "mechanisms", format: "MCQ", n: 3 });
    const cur = sessionState(ctx, s.id).partA!.current!;
    answer(ctx, s.id, cur.pos, RIGHT.MCQ, "sure");
    expect(habits(ctx).rows[0].done[6]).toBe(true);
  });

  it("buckets days in IST: 23:00 IST and 01:00 IST next day are different days", () => {
    const at2300 = Date.UTC(2026, 10, 13, 17, 30); // 23:00 IST
    expect(istDay(at2300 + 2 * HOUR)).toBe(istDay(at2300) + 1);
    expect(istDay(at2300 - 22 * HOUR)).toBe(istDay(at2300));
  });
});
