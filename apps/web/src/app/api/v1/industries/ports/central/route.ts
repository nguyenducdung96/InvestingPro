import {loadCentralOverview} from '@/lib/central-overview';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'no-store'};
 try{return Response.json(await loadCentralOverview(Object.fromEntries(new URL(request.url).searchParams)),{headers});}
 catch{return Response.json({error:'Chưa tải được tổng quan miền Trung.'},{status:503,headers});}
}
