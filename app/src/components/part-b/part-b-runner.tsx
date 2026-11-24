"use client";

import { ArrowLeft, ArrowRight, ArrowUUpRight, SignOut } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { useServerNow } from "@/components/ui/countdown";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/label";
import type { Playbook } from "@/content/types";
import { cn } from "@/lib/cn";
import { RequestError, postJSON } from "./api";
import { Debrief } from "./debrief";
import { CommitPane, CommittedNote, IdeasPane, ReadPane, SeedNote } from "./phase-panes";
import { PhaseClock, StepBar, barSegments, spanText } from "./phase-clock";
import { HiddenPrompt, PromptView } from "./prompt-view";
import { KIND_SHORT, PROGRESS_NAME, SLOT_NAME, STEP_NAME, type Attempt, type BResult, type SessionState } from "./types";
import { useSessionState, useWakeLock } from "./use-session";

export type PartBRunnerProps = {
  sessionId: number;
  initial: SessionState;
  /** Kept for the page contract; the step panes carry their own instructions. */
  playbooks?: Playbook[];
  /** Results for a session that is already closed (debrief on reload). */
  initialResults?: BResult[] | null;
  /** Fresh state after every read, for a parent that embeds the runner (full exam). */
  onState?: (s: SessionState) => void;
};

const DEBRIEF_SECONDS = 90;
const PROGRESS_SHORT: Record<string, string> = { unseen: "–", open: "open", skipped: "skip", committed: "commit", done: "done", out: "out" };
const PEEK_MS = 15_000;

/** What the palette cell and the end page call a question. */
function progressOf(a: Attempt): string {
  if (a.progress === "out" || a.progress === "done" || a.progress === "skipped") return a.progress;
  if (a.status === "committed") return "committed";
  return a.progress;
}

/**
 * Part B live session: single drill, full mock, past paper, or the Part B half of a full exam.
 * The server owns the clock and decides what is on screen (`partB.currentPos`, each question's
 * step); she moves herself with Got it / I've picked one / Commit / Done, Prev / Skip / Next and
 * the palette. The question clock ticks locally between reads; `nextEventAt` re-reads at every
 * boundary the server knows about.
 */
