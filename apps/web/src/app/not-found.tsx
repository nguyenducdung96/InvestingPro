import Link from "next/link";
export default function NotFound() {
  return <section className="empty">
    <h1>Không tìm thấy trang</h1>
    <p>Trang hoặc bản ghi bạn tìm chưa có trong danh mục.</p>
    <Link href="/industries/ports">Về danh mục cảng</Link>
  </section>;
}
