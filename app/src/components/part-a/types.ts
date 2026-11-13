// Client-side view of the Part A API shapes (docs/api.md). Mirrors engine/view.ts; never holds keys.
import type { Format, Option, Topic } from "@/content/types";
import type { Kind } from "@/engine/kinds";
import type { Mode, Switches } from "@/engine/modes";

export type { Format, Kind, Mode, Option, Switches, Topic };

export type AnswerInput =
  | { kind: "MCQ"; option: Option }
  | { kind: "MSQ"; options: Option[] }
  | { kind: "NAT"; value: number };

export type Confidence = "sure" | "unsure";

export type QuestionPayload =
  | {
      id: string;
      source: "real";
      format: Format;
      topic: Topic;
      label: string;
      image: string;
      imageWidth: number;
      imageHeight: number;
      options: Option[];
    }
  | {
      id: string;
      source: "generated";
      format: Format;
      topic: Topic;
      label: string;
      stem: string;
      figure: string;
      options: { label: Option; svg: string }[] | null;
    };

export type CurrentQuestion = {
  pos: number;
  visitStartedAt: number;
  budgetMs: number;
  budgetEndsAt: number;
  overBudget: boolean;
  elapsedMs: number;
  question: QuestionPayload | null;
  answer: AnswerInput | null;
  confidence: Confidence;
  marked: boolean;
};

export type PaletteEntry = {
  pos: number;
  format: Format;
  state: "unseen" | "answered" | "skipped";
  marked: boolean;
  inQueue: boolean;
  forcedSkip: boolean;
};

export type SessionInfo = {
  id: number;
  kind: Kind;
  mode: Mode;
  status: "live" | "completed" | "quit" | "expired";
  startedAt: number;
  endsAt: number;
  endedAt: number | null;
  switches: Switches;
  retake: boolean;
  paperId: string | null;
  bPaperId: string | null;
};

export type PartAState = {
  endsAt: number | null;
  closedAt: number | null;
  status: "completed" | "quit" | "expired" | null;
  phase: "first-pass" | "revisit" | null;
  current: CurrentQuestion | null;
  palette: PaletteEntry[];
  queue: number[];
};

export type SessionState = {
  serverNow: number;
  session: SessionInfo;
  section: "A" | "B" | "closed";
  nextEventAt: number | null;
  partA: PartAState | null;
  // Part B is owned by the Part B screens; the runner only passes it through.
  partB: unknown;
};

export type SimpleAnswer =
  | { kind: "MCQ"; option: Option }
  | { kind: "MSQ"; options: Option[] }
  | { kind: "NAT"; min: number; max: number };

export type Key = SimpleAnswer | { kind: "ANY"; of: SimpleAnswer[] } | { kind: "DROPPED"; marks: number };
