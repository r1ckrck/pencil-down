// Served generated questions are frozen: the full GeneratedQuestion is stored the first time it is served, and every
// later read (payload, key, scoring, results, revisit) uses that copy. Generators can then change their output for the
// same id without rewriting history. Ids served before snapshots existed are rebuilt once from the frozen first
// generators (generators/legacy-v1) and stored.
import type { GeneratedQuestion, Generator } from "../content/types";
import { type Db, tx } from "../db/db";
import { LEGACY_V1_GENERATORS } from "../generators/legacy-v1";
import { regenerate } from "./selection";

export type SnapshotOrigin = "current" | "legacy-v1";

export interface SnapshotCtx {
  db: Db;
  now: () => number;
  legacyGenerators?: Generator[]; // defaults to LEGACY_V1_GENERATORS; injectable for tests
}

export function readSnapshot(db: Db, id: string): GeneratedQuestion | null {
  const row = db.prepare("SELECT question FROM generated_questions WHERE id = ?").get(id) as { question: string } | undefined;
  return row ? (JSON.parse(row.question) as GeneratedQuestion) : null;
}

// First write wins: an id, once stored, never changes.
export function saveSnapshot(db: Db, q: GeneratedQuestion, origin: SnapshotOrigin, at: number): void {
  db.prepare("INSERT OR IGNORE INTO generated_questions (id, question, origin, created_at) VALUES (?, ?, ?, ?)").run(
    q.id,
    JSON.stringify(q),
    origin,
    at,
  );
}

function wasServed(db: Db, id: string): boolean {
  return !!db
    .prepare(
      "SELECT 1 FROM a_responses WHERE question_id = ? UNION ALL SELECT 1 FROM error_log WHERE question_id = ? LIMIT 1",
    )
    .get(id, id);
}

function fromLegacy(db: Db, id: string, legacy: Generator[], at: number): GeneratedQuestion | null {
  const q = regenerate(id, legacy);
  if (!q || q.id !== id) return null;
  saveSnapshot(db, q, "legacy-v1", at);
  return q;
}

// The served question for a generated id; null for ids never served (nothing to show or score).
export function generatedQuestion(ctx: SnapshotCtx, id: string): GeneratedQuestion | null {
  const snap = readSnapshot(ctx.db, id);
  if (snap) return snap;
  if (!wasServed(ctx.db, id)) return null;
  return fromLegacy(ctx.db, id, ctx.legacyGenerators ?? LEGACY_V1_GENERATORS, ctx.now());
}

// Stores a snapshot for every generated id referenced by a response or the error log that has none yet.
// Idempotent; run once when the server first opens the database. Returns how many were stored.
export function backfillSnapshots(db: Db, at: number, legacy: Generator[] = LEGACY_V1_GENERATORS): number {
  const ids = (
    db
      .prepare(
        `SELECT question_id AS id FROM a_responses WHERE question_id LIKE 'gen:%'
         UNION SELECT question_id FROM error_log WHERE question_id LIKE 'gen:%'
         EXCEPT SELECT id FROM generated_questions`,
      )
      .all() as { id: string }[]
  ).map((r) => r.id);
  if (!ids.length) return 0;
  return tx(db, () => ids.filter((id) => fromLegacy(db, id, legacy, at)).length);
}
