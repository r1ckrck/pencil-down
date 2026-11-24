# Pencil Down — spec

A single-user web platform that prepares one aspirant for CEED 2027 (17 Jan 2027). Two tools: a Part A timed practice engine and a Part B thinking-under-time tool, plus design-knowledge flashcards and progress tracking. This file is the source of truth. `docs/research/` holds the evidence behind it; where research suggests an option this spec does not take, the spec wins.

---

## 1 · Principles

| Principle | Consequence |
|---|---|
| Part A is a gate, Part B is the rank | Part A targets ~60/150 (cutoff band 48–54). Part B carries 75% of the score. |
| Train decisions, not drawings | No drawing evaluation anywhere. Part B measures seconds-to-commit and the idea count she reports. |
| No runtime AI | All content is static data or deterministic code. No API keys, no external calls. |
| One pool, no accidental repeats | Every accessible year's questions plus generated/authored questions form one pool. No paper is held back. Repeats only by design (error log). |
| Parts are independent | Part A and Part B are separate practice areas. The full 3-hour exam is one optional mode, never a prerequisite. |
| Pressure stays on | No pause, no save, no resume-later. A started session runs to the end; quitting records every unanswered question as skipped. |
| Firm clock, free controls | She second-guesses, so Hard mode decides for her when time is up (forced skip, auto-commit, auto-advance). Moving on is never blocked: next, back, skip and finish-early are always one tap away. |
| Mastered questions retire | A real question answered correctly twice (any mode) is never served again. |

---

## 2 · Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router), TypeScript | House spine (atelier T3) |
| Styling | Tailwind v4 `@theme` reading `tokens.css` | One token source, no hardcoded values |
| Primitives | shadcn (copied) + Radix | Accessible dialogs, toggles, tabs |
| Icons | Phosphor Duotone | Design system set |
| Database | SQLite via built-in `node:sqlite` | One user, ~10 tables. No ORM, no driver dependency |
| Server | Next route handlers | No separate backend |
| Charts | Recharts, palette from `--data-*` tokens | House default |
| Spaced repetition | `ts-fsrs` | FSRS scheduler engine; not worth reimplementing |
| Tests | Vitest (logic) + Playwright (flows) | |
| Content pipeline | Python 3.12 + PyMuPDF + Tesseract (laptop only) | Best-in-class PDF cropping and OCR; never runs on the server |
| Ship | Next standalone output + `docs/run.md` runtime contract + `.forgejo/workflows/check.yml` | Packaging is server side |

---

## 3 · Repo structure

```
pencil-down/
├── app/                      Next.js app
│   ├── src/app/              routes (screens + /api)
│   ├── src/components/       UI (shadcn copies + own)
│   ├── src/engine/           pure logic: scoring, timers, selection, FSRS glue
│   ├── src/generators/       Part A puzzle generators (SVG + answer by construction)
│   ├── src/db/               schema.ts, queries
│   └── tests/                vitest + playwright
├── content/                  committed pool (read-only at runtime)
│   ├── part-a/               questions.json + images/
│   ├── part-b/               prompts.json + images/
│   ├── cards/                cards.json + images/
│   └── meta/                 topic weights, cutoff history, playbooks
├── pipeline/                 laptop-side scripts
│   ├── fetch/                download papers + keys
│   ├── extract/              segment, crop, OCR, parse keys
│   ├── verify/               totals, joins, contact sheets
│   └── raw/                  downloaded PDFs (git-ignored)
├── docs/                     research/, spec.md
├── .forgejo/workflows/check.yml
```

---

## 4 · Design system adaptation

Base: `assistant/docs/design.md` + `tokens.css`, copied into `app/src/styles/tokens.css`. Fonts: General Sans and JetBrains Mono (from `assistant/assets/fonts/`); the design system's display face and sign-off monogram are not used. Paper texture: `cream-paper.png` at low opacity. Light and dark modes.

| Rule from the system | Applied here |
|---|---|
| Accent once per surface | The single live thing: the running per-question timer in Part A, the running question clock in Part B, the one number on results |
| One large statement number | Days-to-exam on Today, the score on a results screen: General Sans semibold at display size, nothing else |
| Mono for technical content | Question numbers, timers, scores, marks, seeds |
| Rounded-square markers | Question palette cells (answered / skipped / marked / unseen) |
| Dimension lines | Time-budget bar under each question: span = budget, fill = elapsed |
| Data colours only in charts | Correct/wrong uses `--data-good` / `--data-bad`; never the accent |

