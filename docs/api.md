# Pencil Down — API

JSON over HTTP, same origin, no auth (Authelia sits in front). Every route runs at request time. Times are **epoch milliseconds from the server clock**; Part B question-clock values are **ms** (`usedMs`, `steps`) or **seconds** where named (`script`, `targets`). Render countdowns from `serverNow` + the deadlines given, correcting for local clock skew (`skew = serverNow − Date.now()` at receipt).

Errors: `{ "error": string, ...extra }` with status 400 (bad input), 404, 409 (rule: not live, not on screen, already committed, outside window, live session exists → `sessionId`), 413/415 (photo), 422 (no content for that session), 500.

Engine code: `app/src/engine/` · routes: `app/src/app/api/` · schema: `app/src/db/schema.ts`.

---

## Model in one screen

- **One live session at most.** Every read or write first *settles* the session: it replays what the clock implies since the last request (forced skips, section expiry, Part B forced advance). Reload, close or walk-away is therefore safe: the state is a function of stored timestamps. No route pauses anything.
- **Kinds**: `mock` · `drill` · `revisit` · `past-paper` (Part A) · `b-drill` · `b-mock` · `b-past-paper` (Part B) · `full` (Part A mock 60 min → lock → Part B mock 120 min, one session; Part B starts the instant Part A closes, by expiry or `finish`).
- **Modes** `easy | hard | custom` resolve to five switches stored on the session: `questionTimer` (show the per-question countdown), `forcedSkip`, `phaseTimer` (show the Part B step clock and bar times), `questionHiding`, `forcedAdvance`. The UI honours `questionTimer`/`phaseTimer`; the server enforces `forcedSkip`, `questionHiding` and `forcedAdvance`.
- **Status**: `live` → `completed` (finish, or Part B clock ran out) · `quit` · `expired` (Part A overall time ran out).
- **Part A navigation**: first pass in served order; after the last question the revisit queue (unanswered, marked or force-skipped questions) cycles. Every visit gets a fresh budget. With `forcedSkip`, a visit closes at exactly `started + budget` (answer kept as-is, question queued) and the next visit starts at that instant.
- **Part B question clock**: each question has a budget (drill 24 min, paper 22 min) and a clock that runs only while it is the open question (`b_visits`); visits add up. Steps `read → ideas → commit → draw` move by action; with `forcedAdvance` the server moves them at the script targets (Read target → ideas, Ideas target → commit, commit target → auto-commit with `autoCommitted: true`, budget → `progress: "out"`, the visit closes and the next open question opens at that instant). `secondsToCommit` = question-clock seconds at the commit. In a paper, no question is open during read-all (6 min, or until `b/open`); at its end Q1 opens. No open question after read-all = the end page.
- **Part B actions name the question on screen** (`pos` must be the open question) and answer 409 otherwise. Debrief writes (ideas, rate, photo) open once the session closes, or once a question is `done` or `out`.

---

## Shared shapes

```ts
type AnswerInput = { kind: "MCQ"; option: "A"|"B"|"C"|"D" }
                 | { kind: "MSQ"; options: Option[] }          // [] = blank
                 | { kind: "NAT"; value: number };
type Key = SimpleAnswer | { kind: "ANY"; of: SimpleAnswer[] } | { kind: "DROPPED"; marks: number }; // types.ts
type Switches = { questionTimer: boolean; forcedSkip: boolean; phaseTimer: boolean; questionHiding: boolean; forcedAdvance: boolean };

type QuestionPayload =                                   // never contains the key
  | { id; source: "real"; format; topic; label: "CEED 2026 · Q14";
      image: "/content/part-a/images/…"; imageWidth; imageHeight; options: ["A","B","C","D"];
      optionLabels: [string, string, string, string] | null /* as printed, in A–D order, e.g. ["1","2","3","4"]; null = A–D */ }
  | { id; source: "generated"; format; topic; label; stem: string; figure: string /* SVG */;
      options: { label: Option; svg: string }[] | null /* NAT */ };

type PromptPayload = { id; source: "real"|"authored"; slot; title; text /* md */; rules: string[];
  criteria: { name; marks }[]; images: { url: "/content/part-b/…"; alt }[]; year: number|null };
```

### SessionState (returned by `GET /api/sessions/:id` and every session action)

