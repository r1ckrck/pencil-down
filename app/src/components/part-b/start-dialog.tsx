"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Slot } from "@/content/types";
import type { Mode, Switches } from "@/engine/modes";
import { sessionHref } from "./api";

export type BStartRequest =
  | { kind: "b-drill"; slot?: Slot }
  | { kind: "b-mock" }
  | { kind: "b-past-paper"; bPaperId: string }
  | { kind: "full" };

const MODE_LABEL: Record<Mode, string> = { easy: "Easy", hard: "Hard", custom: "Custom" };

/** One line on what the mode does. Hard is the point of Part B: read once, then hold it in your head. */
function modeLine(mode: Mode, custom: Switches, full: boolean): string {
  if (mode === "easy")
    return full
      ? "Part A timer visible, no forced skip. Part B prompt stays on screen."
      : "The prompt stays on screen for the whole attempt.";
  if (mode === "hard")
    return full
      ? "Part A timer hidden, forced skip at zero. Part B prompt hides after Read."
      : "The prompt shows only while you read, then hides. Read once; hold it in your head.";
  const hide = custom.questionHiding ? "prompt hides after Read" : "prompt stays on screen";
  const clock = custom.phaseTimer ? "phase clock visible" : "phase clock hidden";
  return `From Settings: ${hide}, ${clock}.`;
}

/**
 * Start screen for every Part B session (and the full exam): Easy / Hard / Custom, pre-selected
 * to the last mode used, one line on what it does, then Start. Start is the confirm.
 */
export function BStartDialog({
  trigger,
  title,
  summary,
  request,
  defaultMode,
  custom,
}: {
  trigger: ReactNode;
  title: string;
  summary: ReactNode;
  request: BStartRequest;
  defaultMode: Mode;
  custom: Switches;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = request.kind === "full";

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...request, mode }),
      });
      const body = await r.json();
      if (r.ok) return router.push(sessionHref(body.session.id, body.session.kind));
      if (r.status === 409 && body.sessionId) return router.push(`/part-b/${body.sessionId}`);
      setError(r.status === 422 ? "No prompts left for this choice." : (body.error ?? "Could not start."));
    } catch {
      setError("Can't reach the server.");
    }
    setBusy(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setError(null);
      }}
      trigger={trigger}
      title={title}
      description={summary}
      footer={
        <>
          <Button variant="quiet" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={start} disabled={busy}>
            {busy ? "Starting…" : "Start"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Eyebrow>Mode</Eyebrow>
        <SegmentedControl
          aria-label="Difficulty mode"
          block
          value={mode}
          onValueChange={setMode}
          options={(["easy", "hard", "custom"] as Mode[]).map((m) => ({ value: m, label: MODE_LABEL[m] }))}
        />
        <p className="min-h-12 text-small text-fg" data-testid="mode-line">
          {modeLine(mode, custom, full)}
        </p>
        <p className="border-t border-hairline pt-4 text-small text-mute">
          No pause, no save. The clock runs on the server from Start; quitting records unfinished slots as abandoned.
        </p>
        {error && (
          <p role="alert" className="text-small text-bad">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
