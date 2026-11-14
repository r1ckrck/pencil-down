# Pencil Down — QA

Status of every acceptance criterion in `spec.md` §13. **36 PASS · 2 FIXED · 1 FAIL.**
FIXED = failed on first check, corrected, re-verified. Commands run in `app/`; the production run is the standalone server (`.next/standalone/server.js`, `public/` and `.next/static/` copied in as `docs/run.md` describes) on a fresh data dir, with `PD_BASE_URL=… PENCIL_DATA_DIR=… pnpm exec playwright test`.

## Evidence at a glance

| Check | Result |
|---|---|
| `pnpm validate:content` | content ok: 1494 questions, 30 papers, 427 prompts, 6 Part B papers, 215 cards |
| `pnpm test` (vitest) | 11 files, 132 tests pass |
| `npx tsc --noEmit` · `pnpm lint` | clean |
| `pnpm build` | standalone output, all routes |
| E2E against the production server | 30 / 30 (15 flows × laptop 1440 + phone 360) |
| Pipeline verify scripts (`pipeline/verify/*.py`) | all 8 OK |
| Screen walk (40 screens × 360/1440 × light/dark = 160 captures, computed-style checks) | 0 console errors · 0 horizontal overflow · accent ≤ 1 · large statement number ≤ 1 on every capture |

## Content

| Criterion | Status | Evidence |
|---|---|---|
| Every 2020–2026 paper has its printed count and total (44/150 for 2024–26; 41/100 for 2020–23) | PASS | `verify_part_a.py` (count, total, section split per paper); `validate:content` (marks sum = printed total) |
| Every 2020–2026 record has an `official` key; 0 orphan keys, 0 unkeyed | PASS | `verify_part_a.py` key join check |
| Contact sheet per paper, 100% reviewed, 0 truncated | PASS | 25 sheets, 296 crops reviewed by eye: 0 truncated. Five stem-less crops (2021 Q2, Q31; 2022 Q28; 2023 Q31, Q34) are wordless in the printed paper (2022 Q28 checked against the PDF page) |
| `animated: true` on every GIF question; none in any mock | PASS | 15 flagged; `real-content.test.ts` → 20 mocks on the committed pool serve none |
| Exactly one topic per record | PASS | `validate:content` |
| Every shipped explanation reaches the official answer | PASS | Scripted check of every official explanation plus a reading of those the parser could not settle; all reach the key. UCEED 2015–26 and the rest of CEED 2020–26 were explained at build time, each one checked by a reviewer that solved the question independently first; every correction was checked again. 1,414 of 1,481 served questions are explained. The rest (animated, dropped, any-answer, or no reasoning that reaches the key) stay null rather than guess |
| Part B: every real 2020–26 prompt with printed criteria; ≥ 50 authored per slot; 0 banned | FAIL | 34 of 35 real prompts: 2022 Q2 (Creativity) is missing — its visual elements were printed only in the answer booklet, so there is no 2022 Part B past paper. Authored 60–63 per slot; banned grep clean (`validate:content`, `verify_part_b_*.py`) |
| Every card image has licence and credit | PASS | 110 / 110 sourced images carry author, licence, source URL (`verify_cards.py`). The 33 in-house SVG diagrams carry `credit: null` by design (no third-party licence; spec contract) |

## Generators

| Criterion | Status | Evidence |
|---|---|---|
| Same seed → byte-identical SVG and answer, 1,000 seeds per generator | PASS | `generators-flat.test.ts`, `generators-solid.test.ts` (every format × difficulty) |
| Independent solver agrees 100% over 1,000 seeds | PASS | same tests, `gen.solve(q)` |
| No two options render identically | PASS | same tests (rendered SVG and canonical form) |
| Every generated MSQ has 1–4 correct options | PASS | same tests |

## Engine

