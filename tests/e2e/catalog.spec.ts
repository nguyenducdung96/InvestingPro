import { test, expect } from "@playwright/test";
test("catalog shell explains evidence and does not fabricate metrics", async ({
  page,
}) => {
  await page.goto("/industries/ports");
  await expect(
    page.getByRole("heading", {
      name: "Port intelligence starts with evidence.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("DWT represents vessel design capacity", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Listed companies", exact: true })
    .click();
  await expect(page.locator("main")).toBeVisible();
});
test("unauthenticated review API denies access and UI hides proposals", async ({
  page,
  request,
}) => {
  await page.goto("/admin/mappings");
  await expect(
    page.getByRole("button", { name: "Verify mapping" }),
  ).toHaveCount(0);
  const r = await request.get("/api/v1/admin/mappings");
  expect(r.status()).toBe(401);
  await expect(page.locator("main")).toBeVisible();
});
test("keyboard skip link and source labels remain readable", async ({
  page,
}) => {
  await page.goto("/industries/ports");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeVisible();
});
test("catalog hierarchy and company assets carry evidence and validity", async ({
  page,
}) => {
  await page.goto("/industries/ports");
  await page.getByRole("link", { name: "Fixture Authority" }).click();
  await page.getByRole("link", { name: "Fixture Port" }).click();
  await page.getByRole("link", { name: "Fixture Terminal" }).click();
  await expect(page.getByRole("link", { name: "Fixture Berth" })).toBeVisible();
  await page.goto("/companies/TEST");
  await expect(
    page.getByRole("heading", { name: "Fixture Company" }),
  ).toBeVisible();
  await expect(page.getByText("2026-01-01", { exact: true })).toBeVisible();
  await expect(page.getByText("Not reported", { exact: true })).toBeVisible();
  await expect(page.getByText("Synthetic fixture evidence p.10")).toBeVisible();
});
test("admin session sees evidence and can make a review decision", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:54329/reset");
  await page.goto("/admin/mappings?type=entity_mappings");
  await page.getByLabel("Access token").fill("fixture-admin");
  await page.getByRole("button", { name: "Start admin session" }).click();
  await expect(
    page.getByRole("heading", { name: "Mapping review queue" }),
  ).toBeVisible();
  const proposal = page
    .getByRole("article")
    .filter({ hasText: "Fixture terminal proposal" });
  await expect(proposal).toBeVisible();
  await proposal
    .getByLabel("Decision evidence and reasoning")
    .fill("Checked test evidence and validity");
  await proposal.getByRole("button", { name: "Verify mapping" }).click();
  await expect(page.getByText("No pending proposals.")).toBeVisible();
});
