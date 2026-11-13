// Resolves served item ids to display payloads and answer keys. Generated ids read their stored snapshot.
import type { Content } from "../content/load";
import type { Answer, Format, Option, PartBPrompt, Topic } from "../content/types";
import { OPTIONS } from "../content/types";
import { type SnapshotCtx, generatedQuestion } from "./snapshots";

export interface ItemsCtx extends SnapshotCtx {
  content: Content;
}

export type QuestionPayload =
  | {
      id: string;
      source: "real";
      format: Format;
      topic: Topic;
      label: string; // "CEED 2026 · Q14"
      image: string; // URL under /content/part-a/
      imageWidth: number;
      imageHeight: number;
      options: Option[];
      optionLabels: [string, string, string, string] | null; // printed labels for A–D when the paper does not use A–D
    }
  | {
      id: string;
      source: "generated";
      format: Format;
      topic: Topic;
      label: string; // generator id and seed
      stem: string;
      figure: string; // SVG markup
      options: { label: Option; svg: string }[] | null;
    };

export function questionPayload(ctx: ItemsCtx, id: string): QuestionPayload | null {
  const q = ctx.content.questionById.get(id);
  if (q)
    return {
      id: q.id,
      source: "real",
      format: q.format,
      topic: q.topic,
      label: `${q.exam} ${q.year} · Q${q.qno}`,
      image: `/content/part-a/${q.image}`,
      imageWidth: q.imageWidth,
      imageHeight: q.imageHeight,
      options: OPTIONS,
      optionLabels: q.optionLabels ?? null,
    };
  const g = generatedQuestion(ctx, id);
  if (!g) return null;
  return {
    id: g.id,
    source: "generated",
    format: g.format,
    topic: g.topic,
    label: `${g.generator} · seed ${g.seed}`,
    stem: g.stem,
    figure: g.figure,
    options: g.options,
  };
}

export function questionKey(
  ctx: ItemsCtx,
  id: string,
): { answer: Answer; explanation: string | null; answerStatus: string } | null {
  const q = ctx.content.questionById.get(id);
  if (q) return { answer: q.answer, explanation: q.explanation, answerStatus: q.answerStatus };
  const g = generatedQuestion(ctx, id);
  return g ? { answer: g.answer, explanation: g.explanation, answerStatus: "constructed" } : null;
}

export function promptPayload(p: PartBPrompt) {
  return {
    id: p.id,
    source: p.source,
    slot: p.slot,
    title: p.title,
    text: p.text,
    rules: p.rules,
    criteria: p.criteria,
    images: p.images.map((i) => ({ url: `/content/part-b/${i.path}`, alt: i.alt })),
    year: p.origin?.year ?? null,
  };
}
