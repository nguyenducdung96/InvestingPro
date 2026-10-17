import type {EditorialCompany} from '@invest/domain';
const keys=(o:Record<string,unknown>,allowed:string[])=>Object.keys(o).every(k=>allowed.includes(k));
const text=(x:unknown,max=300):x is string=>typeof x==='string'&&x.length>0&&x.length<=max;
const list=(x:unknown):x is string[]=>Array.isArray(x)&&x.length<=100&&x.every(v=>text(v));
export function editorialEntries(input:unknown):EditorialCompany[] {
 const obj=input as {schema?:unknown;entries?:unknown};
 if(!obj||obj.schema!=='slice1-editorial-facts-v1'||!Array.isArray(obj.entries)||obj.entries.length!==41)throw new Error('Exact scope required');
 for(const row of obj.entries){
  if(!row||!keys(row,['ticker','company_id','name','market_as_reported','period','source','assets','research_paths'])||!text(row.ticker,12)||!/^[A-Z0-9]+$/.test(row.ticker)||!text(row.company_id,36)||!text(row.name)||!['HOSE','HNX','UPCoM'].includes(row.market_as_reported)||row.period!=='2025-12-31')throw new Error('Invalid identity');
  if(!row.source||!keys(row.source,['url','sha256','pages'])||!text(row.source.url,2000)||!/^https:\/\//.test(row.source.url)||!/^[a-f0-9]{64}$/.test(row.source.sha256)||!Array.isArray(row.source.pages)||!row.source.pages.length||!row.source.pages.every((p:unknown)=>Number.isInteger(p)&&Number(p)>0))throw new Error('Invalid source');
  if(!Array.isArray(row.assets)||row.assets.length>100||!Array.isArray(row.research_paths)||row.research_paths.length>100)throw new Error('Invalid facts');
  for(const a of row.assets){if(!a||!keys(a,['name','kind','role','via','berth_scope','scope_group','started_on','documented_date','date_basis'])||!text(a.name)||!['port','terminal','berth','river_port','icd'].includes(a.kind)||!text(a.role,80)||!list(a.via)||!list(a.berth_scope)||!['main','supplementary_industrial_base'].includes(a.scope_group)||![a.started_on,a.documented_date].every(d=>d===null||typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d))||!(a.date_basis===null||text(a.date_basis,200)))throw new Error('Invalid asset');}
  for(const p of row.research_paths)if(!p||!keys(p,['ticker','asset'])||!text(p.ticker,12)||!text(p.asset))throw new Error('Invalid research path');
 }
 if(new Set(obj.entries.map(x=>x.ticker)).size!==41||obj.entries.reduce((n,x)=>n+x.assets.length,0)!==63)throw new Error('Incomplete scope');
 return obj.entries;
}
