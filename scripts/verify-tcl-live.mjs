import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const base=process.env.TCL_VERIFY_BASE??'https://investing-pro-web-staging.tuyenkinhmon88.workers.dev';
const source=await readFile(new URL('../packages/modules/port/src/tcl-berth-data.ts',import.meta.url),'utf8');
const expected=JSON.parse(source.split('export const tclBerthData=')[1].split(' satisfies ')[0]);
const get=async(path)=>{const r=await fetch(base+path,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);return r.json();};
const checks=[];
for(const direction of ['arrival','departure']){
 const result=await get('/api/v1/companies/TCL/activity?direction='+direction),series=result.berth_activity;
 assert.equal(result.metadata.last_success,expected.metadata.last_success,'Deployed edition differs');
 assert.equal(series.movement_scope,'berth');assert.equal(series.actual_verified,false);assert.equal(series.dwt_available,false);
 const events=expected.events.filter(e=>e.direction===direction&&e.day<=series.cutoff);
 for(const period of series.months){const rows=events.filter(e=>e.day.startsWith(period.period));assert.equal(period.current.observed_days?period.current.known_rows:null,rows.length||null);assert.equal(period.current.observed_dwt,null);}
 const day=events.at(-1)?.day;if(day){const detail=await get(`/api/v1/companies/TCL/activity?direction=${direction}&day=${day}`);assert.deepEqual(detail.events.map(e=>e.key).sort(),events.filter(e=>e.day===day).map(e=>e.key).sort());assert.ok(detail.events.every(e=>e.site_id==='TNT'&&!e.raw_time.startsWith('EST:')&&e.dwt===null));}
 const overview=await get('/api/v1/industries/ports/south?direction='+direction+'&period='+series.cutoff.slice(0,7));
 const row=overview.rows.find(r=>r.ticker==='TCL');assert.equal(row.semantics,'operator_reported_berth_activity');assert.deepEqual(row.metric,series.months.find(m=>m.period===series.cutoff.slice(0,7))??null);assert.equal(overview.regional_total,null);
 checks.push({direction,rows:events.length,day,cutoff:series.cutoff});
}
const reference=await get('/api/v1/companies/TCL/activity?asset=tcl');assert.equal(reference.reference_figures[0].value,200000);assert.equal(reference.reference_figures[0].additive,false);assert.equal(reference.reference_figures[0].observation_month,null);
assert.equal((await get('/api/v1/companies/TCL/activity?asset=tcl_cat_lai')).berth_activity,null);
const response=await fetch(base+'/companies/TCL',{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('200.000'));assert.ok(html.includes('chưa có tháng chung'));assert.ok(html.includes('eport.tcis.co/Ships'));
const receipt={verified_at:new Date().toISOString(),base_url:base,last_success:expected.metadata.last_success,source_sha256:expected.metadata.snapshots.at(-1).sha256,checks,ui_readback_verified:true,scheduled_refresh_verified:false};
await mkdir(new URL('../.local/tcl/',import.meta.url),{recursive:true});await writeFile(new URL('../.local/tcl/live-readback.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
