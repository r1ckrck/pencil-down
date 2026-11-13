"use client";

import { CaretRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Metric, Stat } from "@/components/ui/stat";
import { cn } from "@/lib/cn";
import { BarList, ColumnChart, type Point, TrendChart } from "./charts";

type Mode = "easy" | "hard" | "custom";
type ModeFilter = "all" | Mode;
type PartFilter = "all" | "a" | "b";

type HistoryRow = {
  id: number;
  kind: string;
  mode: Mode;
  startedAt: number;
  endedAt: number | null;
  status: "live" | "completed" | "quit" | "expired";
  quit: boolean;
  score: number | null;
  maxScore: number | null;
  medianSecondsToCommit: number | null;
  paperId: string | null;
  retake: boolean;
  slot: string | null;
};

type Dashboard = {
  serverNow: number;
  partA: {
    band: { low: number; high: number };
    target: number;
    mockTrend: { id: number; kind: string; at: number; score: number; maxScore: number; quit: boolean }[];
    accuracyByTopic: Record<string, { answered: number; correct: number; total: number; accuracy: number | null }>;
    forcedSkipRate: number | null;
    lostToWrong: number;
    leftBySkipping: number;
    retiredOverTime: { at: number; total: number }[];
  };
  partB: {
    perSlot: Record<string, { attempts: number; medianSecondsToCommit: number | null }>;
    attempts: {
      attemptId: number;
      sessionId: number;
      at: number;
      slot: string;
      secondsToCommit: number;
      ideas: number;
      distinctTagRatio: number | null;
      selfRating: number | null;
    }[];
  };
  cards: { total: number; introduced: number; retention30d: number | null; dueToday: number; dueNext7Days: number[] };
};

const A_KINDS = new Set(["mock", "drill", "revisit", "past-paper", "full"]);
const B_KINDS = new Set(["b-drill", "b-mock", "b-past-paper", "full"]);

const KIND_LABEL: Record<string, string> = {
  mock: "Part A mock",
  drill: "Part A drill",
  revisit: "Revisit",
  "past-paper": "Part A past paper",
  "b-drill": "Part B drill",
  "b-mock": "Part B mock",
  "b-past-paper": "Part B past paper",
  full: "Full exam",
};

export const SLOT_LABEL: Record<string, string> = {
  sketching: "Sketching",
  creativity: "Creativity",
  visual: "Visual sensitivity",
  form: "Form sensitivity",
  "problem-id": "Problem identification",
};
// Commit point per slot script (spec §5.3), seconds from block start.
const COMMIT_BY: Record<string, number> = { sketching: 300, creativity: 660, visual: 660, form: 660, "problem-id": 780 };

const TOPIC_LABEL: Record<string, string> = {
  "3d-visualisation": "3D visualisation",
  "folding-and-patterns": "Folding, patterns",
  mechanisms: "Mechanisms",
  "everyday-science": "Everyday science",
  observation: "Observation",
  "logic-and-counting": "Logic, counting",
  "design-knowledge": "Design knowledge",
  language: "Language",
};

const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
const day = (t: number) => dayFmt.format(t);
const num = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const pct = (v: number) => `${Math.round(v * 100)}%`;
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export function resultsHref(kind: string, id: number) {
  return B_KINDS.has(kind) && kind !== "full" ? `/part-b/results/${id}` : `/part-a/results/${id}`;
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json() as Promise<T>;
}

