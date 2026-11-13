"use client";

import { ArrowLeft, ArrowRight, Flag, SquaresFour } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CountdownText, useServerNow } from "@/components/ui/countdown";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { DimensionBar } from "@/components/ui/dimension-bar";
import { Eyebrow, RoleLabel } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { PaletteLegend, QuestionPalette, type PaletteItem } from "@/components/ui/question-palette";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Toggle } from "@/components/ui/switch";
import type { MarkScheme } from "@/content/types";
import { cn } from "@/lib/cn";
import { AnswerControl, LETTERS, OptionTiles, parseNat, pick } from "./answer-control";
import { KIND_LABEL, MODE_LABEL, TOPIC_LABEL, marks } from "./labels";
import { QuestionView } from "./question-view";
import type { AnswerInput, Confidence, CurrentQuestion, Format, PartAState, SessionState } from "./types";

const CURRENT_SCHEME: MarkScheme = {
  NAT: { correct: 4, wrong: 0 },
  MCQ: { correct: 3, wrong: -0.5 },
  MSQ: { correct: 4, wrong: -1, partial: true },
};

const FORMAT_HINT: Record<Format, string> = {
  MCQ: "Choose one",
  MSQ: "Choose all that apply",
  NAT: "Enter a number",
};

/** The stake of this question, so skipping is a decision, not a guess. */
function stakeLine(format: Format, scheme: MarkScheme): string {
  const s = scheme[format];
  const wrong = s.wrong === 0 ? "wrong 0" : `wrong ${marks(s.wrong, true)}`;
  const partial = format === "MSQ" && scheme.MSQ.partial ? " (partial credit)" : "";
  return `right ${marks(s.correct, true)}${partial} · ${wrong} · blank 0`;
}