| Criterion | Status | Evidence |
|---|---|---|
| Scoring covers every MSQ selection (key sizes 1–4), NAT edges, MCQ, blanks | PASS | `scoring.test.ts` (incl. non-partial MSQ, ANY, DROPPED) |
| Past paper: exact paper, printed order, own scheme, retired included | PASS | `session-a.test.ts › past paper`; `real-content.test.ts` (all seven eligible papers, animated and dropped kept) |
| Every mock 8/10/26 and topic quotas ± 1 | PASS | `session-a.test.ts › mock assembly`; `real-content.test.ts` (20 mocks, committed pool) |
| No repeats across 20 consecutive mocks while unseen items remain | FIXED | On the committed pool mock 19 repeated a question: slot rounding gave a slot to language × NAT (7 questions, drained) while 48 unseen language questions remained. `slotPlan` now moves such a slot with a margin-preserving 2×2 swap. `real-content.test.ts` |
| Error-log items reappear only on/after `due_at` | PASS | `session-a.test.ts › error log` |
| Easy/Hard set the four switches; every Custom Part A combination behaves per §5.0 | PASS | `modes.test.ts`; `session-a.test.ts › Part A switch combinations` (4 combos + presets); screens `pa-custom`, `pa-easy-over-budget`, `pa-hard-*` |
| Start screen pre-selects last mode (Hard first); mode stored and filterable | PASS | `modes.test.ts`; e2e Settings and Progress filters |
| Forced skip within 250 ms, answer state unchanged | PASS | `session-a.test.ts › forced skip` (recorded at the exact expiry instant when checked 200 ms late); e2e Hard mock |
| Overall expiry ends the section from any state | PASS | `session-a.test.ts › overall expiry …` |
| Reload / close returns to the live session, time away counted | PASS | `session-a.test.ts › reload safety` (fake clock); e2e reloads in Part A, Part B and full exam |
| Quit → unanswered skipped, status `quit`; past `ends_at` → `expired`, same recording | PASS | `session-a.test.ts › quit and expiry`; `session-b.test.ts` (abandoned slots) |
| No route or control pauses a live session | PASS | grep for pause/resume in `src/` (only "no pause" copy); route list in `docs/api.md` |
| A real question correct twice never appears later | PASS | `session-a.test.ts › retirement` |
| Part A-only and Part B-only start from their own screens | PASS | e2e Part A and Part B hub flows |

## Part B tool

| Criterion | Status | Evidence |
|---|---|---|
| Phase boundaries match §5.3 to the second | PASS | `partb-timeline.test.ts` (each slot, every boundary second) |
| Commit timeout auto-locks the last starred idea; `auto_committed` | PASS | `session-b.test.ts`; e2e Hard drill |
| Seconds-to-commit stored for every attempt | PASS | `session-b.test.ts`; 3-hour run: all five slots stored (300/660/660/660/780 s) |
| Mock and past paper follow 6 / 5 × 22 / 4 (120 min) | PASS | `partb-timeline.test.ts › stamps`; `session-b.test.ts`; e2e mock final buffer |
| Hiding: visible only in §5.0 windows, no peek, back in Debrief | PASS | `partb-timeline.test.ts`, `session-b.test.ts` (fake clock); `GET /api/content/prompts/:id` 409 while live; screens `pb-hard-*`, `pb-mock-block2-hidden` |

## App

| Criterion | Status | Evidence |
|---|---|---|
| All routes render with no console errors at 360 / 1440, light / dark | PASS | screen walk, 160 captures, 0 errors |
| 0 hex literals outside `tokens.css` | PASS | `grep -rnE "#[0-9a-fA-F]{3,8}\b" src` → only `tokens.css`; no `rgb()/hsl()/oklch()` either |
| Accent at most once per screen | PASS | computed-style count of accent text, fills, borders and SVG paints on every capture: max 1; e2e Progress check |
| Laptop data visible on phone after reload | PASS | two browser contexts: a drill started at 1440 shows as "Return to session" on the 360 Today; a budget changed at 1440 reads back at 360 |
| Export: one archive with the DB and all photos | PASS | `GET /api/export` → `pencil-down-YYYY-MM-DD.tar.gz` with `pencil-down.db` + every file in `photos/`; extracted DB opens with all sessions |

