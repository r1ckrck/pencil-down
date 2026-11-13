"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { ThemeControl } from "@/components/shell/theme-control";
import { buttonClasses } from "@/components/ui/button";
import { Panel, Rule } from "@/components/ui/panel";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

type Mode = "easy" | "hard" | "custom";
type Format = "MCQ" | "MSQ" | "NAT";
type Switches = { questionTimer: boolean; forcedSkip: boolean; phaseTimer: boolean; questionHiding: boolean };
type Settings = { budgets: Record<Format, number>; custom: Switches; lastMode: Mode; theme: string };
type Patch = { budgets?: Partial<Record<Format, number>>; custom?: Partial<Switches>; lastMode?: Mode };

const SWITCHES: { key: keyof Switches; part: string; label: string; on: string; off: string }[] = [
  {
    key: "questionTimer",
    part: "Part A",
    label: "Question timer",
    on: "The per-question countdown is visible.",
    off: "The budget still runs, unseen. You learn the pace by feel.",
  },
  {
    key: "forcedSkip",
    part: "Part A",
    label: "Forced skip",
    on: "At zero your answer is saved as it is and the question moves to the revisit queue.",
    off: "At zero the bar turns red and stays; you move on when you choose.",
  },
  {
    key: "phaseTimer",
    part: "Part B",
    label: "Phase timer",
    on: "The phase clock (Read, Generate, Commit, Execute) is visible.",
    off: "Phases still change on time; the clock is hidden.",
  },
  {
    key: "questionHiding",
    part: "Part B",
    label: "Question hiding",
    on: "The question shows only while you read, then hides until the debrief. Read once, hold the goal.",
    off: "The question stays on screen for the whole attempt.",
  },
];

const FORMATS: { key: Format; label: string; note: string }[] = [
  { key: "MCQ", label: "MCQ", note: "single answer" },
  { key: "MSQ", label: "MSQ", note: "one or more answers" },
  { key: "NAT", label: "NAT", note: "typed number" },
];

export function SettingsForm({ examDate }: { examDate: string }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<{ tone: "mute" | "bad"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setSettings)
      .catch(() => setStatus({ tone: "bad", text: "Could not load settings. Reload to try again." }));
  }, []);

  async function save(patch: Patch) {
    if (!settings) return;
    const before = settings;
    setSettings({
      ...settings,
      ...(patch.lastMode ? { lastMode: patch.lastMode } : {}),
      budgets: { ...settings.budgets, ...patch.budgets },
      custom: { ...settings.custom, ...patch.custom },
    });
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "not saved");
      setSettings(d);
      setStatus({ tone: "mute", text: "Saved" });
    } catch (e) {
      setSettings(before);
      setStatus({ tone: "bad", text: `Not saved: ${(e as Error).message}` });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <p
        aria-live="polite"
        className={cn("min-h-5 font-mono text-caption", status?.tone === "bad" ? "text-bad" : "text-mute")}
      >
        {status?.text ?? (settings ? "Changes save as you make them." : "Loading…")}
      </p>

      <Panel label="Difficulty" index="01">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-body font-medium">Default mode</p>
            <p className="text-small text-mute">
              Pre-selected on every start screen. Choosing a different mode there also makes it the new default.
            </p>
            <SegmentedControl<Mode>
              aria-label="Default mode"
              value={settings?.lastMode ?? "hard"}
              onValueChange={(v) => save({ lastMode: v })}
              block
              className="max-w-md"
              options={[
                { value: "easy", label: "Easy", hint: "timers shown" },
                { value: "hard", label: "Hard", hint: "exam pressure" },
                { value: "custom", label: "Custom", hint: "your switches" },
              ]}
            />
          </div>

          <Rule />

          <div className="flex flex-col gap-1">
            <p className="text-body font-medium">Custom switches</p>
            <p className="text-small text-mute">
              Used only when a session runs in Custom. Easy and Hard set these for you.
            </p>
            <div className="mt-2 flex flex-col divide-y divide-hairline">
              {SWITCHES.map((s) => {
                const on = settings?.custom[s.key] ?? false;
                return (
                  <Switch
                    key={s.key}
                    checked={on}
                    disabled={!settings}
                    onCheckedChange={(v) => save({ custom: { [s.key]: v } })}
                    label={
                      <>
                        {s.label} <span className="font-mono text-label uppercase text-mute">{s.part}</span>
                      </>
                    }
                    description={on ? s.on : s.off}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </Panel>

      <Panel label="Per-question budgets" index="02" aside="10–600 s">
        <p className="mb-4 text-small text-mute">
          Time each Part A question gets before its budget runs out. The exam averages about 80 s a question.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {FORMATS.map((f) => (
            <BudgetField
              key={f.key}
              label={f.label}
              note={f.note}
              value={settings?.budgets[f.key]}
              onCommit={(v) => save({ budgets: { [f.key]: v } })}
            />
          ))}
        </div>
      </Panel>

      <Panel label="Theme" index="03">
        <ThemeControl />
      </Panel>

      <Panel label="Your data" index="04">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-small text-mute">
            One archive with the database (every session, answer, review and rating) and every Part B photo. Keep a copy
            before big changes.
          </p>
          <a href="/api/export" download className={buttonClasses({ className: "shrink-0" })} data-testid="export">
            <DownloadSimple size={20} weight="duotone" aria-hidden />
            Export archive
          </a>
        </div>
      </Panel>

      <Panel label="About" index="05">
        <div className="flex flex-col gap-3 text-small">
          <p>
            Pencil Down trains one person for CEED 2027 on {examDate}. Part A: answer fast, skip without guilt, clear the cutoff
            (band 48–54, target 60 of 150). Part B: decide and commit under time.
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-mute">
            <li>It never grades drawings. Part B tracks seconds-to-commit, idea count and your own ratings.</li>
            <li>It has no pause and no resume-later. The clock lives on the server; quitting records skips.</li>
            <li>It uses no AI and makes no outside calls. Everything is in the content pool and this database.</li>
          </ul>
        </div>
      </Panel>
    </div>
  );
}

function BudgetField({
  label,
  note,
  value,
  onCommit,
}: {
  label: string;
  note: string;
  value: number | undefined;
  onCommit: (v: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === undefined ? "" : String(value));
  const n = Number(shown);
  const valid = shown !== "" && Number.isInteger(n) && n >= 10 && n <= 600;

  function commit() {
    // An invalid draft stays on screen with its error until fixed, never silently reverted.
    if (draft === null || !valid) return;
    if (n !== value) onCommit(n);
    setDraft(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-small font-medium">{label}</span>
        <span className="text-caption text-mute">{note}</span>
      </label>
      <div className="flex items-center gap-2 rounded-sm border border-hairline px-3 focus-within:border-fg">
        <input
          id={id}
          inputMode="numeric"
          type="number"
          min={10}
          max={600}
          step={5}
          disabled={value === undefined}
          value={shown}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          aria-invalid={!valid}
          className="min-h-touch w-full min-w-0 bg-transparent font-mono text-body outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="font-mono text-caption text-mute">s</span>
      </div>
      {!valid && draft !== null && <p className="text-caption text-bad">Use a whole number from 10 to 600.</p>}
    </div>
  );
}
