import {expect,it} from 'vitest';
import type {PortCall,CallCoverage} from '@invest/domain';
import {callQuality} from '../packages/modules/port/src/call-quality';
import {CALL_SOURCES} from '../packages/modules/port/src/calls';

it('counts events on Vietnam dates and does not fill missing days or DWT with zero',()=>{
 const rows=[{source_area:'quangtri-cua-viet',event_kind:'reported',quarantine_reason:null,occurred_at:'2026-10-16T18:00:00Z',direction:'arrival',dwt:1234},
  {source_area:'quangtri-cua-viet',event_kind:'reported',quarantine_reason:null,occurred_at:'2026-10-16T19:00:00Z',direction:'departure',dwt:null}] as PortCall[];
 const coverage=[{source_area:'quangtri-cua-viet',event_kind:'reported',reported_day:'2026-10-17'}] as CallCoverage[];
 const [q]=callQuality('2026-10-16','2026-10-18',rows,coverage,'quangtri-cua-viet');
 expect(q.eventWindow).toEqual({from:'2026-10-17',to:'2026-10-17'});
 expect(q.missingReportDays).toEqual(['2026-10-16','2026-10-18']);
 expect(q.dwtCoverageRatio).toBe(0.5);
 expect(q.daily[0].arrivals).toBeNull();expect(q.daily[1]).toMatchObject({arrivals:1,departures:1,eventsWithDwt:1});
});

it('excludes snapshots and quarantine and keeps absent event data explicit for every connector',()=>{
 const rows=[{source_area:'cantho-ct',event_kind:'in_port',dwt:100},
 {source_area:'quangtri-cua-viet',event_kind:'reported',quarantine_reason:'invalid_or_missing_time',dwt:100}] as PortCall[];
 const quality=callQuality('2026-10-17','2026-10-17',rows,[],undefined,true);
 expect(quality).toHaveLength(CALL_SOURCES.length);
 expect(quality.every(q=>q.eventCount===0&&q.dwtCoverageRatio===null&&!q.complete&&q.truncated)).toBe(true);
 expect(quality.find(q=>q.sourceArea==='cantho-ct')?.status).toBe('snapshot_only');
 expect(quality.find(q=>q.sourceArea==='quangtri-cua-viet')?.status).toBe('missing');
});

it('does not infer zero arrivals from an empty notice on a report date',()=>{
 const coverage=[{source_area:'quangtri-cua-viet',event_kind:'reported',reported_day:'2026-10-17'}] as CallCoverage[];
 const [q]=callQuality('2026-10-17','2026-10-17',[],coverage,'quangtri-cua-viet');
 expect(q.daily[0]).toMatchObject({hasReport:true,arrivals:null,departures:null});
 expect(q.status).toBe('partial');
});
