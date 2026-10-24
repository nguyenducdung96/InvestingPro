import {loadNorthOverview} from '@/lib/north-overview';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'no-store'};
 try{return Response.json(await loadNorthOverview(Object.fromEntries(new URL(request.url).searchParams)),{headers});}
 catch{return Response.json({error:'Chưa tải được tổng quan phía Bắc.'},{status:503,headers});}
}
