import { describe, expect, it } from "vitest";
import { TOPICS } from "@/content/types";
import { ApiError } from "@/engine/errors";
import { DAY_MS } from "@/engine/errorlog";
import { type Mode, PRESETS } from "@/engine/modes";
import { topicQuotas, VISUAL_TOPICS } from "@/engine/selection";
import { updateSettings } from "@/engine/settings";
import {
  advance,
  answer,
  createSession,
  finish,
  getSession,
  quit,
  responses,
  visit,
} from "@/engine/session";
import { partAResults, sessionState } from "@/engine/view";
import { GENS, OLD_SCHEME, RIGHT, T0, WEIGHTS, WRONG, fixtureContent, makeCtx, question } from "./fixtures";
import type { TestCtx } from "./fixtures";
import type { Format } from "@/content/types";

const S = 1000;

function answerCurrent(ctx: TestCtx, sid: number, right = true, confidence: "sure" | "unsure" = "sure") {
  const st = sessionState(ctx, sid);
  const cur = st.partA!.current!;
  const f = cur.question!.format as Format;
  answer(ctx, sid, cur.pos, right ? RIGHT[f] : WRONG[f], confidence);
}

function expectApiError(fn: () => unknown, status: number) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).status).toBe(status);
    return;
  }
  throw new Error("expected ApiError");
}

describe("mock assembly", () => {
  it("8 / 10 / 26 by format, topic quotas ± 1, ~30% of visual slots generated, CEED section order", () => {
    const content = fixtureContent({
      extraQuestions: [
        question("anim-1", "observation", "MCQ", { animated: true }),
        question("drop-1", "observation", "MCQ", { answer: { kind: "DROPPED", marks: 3 } }),
      ],
    });
    for (let seed = 1; seed <= 10; seed++) {
      const ctx = makeCtx(content, GENS, seed);
      const s = createSession(ctx, { kind: "mock" });
      const rows = responses(ctx.db, s.id);
      expect(rows).toHaveLength(44);
      const count = (f: (r: (typeof rows)[0]) => boolean) => rows.filter(f).length;
      expect(count((r) => r.format === "NAT")).toBe(8);
      expect(count((r) => r.format === "MSQ")).toBe(10);
      expect(count((r) => r.format === "MCQ")).toBe(26);
      const quotas = topicQuotas(WEIGHTS);
      for (const t of TOPICS) expect(Math.abs(count((r) => r.topic === t) - quotas[t])).toBeLessThanOrEqual(1);
      const visual = rows.filter((r) => VISUAL_TOPICS.includes(r.topic));
      const gen = visual.filter((r) => r.source === "generated").length;
      expect(Math.abs(gen - Math.round(visual.length * 0.3))).toBeLessThanOrEqual(1);
      expect(rows.some((r) => r.question_id === "anim-1" || r.question_id === "drop-1")).toBe(false);
      expect(rows.map((r) => r.format).join("")).toMatch(/^(NAT){8}(MSQ){10}(MCQ){26}$/);
      expect(s.ends_at - s.started_at).toBe(60 * 60 * S);
    }
  });

  it("works with no generators (falls back to real)", () => {
    const ctx = makeCtx(fixtureContent(), []);
    const s = createSession(ctx, { kind: "mock" });
    const rows = responses(ctx.db, s.id);
    expect(rows).toHaveLength(44);
    expect(rows.every((r) => r.source === "real")).toBe(true);
  });

  it("empty content → 422, not a crash", () => {
    const ctx = makeCtx(fixtureContent({ perCell: 0 }), []);
    expectApiError(() => createSession(ctx, { kind: "mock" }), 422);
  });

  it("no item repeats across 20 consecutive mocks while unseen items remain", () => {
    // pool shaped like the real one: MCQ-heavy, enough for 20 mocks
    const ctx = makeCtx(fixtureContent({ perFormat: { MCQ: 100, MSQ: 40, NAT: 35 } }));
    const served = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const s = createSession(ctx, { kind: "mock" });
      const ids = responses(ctx.db, s.id).map((r) => r.question_id);
      expect(ids).toHaveLength(44);
      for (const id of ids) {
        expect(served.has(id), `mock ${i} repeats ${id}`).toBe(false);
        served.add(id);
      }
      quit(ctx, s.id);
      ctx.advance(DAY_MS);
    }
  });
});

