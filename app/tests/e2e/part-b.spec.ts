import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Part B screens against the real API. The server owns the clock, so phases are reached by
// "time travel": moving a session's stored timestamps into the past in the test's data dir.
// Needs PENCIL_DATA_DIR to point at the data dir of the server under test
// (e.g. PD_BASE_URL=http://localhost:3427 PENCIL_DATA_DIR=/path/to/data pnpm test:e2e part-b).

const dataDir = process.env.PENCIL_DATA_DIR;
test.skip(!dataDir, "PENCIL_DATA_DIR must name the server's data dir");

/** Moves session `id` forward in time by `seconds` (its stored timestamps move back). */
function travel(id: number, seconds: number) {
  const db = new DatabaseSync(join(dataDir!, "pencil-down.db"));
  const ms = Math.round(seconds * 1000);
  db.prepare(
    `UPDATE sessions SET started_at = started_at - ?, ends_at = ends_at - ?,
       b_started_at = b_started_at - ?, a_ends_at = a_ends_at - ? WHERE id = ?`,
  ).run(ms, ms, ms, ms, id);
  db.close();
}

/** Seconds elapsed since the Part B section started, per the server. */
async function elapsed(request: APIRequestContext, id: number) {
  const s = await (await request.get(`/api/sessions/${id}`)).json();
  return (s.serverNow - s.partB.startedAt) / 1000;
}

