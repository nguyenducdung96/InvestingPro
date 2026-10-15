# Thao tác thủ công cho bộ bổ sung PAP và VSC

Phần mềm Slice 1 đã có migration/types/repository/API/tests và hàng đợi quản trị. Bộ này bổ sung dữ liệu chuẩn bị ngoại tuyến, **chưa chạy trên cloud và chưa công bố**. Không phải bộ nghiệm thu toàn bộ doanh nghiệp cảng Việt Nam. Không thay đổi Slice 2–5.

## 1. Kiểm tra hai bằng chứng đã lưu trên R2

Mở Cloudflare → R2 → bucket `investing-pro-evidence-staging` → thư mục `catalog-evidence/sha256/`. Tìm và Download hai object có tên:

- PAP: `81f0546ee15331c47767461ea4d7569b1ea6497ed1646379cf67ec474af696ea`.
- VSC: `4bd4f0da1db1c203065c5a7864d4c9d13dd5ed25639dd224f369822b3fc3bbc4`.

Các object này đã nằm trong đợt upload 30 PDF; đừng upload lại hoặc mở public bucket. Với từng file vừa Download, mở PowerShell và chạy lệnh dưới đây, thay đường dẫn bằng file thật:

```powershell
(Get-FileHash -Algorithm SHA256 -LiteralPath "C:\Users\Admin\Downloads\TEN_FILE_VUA_TAI").Hash.ToLowerInvariant()
```

Kết quả phải trùng đúng tên hash tương ứng. Chỉ đối chiếu file vừa tải từ R2, không dùng file gốc trong repo để kết luận tính toàn vẹn bản lưu trên cloud. Không khớp hoặc không tìm thấy object thì dừng bộ nhập và báo tên/hash; không cần gửi mật khẩu hay token.

## 2. Nhập proposals bằng một lần Run

Mở file `supabase/imports/slice1_additional_catalog.handoff.sql` trong Codex. Chọn toàn bộ nội dung file (Ctrl+A), sao chép (Ctrl+C).

Mở Supabase project `loapslojajawgzekozfv` → **SQL Editor** → **New query**. Dán toàn bộ nội dung vào một query mới rồi nhấn **Run**. Đừng chèn vào giữa query cũ hoặc thay tên bảng/UUID. File đã gói phần nhập trong một transaction; nếu một điều kiện trước nhập sai, cả bộ phải rollback, không chạy từng đoạn để bỏ qua lỗi. Không có lệnh xóa, cấp quyền, tạo user hay giả actor duyệt.

Kết quả cuối phải có hai dòng:

- `PAP berth proposals`: `rows = 3`, `pending = 3`.
- `VSC listing`: `rows = 1`, `pending = 1`.

Nếu một hồ sơ đã được duyệt hợp lệ từ trước, pending có thể thấp hơn rows; giữ nguyên quyết định đó và báo kết quả, không đổi ngược về pending. Bộ nhập không sửa quyết định đã duyệt. Có thể chạy lại, không tạo thêm proposal/audit nếu nội dung đã tồn tại đúng như bộ này.

## 3. Phạm vi đã đối chiếu để dùng khi review

PAP: báo cáo thường niên 2025 trang PDF 3–4 (trang in 1–2), pháp nhân 3601010336. Cầu 5/6 dùng mốc chứng nhận đủ điều kiện ngày 31/12/2024; cầu 7 dùng mốc quyết định mở ngày 05/12/2025. Đây không phải ngày tàu đầu tiên. Cầu 6 nối dài không tạo thành cầu trùng. Không nhập cầu 8–9 là đang khai thác, không gắn sở hữu 100%, không suy ra ICD từ bãi logistics. Còn phải đối chiếu bản gốc văn bản và biến động 2026 trước khi kết luận về tình trạng hiện tại.

VSC: báo cáo thường niên 2025 trang PDF 3 (trang in 2), pháp nhân 0200453688, mã VSC, HOSE, doanh nghiệp báo cáo giao dịch đầu tiên 09/01/2008. Bộ này chỉ thêm company/listing chờ duyệt. Các chuỗi VGR/GLC/Quảng Bình–Đình Vũ và chênh lệch tỷ lệ HAH được lưu riêng trong `factual-review-20261015.json`; không thêm quan hệ tài sản hoặc suy ra tỷ lệ sở hữu vật lý. Chưa phải xác nhận trạng thái giao dịch hiện tại.

Nguồn/bằng chứng/định danh/listing vẫn đi qua quy trình trong `docs/admin_publication_guide.md`. Không dùng ghi chú dữ kiện ở trên làm giấy phép nguồn và không duyệt một hồ sơ còn thiếu căn cứ chỉ để bật dữ liệu. Người dùng có thể tự thao tác trên giao diện; agent không dùng đường vòng để thực hiện hành động công bố mà công cụ đã từ chối.

## Còn thiếu để nghiệm thu toàn bộ phạm vi người dùng yêu cầu

Chưa chốt toàn bộ universe ngoài danh sách tối thiểu; chưa đủ danh mục tài sản và chuỗi pháp nhân của mọi mã; chưa xử lý xong các mâu thuẫn, thay đổi 2026, quyền nguồn và R2 readback; chưa công bố/đối chiếu độ phủ trên staging. Việc nhập thành công bộ bổ sung này không đánh dấu Slice 1 hoàn thành.
