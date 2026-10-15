import { test, expect } from "@playwright/test";
test("publication review guides an admin through source, evidence and identity with explicit confirmations",async({page,request},testInfo)=>{
  await request.post("http://127.0.0.1:54329/reset");
  await page.goto('/admin/publication?kind=evidence');
  await page.getByLabel('Mã truy cập (access token)').fill('fixture-admin');
  await page.getByRole('button',{name:'Đăng nhập quản trị'}).click();
  await expect(page.getByRole('button',{name:'Xác minh bằng chứng',exact:true})).toBeDisabled();
  await expect(page.getByText('Cần duyệt quyền sử dụng nguồn trước.')).toBeVisible();
  await page.getByRole('link',{name:'1. Quyền sử dụng nguồn'}).click();
  await page.getByLabel('Căn cứ được phép sử dụng dữ liệu').fill('Fixture written permission for these specific catalog fields.');
  await page.getByLabel('Phạm vi được phép sử dụng').fill('Fixture identity and catalog facts only, retaining source attribution.');
  await page.getByLabel('Bằng chứng và lý do quyết định (20–4.000 ký tự)').fill('Checked fixture permission, scope and source attribution.');
  await expect(page.getByRole('button',{name:'Duyệt quyền nguồn'})).toBeDisabled();
  await page.getByRole('checkbox').check();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/publication-${testInfo.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'Duyệt quyền nguồn'}).click();
  await expect(page.getByText('Không còn hồ sơ chờ duyệt ở bước này.',{exact:false})).toBeVisible();
  await page.getByRole('link',{name:'2. Bằng chứng',exact:true}).click();
  await page.getByLabel('SHA-256 thực tế sau khi tải lại từ R2').fill('a'.repeat(64));
  await page.getByLabel('Bằng chứng và lý do quyết định (20–4.000 ký tự)').fill('Checked fixture raw hash, original pages 1–2 and identity fields.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Xác minh bằng chứng',exact:true}).click();
  await expect(page.getByText('Không còn hồ sơ chờ duyệt ở bước này.',{exact:false})).toBeVisible();
  await page.getByRole('link',{name:'3. Doanh nghiệp / thực thể',exact:true}).click();
  await page.getByLabel('Bằng chứng và lý do quyết định (20–4.000 ký tự)').fill('Checked fixture company identity against reviewed evidence pages.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Xác minh doanh nghiệp / thực thể'}).click();
  await expect(page.getByText('Không còn hồ sơ chờ duyệt ở bước này.',{exact:false})).toBeVisible();
  await page.getByRole('link',{name:'4. Mã chứng khoán và quan hệ',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Danh sách quan hệ chờ duyệt'})).toBeVisible();
});
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
  await page.getByRole("link", { name: "Cảng vụ", exact: true }).click();
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
  await expect(page.getByText("Danh sách này chưa được chứng nhận là toàn bộ tài sản", { exact: false })).toBeVisible();
  const icdSection = page.getByRole("region", { name: "ICD và cảng cạn" });
  await expect(icdSection.getByRole("link", { name: "Fixture ICD" })).toBeVisible();
  await icdSection.getByRole("link", { name: "Fixture ICD" }).click();
  await expect(page.getByRole("heading", { name: "Fixture ICD", exact: true })).toBeVisible();
});

test("catalog exposes ports without authorities and preserves the selected category across pagination", async ({ page }) => {
  await page.goto("/industries/ports?limit=1");
  await expect(page.getByRole("link", { name: "Cảng", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Trang tiếp theo", exact: true }).click();
  await expect(page).toHaveURL(/view=ports/);
  await expect(page.getByRole("link", { name: "Fixture Port Without Authority", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Bến cảng", exact: true }).click();
  await expect(page.getByRole("link", { name: "Fixture Terminal", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "ICD và cảng cạn", exact: true }).click();
  await expect(page.getByRole("link", { name: "Fixture ICD", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Fixture Terminal", exact: true })).toHaveCount(0);
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
