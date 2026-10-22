'use client';

import {useState} from 'react';

export interface PlanColumn {key:string;label:string;current:number|null;prior?:number|null;partial?:boolean;note?:string;href?:string}
const number=(n:number|null|undefined)=>n==null?'Chưa có đủ dữ liệu':n.toLocaleString('vi-VN');
const tick=(n:number)=>n>=1000000?`${(n/1000000).toLocaleString('vi-VN',{maximumFractionDigits:2})}tr`:n>=1000?`${(n/1000).toLocaleString('vi-VN',{maximumFractionDigits:1})}k`:String(n);

/** Only presentation state lives here; values and comparison windows come from the server. */
export function PlanColumnChart({title,columns,currentLabel,priorLabel,daily=false}:{title:string;columns:PlanColumn[];currentLabel:string;priorLabel?:string;daily?:boolean}){
 const [active,setActive]=useState<string|null>(null);
 const selected=columns.find(c=>c.key===active);
 const maximum=Math.max(1,...columns.flatMap(c=>[c.current??0,c.prior??0]));
 const magnitude=10**Math.floor(Math.log10(maximum));
 const ceiling=Math.ceil(maximum/magnitude)*magnitude;
 const left=64,top=20,height=244,bottom=46;
 const width=Math.max(680,columns.length*(daily?12:48)+left+16),plot=width-left-16,slot=plot/Math.max(1,columns.length);
 const bar=Math.min(daily?9:18,slot*(priorLabel?0.34:0.66));
 const description=(c:PlanColumn)=>`${c.key}: ${currentLabel} ${number(c.current)} DWT${priorLabel?`; ${priorLabel} ${number(c.prior)} DWT`:''}${c.partial?'; đang tích lũy':''}${c.note?`; ${c.note}`:''}`;
 return <figure className="plan-chart" aria-label={title}>
  <figcaption><h3>{title}</h3><div className="plan-chart-legend"><span><i className="plan-swatch-current"/>{currentLabel}</span>{priorLabel&&<span><i className="plan-swatch-prior"/>{priorLabel}</span>}<span className="meta">Đơn vị: DWT</span></div></figcaption>
  <p className="plan-chart-readout" aria-live="polite">{selected?description(selected):daily?'Bấm cột để xem lịch tàu ngày đó. Ngày thiếu giữ trống.':'Di chuột, chạm hoặc dùng Tab để xem giá trị. Cột viền nét đứt: kỳ đang tích lũy; dấu —: chưa có đủ dữ liệu.'}</p>
  <div className="plan-chart-scroll" tabIndex={0} role="region" aria-label={`${title} · cuộn ngang để xem hết`}>
   <svg viewBox={`0 0 ${width} ${top+height+bottom}`} style={{minWidth:width}} aria-label={title}>
    {[0,1,2,3,4].map(i=>{const value=ceiling*i/4,y=top+height-height*i/4;return <g key={i} aria-hidden="true"><line x1={left} x2={width-16} y1={y} y2={y} className="plan-grid-line"/><text x={left-10} y={y+4} textAnchor="end" className="plan-axis">{tick(value)}</text></g>;})}
    {columns.map((c,i)=>{
     const center=left+slot*(i+0.5),text=description(c);
     const bars=<>
      <rect x={left+slot*i} y={top} width={slot} height={height+bottom-2} className={`plan-hit${active===c.key?' is-active':''}`}/>
      {([['current',c.current],...(priorLabel?[['prior',c.prior]]:[])] as ['current'|'prior',number|null|undefined][]).map(([kind,value])=>{
       const x=center+(priorLabel?(kind==='prior'?-bar-1:1):-bar/2);
       if(value==null)return <text key={kind} x={x+bar/2} y={top+height-6} textAnchor="middle" className="plan-axis">—</text>;
       const h=value/ceiling*height;
       return <rect key={kind} x={x} y={top+height-Math.max(2,h)} width={bar} height={Math.max(2,h)} rx={2} className={`plan-bar plan-bar-${kind}${c.partial?' plan-bar-partial':''}`}/>;
      })}
      {(!daily||i%Math.max(1,Math.ceil(columns.length/12))===0||i===columns.length-1)&&<text x={center} y={top+height+24} textAnchor="middle" className="plan-axis">{c.label}{c.partial?'*':''}</text>}
     </>;
     return c.href?<a key={c.key} href={c.href} aria-label={`Xem lịch ${text}`} onMouseEnter={()=>setActive(c.key)} onFocus={()=>setActive(c.key)}><title>{text}</title>{bars}</a>:<g key={c.key} tabIndex={0} role="img" aria-label={text} onMouseEnter={()=>setActive(c.key)} onFocus={()=>setActive(c.key)} onClick={()=>setActive(c.key)}><title>{text}</title>{bars}</g>;
    })}
   </svg>
  </div>
 </figure>;
}
