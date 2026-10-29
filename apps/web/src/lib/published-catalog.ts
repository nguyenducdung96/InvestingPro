import type {Transport} from '@invest/db';
import type {EditorialEdition} from '@invest/domain';

// Product scope, independent of whether a historical catalog fact was verified.
// TCL was withdrawn on 2026-10-30 after the official-source feasibility review.
const withdrawnCompanyId='009b5929-253c-5b10-8d75-22b9828c93ae';
export function isPublishedCompany(key:string){return !['TCL',withdrawnCompanyId.toUpperCase()].includes(key.toUpperCase());}

export function publishedCatalogTransport(transport:Transport):Transport{
 return {...transport,async read(schema,table,query){
  const parameters=new URLSearchParams(query);
  const exclusion=schema==='catalog'&&table==='entities'?`id.neq.${withdrawnCompanyId}`:schema==='catalog'&&table==='company_listings'?'ticker.neq.TCL':null;
  if(exclusion){
   const and=parameters.get('and');
   parameters.set('and',`(${exclusion}${and?`,${and.slice(1,-1)}`:''})`);
  }
  const rows=await transport.read(schema,table,parameters);
  if(schema==='port'&&table==='editorial_catalog_editions')return rows.map(row=>{
   const edition=row as unknown as EditorialEdition;
   return {...edition,entries:edition.entries.filter(c=>isPublishedCompany(c.ticker)&&isPublishedCompany(c.company_id))};
  }) as typeof rows;
  return rows;
 }};
}
