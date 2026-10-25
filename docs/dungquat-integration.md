# GMD – Gemadept Dung Quất, 25/10/2026

## Trạng thái bàn giao hiện tại

Đã có dashboard và API hoạt động theo công bố chọn lọc của doanh nghiệp, cùng collector, kiểm thử và cấu hình refresh. Đã đối chiếu hai sự kiện đến có ngày cụ thể: Glorious Lotus ngày 04/06/2022 (49.602 DWT) và Spring Breeze ngày 10/02/2025 (DWT chưa được nguồn nêu). Chưa có chuỗi báo cáo tàu vào/rời định kỳ để hoàn tất lịch sử đầu tư như CDN/QNP/CMP/NAP. Không coi hai sự kiện là toàn bộ hoạt động hoặc độ phủ 5/5 chuỗi miền Trung.

Working tree sạch khi bắt đầu các lượt Dung Quất. Biên nhận NAP trong repo xác nhận staging cho bốn phạm vi CDN/QNP/CMP/NAP; lượt này không nghiệm thu lại miền Bắc hoặc readback cloud cũ. Commit đầu `afe1b3e` chỉ có quan sát vị trí; phần hiện tại bổ sung hoạt động công bố và các bộ lọc.

## Phạm vi và nguồn đã kiểm tra

- Website DQP: https://dqp.gemadept.com.vn/gioi-thieu/tong-quan/ ghi Bến số 1 – Cảng tổng hợp Dung Quất. Giữ riêng Nam Đình Vũ, Gemalink, PTSC, Hào Hưng, Hòa Phát và Jetty lọc dầu; không suy tỷ lệ sở hữu hay hiệu lực pháp lý.
- API nội dung công khai DQP: danh sách tải được có 99 bài. Hai bài 4019/4051 có ngày tiếp nhận/cập cảng rõ ràng, được đăng ký thủ công trong collector. Bài 4038 (Dyna Floresta) không có ngày cập chính xác; bài 4054 (Golden Autumn) chỉ nêu đầu tháng 06/2022. Không lấy ngày đăng hoặc tự tạo ngày đầu tháng. Không tự thêm một bài mới thành sự kiện đã duyệt.
- Spring Breeze: ngày tiếp nhận 10/02/2025 nằm trong phần dẫn `excerpt`, bài đăng 18/02/2025. 27.500 MT là hàng viên nén, không phải DWT. Glorious Lotus: nội dung ghi 04/06/2022 và 49.602 DWT; 40.000 tấn hàng dăm gỗ giữ ngoài DWT.
- Cảng vụ dùng HTTP http://cangvuhanghaiqni.gov.vn/; HTTPS không tải được ở lần khảo sát đầu. Hai mục menu `?lk=0206` và `?lk=6201` trả đang cập nhật. Mục nghiệp vụ `?lk=0708` cũng chưa có nội dung; khu upload yêu cầu tài khoản, không truy cập vào phần quản trị.
- URL do người dùng cung cấp http://cangvuhanghaiqni.gov.vn/?lk=kehoach_tauvaocang có bảng kế hoạch với 4 dòng. Tải `ntn=all` vẫn 4 dòng, gồm PTSC, Jetty và P/S, không có Gemadept Dung Quất. Bộ lọc `ntn=20250210` trả bảng trống. Không biến kế hoạch của bến khác thành lịch sử GMD và không suy năm từ giờ/ngày thiếu năm.
- `tivi.aspx` có 69 dòng vị trí; chọn một dòng cột VỊ TRÍ = GMD: HJ TIANHE, DWT 60.434, GT 49.098, thời gian nguyên văn `11/6/2026 18:00`. Dòng đại lý Gemadept nhưng vị trí ETA bị loại. Bảng này chỉ là nguồn bổ trợ, không đóng góp vào hoạt động/tháng/quý/YTD/YoY.
- Smartport do người dùng cung cấp: đã xem tab công khai Tra cứu Lịch tàu trong trình duyệt. Danh sách cảng không có Dung Quất; có Nam Đình Vũ, Nam Hải ICD, Bình Dương, Gemalink và các depot/ICD. Không đăng nhập hay gửi CAPTCHA; không truy vấn endpoint ẩn để vượt bộ chọn cảng.
- Quét thêm menu, page/post sitemap, nội dung DQP, nguồn doanh nghiệp về đại lý tàu, danh sách bản tin tập đoàn. Đã tải và tìm trên lớp text của 7 PDF tháng 03–08 và 10/2026; không chấp nhận thêm sự kiện từ lần quét này. PDF 09/2026 tải timeout. Chưa coi tìm lớp text là nghiệm thu OCR/ảnh toàn bộ tài liệu.

