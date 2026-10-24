import {expect,it} from 'vitest';
import {aggregateBerthPlanDays,issuerPlanAssets,issuerPlanSeries,vscBerths,type TanVuPlanDay} from '@invest/port';
const day=(value:number,hash='a'.repeat(64)):TanVuPlanDay=>({report_day:'2026-10-01',version_id:'id',source_sha256:hash,source_url:null,parser_version:null,last_success:null,last_attempt:'2026-10-24T00:00:00Z',source_error:null,arrival_rows:1,departure_rows:1,arrival_dwt:value,departure_dwt:value,arrival_dwt_missing:0,departure_dwt_missing:0,ambiguous_groups:0,source_empty_sections:[]});
it('uses one physical VIP Green dataset for VGR and VSC and rejects cross-issuer scopes',()=>{
 expect(issuerPlanAssets('VGR','vgr')).toEqual(['vip_green_port']);
 expect(issuerPlanAssets('VGR','vip_green_port')).toEqual(['vip_green_port']);
 expect(issuerPlanAssets('VSC','vsc')).toEqual(Object.keys(vscBerths));
 expect(()=>issuerPlanAssets('VGR','green_port')).toThrow();
 const a=issuerPlanSeries([day(100)],'VGR','vgr','departure',new Date('2026-10-02T01:00Z'));
 const b=issuerPlanSeries([day(100)],'VSC','vip_green_port','departure',new Date('2026-10-02T01:00Z'));
 expect(a.months).toEqual(b.months);
});
it('requires every VSC berth head on the same source revision and never duplicates VIP Green',()=>{
 const assets=Object.keys(vscBerths),groups=Object.fromEntries(assets.map((a,i)=>[a,[day((i+1)*100)]]));
 const total=aggregateBerthPlanDays(groups,assets,'VSC')[0];
 expect(total.departure_rows).toBe(4);expect(total.departure_dwt).toBe(1000);
 expect(aggregateBerthPlanDays({...groups,green_port:[]},assets,'VSC')[0].version_id).toBeNull();
 expect(aggregateBerthPlanDays({...groups,green_port:[day(100,'b'.repeat(64))]},assets,'VSC')[0].version_id).toBeNull();
 expect(aggregateBerthPlanDays({...groups,green_port:[{...day(100),departure_dwt:null,departure_dwt_missing:1}]},assets,'VSC')[0].departure_dwt).toBeNull();
});

it('keeps GMD regional scope and the three other Hai Phong issuer scopes independent',()=>{
 for(const [ticker,asset] of [['GMD','nam_dinh_vu'],['HAH','hai_an'],['DXP','doan_xa'],['PSP','ptsc_dinh_vu']] as const){
  expect(issuerPlanAssets(ticker,ticker.toLowerCase())).toEqual([asset]);
  expect(issuerPlanAssets(ticker,asset)).toEqual([asset]);
  expect(()=>issuerPlanAssets(ticker,'vip_green_port')).toThrow();
  const total=issuerPlanSeries([day(100)],ticker,ticker.toLowerCase(),'departure',new Date('2026-10-02T01:00Z'));
  const single=issuerPlanSeries([day(100)],ticker,asset,'departure',new Date('2026-10-02T01:00Z'));
  expect(total.months).toEqual(single.months);
  if(ticker==='GMD'){expect(total.name).toContain('Hải Phòng');expect(total.scope_note).toContain('Chưa phải tổng hoạt động GMD toàn quốc');}
 }
});

it('keeps CQN berth plans separate from port arrival/departure series',()=>{
 expect(issuerPlanAssets('CQN','cqn')).toEqual(['cqn_cai_lan']);
 expect(()=>issuerPlanAssets('CQN','nam_dinh_vu')).toThrow();
 const a=issuerPlanSeries([day(100)],'CQN','cqn','arrival',new Date('2026-10-02T01:00Z'));
 const b=issuerPlanSeries([day(100)],'CQN','cqn_cai_lan','arrival',new Date('2026-10-02T01:00Z'));
 expect(a.months).toEqual(b.months);expect(a.semantics).toBe('authority_published_berth_plan');
 expect(a.movement_scope).toBe('berth');expect(a.includes_internal_transfers).toBe(true);
 expect(a.actual_verified).toBe(false);expect(a.scope_note).toContain('Chưa xác định nhãn bến tạm');
});
