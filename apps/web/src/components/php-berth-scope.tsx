import Link from 'next/link';
import {publicRepository} from '@/lib/server';
import {displayDate} from '@/lib/display';
const roles={branch:'Chi nhánh trực tiếp',via_member_company:'Qua đơn vị thành viên',joint_venture:'Liên doanh'};
export async function PhpBerthScope(){
 let scope,throughput,coverage;
 try{const repo=publicRepository();[scope,throughput,coverage]=await Promise.all([repo.companyBerthScope(),repo.monthlyThroughput(),repo.phpPlanCoverage()]);}catch{return <section className="panel" aria-label="Các bến liên quan PHP"><h2>PHP và các bến liên quan</h2><p role="status">Chưa tải được mapping bến. Thử tải lại trang.</p></section>;}
 if(!scope)return null;
 const populated=new Set(throughput.map(f=>f.asset_code));
 return <section className="asset-section" aria-label="Các bến liên quan PHP" id="php-berths">
  <div className="section-heading"><div><p className="eyebrow">PHP · PHẠM VI THEO DÕI</p><h2>PHP và các bến liên quan</h2></div><span className="pill">Đối chiếu {displayDate(scope.observed_on)}</span></div>
  <p>Phạm vi bốn bến đang triển khai; không đại diện toàn bộ tài sản PHP. Ngày đối chiếu không phải ngày hiệu lực sở hữu; Đình Vũ/DVP được giữ riêng trong hồ sơ theo kỳ bên dưới.</p>
  <p className="meta">Lượt tàu/DWT thực tế: chưa có chuỗi theo bến được xác minh. Không cộng kế hoạch điều động thành lượt thực tế.</p>
  <div className="php-berth-grid">{scope.entries.map(b=><article className="panel company-card" key={b.asset_code}>
   <div className="inline-meta"><span className="badge">{roles[b.relationship]}</span></div><h3>{b.name}</h3>
   <p>{coverage.find(c=>c.asset_code===b.asset_code)?.last_source_day?`Có lịch điều động đến ${coverage.find(c=>c.asset_code===b.asset_code)!.last_source_day}.`:'Chưa có chuỗi lịch điều động trong database.'}</p>
   <p>{populated.has(b.asset_code)?'Đã có chuỗi tấn hàng/TEU công bố.':'Chưa có chuỗi sản lượng riêng được công bố.'}</p>
   <div className="card-footer"><Link href={`/companies/PHP?plan_asset=${b.asset_code}#vessel-plans`}>Xem lượt tàu / DWT →</Link>{populated.has(b.asset_code)&&<Link href="#throughput">Xem sản lượng →</Link>}<a href={b.source_url} target="_blank" rel="noreferrer">Nguồn chính thức ↗</a></div>
   <details><summary>Quan hệ và nguồn</summary><p>{b.operator}</p><p>{b.source_note}</p><p>Ngày bắt đầu/kết thúc quan hệ: chưa xác định.</p><p>Nhãn bến Cảng vụ: {b.alias}</p><code>{b.source_sha256}</code></details>
  </article>)}</div>
 </section>;
}
