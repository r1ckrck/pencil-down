import { describe, expect, it } from "vitest";
import { SLOTS } from "@/content/types";
import { ApiError } from "@/engine/errors";
import {
  attempts,
  commit,
  createSession,
  finish,
  getSession,
  quit,
  selfRate,
  starIdea,
  tagIdea,
  tapIdea,
} from "@/engine/session";
import { partBResults, sessionState } from "@/engine/view";
import { T0, makeCtx } from "./fixtures";

const S = 1000;
const M = 60 * S;

function expectApiError(fn: () => unknown, status: number) {
  try {
    fn();
  } catch (e) {
    expect((e as ApiError).status).toBe(status);
    return;
  }
  throw new Error("expected ApiError");
}

describe("Part B single drill", () => {
  it("commit timeout auto-locks the last starred idea; seconds-to-commit stored", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "creativity", mode: "hard" });
    expect(s.ends_at - s.started_at).toBe(24 * M);
    ctx.advance(3 * M);
    const a = tapIdea(ctx, s.id, 0);
    const b = tapIdea(ctx, s.id, 0);
    const c = tapIdea(ctx, s.id, 0);
    starIdea(ctx, s.id, a.ideaId, true);
    ctx.advance(S);
    starIdea(ctx, s.id, b.ideaId, true); // last starred
    ctx.advance(S);
    expect(c.n).toBe(3);
    ctx.advance(11 * M - 1 - (ctx.now() - T0)); // one ms before the commit deadline (min 11)
    expect(attempts(ctx.db, s.id)[0].status).toBe("pending");
    ctx.advance(1);
    sessionState(ctx, s.id);
    const att = attempts(ctx.db, s.id)[0];
    expect(att.status).toBe("committed");
    expect(att.auto_committed).toBe(1);
    expect(att.committed_idea_id).toBe(b.ideaId);
    expect(att.committed_at).toBe(T0 + 11 * M);
    expect(att.seconds_to_commit).toBe(660);
    expect(att.idea_count).toBe(3);
    expectApiError(() => commit(ctx, s.id, 0, { label: "late" }), 409);
  });

  it("manual commit records label, checks and seconds-to-commit", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "sketching" });
    ctx.advance(150 * S);
    const idea = tapIdea(ctx, s.id, 0);
    ctx.advance(100 * S);
    commit(ctx, s.id, 0, { ideaId: idea.ideaId, label: "  low camera from the cot  ", checks: { rules: true, notObvious: true, drawable: true } });
    const att = attempts(ctx.db, s.id)[0];
    expect(att.seconds_to_commit).toBe(250);
    expect(att.auto_committed).toBe(0);
    expect(att.commit_label).toBe("low camera from the cot");
    expectApiError(() => tapIdea(ctx, s.id, 0), 409);
  });

  it("no ideas starred → the last idea; no ideas → auto-commit with none", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "sketching" });
    ctx.advance(3 * M);
    tapIdea(ctx, s.id, 0);
    const last = tapIdea(ctx, s.id, 0);
    ctx.advance(2 * M);
    sessionState(ctx, s.id);
    expect(attempts(ctx.db, s.id)[0].committed_idea_id).toBe(last.ideaId);
    finish(ctx, s.id);

    const s2 = createSession(ctx, { kind: "b-drill", slot: "sketching" });
    ctx.advance(6 * M);
    sessionState(ctx, s2.id);
    const att = attempts(ctx.db, s2.id)[0];
    expect(att.status).toBe("committed");
    expect(att.committed_idea_id).toBeNull();
    expect(att.seconds_to_commit).toBe(300);
  });

  it("hiding: prompt visible only during Read, never in between, back in the debrief", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "form", mode: "hard" });
    const at = (sec: number) => {
      ctx.clock.t = T0 + sec * S;
      return sessionState(ctx, s.id).partB!.attempts[0];
    };
    expect(at(0).prompt).not.toBeNull();
    expect(at(119).visible).toBe(true);
    expect(at(120).prompt).toBeNull();
    expect(at(120).slot).toBe("form");
    expect(at(1439).prompt).toBeNull();
    expect(at(1440).prompt).not.toBeNull(); // session over → debrief
    expect(partBResults(ctx, s.id)![0].prompt).not.toBeNull();
  });

  it("Easy: prompt stays on screen", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "form", mode: "easy" });
    ctx.advance(15 * M);
    expect(sessionState(ctx, s.id).partB!.attempts[0].prompt).not.toBeNull();
  });

  it("phase reported to the second, nextEventAt at the boundary", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "problem-id" });
    ctx.advance(13 * M - S);
    const st = sessionState(ctx, s.id);
    expect(st.partB!.now).toMatchObject({ phase: "commit", pos: 0 });
    expect(st.nextEventAt).toBe(T0 + 13 * M);
  });

  it("debrief: tags (one word), self-ratings 0–5; locked while the slot is running", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "visual" });
    ctx.advance(3 * M);
    const i1 = tapIdea(ctx, s.id, 0);
    const i2 = tapIdea(ctx, s.id, 0);
    expectApiError(() => tagIdea(ctx, s.id, i1.ideaId, "x"), 409);
    ctx.advance(24 * M);
    tagIdea(ctx, s.id, i1.ideaId, "Metaphor here");
    tagIdea(ctx, s.id, i2.ideaId, "metaphor");
    selfRate(ctx, s.id, 0, 0, 4);
    selfRate(ctx, s.id, 0, 0, 3);
    expectApiError(() => selfRate(ctx, s.id, 0, 4, 3), 400);
    expectApiError(() => selfRate(ctx, s.id, 0, 1, 6), 400);
    const r = partBResults(ctx, s.id)![0];
    expect(r.ideas.map((i) => i.tag)).toEqual(["metaphor", "metaphor"]);
    expect(r.distinctTags).toBe(1);
    expect(r.ratings).toEqual([{ criterion: 0, value: 3 }]);
    expect(getSession(ctx.db, s.id).status).toBe("completed");
  });

  it("quit: unfinished slot recorded as abandoned, status quit", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "creativity" });
    ctx.advance(5 * M);
    quit(ctx, s.id);
    expect(getSession(ctx.db, s.id).status).toBe("quit");
    expect(attempts(ctx.db, s.id)[0].status).toBe("abandoned");
  });

  it("least-practised slot when none is picked", () => {
    const ctx = makeCtx();
    const first = createSession(ctx, { kind: "b-drill" });
    expect(first.config.slot).toBe("sketching");
    quit(ctx, first.id);
    expect(createSession(ctx, { kind: "b-drill" }).config.slot).toBe("creativity");
  });
});

