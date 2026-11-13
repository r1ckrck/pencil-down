"use client";

import { Camera, Star } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Eyebrow, RoleLabel } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { RequestError, getJSON, postForm, postJSON } from "./api";
import { PromptView } from "./prompt-view";
import { SLOT_NAME, type BResult } from "./types";

type Results = { partB: BResult[] | null };
const two = (n: number) => String(n).padStart(2, "0");

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

/** One word per idea. Saves on blur or Enter; the server keeps the first word, lower-cased. */
function TagInput({ initial, onSave }: { initial: string | null; onSave: (tag: string | null) => void }) {
  const [v, setV] = useState(initial ?? "");
  const saved = useRef(initial ?? "");
  const commit = () => {
    const word = v.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    setV(word);
    if (word === saved.current) return;
    saved.current = word;
    onSave(word || null);
  };
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value.replace(/\s/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      maxLength={40}
      autoCapitalize="none"
      autoComplete="off"
      enterKeyHint="next"
      placeholder="one word"
      aria-label="Tag"
      className="min-h-touch w-full min-w-0 rounded-sm border border-hairline bg-transparent px-3 text-body text-fg placeholder:text-mute focus:border-fg focus:outline-none"
    />
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

/** Debrief for one slot: the prompt again, a word per idea, 0–5 per criterion, an optional photo. */
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
            ? "Abandoned before commit"
            : `${result.autoCommitted ? "Auto-committed" : "Committed"} at ${Math.floor((result.secondsToCommit ?? 0) / 60)}:${two((result.secondsToCommit ?? 0) % 60)}${result.label ? ` · ${result.label}` : ""}`}
        </p>
      </div>

      {result.prompt && <PromptView prompt={result.prompt} showSlot={false} compact />}

      {result.ideas.length > 0 && (
        <div className="flex flex-col gap-2">
          <Eyebrow>One word per idea</Eyebrow>
          <ol className="flex flex-col gap-2">
            {result.ideas.map((i) => (
              <li key={i.id} className="grid grid-cols-[44px_1fr] items-center gap-3">
                <span className="relative font-mono text-small text-mute">
                  {two(i.n)}
                  {i.id === result.committedIdeaId && (
                    <Star aria-label="committed" size={12} weight="fill" className="absolute -top-1 left-6 text-fg" />
                  )}
                </span>
                <TagInput
                  initial={i.tag}
                  onSave={(tag) => run(postJSON(`/api/sessions/${sessionId}/b/tag`, { ideaId: i.id, tag }))}
                />
              </li>
            ))}
          </ol>
          <RoleLabel>
            {result.distinctTags} distinct of {result.ideaCount}
          </RoleLabel>
        </div>
      )}

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
