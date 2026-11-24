import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { SLOTS } from "@/content/types";
import { openDb } from "@/db/db";
import { ApiError } from "@/engine/errors";
import { today } from "@/engine/progress";
import {
  attempts,
  changeQuestionStep,
  commit,
  createSession,
  doneQuestion,
  finish,
  getSession,
  openEndPage,
  openQuestion,
  quit,
  reportIdeas,
  reread,
  selfRate,
  skipQuestion,
} from "@/engine/session";
import { partBResults, sessionState } from "@/engine/view";
import { T0, type TestCtx, makeCtx } from "./fixtures";

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

const state = (ctx: TestCtx, sid: number, ms?: number) => {
  if (ms !== undefined) ctx.clock.t = T0 + ms;
  return sessionState(ctx, sid);
};
const att = (ctx: TestCtx, sid: number, pos = 0) => sessionState(ctx, sid).partB!.attempts[pos];

describe("Part B drill: one question, steps she moves through", () => {
  it("opens on Read at once; 24 min budget and wall", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "creativity", mode: "hard" });
    expect(s.ends_at - s.started_at).toBe(24 * M);
    const st = state(ctx, s.id);
    expect(st.partB!.readAll).toBe(false);
    expect(st.partB!.currentPos).toBe(0);
    expect(st.partB!.attempts[0]).toMatchObject({ step: "read", progress: "open", budgetMs: 24 * M, usedMs: 0 });
  });

  it("Hard: forced advance to the second — Read → Ideas → Commit → auto-commit → Draw → end", () => {
    const targets = { sketching: [2, 4, 5], creativity: [2, 10, 11], visual: [2, 10, 11], form: [2, 10, 11], "problem-id": [2, 12, 13] };
    for (const slot of SLOTS) {
      const ctx = makeCtx();
      const s = createSession(ctx, { kind: "b-drill", slot, mode: "hard" });
      const [read, ideas, commitBy] = targets[slot].map((x) => x * M);
      expect(state(ctx, s.id, read - 1).partB!.attempts[0].step).toBe("read");
      expect(state(ctx, s.id, read).partB!.attempts[0].step).toBe("ideas");
      expect(state(ctx, s.id, ideas - 1).partB!.attempts[0].step).toBe("ideas");
      expect(state(ctx, s.id, ideas).partB!.attempts[0].step).toBe("commit");
      expect(state(ctx, s.id, commitBy - 1).partB!.attempts[0].status).toBe("pending");
      const a = state(ctx, s.id, commitBy).partB!.attempts[0];
      expect(a).toMatchObject({ status: "committed", step: "draw", autoCommitted: true, secondsToCommit: commitBy / S });
      expect(attempts(ctx.db, s.id)[0].committed_at).toBe(T0 + commitBy);
      expect(state(ctx, s.id, 24 * M).session.status).toBe("completed");
    }
  });

  it("nextEventAt is the next forced step", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "problem-id", mode: "hard" });
    changeQuestionStep(ctx, s.id, 0, "ideas");
    expect(state(ctx, s.id, 5 * M).nextEventAt).toBe(T0 + 12 * M);
  });

  it("Easy: nothing forced; overruns stay workable until the wall", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "creativity", mode: "easy" });
    expect(state(ctx, s.id, 15 * M).partB!.attempts[0]).toMatchObject({ step: "read", status: "pending", usedMs: 15 * M });
    changeQuestionStep(ctx, s.id, 0, "ideas");
    changeQuestionStep(ctx, s.id, 0, "commit");
    ctx.clock.t = T0 + 20 * M;
    commit(ctx, s.id, 0);
    expect(att(ctx, s.id)).toMatchObject({ status: "committed", autoCommitted: false, secondsToCommit: 1200 });
    // Easy at the wall: no auto-commit ever happened before, the session just ends.
    const s2 = (finish(ctx, s.id), createSession(ctx, { kind: "b-drill", slot: "form", mode: "easy" }));
    ctx.clock.t += 24 * M;
    expect(sessionState(ctx, s2.id).session.status).toBe("completed");
    expect(attempts(ctx.db, s2.id)[0].status).toBe("abandoned");
  });

  it("manual steps: Got it, I've picked one, Back to ideas, Commit; the log records the question clock", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "creativity", mode: "hard" });
    expectApiError(() => commit(ctx, s.id, 0), 409); // still reading
    expectApiError(() => changeQuestionStep(ctx, s.id, 0, "commit"), 409); // read → commit is not a step
    ctx.clock.t = T0 + 50 * S;
    changeQuestionStep(ctx, s.id, 0, "ideas");
    ctx.clock.t = T0 + 4 * M;
    changeQuestionStep(ctx, s.id, 0, "commit");
    ctx.clock.t = T0 + 5 * M;
    changeQuestionStep(ctx, s.id, 0, "ideas");
    ctx.clock.t = T0 + 6 * M;
    changeQuestionStep(ctx, s.id, 0, "commit");
    ctx.clock.t = T0 + 6 * M + 30 * S;
    commit(ctx, s.id, 0);
    const a = att(ctx, s.id);
    expect(a).toMatchObject({ status: "committed", step: "draw", secondsToCommit: 390, autoCommitted: false });
    expect(a.steps).toEqual({
      read: { from: 0, to: 50 * S },
      ideas: { from: 50 * S, to: 6 * M },
      commit: { from: 4 * M, to: 6 * M + 30 * S },
      draw: { from: 6 * M + 30 * S, to: null },
    });
    expectApiError(() => commit(ctx, s.id, 0), 409); // a commit is final
    expectApiError(() => changeQuestionStep(ctx, s.id, 0, "ideas"), 409);
    // Draw does not end on its own before the wall; the step stays Draw.
    expect(state(ctx, s.id, 20 * M).partB!.attempts[0].step).toBe("draw");
  });

  it("Hard: Back to ideas is refused once the Ideas target has passed", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "creativity", mode: "hard" });
    state(ctx, s.id, 10 * M + 10 * S); // Commit opened on its own at 10:00
    expect(att(ctx, s.id).step).toBe("commit");
    expectApiError(() => changeQuestionStep(ctx, s.id, 0, "ideas"), 409);
  });

  it("hiding: visible during Read, hidden after; Reread 60 / 30 / 15 then none; the clock runs through it", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "form", mode: "hard" });
    expect(state(ctx, s.id, 0).partB!.attempts[0].visible).toBe(true);
    expect(state(ctx, s.id, 119 * S).partB!.attempts[0].visible).toBe(true);
    const hidden = state(ctx, s.id, 120 * S).partB!.attempts[0];
    expect(hidden.visible).toBe(false);
    expect(hidden.prompt).toBeNull();
    expect(hidden.nextRereadS).toBe(60);

    reread(ctx, s.id, 0);
    let st = state(ctx, s.id);
    expect(st.partB!.attempts[0]).toMatchObject({ visible: true, rereads: 1, nextRereadS: 30, revealUntil: T0 + 180 * S });
    expect(st.nextEventAt).toBe(T0 + 180 * S);
    expect(state(ctx, s.id, 179 * S).partB!.attempts[0].visible).toBe(true);
    st = state(ctx, s.id, 180 * S);
    expect(st.partB!.attempts[0]).toMatchObject({ visible: false, usedMs: 180 * S, revealUntil: null });

    reread(ctx, s.id, 0);
    expect(state(ctx, s.id, 209 * S).partB!.attempts[0].visible).toBe(true);
    expect(state(ctx, s.id, 210 * S).partB!.attempts[0].visible).toBe(false);
    reread(ctx, s.id, 0);
    expect(state(ctx, s.id, 224 * S).partB!.attempts[0].visible).toBe(true);
    expect(state(ctx, s.id, 225 * S).partB!.attempts[0]).toMatchObject({ visible: false, nextRereadS: null, rereads: 3 });
    expectApiError(() => reread(ctx, s.id, 0), 409);
    expect(attempts(ctx.db, s.id)[0].rereads).toBe(3);

    // Back in the debrief once the session is over.
    expect(state(ctx, s.id, 24 * M).partB!.attempts[0].prompt).not.toBeNull();
    expect(partBResults(ctx, s.id)![0]).toMatchObject({ rereads: 3 });
  });

  it("hiding: Got it hides the prompt early (after the 15 s opening view)", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "form", mode: "hard" });
    ctx.clock.t = T0 + 40 * S;
    changeQuestionStep(ctx, s.id, 0, "ideas");
    expect(att(ctx, s.id).visible).toBe(false);
  });

  it("Easy: prompt stays on screen; Reread is not offered", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "form", mode: "easy" });
    const a = state(ctx, s.id, 15 * M).partB!.attempts[0];
    expect(a.prompt).not.toBeNull();
    expect(a.nextRereadS).toBeNull();
    expectApiError(() => reread(ctx, s.id, 0), 409);
  });

  it("a drill has no skip, done or end page", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "form", mode: "easy" });
    expectApiError(() => skipQuestion(ctx, s.id, 0), 409);
    expectApiError(() => openEndPage(ctx, s.id), 409);
    changeQuestionStep(ctx, s.id, 0, "ideas");
    commit(ctx, s.id, 0);
    expectApiError(() => doneQuestion(ctx, s.id, 0), 409);
  });

  it("debrief: idea count and self-ratings locked while live, open after", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "visual" });
    expectApiError(() => reportIdeas(ctx, s.id, 0, 3), 409);
    expectApiError(() => selfRate(ctx, s.id, 0, 0, 3), 409);
    ctx.advance(24 * M);
    reportIdeas(ctx, s.id, 0, 5);
    reportIdeas(ctx, s.id, 0, 4);
    expectApiError(() => reportIdeas(ctx, s.id, 0, -1), 400);
    expectApiError(() => reportIdeas(ctx, s.id, 0, 100), 400);
    selfRate(ctx, s.id, 0, 0, 4);
    selfRate(ctx, s.id, 0, 0, 3);
    expectApiError(() => selfRate(ctx, s.id, 0, 4, 3), 400);
    expectApiError(() => selfRate(ctx, s.id, 0, 1, 6), 400);
    const r = partBResults(ctx, s.id)![0];
    expect(r.ideaCount).toBe(4);
    expect(r.ratings).toEqual([{ criterion: 0, value: 3 }]);
    expect(getSession(ctx.db, s.id).status).toBe("completed");
  });

  it("quit: uncommitted question abandoned; the open visit closes; status quit", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "creativity" });
    ctx.advance(5 * M);
    quit(ctx, s.id);
    expect(getSession(ctx.db, s.id).status).toBe("quit");
    const a = attempts(ctx.db, s.id)[0];
    expect(a.status).toBe("abandoned");
    expect(a.used_ms).toBe(5 * M);
    expect(ctx.db.prepare("SELECT COUNT(*) AS n FROM b_visits WHERE ended_at IS NULL").get()).toEqual({ n: 0 });
  });

  it("least-practised slot when none is picked", () => {
    const ctx = makeCtx();
    const first = createSession(ctx, { kind: "b-drill" });
    expect(first.config.slot).toBe("sketching");
    quit(ctx, first.id);
    expect(createSession(ctx, { kind: "b-drill" }).config.slot).toBe("creativity");
  });

  it("re-attempt: the same prompt surfaces 10–14 days on and starts by promptId", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "form", mode: "hard" });
    const pid = attempts(ctx.db, s.id)[0].prompt_id;
    ctx.advance(24 * M);
    sessionState(ctx, s.id); // auto-committed at the commit target, closed at the end
    ctx.advance(10 * 24 * 60 * M - 24 * M - S);
    expect(today(ctx).reattemptPromptIds).toEqual([]);
    ctx.advance(S);
    expect(today(ctx).reattemptPromptIds).toEqual([pid]);

    expectApiError(() => createSession(ctx, { kind: "b-drill", promptId: "nope" }), 400);
    expectApiError(() => createSession(ctx, { kind: "b-drill", promptId: pid, slot: "sketching" }), 400);
    const again = createSession(ctx, { kind: "b-drill", promptId: pid });
    expect(again.config.slot).toBe("form");
    expect(attempts(ctx.db, again.id)[0].prompt_id).toBe(pid);
    expect(again.ends_at - again.started_at).toBe(24 * M);
    changeQuestionStep(ctx, again.id, 0, "ideas");
    commit(ctx, again.id, 0);
    expect(today(ctx).reattemptPromptIds).toEqual([]); // the newer attempt resets the clock
  });

  it("a live session from before the self-paced flow is ended as quit on the next read", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-drill", slot: "form" });
    const cfg = { ...s.config, partB: undefined, timeline: { total: 1440 } };
    ctx.db.prepare("UPDATE sessions SET config = ? WHERE id = ?").run(JSON.stringify(cfg), s.id);
    ctx.advance(M);
    expect(sessionState(ctx, s.id).session.status).toBe("quit");
  });
});