## Dashboard và API

`/companies/GMD?central_asset=gemadept_dung_quat#dungquat-activity` có chọn năm, tháng/quý, chiều đến/rời, lượt/DWT; biểu đồ lịch sử, cùng kỳ, 90 ngày; bảng ghi nhận và YTD; nhật ký có ngày sự kiện/ngày đăng riêng, liên kết nguồn, trường bằng chứng và SHA-256. Các form giữ `central_asset` để không chuyển sang Nam Đình Vũ. Snapshot vị trí nằm trong disclosure đóng ở phần phạm vi.

API `/api/v1/companies/GMD/dungquat/activity` trả chuỗi chọn lọc và chất lượng, hỗ trợ `direction=arrival|departure` và `day=YYYY-MM-DD`; ngày hoặc chiều không hợp lệ trả 400. API snapshot `/api/v1/companies/GMD/dungquat` giữ tương thích, vẫn có metrics sự kiện null vì quan sát vị trí không phải lượt đến/rời.

Miền Trung dùng cùng hàm tính hoạt động với trang mã. GMD có trạng thái `reviewed_subset`, được theo dõi riêng bằng `disclosed_issuers=1`; `connected_issuers` vẫn là 4 chuỗi định kỳ. Ví dụ kỳ 02/2025 chiều đến hiển thị 1 lượt và DWT thiếu. Không cộng các mã thành tổng vùng.

Số đã ghi nhận, DWT đã biết và YTD được giữ dù thiếu ngày/trọng tải. YoY hiển thị từ hai số đã ghi nhận nếu nền trước dương; dữ liệu hiện chưa có cặp thực tế đủ để hiển thị YoY. Không có quan sát vẫn unavailable; chiều rời hiện không có sự kiện. API tổng đầy đủ giữ null; không tạo giờ 00:00, không dùng GT/tấn hàng thay DWT. Cùng một tàu/ngày/chiều từ nhiều công bố hợp nhất thành một sự kiện, giữ các nguồn; trọng tải xung đột để null.

## Thu thập và refresh

Chạy `python scripts/collect-dungquat-history.py` và `python scripts/collect-dungquat-snapshot.py`. Dùng Python chuẩn và curl trên Windows/Linux. Bản gốc lưu `.local/dungquat/archive/<sha256>.*`; export nằm trong hai module `dungquat-history-data.ts` và `dungquat-snapshot-data.ts`.

Collector lịch sử kiểm tra định danh bài, trạng thái công khai, ngày/nội dung đã duyệt và DWT trước khi xuất. Nếu bài đổi schema/nội dung hoặc lỗi tải, giữ sự kiện cũ cùng hash/thời điểm kiểm tra cũ; cập nhật lỗi nguồn và last_attempt riêng, trả exit 1. Không chuyển bằng chứng cũ sang hash mới. Collector snapshot kiểm tra 11 cột, vị trí chính xác và số; lỗi không ghi đè export cũ, trả exit 1.

Workflow `dungquat-activity.yml` cấu hình 08:20 giờ Việt Nam và chạy thủ công. Chỉ refresh các bài đã duyệt; không tự suy sự kiện mới từ tin tức hay thay đổi vị trí. Kiểm tra hợp đồng, Vitest và typecheck trước khi ghi dataset lên nhánh staging; lưu cache bằng chứng và receipt. Lỗi nguồn vẫn báo job thất bại sau khi giữ dữ liệu có bằng chứng. Cấu hình chưa được push/chạy trong lượt này; `scheduled_refresh_verified=false`, không coi cron thực đã đạt.

## Kiểm chứng và phần còn thiếu

10 hợp đồng Python; 157/157 Vitest; 4 Playwright cho Dung Quất và CDN/miền Trung trên desktop/mobile đạt. Typecheck, ESLint các file thay đổi và Next production build đạt; kiểm tra cuối được ghi trong `catalog-review/dungquat-history-review-20261025.json`.

Chưa push/deploy hoặc nghiệm thu production. Chưa thay đổi quyền nguồn, catalog/RLS hay trạng thái phê duyệt sở hữu. Cần nguồn lịch sử định kỳ theo bến có ngày/giờ đến/rời và DWT, đặc biệt 2025–2026, để hoàn tất dữ liệu xu hướng đầu tư. Bản hiện tại hoàn thiện phần tích hợp kỹ thuật cho dữ kiện công khai đủ bằng chứng, không chứng nhận đã hoàn thành chuỗi lịch sử.
