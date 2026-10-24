import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
test('CQN shows a cited port, overview, honest berth semantics and internal movement detail',async({page,request})=>{
 const manifest=JSON.parse(readFileSync('docs/catalog-review/cqn-berth-scope-20261024.json','utf8'));
 const tickers=['CQN'];
 await request.post('http://127.0.0.1:54329/__throughput',{data:[]});
 await request.post('http://127.0.0.1:54329/__berths',{data:tickers.map(ticker=>({id:ticker,ticker,observed_on:'2026-10-24',published_at:new Date().toISOString(),entries:manifest.entries}))});
 const cutoff=new Date(Date.parse(new Date(Date.now()+7*3600000).toISOString().slice(0,10))-86400000).toISOString().slice(0,10),month=cutoff.slice(0,7),through=Number(cutoff.slice(8));
 const days=tickers.flatMap((t,i)=>Array.from({length:through},(_,n)=>({asset_code:manifest.entries[0].asset_code,report_day:`${month}-${String(n+1).padStart(2,'0')}`,version_id:t,source_sha256:'a'.repeat(64),source_url:'https://kht1.cangvuhanghaiquangninh.gov.vn/',parser_version:'test-only',last_success:new Date().toISOString(),last_attempt:new Date().toISOString(),source_error:null,arrival_rows:1,departure_rows:1,arrival_dwt:(i+1)*100,departure_dwt:(i+1)*100,arrival_dwt_missing:0,departure_dwt_missing:0,ambiguous_groups:0,source_empty_sections:[]})));
 const details=tickers.map((t,i)=>({asset_code:manifest.entries[0].asset_code,report_day:cutoff,source_sha256:'a'.repeat(64),events:[{direction:'departure',vessel_name:'TEST '+t,planned_time:'08:30',dwt:(i+1)*100,from_berth:'Cầu 1 - Cái Lân',to_berth:'HG7-1',plan_kind:'internal'}]}));
 const prior=days.map((d,i)=>({...d,report_day:`${Number(month.slice(0,4))-1}${d.report_day.slice(4)}`,departure_dwt:i===0?null:d.departure_dwt,departure_dwt_missing:i===0?1:0}));
 await request.post('http://127.0.0.1:54329/__plans',{data:{days:[...days,...prior],details}});
 for(const [i,ticker] of tickers.entries()){
  const asset=manifest.entries[0].asset_code;
  await page.goto('/companies/'+ticker);
  const region=page.getByRole('region',{name:'Lịch điều động '+ticker,exact:true}),scope=page.getByRole('region',{name:'Các bến liên quan '+ticker,exact:true}),select=region.getByLabel('Bến theo dõi',{exact:true});
  await expect(scope.locator('article')).toHaveCount(1);await expect(select).toHaveValue(ticker.toLowerCase());
  await expect(region.getByText('TEST '+ticker,{exact:true})).toBeVisible();
  const total=await(await request.get(`/api/v1/companies/${ticker}/plans`)).json();expect(total.months.at(-1).current.dwt).toBe(through*(i+1)*100);
  expect(total.semantics).toBe('authority_published_berth_plan');expect(total.movement_scope).toBe('berth');expect(total.includes_internal_transfers).toBe(true);
  expect(total.months.at(-1).prior.dwt).toBeNull();expect(total.months.at(-1).yoy.dwt).toBeNull();
  await expect(region.getByRole('heading',{name:'Lượt cập/rời cầu và trọng tải theo kế hoạch'})).toBeVisible();
  await expect(region.getByText('Điều chuyển nội cảng',{exact:true})).toBeVisible();
  await expect(region.locator('.notice').filter({hasText:'Chưa xác định nhãn bến tạm'})).toBeVisible();
  await expect(region.getByText('Nền cùng kỳ thiếu DWT ở 1 lượt theo lịch.',{exact:true})).toBeVisible();
  expect((await request.get('/api/v1/companies/CQN/plans?day=2026-02-30')).status()).toBe(400);

  await select.selectOption(asset);await region.getByRole('button',{name:'Xem bến',exact:true}).click();
  await expect(select).toHaveValue(asset);
  const single=await(await request.get(`/api/v1/companies/${ticker}/plans?asset=${asset}`)).json();expect(single.months).toEqual(total.months);expect(single.ytd).toEqual(total.ytd);
  await region.getByLabel('Chiều tàu',{exact:true}).selectOption('arrival');await region.getByLabel('Kỳ',{exact:true}).selectOption('quarter');await region.getByRole('button',{name:'Xem lịch',exact:true}).click();
  await select.selectOption(ticker.toLowerCase());await region.getByRole('button',{name:'Xem bến',exact:true}).click();
  await expect(region.getByLabel('Chiều tàu',{exact:true})).toHaveValue('arrival');await expect(region.getByLabel('Kỳ',{exact:true})).toHaveValue('quarter');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await request.get(`/api/v1/companies/${ticker}/plans?asset=vip_green_port`)).status()).toBe(400);
  const revised=days.map(d=>({...d,arrival_dwt:200}));await request.post('http://127.0.0.1:54329/__plans',{data:{days:revised,details}});
  const refreshed=await(await request.get('/api/v1/companies/CQN/plans?direction=arrival')).json();expect(refreshed.months.at(-1).current.dwt).toBe(through*200);
 }
 await request.post('http://127.0.0.1:54329/__plans',{data:{days:[]}});await request.post('http://127.0.0.1:54329/__berths',{data:[]});
});
