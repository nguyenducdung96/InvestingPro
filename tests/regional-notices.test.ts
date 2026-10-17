import {expect,it,vi} from 'vitest';
import {parseCallSource} from '../packages/modules/port/src/calls';
import {fetchPublicAnchorage,publicAnchorageData} from '../packages/modules/port/src/public-anchorage';
const tr=(cells:string[])=>`<tr>${cells.map(v=>`<td>${v}</td>`).join('')}</tr>`;
const table=(direction:string,cells:string[],timeHeader:string)=>`<table>${tr([`THÔNG BÁO TÀU ${direction} CẢNG`])}${tr(['Tên tàu','Quốc tịch','GT','DWT',...(cells.length===11?['LOA','Mớn nước','Số thuyền viên']:[]),timeHeader,...(cells.length===11?['Cảng rời','Hàng hóa','Đại lý']:['Cảng đích','Hàng hóa','Đại lý'])])}${tr(cells)}</table>`;
function notice(day='16/10/2026',rawTime='16/10/2026'){
 return `<li>1. Thông báo tàu đến và tàu rời ngày ${day}</li><li>${table('ĐẾN',['SYNTHETIC REGIONAL SHIP','VN','100','1.234','80','3','redacted',rawTime,'NIL','NIL','NIL'],'Ngày đến')}${table('RỜI',['SYNTHETIC REGIONAL SHIP','VN','100','1234','16/10/2026 18:30','NIL','NIL','NIL'],'Ngày rời')}</li>`;
}
it('keeps day-only actual notices and never consumes a following position table as departures',async()=>{
 const raw=`<title>KHU VỰC HÒN LA - CVHHQTI</title>${notice()}<li>2. Vị trí tàu tại cảng ngày 15/10/2026</li><table>${tr(['SHOULD NOT BE A CALL','VN','1','1','15/10/2026','X','X','X'])}</table>`;
 const p=await parseCallSource(raw,'quangtri-hon-la','2026-10-17T14:00:00Z');
 expect(p.rows).toHaveLength(2);expect(p.reported_days).toEqual(['2026-10-16']);
 expect(p.rows[0]).toMatchObject({occurred_at:null,time_day:'2026-10-16',dwt:1234,gt:100,quarantine_reason:null});
 expect(p.rows[1].occurred_at).toBe('2026-10-16T18:30:00+07:00');
});
it('excludes future headings and quarantines missing years instead of inventing dates',async()=>{
 const raw=`<title>KHU VỰC CỬA GIANH - CVHHQTI</title>${notice('18/10/2026')}${notice('16/10/2026','16/10')}`;
 const p=await parseCallSource(raw,'quangtri-cua-gianh','2026-10-17T14:00:00Z');
 expect(p.rows).toHaveLength(2);expect(p.reported_days).toEqual(['2026-10-16']);
 expect(p.rows[0].quarantine_reason).toBe('invalid_or_missing_time');
 await expect(parseCallSource(raw,'quangtri-hon-la','2026-10-17T14:00:00Z')).rejects.toThrow('area');
});
it('accepts only observed public path aliases on the exact authority origin',async()=>{
 const request=vi.fn<typeof fetch>();
 request.mockResolvedValueOnce(new Response(JSON.stringify({user:{maritimeCode:'12'},getVmaScheduleAnchorage_Port_URL:'http://123.30.27.14/public-kh;jsessionid=guest?p_p_id=vma_WAR_TichHopGiaoThongportlet&p_p_resource_id=vma_schedule_anchorage_port'})));
 request.mockResolvedValueOnce(new Response('{"total":0,"data":[]}'));
 expect(await fetchPublicAnchorage('thaibinh-open-anchorage',request)).toBe('{"total":0,"data":[]}');
 expect(new URL(String(request.mock.calls[1][0])).pathname).toBe('/public-kh;jsessionid=guest');
 request.mockReset();
 request.mockResolvedValueOnce(new Response(JSON.stringify({user:{maritimeCode:'12'},getVmaScheduleAnchorage_Port_URL:'http://123.30.27.14/group/private?p_p_id=vma_WAR_TichHopGiaoThongportlet&p_p_resource_id=vma_schedule_anchorage_port'})));
 await expect(fetchPublicAnchorage('thaibinh-open-anchorage',request)).rejects.toThrow('destination');
 expect(request).toHaveBeenCalledTimes(1);
});
it('reads every bounded API page and rejects duplicate rows or changed totals',async()=>{
 const first={total:501,data:Array.from({length:500},(_,i)=>({vmaScheduleAnchorageId:i+1}))};
 const second={total:501,data:[{vmaScheduleAnchorageId:501}]};
 const request=vi.fn<typeof fetch>();
 request.mockResolvedValueOnce(Response.json({user:{maritimeCode:'12'},getVmaScheduleAnchorage_Port_URL:'http://123.25.204.166/public-kh?p_p_id=vma_WAR_TichHopGiaoThongportlet&p_p_resource_id=vma_schedule_anchorage_port'}));
 request.mockResolvedValueOnce(Response.json(first));request.mockResolvedValueOnce(Response.json(second));
 const raw=await fetchPublicAnchorage('dongnai-open-anchorage',request);
 expect(publicAnchorageData(raw).data).toHaveLength(501);
 expect(new URL(String(request.mock.calls[2][0])).searchParams.get('start')).toBe('500');
 const duplicate=JSON.stringify({format:'public-anchorage-pages-v1',pages:[JSON.stringify(first),JSON.stringify({total:501,data:[{vmaScheduleAnchorageId:1}]})]});
 expect(()=>publicAnchorageData(duplicate)).toThrow('Duplicate');
 const changed=JSON.stringify({format:'public-anchorage-pages-v1',pages:[JSON.stringify(first),JSON.stringify({...second,total:502})]});
 expect(()=>publicAnchorageData(changed)).toThrow('changed');
});
