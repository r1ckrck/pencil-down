import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { Markdown } from "@/lib/markdown";
import { cn } from "@/lib/cn";
import { OptionTile } from "./answer-control";
import { FORMAT_LABEL, TOPIC_LABEL, answerText, keyText, marks } from "./labels";
import { QuestionView } from "./question-view";
import type { AnswerInput, Confidence, Format, Key, Option, QuestionPayload, Topic } from "./types";

export type ReviewQuestion = {
  pos: number;
  id: string;
  source: "real" | "generated";
  format: Format;
  topic: Topic;
  answer: AnswerInput | null;
  confidence: Confidence;
  key: Key | null;
  answerStatus: "official" | "solved" | "constructed" | null;
  explanation: string | null;
  outcome: "correct" | "partial" | "wrong" | "blank" | "dropped";
  marks: number;
  maxMarks: number;
  timeMs: number;
  budgetMs: number;
  visits: number;
  forcedSkip: boolean;
  question: QuestionPayload | null;
};

const OUTCOME: Record<ReviewQuestion["outcome"], { label: string; tone: string }> = {
  correct: { label: "correct", tone: "text-good" },
  partial: { label: "partial", tone: "text-mid" },
  wrong: { label: "wrong", tone: "text-bad" },
  blank: { label: "skipped", tone: "text-mute" },
  dropped: { label: "dropped", tone: "text-mute" },
};

function keyOptions(k: Key | null): Option[] {
  if (!k) return [];
  if (k.kind === "MCQ") return [k.option];
  if (k.kind === "MSQ") return k.options;
  return [];
}

const secs = (ms: number) => Math.round(ms / 1000);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-baseline gap-3 border-b border-hairline py-2 last:border-b-0">
      <dt className="font-mono text-label uppercase text-mute">{label}</dt>
      <dd className="min-w-0 text-small text-fg">{children}</dd>
    </div>
  );
}

function ReviewItem({ q, animated }: { q: ReviewQuestion; animated: boolean }) {
  const o = OUTCOME[q.outcome];
  const picked = q.answer?.kind === "MCQ" ? [q.answer.option] : q.answer?.kind === "MSQ" ? q.answer.options : [];
  const keyed = keyOptions(q.key);
  const over = q.timeMs > q.budgetMs;
  return (
    <li className="border-b border-hairline">
      <details className="group">
        <summary className="flex min-h-touch cursor-pointer list-none items-center gap-3 py-3 text-small [&::-webkit-details-marker]:hidden">
          <span className="w-7 shrink-0 font-mono text-fg">{String(q.pos + 1).padStart(2, "0")}</span>
          <span className="w-10 shrink-0 font-mono text-caption text-mute">{q.format}</span>
          <span className="hidden min-w-0 flex-1 truncate text-mute sm:block">{TOPIC_LABEL[q.topic]}</span>
          <span className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <span className={cn("font-mono text-label uppercase", o.tone)}>{o.label}</span>
            {q.forcedSkip && <span className="font-mono text-label uppercase text-mute">· forced</span>}
            {q.confidence === "unsure" && q.outcome !== "blank" && (
              <span className="font-mono text-label uppercase text-mute">· unsure</span>
            )}
          </span>
          <span className={cn("w-14 shrink-0 text-right font-mono tabular", over ? "text-bad" : "text-mute")}>
            {secs(q.timeMs)}s
          </span>
          <span className="w-12 shrink-0 text-right font-mono tabular text-fg">{marks(q.marks, true)}</span>
          <CaretDown
            size={16}
            weight="bold"
            aria-hidden
            className="shrink-0 text-mute transition-transform duration-(--dur-fast) group-open:rotate-180"
          />
        </summary>
        <div className="grid gap-6 pt-2 pb-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-4">
            {q.question ? (
              <>
                <QuestionView question={q.question} animated={animated} compact />
                {q.question.source === "generated" && q.question.options && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {q.question.options.map((opt) => {
                      const sel = picked.includes(opt.label);
                      const inKey = keyed.includes(opt.label);
                      return (
                        <OptionTile
                          key={opt.label}
                          letter={opt.label}
                          svg={opt.svg}
                          mode={q.format === "MSQ" ? "checkbox" : "radio"}
                          selected={sel}
                          review={sel ? (inKey ? "correct" : "wrong") : inKey ? "key" : undefined}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <p className="text-small text-mute">Question unavailable.</p>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <dl>
              <Row label="Yours">
                <span className="font-mono">{answerText(q.answer, q.question)}</span>
                {q.answer && <span className="text-mute"> · {q.confidence}</span>}
              </Row>
              <Row label="Key">
                <span className={cn(q.key?.kind === "DROPPED" ? "text-mute" : "font-mono")}>{keyText(q.key, q.question)}</span>
                {q.answerStatus === "solved" && (
                  <span className="block text-caption italic text-mute">answer worked out by us, not official</span>
                )}
              </Row>
              <Row label="Marks">
                <span className="font-mono">
                  {marks(q.marks, true)} of {marks(q.maxMarks)}
                </span>
              </Row>
              <Row label="Time">
                <span className={cn("font-mono", over && "text-bad")}>
                  {secs(q.timeMs)}s
                </span>
                <span className="text-mute">
                  {" "}
                  of {secs(q.budgetMs)}s · {q.visits} {q.visits === 1 ? "visit" : "visits"}
                  {q.forcedSkip && " · forced skip"}
                </span>
              </Row>
              <Row label="Format">{FORMAT_LABEL[q.format]}</Row>
            </dl>
            <div className="flex flex-col gap-2 border-t border-hairline pt-4">
              <p className="font-mono text-label uppercase text-mute">Explanation</p>
              {q.explanation ? (
                <Markdown source={q.explanation} className="text-small text-fg" />
              ) : (
                <p className="text-small text-mute">No worked solution for this one yet.</p>
              )}
            </div>
          </div>
        </div>
      </details>
    </li>
  );
}

/** Every question of the session, collapsed to one scannable row each; open a row for the question, key and why. */
export function ReviewList({ questions, animatedIds }: { questions: ReviewQuestion[]; animatedIds: string[] }) {
  return (
    <ol className="border-t border-hairline">
      {questions.map((q) => (
        <ReviewItem key={q.pos} q={q} animated={animatedIds.includes(q.id)} />
      ))}
    </ol>
  );
}
