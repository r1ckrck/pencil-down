"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Eyebrow, RoleLabel } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/cn";
import { KIND_LABEL, TOPIC_LABEL, sessionHref } from "./labels";
import { StartDialog } from "./start-dialog";
import type { Format, Kind, Mode, Switches, Topic } from "./types";

export type HubData = {
  defaultMode: Mode;
  custom: Switches;
  budgets: Record<Format, number>;
  revisitDue: number;
  live: { id: number; kind: Kind } | null;
  initialTopic: Topic | null;
  topics: { topic: Topic; eligible: number; unseen: number; generators: number }[];
  papers: {
    id: string;
    label: string;
    year: number;
    durationMin: number;
    totalMarks: number;
    questionCount: number;
    cutoff: number | null;
    sittings: number;
  }[];
};

function Section({
  index,
  title,
  note,
  id,
  children,
}: {
  index: string;
  title: string;
  note: ReactNode;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="grid scroll-mt-8 gap-4 border-t border-hairline py-8 first:border-t-0 first:pt-0 md:grid-cols-[200px_1fr] md:gap-8">
      <div className="flex flex-col gap-2">
        <Eyebrow index={index}>{title}</Eyebrow>
        <RoleLabel>{note}</RoleLabel>
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  );
}

/** Single-choice chips for the drill topic; wraps on phone, 44 px targets. */
function TopicPicker({
  value,
  onChange,
  topics,
}: {
  value: Topic | null;
  onChange: (t: Topic | null) => void;
  topics: HubData["topics"];
}) {
  const chip = (selected: boolean) =>
    cn(
      "inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-sm border px-3 text-small font-medium",
      "transition-colors duration-(--dur-fast) ease-measured disabled:opacity-40",
      selected ? "border-fg bg-fg text-on-fg" : "border-hairline text-fg hover:border-fg",
    );
  return (
    <div role="radiogroup" aria-label="Topic" className="flex flex-wrap gap-2">
      <button type="button" role="radio" aria-checked={value === null} className={chip(value === null)} onClick={() => onChange(null)}>
        Any topic
      </button>
      {topics.map((t) => (
        <button
          key={t.topic}
          type="button"
          role="radio"
          aria-checked={value === t.topic}
          disabled={t.eligible === 0 && t.generators === 0}
          className={chip(value === t.topic)}
          onClick={() => onChange(t.topic)}
        >
          {TOPIC_LABEL[t.topic]}
          <span className="font-mono text-label opacity-70">{t.eligible}
            {t.generators > 0 && "+"}</span>
        </button>
      ))}
    </div>
  );
}

const COUNTS = ["5", "10", "20", "30"] as const;

