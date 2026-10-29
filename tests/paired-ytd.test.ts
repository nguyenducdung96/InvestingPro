import {expect,it} from 'vitest';
import {tanvuPlanSeries,type TanVuPlanDay,throughputSeries,type ThroughputFact} from '@invest/port';
import {pairedYtd,pairedMonthLabel} from '../apps/web/src/lib/paired-ytd';
const day=(date:string,dwt:number|null,rows=1):TanVuPlanDay=>({report_day:date,version_id:'v',source_sha256:null,source_url:null,parser_version:null,last_success:null,last_attempt:date,source_error:null,arrival_rows:rows,departure_rows:rows,arrival_dwt:dwt,departure_dwt:dwt,arrival_dwt_missing:dwt===null?rows:0,departure_dwt_missing:dwt===null?rows:0,ambiguous_groups:0,source_empty_sections:[]});
const series=(days:TanVuPlanDay[])=>tanvuPlanSeries(days,'departure',new Date('2026-10-30T01:00:00+07:00'));
it('excludes months before the prior year starts and pairs partial cutoffs without mutating full YTD',()=>{
 const s=series([day('2026-01-01',1000),day('2025-05-01',10),day('2026-05-01',20),day('2025-10-29',30),day('2025-10-30',999),day('2026-10-29',60)]);
 const p=pairedYtd(s,'2026');expect(p.current.observed_dwt).toBe(80);expect(p.prior.observed_dwt).toBe(40);expect(p.yoy.dwt).toBe(100);
 expect(p.current.known_rows).toBe(2);expect(p.prior.known_rows).toBe(2);expect(pairedMonthLabel(s,'2026')).toBe('T5, T10');expect(p.prior.through).toBe('2025-10-29');expect(s.ytd.current.observed_dwt).toBe(1080);
});
it('skips internal and asymmetric gaps; keeps incomplete recorded contributions',()=>{
 const s=series([day('2025-05-01',10),day('2026-05-01',20),day('2026-06-01',500),day('2025-07-01',500),day('2025-08-01',null),day('2026-08-01',200)]);
 expect(pairedYtd(s,'2026').current.observed_dwt).toBe(20);expect(pairedYtd(s,'2026').current.complete).toBe(false);
 expect(pairedMonthLabel(s,'2026','rows')).toBe('T5, T8');
});
it('keeps no common months unavailable and a zero prior baseline without growth',()=>{
 const empty=pairedYtd(series([day('2026-01-01',20)]),'2026');expect(empty.current.observed_dwt).toBeNull();expect(empty.current.observed_days).toBe(0);expect(empty.yoy.dwt).toBeNull();
 const zero=pairedYtd(series([day('2025-05-01',0,0),day('2026-05-01',20)]),'2026');expect(zero.prior.observed_dwt).toBe(0);expect(zero.yoy.dwt).toBeNull();
});
it('pairs historical years independently of the latest year',()=>{
 const s=series([day('2024-05-01',10),day('2025-05-01',30),day('2026-05-01',100)]);expect(pairedYtd(s,'2025').yoy.dwt).toBe(200);
});
it('pairs published throughput months independently for each metric',()=>{
 const fact=(period:string,cargo_tonnes:number|null,container_teu:number|null)=>({period,cargo_tonnes,container_teu} as ThroughputFact);
 const s=throughputSeries([fact('2025-05',10,2),fact('2026-05',20,null),fact('2026-06',999,999),fact('2025-08',30,3),fact('2026-08',60,6)]);
 expect(s.ytd.cargo_tonnes).toMatchObject({paired_months:[5,8],current:80,prior:40,yoy_pct:100});expect(s.ytd.container_teu?.paired_months).toEqual([8]);
});
