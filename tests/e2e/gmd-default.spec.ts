import {test,expect} from '@playwright/test';

test('GMD opens the three-port aggregate and preserves selections across port tabs',async({page},info)=>{
 await page.request.post('http://127.0.0.1:54329/__throughput',{data:[]});
 await page.goto('/companies/GMD');
 const plans=page.getByRole('region',{name:'Lịch điều động GMD',exact:true});
 const tabs=page.getByRole('navigation',{name:'Chọn cảng GMD',exact:true});
 await expect(plans.getByLabel('Phạm vi theo dõi')).toHaveValue('gmd_all');
 await expect(plans.getByLabel('Chiều tàu')).toHaveValue('departure');
 await expect(tabs.locator('a[aria-current="page"]')).toContainText('GMD · tổng 3 cảng');
 await expect(plans.locator('#plan-history svg')).toBeVisible();
 await page.goto('/companies/GMD?plan_year=2025&plan_direction=arrival&plan_metric=rows&plan_period=quarter');
 const data=await(await page.request.get('/api/v1/companies/GMD/plans?asset=gmd_all&direction=arrival')).json();
 const first=data.quarters.find((p:{period:string})=>p.period==='2025-Q1');
 const yearRows=data.months.filter((p:{period:string})=>p.period.startsWith('2025')).reduce((sum:number,p:{current:{known_rows:number}})=>sum+p.current.known_rows,0);
 await expect(plans.getByTestId('gmd-recorded-year').locator('strong')).toHaveText(`${yearRows.toLocaleString('vi-VN')} lượt`);
 await expect(plans.locator('tbody').first().locator('tr').first().locator('[data-label="Lượt"]')).toHaveText(first.current.known_rows.toLocaleString('vi-VN'));
 await tabs.getByRole('link',{name:/^Gemalink/}).click();
 await expect(plans.getByLabel('Phạm vi theo dõi')).toHaveValue('gemalink');
 for(const [label,value] of [['Chiều tàu','arrival'],['Năm','2025'],['Chỉ tiêu','rows'],['Kỳ','quarter']])await expect(plans.getByLabel(label,{exact:true})).toHaveValue(value);
 await expect(tabs.locator('a[aria-current="page"]')).toContainText('Gemalink');
 await tabs.getByRole('link',{name:/^GMD · tổng 3 cảng/}).click();
 await expect(plans.getByLabel('Phạm vi theo dõi')).toHaveValue('gmd_all');
 await expect(plans.getByLabel('Năm',{exact:true})).toHaveValue('2025');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`.local/ops/gmd-comparison/default-${info.project.name}.png`,fullPage:true});
});
