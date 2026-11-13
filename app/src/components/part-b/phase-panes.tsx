"use client";

import { Check, Star } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/check-row";
import { Eyebrow, Label, RoleLabel } from "@/components/ui/label";
import { TapCounter } from "@/components/ui/tap-counter";
import { cn } from "@/lib/cn";
import type { Attempt, Idea } from "./types";

const two = (n: number) => String(n).padStart(2, "0");

/** Last starred idea, else the last idea: what the server would auto-commit. */
export function defaultIdea(ideas: Idea[]): Idea | null {
  const starred = ideas.filter((i) => i.starred);
  return starred.at(-1) ?? ideas.at(-1) ?? null;
}

/** Idea cells: one rounded square per tap. Starred = solid ink. Tapping toggles the star. */
export function IdeaCells({
  ideas,
  onToggle,
  selected,
  label = "Ideas",
}: {
  ideas: Idea[];
  onToggle: (idea: Idea) => void;
  selected?: number | null;
  label?: string;
}) {
  if (!ideas.length) return null;
  return (
    <ol aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
      {ideas.map((i) => (
        <li key={i.id}>
          <button
            type="button"
            onClick={() => onToggle(i)}
            aria-pressed={selected === undefined ? i.starred : selected === i.id}
            aria-label={`Idea ${i.n}${i.starred ? ", starred" : ""}`}
            className={cn(
              "relative flex aspect-square min-h-touch w-full items-center justify-center rounded-xs border font-mono text-small",
              "transition-colors duration-(--dur-fast) ease-measured",
              (selected === undefined ? i.starred : selected === i.id)
                ? "border-fg bg-fg text-on-fg"
                : "border-hairline text-fg hover:border-fg",
            )}
          >
            {two(i.n)}
            {i.starred && (
              <Star
                aria-hidden
                size={10}
                weight="fill"
                className={cn(
                  "absolute top-1 right-1",
                  (selected === undefined ? i.starred : selected === i.id) ? "text-on-fg" : "text-fg",
                )}
              />
            )}
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Generate: one huge tap target, a star for the idea just drawn, the ideas so far. */
export function GeneratePane({
  attempt,
  count,
  busy,
  onTap,
  onStarLatest,
  onToggleStar,
  onCommitEarly,
}: {
  attempt: Attempt;
  count: number;
  busy: boolean;
  onTap: () => void;
  onStarLatest: () => void;
  onToggleStar: (idea: Idea) => void;
  onCommitEarly: () => void;
}) {
  const last = attempt.ideas.at(-1);
  return (
    <div className="flex flex-col gap-4">
      <TapCounter count={count} onIncrement={onTap} hint="Tap once per idea, then keep drawing" />
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="lg"
          icon={<Star weight={last?.starred ? "fill" : "duotone"} />}
          onClick={onStarLatest}
          disabled={count === 0}
          aria-pressed={!!last?.starred}
        >
          {last?.starred ? `Starred ${two(last.n)}` : "Star it"}
        </Button>
        <Button size="lg" onClick={onCommitEarly} disabled={busy}>
          Commit now
        </Button>
      </div>
      <IdeaCells ideas={attempt.ideas} onToggle={onToggleStar} />
    </div>
  );
}

export type Checks = { rules: boolean | null; notObvious: boolean | null; drawable: boolean | null };

/** Commit: the three-question gate, a one-line label, one button. */
export function CommitPane({
  attempt,
  busy,
  onCheck,
  onCommit,
  early = false,
  onCancelEarly,
}: {
  attempt: Attempt;
  busy: boolean;
  onCheck: (key: keyof Checks, value: boolean) => void;
  onCommit: (body: { ideaId: number | null; label: string; checks: Checks }) => void;
  early?: boolean;
  onCancelEarly?: () => void;
}) {
  const [checks, setChecks] = useState<Checks>({ rules: null, notObvious: null, drawable: null });
  const [label, setLabel] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const fallback = defaultIdea(attempt.ideas);
  const ideaId = picked ?? fallback?.id ?? null;
  const anyNo = Object.values(checks).some((v) => v === false);

  const set = (key: keyof Checks) => (value: boolean) => {
    setChecks((c) => ({ ...c, [key]: value }));
    onCheck(key, value);
  };

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        onCommit({ ideaId, label, checks });
      }}
    >
      <section className="flex flex-col gap-1">
        <Eyebrow>The gate</Eyebrow>
        <div>
          <CheckRow index="01" label="Obeys every rule" value={checks.rules} onValueChange={set("rules")} />
          <CheckRow index="02" label="Not my first obvious idea" value={checks.notObvious} onValueChange={set("notObvious")} />
          <CheckRow index="03" label="Drawable in the time left" value={checks.drawable} onValueChange={set("drawable")} />
        </div>
        <RoleLabel>{anyNo ? "A no means: take the next idea and ask again." : "First idea passing all three is the one."}</RoleLabel>
      </section>

      {attempt.ideas.length > 0 && (
        <section className="flex flex-col gap-2">
          <Eyebrow>Idea to lock</Eyebrow>
          <IdeaCells ideas={attempt.ideas} selected={ideaId} onToggle={(i) => setPicked(i.id)} label="Idea to lock" />
        </section>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`label-${attempt.pos}`}>In one line, what will you draw?</Label>
        <input
          id={`label-${attempt.pos}`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={200}
          autoComplete="off"
          enterKeyHint="done"
          placeholder="e.g. Kitchen from the floor mat"
          className="min-h-touch w-full rounded-sm border border-hairline bg-transparent px-3 text-body text-fg placeholder:text-mute focus:border-fg focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button type="submit" variant="primary" size="lg" block disabled={busy} icon={<Check weight="bold" />}>
          Commit{ideaId !== null ? ` idea ${two(attempt.ideas.find((i) => i.id === ideaId)?.n ?? 0)}` : ""}
        </Button>
        {early && onCancelEarly ? (
          <Button variant="quiet" block onClick={onCancelEarly}>
            Back to ideas
          </Button>
        ) : (
          <RoleLabel>At zero the starred idea locks on its own.</RoleLabel>
        )}
      </div>
    </form>
  );
}

/** What she committed to, restated while she draws. */
export function CommittedNote({ attempt }: { attempt: Attempt }) {
  const idea = attempt.ideas.find((i) => i.id === attempt.committedIdeaId);
  return (
    <div className="flex flex-col gap-1 border-l-2 border-fg pl-4" data-testid="committed">
      <p className="font-mono text-label uppercase text-mute">
        {attempt.autoCommitted ? "Auto-committed" : "Committed"}
        {idea ? ` · idea ${two(idea.n)}` : ""}
        {attempt.secondsToCommit !== null ? ` · ${Math.floor(attempt.secondsToCommit / 60)}:${two(attempt.secondsToCommit % 60)}` : ""}
      </p>
      <p className="text-lead text-fg">{attempt.label ?? (attempt.autoCommitted ? "No label: the clock chose." : "No label")}</p>
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
      <div className="flex flex-col gap-1" data-testid="seed-note">
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
