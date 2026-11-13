import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Part A flows against the real API: Hard mock with a forced skip, reload and quit; Easy drill to submit;
// a past paper with its own cutoff and the retake label. Screenshots go to PA_SHOTS when it is set.

async function api(request: APIRequestContext, method: "GET" | "POST" | "PUT", path: string, data?: unknown) {
  const r = await request.fetch(path, { method, data });
  expect(r.ok(), `${method} ${path} → ${r.status()} ${await r.text()}`).toBeTruthy();
  return r.json();
}

async function clearLive(request: APIRequestContext) {
  const { live } = await api(request, "GET", "/api/sessions/live");
  if (live) await api(request, "POST", `/api/sessions/${live.session.id}/quit`);
}

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

const SHOTS = process.env.PA_SHOTS;
async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  const w = page.viewportSize()?.width ?? 0;
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${SHOTS}/pa-${name}-${w}-${scheme}.png`, fullPage: true });
  }
  await page.emulateMedia({ colorScheme: "light" });
}

/** "Q 03 / 44" → 3 */
async function currentQ(page: Page): Promise<number> {
  const t = await page.getByText(/^Q \d+ \/ \d+$/).textContent();
  return Number(t!.match(/^Q (\d+)/)![1]);
}

async function startFromHub(page: Page, trigger: RegExp | string, mode: "Easy" | "Hard") {
  await page.getByRole("button", { name: trigger }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("No pause, no save.")).toBeVisible();
  await dialog.getByRole("radio", { name: mode }).click();
  await dialog.getByRole("button", { name: "Start", exact: true }).click();
  await page.waitForURL(/\/part-a\/\d+$/);
  await expect(page.getByText(/^Q \d+ \/ \d+$/)).toBeVisible();
  return Number(page.url().match(/(\d+)$/)![1]);
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ request }) => {
  await clearLive(request);
  await api(request, "PUT", "/api/settings", { budgets: { MCQ: 60, MSQ: 90, NAT: 120 } });
});

test("Today shows days to exam and returns to a live session", async ({ page, request }) => {
  const errors = trackErrors(page);
  await clearLive(request);
  await page.goto("/");
  await expect(page.getByText("Days to CEED")).toBeVisible();
  await shot(page, "today");

  const s = await api(request, "POST", "/api/sessions", { kind: "drill", n: 3, mode: "easy" });
  await page.reload();
  await page.getByRole("link", { name: "Return to session" }).click();
  await expect(page).toHaveURL(new RegExp(`/part-a/${s.session.id}$`));
  await shot(page, "today-live");
  await clearLive(request);
  expect(errors).toEqual([]);
});

test("Hard mock: answer, forced skip, reload in place, quit, results", async ({ page, request }) => {
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await clearLive(request);
  await api(request, "PUT", "/api/settings", { budgets: { MCQ: 10, MSQ: 10, NAT: 10 } });

  await page.goto("/part-a");
  await shot(page, "hub");
  const id = await startFromHub(page, "Start mock", "Hard");

  // Mocks serve NAT first. Digits from the keyboard, Enter moves on.
  expect(await currentQ(page)).toBe(1);
  await page.keyboard.type("12");
  await expect(page.locator("output")).toContainText("12");
  await page.keyboard.press("Enter");
  await expect.poll(() => currentQ(page)).toBe(2);

  // Hard: the per-question timer is hidden.
  await expect(page.getByText("--:--")).toBeVisible();
  await page.getByRole("radio", { name: "Unsure" }).click();
  await page.getByRole("button", { name: "Mark for review" }).click();
  await shot(page, "live-hard");

  // Leave Q2 alone: the server skips it at 10 s and the screen follows.
  await expect.poll(() => currentQ(page), { timeout: 15_000 }).toBe(3);
  await expect(page.getByText(/Q02 saved as it stood/)).toBeVisible();

  // Reload lands exactly in place (same question, same visit).
  const before = (await api(request, "GET", `/api/sessions/${id}`)).partA.current;
  await page.reload();
  await expect(page.getByText(/^Q \d+ \/ \d+$/)).toBeVisible();
  const after = (await api(request, "GET", `/api/sessions/${id}`)).partA.current;
  if (after.visitStartedAt === before.visitStartedAt) expect(await currentQ(page)).toBe(before.pos + 1);
  expect(await currentQ(page)).toBe(after.pos + 1);

  // Quit records the rest as skipped.
  await page.getByRole("button", { name: "Quit" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("unanswered will be recorded as skipped");
  await page.getByRole("button", { name: "Quit session" }).click();
  await page.waitForURL(new RegExp(`/part-a/results/${id}$`));
  await expect(page.getByText("Quit early.")).toBeVisible();
  await expect(page.getByText("band 48–54")).toBeVisible();

  const r = await api(request, "GET", `/api/sessions/${id}/results`);
  expect(r.session.status).toBe("quit");
  expect(r.partA.forcedSkips).toBeGreaterThanOrEqual(1);
  expect(r.partA.questions[0].answer).toEqual({ kind: "NAT", value: 12 });
  expect(r.partA.questions[1].forcedSkip).toBe(true);
  expect(r.partA.questions[1].confidence).toBe("unsure");

  // Review row opens to the key and the working.
  await page.locator("details summary").first().click();
  await expect(page.getByText("Key", { exact: true }).first()).toBeVisible();
  await shot(page, "results-mock");
  expect(errors).toEqual([]);
});

test("Easy drill: keys A–D, visible budget, revisit queue, submit", async ({ page, request }) => {
  test.setTimeout(90_000);
  const errors = trackErrors(page);
  await clearLive(request);
  await api(request, "PUT", "/api/settings", { budgets: { MCQ: 60, MSQ: 90, NAT: 120 } });

  await page.goto("/part-a");
  await page.getByRole("radio", { name: "MCQ" }).click();
  await page.getByRole("radio", { name: "5", exact: true }).click();
  const id = await startFromHub(page, "Start drill", "Easy");

  // Easy: the budget is visible and counting.
  await expect(page.getByText("--:--")).toHaveCount(0);
  await page.keyboard.press("b");
  await expect(page.getByRole("radio", { name: "Option B" }).last()).toHaveAttribute("aria-checked", "true");
  await shot(page, "live-easy");
  await page.keyboard.press("Enter");
  await expect.poll(() => currentQ(page)).toBe(2);

  // Walk the rest of the first pass blank; they queue for revisit.
  for (let i = 2; i <= 5; i++) await page.keyboard.press("Enter");
  await expect(page.getByText(/revisit · \d+ in queue/)).toBeVisible();

  await page.getByRole("button", { name: "Submit section" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Submit" }).click();
  await page.waitForURL(new RegExp(`/part-a/results/${id}$`));
  await expect(page.getByText("Submitted.")).toBeVisible();
  const r = await api(request, "GET", `/api/sessions/${id}/results`);
  expect(r.session.mode).toBe("easy");
  expect(r.partA.questions[0].answer).toEqual({ kind: "MCQ", option: "B" });
  await shot(page, "results-drill");
  expect(errors).toEqual([]);
});

test("Past paper: printed paper, zoomable scan, own cutoff, retake", async ({ page, request }) => {
  test.setTimeout(90_000);
  const errors = trackErrors(page);
  await clearLive(request);

  await page.goto("/part-a");
  const row = page.getByRole("listitem").filter({ hasText: "CEED 2026" });
  await row.getByRole("button", { name: /Sit paper|Retake/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Hard" }).click();
  await dialog.getByRole("button", { name: "Start", exact: true }).click();
  await page.waitForURL(/\/part-a\/\d+$/);
  const id = Number(page.url().match(/(\d+)$/)![1]);
  await expect(page.getByText("CEED 2026", { exact: false }).first()).toBeVisible();
  expect(await currentQ(page)).toBe(1);

  await page.getByRole("button", { name: "Zoom question image" }).click();
  await expect(page.getByRole("button", { name: "Close zoom" })).toBeVisible();
  await page.getByRole("button", { name: "Close zoom" }).click();
  await shot(page, "live-paper");

  await page.getByRole("button", { name: "Quit" }).click();
  await page.getByRole("button", { name: "Quit session" }).click();
  await page.waitForURL(new RegExp(`/part-a/results/${id}$`));
  await expect(page.getByText("cutoff 47.8", { exact: true })).toBeVisible();
  await shot(page, "results-paper");

  await page.goto("/part-a");
  await expect(page.getByRole("listitem").filter({ hasText: "CEED 2026" }).getByRole("button", { name: "Retake" })).toBeVisible();
  expect(errors).toEqual([]);
});
