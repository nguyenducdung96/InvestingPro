import {isIssuerPlanTicker} from '@invest/port';
import {publicRepository} from '@/lib/server';
import {PhpBerthScope} from './php-berth-scope';
import {CmpBerthScope} from './cmp-berth-scope';
import {NapPortScope} from './nap-port-scope';
import {GmdPortScope} from './gmd-port-scope';
import {PdnPortScope} from './pdn-port-scope';
import {SgpPortScope} from './sgp-port-scope';
import {SouthernPortScope} from './southern-port-scope';
const roles:Record<string,string>={operator:'Khai thác theo báo cáo',owner:'Sở hữu theo báo cáo',indirect:'Quan hệ qua pháp nhân',group_portfolio:'Mạng lưới theo báo cáo',business_cooperation:'Hợp tác kinh doanh',cargo_handling_service:'Dịch vụ xếp dỡ'};
// Every issuer uses the same top-of-page scope. Only published, cited assets enter it.
export async function CompanyPortScope({ticker}:{ticker:string}){
 if(ticker==='CLL'||ticker==='SWC'||ticker==='TCW'||ticker==='VGP')return <SouthernPortScope ticker={ticker}/>;
 if(ticker==='GMD')return <GmdPortScope/>;
 if(ticker==='SGP')return <SgpPortScope/>;
 if(ticker==='PDN')return <PdnPortScope/>;
 if(ticker==='CMP')return <CmpBerthScope/>;
 if(ticker==='NAP')return <NapPortScope/>;
 if(ticker==='PHP'||isIssuerPlanTicker(ticker))return <PhpBerthScope ticker={ticker}/>;
 let company;
 try{company=(await publicRepository().editorialEdition())?.entries.find(c=>c.ticker===ticker);}catch{return <section className="panel" aria-label={`Các cảng liên quan ${ticker}`}><h2>{ticker} và các cảng liên quan</h2><p role="status">Chưa tải được danh sách cảng. Thử tải lại trang.</p></section>;}
 if(!company)return null;
 const ports=company.assets.filter(a=>['port','terminal','berth','river_port'].includes(a.kind));
 return <section className="asset-section" aria-label={`Các cảng liên quan ${ticker}`} id="company-ports">
  <div className="section-heading"><div><p className="eyebrow">{ticker} · PHẠM VI THEO DÕI</p><h2>{ticker} và các cảng liên quan</h2></div></div>
  {!ports.length?<p className="notice">Chưa có danh sách cảng trong hồ sơ đã công bố.</p>:<div className="php-berth-grid">{ports.map((port,i)=><article className="panel company-card" key={`${port.name}-${i}`}>
   <div className="inline-meta"><span className="badge">{roles[port.role]??'Quan hệ theo báo cáo'}</span></div><h3>{port.name}</h3>
   <div className="card-footer"><a href={company.source.url} target="_blank" rel="noreferrer">Nguồn chính thức ↗</a></div>
   <details><summary>Quan hệ và nguồn</summary><p>{company.name} · kỳ báo cáo {company.period}.</p>{port.via.length>0&&<p>Qua pháp nhân: {port.via.join(', ')}.</p>}<p>Quan hệ theo báo cáo, không xác nhận tỷ lệ sở hữu hoặc ngày hiệu lực hiện hành.</p></details>
  </article>)}</div>}
 </section>;
}
