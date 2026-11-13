"use client";

import { ArrowRight, Flag, SignOut, Timer } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { Monogram } from "@/components/shell/monogram";
import { ThemeControl } from "@/components/shell/theme-control";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/check-row";
import { CountdownText, useServerNow } from "@/components/ui/countdown";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { DimensionBar } from "@/components/ui/dimension-bar";
import { Figure } from "@/components/ui/figure";
import { Eyebrow, Label, RoleLabel } from "@/components/ui/label";
import { NumericKeypad } from "@/components/ui/numeric-keypad";
import { OptionButton, OptionGroup, type OptionLetter } from "@/components/ui/option-button";
import { Panel, Rule } from "@/components/ui/panel";
import { PaletteLegend, QuestionPalette, type PaletteItem } from "@/components/ui/question-palette";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Metric, Stat } from "@/components/ui/stat";
import { Switch, Toggle } from "@/components/ui/switch";
import { TapCounter } from "@/components/ui/tap-counter";

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
  <g class="soft"><rect x="120" y="20" width="60" height="60" fill="currentColor" stroke="none"/></g>
  <rect x="120" y="20" width="60" height="60"/>
  <rect x="60" y="80" width="60" height="60"/>
  <rect x="120" y="80" width="60" height="60"/>
  <rect x="180" y="80" width="60" height="60"/>
  <rect x="240" y="80" width="60" height="60"/>
  <rect x="120" y="140" width="60" height="60"/>
  <g class="mute" stroke-dasharray="4 4"><path d="M120 80h60M120 140h60M120 80v60M180 80v60M240 80v60"/></g>
  <circle cx="150" cy="50" r="10" fill="currentColor" stroke="none"/>
  <path d="M260 100l20 20M280 100l-20 20"/>
  <g class="mute" font-family="ui-monospace, monospace" font-size="11" fill="currentColor" stroke="none"><text x="60" y="224">net · 6 faces · fold on dashed</text></g>
