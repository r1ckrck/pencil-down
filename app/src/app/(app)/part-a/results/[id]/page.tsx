import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { FORMAT_LABEL, KIND_LABEL, MODE_LABEL, TOPIC_LABEL, marks } from "@/components/part-a/labels";
import { ReviewList, type ReviewQuestion } from "@/components/part-a/review-list";
import { ScoreScale } from "@/components/part-a/score-scale";
import { sessionId, sessionResults } from "@/components/part-a/server";
import type { Format, Topic } from "@/components/part-a/types";
import { PageHeader } from "@/components/shell/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow, RoleLabel } from "@/components/ui/label";
import { Metric, Stat } from "@/components/ui/stat";

export const metadata: Metadata = { title: "Part A results" };

type Tally = { correct: number; partial: number; wrong: number; skipped: number; dropped: number; marks: number; max: number };

const STATUS_NOTE: Record<string, string> = {
  quit: "Quit early. Every unanswered question was recorded as skipped.",
  expired: "The section clock ran out.",
  completed: "Submitted.",
};

function when(ms: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(ms);
}

function verdict(score: number, band: { low: number; high: number } | null, target: number | null, cutoff: number | null) {
  if (band && target !== null) {
    if (score >= target) return "At or above target.";
    if (score > band.high) return `Above the band. ${marks(target - score)} to target.`;
    if (score >= band.low) return `Inside the cutoff band. ${marks(target - score)} to target.`;
    return `${marks(band.low - score)} below the band.`;
  }
  if (cutoff !== null) return score >= cutoff ? `Cleared that year's cutoff by ${marks(score - cutoff)}.` : `${marks(cutoff - score)} short of that year's cutoff.`;
  return "No published cutoff for this year.";
}

function pct(x: number | null) {
  return x === null ? "—" : `${Math.round(x * 100)}%`;
}

