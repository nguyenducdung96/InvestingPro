import {southPlansResponse} from '@/lib/south-plans-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return southPlansResponse(request,'SWC');}
