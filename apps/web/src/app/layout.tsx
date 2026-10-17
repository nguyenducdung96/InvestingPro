import {AppShell} from '@/components/app-shell';
import "./globals.css";
export const metadata = {
  title: "Thông tin cảng biển | InvestingPro",
  description: "Danh mục cảng biển Việt Nam và quan hệ doanh nghiệp có nguồn xác minh",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:"try{var t=localStorage.getItem('investingpro-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:'system'}catch(e){}"}}/></head>
      <body>
        <a className="skip" href="#main">
          Chuyển đến nội dung
        </a>
        <AppShell/>
        <main id="main">{children}</main>
        <footer>
          Nguồn chính thức. Hiệu lực rõ ràng. Phạm vi dữ liệu minh bạch.
        </footer>
      </body>
    </html>
  );
}
