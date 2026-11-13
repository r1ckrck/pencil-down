import type { ReactNode } from "react";

/**
 * Chrome-free frame for live sessions (spec §4: exam screens drop density).
 * No nav, no sign-off. The screen supplies its own sparse header (timer, palette, Quit).
 */
export function ExamShell({ children }: { children: ReactNode }) {
  return <main className="flex min-h-dvh flex-col">{children}</main>;
}
