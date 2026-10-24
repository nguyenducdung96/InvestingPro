import {publicRepository} from '@/lib/server';
const roles={branch:'Chi nhánh trực tiếp',via_member_company:'Qua đơn vị thành viên',joint_venture:'Liên doanh',operator:'Đơn vị khai thác',shareholder_related:'Quan hệ cổ đông'};
export async function PhpBerthScope({ticker='PHP'}:{ticker?:string}={}){
 let scope;
 try{const repo=publicRepository();scope=await repo.companyBerthScope(ticker);}catch{return <section className="panel" aria-label={`Các bến liên quan ${ticker}`}><h2>{ticker} và các bến liên quan</h2><p role="status">Chưa tải được danh sách bến. Thử tải lại trang.</p></section>;}
 if(!scope)return null;
 return <section className="asset-section" aria-label={`Các bến liên quan ${ticker}`} id={`${ticker.toLowerCase()}-berths`}>
  <div className="section-heading"><div><p className="eyebrow">{ticker} · PHẠM VI THEO DÕI</p><h2>{ticker} và các bến liên quan</h2></div></div>
  <div className="php-berth-grid">{scope.entries.map(b=><article className="panel company-card" key={b.asset_code}>
   <div className="inline-meta"><span className="badge">{roles[b.relationship]}</span></div><h3>{b.name}</h3>
   <div className="card-footer"><a href={b.source_url} target="_blank" rel="noreferrer">Nguồn chính thức ↗</a></div>
   <details><summary>Quan hệ và nguồn</summary><p>{b.operator}</p><p>{b.source_note}</p><p>Ngày bắt đầu/kết thúc quan hệ: chưa xác định.</p></details>
  </article>)}</div>
 </section>;
}
