-- Pencil Down schema. Applied on every open; every statement is idempotent.
-- All times are epoch milliseconds set by the server clock.

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL -- JSON
);

-- One row per practice session. A full exam is one row with a Part A section then a Part B section.
CREATE TABLE IF NOT EXISTS sessions (
  id           INTEGER PRIMARY KEY,
  kind         TEXT NOT NULL,    -- mock | drill | revisit | past-paper | b-drill | b-mock | b-past-paper | full
  mode         TEXT NOT NULL,    -- easy | hard | custom
  config       TEXT NOT NULL,    -- JSON: switches, budgets, scheme, paper ids, filters, retake
  started_at   INTEGER NOT NULL,
  ends_at      INTEGER NOT NULL, -- overall deadline; for a full exam it moves when Part A closes early
  ended_at     INTEGER,
  status       TEXT NOT NULL,    -- live | completed | quit | expired
  a_ends_at    INTEGER,          -- Part A section deadline (null when no Part A)
  a_closed_at  INTEGER,
  a_status     TEXT,             -- completed | quit | expired
  a_phase      TEXT,             -- first-pass | revisit
  b_started_at INTEGER,          -- Part B section start (null until it begins)
  score        REAL,
  max_score    REAL
);
CREATE UNIQUE INDEX IF NOT EXISTS sessions_one_live ON sessions(status) WHERE status = 'live';
CREATE INDEX IF NOT EXISTS sessions_started ON sessions(started_at);

-- Every served Part A item, created at session start in served order.
CREATE TABLE IF NOT EXISTS a_responses (
  session_id  INTEGER NOT NULL REFERENCES sessions(id),
  pos         INTEGER NOT NULL,
  question_id TEXT NOT NULL,     -- real id or "gen:<generator>:<format>:<difficulty>:<seed>"
  source      TEXT NOT NULL,     -- real | generated
  format      TEXT NOT NULL,
  topic       TEXT NOT NULL,
  budget_ms   INTEGER NOT NULL,
  answer      TEXT,              -- JSON AnswerInput or null
  confidence  TEXT NOT NULL DEFAULT 'sure',
  marked      INTEGER NOT NULL DEFAULT 0,
  in_queue    INTEGER NOT NULL DEFAULT 0, -- in the revisit queue
  time_ms     INTEGER NOT NULL DEFAULT 0,
  visits      INTEGER NOT NULL DEFAULT 0,
  forced_skip INTEGER NOT NULL DEFAULT 0,
  outcome     TEXT,              -- correct | partial | wrong | blank | dropped (set at close)
  marks       REAL,
  PRIMARY KEY (session_id, pos)
);

-- Each time a question is on screen. The open visit (ended_at null) is the current question.
CREATE TABLE IF NOT EXISTS a_visits (
  id         INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  pos        INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  budget_ms  INTEGER NOT NULL,
  ended_at   INTEGER,
  end_reason TEXT                -- advance | jump | forced | closed
);
CREATE INDEX IF NOT EXISTS a_visits_session ON a_visits(session_id, ended_at);

CREATE TABLE IF NOT EXISTS mastery (
  question_id   TEXT PRIMARY KEY,
  correct_count INTEGER NOT NULL DEFAULT 0,
  retired_at    INTEGER
);

CREATE TABLE IF NOT EXISTS seen (
  item_id    TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,      -- a | b | card
  first_seen INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL,
  times      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS error_log (
  id              INTEGER PRIMARY KEY,
  question_id     TEXT NOT NULL,
  reason          TEXT NOT NULL, -- wrong | unsure-correct | forced-skip
  created_at      INTEGER NOT NULL,
  due_at          INTEGER NOT NULL,
  step            INTEGER NOT NULL DEFAULT 0, -- index into the spacing ladder
  resolved_at     INTEGER,
  last_session_id INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS error_log_open ON error_log(question_id) WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS b_attempts (
  id                INTEGER PRIMARY KEY,
  session_id        INTEGER NOT NULL REFERENCES sessions(id),
  pos               INTEGER NOT NULL,
  prompt_id         TEXT NOT NULL,
  slot              TEXT NOT NULL,
  phases            TEXT NOT NULL, -- JSON PhaseSpan[]; seconds from Part B section start
  block_start_s     INTEGER NOT NULL,
  block_end_s       INTEGER NOT NULL,
  commit_deadline_s INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending', -- pending | committed | abandoned
  committed_at      INTEGER,
  seconds_to_commit INTEGER,
  idea_count        INTEGER NOT NULL DEFAULT 0,
  auto_committed    INTEGER NOT NULL DEFAULT 0,
  committed_idea_id INTEGER,
  commit_label      TEXT,
  checks            TEXT,          -- JSON { rules, notObvious, drawable }
  UNIQUE (session_id, pos)
);

CREATE TABLE IF NOT EXISTS b_ideas (
  id         INTEGER PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES b_attempts(id),
  n          INTEGER NOT NULL,   -- 1-based order of the tap
  created_at INTEGER NOT NULL,
  starred_at INTEGER,            -- null = not starred
  tag        TEXT
);

-- Free-form client events during an attempt (commit checks toggled, screens shown).
CREATE TABLE IF NOT EXISTS b_events (
  id         INTEGER PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES b_attempts(id),
  at         INTEGER NOT NULL,
  type       TEXT NOT NULL,
  data       TEXT
);

CREATE TABLE IF NOT EXISTS b_self_ratings (
  attempt_id INTEGER NOT NULL REFERENCES b_attempts(id),
  criterion  INTEGER NOT NULL,   -- index into the prompt's criteria
  value      INTEGER NOT NULL,   -- 0–5
  PRIMARY KEY (attempt_id, criterion)
);

CREATE TABLE IF NOT EXISTS photos (
  id         INTEGER PRIMARY KEY,
  attempt_id INTEGER NOT NULL REFERENCES b_attempts(id),
  path       TEXT NOT NULL,      -- relative to the photos directory
  mime       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- FSRS state per card (one row once the card is introduced).
CREATE TABLE IF NOT EXISTS card_reviews (
  card_id        TEXT PRIMARY KEY,
  state          TEXT NOT NULL,  -- JSON ts-fsrs card
  due_at         INTEGER NOT NULL,
  reps           INTEGER NOT NULL DEFAULT 0,
  lapses         INTEGER NOT NULL DEFAULT 0,
  last_review_at INTEGER,
  introduced_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS card_review_log (
  id             INTEGER PRIMARY KEY,
  card_id        TEXT NOT NULL,
  at             INTEGER NOT NULL,
  grade          INTEGER NOT NULL, -- 1 again · 2 hard · 3 good · 4 easy
  was_review     INTEGER NOT NULL, -- card was in review state before (counts toward retention)
  scheduled_days REAL
);
