import {test,expect} from '@playwright/test';
const assets=['tan_vu','chua_ve','hoang_dieu','htit','dinh_vu','vip_green_port','green_port','nam_hai_dinh_vu','vimc_dinh_vu','nam_dinh_vu','hai_an','doan_xa','ptsc_dinh_vu','cqn_cai_lan'];
function fixture(){
 const cutoff=new Date(Date.parse(new Date(Date.now()+7*3600000).toISOString().slice(0,10))-86400000).toISOString().slice(0,10),count=Number(cutoff.slice(8));
 return {cutoff,count,days:assets.flatMap((asset,i)=>[0,1].flatMap(prior=>Array.from({length:count},(_,n)=>({asset_code:asset,report_day:`${Number(cutoff.slice(0,4))-prior}${cutoff.slice(4,8)}${String(n+1).padStart(2,'0')}`,version_id:'test-only',source_sha256:'a'.repeat(64),source_url:'https://example.gov.vn/test-only',parser_version:'test-only',last_success:new Date().toISOString(),last_attempt:new Date().toISOString(),source_error:null,arrival_rows:1,departure_rows:1,arrival_dwt:(i+1)*(prior?100:200),departure_dwt:(i+1)*(prior?50:100),arrival_dwt_missing:0,departure_dwt_missing:0,ambiguous_groups:0,source_empty_sections:[]}))))};
}
test('nine issuer overview matches company APIs, isolates CQN and never adds shared VIP data',async({page,request})=>{
 const f=fixture();await request.post('http://127.0.0.1:54329/__plans',{data:{days:f.days}});
 await page.goto('/industries/ports');await page.getByRole('link',{name:'Xem tổng quan cảng phía Bắc · 9 mã',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Tổng quan cảng phía Bắc',exact:true})).toBeVisible();
 const hp=page.getByRole('region',{name:'Hải Phòng · lịch vào/rời tại bến',exact:true}),qn=page.getByRole('region',{name:'Quảng Ninh · kế hoạch cập/rời cầu',exact:true});
 await expect(hp.locator('tbody tr')).toHaveCount(8);await expect(qn.locator('tbody tr')).toHaveCount(1);
 const data=await(await request.get('/api/v1/industries/ports/north')).json();expect(data.scope.unique_assets).toBe(14);expect(data.scope.regional_total).toBeNull();expect(data.scope.shared_assets).toEqual([{asset:'vip_green_port',tickers:['VGR','VSC']}]);
 for(const row of data.rows){
  const company=await(await request.get(`/api/v1/companies/${row.ticker}/plans?asset=${row.ticker.toLowerCase()}`)).json();expect(row.metric).toEqual(company.months.at(-1));
  await expect(page.locator(`[data-ticker="${row.ticker}"]`)).toContainText(row.scope);
 }
 await expect(page.getByRole('navigation',{name:'Điều hướng chính'}).locator('[aria-current="page"]')).toHaveCount(1);
 await page.getByLabel('Sắp xếp trong nhóm',{exact:true}).selectOption('dwt');await page.getByRole('button',{name:'Xem tổng quan',exact:true}).click();
 const sorted=await(await request.get('/api/v1/industries/ports/north?sort=dwt')).json();expect(sorted.rows.at(-1).ticker).toBe('CQN');expect(await hp.locator('tbody tr').first().getAttribute('data-ticker')).toBe(sorted.rows[0].ticker);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await request.post('http://127.0.0.1:54329/__plans',{data:{days:[]}});
});
test('overview preserves filters, marks incomplete periods and updates without a build in both themes',async({page,request},info)=>{
 const f=fixture(),d=f.days.find(d=>d.asset_code==='doan_xa'&&d.report_day===f.cutoff)!;Object.assign(d,{departure_dwt:null,departure_dwt_missing:1,source_error:'TEST ONLY source failure; prior successful version retained'});
 const hah=f.days.find(d=>d.asset_code==='hai_an'&&d.report_day===f.cutoff)!;hah.last_success='2025-01-01T00:00:00Z';
 await request.post('http://127.0.0.1:54329/__plans',{data:{days:f.days}});await page.goto('/industries/ports/north');
 const dxp=page.locator('[data-ticker="DXP"]');await expect(dxp.getByText('Kỳ chưa đủ DWT',{exact:true})).toBeVisible();await expect(dxp.getByText('Cập nhật cần kiểm tra',{exact:true})).toBeVisible();await expect(page.locator('[data-ticker="HAH"]').getByText('Chậm / thiếu cập nhật',{exact:true})).toBeVisible();
 await dxp.getByText('Độ phủ và lưu ý',{exact:true}).click();await expect(dxp.getByText('Thiếu DWT',{exact:true})).toBeVisible();
 for(const theme of ['dark','light']){await page.getByLabel('Giao diện',{exact:true}).selectOption(theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.getByLabel('Chiều tàu',{exact:true}).selectOption('arrival');await page.getByLabel('Kỳ theo dõi',{exact:true}).selectOption('quarter');await page.getByRole('button',{name:'Xem tổng quan',exact:true}).click();
 await expect(page.getByLabel('Chiều tàu',{exact:true})).toHaveValue('arrival');await expect(page.getByLabel('Kỳ theo dõi',{exact:true})).toHaveValue('quarter');
 const link=await page.locator('[data-ticker="VGR"] .north-ticker').getAttribute('href');expect(link).toContain('plan_direction=arrival');expect(link).toContain('plan_period=quarter');
 await page.screenshot({path:`test-results/north-${info.project.name}.png`,fullPage:true});
 await request.post('http://127.0.0.1:54329/__plans',{data:{days:[]}});await page.reload();await expect(page.locator('tbody tr')).toHaveCount(9);await expect(page.getByText('Kỳ chưa đủ DWT',{exact:true})).toHaveCount(9);
 const empty=await(await request.get('/api/v1/industries/ports/north')).json();expect(empty.rows.every((r:{metric:unknown})=>r.metric===null)).toBe(true);expect(empty.ready_rows).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
