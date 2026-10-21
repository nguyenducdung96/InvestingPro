import {test,expect} from '@playwright/test';
test('Tan Vu plans update from DB, compare MTD, filter, drill down and fit mobile',async({page,request},info)=>{
 const cutoff=new Date(Date.parse(new Date(Date.now()+7*3600000).toISOString().slice(0,10))-86400000).toISOString().slice(0,10);
 const year=Number(cutoff.slice(0,4)),month=cutoff.slice(5,7),through=Number(cutoff.slice(8));
 const days=[year-1,year].flatMap(y=>Array.from({length:through},(_,i)=>({report_day:`${y}-${month}-${String(i+1).padStart(2,'0')}`,version_id:'test-only',source_sha256:'a'.repeat(64),source_url:'https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx?d=-1',parser_version:'haiphong-plan-pilot/1.1.0',last_success:new Date().toISOString(),last_attempt:new Date().toISOString(),source_error:null,arrival_rows:1,departure_rows:1,arrival_dwt:1000,departure_dwt:y===year?1000:500,arrival_dwt_missing:0,departure_dwt_missing:0,ambiguous_groups:0,source_empty_sections:[]})));
 const details=[{report_day:cutoff,source_url:days[0].source_url,source_sha256:'a'.repeat(64),fetched_at:new Date().toISOString(),parser_version:'test-only',semantics:'authority_published_plan',events:[{direction:'departure',vessel_name:'SYNTHETIC PLAN SHIP',planned_time:'08:30',dwt:1000,from_berth:'TAN VU',to_berth:'CHINA'}]}];
 await request.post('http://127.0.0.1:54329/__throughput',{data:[]}); // synthetic PHP catalog edition
 await request.post('http://127.0.0.1:54329/__plans',{data:{days,details}});
 await page.goto('/companies/PHP#vessel-plans');
 const region=page.getByRole('region',{name:'Lịch điều động Tân Vũ',exact:true});
 await expect(region.getByRole('heading',{name:'Lượt tàu và trọng tải theo lịch công bố'})).toBeVisible();
 await expect(region.getByText('SYNTHETIC PLAN SHIP',{exact:true})).toBeVisible();
 const original=await(await request.get('/api/v1/companies/PHP/plans')).json();
 expect(original.months.at(-1).current.dwt).toBe(through*1000);
 expect(original.months.at(-1).prior.through).toBe(`${year-1}-${month}-${cutoff.slice(8)}`);
 days.at(-1)!.departure_dwt=2000;
 await request.post('http://127.0.0.1:54329/__plans',{data:{days,details}});
 expect((await(await request.get('/api/v1/companies/PHP/plans')).json()).months.at(-1).current.dwt).toBe(through*1000+1000);
 await page.reload();
 await expect(region.getByText(`${(through*1000+1000).toLocaleString('vi-VN')} DWT`,{exact:true}).first()).toBeVisible();
 await region.getByLabel('Chiều tàu',{exact:true}).selectOption('arrival');
 await region.getByLabel('Kỳ',{exact:true}).selectOption('quarter');
 await region.getByRole('button',{name:'Xem lịch',exact:true}).click();
 await expect(region.getByText(/Tàu vào ·/).first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/tanvu-plans-${info.project.name}.png`,fullPage:true});
 expect((await request.get('/api/v1/companies/PHP/plans?day=2026-02-31')).status()).toBe(400);
 await request.post('http://127.0.0.1:54329/__plans',{data:{days:[]}});
});
