import { test, expect } from "../util/fixtures";
import { seed } from "../util/seed";

// Issues are visible workspace-wide, so read tests scope themselves to a freshly
// seeded project rather than relying on per-user lists.

test("creating an issue through the form shows it in the list", async ({ page, as }) => {
  await as();
  await page.goto("/issues");
  // The drawer opens from client state, so a click that lands pre-hydration does nothing.
  await page.waitForLoadState("networkidle");

  // Unique per attempt: issues are workspace-wide and the database lives for the whole
  // run, so a fixed title accumulates copies across browser projects and retries.
  const title = `Write the quarterly report ${Date.now()}`;
  await page.getByRole("button", { name: "New issue" }).click();
  await page.getByPlaceholder("What needs doing?").fill(title);
  await page.getByRole("button", { name: "Add issue" }).click();

  await expect(page.getByRole("link", { name: title })).toBeVisible();
});

test("existing issues are listed", async ({ page, as }) => {
  const session = await as();
  const project = await seed(session.userID, ["Buy milk", "Renew passport"]);

  await page.goto(`/projects/${project}/issues`);

  await expect(page.getByRole("link", { name: "Buy milk" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Renew passport" })).toBeVisible();
});

test("the board can group by stage", async ({ page, as }) => {
  const session = await as();
  const project = await seed(session.userID, ["Draft the brief", "Ship the build"]);

  await page.goto(`/projects/${project}/issues?view=board&group=stage`);

  // Scoped to the column titles: the filter tabs and the cards' stage chips
  // carry the same labels.
  const board = page.locator(".board");
  await expect(board.locator(".title", { hasText: "Sprint 1" })).toBeVisible();
  await expect(board.locator(".title", { hasText: "Sprint 2" })).toBeVisible();
});

test("the timeline plots dated issues", async ({ page, as }) => {
  const session = await as();
  const project = await seed(session.userID, ["Kick off"]);

  await page.goto(`/projects/${project}/issues?view=timeline`);

  await expect(page.getByRole("link", { name: "Kick off" })).toBeVisible();
  // Case-sensitive: the status filter tab is capitalised "Planned".
  await expect(page.getByText("planned", { exact: true })).toBeVisible();
});

test("starting an issue records it as active", async ({ page, as }) => {
  const session = await as();
  const project = await seed(session.userID, ["Start me"]);

  await page.goto(`/projects/${project}/issues`);
  // The status menu opens from client state, so a pre-hydration click does nothing.
  await page.waitForLoadState("networkidle");
  // Scoped to the row — the filter tabs carry the same status labels.
  const row = page.getByRole("row", { name: "Start me" });
  await row.getByRole("button", { name: "Backlog" }).click();
  await page.getByRole("menuitem", { name: "Active" }).click();

  await expect(row.getByRole("button", { name: "Active" })).toBeVisible();
});
