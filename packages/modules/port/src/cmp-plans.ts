import {tanvuPlanSeries,validPlanDate,type TanVuPlanDay,type PlanDirection} from './tanvu-plans';

export interface CmpRow {time:string;vessel:string;dwt:number|null;from:string;to:string;section:'arrival'|'departure'|'movement';raw:string[]}
export interface CmpBulletin {id:string;day:string;title:string;supplement:boolean;page:number;url:string;sha256:string;parser_version:string;sections:string[];rows:CmpRow[];rejected_rows:string[][];source_error?:string}
export const cmpScopes={cmp:'Tổng quan CMP · cầu 1 và 2',cmp_cau1:'Cầu số 1 · phía biển / phía bờ',cmp_cau2:'Cầu số 2'} as const;
export type CmpScope=keyof typeof cmpScopes;
export const isCmpScope=(s:string):s is CmpScope=>Object.hasOwn(cmpScopes,s);
export function cmpBerthScope(label:string):CmpScope|null{
 const normalized=label.normalize('NFC').replace(/\s+/g,' ').replace(/\s*-\s*/g,' - ').trim().toLocaleLowerCase('vi');
 if(normalized==='bến số 1'||/^cầu (?:cảng )?(?:số )?1(?: - tuyến mép bến phía (?:biển|bờ))?$/.test(normalized))return 'cmp_cau1';
 if(normalized==='bến số 2'||/^cầu (?:cảng )?(?:số )?2$/.test(normalized))return 'cmp_cau2';
 return null;
}
export function cmpKind(row:CmpRow){
 if(/cập mạn|hỗ trợ|mạn tàu/i.test(row.from+' '+row.to))return 'unmapped';
 const from=cmpBerthScope(row.from),to=cmpBerthScope(row.to);
 if(from&&to)return 'internal';
 if(to&&(row.section==='arrival'||row.section==='movement'))return 'arrival';
 if(from&&(row.section==='departure'||row.section==='movement'))return 'departure';
 return 'unmapped';
}
type CmpEvent=CmpRow&{source:Omit<CmpBulletin,'rows'|'rejected_rows'>;kind:ReturnType<typeof cmpKind>;conflicting_dwt:boolean};
const eventCache=new WeakMap<readonly CmpBulletin[],CmpEvent[]>();
export function cmpEvents(bulletins:readonly CmpBulletin[]){
 // Generated editions are immutable for the lifetime of a deployed module.
 // Cache frozen published arrays only; mutable fixtures are always revalidated.
 const cached=Object.isFrozen(bulletins)?eventCache.get(bulletins):undefined;if(cached)return cached;
 type Event=CmpEvent;
 const editions=new Map<string,CmpBulletin[]>();
 for(const bulletin of bulletins){
  if(!validPlanDate(bulletin.day)||bulletin.url!=='https://cangvuhanghaithuathienhue.gov.vn/index.aspx?page=law&cat=3133'||!/^[a-f0-9]{64}$/.test(bulletin.sha256)||bulletin.parser_version!=='cmp-authority-html/1.0.0')throw new Error('Invalid CMP evidence');
  const list=editions.get(bulletin.day)??[];list.push(bulletin);editions.set(bulletin.day,list);
 }
 const output:Event[]=[];
 for(const list of editions.values()){
  // The index is newest first. A supplement adds to the regular edition; exact keys collapse.
  const events=new Map<string,Event>();
  for(const bulletin of [...list].reverse()){
   const {rows,rejected_rows:_,...source}=bulletin;void _;
   for(const row of rows){
    if(!row.time.startsWith(bulletin.day+'T')||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:00\+07:00$/.test(row.time)||!row.vessel.trim()||!row.from||!row.to||row.raw.length!==10||(row.dwt!==null&&(!Number.isFinite(row.dwt)||row.dwt<=0||row.dwt>1_000_000)))throw new Error('Invalid CMP row');
    const key=JSON.stringify([row.time,row.vessel.normalize('NFC').replace(/\s+/g,' ').trim().toUpperCase(),row.from,row.to]);
    const previous=events.get(key),conflict=!!previous&&(previous.conflicting_dwt||previous.dwt!==row.dwt);
    events.set(key,{...row,dwt:conflict?null:row.dwt,source,kind:cmpKind(row),conflicting_dwt:conflict});
   }
  }
  output.push(...events.values());
 }
 output.sort((a,b)=>a.time.localeCompare(b.time));
 if(Object.isFrozen(bulletins))eventCache.set(bulletins,output);
 return output;
}
export function cmpPlanSeries(bulletins:CmpBulletin[],direction:PlanDirection='departure',now=new Date(),asset:CmpScope='cmp'){
 const events=cmpEvents(bulletins),group=new Map<string,typeof events>();
 for(const e of events){
  if(e.kind!==direction||(asset!=='cmp'&&cmpBerthScope(direction==='arrival'?e.to:e.from)!==asset))continue;
  const day=e.time.slice(0,10),items=group.get(day)??[];items.push(e);group.set(day,items);
 }
 const days:TanVuPlanDay[]=[...group].map(([report_day,rows])=>({report_day,version_id:null,source_sha256:rows.at(-1)!.source.sha256,source_url:rows.at(-1)!.source.url,parser_version:'cmp-authority-html/1.0.0',last_success:null,last_attempt:report_day+'T00:00:00+07:00',source_error:null,
  arrival_rows:null,departure_rows:null,arrival_dwt:null,departure_dwt:null,arrival_dwt_missing:null,departure_dwt_missing:null,ambiguous_groups:null,source_empty_sections:[],observed_available:true,
  [`${direction}_known_rows`]:rows.length,[`${direction}_dwt_missing`]:rows.filter(e=>e.dwt===null).length,[`${direction}_known_dwt`]:rows.some(e=>e.dwt!==null)?rows.reduce((n,e)=>n+(e.dwt??0),0):null}));
 const base=tanvuPlanSeries(days,direction,now);
 const fix=(r:typeof base.ytd.current)=>({...r,missing_dwt:days.filter(d=>d.report_day>=r.from&&d.report_day<=r.through).reduce((n,d)=>n+(d[`${direction}_dwt_missing`]??0),0)});
 const period=(p:typeof base.months[number])=>({...p,current:fix(p.current),prior:fix(p.prior)});
 return {...base,ticker:'CMP',asset,name:cmpScopes[asset],semantics:'authority_published_berth_plan',movement_scope:'berth',actual_verified:false,history_complete:false,months:base.months.map(period),quarters:base.quarters.map(period),ytd:{...base.ytd,current:fix(base.ytd.current),prior:fix(base.ytd.prior)}};
}
