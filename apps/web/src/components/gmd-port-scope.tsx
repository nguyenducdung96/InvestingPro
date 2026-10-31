import Link from 'next/link';
import {southScopes} from '@invest/port';
export function GmdPortScope({query={}}:{query?:Record<string,string>}){
 const selected=['gmd','nam_dinh_vu'].includes(query.plan_asset)?'nam_dinh_vu':Object.hasOwn(southScopes.GMD,query.plan_asset??'')?query.plan_asset:'gmd_all';
 const direction=['arrival','departure'].includes(query.plan_direction)?query.plan_direction:selected==='gemalink'?'arrival':'departure';
 const assets=[['gmd_all','GMD · tổng 3 cảng','Nam Đình Vũ + Gemalink + Bình Dương'],['nam_dinh_vu','Nam Đình Vũ','Hải Phòng · lịch Cảng vụ'],['gemalink','Gemalink','Cái Mép · lịch và PDF kế hoạch Cảng vụ'],['gmd_binh_duong','Cảng Bình Dương','Đồng Nai · dòng vào/rời trực tiếp'],['gemadept_dung_quat','Dung Quất','Công bố chọn lọc; chưa có chuỗi định kỳ']];
 const href=(asset:string)=>{
  const params=new URLSearchParams({[asset==='gemadept_dung_quat'?'central_asset':'plan_asset']:asset,plan_direction:direction});
  for(const key of ['plan_year','plan_period','plan_metric','plan_day'])if(query[key])params.set(key,query[key]);
  return `/companies/GMD?${params}#${asset==='gemadept_dung_quat'?'dungquat-activity':'vessel-plans'}`;
 };
 return <section className="panel" id="company-ports" aria-label="Phạm vi theo dõi GMD"><p className="eyebrow">GMD · PHẠM VI THEO DÕI</p><h2>Gemadept và các cảng liên quan</h2><p>Tổng ba cảng có chuỗi theo dõi: Nam Đình Vũ, Gemalink và Bình Dương. Chọn từng cảng để xem đóng góp và nhật ký; đây chưa phải toàn bộ tài sản GMD.</p><nav className="section-tabs" aria-label="Chọn cảng GMD">{assets.map(([asset,name,note])=><Link key={asset} href={href(asset)} aria-current={selected===asset?'page':undefined}>{name}<small>{note}</small></Link>)}</nav><details><summary>Phạm vi chưa có chuỗi và quan hệ doanh nghiệp</summary><p>Phước Long và Nam Hải ICD chưa tích hợp chuỗi riêng. Bình Dương chỉ có dòng vào/rời trực tiếp; chưa gồm điều chuyển. Không ghép bến phao Gemadept vào Phước Long khi chưa đối chiếu; Nam Hải và Nam Hải Đình Vũ đã chuyển nhượng không nằm trong tổng ba cảng hiện tại.</p><p>Danh mục liên quan theo báo cáo 2025; không suy ngày hiệu lực lịch sử hoặc nhân dữ liệu hoạt động theo tỷ lệ vốn.</p><a href="https://www.gemadept.com.vn/wp-content/uploads/2026/04/20260418_GMD-AR_VN_SmartPDF01.pdf" target="_blank" rel="noreferrer">Báo cáo thường niên Gemadept 2025 ↗</a></details></section>;
}
