"use client";

import { ArrowRight, SignOut } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { useServerNow } from "@/components/ui/countdown";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Eyebrow, RoleLabel } from "@/components/ui/label";
import type { Playbook } from "@/content/types";
import { cn } from "@/lib/cn";
import { RequestError, postJSON } from "./api";
import { Debrief } from "./debrief";
import { CommitPane, CommittedNote, GeneratePane, SeedNote, type Checks } from "./phase-panes";
import { PhaseClock, PhaseStrip } from "./phase-clock";
import { HiddenPrompt, PromptView } from "./prompt-view";
import { KIND_SHORT, PHASE_NAME, SLOT_NAME, type Attempt, type BResult, type Idea, type SessionState } from "./types";
import { useSessionState, useWakeLock } from "./use-session";

export type PartBRunnerProps = {
  sessionId: number;
  initial: SessionState;
  /** Slot playbooks: the minute script supplies the one-line coach note under each phase. */
  playbooks?: Playbook[];
  /** Results for a session that is already closed (debrief on reload). */
  initialResults?: BResult[] | null;
  /** Fresh state after every read, for a parent that embeds the runner (full exam). */
  onState?: (s: SessionState) => void;
};

const DEBRIEF_SECONDS = 90;

/**
 * Part B live session: single drill, full mock, past paper, or the Part B half of a full exam.
 * The server owns the clock; this screen renders whatever phase `partB.now` says and re-reads
 * the state at `nextEventAt`. Phone-first: one decision per screen, the active phase's clock
 * is the only accent.
 */
