import { test, expect } from "../util/fixtures";

test("an authenticated user sees the app nav", async ({ page, as }) => {
  await as();
  await page.goto("/home");
  // Scoped to main — Topbar/Sidebar carry their own copies of these links.
  const main = page.locator("main");
  await expect(main.getByRole("link", { name: "Issues" })).toBeVisible();
  await expect(main.getByRole("link", { name: "Insights" })).toBeVisible();
  // The whole page: authed state shows "Log out", never "Log in".
  await expect(page.getByRole("link", { name: "Log in" })).toHaveCount(0);
});

test("an authenticated user can open the issues page", async ({ page, as }) => {
  await as();
  await page.goto("/issues");
  await expect(page).toHaveURL(/\/issues$/);
  await expect(page.getByRole("heading", { name: "Issues" })).toBeVisible();
});
