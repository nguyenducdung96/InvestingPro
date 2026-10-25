import {test,expect} from '@playwright/test';

test('Dung Quat shows scoped source positions while history metrics stay unavailable',async({page})=>{
 await page.request.post('http://127.0.0.1:54329/__throughput',{data:[]});
 await page.goto('/companies/GMD?central_asset=gemadept_dung_quat');
 const scope=page.getByRole('region',{name:'GMD Dung Quất',exact:true});
 await expect(scope.getByRole('heading',{name:'Gemadept–Dung Quất',exact:true})).toBeVisible();
 await expect(scope.locator('tbody')).toContainText('HJ TIANHE');
 await expect(scope.locator('[data-label="DWT theo nguồn"]')).toHaveText('60.434');
 await expect(page.locator('#vessel-plans')).toHaveCount(0);
 await scope.getByText('Phạm vi, chất lượng và truy vết nguồn',{exact:true}).click();
 await expect(scope).toContainText('không dùng tên đại lý để gán bến');
 const response=await page.request.get('/api/v1/companies/GMD/dungquat');
 expect(response.ok()).toBe(true);
 const body=await response.json();
 expect(body.data.semantics).toBe('authority_position_snapshot');
 expect(body.data.source_rows).toBe(69);
 expect(body.metrics).toEqual({arrivals:null,departures:null,dwt:null,yoy:null});
 for(const theme of ['light','dark']){
  await page.getByLabel('Giao diện',{exact:true}).selectOption(theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.screenshot({path:test.info().outputPath('dungquat.png'),fullPage:true});
 await page.goto('/industries/ports/central');
 const row=page.locator('[data-ticker="GMD"]');
 await expect(row.locator('[data-label="Lượt"]')).toHaveText('—');
 await expect(row).toContainText('Chưa tích hợp lịch sử');
 await row.getByRole('link',{name:'GMD',exact:true}).click();
 await expect(scope).toBeVisible();
});