function paletteItems(partA: PartAState): PaletteItem[] {
  return partA.palette.map((p) => ({ n: p.pos + 1, state: p.marked ? "marked" : p.state }));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Per-visit budget as a dimension line; ticks on its own so the question does not re-render. */
function BudgetBar({ current, serverNow, visible }: { current: CurrentQuestion; serverNow: number; visible: boolean }) {
  const now = useServerNow(serverNow);
  return (
    <DimensionBar
      budgetMs={current.budgetMs}
      elapsedMs={Math.max(0, now - current.visitStartedAt)}
      live={visible}
      concealed={!visible}
      label={visible ? "budget" : "budget · hidden"}
    />
  );
}

type Actions = {
  answer: (pos: number, a: AnswerInput | null) => void;
  confidence: (pos: number, c: Confidence) => void;
  mark: (pos: number, marked: boolean) => void;
  next: () => void;
  prev: (() => void) | null;
};

/**
 * One visit to one question. Keyed by pos + visit start, so the local draft (instant feedback,
 * partial NAT entries) resets exactly when the server moves her to another visit.
 */
function Stage({
  current,
  state,
  scheme,
  animated,
  actions,
  submitSlot,
}: {
  current: CurrentQuestion;
  state: SessionState;
  scheme: MarkScheme;
  animated: boolean;
  actions: Actions;
  submitSlot: React.ReactNode;
}) {
  const q = current.question;
  const format = q?.format ?? "MCQ";
  const [answer, setAnswer] = useState<AnswerInput | null>(current.answer);
  const [nat, setNat] = useState(current.answer?.kind === "NAT" ? String(current.answer.value) : "");
  const [confidence, setConfidence] = useState<Confidence>(current.confidence);
  const [marked, setMarked] = useState(current.marked);
  const partA = state.partA!;
  const total = partA.palette.length;
  const showTimer = state.session.switches.questionTimer;

  const choose = useCallback(
    (a: AnswerInput | null) => {
      setAnswer(a);
      actions.answer(current.pos, a);
    },
    [actions, current.pos],
  );

  function onNat(v: string) {
    setNat(v);
    const n = parseNat(v);
    const a: AnswerInput | null = n === null ? null : { kind: "NAT", value: n };
    setAnswer(a);
    actions.answer(current.pos, a);
  }

  // Laptop keys: A–D pick, Enter moves on. Digits go to the keypad (it captures them itself).
  const answerRef = useRef(answer);
  useEffect(() => {
    answerRef.current = answer;
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;
      if (e.key === "Enter") {
        e.preventDefault();
        actions.next();
        return;
      }
      const letter = e.key.toUpperCase();
      if (format !== "NAT" && (LETTERS as string[]).includes(letter) && e.key.length === 1) {
        e.preventDefault();
        choose(pick(format, answerRef.current, letter as (typeof LETTERS)[number]));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions, choose, format]);

  const inRevisit = partA.phase === "revisit";
  const isLastFirstPass = !inRevisit && current.pos === total - 1;
  const nextLabel = inRevisit ? "Next in queue" : isLastFirstPass ? "To revisit queue" : "Next";

  const nav = (
    <div className="flex gap-2">
      {actions.prev && (
        <Button variant="quiet" size="lg" onClick={actions.prev} icon={<ArrowLeft weight="bold" />} aria-label="Previous question">
          <span className="hidden sm:inline">Prev</span>
        </Button>
      )}
      <Button variant="primary" size="lg" block onClick={actions.next} hint={<span className="hidden lg:inline">↵</span>}>
        <span className="inline-flex items-center gap-2">
          {nextLabel}
          <ArrowRight weight="bold" aria-hidden />
        </span>
      </Button>
    </div>
  );

  return (
    <>
      {/* Question: the hero */}
      <section aria-label={`Question ${current.pos + 1}`} className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <Eyebrow index={pad(current.pos + 1)}>
              {format} · {q ? TOPIC_LABEL[q.topic] : ""}
            </Eyebrow>
            <span className="font-mono text-label uppercase text-mute">
              {inRevisit ? `revisit · ${partA.queue.length} in queue` : q?.source === "real" ? q.label : "generated"}
            </span>
          </div>
          <BudgetBar current={current} serverNow={state.serverNow} visible={showTimer} />
        </div>
        {q ? (
          <>
            <QuestionView question={q} animated={animated} />
            {q.source === "generated" && q.options && (
              <OptionTiles options={q.options} format={format} answer={answer} onAnswer={choose} />
            )}
          </>
        ) : (
          <RoleLabel>This question could not be loaded. Move on; it is recorded as skipped.</RoleLabel>
        )}
      </section>

      {/* Answer: right on laptop, below on phone */}
      <aside aria-label="Answer" className="flex min-w-0 flex-col gap-6 lg:self-start">
        <div className="flex flex-col gap-1">
          <p className="text-small font-medium text-fg">
            {FORMAT_HINT[format]}
            {q?.source === "generated" && q.options && <span className="font-normal text-mute"> · tap an option, or press A–D</span>}
          </p>
          <p className="font-mono text-caption text-mute">{stakeLine(format, scheme)}</p>
        </div>

        {/* Generated options are pictures: their tiles under the figure are the control. */}
        {!(q?.source === "generated" && q.options) && (
          <AnswerControl format={format} answer={answer} onAnswer={choose} natValue={nat} onNatChange={onNat} />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            aria-label="Confidence"
            value={confidence}
            onValueChange={(c) => {
              setConfidence(c);
              actions.confidence(current.pos, c);
            }}
            options={[
              { value: "sure", label: "Sure" },
              { value: "unsure", label: "Unsure" },
            ]}
          />
          <Toggle
            pressed={marked}
            onPressedChange={(m) => {
              setMarked(m);
              actions.mark(current.pos, m);
            }}
            icon={<Flag weight={marked ? "fill" : "duotone"} />}
          >
            {marked ? "Marked" : "Mark for review"}
          </Toggle>
          {answer && (
            <button
              type="button"
              onClick={() => {
                setNat("");
                choose(null);
              }}
              className="min-h-touch rounded-sm px-3 text-small text-mute hover:bg-tint hover:text-fg"
            >
              Clear
            </button>
          )}
        </div>

        <div className="hidden lg:block">{nav}</div>
        {submitSlot}
      </aside>

      {/* Phone: navigation stays under the thumb */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-hairline bg-bg px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:-mx-8 md:px-8 lg:hidden">
        {nav}
      </div>
    </>
  );
}

/**
 * The live Part A experience: question, answer, budget, palette, overall clock.
 * The server owns the clock; this component renders state and refetches at `nextEventAt`
 * (forced skip, section end), on tab return and after every action. No pause anywhere.
 *
 * Embeddable: the full-exam route passes `onPartAClosed` to take over when Part A locks.
 */
export function PartARunner({
  sessionId,
  initial,
  animatedIds = [],
  scheme = CURRENT_SCHEME,
  title,
  onPartAClosed,
}: {
  sessionId: number;
  initial: SessionState;
  /** Past papers: question ids whose original was animated (shown as a still with a note). */
  animatedIds?: string[];
  /** Marking scheme of this session (past papers carry their own). */
  scheme?: MarkScheme;
  /** Header label, e.g. "CEED 2025". Defaults to the session kind. */
  title?: string;
  /** Called once Part A is closed. Default: go to the Part A results screen. */
  onPartAClosed?: (state: SessionState) => void;
}) {
  const router = useRouter();
  const [st, setSt] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const stRef = useRef(st);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stRef.current = st;
  });

  const receive = useCallback((next: SessionState, byClock: boolean) => {
    const prev = stRef.current.partA?.current;
    const now = next.partA?.current;
    // A forced skip moved her on: say so once, quietly.
    if (byClock && prev && prev.pos !== now?.pos && next.partA?.palette[prev.pos]?.forcedSkip) {
      setNotice(`Q${pad(prev.pos + 1)} saved as it stood and queued for revisit.`);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(null), 4000);
    }
    stRef.current = next;
    setSt(next);
    setOffline(false);
  }, []);

  const refetch = useCallback(
    (byClock = false) => {
      chain.current = chain.current.then(async () => {
        try {
          const r = await fetch(`/api/sessions/${sessionId}`, { cache: "no-store" });
          if (r.ok) receive(await r.json(), byClock);
        } catch {
          setOffline(true);
        }
      });
      return chain.current;
    },
    [receive, sessionId],
  );

  // Actions run strictly in order; a 409 (the clock moved her on first) resyncs from the server.
  const post = useCallback(
    (path: string, body: unknown = {}) => {
      chain.current = chain.current.then(async () => {
        try {
          const r = await fetch(`/api/sessions/${sessionId}/${path}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          if (r.ok) receive(await r.json(), false);
          else {
            const g = await fetch(`/api/sessions/${sessionId}`, { cache: "no-store" });
            if (g.ok) receive(await g.json(), true);
          }
        } catch {
          setOffline(true);
        }
      });
      return chain.current;
    },
    [receive, sessionId],
  );

  // Refetch at the server's next event (forced skip, section end).
  useEffect(() => {
    if (st.nextEventAt === null) return;
    const t = setTimeout(() => refetch(true), Math.max(0, st.nextEventAt - st.serverNow) + 40);
    return () => clearTimeout(t);
  }, [st.nextEventAt, st.serverNow, refetch]);

  // Back from a locked phone or another tab: the clock kept running.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [refetch]);

  // While offline, keep trying.
  useEffect(() => {
    if (!offline) return;
    const t = setInterval(() => refetch(true), 3000);
    return () => clearInterval(t);
  }, [offline, refetch]);

  const partA = st.partA;
  const closed = !partA || partA.closedAt !== null || st.session.status !== "live";

  useEffect(() => {
    if (!closed) return;
    if (onPartAClosed) onPartAClosed(st);
    else router.replace(`/part-a/results/${sessionId}`);
    // Only on the transition to closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed]);

  const current = partA?.current ?? null;
  const total = partA?.palette.length ?? 0;
  const unanswered = partA ? partA.palette.filter((p) => p.state !== "answered").length : 0;

  const actions: Actions = {
    answer: (pos, a) => void post("answer", { pos, answer: a }),
    confidence: (pos, c) => void post("answer", { pos, confidence: c }),
    mark: (pos, m) => void post("mark", { pos, marked: m }),
    next: () => void post("advance"),
    prev:
      current && partA?.phase === "first-pass" && current.pos > 0
        ? () => void post("visit", { pos: current.pos - 1 })
        : null,
  };
  function jump(i: number) {
    setPaletteOpen(false);
    if (current?.pos === i) return;
    void post("visit", { pos: i });
  }

  const showTimer = st.session.switches.questionTimer;
  const heading = title ?? KIND_LABEL[st.session.kind];

  const palette = partA && (
    <div className="flex flex-col gap-4">
      <QuestionPalette items={paletteItems(partA)} current={current?.pos} onSelect={jump} />
      <PaletteLegend />
      <p className="font-mono text-caption text-mute">
        {total - unanswered}/{total} answered · {partA.queue.length} in revisit queue
      </p>
    </div>
  );

  const submit = (
    <ConfirmDialog
      trigger={
        <Button variant={current ? "quiet" : "primary"} size={current ? "md" : "lg"} block={!current}>
          Submit section
        </Button>
      }
      tone="primary"
      title="Submit Part A now?"
      description="The section closes and is scored. Time left is not carried over."
      confirmLabel="Submit"
      onConfirm={() => void post("finish")}
    >
      {unanswered > 0 && (
        <p className="font-mono text-caption text-mute">{unanswered} unanswered will be recorded as skipped.</p>
      )}
    </ConfirmDialog>
  );

  if (closed || !partA) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="font-mono text-label uppercase text-mute">Section closed · scoring</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-hairline bg-bg">
        <div className="mx-auto flex min-h-16 w-full max-w-[1440px] items-center justify-between gap-3 px-4 md:px-8">
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-small font-medium text-fg">
              {heading} <span className="text-mute">· {MODE_LABEL[st.session.mode]}</span>
            </p>
            <p className="whitespace-nowrap font-mono text-caption text-mute">
              {current ? `Q ${pad(current.pos + 1)} / ${pad(total)}` : `${pad(total)} questions`}
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {partA.endsAt !== null && (
              <CountdownText
                deadline={partA.endsAt}
                serverNow={st.serverNow}
                onExpire={() => refetch(true)}
                accent={!showTimer}
                warnBelowMs={Math.min(5 * 60_000, (partA.endsAt - st.session.startedAt) / 10)}
                label="Section time"
                className="text-heading md:text-timer"
              />
            )}
            <Dialog
              open={paletteOpen}
              onOpenChange={setPaletteOpen}
              title="Questions"
              trigger={
                <button
                  type="button"
                  aria-label="Open question palette"
                  className="inline-flex size-touch items-center justify-center rounded-sm border border-hairline text-fg hover:border-fg lg:hidden"
                >
                  <SquaresFour size={20} weight="duotone" />
                </button>
              }
            >
              {palette}
            </Dialog>
            <ConfirmDialog
              trigger={
                <Button variant="quiet" className="text-mute">
                  Quit
                </Button>
              }
              title="Quit this session?"
              description="No pause, no save: quitting ends it now and it is marked as quit in history."
              confirmLabel="Quit session"
              onConfirm={() => void post("quit")}
            >
              {unanswered > 0 && (
                <p className="font-mono text-caption text-mute">{unanswered} unanswered will be recorded as skipped.</p>
              )}
            </ConfirmDialog>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto grid w-full max-w-[1440px] flex-1 content-start gap-8 px-4 pt-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 lg:pt-8 xl:grid-cols-[minmax(0,1fr)_400px]",
        )}
      >
        {(notice || offline) && (
          <p role="status" className="font-mono text-caption text-mute lg:col-span-2">
            {offline ? "Can't reach the server. The clock is still running; retrying." : notice}
          </p>
        )}

        {current ? (
          <Stage
            key={`${current.pos}:${current.visitStartedAt}`}
            current={current}
            state={st}
            scheme={scheme}
            animated={!!current.question && animatedIds.includes(current.question.id)}
            actions={actions}
            submitSlot={
              <>
                <div className="hidden border-t border-hairline pt-6 lg:block">{palette}</div>
                {partA.phase === "revisit" && submit}
              </>
            }
          />
        ) : (
          <>
            <Panel label="Revisit queue" index="00" className="self-start">
              <p className="text-lead text-fg">The queue is clear.</p>
              <p className="mt-2 max-w-xl text-body text-mute">
                Every question has been seen and nothing is waiting for review. Submit now, or open any question from the
                palette while the clock runs.
              </p>
            </Panel>
            <aside className="flex flex-col gap-6">
              {submit}
              <div className="hidden border-t border-hairline pt-6 lg:block">{palette}</div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
