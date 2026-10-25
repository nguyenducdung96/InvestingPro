# QNP — dashboard và lịch sử 25/10/2026

Dashboard `/companies/QNP#vessel-plans` dùng giao diện chung: tổng quan, cầu 1–4/TC1, ba biểu đồ, bộ lọc năm/tháng/quý/chiều/lượt/DWT, lũy kế, YoY và nhật ký ngày kèm bằng chứng. Tổng quan miền Trung dùng cùng hàm tính; không tạo tổng vùng chồng lấn.

Nguồn là https://cangvuhanghaiquynhon.gov.vn/index.aspx?page=news&cat=2014. Discovery 45 trang tìm 662 tài liệu; trích xuất 653 tài liệu, 6.465 dòng nguồn. Cả hai chiều đã ghép có số ghi nhận trong đủ 22 tháng từ 01/2025 đến 10/2026, cutoff 24/10/2026. Dòng nguồn gồm cả chuyển cầu/nhãn chưa ghép, không phải tổng lượt vào/rời.

Chỉ bảng Cảng Quy Nhơn được đọc; không cộng Thị Nại/Tân Cảng Miền Trung. Danh mục cầu chính thức: https://quynhonport.vn/nang-luc-hieu-suat/luong-vao-cang/. TCQN, TC TL/HL, P16 và nhãn không khớp giữ riêng; TCQN không được suy thành TC1. Bộ năm bản tin nhập tay cũ chỉ còn regression fixture.

Đây là authority_published_berth_plan, movement_scope=berth, actual_verified=false; chưa xác nhận actual. DWT là trọng tải thiết kế, không phải hàng bốc xếp. Chỉ P0 ↔ cầu đã ghép tính vào/rời; chuyển cầu riêng. Bản lịch mới thay thế cửa sổ chồng lấn. Ngày dòng theo cửa sổ ảnh, không theo ngày đăng.

Parser kiểm tra bảng/cột/cửa sổ; hai lượt OCR DWT phải khớp và đạt ngưỡng. Giữ chữ gốc, confidence, tọa độ ô, URL, SHA-256 ảnh. 363 dòng nguồn thiếu DWT giữ null, không thay GT; 64 dòng chưa đạt bị loại; 9 tài liệu không đưa vào chuỗi. Đã xử lý toàn bộ lỗi trang tiếp của tài liệu hợp lệ, bổ sung 329 dòng từ các trang sau. Bảy lịch sai ngày bị loại, một tài liệu chỉ có phao xăng dầu và một tài liệu chỉ có chữ ký không tạo quan sát QNP. history_complete=false, full_coverage_verified=false. Không tuyên bố kiểm tra tay toàn bộ OCR.

Theo AGENTS.md, số ghi nhận/YoY/lũy kế vẫn hiển thị dù thiếu ngày/khối lượng. Tổng đầy đủ API giữ null; kỳ không quan sát unavailable. Chi tiết chất lượng đóng. Không sử dụng dữ liệu hoặc thiết kế website tham khảo.

## Tái lập

Python3.12 + scripts/requirements-qnp.txt. Chạy discover-qnp-authority.py, collect-qnp-authority.py --workers 2 --refresh-recent 4, verify-qnp-source-samples.py, export-qnp-history.py. Ảnh/HTML giữ riêng theo hash trong .local/qnp-authority; qnp-history-data.ts chứa dữ liệu có phiên bản. Exporter chặn ma trận tháng/chiều thiếu hoặc dưới 500 tài liệu, giữ phiên bản thành công khi nguồn lỗi và gắn source_error. Trùng không cộng hai lần; xung đột trọng tải cách ly.

Ledger Python độc lập: catalog-review/qnp-history-ledger.json, khớp tính toán TypeScript. Biên nhận catalog-review/qnp-integration-20261025.json giữ discovery cũ và release hiện tại.

Workflow qnp-plans.yml cấu hình 07:35 Việt Nam, kiểm tra lại bốn bản gần nhất, cache bằng chứng và cập nhật staging qua Git. Chưa chứng nhận cron thực chạy: scheduled_refresh_verified=false.

