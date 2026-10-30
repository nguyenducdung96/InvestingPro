import type {Transport} from '@invest/db';
import type {EditorialEdition} from '@invest/domain';

// Product scope, independent of whether a historical catalog fact was verified.
// Withdrawn from port monitoring; research evidence remains stored separately.
const withdrawnCompanies=[{ticker:'TCL',id:'009b5929-253c-5b10-8d75-22b9828c93ae'},{ticker:'TCW',id:'a251ebfd-2516-5067-99f7-91dce6623f7b'}];
export function isPublishedCompany(key:string){return !withdrawnCompanies.some(c=>c.ticker===key.toUpperCase()||c.id.toUpperCase()===key.toUpperCase());}

export function publishedCatalogTransport(transport:Transport):Transport{
 return {...transport,async read(schema,table,query){
  const parameters=new URLSearchParams(query);
  const exclusion=schema==='catalog'&&table==='entities'?withdrawnCompanies.map(c=>`id.neq.${c.id}`).join(','):schema==='catalog'&&table==='company_listings'?withdrawnCompanies.map(c=>`ticker.neq.${c.ticker}`).join(','):null;
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
