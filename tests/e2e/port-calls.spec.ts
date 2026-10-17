import {test,expect} from '@playwright/test';
test('daily calls expose lineage, partial coverage, filters and readable themes',async({page,request},info)=>{
 await page.goto('/industries/ports/calls?from=2026-10-01&to=2026-10-17');
 await expect(page.getByRole('heading',{name:'Nhật ký lượt tàu'})).toBeVisible();
 await expect(page.getByRole('cell',{name:'SYNTHETIC TEST SHIP'})).toBeVisible();
 await expect(page.getByRole('img',{name:/2026-10: 1 lượt đến/})).toBeVisible();
 await expect(page.getByRole('cell',{name:'SYNTHETIC IN PORT SHIP'})).toBeVisible();
 await page.getByText('Nguồn và bản gốc',{exact:true}).click();
 await expect(page.getByText('Parser: quangtri-notices/1.0.0')).toBeVisible();
 for(const mode of ['light','dark']){
  await page.getByLabel('Giao diện',{exact:true}).selectOption(mode);
  await expect(page.locator('html')).toHaveCSS('color-scheme',mode);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/calls-${mode}-${info.project.name}.png`,fullPage:true});
 }
 await page.getByLabel('Tên tàu',{exact:true}).fill('NO MATCH');await page.getByRole('button',{name:'Lọc nhật ký'}).click();
 await expect(page.getByText('Chưa có lượt tàu phù hợp với bộ lọc.')).toBeVisible();
 expect((await request.get('/api/v1/port-calls?from=2026-02-30')).status()).toBe(400);
 expect((await request.get('/api/v1/admin/port-calls?artifact=00000000-0000-0000-0000-000000000202')).status()).toBe(401);
 await page.goto('/industries/ports/calls?from=2026-09-01&to=2026-09-02');
 await expect(page.getByText('Chưa có thông báo trong kỳ. Không đủ dữ liệu để vẽ biểu đồ.')).toBeVisible();
});
test('area filter isolates snapshot data without adding it to reported arrivals',async({page,request})=>{
 await page.goto('/industries/ports/calls?from=2026-10-01&to=2026-10-17&area=cantho-ct');
 await expect(page.getByLabel('Khu vực nguồn')).toHaveValue('cantho-ct');
 await expect(page.getByRole('cell',{name:'SYNTHETIC IN PORT SHIP'})).toBeVisible();
 await expect(page.getByRole('cell',{name:'SYNTHETIC TEST SHIP'})).toHaveCount(0);
 await expect(page.getByRole('img',{name:/lượt đến/})).toHaveCount(0);
 const r=await request.get('/api/v1/port-calls?from=2026-10-01&to=2026-10-17&area=cantho-ct');
 const body=await r.json();expect(body.data).toHaveLength(0);expect(body.snapshots).toHaveLength(1);
 expect((await request.get('/api/v1/port-calls?area=not-allowed')).status()).toBe(400);
});
