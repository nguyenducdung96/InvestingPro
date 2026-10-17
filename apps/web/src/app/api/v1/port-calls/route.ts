import {callRange,callReport} from '@/lib/calls';
import {InputError} from '@invest/port';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const {from,to}=callRange(Object.fromEntries(new URL(request.url).searchParams));return Response.json(await callReport(from,to),{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:e instanceof InputError?e.message:'Không tải được dữ liệu hoạt động.'},{status:e instanceof InputError?400:503});}}
