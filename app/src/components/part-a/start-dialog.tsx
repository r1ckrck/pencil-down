"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MODE_LABEL, modeLine } from "./labels";
import type { Kind, Mode, Switches } from "./types";

export type StartRequest = {
  kind: Kind;
  paperId?: string;
  topic?: string | null;
  format?: string | null;
  n?: number;
};

/**
 * The start screen of every Part A session: pick Easy / Hard / Custom (pre-selected: last used),
 * read what it does, then start. Starting is the confirm: no pause, no save.
 */
export function StartDialog({
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
  request: StartRequest;
  defaultMode: Mode;
  custom: Switches;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Close first: Next keeps the previous route alive (hidden), and its portal would stay on screen.
      const go = (sid: number) => {
        setOpen(false);
        setBusy(false);
        router.push(`/part-a/${sid}`);
      };
      if (r.ok) go(body.session.id);
      else if (r.status === 409 && body.sessionId) go(body.sessionId);
      else if (r.status === 422) setError("Nothing to serve for this choice. Try another topic or format.");
      else setError(body.error ?? "Could not start.");
      if (!r.ok) setBusy(false);
    } catch {
      setError("Can't reach the server.");
      setBusy(false);
    }
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
        <p className="min-h-12 text-small text-fg">{modeLine(mode, custom)}</p>
        <p className="border-t border-hairline pt-4 text-small text-mute">
          No pause, no save. The clock runs from Start; quitting records every unanswered question as skipped.
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