export function PartAHub({ data }: { data: HubData }) {
  const [topic, setTopic] = useState<Topic | null>(data.initialTopic);
  const [format, setFormat] = useState<"any" | Format>("any");
  const [n, setN] = useState<(typeof COUNTS)[number]>("10");
  const locked = data.live !== null;
  const start = { defaultMode: data.defaultMode, custom: data.custom };

  const drillMinutes =
    format === "any" ? null : Math.round((Number(n) * data.budgets[format]) / 60);
  const drillSummary = [
    `${n} questions`,
    topic ? TOPIC_LABEL[topic] : "any topic",
    format === "any" ? "any format" : format,
    drillMinutes ? `${drillMinutes} min` : "clock = sum of budgets",
  ].join(" · ");

  const startButton = (label: string, primary = false, disabled = false) => (
    <Button variant={primary ? "primary" : "quiet"} size="lg" disabled={locked || disabled} className="self-start">
      {label}
    </Button>
  );

  return (
    <div className="flex flex-col">
      {data.live && (
        <div className="mb-8 flex flex-col gap-4 rounded-lg border border-fg p-4 sm:flex-row sm:items-center sm:justify-between md:p-6">
          <div>
            <p className="text-body font-medium text-fg">A {KIND_LABEL[data.live.kind].toLowerCase()} is running.</p>
            <p className="text-small text-mute">The clock has not stopped. New sessions wait until it ends.</p>
          </div>
          <Link href={sessionHref(data.live.kind, data.live.id)} className={buttonClasses({ variant: "primary", size: "lg" })}>
            Return to session
            <ArrowRight weight="bold" aria-hidden />
          </Link>
        </div>
      )}

      <Section index="01" title="Mock" note="The real shape. Run it weekly.">
        <div className="flex flex-col gap-1">
          <p className="text-lead text-fg">44 questions in 60 minutes</p>
          <p className="font-mono text-caption text-mute">8 numerical · 10 multiple-select · 26 single-choice · topic-weighted</p>
        </div>
        <StartDialog
          title="Mock"
          summary="44 questions · 60 min · per-question budget"
          request={{ kind: "mock" }}
          trigger={startButton("Start mock", !locked)}
          {...start}
        />
      </Section>

      <Section id="drill" index="02" title="Drill" note="One weakness at a time.">
        <div className="flex flex-col gap-3">
          <p className="text-small font-medium text-fg">Topic</p>
          <TopicPicker value={topic} onChange={setTopic} topics={data.topics} />
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-6">
          <div className="flex flex-col gap-3">
            <p className="text-small font-medium text-fg">Format</p>
            <SegmentedControl
              aria-label="Format"
              value={format}
              onValueChange={setFormat}
              options={[
                { value: "any", label: "Any" },
                { value: "MCQ", label: "MCQ" },
                { value: "MSQ", label: "MSQ" },
                { value: "NAT", label: "NAT" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-small font-medium text-fg">Questions</p>
            <SegmentedControl
              aria-label="Number of questions"
              value={n}
              onValueChange={setN}
              options={COUNTS.map((c) => ({ value: c, label: <span className="font-mono">{c}</span> }))}
            />
          </div>
        </div>
        <p className="font-mono text-caption text-mute">{drillSummary}</p>
        <StartDialog
          title="Drill"
          summary={drillSummary}
          request={{ kind: "drill", topic, format: format === "any" ? null : format, n: Number(n) }}
          trigger={startButton("Start drill")}
          {...start}
        />
      </Section>

      <Section index="03" title="Revisit" note="Your misses, back on schedule.">
        <p className="text-lead text-fg">
          <span className="font-mono">{data.revisitDue}</span> {data.revisitDue === 1 ? "question" : "questions"} due
        </p>
        {data.revisitDue > 0 ? (
          <StartDialog
            title="Revisit"
            summary={`${data.revisitDue} due from the error log · per-question budget`}
            request={{ kind: "revisit" }}
            trigger={startButton("Start revisit")}
            {...start}
          />
        ) : (
          <p className="text-small text-mute">Nothing due today. Wrong, unsure and forced-skip answers come back here.</p>
        )}
      </Section>

      <Section
        index="04"
        title="Past papers"
        note="Opt-in. One real paper as set: its questions, order, marking and time."
      >
        <ul className="flex flex-col">
          {data.papers.map((p) => {
            const retake = p.sittings > 0;
            return (
              <li
                key={p.id}
                className="flex flex-col gap-3 border-b border-hairline py-4 first:pt-0 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-body font-medium text-fg">
                    {p.label}
                    {retake && <span className="ml-2 font-mono text-label uppercase text-mute">sat {p.sittings}×</span>}
                  </p>
                  <p className="font-mono text-caption text-mute">
                    {p.questionCount} Q · {p.totalMarks} marks · {p.durationMin} min · cutoff {p.cutoff ?? "—"}
                  </p>
                </div>
                <StartDialog
                  title={retake ? `${p.label} · retake` : p.label}
                  summary={`${p.questionCount} questions · ${p.durationMin} min · that year's marking${
                    p.cutoff !== null ? ` · cutoff ${p.cutoff}` : ""
                  }`}
                  request={{ kind: "past-paper", paperId: p.id }}
                  trigger={
                    <Button variant="quiet" disabled={locked} className="self-start sm:self-auto">
                      {retake ? "Retake" : "Sit paper"}
                    </Button>
                  }
                  {...start}
                />
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