## Kiểm chứng

139/139 Vitest đạt với một worker; typecheck, lint, production build, diff-check đạt. QNP/CDN Playwright desktop/mobile: 4 luồng đạt (locator mobile sửa để không phụ thuộc nhãn CSS). Python8 hợp đồng parser đạt;5 bộ ảnh nguồn đối chiếu trực quan,19 dòng tham chiếu/18DWT chắc chắn khớp; một ô chưa chắc giữ null. Chưa chạy lại toàn bộ E2E dự án.

Miền Trung hiện tích hợp CDN và QNP; CMP/NAP/GMD–Dung Quất vẫn pending. Staging readback được ghi riêng sau deployment.

## Staging đã xác nhận

Commit e8fb950 đã deploy qua Cloudflare build 683c6a2a-efb9-40c9-b6dd-7018b4529d84. API live cả hai chiều khớp ledger 22 tháng; QNP trong API miền Trung khớp 63 lượt/748.320 DWT tháng 10. Lũy kế rời 736 lượt/8.497.844 DWT đến 24/10. Đã xem trực tiếp giao diện và lưu ảnh .local/qnp-authority/staging-qnp.png. Biên nhận: catalog-review/qnp-staging-20261025.json. Workflow đã đăng ký trên default main bằng commit 8af5429; cron chưa chạy để nghiệm thu.

## Chốt phần bổ sung ngày 25/10

Bộ đọc qnp-continuation/7 kiểm tra số thứ tự nối tiếp, lưới cột và cửa sổ ngày; giữ đúng hash ảnh của từng trang. Cột STT dùng inset một pixel để không cắt mất chữ số, không thay số bằng quy tắc suy đoán. Các bảng cảng khác và trang chữ ký có trạng thái riêng. Danh sách ngoại lệ đã xem ảnh: catalog-review/qnp-source-dispositions-20261025.json. TC1 giữ unavailable do chưa có alias nguồn được chứng minh; quyết định này không suy ra TC1 không hoạt động.

Cold refresh khởi tạo thư mục lồng nhau; lịch sử ngoài cửa sổ bốn ngày được giữ nguyên theo phiên bản và không gắn thời gian kiểm tra nguồn mới. Các bản mới, ngoại lệ chưa tích hợp và bốn ngày gần nhất được tải lại; chỉ tái sử dụng ô trong cửa sổ này khi hash ảnh khớp. Ảnh thay đổi bắt buộc đọc lại. Chạy không có --refresh-recent để kiểm tra lại toàn bộ kho khi cần. Last_checked_at tách khỏi parsed_at để lịch không sửa vẫn cập nhật được tình trạng kiểm tra nguồn. Cache và receipt được giữ cả khi refresh thất bại. Cron default main 07:35 Việt Nam; nghiệm thu thủ công và cron thực là hai trạng thái riêng.

## Nghiệm thu cuối — 25/10/2026

Refresh GitHub [40144613728, attempt 2](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40144613728) thành công toàn bộ: 8 hợp đồng Python, 5 bộ ảnh tham chiếu, 139 Vitest, xuất dữ liệu, push commit 73a42c9, lưu receipt/cache. Đã đối chiếu staging sau chính commit tự động này: 653 tài liệu/6.465 dòng, 22 tháng, không còn lỗi đọc trang tiếp QNP; hai chiều khớp ledger và miền Trung. Rời cầu tháng 10 đến 24/10: 69 lượt/821.256 DWT, YoY DWT +32,49%; lũy kế 768 lượt/8.837.915 DWT, YoY DWT +6,50%.

Luồng refresh đã nghiệm thu bằng workflow_dispatch; cron 07:35 Việt Nam đăng ký trên main nhưng chưa nghiệm thu một lần event=schedule thực chạy. Các lịch sai ngày, ô chưa đọc chắc và TC1 thiếu alias vẫn được giữ thiếu theo nguồn. [Biên nhận đầy đủ](catalog-review/qnp-final-acceptance-20261025.json).
