"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RequestError, getJSON, postJSON } from "./api";
import type { SessionState } from "./types";

/**
 * Live session state, owned by the server. The client only re-reads it:
 *  - at `nextEventAt` (phase change, commit point, end), corrected for clock skew;
 *  - when the page becomes visible again (phone unlocked, tab refocused);
 *  - after every action (each action returns fresh state).
 * Nothing here pauses or extends anything.
 */
export function useSessionState(sessionId: number, initial: SessionState) {
  const [state, setState] = useState(initial);
  const skew = useRef(0); // serverNow − Date.now() at receipt
  const latest = useRef(initial);

  const apply = useCallback((next: SessionState) => {
    skew.current = next.serverNow - Date.now();
    latest.current = next;
    setState(next);
  }, []);

  const refetch = useCallback(async () => {
    try {
      apply(await getJSON<SessionState>(`/api/sessions/${sessionId}`));
    } catch {
      // Offline for a moment: the next scheduled read or action catches up.
    }
  }, [apply, sessionId]);

  useEffect(() => {
    skew.current = initial.serverNow - Date.now();
  }, [initial.serverNow]);

  // Server-scheduled boundary: refetch at that instant (+ a hair so the server has crossed it).
  useEffect(() => {
    const at = state.nextEventAt;
    if (at === null) return;
    const delay = Math.max(0, at - (Date.now() + skew.current)) + 120;
    const id = setTimeout(refetch, Math.min(delay, 2 ** 31 - 1));
    return () => clearTimeout(id);
  }, [state.nextEventAt, state.serverNow, refetch]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refetch]);

  /** POST an action that returns SessionState. A 409 (window closed, already committed) re-reads. */
  const act = useCallback(
    async (path: string, body?: unknown) => {
      try {
        const next = await postJSON<SessionState>(`/api/sessions/${sessionId}/${path}`, body);
        apply(next);
        return next;
      } catch (e) {
        if (e instanceof RequestError && e.status === 409) await refetch();
        else throw e;
        return null;
      }
    },
    [apply, refetch, sessionId],
  );

  return { state, apply, refetch, act, latest };
}

/** Keep the phone screen awake while a session runs (best effort; not all browsers allow it). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = () => {
      navigator.wakeLock
        .request("screen")
        .then((l) => {
          if (cancelled) void l.release();
          else lock = l;
        })
        .catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [active]);
}
