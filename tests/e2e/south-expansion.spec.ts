import {test,expect} from '@playwright/test';
test('southern expansion attributes each source and excludes unsupported company totals',async({page},info)=>{
 await page.request.post('http://127.0.0.1:54329/__throughput',{data:[]});
 for(const [ticker,asset] of [['CLL','cll'],['SWC','swc_buoys'],['VGP','vgp_k16'],['SGP','sg_tan_thuan'],['GMD','gmd_binh_duong']]){
  await page.goto(`/companies/${ticker}?plan_asset=${asset}`);
  const region=page.getByRole('region',{name:`Lịch điều động ${ticker}`,exact:true});
  await expect(region.getByLabel('Phạm vi theo dõi')).toHaveValue(asset);
  const result=await(await page.request.get(`/api/v1/companies/${ticker}/plans?asset=${asset}`)).json();
  expect(result.actual_verified).toBe(false);expect(result.full_scope_certified).toBe(false);
  const p=result.months.find((m:{period:string})=>m.period==='2026-10');
  await expect(region.locator('tbody').first().locator('tr').last().locator('[data-label="DWT đã ghi nhận"]')).toHaveText(p.current.observed_dwt==null?'—':p.current.observed_dwt.toLocaleString('vi-VN',{maximumFractionDigits:2}));
  if(asset==='gmd_binh_duong'){
   expect(result.sources).toHaveLength(1);expect(result.sources[0].source_url).toContain('123.25.204.166');
   const journal=await(await page.request.get('/api/v1/companies/GMD/plans?asset=gmd_binh_duong&day=2026-08-24&direction=arrival')).json();
   expect(journal.events.length).toBeGreaterThan(0);expect(journal.events.every((e:{source_url:string;direction:string;harbour_code:string})=>e.source_url.includes('123.25.204.166')&&e.direction==='arrival'&&e.harbour_code==='BC198')).toBe(true);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(ticker==='CLL')await page.screenshot({path:`.local/south/expansion-cll-${info.project.name}.png`,fullPage:true});
 }
 for(const ticker of ['TCW']){await page.goto(`/companies/${ticker}`);await expect(page.getByRole('region',{name:`Phạm vi theo dõi ${ticker}`,exact:true})).toBeVisible();await expect(page.getByRole('region',{name:`Lịch điều động ${ticker}`,exact:true})).toHaveCount(0);}
 expect((await page.request.get('/api/v1/companies/CLL/plans?asset=gemalink')).status()).toBe(400);
 expect((await page.request.get('/api/v1/companies/VGP/plans?direction=internal')).status()).toBe(400);
 await page.goto('/industries/ports/south?period=2026-10');
 for(const ticker of ['CLL','SWC','VGP'])await expect(page.locator(`tr[data-ticker="${ticker}"] .badge`)).toHaveText('Đã tích hợp một phần');
 await expect(page.locator('tr[data-ticker="TCW"] [data-label="Lượt"]')).toHaveText('—');
 await expect(page.locator('tr[data-ticker="TCL"]')).toHaveCount(0);
 expect((await(await page.request.get('/api/v1/industries/ports/south')).json()).rows.some((r:{ticker:string})=>r.ticker==='TCL')).toBe(false);
});