export function ProgressView() {
  const [mode, setMode] = useState<ModeFilter>("all");
  const [part, setPart] = useState<PartFilter>("all");
  const [data, setData] = useState<{ history: HistoryRow[]; dash: Dashboard; mode: ModeFilter } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    const q = mode === "all" ? "" : `?mode=${mode}`;
    Promise.all([
      getJson<{ sessions: HistoryRow[] }>(`/api/progress/history${q}`),
      getJson<Dashboard>(`/api/progress/dashboard${q}`),
    ])
      .then(([h, dash]) => {
        if (!live) return;
        setData({ history: h.sessions, dash, mode });
        setFailed(false);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [mode]);

  const loading = !data || data.mode !== mode;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <SegmentedControl<ModeFilter>
          aria-label="Filter by mode"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: "all", label: "All modes" },
            { value: "easy", label: "Easy" },
            { value: "hard", label: "Hard" },
            { value: "custom", label: "Custom" },
          ]}
        />
        <SegmentedControl<PartFilter>
          aria-label="Filter by part"
          value={part}
          onValueChange={setPart}
          options={[
            { value: "all", label: "Both parts" },
            { value: "a", label: "Part A" },
            { value: "b", label: "Part B" },
          ]}
        />
      </div>

      {failed ? (
        <p className="text-small text-mute">Could not load progress. Reload to try again.</p>
      ) : !data ? (
        <p className="text-small text-mute" aria-busy>
          Loading…
        </p>
      ) : (
        <div className={cn("flex flex-col gap-10 transition-opacity", loading && "opacity-50")} aria-busy={loading}>
          <Headline dash={data.dash} part={part} history={data.history} />
          <History rows={data.history} part={part} mode={mode} />
          {part !== "b" && <PartASection a={data.dash.partA} />}
          {part !== "a" && <PartBSection b={data.dash.partB} />}
          {part === "all" && <CardsSection c={data.dash.cards} />}
        </div>
      )}
    </div>
  );
}

/* ── Headline: the one display number ─────────────────────────────── */

function Headline({ dash, part, history }: { dash: Dashboard; part: PartFilter; history: HistoryRow[] }) {
  const { band, target, mockTrend } = dash.partA;
  const last = mockTrend.at(-1);
  const bAttempts = dash.partB.attempts;
  const recentB = bAttempts.slice(-5).map((a) => a.secondsToCommit);
  const medianB = recentB.length ? [...recentB].sort((x, y) => x - y)[Math.floor(recentB.length / 2)] : null;

  let stat: ReactNode;
  if (part === "b") {
    stat = (
      <Stat
        size="lg"
        accent
        label="Median seconds-to-commit · last 5 attempts"
        value={medianB === null ? "–" : mmss(medianB)}
        unit={medianB === null ? undefined : "min:s"}
        note={medianB === null ? "Run a Part B drill to start this number." : "Lower is a faster decision. Commit by min 5 (Sketching) or 11–13."}
      />
    );
  } else {
    const note = !last
      ? "Take a Part A mock to put your first score against the cutoff band."
      : last.score < band.low
        ? `${num(band.low - last.score)} below the ${band.low}–${band.high} cutoff band · target ${target}`
        : last.score <= band.high
          ? `Inside the ${band.low}–${band.high} cutoff band · ${num(target - last.score)} to the target ${target}`
          : last.score < target
            ? `Above the cutoff band · ${num(target - last.score)} to the target ${target}`
            : `At or above the target ${target}`;
    stat = (
      <Stat
        size="lg"
        accent
        label={last ? `Latest Part A score · ${KIND_LABEL[last.kind]} · ${day(last.at)}` : "Latest Part A score"}
        value={last ? num(last.score) : "–"}
        unit={last ? `/ ${last.maxScore}` : undefined}
        note={note}
      />
    );
  }

  const shown = history.filter((h) => part === "all" || (part === "a" ? A_KINDS.has(h.kind) : B_KINDS.has(h.kind)));
  const quits = shown.filter((h) => h.status === "quit" || h.status === "expired").length;

  return (
    <section className="grid gap-8 border-b border-hairline pb-10 md:grid-cols-[1fr_auto] md:items-end" data-testid="headline">
      {stat}
      <div className="grid grid-cols-3 gap-6 md:gap-8">
        <Metric value={shown.length} label="sessions" />
        <Metric value={part === "b" ? bAttempts.length : mockTrend.length} label={part === "b" ? "slot attempts" : "mocks scored"} />
        <Metric value={quits} label="quit or expired" tone={quits ? "fg" : "mute"} />
      </div>
    </section>
  );
}

/* ── History ───────────────────────────────────────────────────────── */

function History({ rows, part, mode }: { rows: HistoryRow[]; part: PartFilter; mode: ModeFilter }) {
  const [limit, setLimit] = useState(8);
  const shown = rows.filter((h) => part === "all" || (part === "a" ? A_KINDS.has(h.kind) : B_KINDS.has(h.kind)));

  return (
    <Panel label="History" index="01" aside={`${shown.length} sessions · newest first`}>
      {shown.length === 0 ? (
        <Empty
          text={
            rows.length || mode !== "all"
              ? "No sessions match these filters."
              : "No sessions yet. Start with a short Part A drill or one Part B slot; every session lands here."
          }
          action={rows.length || mode !== "all" ? undefined : { href: "/part-a", label: "Go to Part A" }}
        />
      ) : (
        <>
          <ul className="-mx-2 flex flex-col" data-testid="history">
            {shown.slice(0, limit).map((h) => (
              <li key={h.id} className="border-t border-hairline first:border-t-0">
                <HistoryItem h={h} />
              </li>
            ))}
          </ul>
          {shown.length > limit && (
            <Button className="mt-4" onClick={() => setLimit((l) => l + 20)}>
              Show older · {shown.length - limit}
            </Button>
          )}
        </>
      )}
    </Panel>
  );
}