describe("Part B mock: read-all, then one question per screen", () => {
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

  it("read-all: 6 min, every prompt visible even in Hard, no question open; Q1 opens on its own at 6:00", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-mock", mode: "hard" });
    expect(s.ends_at - s.started_at).toBe(120 * M);
    let st = state(ctx, s.id, 6 * M - 1);
    expect(st.partB!.readAll).toBe(true);
    expect(st.partB!.currentPos).toBeNull();
    expect(st.partB!.readAllEndsAt).toBe(T0 + 6 * M);
    expect(st.nextEventAt).toBe(T0 + 6 * M);
    expect(st.partB!.attempts.map((a) => a.visible)).toEqual([true, true, true, true, true]);
    st = state(ctx, s.id, 6 * M);
    expect(st.partB!.readAll).toBe(false);
    expect(st.partB!.currentPos).toBe(0);
    expect(st.partB!.attempts.map((a) => a.visible)).toEqual([true, false, false, false, false]);
    expect(st.partB!.attempts[0].usedMs).toBe(0); // read-all belongs to no question
  });

  it("Start Q1 ends read-all early; read-all time is not charged", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-mock", mode: "hard" });
    ctx.clock.t = T0 + 2 * M;
    expectApiError(() => openEndPage(ctx, s.id), 409);
    openQuestion(ctx, s.id, 0);
    const st = state(ctx, s.id, 3 * M);
    expect(st.partB!.readAll).toBe(false);
    expect(st.partB!.attempts[0].usedMs).toBe(M);
  });

  it("the question clock runs only while its question is open, across visits", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-mock", mode: "hard" });
    state(ctx, s.id, 6 * M); // Q1 opens
    ctx.clock.t = T0 + 7 * M;
    openQuestion(ctx, s.id, 2);
    let st = state(ctx, s.id, 10 * M);
    expect(st.partB!.attempts[0]).toMatchObject({ usedMs: M, step: "read", current: false });
    expect(st.partB!.attempts[2]).toMatchObject({ usedMs: 3 * M, step: "ideas", progress: "open", current: true });
    openQuestion(ctx, s.id, 0);
    st = state(ctx, s.id, 11 * M + 30 * S);
    // Q1 crossed its 2-min Read target 1 min into this visit.
    expect(st.partB!.attempts[0]).toMatchObject({ usedMs: 2 * M + 30 * S, step: "ideas" });
    expect(st.partB!.attempts[2].usedMs).toBe(3 * M);
    expect(attempts(ctx.db, s.id)[0].steps_log).toBe(JSON.stringify({ read: { from: 0, to: 2 * M }, ideas: { from: 2 * M, to: null } }));
  });

  it("hiding: 15 s on every open, also once the question is past Read", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-mock", mode: "hard" });
    state(ctx, s.id, 6 * M);
    ctx.clock.t = T0 + 6 * M + 30 * S;
    changeQuestionStep(ctx, s.id, 0, "ideas");
    expect(att(ctx, s.id, 0).visible).toBe(false);
    openQuestion(ctx, s.id, 1);
    ctx.clock.t = T0 + 7 * M;
    openQuestion(ctx, s.id, 0);
    let st = state(ctx, s.id, 7 * M + 14 * S);
    expect(st.partB!.attempts[0].visible).toBe(true);
    expect(st.nextEventAt).toBe(T0 + 7 * M + 15 * S);
    st = state(ctx, s.id, 7 * M + 15 * S);
    expect(st.partB!.attempts[0].visible).toBe(false);
  });

  it("Hard at the 22-min budget: auto-committed earlier, closes, next question opens at that instant", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-mock", mode: "hard" });
    const st = state(ctx, s.id, (6 + 22) * M);
    const [q1, q2] = st.partB!.attempts;
    expect(q1).toMatchObject({ progress: "out", status: "committed", autoCommitted: true, secondsToCommit: 300, usedMs: 22 * M });
    expect(st.partB!.currentPos).toBe(1);
    expect(q2).toMatchObject({ progress: "open", usedMs: 0, step: "read" });
    // An out-of-time question can be opened to see the prompt, but nothing else, and its clock stays stopped.
    ctx.clock.t = T0 + 30 * M;
    openQuestion(ctx, s.id, 0);
    const back = state(ctx, s.id, 30 * M + 10 * S).partB!.attempts[0];
    expect(back).toMatchObject({ visible: true, usedMs: 22 * M, nextRereadS: null });
    expect(state(ctx, s.id, 30 * M + 15 * S).partB!.attempts[0].visible).toBe(false);
    expectApiError(() => reread(ctx, s.id, 0), 409);
    expectApiError(() => changeQuestionStep(ctx, s.id, 0, "ideas"), 409);
    expectApiError(() => skipQuestion(ctx, s.id, 0), 409);
    expect(state(ctx, s.id, 40 * M).partB!.attempts[0].usedMs).toBe(22 * M);
    expect(attempts(ctx.db, s.id)[1].used_ms).toBe(2 * M); // Q2 ran from 28:00 to 30:00
  });

  it("Hard: five questions left running back to back fill 6 + 5 × 22 min; the spare 4 min is the end page", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-mock", mode: "hard" });
    const commitMin = { sketching: 5, creativity: 11, visual: 11, form: 11, "problem-id": 13 };
    const st = state(ctx, s.id, 116 * M);
    expect(st.partB!.currentPos).toBeNull();
    st.partB!.attempts.forEach((a) =>
      expect(a).toMatchObject({ progress: "out", autoCommitted: true, secondsToCommit: commitMin[a.slot] * 60, usedMs: 22 * M }),
    );
    expect(st.session.status).toBe("live");
    expect(state(ctx, s.id, 120 * M).session.status).toBe("completed");
  });

  it("skip: uncommitted only; next open question; coming back reopens it with its time", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-mock", mode: "hard" });
    state(ctx, s.id, 6 * M);
    ctx.clock.t = T0 + 7 * M;
    skipQuestion(ctx, s.id, 0);
    let st = state(ctx, s.id);
    expect(st.partB!.attempts[0]).toMatchObject({ progress: "skipped", usedMs: M });
    expect(st.partB!.currentPos).toBe(1);
    changeQuestionStep(ctx, s.id, 1, "ideas");
    commit(ctx, s.id, 1);
    expectApiError(() => skipQuestion(ctx, s.id, 1), 409);
    doneQuestion(ctx, s.id, 1);
    st = state(ctx, s.id);
    expect(st.partB!.currentPos).toBe(2);
    expect(st.partB!.attempts[1].progress).toBe("done");
    // Q3, Q4, Q5 skipped in turn → wraps to Q1 (skipped, still has time); Q2 (done) is passed over.
    skipQuestion(ctx, s.id, 2);
    skipQuestion(ctx, s.id, 3);
    skipQuestion(ctx, s.id, 4);
    st = state(ctx, s.id);
    expect(st.partB!.currentPos).toBe(0);
    expect(st.partB!.attempts[0]).toMatchObject({ progress: "open", usedMs: M });
  });

  it("done needs a commit; after the last open question the end page shows; any question with time reopens", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-mock", mode: "easy" });
    openQuestion(ctx, s.id, 0);
    expectApiError(() => doneQuestion(ctx, s.id, 0), 409);
    for (const pos of [0, 1, 2, 3, 4]) {
      changeQuestionStep(ctx, s.id, pos, "ideas");
      commit(ctx, s.id, pos);
      doneQuestion(ctx, s.id, pos);
    }
    let st = state(ctx, s.id);
    expect(st.partB!.currentPos).toBeNull();
    expect(st.partB!.attempts.every((a) => a.progress === "done")).toBe(true);
    openQuestion(ctx, s.id, 3);
    expect(state(ctx, s.id).partB!.currentPos).toBe(3);
    openEndPage(ctx, s.id);
    st = state(ctx, s.id);
    expect(st.partB!.currentPos).toBeNull();
    expect(st.session.status).toBe("live");
  });

  it("Easy: nothing forced, past the budget the question stays workable", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-mock", mode: "easy" });
    const st = state(ctx, s.id, (6 + 30) * M);
    expect(st.partB!.currentPos).toBe(0);
    expect(st.partB!.attempts[0]).toMatchObject({ step: "read", status: "pending", progress: "open", usedMs: 30 * M });
    changeQuestionStep(ctx, s.id, 0, "ideas");
    commit(ctx, s.id, 0);
    expect(att(ctx, s.id, 0).secondsToCommit).toBe(1800);
  });

  it("actions name the question on screen; a stale one is refused", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-mock", mode: "hard" });
    state(ctx, s.id, 6 * M);
    expectApiError(() => changeQuestionStep(ctx, s.id, 2, "ideas"), 409);
    expectApiError(() => reread(ctx, s.id, 2), 409);
    expectApiError(() => openQuestion(ctx, s.id, 9), 404);
    expectApiError(() => changeQuestionStep(ctx, s.id, 0, "draw"), 409);
  });

  it("total expiry closes the open question, abandons uncommitted ones, completes", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-mock", mode: "easy" });
    state(ctx, s.id, 6 * M);
    const st = state(ctx, s.id, 125 * M);
    expect(st.session.status).toBe("completed");
    expect(getSession(ctx.db, s.id).ended_at).toBe(T0 + 120 * M);
    const a = attempts(ctx.db, s.id);
    expect(a[0]).toMatchObject({ status: "abandoned", used_ms: 114 * M });
    expect(a.slice(1).every((x) => x.status === "abandoned" && x.progress === "unseen")).toBe(true);
    expect(partBResults(ctx, s.id)![0]).toMatchObject({ progress: "open", usedMs: 114 * M });
  });

  it("past paper: printed prompts in printed order; same shape; retake flagged", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "b-past-paper", bPaperId: "b-2024" });
    expect(attempts(ctx.db, s.id).map((a) => a.prompt_id)).toEqual(SLOTS.map((x) => `real-${x}-0`));
    expect(s.config.partB).toEqual({ readAll: 360, budget: 1320, total: 7200 });
    expect(s.config.retake).toBe(false);
    quit(ctx, s.id);
    expect(attempts(ctx.db, s.id).every((a) => a.status === "abandoned")).toBe(true);
    expect(createSession(ctx, { kind: "b-past-paper", bPaperId: "b-2024" }).config.retake).toBe(true);
  });
});

