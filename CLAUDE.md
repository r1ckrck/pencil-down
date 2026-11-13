# CLAUDE.md

## Goal

Pencil Down: a private, single-user web platform that trains one aspirant for **CEED 2027 (Sun 17 Jan 2027)**, IIT Bombay's M.Des entrance.
- **Part A** (computer, 44 objective questions, a pass/fail gate): answer fast, skip without guilt, clear the cutoff (target ~60/150).
- **Part B** (paper, 5 design questions, 75% of the score): decide and commit under time. The app trains the thinking, never judges drawings.

## Source of truth

| Need | Read |
|---|---|
| What to build, rules, acceptance criteria | `docs/spec.md` — authoritative |
| API contract (routes, shapes, server rules) | `docs/api.md` |
| UI components, tokens in Tailwind, shells | `docs/ui-components.md` |
| Acceptance status per criterion | `docs/qa.md` |
| Content shapes (questions, prompts, cards) | `app/src/content/types.ts` |
| Why (exam facts, evidence, prompt themes) | `docs/research/<n>-*/report.md`, then that folder's notes |
| Look and feel | `~/Documents/Projects/assistant/docs/design.md` + `tokens.css`; adaptations in spec §4 |
| Fonts, paper texture | `~/Documents/Projects/assistant/assets/fonts/`, `assets/textures/cream-paper.png` |
| Server conventions (compose shape, paths, deploy) | `~/Documents/Projects/assistant/docs/server-reference.md` |

Spec wins over research. Change the spec before changing behaviour.

## Structure

```
pencil-down/
├── CLAUDE.md
├── docs/            spec.md · api.md · ui-components.md · qa.md
│   └── research/
│       ├── 1-exam-and-prep/          exam pattern, marking, cutoffs, prep habits, tools landscape
│       ├── 2-part-b-timed-thinking/  slot playbooks, ideation science, drills
│       └── 3-part-b-prompt-themes/   2010–2026 Part B audits, prompt grammar, design history, India context
├── pipeline/        laptop-only Python (.venv): fetch/ extract/ verify/ cards/ authored/ · raw/ git-ignored
├── content/         committed pool, read-only at runtime
│   ├── part-a/      questions*.json · papers*.json · images/   (CEED 2010–2026, UCEED 2015–2026)
│   ├── part-b/      prompts*.json · papers*.json · images/     (real + authored)
│   ├── cards/       cards.json · images/
│   └── meta/        topic-weights · playbooks · banned.txt
├── app/             Next.js 16 (read app/AGENTS.md before Next code)
│   ├── src/app/     (app)/ routes with chrome · (exam)/ live sessions · api/
│   ├── src/         components/ · engine/ · generators/ (flat, solid) · db/ · content/ · server/ · lib/ · styles/
│   └── tests/       unit/ (vitest) · e2e/ (playwright)
├── Dockerfile · docker-compose.yml · .forgejo/workflows/check.yml
```

## Commands (in `app/`)

| Task | Command |
|---|---|
| Dev server | `pnpm dev` (data in `../data`, git-ignored) |
| Unit tests · types · lint | `pnpm test` · `npx tsc --noEmit` · `pnpm lint` |
| Validate all content | `pnpm validate:content` |
| Production build | `pnpm build` (standalone output) |
| E2E | `pnpm test:e2e`, or against a running server: `PD_BASE_URL=… PENCIL_DATA_DIR=… pnpm exec playwright test` |
| Rebuild content | scripts in `pipeline/`, run with `pipeline/.venv/bin/python -I`; each folder's verify script must pass |

## Rules that hold everywhere

- **No AI at runtime.** No API keys, no external calls. Content is authored at build time, in-session, and committed as data.
- **No drawing evaluation** of any kind.
- **No pause, no save, no resume-later.** Clock is server-owned; quit = every unanswered item recorded as skipped.
- **Scoring** follows spec §9 exactly; MSQ partial credit is test-enumerated.
- **Answer honesty:** `answer_status` is `official`, `solved` or `constructed` — never upgrade a solved answer to official. Generated answers are computed by construction, never guessed.
- **Pool:** one shared pool across all years; past papers are a separate opt-in mode; a real question correct twice retires.
- **Part B content:** Indian everyday settings; trends shown as user + setting + moment, never named; banned list in `content/meta/banned.txt`.
- **Design:** tokens only (no hex outside `tokens.css`); accent once per screen; display font only for the one statement.
- **Pipeline** runs on the laptop only, Python with `-I`, downloads in their own folders. Nothing in `pipeline/` runs on the server.

## Ownership

- This repo owns: app, content, pipeline, Dockerfile, compose, workflow file.
- The owner owns: hosting, hostname, Authelia/2FA, server folders, deploy wiring. Don't design for these.

## Git

- `main` only, no branches.
- `origin` fetches from Forgejo (`git.nesh.studio/r1ckrck/pencil-down`, primary) and pushes to Forgejo then GitHub (`github.com/r1ckrck/pencil-down`, mirror). Always pull from Forgejo.
- Push only when the owner asks.
