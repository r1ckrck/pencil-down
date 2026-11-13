# Pencil Down — API

JSON over HTTP, same origin, no auth (Authelia sits in front). Every route runs at request time. Times are **epoch milliseconds from the server clock**; Part B timeline offsets are **seconds**. Render countdowns from `serverNow` + the deadlines given, correcting for local clock skew (`skew = serverNow − Date.now()` at receipt).

Errors: `{ "error": string, ...extra }` with status 400 (bad input), 404, 409 (rule: not live, not on screen, already committed, outside window, live session exists → `sessionId`), 413/415 (photo), 422 (no content for that session), 500.

Engine code: `app/src/engine/` · routes: `app/src/app/api/` · schema: `app/src/db/schema.sql`.

---

## Model in one screen

- **One live session at most.** Every read or write first *settles* the session: it replays what the clock implies since the last request (forced skips, section expiry, Part B auto-commits). Reload, close or walk-away is therefore safe: the state is a function of stored timestamps. No route pauses anything.
- **Kinds**: `mock` · `drill` · `revisit` · `past-paper` (Part A) · `b-drill` · `b-mock` · `b-past-paper` (Part B) · `full` (Part A mock 60 min → lock → Part B mock 120 min, one session; Part B starts the instant Part A closes, by expiry or `finish`).
- **Modes** `easy | hard | custom` resolve to four switches stored on the session: `questionTimer` (show the per-question countdown), `forcedSkip`, `phaseTimer` (show the Part B clock), `questionHiding`. The UI honours `questionTimer`/`phaseTimer`; the server enforces `forcedSkip` and `questionHiding`.
- **Status**: `live` → `completed` (finish, or Part B clock ran out) · `quit` · `expired` (Part A overall time ran out).
- **Part A navigation**: first pass in served order; after the last question the revisit queue (unanswered, marked or force-skipped questions) cycles. Every visit gets a fresh budget. With `forcedSkip`, a visit closes at exactly `started + budget` (answer kept as-is, question queued) and the next visit starts at that instant.
- **Part B windows**: ideas, stars and commit are accepted from a slot's block start until its commit deadline. At the deadline an uncommitted slot auto-commits the last starred idea (else the last idea, else none), `autoCommitted: true`. `secondsToCommit` = commit time − block start. Debrief writes (tag, rate, photo) open once the slot's block ends or the session closes.

---

## Shared shapes

```ts
type AnswerInput = { kind: "MCQ"; option: "A"|"B"|"C"|"D" }
                 | { kind: "MSQ"; options: Option[] }          // [] = blank
                 | { kind: "NAT"; value: number };
type Key = SimpleAnswer | { kind: "ANY"; of: SimpleAnswer[] } | { kind: "DROPPED"; marks: number }; // types.ts
type Switches = { questionTimer: boolean; forcedSkip: boolean; phaseTimer: boolean; questionHiding: boolean };

type QuestionPayload =                                   // never contains the key
  | { id; source: "real"; format; topic; label: "CEED 2026 · Q14";
      image: "/content/part-a/images/…"; imageWidth; imageHeight; options: ["A","B","C","D"] }
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
  nextEventAt: number | null,   // refetch state at this instant (forced skip, phase change, commit point, end)
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
    timeline: { kind: "drill"|"paper", total /* s */, readAll, finalBuffer,
                blocks: { pos, slot, start, end, commitDeadline, phases: { phase, from, to, label? }[] }[] },
    now: null | { phase: "read-all"|"read"|"generate"|"commit"|"execute"|"buffer"|"final-buffer"|"done",
                  label?: "framing"|"pick", pos: number|null, from, to },   // seconds from startedAt
    attempts: { id, pos, slot, status: "pending"|"committed"|"abandoned",
                visible: boolean, prompt: PromptPayload|null /* null while hidden */,
                ideaCount, ideas: { id, n, createdAt, starred, tag }[],
                committedAt, secondsToCommit, autoCommitted, committedIdeaId, label }[]
  }
}
```

Hidden prompt → `prompt: null`, show only `slot` and `now.phase`. Once the session closes every prompt is visible (debrief).

---

## Routes

### Health, Today, Settings

| Method · path | Body / query | Response |
|---|---|---|
| `GET /api/health` | | `{ ok, sqlite, serverNow }` |
| `GET /api/today` | | `{ serverNow, examDate, daysToExam, liveSession: {id, kind, endsAt}\|null, defaultMode, suggested: {partATopic, partBSlot}, last7Days: {sessions, lastPartAScore: {score, maxScore, sessionId}\|null, band, medianSecondsToCommit}, cardsDue, revisitDue, reattemptPromptIds }` |
| `GET /api/settings` | | `Settings` = `{ budgets: {MCQ, MSQ, NAT} /* s */, custom: Switches, lastMode, theme: "system"\|"light"\|"dark" }` |
| `PUT /api/settings` | partial `Settings` (budgets 10–600 s) | `Settings` |