describe("full exam (one session: Part A 60 → lock → Part B 120)", () => {
  it("Part A expiry locks A and starts B with read-all and its full 120 minutes", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "full", mode: "hard" });
    expect(s.ends_at - s.started_at).toBe(180 * M);
    ctx.advance(60 * M);
    const st = sessionState(ctx, s.id);
    expect(st.section).toBe("B");
    expect(st.session.status).toBe("live");
    expect(st.partB!.readAll).toBe(true);
    expect(st.partB!.readAllEndsAt).toBe(T0 + 66 * M);
    const row = getSession(ctx.db, s.id);
    expect(row.a_status).toBe("expired");
    expect(row.b_started_at).toBe(T0 + 60 * M);
    expect(row.score).not.toBeNull();
    ctx.advance(6 * M);
    expect(sessionState(ctx, s.id).partB!.currentPos).toBe(0);
    ctx.advance(114 * M);
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

  it("Part B actions are refused while Part A runs", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "full" });
    expectApiError(() => openQuestion(ctx, s.id, 0), 409);
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

describe("schema", () => {
  it("adds the self-paced columns to a database made before them", () => {
    const file = join(mkdtempSync(join(tmpdir(), "pd-schema-")), "old.db");
    const old = new DatabaseSync(file);
    old.exec(`CREATE TABLE b_attempts (id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL, pos INTEGER NOT NULL,
      prompt_id TEXT NOT NULL, slot TEXT NOT NULL, phases TEXT NOT NULL, block_start_s INTEGER NOT NULL,
      block_end_s INTEGER NOT NULL, commit_deadline_s INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      committed_at INTEGER, seconds_to_commit INTEGER, idea_count INTEGER NOT NULL DEFAULT 0,
      auto_committed INTEGER NOT NULL DEFAULT 0, committed_idea_id INTEGER, commit_label TEXT, checks TEXT)`);
    old.exec(`INSERT INTO b_attempts (session_id, pos, prompt_id, slot, phases, block_start_s, block_end_s, commit_deadline_s)
      VALUES (1, 0, 'p', 'form', '[]', 360, 1680, 1020)`);
    old.close();
    const db = openDb(file);
    const cols = (db.prepare("PRAGMA table_info(b_attempts)").all() as { name: string }[]).map((c) => c.name);
    expect(cols).toEqual(expect.arrayContaining(["progress", "step", "used_ms", "steps_log", "rereads", "reveal_until"]));
    expect(db.prepare("SELECT progress, step, used_ms, rereads FROM b_attempts").get()).toEqual({
      progress: "unseen",
      step: "read",
      used_ms: 0,
      rereads: 0,
    });
    db.close();
    expect(() => openDb(file).close()).not.toThrow(); // idempotent
  });
});
