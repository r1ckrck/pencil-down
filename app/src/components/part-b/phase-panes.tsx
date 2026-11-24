"use client";

import { ArrowRight, Check } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow, Label, RoleLabel } from "@/components/ui/label";
import { spanText } from "./phase-clock";
import type { Attempt } from "./types";

/** Read: the prompt sits above; one button to say she has it. */
export function ReadPane({ busy, onGotIt }: { busy: boolean; onGotIt: () => void }) {
  return (
    <Button variant="primary" size="lg" block disabled={busy} onClick={onGotIt} icon={<ArrowRight weight="bold" />}>
      Got it · start ideas
    </Button>
  );
}

const IDEAS_STEPS: Record<string, string[]> = {
  "problem-id": [
    "List every problem you can see in the situation, on paper. Short phrases, no judging.",
    "In the last 2 minutes, pick the one problem you will solve.",
  ],
  default: [
    "Sketch quick thumbnails on paper: many small ideas, not one finished drawing.",
    "Don't judge yet. Your first idea is rarely the best.",
    "Aim for at least three before you choose.",
  ],
};

/** Ideas happen on paper. The screen only says how to work and when to stop. */
export function IdeasPane({ slot, forced, busy, onPicked }: { slot: string; forced: boolean; busy: boolean; onPicked: () => void }) {
  const steps = IDEAS_STEPS[slot] ?? IDEAS_STEPS.default;
  return (
    <div className="flex flex-col gap-4" data-testid="ideas-pane">
      <section className="flex flex-col gap-2 rounded-md bg-code p-4">
        <Eyebrow>On paper</Eyebrow>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-lead">
          {steps.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </section>
      <Button variant="primary" size="lg" block disabled={busy} onClick={onPicked}>
        I&apos;ve picked one
      </Button>
      <RoleLabel className="text-center">
        {forced ? "At the target the check opens on its own." : "Take the time you need; the clock shows any overrun."}
      </RoleLabel>
    </div>
  );
}

const GATE = ["It obeys every rule", "It isn't my first obvious idea", "I can draw it in the time left"];

/** Commit: a checklist to think through, not a form. One button commits. */
export function CommitPane({
  forced,
  canGoBack,
  busy,
  onCommit,
  onBack,
}: {
  forced: boolean;
  canGoBack: boolean;
  busy: boolean;
  onCommit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4" data-testid="commit-pane">
      <section className="flex flex-col gap-1">
        <Eyebrow>Check your pick</Eyebrow>
        <ol className="flex flex-col">
          {GATE.map((t, i) => (
            <li key={t} className="flex items-baseline gap-3 border-b border-hairline py-3 last:border-b-0">
              <span className="w-6 shrink-0 font-mono text-caption text-mute">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-lead">{t}</span>
            </li>
          ))}
        </ol>
        <RoleLabel>Any no: take your next idea and check again. All yes: commit and draw.</RoleLabel>
      </section>
      <Button variant="primary" size="lg" block disabled={busy} onClick={onCommit} icon={<Check weight="bold" />}>
        Commit · start drawing
      </Button>
      {canGoBack && (
        <Button block disabled={busy} onClick={onBack}>
          Back to ideas
        </Button>
      )}
      <RoleLabel className="text-center">
        {forced ? "At zero it commits on its own and Draw starts." : "Nothing commits on its own; the clock shows any overrun."}
      </RoleLabel>
    </div>
  );
}

/** What she committed to, restated while she draws. */
export function CommittedNote({ attempt }: { attempt: Attempt }) {
  return (
    <div className="flex flex-col gap-1 border-l-2 border-fg pl-4" data-testid="committed">
      <p className="font-mono text-label uppercase text-mute">
        {attempt.autoCommitted ? "Auto-committed" : "Committed"}
        {attempt.secondsToCommit !== null ? ` at ${spanText(attempt.secondsToCommit * 1000)}` : ""}
      </p>
      <p className="text-lead text-fg">
        {attempt.autoCommitted ? "Time's up. Draw the idea you have." : "Draw your pick. No second-guessing now."}
      </p>
    </div>
  );
}

/** Idea-seed note for one prompt during read-all. Kept on this device; also logged as an event. */
export function SeedNote({
  sessionId,
  pos,
  onSave,
  readOnly = false,
}: {
  sessionId: number;
  pos: number;
  onSave?: (text: string) => void;
  readOnly?: boolean;
}) {
  const key = `pd-seed-${sessionId}-${pos}`;
  const [text, setText] = useState("");
  useEffect(() => {
    try {
      // Restoring a per-device draft after mount; storage is unavailable during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(localStorage.getItem(key) ?? "");
    } catch {
      // storage unavailable: start empty
    }
  }, [key]);
  if (readOnly) {
    return text ? (
      <div className="flex flex-col gap-1 border-l-2 border-hairline pl-4" data-testid="seed-note">
        <Eyebrow>Your seed note</Eyebrow>
        <p className="whitespace-pre-wrap text-body text-fg">{text}</p>
      </div>
    ) : null;
  }
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={key}>Idea seeds</Label>
      <textarea
        id={key}
        value={text}
        rows={2}
        onChange={(e) => {
          setText(e.target.value);
          try {
            localStorage.setItem(key, e.target.value);
          } catch {
            // ignore
          }
        }}
        onBlur={() => text.trim() && onSave?.(text.trim())}
        placeholder="First thoughts, words, a reading of the symbol…"
        className="min-h-touch w-full resize-y rounded-sm border border-hairline bg-transparent px-3 py-2 text-body text-fg placeholder:text-mute focus:border-fg focus:outline-none"
      />
    </div>
  );
}
