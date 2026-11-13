import { connection } from "next/server";
import { getDb } from "@/db/db";

export async function GET() {
  await connection();
  const row = getDb().prepare("SELECT sqlite_version() AS v").get() as { v: string };
  return Response.json({ ok: true, sqlite: row.v, serverNow: Date.now() });
}
