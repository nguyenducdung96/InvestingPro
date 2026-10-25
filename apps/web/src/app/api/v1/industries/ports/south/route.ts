import {loadSouthOverview} from '@/lib/south-plans';
export const dynamic='force-dynamic';
export async function GET(request:Request){return Response.json(loadSouthOverview(Object.fromEntries(new URL(request.url).searchParams)),{headers:{'Cache-Control':'no-store'}});}