```ts
{
  serverNow: number,
  session: { id, kind, mode, status, startedAt, endsAt, endedAt, switches: Switches,
             retake: boolean, paperId: string|null, bPaperId: string|null },
  section: "A" | "B" | "closed",
  nextEventAt: number | null,   // refetch state at this instant (forced skip, read-all end, forced step, prompt hiding, end)
  partA: null | {
    endsAt, closedAt, status /* completed|quit|expired|null */, phase: "first-pass"|"revisit",
    current: null | {            // null when Part A is closed or the revisit queue is empty
      pos, visitStartedAt, budgetMs, budgetEndsAt, overBudget: boolean,
      elapsedMs,                 // total on this question across visits, including this one
      question: QuestionPayload, answer: AnswerInput|null, confidence: "sure"|"unsure", marked: boolean },
    palette: { pos, format, state: "unseen"|"answered"|"skipped", marked, inQueue, forcedSkip }[],
    queue: number[]              // revisit queue positions
  },
  partB: null | {
    startedAt: number|null,      // null in a full exam until Part A closes
    plan: { readAll, budget, total } /* s */ | null,   // null for sessions made before the self-paced flow
    readAll: boolean,            // read-all running: no question open, every prompt visible
    readAllEndsAt: number|null,
    currentPos: number|null,     // the open question; null in read-all and on the end page
    visitStartedAt: number|null, // when the open question was opened (the 15 s view runs from here)
    attempts: { id, pos, slot, status: "pending"|"committed"|"abandoned",
                progress: "unseen"|"open"|"skipped"|"done"|"out", step: "read"|"ideas"|"commit"|"draw",
                current: boolean, usedMs /* question clock at serverNow */, budgetMs,
                script: { step, name, from, to }[] /* s, the bar's windows */, targets: { read, ideas, commit, draw } /* s */,
                steps: Partial<Record<Step, { from, to: number|null }>> /* question-clock ms */,
                rereads, nextRereadS: 60|30|15|null, revealUntil: number|null,
                visible: boolean, prompt: PromptPayload|null /* null while hidden */,
                committedAt, secondsToCommit, autoCommitted, ideaCount }[]
  }
}
```

Hidden prompt → `prompt: null`. With `questionHiding` a prompt is visible in read-all, during its Read step (until `ideas` or the Read target), for 15 s after each open, until `revealUntil` after a reread, and once the session closes (debrief). `nextEventAt` includes each of those ends.

---

## Routes

### Health, Today, Settings

| Method · path | Body / query | Response |
|---|---|---|
| `GET /api/health` | | `{ ok, sqlite, serverNow }` |
| `GET /api/today` | | `{ serverNow, examDate, daysToExam, liveSession: {id, kind, endsAt}\|null, defaultMode, suggested: {partATopic, partBSlot}, last7Days: {sessions, lastPartAScore: {kind, score, maxScore, sessionId}\|null, band, medianSecondsToCommit}, cardsDue, revisitDue, reattemptPromptIds, habits: {days: {date, isToday}[7], rows: {key: partA\|partB\|cards, label, done: boolean[7]}[], doneToday, streak} }` — habit days in IST |
| `GET /api/settings` | | `Settings` = `{ budgets: {MCQ, MSQ, NAT} /* s */, custom: Switches, lastMode, theme: "system"\|"light"\|"dark" }` |
| `PUT /api/settings` | partial `Settings` (budgets 10–600 s) | `Settings` |

### Content

| Method · path | Response |
|---|---|
| `GET /api/content/catalog` | `{ serverNow, defaultMode, papers: {id, exam, year, label, durationMin, totalMarks, questionCount, cutoff, sittings}[] (past-paper eligible, newest first), bPapers: {id, year, label, durationMin, sittings}[], topics: {topic, eligible, unseen, generators: {id, formats}[]}[], slots: {slot, prompts, unseen}[], playbooks: Playbook[], counts: {questions, retired, prompts, cards} }` |
| `GET /api/content/questions/:id` | `QuestionPayload` (id URL-encoded; generated ids `gen:<generator>:<format>:<difficulty>:<seed>`, from their stored snapshot; 404 for a generated id never served) |
| `GET /api/content/prompts/:id` | `PromptPayload`; **409** if the prompt belongs to the live session (no peek route) |

Images are static files: `/content/part-a/…`, `/content/part-b/…`, `/content/cards/…` (synced into `public/` at build).

### Sessions

