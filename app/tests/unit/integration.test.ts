// Boots the real file database in a temp data dir: schema idempotent, WAL, persistence across
// reopen, a full Part A + Part B flow, and the export archive.
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { afterAll, describe, expect, it } from "vitest";
import { openDb } from "@/db/db";
import { exportArchive } from "@/engine/export";
import { dashboard, history, today } from "@/engine/progress";
import { addPhoto, advance, answer, createSession, finish, quit, tapIdea } from "@/engine/session";
import { catalog } from "@/engine/catalog";
import { results, sessionState } from "@/engine/view";
import { GENS, RIGHT, T0, fixtureContent } from "./fixtures";
import type { Ctx } from "@/engine/session";
import type { Format } from "@/content/types";

const dir = mkdtempSync(join(tmpdir(), "pd-data-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// Lists entry names in an uncompressed ustar buffer.
function tarNames(buf: Buffer): string[] {
  const names: string[] = [];
  let off = 0;
  while (off + 512 <= buf.length) {
    const name = buf.subarray(off, off + 100).toString("utf8").replace(/\0[\s\S]*$/, "");
    if (!name) break;
    const size = parseInt(buf.subarray(off + 124, off + 136).toString("utf8").replace(/\0[\s\S]*$/, "").trim(), 8);
    names.push(name);
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return names;
}

describe("file database", () => {
  const file = join(dir, "pencil-down.db");
  const clock = { t: T0 };
  const content = fixtureContent();
  const ctxFor = (db: ReturnType<typeof openDb>): Ctx => ({ db, content, generators: GENS, now: () => clock.t, rand: Math.random });

  it("opens with WAL, applies the schema twice without error, persists across reopen", () => {
    const db = openDb(file);
    expect((db.prepare("PRAGMA journal_mode").get() as { journal_mode: string }).journal_mode).toBe("wal");
    const ctx = ctxFor(db);
    const s = createSession(ctx, { kind: "mock", mode: "hard" });
    clock.t += 5_000;
    const cur = sessionState(ctx, s.id).partA!.current!;
    answer(ctx, s.id, cur.pos, RIGHT[cur.question!.format as Format], "sure");
    db.close();

    const again = openDb(file); // schema applied again: idempotent
    const ctx2 = ctxFor(again);
    const st = sessionState(ctx2, s.id);
    expect(st.session.status).toBe("live");
    expect(st.partA!.palette[0].state).toBe("answered");
    advance(ctx2, s.id);
    finish(ctx2, s.id);
    const r = results(ctx2, s.id);
    expect(r.partA!.totals.correct + r.partA!.totals.partial + r.partA!.totals.wrong).toBe(1);
    expect(r.partA!.questions).toHaveLength(44);

    const b = createSession(ctx2, { kind: "b-drill", slot: "sketching" });
    clock.t += 3 * 60_000;
    tapIdea(ctx2, b.id, 0);
    quit(ctx2, b.id);
    mkdirSync(join(dir, "photos"), { recursive: true });
    writeFileSync(join(dir, "photos", "p1.jpg"), Buffer.from([0xff, 0xd8, 0xff]));
    addPhoto(ctx2, b.id, 0, "p1.jpg", "image/jpeg");

    const h = history(ctx2);
    expect(h.map((x) => x.kind)).toEqual(["b-drill", "mock"]);
    expect(h[0].quit).toBe(true);
    expect(history(ctx2, "easy")).toEqual([]);
    expect(dashboard(ctx2, "hard").partA.mockTrend).toHaveLength(1);
    expect(today(ctx2).liveSession).toBeNull();
    expect(catalog(ctx2).counts.questions).toBe(content.questions.length);

    const archive = gunzipSync(exportArchive(again, join(dir, "photos"), clock.t));
    expect(tarNames(archive)).toEqual(["pencil-down.db", "photos/p1.jpg"]);
    again.close();
    expect(existsSync(file)).toBe(true);
  });
});