describe("results reference", () => {
  it("band and target apply only to a full paper out of 150, never to a drill", () => {
    const ctx = makeCtx(fixtureContent({ perFormat: { MCQ: 100, MSQ: 40, NAT: 35 } }));
    const mock = createSession(ctx, { kind: "mock" });
    quit(ctx, mock.id);
    const m = partAResults(ctx, mock.id)!;
    expect(m.maxScore).toBe(150);
    expect(m.band).not.toBeNull();
    expect(m.target).not.toBeNull();
    ctx.advance(60 * S);
    const drill = createSession(ctx, { kind: "drill", format: "MCQ", n: 5 });
    quit(ctx, drill.id);
    const d = partAResults(ctx, drill.id)!;
    expect(d.band).toBeNull();
    expect(d.target).toBeNull();
    expect(d.cutoff).toBeNull();
  });
});

describe("retirement", () => {
  it("a real question correct twice never appears in a later session", () => {
    const content = fixtureContent({ perCell: 2 }); // small pool: repeats are forced
    const ctx = makeCtx(content, []);
    const correct = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      let s;
      try {
        s = createSession(ctx, { kind: "drill", topic: "mechanisms", n: 3 });
      } catch (e) {
        expect((e as ApiError).status).toBe(422); // everything in the topic retired
        break;
      }
      const ids = responses(ctx.db, s.id).map((r) => r.question_id);
      for (const id of ids) expect(correct.get(id) ?? 0, `${id} served after retiring`).toBeLessThan(2);
      for (let k = 0; k < ids.length; k++) {
        answerCurrent(ctx, s.id, true);
        advance(ctx, s.id);
      }
      finish(ctx, s.id);
      for (const id of ids) correct.set(id, (correct.get(id) ?? 0) + 1);
      ctx.advance(60 * S);
    }
    expect([...correct.values()].filter((n) => n >= 2).length).toBe(6); // all 6 mechanisms questions retired
  });
});

describe("forced skip (Hard)", () => {
  it("fires at budget expiry, saves the answer unchanged, moves the question to the revisit queue", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "drill", mode: "hard", format: "MCQ", topic: "mechanisms", n: 3 });
    const first = sessionState(ctx, s.id).partA!.current!;
    expect(first.budgetMs).toBe(60 * S);
    ctx.advance(10 * S);
    answer(ctx, s.id, 0, { kind: "MCQ", option: "C" }, "unsure");
    ctx.advance(50 * S - 1);
    expect(sessionState(ctx, s.id).partA!.current!.pos).toBe(0);
    ctx.advance(1); // exactly at the budget
    const st = sessionState(ctx, s.id);
    expect(st.partA!.current!.pos).toBe(1);
    expect(st.partA!.current!.visitStartedAt).toBe(T0 + 60 * S);
    const r0 = responses(ctx.db, s.id)[0];
    expect(r0.forced_skip).toBe(1);
    expect(JSON.parse(r0.answer!)).toEqual({ kind: "MCQ", option: "C" });
    expect(r0.confidence).toBe("unsure");
    expect(r0.time_ms).toBe(60 * S);
    expect(r0.in_queue).toBe(1);
    // a late write to the skipped question is refused; the saved state stays as it was
    expectApiError(() => answer(ctx, s.id, 0, { kind: "MCQ", option: "B" }), 409);
    expect(JSON.parse(responses(ctx.db, s.id)[0].answer!)).toEqual({ kind: "MCQ", option: "C" });
  });

  it("checked 200 ms late, the skip is still recorded at the exact expiry instant", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "drill", mode: "hard", format: "MCQ", n: 3 });
    ctx.advance(60 * S + 200);
    const st = sessionState(ctx, s.id);
    expect(st.partA!.current!.visitStartedAt).toBe(T0 + 60 * S);
    expect(st.nextEventAt).toBe(T0 + 120 * S);
  });

  it("after the last question the revisit queue opens with fresh budgets", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "drill", mode: "hard", format: "MCQ", n: 3 });
    ctx.advance(5 * S);
    answerCurrent(ctx, s.id);
    advance(ctx, s.id); // pos 0 answered → pos 1
    ctx.advance(60 * S); // pos 1 forced
    ctx.advance(60 * S); // pos 2 forced → revisit queue [1, 2]
    const st = sessionState(ctx, s.id);
    expect(st.partA!.phase).toBe("revisit");
    expect(st.partA!.queue).toEqual([1, 2]);
    expect(st.partA!.current!.pos).toBe(1);
    expect(st.partA!.current!.budgetMs).toBe(60 * S);
    answerCurrent(ctx, s.id);
    advance(ctx, s.id);
    expect(sessionState(ctx, s.id).partA!.current!.pos).toBe(2);
    expect(sessionState(ctx, s.id).partA!.queue).toEqual([2]);
  });
});

