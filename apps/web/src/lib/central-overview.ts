import 'server-only';
import {centralOverview,northSelection,qnpAuthorityBulletins,dungquatHistory} from '@invest/port';
import {cmpBulletins,cmpHistoryMetadata} from './cmp-data';
import {napDaily,napHistoryMetadata} from './nap-data';
import {publicRepository} from './server';
export async function loadCentralOverview(query:Record<string,string|undefined>,now=new Date()){
 const repo=publicRepository(),s=northSelection(query,now);
 const results=await Promise.allSettled([[s.from,s.through],[s.priorFrom,s.priorThrough],[s.cutoff,s.cutoff]].map(([from,through])=>repo.planDaysWindow(['tien_sa'],from,through)));
 const unique=new Map(results.flatMap(r=>r.status==='fulfilled'?r.value:[]).map(d=>[d.report_day,d]));
 const data=centralOverview([...unique.values()],query,now,null,qnpAuthorityBulletins,cmpBulletins,cmpHistoryMetadata.collected_at,napDaily,napHistoryMetadata.checked_at,dungquatHistory.events);
 return {...data,rows:data.rows.map(row=>row.ticker!=='GMD'?row:{...row,updated_at:dungquatHistory.quality.last_success,source_error:dungquatHistory.quality.source_errors.map(e=>e.error).join('; ')||null}),disclosed_quality:dungquatHistory.quality,read_errors:results.filter(r=>r.status==='rejected').length};
}
