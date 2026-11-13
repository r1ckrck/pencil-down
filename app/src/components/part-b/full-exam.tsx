"use client";

import { useState } from "react";
import { PartARunner } from "@/components/part-a/part-a-runner";
import type { SessionState as PartAState } from "@/components/part-a/types";
import type { Playbook, MarkScheme } from "@/content/types";
import { PartBRunner } from "./part-b-runner";
import type { BResult, SessionState } from "./types";

/**
 * Full exam (180 min): one session. Part A runs first; when it locks (expiry or submit) the
 * server starts Part B at that instant and this screen hands over to the Part B runner.
 */
export function FullExam({
  sessionId,
  initial,
  playbooks,
  scheme,
  initialResults,
}: {
  sessionId: number;
  initial: SessionState;
  playbooks: Playbook[];
  scheme: MarkScheme;
  initialResults: BResult[] | null;
}) {
  const inA = initial.section === "A" && initial.partA?.closedAt === null;
  const [bState, setBState] = useState<SessionState | null>(inA ? null : initial);

  if (!bState) {
    return (
      <PartARunner
        sessionId={sessionId}
        initial={initial as unknown as PartAState}
        scheme={scheme}
        title="Full exam · Part A"
        onPartAClosed={(st) => setBState(st as unknown as SessionState)}
      />
    );
  }
  return <PartBRunner key="b" sessionId={sessionId} initial={bState} playbooks={playbooks} initialResults={initialResults} />;
}
