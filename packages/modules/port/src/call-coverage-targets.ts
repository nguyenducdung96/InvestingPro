import {CALL_SOURCES} from './calls';
import type {CallCoverage,PortCall} from '@invest/domain';

// Transcribed from page 2, Decision 804/QD-TTg (2022-07-08).
// Preserve document names across administrative changes. These are coverage targets,
// not new canonical entities, verified ownership mappings, or completed integrations.
export const SEAPORT_COVERAGE_BASIS={
 document:'804/QĐ-TTg',effectiveOn:'2022-07-08',page:2,
 url:'https://vimawa.gov.vn/en/node/14139',
 terminalInventoryComplete:false,inlandInventoryComplete:false,offshoreInventoryComplete:false,
};
export const SEAPORT_COVERAGE_TARGETS:[string,string[]][]=[
 ['Quảng Ninh',['quangninh-in-port']],
 ['Hải Phòng',['haiphong-in-port']],
 ['Nam Định',['thaibinh-open-anchorage']],
 ['Thái Bình',['thaibinh-open-anchorage']],
 ['Thanh Hóa',[]],
 ['Nghệ An',['nghean-reported']],
 ['Hà Tĩnh',['nghean-reported']],
 ['Quảng Bình',['quangtri-hon-la','quangtri-cua-gianh','quangtri-len-bang']],
 ['Quảng Trị',['quangtri-cua-viet','quangtri-con-co','quangtri-my-thuy']],
 ['Thừa Thiên Huế',['hue-chanmay-in-port','hue-thuanan-in-port']],
 ['Đà Nẵng',[]],['Quảng Nam',[]],['Quảng Ngãi',[]],['Bình Định',[]],['Phú Yên',[]],['Khánh Hòa',[]],
 ['Ninh Thuận',['binhthuan-open-anchorage']],['Bình Thuận',['binhthuan-open-anchorage']],
 ['TP. Hồ Chí Minh',['hcm-in-port']],['Bà Rịa - Vũng Tàu',['hcm-in-port']],
 ['Đồng Nai',[]],['Bình Dương',[]],['Long An',[]],['Tiền Giang',[]],['Bến Tre',[]],['Đồng Tháp',[]],['Sóc Trăng',[]],
 ['Hậu Giang',['cantho-hg']],['Cần Thơ',['cantho-ct']],['An Giang',['cantho-st']],['Vĩnh Long',[]],
 ['Cà Mau',['kiengiang-open-anchorage']],['Kiên Giang',['kiengiang-open-anchorage']],['Trà Vinh',['cantho-tv']],
];

export function nationwideCallCoverage(rows:PortCall[],coverage:CallCoverage[],snapshots:PortCall[]){
 return {basis:SEAPORT_COVERAGE_BASIS,complete:false,targets:SEAPORT_COVERAGE_TARGETS.map(([name,candidateSources],i)=>{
  const sources=candidateSources.map(id=>{
   const source=CALL_SOURCES.find(s=>s.id===id)!;
   const events=rows.filter(r=>r.source_area===id);
   const notices=coverage.filter(r=>r.source_area===id);
   return {id,label:source.label,kind:source.kind,
    hasEventsInRange:events.length>0,hasSnapshot:snapshots.some(r=>r.source_area===id),
    asOf:[...notices.map(r=>r.fetched_at),...events.map(r=>r.fetched_at),...snapshots.filter(r=>r.source_area===id).map(r=>r.fetched_at)].sort().at(-1)??null};
  });
  return {id:`seaport-804-${String(i+1).padStart(2,'0')}`,name,candidateSources:sources,
   status:sources.some(s=>s.hasEventsInRange)?'partial_reported':sources.some(s=>s.hasSnapshot)?'snapshot_only':'missing',
   complete:false,canonicalMappingVerified:false,
   note:name==='Hà Tĩnh'?'Báo cáo Nghệ An có bến Xuân Giang/Xuân Hải; chưa đại diện Sơn Dương/Vũng Áng.':candidateSources.length?'Nguồn có thể bao gồm nhiều cảng/bến; chưa nghiệm thu toàn bộ phạm vi cảng.':'Chưa có connector dữ liệu hoạt động đã kiểm thử.',
  };
 })};
}
