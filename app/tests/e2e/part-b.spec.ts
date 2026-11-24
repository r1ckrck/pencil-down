import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Part B screens against the real API. The server owns the clock, so phases are reached by
// "time travel": moving a session's stored timestamps into the past in the test's data dir.
// Needs PENCIL_DATA_DIR to point at the data dir of the server under test
// (e.g. PD_BASE_URL=http://localhost:3427 PENCIL_DATA_DIR=/path/to/data pnpm test:e2e part-b).

const dataDir = process.env.PENCIL_DATA_DIR;
test.skip(!dataDir, "PENCIL_DATA_DIR must name the server's data dir");

/** Moves session `id` forward in time by `seconds`: every stored server time of the session moves back. */
function travel(id: number, seconds: number) {
  const db = new DatabaseSync(join(dataDir!, "pencil-down.db"));
  const ms = Math.round(seconds * 1000);
  db.prepare(
    `UPDATE sessions SET started_at = started_at - ?, ends_at = ends_at - ?,
       b_started_at = b_started_at - ?, a_ends_at = a_ends_at - ? WHERE id = ?`,
  ).run(ms, ms, ms, ms, id);
  db.prepare("UPDATE b_visits SET started_at = started_at - ?, ended_at = ended_at - ? WHERE session_id = ?").run(ms, ms, id);
  db.prepare("UPDATE b_attempts SET reveal_until = reveal_until - ?, committed_at = committed_at - ? WHERE session_id = ?").run(
    ms,
    ms,
    id,
  );
  db.close();
}

/** Moves forward by `seconds` and reloads: the screen must land exactly where the clock says. */
async function forward(page: Page, id: number, seconds: number) {
  travel(id, seconds);
  await page.reload();
}

async function clearLive(request: APIRequestContext) {
  const { live } = await (await request.get("/api/sessions/live")).json();
  if (live) await request.post(`/api/sessions/${live.session.id}/quit`);
}

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function startFromHub(page: Page, opts: { slot?: string; mode: "Easy" | "Hard"; button?: string }) {
  await page.goto("/part-b");
  if (opts.slot) await page.getByRole("radiogroup", { name: "Slot" }).getByRole("radio", { name: new RegExp(`^${opts.slot}`) }).click();
  await page.getByRole("button", { name: opts.button ?? "Start drill" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: opts.mode }).click();
  await expect(dialog.getByTestId("mode-line")).toBeVisible();
  await expect(dialog.getByText("No pause, no save.", { exact: false })).toBeVisible();
  await dialog.getByRole("button", { name: "Start" }).click();
  await page.waitForURL(/\/(part-b|exam)\/\d+$/);
  return Number(page.url().split("/").pop());
}

test.beforeEach(async ({ request }) => {
  await clearLive(request);
});