function HistoryItem({ h }: { h: HistoryRow }) {
  const kind = KIND_LABEL[h.kind] ?? h.kind;
  const detail = [h.slot ? SLOT_LABEL[h.slot] ?? h.slot : null, h.paperId, h.retake ? "retake" : null].filter(Boolean).join(" · ");
  const hasA = A_KINDS.has(h.kind);
  const hasB = B_KINDS.has(h.kind);
  const status = h.status === "completed" ? null : h.status;
  const href = h.status === "live" ? "/" : resultsHref(h.kind, h.id);

  return (
    <Link
      href={href}
      className="grid min-h-touch grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1 rounded-sm px-2 py-3 transition-colors hover:bg-tint md:grid-cols-[112px_1fr_72px_160px_auto]"
      data-testid="history-row"
    >
      <span className="col-span-3 font-mono text-caption text-mute md:col-span-1">
        {day(h.startedAt)} · {timeFmt.format(h.startedAt)}
      </span>
      <span className="min-w-0">
        <span className="block text-small font-medium">{kind}</span>
        {detail && <span className="block truncate text-caption text-mute">{detail}</span>}
      </span>
      <span className="font-mono text-caption uppercase text-mute">{h.mode}</span>
      <span className="col-span-2 flex flex-wrap items-baseline gap-x-3 font-mono text-small md:col-span-1 md:justify-end">
        {hasA && (h.score !== null ? <span>{num(h.score)}<span className="text-mute"> / {h.maxScore}</span></span> : <span className="text-mute">no score</span>)}
        {hasB && (h.medianSecondsToCommit !== null ? <span>{mmss(h.medianSecondsToCommit)}<span className="text-mute"> to commit</span></span> : !hasA && <span className="text-mute">no commit</span>)}
      </span>
      <span className="flex items-center justify-end gap-2">
        {status && (
          <span
            className={cn(
              "rounded-xs border px-1.5 font-mono text-label uppercase",
              status === "live" ? "border-fg text-fg" : "border-hairline text-mute",
            )}
          >
            {status}
          </span>
        )}
        <CaretRight size={16} className="text-mute" aria-hidden />
      </span>
    </Link>
  );
}

/* ── Part A ────────────────────────────────────────────────────────── */

