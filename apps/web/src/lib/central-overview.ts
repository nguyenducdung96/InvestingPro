import 'server-only';
import {centralOverview,northSelection,qnpAuthorityBulletins} from '@invest/port';
import {publicRepository} from './server';
export async function loadCentralOverview(query:Record<string,string|undefined>,now=new Date()){
 const repo=publicRepository(),s=northSelection(query,now);
 const results=await Promise.allSettled([[s.from,s.through],[s.priorFrom,s.priorThrough],[s.cutoff,s.cutoff]].map(([from,through])=>repo.planDaysWindow(['tien_sa'],from,through)));
 const unique=new Map(results.flatMap(r=>r.status==='fulfilled'?r.value:[]).map(d=>[d.report_day,d]));
 return {...centralOverview([...unique.values()],query,now,null,qnpAuthorityBulletins),read_errors:results.filter(r=>r.status==='rejected').length};
}