### Content

| Method · path | Response |
|---|---|
| `GET /api/content/catalog` | `{ serverNow, defaultMode, papers: {id, exam, year, label, durationMin, totalMarks, questionCount, cutoff, sittings}[] (past-paper eligible, newest first), bPapers: {id, year, label, durationMin, sittings}[], topics: {topic, eligible, unseen, generators: {id, formats}[]}[], slots: {slot, prompts, unseen}[], playbooks: Playbook[], counts: {questions, retired, prompts, cards} }` |
| `GET /api/content/questions/:id` | `QuestionPayload` (id URL-encoded; generated ids `gen:<generator>:<format>:<difficulty>:<seed>`) |
| `GET /api/content/prompts/:id` | `PromptPayload`; **409** if the prompt belongs to the live session (no peek route) |

Images are static files: `/content/part-a/…`, `/content/part-b/…`, `/content/cards/…` (synced into `public/` at build).

### Sessions

| Method · path | Body | Response |
|---|---|---|
| `POST /api/sessions` | `{ kind, mode?, paperId?, bPaperId?, topic?, format?, n?, slot? }` — `mode` defaults to last used; `drill`: `topic` and/or `format`, `n` 1–44 (default 10); `past-paper`: `paperId`; `b-drill`: `slot` (omit = least practised); `b-past-paper`: `bPaperId` | `SessionState` · 409 `{sessionId}` if one is live · 422 if no content |
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
| `POST /api/sessions/:id/b/idea` | `{ pos }` | `{ idea: {ideaId, n}, state: SessionState }` |
| `POST /api/sessions/:id/b/star` | `{ ideaId, starred: boolean }` | `SessionState` |
| `POST /api/sessions/:id/b/commit` | `{ pos, ideaId?, label?: string (≤200), checks?: {rules, notObvious, drawable} }` | `SessionState` |
| `POST /api/sessions/:id/b/event` | `{ pos, type: string (≤64), data?: any }` — free-form log (e.g. a commit check toggled) | `{ ok, serverNow }` |
| `POST /api/sessions/:id/b/tag` | `{ ideaId, tag: string\|null }` — first word, lower-cased | `{ partB: BResults }` |
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
type BResults = { id, pos, slot, status, prompt: PromptPayload, secondsToCommit, autoCommitted,
  committedIdeaId, label, checks, ideaCount, ideas, distinctTags, ratings: {criterion, value}[],
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
| `GET /api/progress/dashboard` | `mode?` | `{ serverNow, mode, partA: {band, target, mockTrend: {id, kind, at, score, maxScore, quit}[], accuracyByTopic: Record<Topic, {answered, correct, total, accuracy}>, forcedSkipRate, lostToWrong, leftBySkipping, retiredOverTime: {at, total}[]}, partB: {perSlot: Record<Slot, {attempts, medianSecondsToCommit}>, attempts: {attemptId, sessionId, at, slot, secondsToCommit, ideas, distinctTagRatio, selfRating}[]}, cards: {total, introduced, retention30d, dueToday, dueNext7Days: number[7]} }` |
| `GET /api/export` | | `pencil-down-YYYY-MM-DD.tar.gz`: `pencil-down.db` (consistent snapshot) + `photos/*` |

---

## Rules the server applies

- **Selection**: retired (real, 2 correct, any mode), animated and dropped questions never enter mocks, drills or revisit. Past papers serve the whole paper in printed order with its own scheme (retired, animated and dropped included). Mocks: 8 NAT / 10 MSQ / 26 MCQ, topic quotas from `content/meta/topic-weights.json`, ~30% of visual-topic slots generated, unseen first; served NAT → MSQ → MCQ. Seeds are chosen server-side and live in the question id.
- **Scoring**: spec §9 (current scheme) except past papers (their own scheme, incl. non-partial MSQ). `ANY` scores the best alternative; `DROPPED` gives everyone its marks.
- **Mastery / error log** at Part A close: correct real question → `correct_count + 1`, retired at 2. Wrong or partial → `wrong`; correct but unsure → `unsure-correct`; blank after a forced skip → `forced-skip`. Due ladder 1 · 3 · 7 · 14 · 30 days: a miss resets to 1 day, unsure-correct climbs one rung (first entry 3 days); a sure correct answer resolves the entry. Revisit serves open entries with `due_at ≤ now`.
- **Part B mock / past paper clock**: 6 min read-all · 5 × 22 min blocks (each slot script clipped at 22 min) · the remaining 4 min as final buffer, totalling the paper's 120 min. Problem ID: framing 2–10, pick 10–12, commit 12–13.
