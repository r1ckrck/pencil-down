"use client";

import { Camera, Minus, Plus } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Eyebrow } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { RequestError, getJSON, postForm, postJSON } from "./api";
import { PromptView } from "./prompt-view";
import { SLOT_NAME, mmss, type BResult } from "./types";

type Results = { partB: BResult[] | null };

/** 0–5 self-rating: six 44px squares in a row (fits 360px). Trend only, never a score. */
export function RatingRow({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string;
  value: number | null;
  onChange?: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-hairline py-3 last:border-b-0">
      <p className="text-body text-fg">{name}</p>
      <div role="radiogroup" aria-label={name} className="grid grid-cols-6 gap-2">
        {[0, 1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            disabled={disabled}
            onClick={() => onChange?.(v)}
            className={cn(
              "flex min-h-touch items-center justify-center rounded-sm border font-mono text-small",
              "transition-colors duration-(--dur-fast) ease-measured disabled:cursor-default",
              value === v ? "border-fg bg-fg text-on-fg" : "border-hairline text-mute hover:border-fg hover:text-fg",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

/** "How many ideas did you sketch?" A stepper; each tap saves the new count (rapid taps stay in order). */
function IdeaCount({ initial, onSave }: { initial: number; onSave: (n: number) => void }) {
  const [value, setValue] = useState(initial);
  const step = (d: number) => {
    const next = Math.min(99, Math.max(0, value + d));
    if (next === value) return;
    setValue(next);
    onSave(next);
  };
  return (
    <div className="flex items-center gap-3" role="group" aria-label="Ideas sketched">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={value === 0}
        aria-label="One fewer"
        className="flex size-touch items-center justify-center rounded-sm border border-hairline text-fg hover:border-fg disabled:opacity-40"
      >
        <Minus size={20} weight="bold" aria-hidden />
      </button>
      <output className="min-w-12 text-center font-mono text-timer tabular" data-testid="idea-count">
        {value}
      </output>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="One more"
        className="flex size-touch items-center justify-center rounded-sm border border-hairline text-fg hover:border-fg"
      >
        <Plus size={20} weight="bold" aria-hidden />
      </button>
    </div>
  );
}

function PhotoInput({ onFile, busy }: { onFile: (f: File) => void; busy: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        className="sr-only"
        data-testid="photo-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="inline-flex min-h-touch items-center gap-2 self-start rounded-sm border border-hairline px-4 text-small font-medium text-fg hover:border-fg hover:bg-tint disabled:opacity-40"
      >
        <Camera size={20} weight="duotone" aria-hidden />
        {busy ? "Uploading…" : "Photo of the page"}
      </button>
    </>
  );
}

/** Debrief for one question: the prompt again, the idea count, 0–5 per criterion, an optional photo. */
function SlotDebrief({
  sessionId,
  result,
  index,
  onResults,
}: {
  sessionId: number;
  result: BResult;
  index?: string;
  onResults: (r: BResult[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const rating = (c: number) => result.ratings.find((r) => r.criterion === c)?.value ?? null;

  const run = async (p: Promise<{ partB: BResult[] }>) => {
    setError(null);
    try {
      onResults((await p).partB);
    } catch (e) {
      setError(e instanceof RequestError ? e.message : "Could not save. Check the connection.");
    }
  };

  return (
    <section className="flex flex-col gap-8" data-testid={`debrief-${result.pos}`}>
      <div className="flex flex-col gap-1">
        <Eyebrow index={index}>{SLOT_NAME[result.slot]}</Eyebrow>
        <p className="text-small text-mute">
          {result.status === "abandoned"
            ? "Not committed"
            : `${result.autoCommitted ? "Auto-committed" : "Committed"} at ${mmss(result.secondsToCommit)}`}
          {result.rereads > 0 ? ` · ${result.rereads} reread${result.rereads === 1 ? "" : "s"}` : ""}
        </p>
      </div>

      {result.prompt && <PromptView prompt={result.prompt} showSlot={false} compact />}

      <div className="flex flex-col gap-2">
        <Eyebrow>How many ideas did you sketch?</Eyebrow>
        <IdeaCount
          initial={result.ideaCount}
          onSave={(count) => {
            chain.current = chain.current.then(() => run(postJSON(`/api/sessions/${sessionId}/b/ideas`, { pos: result.pos, count })));
          }}
        />
      </div>

      {result.prompt && (
        <div className="flex flex-col gap-1">
          <Eyebrow>Rate yourself · 0–5 · for the trend only</Eyebrow>
          <div>
            {result.prompt.criteria.map((c, ci) => (
              <RatingRow
                key={ci}
                name={c.name}
                value={rating(ci)}
                onChange={(value) => run(postJSON(`/api/sessions/${sessionId}/b/rate`, { pos: result.pos, criterion: ci, value }))}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Eyebrow>Photo · optional · never scored</Eyebrow>
        {result.photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {result.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element -- user photo served by the API
              <img key={p.id} src={p.url} alt="Your page" className="aspect-square w-full rounded-sm border border-hairline object-cover" />
            ))}
          </div>
        )}
        <PhotoInput
          busy={uploading}
          onFile={async (file) => {
            setUploading(true);
            const form = new FormData();
            form.set("pos", String(result.pos));
            form.set("file", file);
            await run(postForm(`/api/sessions/${sessionId}/b/photo`, form));
            setUploading(false);
          }}
        />
      </div>
      {error && <p className="text-small text-bad">{error}</p>}
    </section>
  );
}

/** All slots of a closed session, in order. Loads results once; every write returns fresh results. */
export function Debrief({ sessionId, initial }: { sessionId: number; initial?: BResult[] | null }) {
  const [results, setResults] = useState<BResult[] | null>(initial ?? null);
  useEffect(() => {
    if (initial) return;
    let alive = true;
    getJSON<Results>(`/api/sessions/${sessionId}/results`)
      .then((r) => alive && setResults(r.partB ?? []))
      .catch(() => alive && setResults([]));
    return () => {
      alive = false;
    };
  }, [initial, sessionId]);

  if (!results) return <p className="text-small text-mute">Loading the debrief…</p>;
  const many = results.length > 1;
  return (
    <div className="flex flex-col gap-12">
      {results.map((r) => (
        <div key={r.id} className={cn(many && "border-t border-hairline pt-8 first:border-t-0 first:pt-0")}>
          <SlotDebrief sessionId={sessionId} result={r} index={many ? `Q${r.pos + 1}` : undefined} onResults={setResults} />
        </div>
      ))}
    </div>
  );
}