function PartASection({ a }: { a: Dashboard["partA"] }) {
  const trend: Point[] = a.mockTrend.map((m, i) => ({
    n: i + 1,
    label: day(m.at),
    value: m.score,
    note: `${KIND_LABEL[m.kind]}${m.quit ? " · quit" : ""} · of ${m.maxScore}`,
    hollow: m.quit,
  }));
  const topics = Object.entries(a.accuracyByTopic);
  const practised = topics.filter(([, t]) => t.answered > 0 && t.accuracy !== null);
  const unpractised = topics.filter(([, t]) => t.answered === 0).map(([k]) => TOPIC_LABEL[k] ?? k);
  const retired: Point[] = a.retiredOverTime.map((r, i) => ({ n: i + 1, label: day(r.at), value: r.total }));
  const lost = a.lostToWrong + a.leftBySkipping;
  const scores = a.mockTrend.map((m) => m.score);
  const top = Math.max(80, ...scores.map((s) => s + 10));
  const bottom = Math.min(0, ...scores);
  const lo = Math.floor(bottom / 20) * 20;
  const hi = Math.ceil(top / 20) * 20;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="pa">
      <Eyebrow as="h2" index="02">
        <span id="pa">Part A</span>
      </Eyebrow>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="Score trend" aside="mocks, full exams, past papers" className="lg:col-span-2">
          {trend.length === 0 ? (
            <Empty text="Finish a Part A mock to see your score against the 48–54 cutoff band and the 60 target." action={{ href: "/part-a", label: "Start a mock" }} />
          ) : (
            <>
              <TrendChart
                data={trend}
                series="a"
                label={`Part A score per mock; latest ${num(scores.at(-1)!)}`}
                domain={[lo, hi]}
                ticks={Array.from({ length: (hi - lo) / 20 + 1 }, (_, i) => lo + i * 20)}
                format={num}
                refs={[
                  { kind: "band", from: a.band.low, to: a.band.high, label: `cutoff ${a.band.low}–${a.band.high}` },
                  { kind: "line", at: a.target, label: `target ${a.target}` },
                ]}
                height={260}
              />
              <p className="mt-2 text-caption text-mute">Hollow dot: a quit session, scored with every unanswered question blank.</p>
            </>
          )}
        </Panel>

        <Panel label="Accuracy by topic" aside="correct of answered">
          {practised.length === 0 ? (
            <Empty text="Answer some Part A questions; accuracy appears per topic." />
          ) : (
            <>
              <BarList
                series="a"
                label="Accuracy by topic"
                max={1}
                format={pct}
                data={practised
                  .sort((x, y) => (x[1].accuracy ?? 0) - (y[1].accuracy ?? 0))
                  .map(([k, t]) => ({ name: TOPIC_LABEL[k] ?? k, value: t.accuracy ?? 0, note: `${t.correct} of ${t.answered} answered · ${t.total} seen` }))}
              />
              {unpractised.length > 0 && <p className="mt-3 text-caption text-mute">Not practised yet: {unpractised.join(", ")}.</p>}
            </>
          )}
        </Panel>

        <Panel label="Where marks go" aside="all Part A questions">
          {a.forcedSkipRate === null ? (
            <Empty text="Marks lost to wrong answers and left by skipping show up after your first Part A session." />
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-3 gap-4">
                <Metric value={num(a.lostToWrong)} label="lost to wrong answers" tone={a.lostToWrong ? "bad" : "fg"} />
                <Metric value={num(a.leftBySkipping)} label="left by skipping" />
                <Metric value={pct(a.forcedSkipRate)} label="forced-skip rate" />
              </div>
              {lost > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex h-3 w-full gap-0.5" role="img" aria-label={`${pct(a.lostToWrong / lost)} of lost marks from wrong answers`}>
                    {a.lostToWrong > 0 && <span className="rounded-l-xs bg-bad" style={{ flexGrow: a.lostToWrong }} />}
                    {a.leftBySkipping > 0 && <span className="rounded-r-xs bg-hairline" style={{ flexGrow: a.leftBySkipping }} />}
                  </div>
                  <div className="flex justify-between font-mono text-caption text-mute">
                    <span className="flex items-center gap-2"><span className="size-2 rounded-xs bg-bad" />wrong · {pct(a.lostToWrong / lost)}</span>
                    <span className="flex items-center gap-2">skipped · {pct(a.leftBySkipping / lost)}<span className="size-2 rounded-xs bg-hairline" /></span>
                  </div>
                </div>
              )}
              <p className="text-caption text-mute">
                A wrong MCQ costs 0.5, a wrong MSQ costs 1. Skipping costs nothing beyond the marks you leave; guess only when you can rule options out.
              </p>
            </div>
          )}
        </Panel>

        <Panel label="Questions mastered" aside="real questions correct twice" className="lg:col-span-2">
          {retired.length === 0 ? (
            <Empty text="A real question you answer correctly twice retires for good. The first one will start this line." />
          ) : (
            <TrendChart data={retired} series="a" label={`${retired.at(-1)!.value} questions mastered`} step area height={180} />
          )}
        </Panel>
      </div>
    </section>
  );
}

/* ── Part B ────────────────────────────────────────────────────────── */

