import {test,expect} from '@playwright/test';
test('regional tables have one row per ticker with only that region’s recorded contributions',async({page})=>{
 await page.request.post('http://127.0.0.1:54329/__throughput',{data:[]});
 for(const direction of ['arrival','departure'])for(const frequency of ['month','quarter']){
  const period=frequency==='month'?'2026-06':'2026-Q3';
  const regional=await(await page.request.get(`/api/v1/industries/ports/south?period=${period}&frequency=${frequency}&direction=${direction}`)).json();
  expect(new Set(regional.rows.map((r:{ticker:string})=>r.ticker)).size).toBe(regional.rows.length);
  expect(regional.regional_total).toBeNull();
  for(const [ticker,scope,assets] of [['GMD','gmd_south',['gemalink','gmd_binh_duong']],['SWC','swc_all',['swc_long_binh','swc_buoys']],['SGP','sgp',['sg_hiep_phuoc','cmit','sp_psa','ssit','sg_tan_thuan','sg_tan_thuan_2']]] as const){
   const row=regional.rows.find((r:{ticker:string})=>r.ticker===ticker),parts=[];
   expect(row.asset).toBe(scope);expect(row.assets).toEqual([...assets]);
   for(const asset of assets){
    const data=await(await page.request.get(`/api/v1/companies/${ticker}/plans?asset=${asset}&direction=${direction}`)).json();
    parts.push((frequency==='month'?data.months:data.quarters).find((p:{period:string})=>p.period===period));
   }
   for(const window of ['current','prior']){
    expect(row.metric[window].known_rows).toBe(parts.reduce((n,p)=>n+p[window].known_rows,0));
    const weights=parts.map(p=>p[window].observed_dwt).filter(v=>v!==null);
    if(weights.length)expect(row.metric[window].observed_dwt).toBeCloseTo(weights.reduce((n,v)=>n+v,0),5);
    else expect(row.metric[window].observed_dwt).toBeNull();
   }
  }
 }
 await page.goto('/industries/ports/south?period=2026-10');
 for(const [ticker,scope] of [['GMD','gmd_south'],['SWC','swc_all']]){
  const row=page.locator(`tr[data-ticker="${ticker}"]`);await expect(row).toHaveCount(1);
  await row.locator('.north-ticker').click();
  await expect(page.getByLabel('Phạm vi theo dõi',{exact:true})).toHaveValue(scope);
  await page.goto('/industries/ports/south?period=2026-10');
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
