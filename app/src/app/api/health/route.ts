import { DatabaseSync } from "node:sqlite";

export async function GET() {
  const db = new DatabaseSync(":memory:");
  const row = db.prepare("select sqlite_version() as v").get() as { v: string };
  db.close();
  return Response.json({ ok: true, sqlite: row.v });
}
