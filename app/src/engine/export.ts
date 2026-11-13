// Export: one .tar.gz holding a consistent snapshot of the database and every photo.
// Minimal ustar writer on node built-ins (no archive dependency).
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import type { Db } from "../db/db";

function header(name: string, size: number, mtime: number): Buffer {
  const h = Buffer.alloc(512);
  const put = (s: string, off: number, len: number) => h.write(s, off, len, "utf8");
  const oct = (n: number, len: number) => (n.toString(8).padStart(len - 1, "0") + "\0").slice(0, len);
  if (Buffer.byteLength(name) > 100) throw new Error(`tar path too long: ${name}`);
  put(name, 0, 100);
  put(oct(0o644, 8), 100, 8);
  put(oct(0, 8), 108, 8);
  put(oct(0, 8), 116, 8);
  put(oct(size, 12), 124, 12);
  put(oct(Math.floor(mtime / 1000), 12), 136, 12);
  put("        ", 148, 8); // checksum placeholder (spaces) while summing
  put("0", 156, 1);
  put("ustar\0", 257, 6);
  put("00", 263, 2);
  let sum = 0;
  for (const b of h) sum += b;
  put(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8);
  return h;
}

export function tar(entries: { name: string; data: Buffer; mtime: number }[]): Buffer {
  const parts: Buffer[] = [];
  for (const e of entries) {
    parts.push(header(e.name, e.data.length, e.mtime), e.data);
    const pad = (512 - (e.data.length % 512)) % 512;
    if (pad) parts.push(Buffer.alloc(pad));
  }
  parts.push(Buffer.alloc(1024));
  return Buffer.concat(parts);
}

export function exportArchive(db: Db, photosDir: string, now: number): Buffer {
  const tmp = mkdtempSync(join(tmpdir(), "pencil-down-export-"));
  try {
    const snap = join(tmp, "pencil-down.db");
    db.exec(`VACUUM INTO '${snap.replace(/'/g, "''")}'`);
    const entries = [{ name: "pencil-down.db", data: readFileSync(snap), mtime: now }];
    if (existsSync(photosDir))
      for (const f of readdirSync(photosDir).sort()) {
        const p = join(photosDir, f);
        const st = statSync(p);
        if (st.isFile()) entries.push({ name: `photos/${f}`, data: readFileSync(p), mtime: st.mtimeMs });
      }
    return gzipSync(tar(entries));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
