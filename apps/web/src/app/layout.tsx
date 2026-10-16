import Link from "next/link";
import "./globals.css";
export const metadata = {
  title: "Thông tin cảng biển | InvestingPro",
  description: "Danh mục cảng biển Việt Nam và quan hệ doanh nghiệp có nguồn xác minh",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <a className="skip" href="#main">
          Chuyển đến nội dung
        </a>
        <header>
          <Link className="brand" href="/industries/ports">
            InvestingPro <span>THÔNG TIN CẢNG BIỂN</span>
          </Link>
          <nav aria-label="Điều hướng chính">
            <Link href="/industries/ports">Danh mục cảng</Link>
            <Link href="/industries/ports/companies?view=all">Doanh nghiệp</Link>
            <Link href="/admin/mappings">Duyệt quan hệ</Link>
            <Link href="/admin/publication">Duyệt nguồn</Link>
            <Link href="/admin/catalog">Hồ sơ theo kỳ</Link>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer>
          Nguồn chính thức. Hiệu lực rõ ràng. Phạm vi dữ liệu minh bạch.
        </footer>
      </body>
    </html>
  );
}