## Ship

| Criterion | Status | Evidence |
|---|---|---|
| Standalone build starts natively; `/api/health` 200; data persists across restart | PASS | `node server.js` → 200; history 37 sessions before and after a process restart |
| Node RSS < 512 MB during a full 3-hour exam | FIXED | One full exam driven end to end with fast-forwarding (≈ 1,500 requests). Without a heap cap RSS kept climbing across exams (365 → 374 → 407 MB): V8 holds collectable garbage. `docs/run.md` sets `NODE_OPTIONS=--max-old-space-size=256`; measured 116 → 290 → 299 → 316 MB max over three back-to-back exams |
| `docs/run.md` reproduces a working production run from a clean checkout | PASS | Fresh `git clone` → `pnpm install --frozen-lockfile` → `pnpm build` → runtime folder assembled with `cp -a` → `node server.js` with the documented variables: `/api/health` 200, `/`, `/part-a`, a content image and CSS 200, DB and `photos/` created in the data dir |

## Features checked beyond §13

| Feature | Status | Evidence |
|---|---|---|
| §5.3 Journal: same-prompt re-attempt after 10–14 days | FIXED | `POST /api/sessions` takes `promptId` for `b-drill`; the journal's Re-attempt opens the start dialog on that prompt. `session-b.test.ts › re-attempt`; e2e "Journal: … re-attempt" (also: a quit re-attempt keeps the prompt due, dated from the last committed attempt) |
| Animated questions in past papers shown as a still with a note | PASS | screen `pa-pastpaper-animated` |
| Touch targets ≥ 44 px | FIXED | segmented options (drill count), slot chips, past-paper scan on narrow screens, card credit link (44 px hit area); screen walk lists none below 44 |

## Known limitations

- **2022 Part B Q2 is absent** (stimulus only in the answer booklet), so 2022 has no Part B past paper; its four other prompts are in the pool.
- **Deploy**: the repo ships `docs/run.md` (runtime contract) and `.forgejo/workflows/check.yml` (validate, test, types, build); image, compose and container start live on the server.
- **No container run in QA**: packaging is server side; memory was measured on the native macOS process, where RSS accounting differs from a cgroup.
- **Mock no-repeat** holds while every topic × format cell the plan needs has unseen supply or a generator. Language NAT has 7 questions; once language runs dry, quotas slip ± 1 or the least-recently-seen question returns, by design.
- **Real scans at 360 px** render small; the zoom control is the reading path on a phone.
- Solved (2010–2019) explanations were checked by the scripted parser only; the manual read covered official ones.

## Question review

Independent review of every question source: sighted audits of the generators and the content, blind solves (solver sees only the rendered question, keys hidden) and adjudication.

| Check | Result |
|---|---|
| Generators, blind solve (first pass, 144 questions, all generators × formats × levels) | 144 / 144 agree with the key; 10 flagged unfair (hidden cubes, unstated line rule, slivers) → fixed |
| Generators, sighted audit | 2 blockers (pictures not fixing the answer), 7 major, minor items → fixed; probes over thousands of seeds find 0 ambiguous outputs |
| Generators, blind solve (second pass on the fixed generators, 96 fresh questions) | 96 / 96 agree; 1 flag (line rule unstated in the stack stem) → stated in that stem and in the minimum-cubes stem |
| Self-solved real answers (CEED 2010–19), blind re-solve of all 320 | 308 / 320 agree first time; every disagreement and flag adjudicated: 4 keys corrected, 8 arguable items excluded, rest kept with a review note |
| Real questions, content audit | 0 blockers; duplicates excluded, printed option labels (1–4, a–d) shown on the answer buttons |
| Part B prompts, content audit | Older prompts reshaped into 24-minute single tasks; full briefs moved out of problem identification; authored text and images aligned |
| History safety | Generated questions are stored when first served; items served earlier replay from a frozen copy of the original generators |