test("Easy drill end to end: read, ideas, commit, draw, debrief with idea count and photo, results", async ({ page, request }) => {
  const errors = trackErrors(page);
  const id = await startFromHub(page, { slot: "Sketching", mode: "Easy" });

  // Read: prompt on screen, the step clock and a labelled step bar.
  await expect(page.getByTestId("phase-name")).toHaveText("Read");
  await expect(page.getByTestId("prompt")).toBeVisible();
  await expect(page.getByTestId("step-clock")).toBeVisible();
  const bar = page.getByTestId("step-bar");
  for (const name of ["Read", "Ideas", "Commit", "Draw", "Buffer"]) await expect(bar.getByText(name, { exact: true })).toBeVisible();

  // Got it → Ideas: instructions only, no tapping. Easy keeps the prompt visible.
  await page.getByRole("button", { name: "Got it · start ideas" }).click();
  await expect(page.getByTestId("phase-name")).toHaveText("Ideas");
  await expect(page.getByTestId("ideas-pane")).toContainText("Sketch quick thumbnails on paper");
  await expect(page.getByTestId("prompt")).toBeVisible();

  // Easy past the Ideas target (4:00): nothing moves on; the clock shows the overrun.
  await forward(page, id, 5 * 60);
  await expect(page.getByTestId("phase-name")).toHaveText("Ideas");
  await expect(page.getByTestId("step-clock")).toHaveText(/^\+1:0\d$/);

  // I've picked one → the checklist; Commit → Draw.
  await page.getByRole("button", { name: "I've picked one" }).click();
  await expect(page.getByTestId("commit-pane")).toContainText("It isn't my first obvious idea");
  await page.getByRole("button", { name: "Commit · start drawing" }).click();
  await expect(page.getByTestId("phase-name")).toHaveText("Draw");
  await expect(page.getByTestId("committed")).toContainText("Committed at 5:0");
  await page.getByRole("button", { name: "Pencil down · debrief" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "End and debrief" }).click();

  // Debrief: prompt again, idea count, a rating, a photo.
  await expect(page.getByRole("heading", { name: "Debrief" })).toBeVisible();
  await expect(page.getByTestId("prompt")).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "One more" }).click();
  await expect(page.getByTestId("idea-count")).toHaveText("3");
  const firstCriterion = page.getByTestId("debrief-0").getByRole("radiogroup").first();
  await firstCriterion.getByRole("radio", { name: "4" }).click();
  await expect(firstCriterion.getByRole("radio", { name: "4" })).toHaveAttribute("aria-checked", "true");
  // 1×1 PNG as the page photo.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.getByTestId("photo-input").setInputFiles({ name: "page.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("img", { name: "Your page" })).toHaveCount(1);
  const r = await (await request.get(`/api/sessions/${id}/results`)).json();
  expect(r.partB[0].ideaCount).toBe(3);

  // Results: seconds-to-commit is the Stat; the rest supports it.
  await page.getByRole("link", { name: /See the summary/ }).click();
  await page.waitForURL(`**/part-b/results/${id}`);
  await expect(page.getByText("Seconds to commit")).toBeVisible();
  await expect(page.getByTestId("slot-0")).toContainText("Rereads");
  await expect(page.getByRole("img", { name: "Your page" })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("Hard drill: prompt hides after Read, Reread 60 s, auto-commit, prompt back in the debrief", async ({ page }) => {
  const errors = trackErrors(page);
  const id = await startFromHub(page, { slot: "Creativity", mode: "Hard" });
  await expect(page.getByTestId("prompt")).toBeVisible();

  // 2:10 → Ideas opened on its own; the prompt is hidden with a Reread control.
  await forward(page, id, 130);
  await expect(page.getByTestId("phase-name")).toHaveText("Ideas");
  await expect(page.getByTestId("prompt")).toHaveCount(0);
  await expect(page.getByTestId("prompt-hidden")).toContainText("Creativity");
  await page.getByRole("button", { name: "Reread · 60 s" }).click();
  await expect(page.getByTestId("prompt")).toBeVisible();
  await expect(page.getByTestId("reveal")).toContainText("Reread 1 of 3");

  // Reread window over: hidden again, next reread is 30 s.
  await forward(page, id, 61);
  await expect(page.getByTestId("prompt")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reread · 30 s" })).toBeVisible();

  // 11:00 passed with no commit: the server commits.
  await forward(page, id, 8 * 60);
  await expect(page.getByTestId("phase-name")).toHaveText("Draw");
  await expect(page.getByTestId("committed")).toContainText("Auto-committed");

  // Clock runs out: debrief shows the prompt again.
  await forward(page, id, 13 * 60);
  await expect(page.getByRole("heading", { name: "Debrief" })).toBeVisible();
  await expect(page.getByTestId("prompt")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Quit confirms, ends the session and records the slot as abandoned", async ({ page, request }) => {
  const id = await startFromHub(page, { mode: "Easy" });
  await page.getByRole("button", { name: "Quit" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Quit session" }).click();
  await page.waitForURL(`**/part-b/results/${id}`);
  await expect(page.getByText("Abandoned before the commit point.")).toBeVisible();
  const s = await (await request.get(`/api/sessions/${id}`)).json();
  expect(s.session.status).toBe("quit");
  expect(s.partB.attempts[0].status).toBe("abandoned");
});

test("Full Part B mock: read-all, Start Q1, palette, skip, back with the 15 s view, end page", async ({ page, request }) => {
  const errors = trackErrors(page);
  const id = await startFromHub(page, { mode: "Hard", button: "Start mock" });
  await expect(page.getByTestId("phase-name")).toHaveText("Read-all");
  await expect(page.getByTestId("read-all-intro")).toContainText("You'll see each question again when you open it.");
  await expect(page.getByTestId("prompt")).toHaveCount(5);
  await page.getByLabel("Idea seeds").first().fill("a crow on the clothesline");

  await page.reload();
  await expect(page.getByTestId("phase-name")).toHaveText("Read-all");
  await expect(page.getByLabel("Idea seeds").first()).toHaveValue("a crow on the clothesline");

  // Start Q1 early: one question, its own clock, the palette.
  await page.getByRole("button", { name: "Start Q1" }).click();
  await expect(page.getByTestId("phase-name")).toHaveText("Read");
  await expect(page.getByText(/Q1 of 5/)).toBeVisible();
  await expect(page.getByTestId("prompt")).toHaveCount(1);
  await expect(page.getByTestId("seed-note")).toContainText("a crow on the clothesline");
  const palette = page.getByTestId("b-palette");
  await expect(palette.getByRole("button", { name: /^Question 1,/ })).toHaveAttribute("aria-current", "step");

  // Skip → Q2; Q1 reads skipped.
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByText(/Q2 of 5/)).toBeVisible();
  await expect(palette.getByRole("button", { name: /^Question 1, .*skipped/ })).toBeVisible();

  // Q2 past its Read target (Hard): hidden. Prev → Q1 shows for 15 s.
  await forward(page, id, 2 * 60 + 5);
  await expect(page.getByTestId("phase-name")).toHaveText("Ideas");
  await expect(page.getByTestId("prompt-hidden")).toBeVisible();
  await page.getByRole("button", { name: "Prev" }).click();
  await expect(page.getByText(/Q1 of 5/)).toBeVisible();
  await expect(page.getByTestId("prompt")).toHaveCount(1);
  const s = await (await request.get(`/api/sessions/${id}`)).json();
  expect(s.partB.attempts[1].usedMs).toBeGreaterThanOrEqual(125_000);

  // End: the answered-box reminder and every question listed.
  await palette.getByRole("button", { name: "End" }).click();
  await expect(page.getByTestId("phase-name")).toHaveText("Before pencil down");
  await expect(page.getByText("Tick the answered box", { exact: false })).toBeVisible();
  await expect(page.getByTestId("end-list").getByRole("listitem")).toHaveCount(5);
  expect(errors).toEqual([]);
});

test("Full exam: Part A runs first, then hands over to Part B in place; reload lands in Part B", async ({ page, request }) => {
  const id = await startFromHub(page, { mode: "Easy", button: "Start full exam" });
  await expect(page).toHaveURL(new RegExp(`/exam/${id}$`));
  await expect(page.getByText(/Full exam · Part A/)).toBeVisible(); // Part A on screen
  await page.waitForLoadState("networkidle"); // hydrated: listeners attached

  // Part A submitted (the server starts Part B now); the screen picks it up on its next read.
  expect((await request.post(`/api/sessions/${id}/finish`)).ok()).toBeTruthy();
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByTestId("phase-name")).toHaveText("Read-all");
  await expect(page.getByTestId("prompt")).toHaveCount(5);

  await page.reload();
  await expect(page.getByTestId("phase-name")).toHaveText("Read-all");
});

test("Journal: a prompt tried 11 days ago offers a re-attempt that starts the same prompt", async ({ page, request }) => {
  const first = await (await request.post("/api/sessions", { data: { kind: "b-drill", slot: "form", mode: "easy" } })).json();
  const id = first.session.id;
  const prompt = first.partB.attempts[0].prompt;
  expect((await request.post(`/api/sessions/${id}/b/step`, { data: { pos: 0, to: "ideas" } })).ok()).toBeTruthy();
  expect((await request.post(`/api/sessions/${id}/b/commit`, { data: { pos: 0 } })).ok()).toBeTruthy();
  expect((await request.post(`/api/sessions/${id}/finish`)).ok()).toBeTruthy();
  travel(id, 11 * 86_400);

  const errors = trackErrors(page);
  await page.goto("/part-b/journal");
  const row = page.getByTestId("reattempts").getByRole("listitem").filter({ hasText: prompt.title });
  await expect(row).toContainText("last tried 11 days ago");
  await row.getByRole("button", { name: "Re-attempt" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Easy" }).click();
  await dialog.getByRole("button", { name: "Start" }).click();
  await page.waitForURL(/\/part-b\/\d+$/);
  const again = await (await request.get(`/api/sessions/${Number(page.url().split("/").pop())}`)).json();
  expect(again.session.id).not.toBe(id);
  expect(again.partB.attempts[0].prompt.id).toBe(prompt.id);
  await expect(page.getByTestId("prompt")).toContainText(prompt.title);

  // A quit re-attempt leaves the prompt due, dated from the last committed attempt.
  expect((await request.post(`/api/sessions/${again.session.id}/quit`)).ok()).toBeTruthy();
  await page.goto("/part-b/journal");
  await expect(row).toContainText("last tried 11 days ago");
  await expect(row.getByRole("link", { name: "Last attempt" })).toHaveAttribute("href", `/part-b/results/${id}`);
  expect(errors).toEqual([]);
});
