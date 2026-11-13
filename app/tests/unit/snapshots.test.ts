// Served generated questions are frozen (engine/snapshots.ts): a generator change never rewrites what was served.
import { describe, expect, it } from "vitest";
import type { Difficulty, Format, GeneratedQuestion, Generator } from "@/content/types";
import { DAY_MS } from "@/engine/errorlog";
import { questionKey, questionPayload } from "@/engine/items";
import { answer, createSession, finish, responses, visit } from "@/engine/session";
import { backfillSnapshots, generatedQuestion, readSnapshot } from "@/engine/snapshots";
import { partAResults, sessionState } from "@/engine/view";
import { LEGACY_V1_GENERATORS } from "@/generators/legacy-v1";
import { RIGHT, fakeGenerator, fixtureContent, makeCtx } from "./fixtures";
import type { TestCtx } from "./fixtures";

// Same id, different output: the stem, figure and key all move.
function changed(g: Generator, tag: string): Generator {
  return {
    ...g,
    generate(seed: number, difficulty: Difficulty, format: Format): GeneratedQuestion {
      const q = g.generate(seed, difficulty, format);
      return {
        ...q,
        stem: `${tag} ${q.stem}`,
        figure: `<svg viewBox="0 0 1 1"><text>${tag}</text></svg>`,
        answer: format === "MCQ" ? { kind: "MCQ", option: "D" } : q.answer,
        explanation: tag,
      };
    },
  };
}

const V1 = [fakeGenerator("matrix", "logic-and-counting", ["MCQ"])];
const content = fixtureContent({ perCell: 2 });

function generatedRows(ctx: TestCtx, sid: number) {
  return responses(ctx.db, sid).filter((r) => r.source === "generated");
}

