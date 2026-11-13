import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { KIND_LABEL, TOPIC_LABEL, marks, sessionHref } from "@/components/part-a/labels";
import type { Kind } from "@/components/part-a/types";
import { PageHeader } from "@/components/shell/page-header";
import { HabitTracker } from "@/components/today/habit-tracker";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow, RoleLabel } from "@/components/ui/label";
import { Metric, Stat } from "@/components/ui/stat";
import { cn } from "@/lib/cn";
import { today } from "@/engine/progress";
import { getCtx } from "@/server/api";

const SLOT_LABEL: Record<string, string> = {
  sketching: "Sketching",
  creativity: "Creativity",
  visual: "Visual sensitivity",
  form: "Form sensitivity",
  "problem-id": "Problem identification",
};

function bandNote(score: number, band: { low: number; high: number }) {
  if (score > band.high) return "above the band";
  if (score >= band.low) return "inside the band";
  return "below the band";
}

function SuggestRow({ href, eyebrow, title, note, primary }: { href: string; eyebrow: string; title: string; note: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-touch items-center justify-between gap-4 rounded-md border p-4 transition-colors duration-(--dur-fast) ease-measured",
        primary ? "border-fg" : "border-hairline hover:border-fg",
      )}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-label uppercase text-mute">{eyebrow}</span>
        <span className="text-body font-medium text-fg">{title}</span>
        <span className="text-small text-mute">{note}</span>
      </span>
      <ArrowRight size={20} weight="bold" aria-hidden className="shrink-0 text-mute transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
    </Link>
  );
}

async function TodayBody() {
  await connection();
  const t = today(getCtx());
  const week = t.last7Days;
  const live = t.liveSession;
  const last = week.lastPartAScore;

  return (
    <>
      <section className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <Stat
          label="Days to CEED"
          value={t.daysToExam}
          unit={t.daysToExam === 1 ? "day" : "days"}
          note="Sunday 17 January 2027 · IIT Bombay M.Des"
        />
        <HabitTracker data={t.habits} />
      </section>

      {live && (
        <section className="mt-10 flex flex-col gap-3 rounded-lg border border-fg p-4 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex flex-col gap-1">
            <p className="text-body font-medium text-fg">{KIND_LABEL[live.kind as Kind] ?? "Session"} running</p>
            <p className="text-small text-mute">The clock did not stop while you were away.</p>
          </div>
          <Link href={sessionHref(live.kind, live.id)} className={buttonClasses({ variant: "primary", size: "lg" })}>
            Return to session
            <ArrowRight weight="bold" aria-hidden />
          </Link>
        </section>
      )}

      <section className="mt-12 grid gap-6 border-t border-hairline pt-8 md:grid-cols-[200px_1fr] md:gap-8">
        <div className="flex flex-col gap-2">
          <Eyebrow index="01">Next</Eyebrow>
          <RoleLabel>Weakest topic, least-practised slot.</RoleLabel>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <SuggestRow
            href={`/part-a?topic=${t.suggested.partATopic}#drill`}
            eyebrow="Part A · drill"
            title={TOPIC_LABEL[t.suggested.partATopic]}
            note="10 questions, per-question budget."
            primary={!live}
          />
          <SuggestRow
            href={`/part-b?slot=${t.suggested.partBSlot}`}
            eyebrow="Part B · drill"
            title={SLOT_LABEL[t.suggested.partBSlot] ?? t.suggested.partBSlot}
            note="One slot, 24 minutes, commit on time."
          />
        </div>
      </section>

      <section className="mt-12 grid gap-6 border-t border-hairline pt-8 md:grid-cols-[200px_1fr] md:gap-8">
        <div className="flex flex-col gap-2">
          <Eyebrow index="02">Last 7 days</Eyebrow>
          <RoleLabel>Volume, the gate, the commit.</RoleLabel>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          <Metric value={week.sessions} label="sessions" />
          <div className="flex flex-col gap-1">
            {last ? (
              <Link href={`/part-a/results/${last.sessionId}`} className="flex flex-col gap-1 hover:underline">
                <span className="font-mono text-heading font-medium text-fg">
                  {marks(last.score ?? 0)}
                  <span className="ml-1 text-caption font-normal text-mute">/{last.maxScore}</span>
                </span>
                <span className="text-caption text-mute">
                  last Part A · {last.maxScore === 150 ? bandNote(last.score ?? 0, week.band) : "past paper"}
                </span>
              </Link>
            ) : (
              <Metric value="—" label={`last Part A · band ${week.band.low}–${week.band.high}`} tone="mute" />
            )}
          </div>
          <Metric
            value={week.medianSecondsToCommit === null ? "—" : Math.round(week.medianSecondsToCommit)}
            unit={week.medianSecondsToCommit === null ? undefined : "s"}
            label="median to commit"
            tone={week.medianSecondsToCommit === null ? "mute" : "fg"}
          />
          <Link href="/knowledge" className="hover:underline">
            <Metric value={t.cardsDue} label="cards due" />
          </Link>
          <Link href="/part-a" className="hover:underline">
            <Metric value={t.revisitDue} label="Part A revisits due" />
          </Link>
        </div>
      </section>
    </>
  );
}

export default function TodayPage() {
  return (
    <>
      <PageHeader eyebrow="Today" index="00" title="Today" />
      <Suspense fallback={<p className="font-mono text-label uppercase text-mute">Loading</p>}>
        <TodayBody />
      </Suspense>
    </>
  );
}
