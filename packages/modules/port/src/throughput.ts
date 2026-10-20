export interface ThroughputFact {
 id: string; asset_code: string; period: string; publication_month: string;
 cargo_tonnes: number|null; container_teu: number|null;
 source_url: string; source_sha256: string; pdf_page: number;
 fetched_at: string; source_checked_at: string; source_error: string|null;
}
const metrics = ['cargo_tonnes','container_teu'] as const;
type Metric = typeof metrics[number];
export function throughputSeries(facts: ThroughputFact[]) {
 const groups = new Map<string,ThroughputFact[]>();
 for(const f of facts) {const key=f.period.slice(0,7); groups.set(key,[...(groups.get(key)??[]),f]);}
 const conflicts:string[]=[];
 const months=[...groups].sort(([a],[b])=>a.localeCompare(b)).flatMap(([period,rows])=>{
  if(rows.some(r=>metrics.some(k=>r[k]!==rows[0][k]))) {conflicts.push(period);return [];}
  return [{period,cargo_tonnes:rows[0].cargo_tonnes,container_teu:rows[0].container_teu,sources:rows}];
 });
 const lookup=new Map(months.map(m=>[m.period,m]));
 const yoy=(value:number|null,prior:number|null|undefined)=>value!==null&&prior!=null&&prior>0?(value/prior-1)*100:null;
 const monthly=months.map(m=>({...m,yoy_pct:Object.fromEntries(metrics.map(k=>[k,yoy(m[k],lookup.get(`${Number(m.period.slice(0,4))-1}${m.period.slice(4)}`)?.[k])])) as Record<Metric,number|null>}));
 const quarterKeys=[...new Set(months.map(m=>`${m.period.slice(0,4)}-Q${Math.ceil(Number(m.period.slice(5))/3)}`))];
 const quarters=quarterKeys.map(period=>{
  const year=period.slice(0,4),q=Number(period.at(-1));
  const keys=Array.from({length:3},(_,i)=>`${year}-${String((q-1)*3+i+1).padStart(2,'0')}`);
  return {period,...Object.fromEntries(metrics.map(k=>[k,keys.every(p=>lookup.get(p)?.[k]!=null)?keys.reduce((s,p)=>s+lookup.get(p)![k]!,0):null])) as Record<Metric,number|null>,missing_months:keys.filter(p=>!lookup.has(p))};
 });
 const latest=months.at(-1)?.period??null;
 const year=latest?Number(latest.slice(0,4)):null;
 const ytd=Object.fromEntries(metrics.map(k=>{
  let end=0,current=0,prior=0;
  if(year) for(let n=1;n<=Number(latest!.slice(5));n++) {
   const suffix=String(n).padStart(2,'0'),a=lookup.get(`${year}-${suffix}`)?.[k],b=lookup.get(`${year-1}-${suffix}`)?.[k];
   if(a==null||b==null)break;end=n;current+=a;prior+=b;
  }
  return [k,end?{through_month:end,current,prior,yoy_pct:yoy(current,prior)}:null];
 })) as Record<Metric,{through_month:number;current:number;prior:number;yoy_pct:number|null}|null>;
 const quarterly=quarters.map(q=>({...q,yoy_pct:Object.fromEntries(metrics.map(k=>[k,yoy(q[k],quarters.find(p=>p.period===`${Number(q.period.slice(0,4))-1}${q.period.slice(4)}`)?.[k])])) as Record<Metric,number|null>}));
 const missing:string[]=[];
 if(months.length){const first=months[0].period,start=Number(first.slice(0,4))*12+Number(first.slice(5))-1,end=Number(latest!.slice(0,4))*12+Number(latest!.slice(5))-1;for(let n=start;n<=end;n++){const key=`${Math.floor(n/12)}-${String(n%12+1).padStart(2,'0')}`;if(!lookup.has(key))missing.push(key);}}
 return {asset:'tan_vu',metric_units:{cargo_tonnes:'tonnes',container_teu:'TEU'},months:monthly,quarters:quarterly,ytd,conflicts,latest_period:latest,coverage:{reviewed_months:months.length,missing_months:missing},dwt_available:false};
}
