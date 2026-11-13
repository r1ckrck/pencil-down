import { expect, test } from "@playwright/test";

// Behind the auth gate an expired login turns API calls into redirects to the login page.
test("an expired login shows the re-login banner instead of failing silently", async ({ page }) => {
  await page.route("**/api/cards/due**", (route) =>
    route.fulfill({ status: 302, headers: { location: "https://auth.example.invalid/?rd=x" } }),
  );
  await page.goto("/knowledge");
  const alert = page.getByRole("alert").filter({ hasText: "Your login expired" });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole("button", { name: "Log in again" })).toBeVisible();
});

test("normal API responses show no banner", async ({ page }) => {
  await page.goto("/knowledge");
  await expect(page.getByText("Your login expired")).toHaveCount(0);
});