describe("Part A switch combinations (Custom)", () => {
  for (const questionTimer of [true, false])
    for (const forcedSkip of [true, false])
      it(`questionTimer=${questionTimer} forcedSkip=${forcedSkip}`, () => {
        const ctx = makeCtx();
        updateSettings(ctx.db, { custom: { questionTimer, forcedSkip, phaseTimer: true, questionHiding: false } });
        const s = createSession(ctx, { kind: "drill", mode: "custom", format: "MCQ", n: 2 });
        ctx.advance(61 * S);
        const st = sessionState(ctx, s.id);
        expect(st.session.switches.questionTimer).toBe(questionTimer);
        if (forcedSkip) {
          expect(st.partA!.current!.pos).toBe(1);
          expect(responses(ctx.db, s.id)[0].forced_skip).toBe(1);
        } else {
          // Easy behaviour: stays, bar turns bad, time keeps counting
          expect(st.partA!.current!.pos).toBe(0);
          expect(st.partA!.current!.overBudget).toBe(true);
          expect(st.partA!.current!.elapsedMs).toBe(61 * S);
          expect(responses(ctx.db, s.id)[0].forced_skip).toBe(0);
        }
      });

  it("Easy and Hard presets behave like their switches", () => {
    for (const mode of ["easy", "hard"] as Mode[]) {
      const ctx = makeCtx();
      const s = createSession(ctx, { kind: "drill", mode, format: "MCQ", n: 2 });
      ctx.advance(61 * S);
      expect(sessionState(ctx, s.id).partA!.current!.pos).toBe(PRESETS[mode as "easy" | "hard"].forcedSkip ? 1 : 0);
    }
  });
});

describe("reload safety", () => {
  it("state derives from server timestamps: polling or not gives the same record, time away included", () => {
    const run = (poll: boolean) => {
      const ctx = makeCtx(fixtureContent(), GENS, 7);
      const s = createSession(ctx, { kind: "drill", mode: "hard", format: "MCQ", topic: "mechanisms", n: 5 });
      ctx.advance(20 * S);
      answerCurrent(ctx, s.id);
      // she closes the tab for 150 s
      for (let i = 0; i < 150; i++) {
        ctx.advance(S);
        if (poll) sessionState(ctx, s.id);
      }
      const st = sessionState(ctx, s.id);
      return {
        current: st.partA!.current!.pos,
        visitStartedAt: st.partA!.current!.visitStartedAt,
        rows: responses(ctx.db, s.id).map((r) => [r.time_ms, r.visits, r.forced_skip, r.answer]),
        elapsed: ctx.now() - st.session.startedAt,
      };
    };
    const a = run(true);
    const b = run(false);
    expect(a).toEqual(b);
    expect(a.current).toBe(2); // 0 forced at 60 s, 1 forced at 120 s
    expect(a.visitStartedAt).toBe(T0 + 120 * S);
    expect(a.elapsed).toBe(170 * S);
  });
});

