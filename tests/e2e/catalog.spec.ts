import { test, expect } from "@playwright/test";
test("catalog shell explains evidence and does not fabricate metrics", async ({
  page,
}) => {
  await page.goto("/industries/ports");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(
    page.getByRole("heading", {
      name: "Thông tin cảng biển từ nguồn xác minh.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("DWT là trọng tải thiết kế của tàu", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Doanh nghiệp", exact: true }).click();
  await expect(page.locator("main")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Fixture Company", exact: true }),
  ).toBeVisible();
});
test("unauthenticated review API denies access and UI hides proposals", async ({
  page,
  request,
}) => {
  await page.goto("/admin/mappings");
  await expect(
    page.getByRole("button", { name: "Xác minh quan hệ" }),
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
    page.getByRole("link", { name: "Chuyển đến nội dung" }),
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
  await expect(page.getByText("01/01/2026", { exact: true })).toBeVisible();
  await expect(page.getByText("Chưa công bố", { exact: true })).toBeVisible();
  await expect(page.getByText("Synthetic fixture evidence p.10")).toBeVisible();
});
test("admin session sees evidence and can make a review decision", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:54329/reset");
  await page.goto("/admin/mappings?type=entity_mappings");
  await page.getByLabel("Mã truy cập (access token)").fill("fixture-admin");
  await page.getByRole("button", { name: "Đăng nhập quản trị" }).click();
  await expect(
    page.getByRole("heading", { name: "Danh sách quan hệ chờ duyệt" }),
  ).toBeVisible();
  const proposal = page
    .getByRole("article")
    .filter({ hasText: "Fixture terminal proposal" });
  await expect(proposal).toBeVisible();
  await proposal
    .getByLabel("Bằng chứng và lý do quyết định")
    .fill("Checked test evidence and validity");
  await proposal.getByRole("button", { name: "Xác minh quan hệ" }).click();
  await expect(page.getByText("Không có đề xuất chờ duyệt.")).toBeVisible();
});
