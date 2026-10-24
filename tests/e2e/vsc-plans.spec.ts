import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
test('VGR and VSC show sourced ports, shared VIP data and complete issuer overview on desktop/mobile',async({page,request})=>{
 const mapping=JSON.parse(readFileSync('docs/catalog-review/vsc-vgr-berth-scope-20261024.json','utf8'));
 await request.post('http://127.0.0.1:54329/__throughput',{data:[]});
 await request.post('http://127.0.0.1:54329/__berths',{data:['VGR','VSC'].map(ticker=>({id:ticker,ticker,observed_on:'2026-10-24',published_at:new Date().toISOString(),entries:mapping[ticker]}))});
 const cutoff=new Date(Date.parse(new Date(Date.now()+7*3600000).toISOString().slice(0,10))-86400000).toISOString().slice(0,10),month=cutoff.slice(0,7),through=Number(cutoff.slice(8));
 const assets=['green_port','vip_green_port','nam_hai_dinh_vu','vimc_dinh_vu'];
 const days=assets.flatMap((asset_code,i)=>Array.from({length:through},(_,n)=>({asset_code,report_day:`${month}-${String(n+1).padStart(2,'0')}`,version_id:asset_code,source_sha256:'a'.repeat(64),source_url:'https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx?d=-1',parser_version:'test-only',last_success:new Date().toISOString(),last_attempt:new Date().toISOString(),source_error:null,arrival_rows:1,departure_rows:1,arrival_dwt:(i+1)*100,departure_dwt:(i+1)*100,arrival_dwt_missing:0,departure_dwt_missing:0,ambiguous_groups:0,source_empty_sections:[]})));
 const details=assets.map((asset_code,i)=>({asset_code,report_day:cutoff,source_sha256:'a'.repeat(64),events:[{direction:'departure',vessel_name:'TEST '+asset_code,planned_time:'08:30',dwt:(i+1)*100,from_berth:mapping.VSC[i].alias,to_berth:'CHINA'}]}));
 await request.post('http://127.0.0.1:54329/__plans',{data:{days,details}});
 for(const ticker of ['VGR','VSC']){
  await page.goto('/companies/'+ticker);
  const region=page.getByRole('region',{name:'Lịch điều động '+ticker,exact:true}),scope=page.getByRole('region',{name:'Các bến liên quan '+ticker,exact:true});
  await expect(scope.locator('article')).toHaveCount(ticker==='VGR'?1:4);
  await expect(region.getByLabel('Bến theo dõi',{exact:true})).toHaveValue(ticker.toLowerCase());
  const total=await(await request.get(`/api/v1/companies/${ticker}/plans`)).json();
  expect(total.months.at(-1).current.dwt).toBe(through*(ticker==='VGR'?200:1000));
  await expect(region.getByText('TEST vip_green_port',{exact:true})).toBeVisible();
  await region.getByLabel('Bến theo dõi',{exact:true}).selectOption('vip_green_port');await region.getByRole('button',{name:'Xem bến',exact:true}).click();
  await expect(region.getByLabel('Bến theo dõi',{exact:true})).toHaveValue('vip_green_port');
  const vip=await(await request.get(`/api/v1/companies/${ticker}/plans?asset=vip_green_port`)).json();expect(vip.months.at(-1).current.dwt).toBe(through*200);
  await region.getByLabel('Chiều tàu',{exact:true}).selectOption('arrival');await region.getByLabel('Kỳ',{exact:true}).selectOption('quarter');await region.getByRole('button',{name:'Xem lịch',exact:true}).click();
  await expect(region.getByLabel('Chiều tàu',{exact:true})).toHaveValue('arrival');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect((await request.get('/api/v1/companies/VGR/plans?asset=green_port')).status()).toBe(400);
 expect((await request.get('/api/v1/companies/VSC/plans?asset=dinh_vu')).status()).toBe(400);
 await request.post('http://127.0.0.1:54329/__plans',{data:{days:days.filter(d=>!(d.asset_code==='green_port'&&d.report_day===cutoff)),details}});
 expect((await(await request.get('/api/v1/companies/VSC/plans')).json()).months.at(-1).current.dwt).toBeNull();
 expect((await(await request.get('/api/v1/companies/VGR/plans')).json()).months.at(-1).current.dwt).toBe(through*200);
 await request.post('http://127.0.0.1:54329/__plans',{data:{days:[]}});
 await request.post('http://127.0.0.1:54329/__berths',{data:[]});
});
