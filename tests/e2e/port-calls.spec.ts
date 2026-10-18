import {test,expect} from '@playwright/test';
test('daily calls expose lineage, partial coverage, filters and readable themes',async({page,request},info)=>{
 await page.goto('/industries/ports/calls?from=2026-10-01&to=2026-10-17');
 await expect(page.getByRole('heading',{name:'Nhật ký lượt tàu'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Dữ liệu vị trí đã có'}).getByRole('link',{name:'Hải Phòng · 51',exact:true})).toBeVisible();
 await expect(page.getByRole('cell',{name:'SYNTHETIC TEST SHIP'})).toBeVisible();
 await expect(page.getByRole('img',{name:'2026-10: 1 lượt đến, 1 ngày có thông báo',exact:true})).toBeVisible();
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
test('actual berth movements stay separate from port arrival totals and the port journal',async({page,request})=>{
 const params='from=2026-10-01&to=2026-10-17';
 const body=await(await request.get(`/api/v1/port-calls?${params}`)).json();
 expect(body.data).toHaveLength(1);expect(body.berthMovements).toHaveLength(1);
 expect(body.monthly[0].arrivals).toBe(1);
 expect(body.data.some((r:{source_area:string})=>r.source_area==='danang-berth-reported')).toBe(false);
 await page.goto(`/industries/ports/calls?${params}&area=danang-berth-reported`);
 await expect(page.getByRole('heading',{name:'Cập và rời cầu theo dữ liệu cảng',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Bảng cập và rời cầu cuộn ngang',exact:true}).getByText('SYNTHETIC BERTH SHIP',{exact:true})).toBeVisible();
 await expect(page.getByRole('img',{name:/lượt đến/})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Lượt đến và rời theo ngày',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('large position boards paginate and preserve missing time without midnight',async({page})=>{
 await page.goto('/industries/ports/calls?area=haiphong-in-port');
 await expect(page.getByRole('cell',{name:'PAGINATION SHIP 01'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Bảng tàu tại cảng cuộn ngang'}).locator('td[data-label="DWT theo nguồn"]')).toHaveCount(50);
 await expect(page.getByText('Nguồn không ghi giờ',{exact:true})).toBeVisible();
 await expect(page.getByRole('cell',{name:'PAGINATION SHIP 51'})).toHaveCount(0);
 const nav=page.getByRole('navigation',{name:'Phân trang vị trí tàu'});
 await nav.getByRole('link',{name:'Tiếp',exact:true}).click();
 await expect(page.getByRole('cell',{name:'PAGINATION SHIP 51'})).toBeVisible();
 await expect(page.getByRole('cell',{name:'PAGINATION SHIP 01'})).toHaveCount(0);
 await expect(page.getByText('Chưa rõ ngày đến',{exact:false})).toBeVisible();
 await page.getByLabel('Tên bến / cầu / phao').fill('NO MATCH');
 await page.getByRole('button',{name:'Lọc nhật ký'}).click();
 await expect(page.getByText('0 quan sát phù hợp · Mỗi trang tối đa 50 dòng.')).toBeVisible();
});

test('nationwide matrix retains every document target and exposes missing ports',async({page,request})=>{
 await page.goto('/industries/ports/calls?from=2026-10-01&to=2026-10-17');
 const section=page.getByRole('region',{name:'Độ phủ các cảng',exact:true});
 await section.getByText('Xem từng cảng và phần dữ liệu còn thiếu',{exact:true}).click();
 const table=section.getByRole('table');
 await expect(table.locator('tbody tr')).toHaveCount(34);
 await expect(table.getByRole('rowheader',{name:'Quảng Ngãi',exact:true})).toBeVisible();
 await expect(table.getByRole('rowheader',{name:'Kiên Giang',exact:true})).toBeVisible();
 const body=await(await request.get('/api/v1/port-calls?from=2026-10-01&to=2026-10-17')).json();
 expect(body.nationwideCoverage.targets).toHaveLength(34);
 expect(body.nationwideCoverage.complete).toBe(false);
 expect(body.quality.find((q:{sourceArea:string})=>q.sourceArea==='cantho-ct').status).toBe('snapshot_only');
});
