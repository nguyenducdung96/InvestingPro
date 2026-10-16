# Slice 1: nghiệm thu catalog theo kỳ báo cáo

Thay đổi được người dùng chấp thuận ngày 16/10/2026: nghiệm thu một phạm vi doanh nghiệp đã đối chiếu, có nguồn/kỳ báo cáo và khoảng trống rõ ràng; không buộc tái dựng toàn bộ lịch sử sở hữu/khai thác. Không triển khai Slice 2–5.

## Phạm vi bản giao

Danh sách cố định 41 ứng viên trong `catalog-review/reported-catalog-manifest.json`, kỳ báo cáo 2025. Mỗi mã có hồ sơ và kết quả đọc tài liệu: có quan sát tài sản hoặc chưa có quan hệ đủ căn cứ để khẳng định. Trường hợp sau không có nghĩa không sở hữu tài sản. Đây không phải universe toàn thị trường, không chứng nhận mọi mã đang giao dịch tháng 10/2026.

63 quan sát giữ tên tài sản, vai trò đúng nguồn, chuỗi pháp nhân được báo cáo, phạm vi cầu nếu có, trang tài liệu, hash, URL và giới hạn. ICD tách riêng; căn cứ công nghiệp/bến chuyên dùng nằm nhóm bổ sung. Dịch vụ tại cảng không biến thành sở hữu. Hai ICD ILB/VLG tái sử dụng định danh đã có. Các tài sản chưa khớp giữ tên và nhãn chưa khớp, không tạo định danh giả.

`reporting_period_end` là kỳ tài liệu mô tả. `relationship_started_on` là ngày bắt đầu quan hệ nếu có bằng chứng riêng; có thể null. 57 giá trị null không chặn nghiệm thu bộ snapshot. Ngày tải, ngày công bố hoặc cuối kỳ không được điền thay ngày bắt đầu. Các quan hệ hiệu lực trong `company_asset_interests` và lịch sử đã duyệt vẫn nguyên trạng, không bị chuyển thành quan hệ snapshot.

## Giao diện và API

- `/admin/catalog`: đăng nhập bằng phiên admin hiện có, xem hồ sơ theo mã, kỳ báo cáo, quan sát, nguồn và các khoảng trống; có phân trang. Chỉ quản trị viên có quyền xem nguồn chưa duyệt.
- `GET /api/v1/admin/catalog?ticker=GMD`: cùng dữ liệu nội bộ, HTTP 401/403 nếu không có quyền.
- `GET /api/v1/companies/{uuid-or-ticker}/reported-assets`: chỉ trả quan sát đã duyệt và có nguồn/bằng chứng/định danh đáp ứng quyền công bố. `at` là giới hạn kỳ báo cáo, không phải thời điểm thông tin đã được biết trên thị trường.
- Trang doanh nghiệp công khai tách quan hệ có hiệu lực và quan hệ theo kỳ báo cáo. Chưa có quan sát được phép công bố thì không gắn nhãn đã xác minh hoặc hiện proposal ra ngoài.
- `PATCH /api/v1/admin/reported-assets/{uuid}`: duyệt hoặc từ chối với ghi chú 20–4.000 ký tự. SQL RPC kiểm tra admin thực, bằng chứng đã duyệt, quyền nguồn và định danh; không suy ra các điều kiện đó từ ngày kỳ báo cáo.

## Điều kiện nghiệm thu bản snapshot

1. Đủ 41 hồ sơ trong danh sách chốt, 63 quan sát được lưu trên database; hồ sơ không có quan sát có kết luận giới hạn rõ.
2. Từng hồ sơ truy được tài liệu gốc, trang đã đọc và bản R2 đã đối chiếu hash; không hardcode mapping doanh nghiệp trên giao diện.
3. Không phát sinh ngày bắt đầu giả; không biến quan hệ báo cáo thành quan hệ đang hiệu lực.
4. Người dùng đã đăng nhập xem được bộ dữ liệu thật trên `/admin/catalog`; tìm mã, phân trang, phân nhóm ICD và hiển thị khoảng trống hoạt động.
5. Tests SQL/API và trình duyệt đạt; RLS vẫn ngăn người không có quyền xem hồ sơ nội bộ và dữ liệu chưa được phép công bố.

Nghiệm thu chức năng/bộ snapshot phải được ghi riêng với tình trạng công bố công khai. Người dùng đã xác nhận chưa có thỏa thuận nguồn. Việc đổi mô hình ngày tháng không phải giấy phép nguồn, không tự duyệt 41 nguồn báo cáo, không giả actor duyệt. Các nguồn chưa đủ căn cứ tiếp tục ở hàng đợi. Muốn công bố rộng hơn cần căn cứ hợp lệ cho các trường dữ kiện cụ thể hoặc thay bằng nguồn được phép dùng.

## Bằng chứng triển khai

Hai migration `202610160001_reported_catalog.sql`, `202610160002_reported_scope_groups.sql`; bộ import `reported_catalog_2025.pending.sql`. Import chạy trong transaction, có kiểm tra xung đột, chạy lại không thêm audit khi dữ liệu không đổi. Quyết định duyệt và bằng chứng gốc bất biến; review tạo/đọc evidence thay thế có cùng hash thay vì sửa raw record.
