import {test,expect} from '@playwright/test';
test('SWC separates Long Binh from buoys and preserves source evidence and matched-month cumulative totals',async({page},info)=>{
 await page.goto('/companies/SWC');
 const panel=page.getByRole('region',{name:'Lịch điều động SWC',exact:true});
 await expect(panel.getByLabel('Phạm vi theo dõi')).toHaveValue('swc_long_binh');
 await expect(panel).toContainText('lũy kế chỉ cộng các tháng có số liệu ở cả hai năm');
 for(const direction of ['arrival','departure']){
  const data=await(await page.request.get(`/api/v1/companies/SWC/plans?direction=${direction}`)).json();
  expect(data.asset).toBe('swc_long_binh');expect(data.sources).toHaveLength(1);expect(data.metadata.events).toBeGreaterThan(0);
  expect(data.actual_verified).toBe(false);expect(data.full_scope_certified).toBe(false);
  expect(data.months.find((p:{period:string})=>p.period==='2025-02').current.observed_dwt).toBeNull();
  const day=data.metadata.last_observation_by_direction[direction];
  await page.goto(`/companies/SWC?plan_asset=swc_long_binh&plan_direction=${direction}&plan_day=${day}`);
  const journal=await(await page.request.get(`/api/v1/companies/SWC/plans?day=${day}&direction=${direction}`)).json();
  expect(journal.events.length).toBeGreaterThan(0);
  expect(journal.events.every((e:{harbour_code:string;direction:string;source_url:string})=>e.harbour_code==='K0005'&&e.direction===direction&&e.source_url.includes('123.25.204.166'))).toBe(true);
  await expect(panel.locator('#plan-days')).toContainText(journal.events[0].vessel);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await panel.getByText('Phạm vi và độ phủ Long Bình',{exact:true}).click();await expect(panel).toContainText('Chỉ dòng vào/rời trực tiếp');
 await page.screenshot({path:`.local/swc/ui-${info.project.name}.png`,fullPage:true});
 await page.goto('/industries/ports/south?period=2026-06');
 await expect(page.locator('tr[data-ticker="SWC"]')).toHaveCount(2);
 await expect(page.locator('tr[data-ticker="SWC"]').first()).toContainText('Sowatco Long Bình');
 expect((await page.request.get('/api/v1/companies/SWC/plans?asset=pdn_long_binh_tan')).status()).toBe(400);
});
