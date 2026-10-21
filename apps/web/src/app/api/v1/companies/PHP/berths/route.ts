import {publicRepository} from '@/lib/server';
export const dynamic='force-dynamic';
export async function GET(){
 try{return Response.json({data:await publicRepository().companyBerthScope()},{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Berth scope unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