| Modification | Reason |
|---|---|
| Exam screens drop density | The question is the hero; chrome reduced to timer, palette, controls. Focus beats edge-to-edge here. |
| Touch targets ≥ 44 px | Part B runs on a phone next to paper |

Layout targets: Part A optimised for laptop (≥1280 px), usable on phone. Part B optimised for phone (≥360 px).

---

## 5 · Screens and flows

### 5.0 Difficulty modes

Chosen on the start screen of every session (pre-selected: the last mode used; first ever: Hard). Recorded on the session; history and charts can filter by mode.

| | Easy | Hard |
|---|---|---|
| **Part A question timer** | Visible countdown | Hidden — the budget runs unseen |
| **Part A forced skip** | Off — at zero the bar turns `--data-bad` and stays; she moves on when she chooses | On — at zero the answer state is saved as-is and the question moves to the revisit queue |
| **Part B phase timer** | Visible | Visible (the steps need a clock) |
| **Part B question hiding** | Off — the question stays on screen | On — visible only in the windows below; Reread brings it back |
| **Part B forced advance** | Off — a step or question past its target turns `--data-bad`; she moves on when she chooses | On — at the commit target the question commits on its own and Draw opens; at the question budget the screen moves to the next open question |

**Custom** (in Settings): the five switches individually, for any combination outside the two presets.

**Question hiding (Part B).** Trains her to read once, fix the goal in her head and work from it. With hiding on, a question's prompt is visible only:
- during read-all (full mock and past paper: all five at once);
- during its own Read step (until she taps "Got it" or the Read target passes);
- for 15 s each time she opens the question (next, back or the palette), whatever its state, including after its budget has run out;
- for a Reread window (below);
- in the Debrief, so she can self-rate against its criteria.

Otherwise a panel shows the slot name, the current step and the Reread control.

**Reread.** Three tries per question, each shorter: 60 s, then 30 s, then 15 s; after the third the control is gone. The question clock keeps running while she rereads, so the time comes out of the steps still ahead (the step bar shows the loss). Not offered once the question's budget has run out. Every reread is recorded with its time.

### 5.1 Today
- Days to 17 Jan 2027 (the screen's one large number).
- Habit tracker, top right: rows Part A practice · Part B practice · Flashcards; columns the last 7 days (IST). A day counts when she answered a Part A question, committed a Part B idea or reviewed a card; done cells show the habit's filled icon (today's in the accent), open cells an empty hairline square. Streak = consecutive days with any habit, ending today or yesterday. Positive reinforcement only: no red, no misses called out.
- Suggested next session (from weakest Part A topic and least-practised Part B slot).
- Last 7 days in one strip: sessions done, Part A last score vs cutoff band, Part B median seconds-to-commit.
- Cards due today.

### 5.2 Part A

| Mode | Content | Timers |
|---|---|---|
| **Mock** | 44 questions: 8 NAT, 10 MSQ, 26 MCQ, topic-weighted, ~70% real / ~30% generated | 60 min overall + per-question budget |
| **Drill** | Pick topic and/or format; N questions (default 10); mostly generated where available | Per-question budget; overall = sum of budgets |
| **Revisit** | Error-log questions due again | Per-question budget |
| **Past paper** (separate option) | One real CEED paper, any accessible year, exactly as set: its own questions, order and marking scheme | Overall time as printed for that year + per-question budget |

**Past paper rules**
- Opt-in only: chosen from its own entry on the Part A screen; never the default and never assembled into mocks.
- Shows every question of the paper, including retired ones; the paper stays whole.
- Answers still count toward mastery and the error log, like any other session.
- Results show that year's actual cutoff where known (2024: 50.26; 2025: ~54.0; 2026: ~47.8); a repeat sitting of the same paper is labelled "retake".
- The same questions remain in the shared pool; nothing is reserved for this mode.

#### 5.2.1 Per-question budget

Every question has a time budget: MCQ 60 s, MSQ 90 s, NAT 120 s (editable). What happens at the budget depends on the difficulty mode (§5.0). Time per question is recorded in every mode.