/** Jump to second `target` of the Part B clock, then reload (reload must land exactly in place). */
async function jumpTo(page: Page, request: APIRequestContext, id: number, target: number) {
  travel(id, target - (await elapsed(request, id)));
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

test("Easy drill end to end: read, generate, commit, execute, debrief with photo, results", async ({ page, request }) => {
  const errors = trackErrors(page);
  const id = await startFromHub(page, { slot: "Sketching", mode: "Easy" });

  // Read: prompt on screen, phase clock running.
  await expect(page.getByTestId("phase-name")).toHaveText("Read");
  await expect(page.getByTestId("prompt")).toBeVisible();
  await expect(page.getByTestId("phase-clock").first()).toBeVisible();

  // Generate (2:00): tap three ideas, star the last. Easy keeps the prompt visible.
  await jumpTo(page, request, id, 125);
  await expect(page.getByTestId("phase-name")).toHaveText("Generate");
  const tap = page.getByRole("button", { name: /Add idea/ });
  for (let i = 0; i < 3; i++) await tap.click();
  await expect(page.getByRole("list", { name: "Ideas" }).getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: "Star it" }).click();
  await expect(page.getByRole("button", { name: "Starred 03" })).toBeVisible();
  await expect(page.getByTestId("prompt")).toBeVisible();

  // Commit (4:00): the gate, a label, commit.
  await jumpTo(page, request, id, 245);
  await expect(page.getByTestId("phase-name")).toHaveText("Commit");
  for (const name of ["Obeys every rule", "Not my first obvious idea", "Drawable in the time left"]) {
    await page.getByRole("radiogroup", { name }).getByRole("radio", { name: "Yes" }).click();
  }
  await page.getByLabel("In one line, what will you draw?").fill("Kitchen seen from the floor mat");
  await page.getByRole("button", { name: /Commit idea 03/ }).click();
  await expect(page.getByTestId("committed")).toContainText("Kitchen seen from the floor mat");

  // Execute (5:00): minimal countdown, then pencil down.
  await jumpTo(page, request, id, 305);
  await expect(page.locator("[data-phase=execute]")).toBeVisible();
  await page.getByRole("button", { name: "Pencil down · debrief" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "End and debrief" }).click();

  // Debrief: prompt again, tags, ratings, photo.
  await expect(page.getByRole("heading", { name: "Debrief" })).toBeVisible();
  await expect(page.getByTestId("prompt")).toBeVisible();
  const tags = page.getByRole("textbox", { name: "Tag" });
  await tags.nth(0).fill("floor");
  await tags.nth(1).fill("window");
  await tags.nth(2).fill("floor");
  await tags.nth(2).press("Enter");
  await expect(page.getByText("2 distinct of 3")).toBeVisible();
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

  // Results: seconds-to-commit is the Stat; the rest supports it.
  await page.getByRole("link", { name: /See the summary/ }).click();
  await page.waitForURL(`**/part-b/results/${id}`);
  await expect(page.getByText("Seconds to commit")).toBeVisible();
  await expect(page.getByTestId("slot-0")).toContainText("2/3");
  await expect(page.getByRole("img", { name: "Your page" })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("Hard drill hides the prompt outside Read, auto-commits, reveals it in the debrief", async ({ page, request }) => {
  const id = await startFromHub(page, { slot: "Creativity", mode: "Hard" });
  await expect(page.getByTestId("prompt")).toBeVisible();

  await jumpTo(page, request, id, 130);
  await expect(page.getByTestId("phase-name")).toHaveText("Generate");
  await expect(page.getByTestId("prompt")).toHaveCount(0);
  await expect(page.getByTestId("prompt-hidden")).toContainText("Creativity");
  await page.getByRole("button", { name: /Add idea/ }).click();
  await expect(page.getByRole("list", { name: "Ideas" }).getByRole("listitem")).toHaveCount(1);

  // No commit by 11:00: the server auto-commits the last idea.
  await jumpTo(page, request, id, 11 * 60 + 5);
  await expect(page.getByTestId("committed")).toContainText("Auto-committed");
  await expect(page.getByTestId("prompt-hidden")).toBeVisible();

  // Clock runs out: debrief shows the prompt again.
  await jumpTo(page, request, id, 24 * 60 + 1);
  await expect(page.getByRole("heading", { name: "Debrief" })).toBeVisible();
  await expect(page.getByTestId("prompt")).toBeVisible();
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

test("Full Part B mock: read-all with seed notes survives reload, then block 1 with its stamp", async ({ page, request }) => {
  const id = await startFromHub(page, { mode: "Hard", button: "Start mock" });
  await expect(page.getByTestId("phase-name")).toHaveText("Read all");
  await expect(page.getByTestId("prompt")).toHaveCount(5);
  await page.getByLabel("Idea seeds").first().fill("a crow on the clothesline");

  await page.reload();
  await expect(page.getByTestId("phase-name")).toHaveText("Read all");
  await expect(page.getByLabel("Idea seeds").first()).toHaveValue("a crow on the clothesline");

  // 6:00 → block 1 Read (Hard: visible for its first 2 minutes), then hidden in Generate.
  await jumpTo(page, request, id, 6 * 60 + 2);
  await expect(page.getByTestId("phase-name")).toHaveText("Read");
  await expect(page.getByText(/Q1 of 5/)).toBeVisible();
  await expect(page.getByText("Q1 block ends in")).toBeVisible();
  await expect(page.getByTestId("prompt")).toHaveCount(1);
  await jumpTo(page, request, id, 8 * 60 + 2);
  await expect(page.getByTestId("phase-name")).toHaveText(/Generate/);
  await expect(page.getByTestId("prompt-hidden")).toBeVisible();
  await expect(page.getByTestId("seed-note")).toContainText("a crow on the clothesline");

  // Final buffer: the answered-box reminder.
  await jumpTo(page, request, id, 116 * 60 + 5);
  await expect(page.getByText("Tick the answered box", { exact: false })).toBeVisible();
});

test("Full exam: Part A runs first, then hands over to Part B in place; reload lands in Part B", async ({ page, request }) => {
  const id = await startFromHub(page, { mode: "Easy", button: "Start full exam" });
  await expect(page).toHaveURL(new RegExp(`/exam/${id}$`));
  await expect(page.getByText(/Full exam · Part A/)).toBeVisible(); // Part A on screen
  await page.waitForLoadState("networkidle"); // hydrated: listeners attached

  // Part A submitted (the server starts Part B now); the screen picks it up on its next read.
  expect((await request.post(`/api/sessions/${id}/finish`)).ok()).toBeTruthy();
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByTestId("phase-name")).toHaveText("Read all");
  await expect(page.getByTestId("prompt")).toHaveCount(5);

  await page.reload();
  await expect(page.getByTestId("phase-name")).toHaveText("Read all");
});