describe("Part B mock and past paper", () => {
  it("one prompt per slot, real first while unseen real remain, paper order", () => {
    const ctx = makeCtx();
    const sources: string[][] = [];
    for (let i = 0; i < 3; i++) {
      const s = createSession(ctx, { kind: "b-mock" });
      const atts = attempts(ctx.db, s.id);
      expect(atts.map((a) => a.slot)).toEqual(SLOTS);
      sources.push(atts.map((a) => a.prompt_id.split("-")[0]));
      quit(ctx, s.id);
    }
    // 2 real per slot in the fixture → two all-real mocks, then authored
    expect(sources[0].every((x) => x === "real")).toBe(true);
    expect(sources[1].every((x) => x === "real")).toBe(true);
    expect(sources[2].every((x) => x === "auth")).toBe(true);
  });

  it("auto-commits at each block's commit point; 6 / 22×5 stamps; ends completed", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-mock", mode: "hard" });
    expect(s.ends_at - s.started_at).toBe(120 * M);
    const commitMin = { sketching: 5, creativity: 11, visual: 11, form: 11, "problem-id": 13 };
    SLOTS.forEach((slot, pos) => {
      const start = 6 + 22 * pos;
      ctx.clock.t = T0 + (start + commitMin[slot]) * M - 1;
      expect(attempts(ctx.db, s.id)[pos].status).toBe("pending");
      ctx.clock.t += 1;
      sessionState(ctx, s.id);
      const a = attempts(ctx.db, s.id)[pos];
      expect(a.status).toBe("committed");
      expect(a.seconds_to_commit).toBe(commitMin[slot] * 60);
    });
    ctx.clock.t = T0 + 120 * M;
    const st = sessionState(ctx, s.id);
    expect(st.session.status).toBe("completed");
  });

  it("hiding in a mock: all visible in read-all, own block's first 2 min only", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-mock", mode: "hard" });
    const vis = (min: number) => {
      ctx.clock.t = T0 + min * M;
      return sessionState(ctx, s.id).partB!.attempts.map((a) => a.visible);
    };
    expect(vis(0)).toEqual([true, true, true, true, true]);
    expect(vis(6)).toEqual([true, false, false, false, false]);
    expect(vis(8)).toEqual([false, false, false, false, false]);
    expect(vis(28)).toEqual([false, true, false, false, false]);
    expect(vis(121)).toEqual([true, true, true, true, true]);
  });

  it("past paper: printed prompts in printed order; retake flagged", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-past-paper", bPaperId: "b-2024" });
    expect(attempts(ctx.db, s.id).map((a) => a.prompt_id)).toEqual(SLOTS.map((x) => `real-${x}-0`));
    expect(s.config.retake).toBe(false);
    quit(ctx, s.id);
    expect(attempts(ctx.db, s.id).every((a) => a.status === "abandoned")).toBe(true);
    expect(createSession(ctx, { kind: "b-past-paper", bPaperId: "b-2024" }).config.retake).toBe(true);
  });
});

describe("full exam (one session: Part A 60 → lock → Part B 120)", () => {
  it("Part A expiry locks A and starts B with its full 120 minutes", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "full", mode: "hard" });
    expect(s.ends_at - s.started_at).toBe(180 * M);
    ctx.advance(60 * M);
    const st = sessionState(ctx, s.id);
    expect(st.section).toBe("B");
    expect(st.session.status).toBe("live");
    const row = getSession(ctx.db, s.id);
    expect(row.a_status).toBe("expired");
    expect(row.b_started_at).toBe(T0 + 60 * M);
    expect(row.score).not.toBeNull();
    ctx.advance(120 * M);
    expect(sessionState(ctx, s.id).session.status).toBe("completed");
  });

  it("finishing A early starts B immediately; ends_at moves with it", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "full" });
    ctx.advance(40 * M);
    finish(ctx, s.id);
    const row = getSession(ctx.db, s.id);
    expect(row.a_status).toBe("completed");
    expect(row.b_started_at).toBe(T0 + 40 * M);
    expect(row.ends_at).toBe(T0 + 160 * M);
  });

  it("quit during A ends the whole exam: A skipped, B abandoned", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "full" });
    ctx.advance(5 * M);
    quit(ctx, s.id);
    expect(getSession(ctx.db, s.id).status).toBe("quit");
    expect(attempts(ctx.db, s.id).every((a) => a.status === "abandoned")).toBe(true);
  });
});