**Exam screen**
- Left: question image (real) or SVG (generated). Right: answer control: A–D radio (MCQ), A–D checkboxes (MSQ), on-screen numeric keypad (NAT).
- Each answer carries a confidence tag: sure / unsure (default sure; one tap to flip).
- Question palette: 44 rounded squares, states: unseen · answered · skipped · marked for review.
- Budget behaviour per §5.2.1.
- After the last question, the revisit queue opens with the remaining overall time. Revisit visits get a fresh per-question budget.
- Overall timer expiry ends the section regardless.
- No pause and no save (§5.7).

**Results**
- Total (the screen's one large number) vs cutoff band 48–54 and target 60.
- Breakdown by format and by topic: correct / wrong / skipped / marks.
- Marks lost to wrong answers vs marks left on the table by skipping.
- Confidence calibration: accuracy of "sure" vs "unsure".
- Per-question review: her answer, key, time spent, forced-skip flag, explanation (where available).
- Wrong and unsure-correct questions enter the error log.

### 5.3 Part B

She works one question per screen and moves herself through it. The clock measures and, in Hard, decides when time is up (§5.0); it never holds her back.

**A question: four steps**

| Step | On screen | She moves on with |
|---|---|---|
| **Read** | The prompt with its rules and criteria | "Got it" → Ideas |
| **Ideas** | Instructions only; the ideas happen on paper. "Sketch quick thumbnails: many small ideas, not one finished drawing · Don't judge yet · Aim for at least three before you choose." Problem identification: "List every problem you can see · In the last 2 minutes, pick the one you will solve." | "I've picked one" → Commit |
| **Commit** | A checklist to think through, not a form: it obeys every rule · it isn't my first obvious idea · I can draw it in the time left. "Any no: take your next idea and check again." | "Commit · start drawing" → Draw · "Back to ideas" |
| **Draw** | "Committed at m:ss. Draw your pick." and the clock | "Done · next question" (paper) · "Pencil down" (drill) |

- **Question clock.** Each question has a budget: 24 min in a drill, 22 min in a full mock or past paper. It runs only while that question is open; time across visits adds up. Leaving a question stops its clock where it is.
- **Targets.** Each step has a target on the question clock, from the slot script below (a paper question uses the script clipped at 22 min). Before the target, nothing happens. Past it: Easy marks the step `--data-bad` and shows the overrun; Hard acts — at the Read target the prompt hides and Ideas opens, at the Ideas target Commit opens, at the commit target the question commits on its own (`auto_committed`) and Draw opens, at the budget the screen moves on.
- **Ideas and Commit** stay open until she commits. A commit is final. Nothing is typed or tapped per idea. Seconds-to-commit = question-clock seconds at the commit.
- **Step bar.** One segment per step, sized by its target share of the budget, each labelled on screen with its name: past steps show the time they took, the current one fills and shows time left, future ones show their length. Problem identification splits Ideas into Framing and Pick. A Reread eats into the current segment and pushes the rest later, visibly. Labels are always on screen, never in tooltips.
- **Debrief (90 s per question):** "How many ideas did you sketch?" (one number); self-rate each criterion 0–5 (trend only); optional photo of the page.

| Slot | Read | Ideas | Commit by | Draw | Buffer |
|---|---|---|---|---|---|
| Sketching | 0–2 | 2–4 | min 5 | 5–21 | 21–24 |
| Creativity | 0–2 | 2–10 | min 11 | 11–22 | 22–24 |
| Visual sensitivity | 0–2 | 2–10 | min 11 | 11–22 | 22–24 |
| Form sensitivity | 0–2 | 2–10 | min 11 | 11–22 | 22–24 |
| Problem identification | 0–2 | 2–10 framing, 10–12 pick | min 13 (window 12–13) | 13–22 | 22–24 |

Buffer is the tail of Draw (touch-up), shown as its own segment; it is not a separate step.

**Single-slot drill (24 min)**
1. Pick slot (or "least practised").
2. The question opens on Read. One question, no palette. "Pencil down" (one confirm) is available from every step and ends the session.

**Full Part B mock (120 min = 6 read-all + 5 × 22 + 4 spare)**
- **Read-all (6 min).** All five prompts on one page, each with an idea-seed note. The page says what it is for, in plain words: "Read-all · 6 minutes. Read every question before you start. You'll see each question again when you open it." "Start Q1" ends it early; at 6:00 Q1 opens on its own. Read-all time belongs to no question.
- **Questions.** One per screen. A palette Q1–Q5 sits on top showing each question's state (unseen · open · skipped · committed · done · out of time) and time left; tap to jump. Prev, Next and Skip are always there. Skip marks it skipped and opens the next open question; she can return while it has budget.
- **Out of time.** In Hard a question at its budget closes: it can still be opened to see the prompt (15 s), but ideas and commit are shut. In Easy it stays workable and shows its overrun; only the total clock is a wall.
- **End page.** Opens once every question is done or out of time, or from the palette. Lists the five with their states, "Tick the answered box on every question you attempted", the total time left and "Pencil down" (one confirm). Any question with budget left can still be reopened.
- Total expiry ends the session from any screen.

**Past paper (separate option, 120 min):** one real year's five Part B questions as printed, in printed order, with that year's own criteria and marks. Same structure as the full mock. Opt-in only; the questions also stay in the shared pool. Older papers with a different format (2013–2019 electives) are offered only where they map cleanly to five questions.

**Full exam (180 min):** Part A mock (60) → lock → Part B mock (120). Mirrors 17 Jan.

**Playbook cards:** one per slot — script, decision, failure modes, criteria. Static.

**Journal:** grid of photos by slot and date, never scored. Same prompt re-attempt surfaces after 10–14 days.

### 5.4 Knowledge
- Image flashcards: art movements, Indian painting/dance/monuments, craft processes, anthropometric percentiles, Gestalt, UI components, design icons.
- FSRS schedule; daily due count on Today.
- Part B debrief can reveal an unnamed stimulus (e.g. the 2025 character corkscrew) and add its card.

### 5.5 Progress
- **History:** every session ever taken, newest first — date, mode, score (Part A) or seconds-to-commit (Part B), quit flag. Each row opens its results screen.
- Part A: mock score trend against the cutoff band (reference line); accuracy by topic; forced-skip rate; marks lost to wrong vs skipped; questions retired (mastered) over time.
- Part B: median seconds-to-commit per slot; ideas per question (reported); self-rating trend; rereads per question; questions skipped or out of time.
- Cards: retention, due load.

### 5.6 Settings
Per-question budgets · Custom mode switches (question timer, forced skip, phase timer, question hiding, forced advance) · theme · export data (SQLite file + photos as one archive).

### 5.7 Session integrity
- **No pause, no save.** There is no pause control and no "continue later".
- **Clock is server-owned.** Start time is stored on the server; leaving the tab, locking the phone or closing the browser does not stop it.
- **Accidental reload or close:** reopening the app lands back in the running session with the clock where it really is. Time away is lost.
- **Quit:** an explicit Quit (with one confirm) ends the session. Every unanswered question is recorded as skipped (Part A); unfinished slots are recorded as abandoned (Part B). The session is marked `quit` in history.
- **Walk-away:** if the overall time runs out while she is away, the session closes the same way at its end time.
- Only one session can be live at a time; Today shows it with a "return" control.

---

## 6 · Content model

### Part A question
```
id            "ceed-2026-a-q14" | "gen-cube-net-<seed>"
source        real | generated
origin        { exam: CEED|UCEED, year, qno } | { generator, seed, params }
format        NAT | MSQ | MCQ
stem_image    path (real) | null (generated renders SVG)
options       4 labels; option visuals live inside stem_image for real questions
option_labels real only, optional: the 4 labels as printed (1–4, a–d), mapped in order to A–D; the UI shows these, keys stay A–D
answer        MCQ "B" | MSQ ["A","C"] | NAT { min, max }
answer_status official | solved | constructed
topic         one of the topic list (§7)
difficulty    1–3
animated      true if original used a GIF (excluded from pool)
excluded      real only, optional: reason (duplicate, ambiguous, subjective); kept in its paper, never served elsewhere
explanation   markdown | null
```

### Part B prompt
```
id            "ceed-2026-b-q1" | "pb-sketch-0042"
source        real | authored
origin        { year, qno, original_format } | { grammar values }
slot          sketching | creativity | visual | form | problem-id
text          prompt in CEED register
rules         [ "black/HB pencil only", "no text", … ]
criteria      4 criteria, 5 marks each (or the real split, e.g. 8 + 12)
images        [] | stimulus images (real crops or SVG primitives/symbols)
tags          { user, setting, object, pov, twist, hook }
```

### Card
```
id · front (image or text) · back · category · source (P1 asked | P2 likely | P3 canon) · image credit/licence
```

---

## 7 · Part A pool

### 7.1 Sources

| Source | Expected size | `answer_status` | Used in |
|---|---|---|---|
| CEED 2020–2026 + official keys | ~300 | official | Mocks, drills, revisit |
| UCEED papers + official keys (years available) | to be counted | official | Mocks, drills, revisit |
| CEED 2010–2019 objective items | to be counted | solved | Mocks, drills, revisit (answers double-checked) |
| Generators | unlimited | constructed | Mocks (visual slots), drills |

Animated-GIF questions are excluded. Topic tagging and explanations are written at build time; an explanation that does not reach the official answer is dropped, not shipped.

### 7.2 Topics
`3d-visualisation` · `folding-and-patterns` · `mechanisms` · `everyday-science` · `observation` · `logic-and-counting` · `design-knowledge` · `language`

### 7.3 Generators

| Generator | Topic | Formats | Answer derivation |
|---|---|---|---|
| fold-punch-unfold | folding-and-patterns | MCQ, NAT (hole count) | Reflect punch points across fold lines |
| cube-net | 3d-visualisation | MCQ, MSQ | Fold net into cube adjacency graph |
| rotation-2d | 3d-visualisation | MCQ, MSQ | Rotation vs reflection by transform matrix |
| rotation-3d (voxel) | 3d-visualisation | MCQ | Voxel set equality under 24 rotations |
| mirror-water-image | folding-and-patterns | MCQ | Axis reflection |
| cubes-from-views | 3d-visualisation | NAT, MCQ | Minimum voxel count consistent with front/top/side |
| iso-to-ortho | 3d-visualisation | MCQ | Project voxel model |
| ortho-to-iso | 3d-visualisation | MCQ | Candidates projected and compared |
| matrix-completion | logic-and-counting | MCQ | Rule applied per row/column |
| transparent-overlay | folding-and-patterns | MCQ | Union of transformed layers |
| visible-faces | 3d-visualisation | NAT, MCQ | Face visibility from a view direction. The figure draws the floor grid; the stem states its size and the rule (piles on the floor, the top of every pile visible); a complete reading search rejects any stack whose drawing has a second reading under that rule |

Every generator: seed → identical question; difficulty 1–3; distractors are near-misses (mirror instead of rotation, one cell off); rendered as SVG in the design palette.

Isometric solids (rotation-3d, iso-to-ortho, ortho-to-iso) follow one stated convention: "all cubes are visible; there are no hidden cubes". Every cube in every drawing shows, no other all-visible solid draws the same picture, and no completely hidden extra cube can make a wrong option right. Orthographic views: thick lines = edge of the view or a step in depth, thin = cubes side by side (stated in the stem). Numeric options put the key at an end about half the time.

### 7.4 Eligibility (applies before any assembly)
- **Retired:** a real question answered correctly twice (any mode, any time) is never served again. Generated questions are unique per seed, so they never repeat by construction.
- **Never in mocks, drills or revisit:** animated, `DROPPED` by the key, or `excluded`. Past papers still serve them whole, in printed order.
- **Retired generators** are never selected; questions they already served still read back from their snapshot (§10).

### 7.5 Mock assembly
1. Slot plan: 8 NAT, 10 MSQ, 26 MCQ, with topic quotas from the 2024–2026 papers' distribution (`content/meta/topic-weights.json`).
2. Fill each slot with an unseen real question matching format and topic.
3. Visual-topic slots: ~30% filled by generators at matching format and difficulty.
4. If real unseen run out for a slot, generator fills it (visual topics) or least-recently-seen real question (others).

---

## 8 · Part B pool

| Source | Size | Notes |
|---|---|---|
| Real 2020–2026 (current five slots) | ~41 | As printed, with original criteria |
| Real 2010–2019 adapted to current slots | ~70 | Reworded to the 24-min, 20-mark shape; origin kept |
| Authored from the grammar | ≥ 50 per slot (≥ 250) | Written at build time, reviewed against the real set |

Rules for authored prompts (from `research/3-part-b-prompt-themes/report.md`):
- Ordinary Indian settings and users; trends shown as user + setting + moment, never named.
- About 1 in 3 carries an unfamiliar rule (twist).
- Banned: politics, religious conflict, named disasters, funerals.
- Stimuli generated as SVG where needed: primitive forms (sphere, torus, cone, cube…), symbol sets (Phosphor icons), abstract marks.
- Prompts needing a photographic scene are not authored.

Selection: unseen first; mocks take one per slot, real-first while unseen real remain; drills honour the slot picked.

---

## 9 · Scoring (current CEED scheme)

| Format | Correct | Wrong | Blank |
|---|---|---|---|
| NAT | +4 (value within key range) | 0 | 0 |
| MCQ | +3 | −0.5 | 0 |
| MSQ | see below | −1 | 0 |

MSQ, with C = correct options in key, S = selected:
- any selected option not in C → −1
- S = C → +4
- all 4 correct, 3 selected → +3
- |C| ≥ 3, 2 selected, both correct → +2
- |C| ≥ 2, 1 selected, correct → +1
- these cover every non-empty subset of C; any other selection contains a wrong option → −1
- unit tests enumerate all 15 non-empty selections for each key size 1–4

Every question, from any year, scores with the current scheme — except in past-paper mode, which uses that paper's own printed scheme (stored per paper). Part B is never scored.

---

## 10 · Persistence (SQLite, `/data/pencil-down.db`)

| Table | Holds |
|---|---|
| `sessions` | id, kind (mock/drill/past-paper/revisit/b-drill/b-mock/b-past-paper/full), mode (easy/hard/custom), started, ends_at, ended, status (live/completed/quit/expired), config |
| `mastery` | question id, correct_count, retired_at |
| `a_responses` | session, question id, answer, confidence, time_ms, visits, forced_skip, marks |
| `seen` | item id, kind (a/b/card), first_seen, last_seen, times |
| `error_log` | question id, reason (wrong/unsure-correct/forced-skip), due_at, resolved |
| `b_attempts` | session, prompt id, slot, step targets, current step, state (unseen/open/skipped/committed/done/out-of-time/abandoned), question time used, seconds_to_commit, idea_count (reported in the debrief), auto_committed, rereads |
| `b_visits` | attempt, opened_at, closed_at (server times; question time = sum of visits) |
| `b_events` | attempt, type (step, skip, reread, seed-note, check…), server time, data |
| `b_self_ratings` | attempt, criterion, 0–5 |
| `photos` | attempt, file path |
| `card_reviews` | card id, FSRS state fields |
| `generated_questions` | generated id, full question JSON as first served, origin (current \| legacy-v1), created_at. Every read of a generated question uses this copy; ids served before it existed are rebuilt once from the frozen `generators/legacy-v1` and stored (backfill on server start, else first read) |
| `settings` | key, value |

Photos stored under `/data/photos/`. Content is read from `content/` (bundled), never written.

---

## 11 · Ship contract

- The repo ships the app, the content and `.forgejo/workflows/check.yml` (validate content, unit tests, types and build on every push to `main`).
- `docs/run.md` is the runtime contract: build steps, runtime folder layout, environment variables, health route, memory cap.
- Image, compose, hostname, Authelia gate and data folder: server side.
- Development and testing run natively with Node on `localhost`.

---

## 12 · Build order

One continuous build, worked in this order because each step feeds the next:

| Step | Output |
|---|---|
| 1 Content pipeline | Real Part A questions + keys, real Part B prompts, raw card facts |
| 2 Generated content | 11 generators; ≥250 authored Part B prompts; cards with images |
| 3 App | Screens, engine, DB, timers, selection |
| 4 Ship files | Runtime contract (`docs/run.md`), CI workflow |
| 5 QA | Every acceptance criterion in §13, laptop and phone widths, light and dark |

---

## 13 · Acceptance criteria

### Content
- [ ] Every official 2020–2026 CEED paper yields exactly that year's printed question count, with marks summing to that year's printed total (44 questions / 150 for 2024–2026; 41 / 100 for 2023).
- [ ] Every 2020–2026 record has an `official` answer joined from the key; 0 orphan keys, 0 unkeyed questions.
- [ ] A contact sheet per paper shows every crop; 100% reviewed, 0 truncated stems or options.
- [ ] `animated: true` set on every GIF question; none appear in any assembled mock.
- [ ] Every record has exactly one topic from §7.2.
- [ ] Every shipped explanation's conclusion equals the official answer.
- [ ] Part B: every real 2020–2026 prompt present with its printed criteria; ≥ 50 authored prompts per slot; 0 prompts containing banned topics (grep list in `content/meta/banned.txt`).
- [ ] Every card image has a licence and credit field.

### Generators
- [ ] Same seed → byte-identical SVG and answer (test, 1,000 seeds per generator).
- [ ] For 1,000 seeds per generator, an independent solver (different method from construction) agrees with the stored answer 100%.
- [ ] No generated question has two options that render identically (test).
- [ ] Every generated MSQ has ≥ 1 and ≤ 4 correct options.

### Engine
- [ ] Scoring unit tests cover every MSQ selection for key sizes 1–4, NAT range edges, MCQ, blanks.
- [ ] A past-paper session serves exactly that paper's questions in printed order, scored with its own scheme, including retired questions.
- [ ] Every mock has 8 / 10 / 26 by format and meets topic quotas ± 1.
- [ ] No item repeats across 20 consecutive generated mocks while unseen items remain (simulation test).
- [ ] Error-log items reappear only on/after `due_at`.
- [ ] Easy and Hard presets set exactly the five switches in §5.0; every Custom combination of the Part A switches behaves per §5.0 (test each).
- [ ] Session start screen pre-selects the last mode used (Hard on first run); mode stored on the session and filterable in Progress.
- [ ] Forced skip fires within 250 ms of budget expiry and saves the answer state unchanged.
- [ ] Overall timer expiry ends the section from any screen state.
- [ ] Reload or close-and-reopen returns to the live session with elapsed time including the time away (server timestamps, fake-clock test).
- [ ] Quit records every unanswered question as skipped and sets status `quit`; a session left open past `ends_at` is closed as `expired` with the same recording.
- [ ] No route or control pauses a live session (grep + manual check).
- [ ] A real question with 2 correct answers never appears in any later session (simulation test).
- [ ] Part A-only and Part B-only sessions start directly from their own screens without touching the other part.

### Part B tool
- [ ] Step targets match §5.3 to the second on the question clock, for every slot, drill and paper (fake-clock test).
- [ ] The question clock runs only while its question is open; leaving and returning resumes it; reload keeps it (server timestamps, fake-clock test).
- [ ] "Got it", "I've picked one", "Commit · start drawing", "Back to ideas", "Done · next question", Skip, Prev, Next and the palette each work from every state that §5.3 allows, and are refused by the server elsewhere.
- [ ] Forced advance on: Read hides and Ideas opens at the Read target; Commit opens at the Ideas target; the question commits on its own at the commit target (`auto_committed` recorded); at the budget the screen moves to the next open question and that question closes. Off: none of these fire and overruns are shown.
- [ ] Seconds-to-commit (question-clock) stored for every committed attempt.
- [ ] Full mock and past paper: read-all is 6 min and can end early; five questions at 22 min each; total 120 min; total expiry ends the session from any screen.
- [ ] Question hiding on: the prompt is visible only in the windows of §5.0 — read-all, its Read step, 15 s on every open (also after its budget), each Reread window, the Debrief (fake-clock test).
- [ ] Reread: windows 60 / 30 / 15 s, then no control; refused after the budget; each reread recorded; the question clock runs through it.
- [ ] Step bar labels are visible text at 360 px (no hover-only labels).

### App
- [ ] All routes render with no console errors at 360 px and 1440 px widths, light and dark.
- [ ] Every colour, space, radius and font value comes from tokens (grep: 0 hex literals outside `tokens.css`).
- [ ] Accent appears at most once per screen (manual check on every screen).
- [ ] Data written on the laptop is visible on the phone after reload.
- [ ] Export produces one archive containing the DB and all photos.

### Ship
- [ ] The production build (Next standalone) starts natively; `/api/health` returns 200; data persists across a process restart.
- [ ] Node process memory stays under 512 MB during a full 3-hour exam session.
- [ ] `docs/run.md` reproduces a working production run from a clean checkout (follow it step by step).

---

## 14 · Not in scope

Drawing evaluation · runtime AI · accounts/auth (Authelia handles access) · institute-round module (interviews, portfolio, studio tests) — revisit after 17 Jan.