| Method · path | Body | Response |
|---|---|---|
| `POST /api/sessions` | `{ kind, mode?, paperId?, bPaperId?, topic?, format?, n?, slot?, promptId? }` — `mode` defaults to last used; `drill`: `topic` and/or `format`, `n` 1–44 (default 10); `past-paper`: `paperId`; `b-drill`: `slot` (omit = least practised) or `promptId` (re-attempt that exact prompt; 400 if unknown or not in `slot`); `b-past-paper`: `bPaperId` | `SessionState` · 409 `{sessionId}` if one is live · 422 if no content |
| `GET /api/sessions/live` | | `{ serverNow, live: SessionState\|null }` — use on app open to return to a running session |
| `GET /api/sessions/:id` | | `SessionState` |
| `GET /api/sessions/:id/results` | | `Results` (below) |
| `POST /api/sessions/:id/finish` | | `SessionState` — submit Part A early (full exam: Part B starts now) or end a Part B session |
| `POST /api/sessions/:id/quit` | | `SessionState` — unanswered → skipped, uncommitted slots → abandoned, status `quit` |

**Part A** (all return `SessionState`; 409 when the question is no longer on screen, e.g. a forced skip landed first):

| Method · path | Body |
|---|---|
| `POST /api/sessions/:id/answer` | `{ pos, answer?: AnswerInput\|null, confidence?: "sure"\|"unsure" }` — only the current `pos`; omitted fields unchanged; `null` clears |
| `POST /api/sessions/:id/mark` | `{ pos, marked: boolean }` — current `pos` |
| `POST /api/sessions/:id/advance` | — next question (first pass, then revisit queue) |
| `POST /api/sessions/:id/visit` | `{ pos }` — palette jump, fresh budget |

**Part B**:

| Method · path | Body | Response |
|---|---|---|
| `POST /api/sessions/:id/b/open` | `{ pos }` — palette, Prev, Next, "Start Q1" (ends read-all early) | `SessionState` |
| `POST /api/sessions/:id/b/step` | `{ pos, to: "ideas"\|"commit" }` — Got it, I've picked one, Back to ideas (refused in forced advance once the Ideas target passed) | `SessionState` |
| `POST /api/sessions/:id/b/commit` | `{ pos }` — from Ideas or Commit; final | `SessionState` |
| `POST /api/sessions/:id/b/skip` | `{ pos }` — uncommitted only, paper only; opens the next open question | `SessionState` |
| `POST /api/sessions/:id/b/done` | `{ pos }` — committed only, paper only; opens the next open question | `SessionState` |
| `POST /api/sessions/:id/b/end` | — paper only, after read-all: closes the open question (end page) | `SessionState` |
| `POST /api/sessions/:id/b/reread` | `{ pos }` — `questionHiding` only; 60 / 30 / 15 s, then 409 | `SessionState` |
| `POST /api/sessions/:id/b/event` | `{ pos, type: string (≤64), data?: any }` — free-form log (e.g. a seed note) | `{ ok, serverNow }` |
| `POST /api/sessions/:id/b/ideas` | `{ pos, count: 0–99 }` — "How many ideas did you sketch?" | `{ partB: BResults }` |
| `POST /api/sessions/:id/b/rate` | `{ pos, criterion: index, value: 0–5 }` | `{ partB: BResults }` |
| `POST /api/sessions/:id/b/photo` | `multipart/form-data`: `pos`, `file` (jpeg/png/webp/heic, ≤15 MB) | `{ photoId, url, partB: BResults }` |
| `GET /api/photos/:id` | | image bytes |

### Results

```ts
{
  serverNow, session,
  partA: null | {                       // null until Part A closes
    status, score, maxScore,
    band: {low: 48, high: 54} | null, target: 60 | null,   // null for past papers
    cutoff: number|null, paper: {id, label, totalMarks}|null, retake: boolean,
    totals: Tally, byFormat: Record<Format, Tally>, byTopic: Record<Topic, Tally>,
    lostToWrong: number,                // marks lost to negative marking
    leftBySkipping: number,             // full marks of blank questions
    forcedSkips: number,
    calibration: { sure: {answered, correct, accuracy}, unsure: {…} },
    questions: { pos, id, source, format, topic, answer, confidence, key: Key, answerStatus,
                 explanation, outcome: "correct"|"partial"|"wrong"|"blank"|"dropped",
                 marks, maxMarks, timeMs, budgetMs, visits, forcedSkip, question: QuestionPayload }[]
  },
  partB: null | BResults
}
type Tally = { correct, partial, wrong, skipped, dropped, marks, max };
type BResults = { id, pos, slot, status, progress: Progress|null /* null before the self-paced flow */,
  prompt: PromptPayload, secondsToCommit, commitTargetS, autoCommitted, label /* earlier sessions only */,
  ideaCount, rereads, usedMs: number|null, ratings: {criterion, value}[],
  photos: {id, url, createdAt}[], revealsCardIds: string[] }[];
```

