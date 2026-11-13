import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Knowledge, Progress and Settings against the real API. Each test seeds what it needs over HTTP.

async function api(request: APIRequestContext, method: "GET" | "POST" | "PUT", path: string, data?: unknown) {
  const r = await request.fetch(path, { method, data });
  expect(r.ok(), `${method} ${path} → ${r.status()} ${await r.text()}`).toBeTruthy();
  return r.json();
}

async function clearLive(request: APIRequestContext) {
  const { live } = await api(request, "GET", "/api/sessions/live");
  if (live) await api(request, "POST", `/api/sessions/${live.session.id}/quit`);
}

/** A short Part A drill (2 questions, first answered) and one Part B drill, both closed. */
async function seedSessions(request: APIRequestContext) {
  await clearLive(request);
  const a = await api(request, "POST", "/api/sessions", { kind: "drill", n: 2, mode: "easy" });
  const q = a.partA.current;
  const answer =
    q.question.format === "MCQ"
      ? { kind: "MCQ", option: "A" }
      : q.question.format === "MSQ"
        ? { kind: "MSQ", options: ["A"] }
        : { kind: "NAT", value: 1 };
  await api(request, "POST", `/api/sessions/${a.session.id}/answer`, { pos: q.pos, answer });
  await api(request, "POST", `/api/sessions/${a.session.id}/finish`);

  const b = await api(request, "POST", "/api/sessions", { kind: "b-drill", slot: "sketching", mode: "hard" });
  const { idea } = await api(request, "POST", `/api/sessions/${b.session.id}/b/idea`, { pos: 0 });
  await api(request, "POST", `/api/sessions/${b.session.id}/b/idea`, { pos: 0 });
  await api(request, "POST", `/api/sessions/${b.session.id}/b/commit`, { pos: 0, ideaId: idea.ideaId, label: "e2e" });
  await api(request, "POST", `/api/sessions/${b.session.id}/finish`);
  return { aId: a.session.id as number, bId: b.session.id as number };
}

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test.describe("Settings", () => {
  test("default mode, custom switch and budget persist; export downloads", async ({ page, request }) => {
    const errors = trackErrors(page);
    await api(request, "PUT", "/api/settings", { lastMode: "hard", budgets: { MCQ: 60 }, custom: { forcedSkip: true } });
    await page.goto("/settings");
    await expect(page.getByText("Changes save as you make them.")).toBeVisible();

    await page.getByRole("radiogroup", { name: "Default mode" }).getByRole("radio", { name: /Easy/ }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    const forced = page.getByRole("switch", { name: /Forced skip/ });
    await expect(forced).toHaveAttribute("aria-checked", "true");
    await forced.click();
    await expect(forced).toHaveAttribute("aria-checked", "false");

    const mcq = page.getByLabel(/MCQ/);
    await mcq.fill("75");
    await mcq.press("Enter");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await expect
      .poll(async () => (await api(request, "GET", "/api/settings")) as { lastMode: string; budgets: { MCQ: number }; custom: { forcedSkip: boolean } })
      .toMatchObject({ lastMode: "easy", budgets: { MCQ: 75 }, custom: { forcedSkip: false } });

    await page.reload();
    await expect(page.getByRole("radiogroup", { name: "Default mode" }).getByRole("radio", { name: /Easy/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByLabel(/MCQ/)).toHaveValue("75");

    await mcq.fill("5");
    await mcq.press("Enter");
    await expect(page.getByText("Use a whole number from 10 to 600.")).toBeVisible();
    await expect(mcq).toHaveValue("5");
    await mcq.fill("60");
    await mcq.press("Enter");
    await expect(page.getByText("Use a whole number from 10 to 600.")).toHaveCount(0);

    const exp = await request.get("/api/export");
    expect(exp.status()).toBe(200);
    expect(exp.headers()["content-type"]).toContain("gzip");
    await expect(page.getByTestId("export")).toHaveAttribute("href", "/api/export");

    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("radio", { name: "System" }).click();

    await api(request, "PUT", "/api/settings", { lastMode: "hard", budgets: { MCQ: 60 }, custom: { forcedSkip: true } });
    expect(errors).toEqual([]);
  });
});

test.describe("Knowledge", () => {
  test("review: reveal, rate, advance", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/knowledge");
    await expect(page.getByText("due now")).toBeVisible();
    const start = page.getByTestId("start-review");
    if (!(await start.isVisible())) test.skip(true, "no cards due or new today");
    await start.click();
    await expect(page).toHaveURL(/\/knowledge\/review$/);

    const counter = page.getByText(/^1 \/ \d+$/);
    await expect(counter).toBeVisible();
    await page.getByRole("button", { name: /Show answer/ }).click();
    await expect(page.getByRole("group", { name: "Rate your recall" })).toBeVisible();
    await page.getByRole("button", { name: /^Good/ }).click();
    await expect(page.getByText(/Good · next/)).toBeVisible();

    // Keyboard path: space reveals, 3 rates Good.
    if (await page.getByTestId("review-card").isVisible()) {
      await page.keyboard.press("Space");
      await expect(page.getByRole("group", { name: "Rate your recall" })).toBeVisible();
      await page.keyboard.press("3");
      await expect(page.getByText(/^(3 \/ \d+|Session done)$/).first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("browse: category, priority filter, credits, themed SVG", async ({ page }) => {
    await page.goto("/knowledge");
    const cats = page.getByRole("radiogroup", { name: "Category" });
    await cats.getByRole("radio", { name: /Art movements/ }).click();
    await expect(cats.getByRole("radio", { name: /Art movements/ })).toHaveAttribute("aria-checked", "true");

    const figure = page.locator("article figure").first();
    await expect(figure.getByRole("link", { name: "source" })).toHaveAttribute("href", /^https?:\/\//);

    await page.getByRole("radiogroup", { name: "Priority" }).getByRole("radio", { name: /P1/ }).click();
    const count = Number((await page.getByText(/^\d+ cards$/).textContent())!.split(" ")[0]);
    expect(count).toBeGreaterThan(0);
    await expect(page.locator("article").first().getByText("P1", { exact: true })).toBeVisible();

    await page.locator("article").first().getByRole("button", { name: "Show answer" }).click();
    await expect(page.locator("article").first().getByRole("button", { name: "Hide answer" })).toBeVisible();

    // In-house SVG diagrams paint in the ink token via a mask so they follow the theme.
    await page.getByRole("radiogroup", { name: "Priority" }).getByRole("radio", { name: "All" }).click();
    await cats.getByRole("radio", { name: /Anthropometry/ }).click();
    const svg = page.locator('article [role="img"]').first();
    await expect(svg).toBeVisible();
    const mask = await svg.locator("div").evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage);
    expect(mask).toContain(".svg");
  });
});

test.describe("Progress", () => {
  test("history rows open results; filters narrow the list; charts render", async ({ page, request }) => {
    const errors = trackErrors(page);
    const { aId, bId } = await seedSessions(request);
    await page.goto("/progress");
    await expect(page.getByTestId("headline")).toBeVisible();

    const rows = page.getByTestId("history-row");
    await expect(rows.first()).toBeVisible();
    await expect(page.locator(`a[href="/part-b/results/${bId}"]`)).toBeVisible();
    await expect(page.locator(`a[href="/part-a/results/${aId}"]`)).toBeVisible();

    await page.getByRole("radiogroup", { name: "Filter by part" }).getByRole("radio", { name: "Part B" }).click();
    await expect(page.locator('[data-testid="history"] a[href^="/part-a/results/"]')).toHaveCount(0);
    await expect(page.getByText("Seconds to commit, per slot")).toBeVisible();
    await expect(page.locator(".recharts-surface").first()).toBeVisible();

    await page.getByRole("radiogroup", { name: "Filter by part" }).getByRole("radio", { name: "Part A" }).click();
    await expect(page.locator('[data-testid="history"] a[href^="/part-b/results/"]')).toHaveCount(0);
    await expect(page.getByText("Accuracy by topic")).toBeVisible();

    await page.getByRole("radiogroup", { name: "Filter by mode" }).getByRole("radio", { name: "Easy" }).click();
    await expect(page.getByTestId("history-row").locator("text=hard")).toHaveCount(0);

    await page.getByRole("radiogroup", { name: "Filter by mode" }).getByRole("radio", { name: "All modes" }).click();
    await page.getByRole("radiogroup", { name: "Filter by part" }).getByRole("radio", { name: "Both parts" }).click();
    expect(errors).toEqual([]);
    // The results screen belongs to Part A; only the navigation is checked here.
    await page.locator(`a[href="/part-a/results/${aId}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/part-a/results/${aId}$`));
  });

  test("accent appears at most once", async ({ page }) => {
    await page.goto("/progress");
    await expect(page.getByTestId("headline")).toBeVisible();
    await expect(page.locator(".text-accent, .bg-accent, .border-accent")).toHaveCount(1);
    for (const path of ["/knowledge", "/settings"]) {
      await page.goto(path);
      expect(await page.locator(".text-accent, .bg-accent, .border-accent").count()).toBeLessThanOrEqual(1);
    }
  });
});