describe("quit and expiry", () => {
  it("quit records every unanswered question as skipped and sets status quit", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "drill", mode: "easy", format: "MCQ", n: 4 });
    answerCurrent(ctx, s.id, true);
    advance(ctx, s.id);
    answerCurrent(ctx, s.id, false);
    ctx.advance(30 * S);
    quit(ctx, s.id);
    const row = getSession(ctx.db, s.id);
    expect(row.status).toBe("quit");
    expect(row.ended_at).toBe(T0 + 30 * S);
    expect(responses(ctx.db, s.id).map((r) => r.outcome)).toEqual(["correct", "wrong", "blank", "blank"]);
    const res = partAResults(ctx, s.id)!;
    expect(res.totals.skipped).toBe(2);
    expect(res.score).toBe(2.5);
    expect(res.lostToWrong).toBe(0.5);
    expect(res.leftBySkipping).toBe(6);
  });

  it("a session left open past ends_at closes as expired at ends_at, with the same recording", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "drill", mode: "easy", format: "MCQ", n: 3 });
    expect(s.ends_at).toBe(T0 + 180 * S);
    answerCurrent(ctx, s.id, true);
    ctx.advance(10 * 60 * S); // walked away
    const st = sessionState(ctx, s.id);
    expect(st.session.status).toBe("expired");
    expect(st.session.endedAt).toBe(T0 + 180 * S);
    expect(responses(ctx.db, s.id).map((r) => r.outcome)).toEqual(["correct", "blank", "blank"]);
    expect(responses(ctx.db, s.id)[0].time_ms).toBe(180 * S);
  });

  it("overall expiry ends the section from any state (mid forced-skip chain, in revisit)", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "drill", mode: "hard", format: "MCQ", n: 2 });
    answerCurrent(ctx, s.id);
    advance(ctx, s.id); // pos 1 from t=0, forced at 60 s → revisit queue [1]
    ctx.advance(119 * S);
    expect(sessionState(ctx, s.id).partA!.phase).toBe("revisit");
    ctx.advance(S);
    sessionState(ctx, s.id); // any request settles
    const row = getSession(ctx.db, s.id);
    expect(row.status).toBe("expired");
    expect(row.ended_at).toBe(T0 + 120 * S);
    expectApiError(() => advance(ctx, s.id), 409);
  });

  it("only one live session; an expired one frees the slot lazily", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "drill", mode: "easy", n: 1 });
    expectApiError(() => createSession(ctx, { kind: "drill", n: 1 }), 409);
    ctx.advance(10 * 60 * S);
    const s2 = createSession(ctx, { kind: "b-drill", slot: "sketching" });
    expect(getSession(ctx.db, s.id).status).toBe("expired");
    expect(s2.status).toBe("live");
  });
});

describe("error log", () => {
  it("wrong / unsure-correct / forced-skip enter; reappear only on or after due_at; sure-correct resolves", () => {
    const ctx = makeCtx(fixtureContent(), []);
    const s = createSession(ctx, { kind: "drill", mode: "hard", format: "MCQ", topic: "mechanisms", n: 4 });
    const ids = responses(ctx.db, s.id).map((r) => r.question_id);
    answerCurrent(ctx, s.id, false); // wrong
    advance(ctx, s.id);
    answerCurrent(ctx, s.id, true, "unsure"); // unsure-correct
    advance(ctx, s.id);
    answerCurrent(ctx, s.id, true, "sure"); // clean
    advance(ctx, s.id);
    ctx.advance(60 * S); // forced skip, blank
    finish(ctx, s.id);
    const end = ctx.now();
    const log = ctx.db.prepare("SELECT question_id, reason, due_at FROM error_log ORDER BY id").all() as {
      question_id: string;
      reason: string;
      due_at: number;
    }[];
    expect(log.map((l) => [l.question_id, l.reason])).toEqual([
      [ids[0], "wrong"],
      [ids[1], "unsure-correct"],
      [ids[3], "forced-skip"],
    ]);
    expect(log[0].due_at).toBe(end + DAY_MS);
    expect(log[1].due_at).toBe(end + 3 * DAY_MS);

    ctx.clock.t = end + DAY_MS - 1;
    expectApiError(() => createSession(ctx, { kind: "revisit" }), 422);
    ctx.clock.t = end + DAY_MS;
    const r = createSession(ctx, { kind: "revisit", mode: "easy" });
    const due = responses(ctx.db, r.id).map((x) => x.question_id);
    expect(due.sort()).toEqual([ids[0], ids[3]].sort());
    while (sessionState(ctx, r.id).partA!.current) {
      answerCurrent(ctx, r.id, true, "sure");
      const pos = sessionState(ctx, r.id).partA!.current!.pos;
      advance(ctx, r.id);
      if (pos === due.length - 1) break;
    }
    finish(ctx, r.id);
    const open = ctx.db.prepare("SELECT question_id FROM error_log WHERE resolved_at IS NULL").all() as { question_id: string }[];
    expect(open.map((o) => o.question_id)).toEqual([ids[1]]);
  });
});