export function PartBRunner({ sessionId, initial, initialResults, onState }: PartBRunnerProps) {
  const router = useRouter();
  const { state, act } = useSessionState(sessionId, initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const live = state.session.status === "live";
  const pb = state.partB;
  useWakeLock(live);

  useEffect(() => {
    onState?.(state);
  }, [state, onState]);

  // A short buzz when the question or step changes, so she can keep her eyes on the paper.
  const cur = pb?.attempts.find((a) => a.current) ?? null;
  const stepKey = `${pb?.readAll}-${pb?.currentPos}-${cur?.step}-${cur?.progress}-${state.session.status}`;
  const firstKey = useRef(stepKey);
  useEffect(() => {
    if (firstKey.current === stepKey) return;
    firstKey.current = stepKey;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([40, 80, 40]);
  }, [stepKey]);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof RequestError ? e.message : "Connection lost. Try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  const post = (path: string, body?: unknown) => run(() => act(path, body));
  const logEvent = (pos: number, type: string, data?: unknown) => {
    void postJSON(`/api/sessions/${sessionId}/b/event`, { pos, type, data }).catch(() => {});
  };
  const quit = () =>
    run(async () => {
      await act("quit");
      router.push(`/part-b/results/${sessionId}`);
    });
  const finish = () => run(() => act("finish"));

  const now = useServerNow(state.serverNow);

  if (!pb) return null;
  const paper = (pb.plan?.readAll ?? 0) > 0;
  const kindName = KIND_SHORT[state.session.kind] ?? "Part B";
  const sw = state.session.switches;
  const showClock = sw.phaseTimer;
  const forced = sw.forcedAdvance;

  // ---------- closed: debrief ----------
  if (!live) {
    const ended = state.session.endedAt ?? state.serverNow;
    const never = pb.startedAt === null;
    return (
      <Frame>
        <TopBar left={<Eyebrow>{kindName} · Debrief</Eyebrow>} />
        {never ? (
          <section className="flex flex-col gap-4 py-8">
            <h1 className="text-title font-semibold">Part B did not start</h1>
            <p className="text-body text-mute">The session ended during Part A.</p>
            <Link href={`/part-b/results/${sessionId}`} className={buttonClasses({ variant: "primary", size: "lg" })}>
              See results
            </Link>
          </section>
        ) : (
          <>
            <header className="flex flex-col gap-3 border-b border-hairline pb-6">
              <div className="flex items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h1 className="text-title font-semibold">Debrief</h1>
                  <p className="text-small text-mute">
                    {state.session.status === "quit" ? "Quit: uncommitted questions are recorded as not committed. " : "Pencil down. "}
                    About {DEBRIEF_SECONDS} s per question.
                  </p>
                </div>
                <PhaseClock
                  deadline={ended + DEBRIEF_SECONDS * 1000 * Math.max(1, pb.attempts.length)}
                  serverNow={state.serverNow}
                  accent
                  label="Debrief"
                />
              </div>
            </header>
            <div className="py-8">
              <Debrief sessionId={sessionId} initial={initialResults} />
            </div>
            <Link
              href={`/part-b/results/${sessionId}`}
              className={buttonClasses({ variant: "primary", size: "lg", block: true })}
            >
              See the summary
              <ArrowRight weight="bold" aria-hidden />
            </Link>
          </>
        )}
      </Frame>
    );
  }

  if (pb.startedAt === null) {
    return (
      <Frame>
        <p className="py-16 text-center text-body text-mute">Part B starts when Part A closes.</p>
      </Frame>
    );
  }

  const quitControl = (
    <ConfirmDialog
      trigger={
        <Button variant="quiet" icon={<SignOut weight="duotone" />} disabled={busy}>
          Quit
        </Button>
      }
      title="Quit this session?"
      description="No pause, no save. Every question not yet committed is recorded as not committed, and the session is marked quit."
      confirmLabel="Quit session"
      cancelLabel="Keep going"
      onConfirm={quit}
    />
  );
  const total = (
    <span className="flex items-baseline gap-2 whitespace-nowrap font-mono text-caption text-mute">
      Total <PhaseClock deadline={state.session.endsAt} serverNow={state.serverNow} size="caption" label="Total time" />
    </span>
  );
  const topBar = (where: string) => (
    <TopBar
      left={<Eyebrow>{where}</Eyebrow>}
      right={
        <span className="flex items-center gap-3">
          {showClock && total}
          {quitControl}
        </span>
      }
    />
  );
  const errorLine = error && <p className="text-small text-bad">{error}</p>;
  const pencilDown = (primary: boolean, label: string) => (
    <ConfirmDialog
      trigger={
        <Button variant={primary ? "primary" : "quiet"} size={primary ? "lg" : "md"} block disabled={busy}>
          {label}
        </Button>
      }
      tone="primary"
      title="Pencil down?"
      description="The session ends now and the debrief opens. Time left is not kept."
      confirmLabel="End and debrief"
      cancelLabel="Keep going"
      onConfirm={finish}
    />
  );

  // ---------- read-all ----------
  if (pb.readAll) {
    return (
      <Frame>
        {topBar(`${kindName} · Read-all`)}
        <header className="flex items-end justify-between gap-4" data-phase="read-all">
          <div className="flex flex-col gap-1">
            <h1 className="text-title font-semibold" data-testid="phase-name">
              Read-all
            </h1>
            <p className="text-small text-mute">6 minutes for all {pb.attempts.length} questions</p>
          </div>
          {showClock && pb.readAllEndsAt !== null && (
            <PhaseClock deadline={pb.readAllEndsAt} serverNow={state.serverNow} accent label="Read-all" />
          )}
        </header>
        <section className="flex flex-col gap-1 rounded-md bg-code p-4" data-testid="read-all-intro">
          <p className="text-lead text-fg">Read every question before you start.</p>
          <p className="text-small text-mute">
            You&apos;ll see each question again when you open it. Jot first thoughts in the seed boxes; they come back with the
            question. At 6:00 Question 1 opens on its own.
          </p>
        </section>
        {errorLine}
        <div className="flex flex-col gap-8">
          {pb.attempts.map((a) => (
            <section key={a.id} className="flex flex-col gap-4 border-t border-hairline pt-6 first:border-t-0 first:pt-0">
              <Eyebrow index={`Q${a.pos + 1}`}>{SLOT_NAME[a.slot]}</Eyebrow>
              {a.prompt && <PromptView prompt={a.prompt} showSlot={false} />}
              <SeedNote sessionId={sessionId} pos={a.pos} onSave={(text) => logEvent(a.pos, "seed-note", { text })} />
            </section>
          ))}
        </div>
        <Button variant="primary" size="lg" block disabled={busy} onClick={() => post("b/open", { pos: 0 })}>
          Start Q1
        </Button>
      </Frame>
    );
  }

  const palette = paper && (
    <nav aria-label="Questions" className="grid grid-cols-[repeat(5,minmax(0,1fr))_auto] gap-1.5" data-testid="b-palette">
      {pb.attempts.map((a) => {
        const p = progressOf(a);
        const left = a.budgetMs - (a.current && a.progress !== "out" ? a.usedMs + (now - state.serverNow) : a.usedMs);
        const closed = p === "done" || p === "out";
        return (
          <button
            key={a.id}
            type="button"
            disabled={busy}
            onClick={() => post("b/open", { pos: a.pos })}
            aria-current={a.current ? "step" : undefined}
            aria-label={`Question ${a.pos + 1}, ${SLOT_NAME[a.slot]}, ${PROGRESS_NAME[p]}`}
            className={cn(
              "flex min-h-touch min-w-0 flex-col items-center justify-center gap-0.5 rounded-xs border px-1 py-1.5",
              "transition-colors duration-(--dur-fast) ease-measured hover:border-fg",
              a.current ? "border-2 border-fg" : "border-hairline",
              closed && "bg-tint",
            )}
          >
            <span className="font-mono text-small font-medium text-fg">Q{a.pos + 1}</span>
            <span className="max-w-full truncate font-mono text-label uppercase text-mute">{PROGRESS_SHORT[p]}</span>
            {showClock && (
              <span className={cn("font-mono text-label tabular", left < 0 ? "text-bad" : "text-mute")}>
                {spanText(Math.abs(left), left < 0)}
              </span>
            )}
          </button>
        );
      })}
      <button
        type="button"
        disabled={busy}
        onClick={() => post("b/end")}
        aria-current={pb.currentPos === null ? "page" : undefined}
        className={cn(
          "flex min-h-touch items-center justify-center rounded-xs border px-3 font-mono text-small font-medium text-fg hover:border-fg",
          pb.currentPos === null ? "border-2 border-fg" : "border-hairline",
        )}
      >
        End
      </button>
    </nav>
  );

  // ---------- end page (paper, no question open) ----------
  if (!cur) {
    return (
      <Frame>
        {topBar(`${kindName} · End`)}
        {palette}
        <header className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-title font-semibold" data-testid="phase-name">
              Before pencil down
            </h1>
            <p className="text-small text-mute">Time left on the paper</p>
          </div>
          <PhaseClock deadline={state.session.endsAt} serverNow={state.serverNow} accent label="Paper" />
        </header>
        <p className="text-lead text-fg">Tick the answered box on every question you attempted.</p>
        {errorLine}
        <ol className="flex flex-col" data-testid="end-list">
          {pb.attempts.map((a) => {
            const p = progressOf(a);
            const view = forced && p === "out";
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 border-b border-hairline py-3 last:border-b-0">
                <span className="flex min-w-0 items-baseline gap-3">
                  <span className="w-8 shrink-0 font-mono text-caption text-mute">Q{a.pos + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-body">{SLOT_NAME[a.slot]}</span>
                    <span className="block text-caption text-mute">{PROGRESS_NAME[p]}</span>
                  </span>
                </span>
                <Button disabled={busy} onClick={() => post("b/open", { pos: a.pos })}>
                  {view ? "View" : "Open"}
                </Button>
              </li>
            );
          })}
        </ol>
        {pencilDown(true, "Pencil down · debrief")}
      </Frame>
    );
  }

  // ---------- one question ----------
  const a = cur;
  const out = a.progress === "out";
  const qms = out ? a.usedMs : a.usedMs + (now - state.serverNow);
  const targets = a.targets!;
  const stepTarget = targets[a.step as keyof typeof targets] * 1000;
  const stepLeft = stepTarget - qms;
  const segments = barSegments(a, qms);
  const pos = a.pos;
  const where = paper ? `${kindName} · Q${pos + 1} of ${pb.attempts.length} · ${SLOT_NAME[a.slot]}` : `${kindName} · ${SLOT_NAME[a.slot]}`;
  const title = out ? "Out of time" : STEP_NAME[a.step];
  const until = out ? "This question is closed" : { read: "until Ideas", ideas: "until Commit", commit: "to commit", draw: "left on this question" }[a.step];

  // Why the prompt is showing outside Read: the 15 s view on opening, or a reread.
  const peekEndsAt = pb.visitStartedAt !== null ? pb.visitStartedAt + PEEK_MS : null;
  const inRead = a.step === "read" && !out && qms < targets.read * 1000;
  const reveal =
    sw.questionHiding && a.visible && !inRead
      ? a.revealUntil !== null && a.revealUntil > now
        ? { label: `Reread ${a.rereads} of 3`, until: a.revealUntil }
        : peekEndsAt !== null && peekEndsAt > now
          ? { label: "Showing on open", until: peekEndsAt }
          : null
      : null;

  const prompt = a.prompt ? (
    <div className="flex flex-col gap-3">
      {reveal && (
        <p className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2" data-testid="reveal">
          <span className="font-mono text-label uppercase text-mute">{reveal.label}</span>
          <span className="font-mono text-small text-fg">
            hides in <PhaseClock deadline={reveal.until} serverNow={state.serverNow} size="caption" label="Prompt hides" className="text-fg" />
          </span>
        </p>
      )}
      <PromptView prompt={a.prompt} showSlot={false} />
    </div>
  ) : (
    <HiddenPrompt
      slot={a.slot}
      step={STEP_NAME[a.step]}
      out={out}
      nextRereadS={a.nextRereadS}
      rereadsLeft={3 - a.rereads}
      busy={busy}
      onReread={() => post("b/reread", { pos })}
    />
  );

  let pane: React.ReactNode = null;
  if (out) pane = a.status === "committed" ? <CommittedNote attempt={a} /> : <p className="text-body text-mute">Not committed.</p>;
  else if (a.step === "read") pane = <ReadPane busy={busy} onGotIt={() => post("b/step", { pos, to: "ideas" })} />;
  else if (a.step === "ideas")
    pane = <IdeasPane slot={a.slot} forced={forced} busy={busy} onPicked={() => post("b/step", { pos, to: "commit" })} />;
  else if (a.step === "commit")
    pane = (
      <CommitPane
        forced={forced}
        canGoBack={!forced || qms < targets.ideas * 1000}
        busy={busy}
        onCommit={() => post("b/commit", { pos })}
        onBack={() => post("b/step", { pos, to: "ideas" })}
      />
    );
  else
    pane = (
      <div className="flex flex-col gap-4">
        <CommittedNote attempt={a} />
        {paper ? (
          <Button variant="primary" size="lg" block disabled={busy} onClick={() => post("b/done", { pos })} icon={<ArrowRight weight="bold" />}>
            Done · next question
          </Button>
        ) : (
          pencilDown(true, "Pencil down · debrief")
        )}
      </div>
    );

  const last = pos === pb.attempts.length - 1;
  return (
    <Frame nav>
      {topBar(where)}
      {palette}

      <header className="flex flex-col gap-4" data-phase={out ? "out" : a.step}>
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-title font-semibold" data-testid="phase-name">
              {title}
            </h1>
            <p className="text-small text-mute">{until}</p>
          </div>
          {showClock && !out && (
            <span
              role="timer"
              data-testid="step-clock"
              aria-label={`${title}: ${spanText(Math.abs(stepLeft), stepLeft < 0)} ${stepLeft < 0 ? "over" : "left"}`}
              className={cn("font-mono text-timer font-medium tabular", stepLeft < 0 ? "text-bad" : "text-accent")}
            >
              {spanText(Math.abs(stepLeft), stepLeft < 0)}
            </span>
          )}
        </div>
        <StepBar segments={segments} qms={qms} showTimes={showClock} />
        {showClock && (
          <p className="flex justify-between gap-4 font-mono text-caption text-mute">
            <span>
              This question:{" "}
              <span className={cn(a.budgetMs - qms < 0 && "text-bad")}>
                {spanText(Math.abs(a.budgetMs - qms), a.budgetMs - qms < 0)} {a.budgetMs - qms < 0 ? "over" : "left"}
              </span>
            </span>
            {a.rereads > 0 && <span>Rereads {a.rereads}/3</span>}
          </p>
        )}
      </header>

      {errorLine}

      <div className="flex flex-col gap-8">
        {a.step === "read" || out ? (
          <>
            {prompt}
            {pane}
          </>
        ) : (
          <>
            {pane}
            {prompt}
          </>
        )}
        {paper && <SeedNote sessionId={sessionId} pos={pos} readOnly />}
      </div>

      <BottomNav>
        {paper ? (
          <div className="grid grid-cols-3 gap-2">
            <Button disabled={busy || pos === 0} onClick={() => post("b/open", { pos: pos - 1 })} icon={<ArrowLeft weight="bold" />}>
              Prev
            </Button>
            <Button disabled={busy || a.status !== "pending" || out} onClick={() => post("b/skip", { pos })} icon={<ArrowUUpRight weight="bold" />}>
              Skip
            </Button>
            <Button disabled={busy} onClick={() => (last ? post("b/end") : post("b/open", { pos: pos + 1 }))}>
              {last ? "End" : "Next"}
            </Button>
          </div>
        ) : (
          pencilDown(false, "Pencil down · end drill")
        )}
      </BottomNav>
    </Frame>
  );
}

function Frame({ children, nav = false }: { children: React.ReactNode; nav?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-[max(env(safe-area-inset-top),16px)] md:px-8 md:pt-8",
        nav ? "pb-32" : "pb-[max(env(safe-area-inset-bottom),24px)]",
      )}
    >
      {children}
    </div>
  );
}

function TopBar({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex min-h-touch items-center justify-between gap-4">
      <div className="min-w-0">{left}</div>
      {right}
    </div>
  );
}

/** Prev / Skip / Next, always within thumb reach. */
function BottomNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-bg pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
      <div className="mx-auto w-full max-w-2xl px-4 md:px-8">{children}</div>
    </div>
  );
}
