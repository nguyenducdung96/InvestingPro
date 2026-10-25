import {dungquatActivitySeries,dungquatEvents,dungquatHistory,validPlanDate} from '@invest/port';

export async function GET(request:Request){
 const query=new URL(request.url).searchParams,direction=query.get('direction')??'arrival',day=query.get('day');
 if(!['arrival','departure'].includes(direction)||(day&&!validPlanDate(day)))return Response.json({error:'Invalid Dung Quat query'},{status:400});
 const now=new Date(),series=dungquatActivitySeries(dungquatHistory.events,direction as 'arrival'|'departure',now);
 return Response.json({data:day?dungquatEvents(dungquatHistory.events,now).filter(e=>e.day===day&&e.kind===direction):series,quality:dungquatHistory.quality});
}
