'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useSyncExternalStore} from 'react';

type Theme='light'|'dark'|'system';
let volatileTheme:Theme='system';
function preference():Theme {try{const value=localStorage.getItem('investingpro-theme');return value==='light'||value==='dark'||value==='system'?value:volatileTheme;}catch{return volatileTheme;}}
function subscribe(callback:()=>void){
 const sync=()=>{document.documentElement.dataset.theme=preference();callback();};
 window.addEventListener('storage',sync);window.addEventListener('investingpro-theme',sync);
 return()=>{window.removeEventListener('storage',sync);window.removeEventListener('investingpro-theme',sync);};
}
function Icon({kind}:{kind:'ports'|'companies'|'theme'}){
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='ports'?<><path d="M4 20h16M6 17V6l6-3 6 3v11M9 9h6M9 13h6"/></>:kind==='companies'?<><path d="M3 21h18M5 21V7h8v14M13 11h6v10M8 10h2M8 14h2M8 18h2M16 14h1M16 18h1"/></>:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></>}</svg>;
}
export function AppShell(){
 const pathname=usePathname();const theme=useSyncExternalStore(subscribe,preference,()=> 'system' as Theme);
 const admin=pathname.startsWith('/admin');
 const companies=pathname.startsWith('/companies')||pathname.startsWith('/industries/ports/companies');
 function change(value:string){volatileTheme=value as Theme;document.documentElement.dataset.theme=value;try{localStorage.setItem('investingpro-theme',value);}catch{/* Keep the selection for this session if storage is unavailable. */}window.dispatchEvent(new Event('investingpro-theme'));}
 return <header className="app-sidebar">
  <Link className="brand" href="/industries/ports"><span className="brand-symbol" aria-hidden="true">IP</span><span className="brand-wordmark">InvestingPro<small>PORT INTELLIGENCE</small></span></Link>
  <p className="nav-label">KHÁM PHÁ DỮ LIỆU</p>
  <nav className="primary-nav" aria-label="Điều hướng chính"><Link href="/industries/ports" aria-current={!companies&&!admin?'page':undefined}><Icon kind="ports"/>Danh mục cảng</Link><Link href="/industries/ports/companies?view=all" aria-current={companies?'page':undefined}><Icon kind="companies"/>Doanh nghiệp</Link></nav>
  <details className="admin-nav" open={admin||undefined}><summary><span>Quản trị<span className="admin-extra"> dữ liệu</span></span></summary><nav aria-label="Quản trị"><Link href="/admin/catalog" aria-current={pathname==='/admin/catalog'?'page':undefined}>Hồ sơ theo kỳ</Link><Link href="/admin/refresh" aria-current={pathname==='/admin/refresh'?'page':undefined}>Cập nhật API</Link><Link href="/admin/mappings" aria-current={pathname==='/admin/mappings'?'page':undefined}>Duyệt quan hệ</Link><Link href="/admin/publication" aria-current={pathname==='/admin/publication'?'page':undefined}>Duyệt nguồn</Link></nav></details>
  <div className="theme-control"><label htmlFor="app-theme"><Icon kind="theme"/><span>Giao diện</span></label><select id="app-theme" value={theme} onChange={e=>change(e.target.value)}><option value="system">Theo thiết bị</option><option value="light">Sáng</option><option value="dark">Tối</option></select></div>
  <p className="sidebar-note">Dữ liệu có nguồn.<br/>Phạm vi minh bạch.</p>
 </header>;
}