### Cards

| Method · path | Body | Response |
|---|---|---|
| `GET /api/cards/due` | | `{ serverNow, dueCount, newCount, cards: {id, category, priority, front: {text, image}, back, credit, isNew}[] }` — due first, then up to 20 new/day (P1 first) |
| `POST /api/cards/review` | `{ cardId, grade: 1 again · 2 hard · 3 good · 4 easy }` | `{ cardId, dueAt, scheduledDays, reps }` |
| `POST /api/cards/reveal` | `{ promptId }` | `{ cards }` — introduces cards naming that prompt's stimulus, due now |

### Progress and export

| Method · path | Query | Response |
|---|---|---|
| `GET /api/progress/history` | `mode?` | `{ sessions: {id, kind, mode, startedAt, endedAt, status, quit, score, maxScore, medianSecondsToCommit, paperId, retake, slot}[] }` newest first |
| `GET /api/progress/dashboard` | `mode?` | `{ serverNow, mode, partA: {band, target, mockTrend: {id, kind, at, score, maxScore, quit}[], accuracyByTopic: Record<Topic, {answered, correct, total, accuracy}>, forcedSkipRate, lostToWrong, leftBySkipping, retiredOverTime: {at, total}[]}, partB: {perSlot: Record<Slot, {attempts, medianSecondsToCommit}>, attempts: {attemptId, sessionId, at, slot, secondsToCommit, ideas, rereads, selfRating}[], endings: {questions, skipped, outOfTime}}, cards: {total, introduced, retention30d, dueToday, dueNext7Days: number[7]} }` |
| `GET /api/export` | | `pencil-down-YYYY-MM-DD.tar.gz`: `pencil-down.db` (consistent snapshot) + `photos/*` |

---

## Rules the server applies

- **Selection**: retired (real, 2 correct, any mode), animated, dropped and `excluded` questions never enter mocks, drills or revisit. Past papers serve the whole paper in printed order with its own scheme (retired, animated, dropped and excluded included). Retired generators are never selected. Mocks: 8 NAT / 10 MSQ / 26 MCQ, topic quotas from `content/meta/topic-weights.json`, ~30% of visual-topic slots generated, unseen first; served NAT → MSQ → MCQ. Seeds are chosen server-side and live in the question id.
- **Generated snapshots**: a generated question is stored whole (`generated_questions`) when its session is created; payload, key, explanation, scoring, results and revisit all read that copy, so generator changes never alter served questions. Ids served before snapshots existed are rebuilt once from `generators/legacy-v1` (backfilled on the first request after start, otherwise on first read) and stored.
- **Option labels**: real questions whose paper prints 1–4 or a–d carry `optionLabels`; answers and keys stay A–D on the wire, the UI shows the printed label (results: `2 (B)`), and the keyboard accepts the printed label or A–D.
- **Scoring**: spec §9 (current scheme) except past papers (their own scheme, incl. non-partial MSQ). `ANY` scores the best alternative; `DROPPED` gives everyone its marks.
- **Mastery / error log** at Part A close: correct real question → `correct_count + 1`, retired at 2. Wrong or partial → `wrong`; correct but unsure → `unsure-correct`; blank after a forced skip → `forced-skip`. Due ladder 1 · 3 · 7 · 14 · 30 days: a miss resets to 1 day, unsure-correct climbs one rung (first entry 3 days); a sure correct answer resolves the entry. Revisit serves open entries with `due_at ≤ now`.
- **Part B mock / past paper clock**: 6 min read-all · 22 min per question (each slot script clipped at 22 min) · the paper's 120 min as the only wall; the 4 min spare is the end page. Problem ID: framing 2–10, pick 10–12, commit 12–13.

## Expired login

Behind the auth gate, an expired login answers API calls with a redirect to the login page. Client calls go through `app/src/lib/session-fetch.ts` (`redirect: "manual"`): a redirect raises `AuthExpiredError` and the `pencil:auth-expired` event, and the root layout's banner offers "Log in again" (a reload, which returns to the same screen). Everything already answered is saved server side; the clock keeps running.
