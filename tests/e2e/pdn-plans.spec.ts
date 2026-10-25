import {test,expect} from '@playwright/test';
test('PDN scopes reconcile with API, filters and original time evidence',async({page},info)=>{
 const payload=await(await page.request.get('/api/v1/companies/PDN/plans')).json(),cutoff=payload.data.cutoff;
 expect(payload.data.actual_verified).toBe(false);expect(payload.data.full_scope_certified).toBe(false);
 await page.goto('/industries/ports/south?period='+cutoff.slice(0,7));
 const current=payload.data.months.find((p:{period:string})=>p.period===cutoff.slice(0,7));
 await expect(page.locator('tr[data-ticker="PDN"] [data-label="Lượt"]')).toHaveText(current.current.known_rows.toLocaleString('vi-VN'));
 await page.locator('tr[data-ticker="PDN"] .north-ticker').click();
 const plans=page.getByRole('region',{name:'Lịch điều động PDN',exact:true});
 await expect(plans.getByLabel('Phạm vi theo dõi',{exact:true})).toHaveValue('pdn');
 await expect(plans.getByLabel('Phạm vi theo dõi',{exact:true}).locator('option')).toHaveCount(5);
 await plans.getByLabel('Phạm vi theo dõi',{exact:true}).selectOption('pdn_go_dau_b');await plans.getByRole('button',{name:'Xem phạm vi',exact:true}).click();
 await expect(plans.getByLabel('Phạm vi theo dõi',{exact:true})).toHaveValue('pdn_go_dau_b');
 await plans.getByLabel('Chiều tàu',{exact:true}).selectOption('arrival');await plans.getByLabel('Chỉ tiêu',{exact:true}).selectOption('rows');await plans.getByLabel('Kỳ',{exact:true}).selectOption('quarter');await plans.getByLabel('Năm',{exact:true}).selectOption('2025');await plans.getByRole('button',{name:'Xem lịch',exact:true}).click();
 await expect(plans.locator('tbody').first().locator('tr')).toHaveCount(4);
 await expect(plans.locator('.plan-chart-legend').filter({hasText:'Đơn vị: lượt'})).toHaveCount(3);
 await page.goto('/companies/PDN?plan_day=2026-03-13&plan_direction=arrival');
 const record=plans.locator('#plan-days tbody tr').filter({hasText:'DAI TAY DUONG 26'}).filter({has:page.locator('[data-label="Giờ dự kiến"]').filter({hasText:/^13:10$/})});
 await expect(record).toHaveCount(1);await expect(record.locator('[data-label="Giờ dự kiến"]')).toHaveText('13:10');
 await record.getByText('Bằng chứng dòng',{exact:true}).click();await expect(record).toContainText('13/03/2026 13:010');await expect(record).toContainText('SHA-256:');
 const day=await(await page.request.get('/api/v1/companies/PDN/plans?day=2026-03-13&direction=arrival')).json();
 expect(day.data.some((e:{vessel:string;raw_time:string})=>e.vessel==='DAI TAY DUONG 26'&&e.raw_time==='13/03/2026 13:010')).toBe(true);
 await plans.getByText('Chi tiết dữ liệu và nguồn',{exact:true}).click();await expect(plans).toContainText('ít dòng Long Bình Tân hơn từ tháng 7/2026');
 for(const theme of ['dark','light']){await page.getByLabel('Giao diện',{exact:true}).selectOption(theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.screenshot({path:`.local/pdn/pdn-${info.project.name}.png`,fullPage:true});
});