export function PartBRunner({ sessionId, initial, playbooks = [], initialResults, onState }: PartBRunnerProps) {
  const router = useRouter();
  const { state, apply, refetch, act, latest } = useSessionState(sessionId, initial);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(0);
  const [earlyCommitPos, setEarlyCommitPos] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  const live = state.session.status === "live";
  const pb = state.partB;
  useWakeLock(live);

  useEffect(() => {
    onState?.(state);
  }, [state, onState]);

  // A short buzz when the phase changes, so she can keep her eyes on the paper.
  const phaseKey = `${pb?.now?.phase}-${pb?.now?.pos}-${pb?.now?.from}-${state.session.status}`;
  const firstPhase = useRef(phaseKey);
  useEffect(() => {
    if (firstPhase.current === phaseKey) return;
    firstPhase.current = phaseKey;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([40, 80, 40]);
  }, [phaseKey]);

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof RequestError ? e.message : "Connection lost. Retrying on the next phase.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  // Idea taps queue so rapid taps land in order; the count shows taps not yet acknowledged.
  const enqueue = useCallback((job: () => Promise<unknown>) => {
    chain.current = chain.current.then(job).catch(async (e) => {
      if (e instanceof RequestError && e.status === 409) await refetch();
      else setError("Connection lost. Taps may not have been saved.");
    });
  }, [refetch]);

  const tap = (pos: number) => {
    setPending((p) => p + 1);
    enqueue(async () => {
      try {
        const r = await postJSON<{ state: SessionState }>(`/api/sessions/${sessionId}/b/idea`, { pos });
        apply(r.state);
      } finally {
        setPending((p) => p - 1);
      }
    });
  };

  const star = (idea: Idea, starred: boolean) =>
    enqueue(async () => apply(await postJSON<SessionState>(`/api/sessions/${sessionId}/b/star`, { ideaId: idea.id, starred })));

  const starLatest = (pos: number) =>
    enqueue(async () => {
      const a = latest.current.partB?.attempts.find((x) => x.pos === pos);
      const idea = a?.ideas.at(-1);
      if (!idea) return;
      apply(await postJSON<SessionState>(`/api/sessions/${sessionId}/b/star`, { ideaId: idea.id, starred: !idea.starred }));
    });

  const logEvent = (pos: number, type: string, data?: unknown) => {
    void postJSON(`/api/sessions/${sessionId}/b/event`, { pos, type, data }).catch(() => {});
  };

  const commit = (pos: number, body: { ideaId: number | null; label: string; checks: Checks }) =>
    run(async () => {
      await chain.current; // let queued taps land first
      await act("b/commit", { pos, ...body });
      setEarlyCommitPos(null);
    });

  const quit = () =>
    run(async () => {
      await act("quit");
      router.push(`/part-b/results/${sessionId}`);
    });

  const finish = () => run(async () => void (await act("finish")));

  const now = useServerNow(state.serverNow);

  if (!pb) return null;
  const { timeline } = pb;
  const paper = timeline.kind === "paper";
  const kindName = KIND_SHORT[state.session.kind] ?? "Part B";

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
                    {state.session.status === "quit" ? "Quit: unfinished slots are recorded as abandoned. " : "Pencil down. "}
                    About {DEBRIEF_SECONDS} s per slot.
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

  // ---------- live ----------
  const at = pb.now;
  if (!at || pb.startedAt === null) {
    return (
      <Frame>
        <p className="py-16 text-center text-body text-mute">Part B starts when Part A closes.</p>
      </Frame>
    );
  }
  const startedAt = pb.startedAt;
  const sec = (now - startedAt) / 1000;
  const phaseDeadline = startedAt + at.to * 1000;
  const attempt: Attempt | null = at.pos !== null ? (pb.attempts.find((a) => a.pos === at.pos) ?? null) : null;
  const block = at.pos !== null ? timeline.blocks[at.pos] : null;
  const showClock = state.session.switches.phaseTimer;

  // Coach line: the playbook's minute script for where she is in this block.
  const coach = (() => {
    if (!block) return null;
    const book = playbooks.find((p) => p.slot === block.slot);
    const minute = (sec - block.start) / 60;
    return book?.script.find((s) => minute >= s.from && minute < s.to)?.doThis ?? null;
  })();

  // Strip: a drill shows its slot's phases; a paper shows read-all, five blocks, final buffer.
  const strip = (() => {
    if (!paper && block) {
      const i = block.phases.findIndex((p) => sec >= p.from && sec < p.to);
      return {
        spans: block.phases.map((p) => ({ key: `${p.phase}-${p.from}`, weight: p.to - p.from, label: PHASE_NAME[p.phase] })),
        current: i,
        progress: i >= 0 ? (sec - block.phases[i].from) / (block.phases[i].to - block.phases[i].from) : 0,
      };
    }
    const spans = [
      ...(timeline.readAll ? [{ key: "read-all", from: timeline.readAll.from, to: timeline.readAll.to, label: "Read all" }] : []),
      ...timeline.blocks.map((b) => ({ key: `b${b.pos}`, from: b.start, to: b.end, label: `Q${b.pos + 1} ${SLOT_NAME[b.slot]}` })),
      ...(timeline.finalBuffer ? [{ key: "final", from: timeline.finalBuffer.from, to: timeline.finalBuffer.to, label: "Final buffer" }] : []),
    ];
    const i = spans.findIndex((s) => sec >= s.from && sec < s.to);
    return {
      spans: spans.map((s) => ({ key: s.key, weight: s.to - s.from, label: s.label })),
      current: i,
      progress: i >= 0 ? (sec - spans[i].from) / (spans[i].to - spans[i].from) : 0,
    };
  })();

  const phaseLabel = `${PHASE_NAME[at.phase] ?? at.phase}${at.label ? ` · ${at.label}` : ""}`;
  const where = paper
    ? at.pos !== null
      ? `Q${at.pos + 1} of ${timeline.blocks.length} · ${SLOT_NAME[timeline.blocks[at.pos].slot]}`
      : `${timeline.blocks.length} questions`
    : block
      ? SLOT_NAME[block.slot]
      : "";
  const executing = at.phase === "execute";
  const committing = attempt?.status === "pending" && (at.phase === "commit" || earlyCommitPos === attempt.pos);

  const promptBlock = (a: Attempt, compact: boolean) =>
    a.prompt ? (
      <PromptView prompt={a.prompt} compact={compact} showSlot={false} />
    ) : (
      <HiddenPrompt slot={a.slot} phase={PHASE_NAME[at.phase] ?? at.phase} />
    );

  return (
    <Frame>
      <TopBar
        left={
          <Eyebrow>
            {kindName} · {where}
          </Eyebrow>
        }
        right={
          <ConfirmDialog
            trigger={
              <Button variant="quiet" icon={<SignOut weight="duotone" />} disabled={busy}>
                Quit
              </Button>
            }
            title="Quit this session?"
            description="No pause, no save. Every slot not yet committed is recorded as abandoned, and the session is marked quit."
            confirmLabel="Quit session"
            cancelLabel="Keep going"
            onConfirm={quit}
          />
        }
      />

      {/* Phase header: name, coach line, the one accented clock. */}
      <header className={cn("flex flex-col gap-3 pb-6", executing && "items-center text-center")} data-phase={at.phase}>
        {executing ? (
          <>
            <p className="font-mono text-label uppercase text-mute">{phaseLabel}</p>
            {showClock ? (
              <PhaseClock deadline={phaseDeadline} serverNow={state.serverNow} size="counter" accent label={phaseLabel} />
            ) : (
              <p className="text-title font-semibold">Draw</p>
            )}
          </>
        ) : (
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-title font-semibold" data-testid="phase-name">
              {phaseLabel}
            </h1>
            {showClock && <PhaseClock deadline={phaseDeadline} serverNow={state.serverNow} accent label={phaseLabel} />}
          </div>
        )}
        <PhaseStrip spans={strip.spans} current={strip.current} progress={strip.progress} />
        {paper && block && showClock && (
          <p className="flex justify-between font-mono text-caption text-mute">
            <span>Q{block.pos + 1} block ends in</span>
            <PhaseClock deadline={startedAt + block.end * 1000} serverNow={state.serverNow} size="caption" label="Block" />
          </p>
        )}
        {coach && <RoleLabel className={cn("max-w-prose", executing && "mx-auto")}>{coach}</RoleLabel>}
      </header>

      {error && <p className="pb-4 text-small text-bad">{error}</p>}

      <div className="flex flex-col gap-8 pb-12">
        {/* Read all: every prompt, each with a note field for idea seeds. */}
        {at.phase === "read-all" &&
          pb.attempts.map((a) => (
            <section key={a.id} className="flex flex-col gap-4 border-t border-hairline pt-6 first:border-t-0 first:pt-0">
              <Eyebrow index={`Q${a.pos + 1}`}>{SLOT_NAME[a.slot]}</Eyebrow>
              {promptBlock(a, false)}
              <SeedNote sessionId={sessionId} pos={a.pos} onSave={(text) => logEvent(a.pos, "seed-note", { text })} />
            </section>
          ))}

        {attempt && at.phase === "read" && (
          <>
            {promptBlock(attempt, false)}
            {paper && <SeedNote sessionId={sessionId} pos={attempt.pos} readOnly />}
          </>
        )}

        {attempt && committing && (
          <CommitPane
            key={attempt.pos}
            attempt={attempt}
            busy={busy}
            early={at.phase !== "commit"}
            onCancelEarly={() => setEarlyCommitPos(null)}
            onCheck={(key, value) => logEvent(attempt.pos, "check", { key, value })}
            onCommit={(body) => commit(attempt.pos, body)}
          />
        )}

        {attempt && at.phase === "generate" && !committing && (
          <>
            {attempt.status === "pending" ? (
              <GeneratePane
                attempt={attempt}
                count={attempt.ideaCount + pending}
                busy={busy}
                onTap={() => tap(attempt.pos)}
                onStarLatest={() => starLatest(attempt.pos)}
                onToggleStar={(i) => star(i, !i.starred)}
                onCommitEarly={() => {
                  setEarlyCommitPos(attempt.pos);
                  logEvent(attempt.pos, "commit-screen", { early: true });
                }}
              />
            ) : (
              <CommittedNote attempt={attempt} />
            )}
            {paper && <SeedNote sessionId={sessionId} pos={attempt.pos} readOnly />}
            {promptBlock(attempt, true)}
          </>
        )}

        {attempt && at.phase === "commit" && attempt.status !== "pending" && (
          <>
            <CommittedNote attempt={attempt} />
            <p className="text-body text-mute">Start drawing. Execute begins at the stamp.</p>
          </>
        )}

        {attempt && (at.phase === "execute" || at.phase === "buffer") && (
          <>
            <CommittedNote attempt={attempt} />
            {promptBlock(attempt, true)}
          </>
        )}

        {at.phase === "final-buffer" && (
          <section className="flex flex-col gap-4">
            <p className="text-lead text-fg">Tick the answered box on every question you attempted.</p>
            <ol className="flex flex-col">
              {pb.attempts.map((a) => (
                <li key={a.id} className="flex items-baseline gap-3 border-b border-hairline py-3 last:border-b-0">
                  <span className="w-8 shrink-0 font-mono text-caption text-mute">Q{a.pos + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body">{SLOT_NAME[a.slot]}</span>
                    <span className="block truncate text-caption text-mute">
                      {a.status === "committed" ? (a.label ?? (a.autoCommitted ? "auto-committed" : "committed")) : a.status}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Finishing early is allowed once the drawing is under way (drill) or in the final buffer (paper). */}
        {((!paper && (at.phase === "execute" || at.phase === "buffer")) || at.phase === "final-buffer") && (
          <ConfirmDialog
            trigger={
              <Button variant={at.phase === "execute" ? "quiet" : "primary"} size="lg" block disabled={busy}>
                Pencil down · debrief
              </Button>
            }
            tone="primary"
            title="Pencil down?"
            description="The session ends now and the debrief opens. Time left is not kept."
            confirmLabel="End and debrief"
            cancelLabel="Keep drawing"
            onConfirm={finish}
          />
        )}
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),24px)] md:px-8 md:pt-8">
      {children}
    </div>
  );
}

function TopBar({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex min-h-touch items-center justify-between gap-4 pb-4">
      <div className="min-w-0">{left}</div>
      {right}
    </div>
  );
}