</svg>`;

const SERVER_NOW = 1_800_000_000_000;

const LETTERS: OptionLetter[] = ["A", "B", "C", "D"];
const OPTION_TEXT = ["Rotate 90° clockwise", "Mirror on the vertical axis", "Rotate 180°", "No transformation"];

function paletteItems(): PaletteItem[] {
  return Array.from({ length: 44 }, (_, i) => {
    const n = i + 1;
    const state: PaletteItem["state"] =
      n <= 14 ? (n % 5 === 0 ? "skipped" : n % 7 === 0 ? "marked" : "answered") : n === 15 ? "unseen" : n < 19 ? "skipped" : "unseen";
    return { n, state };
  });
}

function Section({ index, title, note, children }: { index: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-hairline py-8 md:grid-cols-[220px_1fr] md:gap-8">
      <div className="flex flex-col gap-2">
        <Eyebrow index={index}>{title}</Eyebrow>
        {note && <RoleLabel>{note}</RoleLabel>}
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`block size-8 shrink-0 rounded-xs border border-hairline ${className}`} />
      <span className="font-mono text-caption text-mute">{name}</span>
    </div>
  );
}

function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="font-mono text-label uppercase text-mute">{label}</span>
      {children}
    </div>
  );
}

export function Gallery() {
  // A fixed stand-in for the server's clock. useServerNow only measures time passing from it,
  // so any constant works — and render never reads Date.now() (blocked during prerender).
  const anchor = SERVER_NOW;
  const now = useServerNow(anchor, 200);
  const liveElapsed = (now - anchor) % 75_000;

  const [mode, setMode] = useState<"easy" | "hard" | "custom">("hard");
  const [sw, setSw] = useState(true);
  const [sw2, setSw2] = useState(false);
  const [marked, setMarked] = useState(false);
  const [sure, setSure] = useState(true);
  const [mcq, setMcq] = useState<OptionLetter | null>("B");
  const [msq, setMsq] = useState<OptionLetter[]>(["A", "C"]);
  const [nat, setNat] = useState("12.5");
  const [ideas, setIdeas] = useState(7);
  const [checks, setChecks] = useState<Array<boolean | null>>([true, false, null]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [current, setCurrent] = useState(14);
  const [items, setItems] = useState(paletteItems);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-col gap-4 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <Eyebrow>dev / gallery</Eyebrow>
          <h1 className="text-title font-semibold">Component gallery</h1>
          <p className="max-w-xl text-small text-mute">
            Every UI primitive in every state. The accent appears many times here only because this is a
            catalogue — on a real screen it marks one thing.
          </p>
        </div>
        <ThemeControl />
      </header>

      <Section index="00" title="Colour" note="tokens.css">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Swatch name="--bg" className="bg-bg" />
          <Swatch name="--fg" className="bg-fg" />
          <Swatch name="--mute" className="bg-mute" />
          <Swatch name="--hairline" className="bg-hairline" />
          <Swatch name="--accent" className="bg-accent" />
          <Swatch name="--data-good" className="bg-good" />
          <Swatch name="--data-mid" className="bg-mid" />
          <Swatch name="--data-bad" className="bg-bad" />
          <Swatch name="--tint" className="bg-tint" />
          <Swatch name="--code-bg" className="bg-code" />
        </div>
      </Section>

      <Section index="01" title="Type" note="font, weight, colour, then size">
        <div className="flex flex-col gap-4">
          <p className="font-display text-display-sm">65 days</p>
          <p className="text-title font-semibold">Title · General Sans 600</p>
          <p className="text-heading font-medium">Heading · General Sans 500</p>
          <p className="text-lead">Lead · the question stem reads at this size.</p>
          <p className="max-w-prose text-body">
            Body · Part A is a gate, Part B is the rank. Answer fast, skip without guilt, clear the cutoff.
          </p>
          <p className="text-small text-mute">Small · supporting copy, controls.</p>
          <p className="text-caption text-mute">Caption · annotations and helper text.</p>
          <Eyebrow index="02">Label · mono caps tracked</Eyebrow>
          <p className="font-mono text-body">Mono · Q07 · 01:00 · seed 4f2a</p>
          <p className="font-mono text-timer font-medium">42:18</p>
        </div>
      </Section>

      <Section index="02" title="Button" note="primary once per region">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon={<ArrowRight weight="duotone" />}>
            Start mock
          </Button>
          <Button>Skip</Button>
          <Button variant="danger" icon={<SignOut weight="duotone" />}>
            Quit
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg">
            Begin 24 min
          </Button>
          <Button size="lg" hint="S">
            Skip
          </Button>
          <Button size="lg" block className="sm:w-auto">
            Block on phone
          </Button>
        </div>
      </Section>

      <Section index="03" title="Toggle · Switch">
        <div className="flex flex-wrap gap-3">
          <Toggle pressed={marked} onPressedChange={setMarked} icon={<Flag weight="duotone" />}>
            {marked ? "Marked" : "Mark for review"}
          </Toggle>
          <Toggle pressed={!sure} onPressedChange={(p) => setSure(!p)}>
            {sure ? "Sure" : "Unsure"}
          </Toggle>
          <Toggle pressed={false} onPressedChange={() => {}} disabled>
            Disabled
          </Toggle>
        </div>
        <div className="max-w-md">
          <Switch checked={sw} onCheckedChange={setSw} label="Question timer" description="Visible countdown per question" />
          <Rule />
          <Switch checked={sw2} onCheckedChange={setSw2} label="Forced skip" description="Move on at zero" />
          <Rule />
          <Switch checked={false} onCheckedChange={() => {}} label="Disabled" disabled />
        </div>
      </Section>

      <Section index="04" title="Segmented control" note="arrow keys move">
        <SegmentedControl
          aria-label="Difficulty"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: "easy", label: "Easy", hint: "timer shown" },
            { value: "hard", label: "Hard", hint: "timer hidden" },
            { value: "custom", label: "Custom", hint: "settings" },
          ]}
        />
        <SegmentedControl
          aria-label="Format"
          block
          value="mcq"
          onValueChange={() => {}}
          options={[
            { value: "mcq", label: "MCQ" },
            { value: "msq", label: "MSQ" },
            { value: "nat", label: "NAT" },
            { value: "any", label: "Any", disabled: true },
          ]}
        />
      </Section>

      <Section index="05" title="Dialog · Confirm">
        <div className="flex flex-wrap gap-3">
          <Dialog
            trigger={<Button>Open dialog</Button>}
            title="Per-question budgets"
            description="Applies from the next session."
            footer={<Button variant="primary">Save</Button>}
          >
            <p className="text-small">MCQ 60 s · MSQ 90 s · NAT 120 s</p>
          </Dialog>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Quit session
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Quit this mock?"
            description="There is no resume. The session ends now."
            confirmLabel="Quit"
            cancelLabel="Keep going"
            onConfirm={() => setConfirmOpen(false)}
          >
            <p className="font-mono text-caption text-mute">29 unanswered → recorded as skipped</p>
          </ConfirmDialog>
        </div>
      </Section>

      <Section index="06" title="Panel · Label">
        <div className="grid gap-4 md:grid-cols-2">
          <Panel index="01" label="Last 7 days" aside="mon–sun">
            <p className="text-small text-mute">Hairline frame, radius-lg, no shadow.</p>
          </Panel>
          <Panel tone="tint" label="Suggested next">
            <p className="text-body">Drill · Visual analogies · 10 questions</p>
          </Panel>
        </div>
        <div className="flex flex-col gap-3">
          <Eyebrow>Eyebrow</Eyebrow>
          <Eyebrow index="03">Eyebrow with index</Eyebrow>
          <Label htmlFor="x">Form label</Label>
          <RoleLabel>role label · italic commentary</RoleLabel>
        </div>
      </Section>

      <Section index="07" title="Stat · Metric" note="Stat: one per screen">
        <Stat label="Days to CEED" value="65" unit="days" note="Sun 17 Jan 2027" />
        <Stat label="Score" value="58.67" unit="/ 150" size="lg" accent note="cutoff band 48–54 · target 60" />
        <div className="flex flex-wrap gap-8">
          <Metric label="sessions" value="5" />
          <Metric label="last mock" value="52.3" unit="/150" />
          <Metric label="correct" value="31" tone="good" />
          <Metric label="wrong" value="7" tone="bad" />
          <Metric label="median commit" value="94" unit="s" />
        </div>
      </Section>

      <Section index="08" title="Dimension bar" note="span = budget · fill = elapsed">
        <State label="live · accent">
          <DimensionBar budgetMs={60_000} elapsedMs={liveElapsed} live />
        </State>
        <div className="grid gap-6 md:grid-cols-2">
          <State label="start">
            <DimensionBar budgetMs={60_000} elapsedMs={0} />
          </State>
          <State label="40%">
            <DimensionBar budgetMs={90_000} elapsedMs={36_000} />
          </State>
          <State label="overrun">
            <DimensionBar budgetMs={60_000} elapsedMs={72_000} />
          </State>
          <State label="concealed · hard">
            <DimensionBar budgetMs={120_000} elapsedMs={50_000} concealed />
          </State>
        </div>
      </Section>

      <Section index="09" title="Countdown" note="server-anchored deadline">
        <div className="flex flex-wrap items-end gap-8">
          <State label="section · accent">
            <CountdownText deadline={anchor + 42 * 60_000 + 18_000} serverNow={anchor} accent label="Section time" />
          </State>
          <State label="warn < 1 min">
            <CountdownText deadline={anchor + 45_000} serverNow={anchor} warnBelowMs={60_000} />
          </State>
          <State label="expired">
            <CountdownText deadline={anchor - 1} serverNow={anchor} size="heading" />
          </State>
          <State label="hours">
            <CountdownText deadline={anchor + 2 * 3600_000} serverNow={anchor} size="body" />
          </State>
        </div>
      </Section>

      <Section index="10" title="Question palette" note="tap a cell to move current">
        <div className="max-w-sm">
          <QuestionPalette
            items={items}
            current={current}
            onSelect={(i) => {
              setCurrent(i);
              setItems((prev) => prev.map((it, j) => (j === i && it.state === "unseen" ? { ...it, state: "skipped" } : it)));
            }}
          />
        </div>
        <PaletteLegend />
      </Section>

      <Section index="11" title="Option button" note="MCQ radio · MSQ checkbox">
        <div className="grid gap-8 lg:grid-cols-2">
          <State label="mcq · radio">
            <OptionGroup mode="radio" label="Question 7 options">
              {LETTERS.map((l, i) => (
                <OptionButton key={l} letter={l} mode="radio" selected={mcq === l} onSelect={() => setMcq(l)}>
                  {OPTION_TEXT[i]}
                </OptionButton>
              ))}
            </OptionGroup>
          </State>
          <State label="msq · checkbox">
            <OptionGroup mode="checkbox" label="Question 12 options">
              {LETTERS.map((l, i) => (
                <OptionButton
                  key={l}
                  letter={l}
                  mode="checkbox"
                  selected={msq.includes(l)}
                  onSelect={() => setMsq((s) => (s.includes(l) ? s.filter((x) => x !== l) : [...s, l]))}
                >
                  {OPTION_TEXT[i]}
                </OptionButton>
              ))}
            </OptionGroup>
          </State>
          <State label="review">
            <OptionGroup mode="radio" label="Review">
              <OptionButton letter="A" mode="radio" selected review="wrong" disabled>
                Rotate 90° clockwise
              </OptionButton>
              <OptionButton letter="B" mode="radio" selected={false} review="key" disabled>
                Mirror on the vertical axis
              </OptionButton>
              <OptionButton letter="C" mode="radio" selected={false} disabled>
                Rotate 180°
              </OptionButton>
            </OptionGroup>
          </State>
          <State label="review · correct">
            <OptionGroup mode="checkbox" label="Review MSQ">
              <OptionButton letter="A" mode="checkbox" selected review="correct" disabled>
                Gestalt: closure
              </OptionButton>
              <OptionButton letter="B" mode="checkbox" selected={false} disabled>
                Gestalt: symmetry
              </OptionButton>
            </OptionGroup>
          </State>
        </div>
      </Section>

      <Section index="12" title="Numeric keypad" note="NAT · keyboard captured here">
        <NumericKeypad value={nat} onValueChange={setNat} unit="cm" captureKeyboard />
      </Section>

      <Section index="13" title="Tap counter" note="Part B generate">
        <div className="max-w-sm">
          <TapCounter count={ideas} onIncrement={() => setIdeas((n) => n + 1)} onUndo={() => setIdeas((n) => Math.max(0, n - 1))} />
        </div>
      </Section>

      <Section index="14" title="Check row" note="commit screen">
        <div className="max-w-xl">
          {["Obeys every rule", "Not my first obvious idea", "Drawable in the time left"].map((label, i) => (
            <CheckRow
              key={label}
              index={String(i + 1).padStart(2, "0")}
              label={label}
              value={checks[i]}
              onValueChange={(v) => setChecks((c) => c.map((x, j) => (j === i ? v : x)))}
            />
          ))}
        </div>
      </Section>

      <Section index="15" title="Figure" note="generator SVG · currentColor, .mute, .soft">
        <div className="grid gap-6 md:grid-cols-2">
          <Figure svg={SAMPLE_SVG} label="Cube net with one shaded face" caption="fig. 07 · seed 4f2a" />
          <Figure svg={SAMPLE_SVG} label="Cube net, framed" framed maxWidth={320} />
        </div>
      </Section>

      <Section index="16" title="Icons · sign-off" note="Phosphor duotone · R/1 monogram">
        <div className="flex flex-wrap items-center gap-6 text-fg">
          <Timer size={28} weight="duotone" />
          <Flag size={28} weight="duotone" />
          <SignOut size={28} weight="duotone" />
          <ArrowRight size={28} weight="duotone" />
          <span className="text-mute">
            <Timer size={28} weight="duotone" />
          </span>
        </div>
        <div className="flex items-end gap-8">
          <Monogram size={96} />
          <Monogram size={40} />
          <Monogram size={24} construction={false} />
        </div>
      </Section>
    </div>
  );
}
