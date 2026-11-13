// Server-only: the single SQLite database (node:sqlite), opened lazily and shared.
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_SQL } from "./schema";

export type Db = DatabaseSync;

export function dataDir(): string {
  // Resolved at runtime; turbopackIgnore keeps the bundler from tracing the whole project.
  return resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.PENCIL_DATA_DIR ?? "../data");
}

export function photosDir(): string {
  return join(dataDir(), "photos");
}

export function applySchema(db: Db): void {
  db.exec(SCHEMA_SQL);
}

// path ":memory:" for tests.
export function openDb(path: string): Db {
  const db = new DatabaseSync(path);
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  applySchema(db);
  return db;
}

let shared: Db | null = null;

export function getDb(): Db {
  if (!shared) {
    const dir = dataDir();
    mkdirSync(photosDir(), { recursive: true });
    shared = openDb(join(dir, "pencil-down.db"));
  }
  return shared;
}

export function dbFile(): string {
  return join(dataDir(), "pencil-down.db");
}

// Runs fn inside one transaction; rolls back on throw.
export function tx<T>(db: Db, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
