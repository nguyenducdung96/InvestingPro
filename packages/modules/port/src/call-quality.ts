import type {CallCoverage, PortCall} from '@invest/domain';
import {CALL_SOURCES} from './calls';
import {isBerthCallSource} from './call-movements';
const vietnamDay=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'});

// Notice coverage is evidence of a report, not evidence that every event was captured.
export function callQuality(from:string,to:string,rows:PortCall[],coverage:CallCoverage[],area?:string,truncated=false){
 const days:string[]=[];
 for(let t=Date.parse(from);t<=Date.parse(to);t+=86400000)days.push(new Date(t).toISOString().slice(0,10));
 const sources=CALL_SOURCES.filter(s=>!area||s.id===area);
 return sources.map(source=>{
  const notices=coverage.filter(c=>c.source_area===source.id&&c.event_kind==='reported');
  const reported=new Set(notices.map(c=>c.reported_day));
  const events=rows.filter(r=>r.source_area===source.id&&r.event_kind==='reported'&&!r.quarantine_reason);
  const eventDay=(r:PortCall)=>r.occurred_at?vietnamDay.format(new Date(r.occurred_at)):r.time_day;
  const dated=events.map(r=>({row:r,day:eventDay(r)}));
  const withDwt=events.filter(r=>r.dwt!==null).length;
  return {sourceArea:source.id,label:source.label,dataKind:source.kind,movementScope:isBerthCallSource(source.id)?'berth':'port',
   status:source.kind==='in_port'?'snapshot_only':notices.length?'partial':'missing',
   reportedDays:days.filter(d=>reported.has(d)),missingReportDays:days.filter(d=>!reported.has(d)),
   eventWindow:events.length?{from:dated.map(r=>r.day).filter((d):d is string=>!!d).sort().at(0)??null,to:dated.map(r=>r.day).filter((d):d is string=>!!d).sort().at(-1)??null}:null,
   eventCount:events.length,eventsWithDwt:withDwt,dwtCoverageRatio:events.length?withDwt/events.length:null,
   truncated,complete:false,
   daily:days.map(day=>{
    const matches=dated.filter(r=>r.day===day).map(r=>r.row);
    // A report can include earlier events, so its date does not certify zero events on that date.
    return {day,hasReport:reported.has(day),arrivals:matches.length?matches.filter(r=>r.direction==='arrival').length:null,
     departures:matches.length?matches.filter(r=>r.direction==='departure').length:null,eventsWithDwt:matches.length?matches.filter(r=>r.dwt!==null).length:null};
   }),
  };
 });
}