function TallyTable<K extends string>({
  caption,
  rows,
  label,
}: {
  caption: string;
  rows: [K, Tally][];
  label: (k: K) => string;
}) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[320px] border-collapse text-small">
        <caption className="mb-3 text-left">
          <Eyebrow>{caption}</Eyebrow>
        </caption>
        <thead>
          <tr className="border-b border-hairline font-mono text-label uppercase text-mute">
            <th className="py-2 pr-3 text-left font-normal" scope="col">
              &nbsp;
            </th>
            <th className="px-2 py-2 text-right font-normal" scope="col">right</th>
            <th className="px-2 py-2 text-right font-normal" scope="col">wrong</th>
            <th className="px-2 py-2 text-right font-normal" scope="col">skip</th>
            <th className="py-2 pl-2 text-right font-normal" scope="col">marks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, t]) => (
            <tr key={k} className="border-b border-hairline last:border-b-0">
              <th scope="row" className="py-2 pr-3 text-left font-normal text-fg">
                {label(k)}
              </th>
              <td className="px-2 py-2 text-right font-mono tabular text-fg">
                {t.correct}
                {t.partial > 0 && <span className="text-mute">+{t.partial}</span>}
              </td>
              <td className="px-2 py-2 text-right font-mono tabular text-fg">{t.wrong}</td>
              <td className="px-2 py-2 text-right font-mono tabular text-mute">{t.skipped}</td>
              <td className="py-2 pl-2 text-right font-mono tabular text-fg">
                {marks(t.marks)}
                <span className="text-mute">/{marks(t.max)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Results({ params }: { params: Promise<{ id: string }> }) {
  const id = await sessionId(params);
  const { results, animatedIds, drill } = await sessionResults(id);
  const s = results.session;
  const a = results.partA;
  if (!a) {
    if (s.status === "live") redirect(`/part-a/${id}`);
    notFound();
  }

  const title = a.paper ? a.paper.label : KIND_LABEL[s.kind as keyof typeof KIND_LABEL];
  const drillNote =
    s.kind === "drill"
      ? [drill.topic ? TOPIC_LABEL[drill.topic as Topic] : "any topic", drill.format ?? "any format"].join(" · ")
      : null;
  const score = a.score ?? 0;
  const max = a.maxScore ?? a.totals.max;
  const byFormat = (["NAT", "MSQ", "MCQ"] as Format[])
    .filter((f) => a.byFormat[f])
    .map((f) => [f, a.byFormat[f]!] as [Format, Tally]);
  const byTopic = (Object.entries(a.byTopic) as [Topic, Tally][]).sort((x, y) => y[1].max - x[1].max);
  const { sure, unsure } = a.calibration;

  return (
    <>
      <PageHeader
        eyebrow={a.retake ? "Part A · results · retake" : "Part A · results"}
        index="01"
        title={title}
        aside={`${when(s.startedAt)} · ${MODE_LABEL[s.mode as keyof typeof MODE_LABEL]}`}
      >
        {[drillNote, STATUS_NOTE[a.status ?? "completed"]].filter(Boolean).join(" · ")}
      </PageHeader>

      <section className="grid gap-8 md:grid-cols-[minmax(0,auto)_minmax(0,1fr)] md:items-end md:gap-12">
        <Stat
          label="Score"
          value={marks(score)}
          unit={`/ ${marks(max)}`}
          size="lg"
          accent
          note={verdict(score, a.band, a.target, a.cutoff)}
        />
        <ScoreScale score={score} max={max} band={a.band} target={a.target} cutoff={a.cutoff} />
      </section>

      <section className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-hairline pt-8 sm:grid-cols-3 lg:grid-cols-6">
        <Metric value={a.totals.correct + a.totals.partial} label="right (incl. partial)" />
        <Metric value={a.totals.wrong} label="wrong" />
        <Metric value={a.totals.skipped} label="skipped" />
        <Metric value={a.forcedSkips} label="forced skips" />
        <Metric value={marks(-a.lostToWrong)} label="marks lost to wrong" tone={a.lostToWrong > 0 ? "bad" : "fg"} />
        <Metric value={marks(a.leftBySkipping)} label="marks left by skipping" tone="mute" />
      </section>

      <section className="mt-12 grid gap-6 border-t border-hairline pt-8 md:grid-cols-[200px_1fr] md:gap-8">
        <div className="flex flex-col gap-2">
          <Eyebrow index="01">Calibration</Eyebrow>
          <RoleLabel>Does &ldquo;sure&rdquo; mean right?</RoleLabel>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:max-w-md">
          <Metric value={pct(sure.accuracy)} unit={`${sure.correct}/${sure.answered}`} label="right when sure" />
          <Metric value={pct(unsure.accuracy)} unit={`${unsure.correct}/${unsure.answered}`} label="right when unsure" />
        </div>
      </section>

      <section className="mt-12 grid gap-6 border-t border-hairline pt-8 md:grid-cols-[200px_1fr] md:gap-8">
        <div className="flex flex-col gap-2">
          <Eyebrow index="02">Breakdown</Eyebrow>
          <RoleLabel>Where the marks came from.</RoleLabel>
        </div>
        <div className="grid min-w-0 gap-10">
          <TallyTable caption="By format" rows={byFormat} label={(f) => FORMAT_LABEL[f]} />
          <TallyTable caption="By topic" rows={byTopic} label={(t) => TOPIC_LABEL[t]} />
        </div>
      </section>

      <section className="mt-12 grid gap-6 border-t border-hairline pt-8 md:grid-cols-[200px_1fr] md:gap-8">
        <div className="flex flex-col gap-2">
          <Eyebrow index="03">Review</Eyebrow>
          <RoleLabel>Open a question for the key and the working.</RoleLabel>
        </div>
        <div className="min-w-0">
          <ReviewList questions={a.questions as ReviewQuestion[]} animatedIds={animatedIds} />
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-2">
        <Link href="/part-a" className={buttonClasses({ variant: "primary" })}>
          Back to Part A
        </Link>
        <Link href="/" className={buttonClasses({ variant: "quiet" })}>
          Today
        </Link>
      </div>
    </>
  );
}

export default function PartAResultsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="font-mono text-label uppercase text-mute">Scoring</p>}>
      <Results params={params} />
    </Suspense>
  );
}