describe("served-question snapshots", () => {
  it("a served item stays identical after the current generator changes (payload, key, scoring, results, revisit)", () => {
    const ctx = makeCtx(content, V1);
    const s = createSession(ctx, { kind: "drill", topic: "logic-and-counting", format: "MCQ", n: 6, mode: "easy" });
    const gen = generatedRows(ctx, s.id);
    expect(gen.length).toBeGreaterThan(0);
    const before = gen.map((r) => ({
      payload: questionPayload(ctx, r.question_id),
      key: questionKey(ctx, r.question_id),
    }));
    for (const r of gen) expect(readSnapshot(ctx.db, r.question_id)?.id).toBe(r.question_id);

    // The generators change under her history.
    ctx.generators = V1.map((g) => changed(g, "V2"));
    ctx.legacyGenerators = V1.map((g) => changed(g, "LEGACY"));
    gen.forEach((r, i) => {
      expect(questionPayload(ctx, r.question_id)).toEqual(before[i].payload);
      expect(questionKey(ctx, r.question_id)).toEqual(before[i].key);
    });
    const first = sessionState(ctx, s.id).partA!.current!;
    if (first.question?.source === "generated") expect(first.question.stem).not.toMatch(/V2|LEGACY/);

    // Answer B everywhere: scored against the snapshot's key (B), not V2's (D).
    for (const r of responses(ctx.db, s.id)) {
      visit(ctx, s.id, r.pos);
      answer(ctx, s.id, r.pos, RIGHT.MCQ);
    }
    finish(ctx, s.id);
    const res = partAResults(ctx, s.id)!;
    for (const q of res.questions.filter((x) => x.source === "generated")) {
      expect(q.key).toEqual({ kind: "MCQ", option: "B" });
      expect(q.outcome).toBe("correct");
      expect(q.explanation).toBe("by construction");
      expect(q.question?.source === "generated" && q.question.stem).not.toMatch(/V2/);
    }

    // Revisit serves the same frozen question.
    ctx.db
      .prepare(
        "INSERT INTO error_log (question_id, reason, created_at, due_at) SELECT ?, 'wrong', ?, ? WHERE NOT EXISTS (SELECT 1 FROM error_log WHERE question_id = ?)",
      )
      .run(gen[0].question_id, ctx.now(), ctx.now(), gen[0].question_id);
    ctx.advance(DAY_MS);
    const rv = createSession(ctx, { kind: "revisit" });
    const served = generatedRows(ctx, rv.id).find((r) => r.question_id === gen[0].question_id);
    expect(served).toBeDefined();
    expect(questionPayload(ctx, gen[0].question_id)).toEqual(before[0].payload);
  });

  it("an id served before snapshots falls back to legacy-v1 once, then stays frozen", () => {
    const ctx = makeCtx(content, V1);
    const s = createSession(ctx, { kind: "drill", topic: "logic-and-counting", format: "MCQ", n: 4 });
    const id = generatedRows(ctx, s.id)[0].question_id;
    ctx.db.prepare("DELETE FROM generated_questions").run(); // as if served before this table existed

    ctx.generators = V1.map((g) => changed(g, "V2"));
    ctx.legacyGenerators = V1.map((g) => changed(g, "LEGACY"));
    const p = questionPayload(ctx, id);
    expect(p?.source === "generated" && p.stem).toMatch(/^LEGACY /);
    expect(ctx.db.prepare("SELECT origin FROM generated_questions WHERE id = ?").get(id)).toEqual({ origin: "legacy-v1" });

    ctx.legacyGenerators = V1.map((g) => changed(g, "OTHER"));
    expect(questionPayload(ctx, id)).toEqual(p);
  });

  it("backfill freezes every generated id in responses and the error log from the real legacy-v1 generators", () => {
    const ctx = makeCtx(content, []);
    // visible-faces is retired in legacy-v1: it still rebuilds what was served.
    const ids = ["gen:visible-faces:NAT:2:7", "gen:cube-net:MCQ:1:12345"];
    ctx.db.prepare("INSERT INTO error_log (question_id, reason, created_at, due_at) VALUES (?, 'wrong', 0, 0)").run(ids[0]);
    ctx.db
      .prepare("INSERT INTO sessions (id, kind, mode, config, started_at, ends_at, status) VALUES (1, 'drill', 'easy', '{}', 0, 0, 'quit')")
      .run();
    ctx.db
      .prepare(
        "INSERT INTO a_responses (session_id, pos, question_id, source, format, topic, budget_ms) VALUES (1, 0, ?, 'generated', 'MCQ', '3d-visualisation', 60000)",
      )
      .run(ids[1]);

    expect(backfillSnapshots(ctx.db, 1)).toBe(2);
    expect(backfillSnapshots(ctx.db, 2)).toBe(0); // idempotent
    for (const id of ids) {
      const [, gen, format, d, seed] = id.split(":");
      const legacy = LEGACY_V1_GENERATORS.find((g) => g.id === gen)!;
      expect(readSnapshot(ctx.db, id)).toEqual(legacy.generate(Number(seed), Number(d) as Difficulty, format as Format));
    }
  });

  it("ids never served resolve to nothing and store nothing", () => {
    const ctx = makeCtx(content, V1);
    expect(generatedQuestion(ctx, "gen:matrix:MCQ:1:99")).toBeNull();
    expect(questionPayload(ctx, "gen:matrix:MCQ:1:99")).toBeNull();
    expect(ctx.db.prepare("SELECT COUNT(*) AS n FROM generated_questions").get()).toEqual({ n: 0 });
  });

  it("retired generators are never selected, while their served questions still read back", () => {
    const live = fakeGenerator("matrix", "logic-and-counting", ["MCQ"]);
    const old = fakeGenerator("old-matrix", "logic-and-counting", ["MCQ"]);
    const ctx = makeCtx(content, [live, old]);
    const s = createSession(ctx, { kind: "drill", topic: "logic-and-counting", format: "MCQ", n: 10 });
    const oldId = generatedRows(ctx, s.id).find((r) => r.question_id.startsWith("gen:old-matrix:"))?.question_id;
    expect(oldId).toBeDefined();
    const before = questionPayload(ctx, oldId!);
    finish(ctx, s.id);

    ctx.generators = [live, { ...old, retired: true }];
    for (let i = 0; i < 10; i++) {
      for (const kind of ["drill", "mock"] as const) {
        const x = createSession(ctx, kind === "drill" ? { kind, topic: "logic-and-counting", format: "MCQ", n: 10 } : { kind });
        expect(responses(ctx.db, x.id).some((r) => r.question_id.startsWith("gen:old-matrix:"))).toBe(false);
        finish(ctx, x.id);
      }
    }
    expect(questionPayload(ctx, oldId!)).toEqual(before);
  });
});
