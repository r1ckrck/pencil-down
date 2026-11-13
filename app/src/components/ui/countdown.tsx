"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Server-anchored clock. `serverNow` is the server's epoch ms from the same response that
 * delivered the deadline; the browser clock is only used to measure time passing since then,
 * so a wrong device clock never shifts the deadline.
 *
 * First render returns `serverNow` exactly (server and client markup agree), then ticks.
 */
export function useServerNow(serverNow: number, intervalMs = 250): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const offset = serverNow - Date.now();
    const tick = () => setNow(Date.now() + offset);
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [serverNow, intervalMs]);
  return now;
}

/** Remaining ms to a server deadline, never below 0. Fires `onExpire` once on reaching 0. */
export function useCountdown({
  deadline,
  serverNow,
  onExpire,
}: {
  deadline: number;
  serverNow: number;
  onExpire?: () => void;
}): number {
  const now = useServerNow(serverNow);
  const remaining = Math.max(0, deadline - now);
  const fired = useRef(false);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);
  useEffect(() => {
    if (remaining === 0 && !fired.current) {
      fired.current = true;
      expire.current?.();
    }
    if (remaining > 0) fired.current = false;
  }, [remaining]);
  return remaining;
}

/** mm:ss, or h:mm:ss from one hour. Rounds up so 0:00 appears only at true expiry. */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${String(m).padStart(2, "0")}:${ss}`;
}

/** Spoken form for assistive tech, e.g. "4 minutes 05 seconds remaining". */
function spoken(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} minute${m === 1 ? "" : "s"} ${s} second${s === 1 ? "" : "s"} remaining`;
}

/**
 * Mono countdown to a server-owned deadline.
 * `accent` marks it as the screen's live element; under `warnBelowMs` it turns --data-bad.
 */
export function CountdownText({
  deadline,
  serverNow,
  onExpire,
  warnBelowMs,
  accent = false,
  size = "timer",
  label,
  className,
}: {
  deadline: number;
  serverNow: number;
  onExpire?: () => void;
  warnBelowMs?: number;
  accent?: boolean;
  size?: "timer" | "heading" | "body";
  /** Accessible name, e.g. "Section time". */
  label?: string;
  className?: string;
}) {
  const remaining = useCountdown({ deadline, serverNow, onExpire });
  const warn = warnBelowMs !== undefined && remaining <= warnBelowMs;
  return (
    <span
      role="timer"
      aria-label={label ? `${label}: ${spoken(remaining)}` : spoken(remaining)}
      className={cn(
        "font-mono font-medium tabular transition-colors duration-(--dur-base) ease-measured",
        size === "timer" && "text-timer",
        size === "heading" && "text-heading",
        size === "body" && "text-body",
        warn ? "text-bad" : accent ? "text-accent" : "text-fg",
        className,
      )}
    >
      {formatClock(remaining)}
    </span>
  );
}