describe("past paper", () => {
  const ids = ["pp-q3", "pp-q1", "pp-q2", "pp-q4", "pp-q5"];
  const content = fixtureContent({
    extraQuestions: [
      question("pp-q1", "mechanisms", "MSQ", { paperId: "ceed-2021" }),
      question("pp-q2", "observation", "MCQ", { paperId: "ceed-2021" }),
      question("pp-q3", "language", "NAT", { paperId: "ceed-2021" }),
      question("pp-q4", "observation", "MCQ", { paperId: "ceed-2021", answer: { kind: "DROPPED", marks: 2 } }),
      question("pp-q5", "observation", "MCQ", { paperId: "ceed-2021", animated: true }),
    ],
    papers: [
      {
        id: "ceed-2021",
        exam: "CEED",
        year: 2021,
        label: "CEED 2021",
        durationMin: 60,
        scheme: OLD_SCHEME,
        totalMarks: 12,
        questionIds: ids,
        pastPaperEligible: true,
        cutoff: 24.58,
      },
    ],
  });

  it("serves exactly the paper in printed order, own scheme, retired included, retake flagged", () => {
    const ctx = makeCtx(content, []);
    ctx.db.prepare("INSERT INTO mastery (question_id, correct_count, retired_at) VALUES ('pp-q1', 2, ?)").run(T0);
    const s = createSession(ctx, { kind: "past-paper", paperId: "ceed-2021", mode: "easy" });
    expect(responses(ctx.db, s.id).map((r) => r.question_id)).toEqual(ids);
    expect(s.config.retake).toBe(false);
    expect(s.ends_at - s.started_at).toBe(60 * 60 * S);
    answer(ctx, s.id, 0, RIGHT.NAT); // pp-q3 NAT → +3 (old scheme)
    advance(ctx, s.id);
    answer(ctx, s.id, 1, { kind: "MSQ", options: ["A"] }); // subset, no partial → −0.2
    advance(ctx, s.id);
    answer(ctx, s.id, 2, WRONG.MCQ); // −0.5
    finish(ctx, s.id);
    const res = partAResults(ctx, s.id)!;
    expect(res.score).toBeCloseTo(3 - 0.2 - 0.5 + 2); // dropped pp-q4 gives everyone 2
    expect(res.maxScore).toBe(3 + 3 + 2 + 2 + 2);
    expect(res.cutoff).toBe(24.58);
    expect(res.band).toBeNull();
    const again = createSession(ctx, { kind: "past-paper", paperId: "ceed-2021" });
    expect(again.config.retake).toBe(true);
  });

  it("dropped questions never enter mocks, drills or revisit", () => {
    const ctx = makeCtx(content, []);
    for (let i = 0; i < 5; i++) {
      const s = createSession(ctx, { kind: "drill", topic: "observation", format: "MCQ", n: 30 });
      expect(responses(ctx.db, s.id).some((r) => r.question_id === "pp-q4" || r.question_id === "pp-q5")).toBe(false);
      quit(ctx, s.id);
    }
  });
});

describe("palette jumps", () => {
  it("visit opens any question with a fresh budget", () => {
    const ctx = makeCtx();
    const s = createSession(ctx, { kind: "drill", mode: "hard", format: "MCQ", n: 4 });
    ctx.advance(30 * S);
    visit(ctx, s.id, 3);
    const st = sessionState(ctx, s.id);
    expect(st.partA!.current!.pos).toBe(3);
    expect(st.partA!.current!.budgetEndsAt).toBe(T0 + 90 * S);
    expect(st.partA!.palette[0].state).toBe("skipped");
    expect(st.partA!.palette[1].state).toBe("unseen");
  });
});
