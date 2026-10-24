import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
test('four Hai Phong issuers show cited ports, regional overview and unchanged single-port totals',async({page,request})=>{
 const manifest=JSON.parse(readFileSync('docs/catalog-review/haiphong-berth-scope-20261024.json','utf8'));
 const tickers=['GMD','HAH','DXP','PSP'];
 await request.post('http://127.0.0.1:54329/__throughput',{data:[]});
 await request.post('http://127.0.0.1:54329/__berths',{data:tickers.map(ticker=>({id:ticker,ticker,observed_on:'2026-10-24',published_at:new Date().toISOString(),entries:manifest.entries[ticker]}))});
 const cutoff=new Date(Date.parse(new Date(Date.now()+7*3600000).toISOString().slice(0,10))-86400000).toISOString().slice(0,10),month=cutoff.slice(0,7),through=Number(cutoff.slice(8));
 const days=tickers.flatMap((t,i)=>Array.from({length:through},(_,n)=>({asset_code:manifest.entries[t][0].asset_code,report_day:`${month}-${String(n+1).padStart(2,'0')}`,version_id:t,source_sha256:'a'.repeat(64),source_url:'https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx?d=-1',parser_version:'test-only',last_success:new Date().toISOString(),last_attempt:new Date().toISOString(),source_error:null,arrival_rows:1,departure_rows:1,arrival_dwt:(i+1)*100,departure_dwt:(i+1)*100,arrival_dwt_missing:0,departure_dwt_missing:0,ambiguous_groups:0,source_empty_sections:[]})));
 const details=tickers.map((t,i)=>({asset_code:manifest.entries[t][0].asset_code,report_day:cutoff,source_sha256:'a'.repeat(64),events:[{direction:'departure',vessel_name:'TEST '+t,planned_time:'08:30',dwt:(i+1)*100,from_berth:manifest.entries[t][0].alias,to_berth:'CHINA'}]}));
 await request.post('http://127.0.0.1:54329/__plans',{data:{days,details}});
 for(const [i,ticker] of tickers.entries()){
  const asset=manifest.entries[ticker][0].asset_code;
  await page.goto('/companies/'+ticker);
  const region=page.getByRole('region',{name:'Lịch điều động '+ticker,exact:true}),scope=page.getByRole('region',{name:'Các bến liên quan '+ticker,exact:true}),select=region.getByLabel('Bến theo dõi',{exact:true});
  await expect(scope.locator('article')).toHaveCount(1);await expect(select).toHaveValue(ticker.toLowerCase());
  await expect(region.getByText('TEST '+ticker,{exact:true})).toBeVisible();
  const total=await(await request.get(`/api/v1/companies/${ticker}/plans`)).json();expect(total.months.at(-1).current.dwt).toBe(through*(i+1)*100);
  if(ticker==='GMD')expect(total.name).toContain('Hải Phòng');
  await select.selectOption(asset);await region.getByRole('button',{name:'Xem bến',exact:true}).click();
  await expect(select).toHaveValue(asset);
  const single=await(await request.get(`/api/v1/companies/${ticker}/plans?asset=${asset}`)).json();expect(single.months).toEqual(total.months);expect(single.ytd).toEqual(total.ytd);
  await region.getByLabel('Chiều tàu',{exact:true}).selectOption('arrival');await region.getByLabel('Kỳ',{exact:true}).selectOption('quarter');await region.getByRole('button',{name:'Xem lịch',exact:true}).click();
  await select.selectOption(ticker.toLowerCase());await region.getByRole('button',{name:'Xem bến',exact:true}).click();
  await expect(region.getByLabel('Chiều tàu',{exact:true})).toHaveValue('arrival');await expect(region.getByLabel('Kỳ',{exact:true})).toHaveValue('quarter');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await request.get(`/api/v1/companies/${ticker}/plans?asset=vip_green_port`)).status()).toBe(400);
 }
 await request.post('http://127.0.0.1:54329/__plans',{data:{days:[]}});await request.post('http://127.0.0.1:54329/__berths',{data:[]});
});
