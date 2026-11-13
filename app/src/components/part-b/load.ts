// Server-side reads for the Part B screens: the same engine read models the API routes return.
// Call only from server components, after `await connection()`.
import { ApiError } from "@/engine/errors";
import { partBResults, sessionState } from "@/engine/view";
import { getCtx } from "@/server/api";

export function loadSession(id: number) {
  if (!Number.isInteger(id)) return null;
  const ctx = getCtx();
  try {
    const state = sessionState(ctx, id);
    const closed = state.session.status !== "live";
    return {
      state,
      playbooks: ctx.content.playbooks,
      results: closed ? partBResults(ctx, id) : null,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export type JournalPhoto = {
  id: number;
  url: string;
  at: number;
  sessionId: number;
  kind: string;
  pos: number;
  slot: import("@/content/types").Slot;
  title: string;
  label: string | null;
};

/** Every page photo, newest first, with the slot and prompt it belongs to. */
export function journalPhotos(): JournalPhoto[] {
  const ctx = getCtx();
  const rows = ctx.db
    .prepare(
      `SELECT p.id, p.created_at, a.pos, a.slot, a.prompt_id, a.commit_label, s.id AS sid, s.kind
       FROM photos p JOIN b_attempts a ON a.id = p.attempt_id JOIN sessions s ON s.id = a.session_id
       ORDER BY p.created_at DESC, p.id DESC`,
    )
    .all() as {
    id: number;
    created_at: number;
    pos: number;
    slot: JournalPhoto["slot"];
    prompt_id: string;
    commit_label: string | null;
    sid: number;
    kind: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    url: `/api/photos/${r.id}`,
    at: r.created_at,
    sessionId: r.sid,
    kind: r.kind,
    pos: r.pos,
    slot: r.slot,
    title: ctx.content.promptById.get(r.prompt_id)?.title ?? r.prompt_id,
    label: r.commit_label,
  }));
}

/** Prompts due for a same-prompt re-attempt (10–14 days on), with her last committed attempt at each. */
export function reattempts(promptIds: string[]) {
  const ctx = getCtx();
  const last = ctx.db.prepare(
    `SELECT a.session_id AS sid, s.started_at AS at FROM b_attempts a JOIN sessions s ON s.id = a.session_id
     WHERE a.prompt_id = ? AND a.status = 'committed' ORDER BY s.started_at DESC LIMIT 1`,
  );
  return promptIds.flatMap((pid) => {
    const p = ctx.content.promptById.get(pid);
    const r = last.get(pid) as { sid: number; at: number } | undefined;
    return p && r ? [{ promptId: pid, title: p.title, slot: p.slot, sessionId: r.sid, lastAt: r.at }] : [];
  });
}
