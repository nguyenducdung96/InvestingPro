# QNP — dashboard và lịch sử 25/10/2026

Dashboard `/companies/QNP#vessel-plans` dùng giao diện chung: tổng quan, cầu 1–4/TC1, ba biểu đồ, bộ lọc năm/tháng/quý/chiều/lượt/DWT, lũy kế, YoY và nhật ký ngày kèm bằng chứng. Tổng quan miền Trung dùng cùng hàm tính; không tạo tổng vùng chồng lấn.

Nguồn là https://cangvuhanghaiquynhon.gov.vn/index.aspx?page=news&cat=2014. Discovery 45 trang tìm 662 tài liệu; trích xuất 652 tài liệu, 6.136 dòng nguồn. Cả hai chiều đã ghép có số ghi nhận trong đủ 22 tháng từ 01/2025 đến 10/2026, cutoff 24/10/2026. Dòng nguồn gồm cả chuyển cầu/nhãn chưa ghép, không phải tổng lượt vào/rời.

Chỉ bảng Cảng Quy Nhơn được đọc; không cộng Thị Nại/Tân Cảng Miền Trung. Danh mục cầu chính thức: https://quynhonport.vn/nang-luc-hieu-suat/luong-vao-cang/. TCQN, TC TL/HL, P16 và nhãn không khớp giữ riêng; TCQN không được suy thành TC1. Bộ năm bản tin nhập tay cũ chỉ còn regression fixture.

Đây là authority_published_berth_plan, movement_scope=berth, actual_verified=false; chưa xác nhận actual. DWT là trọng tải thiết kế, không phải hàng bốc xếp. Chỉ P0 ↔ cầu đã ghép tính vào/rời; chuyển cầu riêng. Bản lịch mới thay thế cửa sổ chồng lấn. Ngày dòng theo cửa sổ ảnh, không theo ngày đăng.

Parser kiểm tra bảng/cột/cửa sổ; hai lượt OCR DWT phải khớp và đạt ngưỡng. Giữ chữ gốc, confidence, tọa độ ô, URL, SHA-256 ảnh. 328 dòng nguồn thiếu DWT giữ null, không thay GT; 59 dòng chưa đạt bị loại; 10 tài liệu chưa ghép QNP; 227 tài liệu có trang sau chưa phân loại (có thể gồm trang ký tên). history_complete=false, full_coverage_verified=false. Không tuyên bố kiểm tra tay toàn bộ OCR.

Theo AGENTS.md, số ghi nhận/YoY/lũy kế vẫn hiển thị dù thiếu ngày/khối lượng. Tổng đầy đủ API giữ null; kỳ không quan sát unavailable. Chi tiết chất lượng đóng. Không sử dụng dữ liệu hoặc thiết kế website tham khảo.

## Tái lập

Python3.12 + scripts/requirements-qnp.txt. Chạy discover-qnp-authority.py, collect-qnp-authority.py --workers 2 --refresh-recent 4, verify-qnp-source-samples.py, export-qnp-history.py. Ảnh/HTML giữ riêng theo hash trong .local/qnp-authority; qnp-history-data.ts chứa dữ liệu có phiên bản. Exporter chặn ma trận tháng/chiều thiếu hoặc dưới 500 tài liệu, giữ phiên bản thành công khi nguồn lỗi và gắn source_error. Trùng không cộng hai lần; xung đột trọng tải cách ly.

Ledger Python độc lập: catalog-review/qnp-history-ledger.json, khớp tính toán TypeScript. Biên nhận catalog-review/qnp-integration-20261025.json giữ discovery cũ và release hiện tại.

Workflow qnp-plans.yml cấu hình 07:35 Việt Nam, kiểm tra lại bốn bản gần nhất, cache bằng chứng và cập nhật staging qua Git. Chưa chứng nhận cron thực chạy: scheduled_refresh_verified=false.

## Kiểm chứng

139/139 Vitest đạt với một worker; typecheck, lint, production build, diff-check đạt. QNP/CDN Playwright desktop/mobile: 4 luồng đạt (locator mobile sửa để không phụ thuộc nhãn CSS). Python5 hợp đồng parser đạt;3 ảnh nguồn đối chiếu trực quan,12 dòng tham chiếu/11DWT chắc chắn khớp; một ô chưa chắc giữ null. Chưa chạy lại toàn bộ E2E dự án.

Miền Trung hiện tích hợp CDN và QNP; CMP/NAP/GMD–Dung Quất vẫn pending. Staging readback được ghi riêng sau deployment.