function PartBSection({ b }: { b: Dashboard["partB"] }) {
  const atts = b.attempts;
  const pts = (pick: (a: (typeof atts)[number]) => number | null, list = atts): Point[] =>
    list.map((a, i) => ({ n: i + 1, label: day(a.at), value: pick(a), note: SLOT_LABEL[a.slot] }));
  const tagged = atts.filter((a) => a.distinctTagRatio !== null);
  const rated = atts.filter((a) => a.selfRating !== null);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="pb">
      <Eyebrow as="h2" index="03">
        <span id="pb">Part B</span>
      </Eyebrow>
      {atts.length === 0 ? (
        <Panel>
          <Empty text="Commit one Part B slot. Seconds-to-commit, ideas and ratings chart from there." action={{ href: "/part-b", label: "Go to Part B" }} />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel label="Seconds to commit, per slot" aside="each attempt · line = commit point" className="lg:col-span-2">
            <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(b.perSlot).map(([slot, s]) => {
                const series: Point[] = atts
                  .filter((a) => a.slot === slot)
                  .map((a, i) => ({ n: i + 1, label: day(a.at), value: a.secondsToCommit }));
                const peak = Math.max(COMMIT_BY[slot] ?? 600, ...series.map((p) => p.value ?? 0));
                return (
                  <div key={slot} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-small font-medium">{SLOT_LABEL[slot] ?? slot}</p>
                      <p className="font-mono text-caption text-mute">
                        {s.medianSecondsToCommit === null ? "no attempts" : <>median <span className="text-fg">{mmss(s.medianSecondsToCommit)}</span> · {s.attempts}</>}
                      </p>
                    </div>
                    {series.length ? (
                      <TrendChart
                        data={series}
                        series="b"
                        label={`${SLOT_LABEL[slot]} seconds to commit`}
                        height={120}
                        domain={[0, Math.ceil((peak * 1.1) / 60) * 60]}
                        format={mmss}
                        refs={COMMIT_BY[slot] ? [{ kind: "line", at: COMMIT_BY[slot], label: "commit by" }] : []}
                      />
                    ) : (
                      <p className="flex h-[120px] items-center justify-center rounded-md border border-hairline text-caption text-mute">
                        Not practised
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel label="Ideas per attempt" aside="counted in Generate">
            <ColumnChart data={pts((a) => a.ideas)} series="b" label="Ideas per attempt" showValues={atts.length <= 16} />
          </Panel>

          <Panel label="Distinct-tag ratio" aside="distinct tags ÷ tagged ideas">
            {tagged.length === 0 ? (
              <Empty text="Tag each idea with one word in the debrief. Higher means your ideas range wider." />
            ) : (
              <TrendChart data={pts((a) => a.distinctTagRatio, tagged)} series="b" label="Distinct-tag ratio per attempt" domain={[0, 1]} format={pct} height={180} />
            )}
          </Panel>

          <Panel label="Self-rating" aside="mean of the 4 criteria, 0–5" className="lg:col-span-2">
            {rated.length === 0 ? (
              <Empty text="Rate each criterion in the debrief. It is for trend only, never a score." />
            ) : (
              <TrendChart data={pts((a) => a.selfRating, rated)} series="b" label="Self-rating per attempt" domain={[0, 5]} format={num} height={180} />
            )}
          </Panel>
        </div>
      )}
    </section>
  );
}

/* ── Cards ─────────────────────────────────────────────────────────── */

function CardsSection({ c }: { c: Dashboard["cards"] }) {
  const labels = ["Tomorrow", "+2 d", "+3 d", "+4 d", "+5 d", "+6 d", "+7 d"];
  const load: Point[] = c.dueNext7Days.map((v, i) => ({ n: i + 1, label: labels[i], value: v, note: "cards due" }));
  return (
    <section className="flex flex-col gap-4" aria-labelledby="pc">
      <Eyebrow as="h2" index="04">
        <span id="pc">Cards</span>
      </Eyebrow>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel label="Retention" aside="last 30 days">
          <div className="grid grid-cols-2 gap-6">
            <Metric value={c.retention30d === null ? "–" : pct(c.retention30d)} label="reviews not marked Again" />
            <Metric value={c.dueToday} label="due today" />
            <Metric value={c.introduced} unit={`/ ${c.total}`} label="cards started" />
          </div>
          {c.introduced === 0 && (
            <div className="mt-6">
              <Empty text="Review your first cards to start the schedule." action={{ href: "/knowledge", label: "Go to Knowledge" }} />
            </div>
          )}
        </Panel>
        <Panel label="Due load" aside="next 7 days">
          {c.introduced === 0 ? (
            <Empty text="Nothing scheduled yet." />
          ) : (
            <ColumnChart data={load} series="cards" label="Cards due over the next 7 days" showValues />
          )}
        </Panel>
      </div>
    </section>
  );
}

function Empty({ text, action }: { text: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="max-w-prose text-small text-mute">{text}</p>
      {action && (
        <Link href={action.href} className={buttonClasses()}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
