# QNP — tiến độ 25/10/2026

Đã kiểm tra checkout sạch trước khi làm: miền Bắc có các dashboard theo mã; miền Trung có CDN, còn QNP/CMP/NAP/GMD–Dung Quất ở trạng thái pending. Đây là kiểm tra mã nguồn và biên nhận trong repo, không phải nghiệm thu lại miền Bắc trên cloud.

## Đã triển khai local cho QNP

Trang `/companies/QNP` và API `/api/v1/companies/QNP/plans` có lịch cầu bến dự kiến, tháng/quý, lượt/DWT đã ghi nhận, lũy kế đến cutoff và YoY từ hai giá trị ghi nhận khi nền dương. Tổng quan miền Trung dùng cùng hàm tính, không cộng QNP vào CDN hoặc tạo tổng vùng. CDN giữ footer các tháng đã kết thúc; QNP dùng YTD thông thường gồm tháng đang cập nhật.

5 bản tin được đọc trực tiếp ảnh và nhập đủ 53 dòng: 23–24/10/2025; 05, 07, 11/10/2026. Bản 07/10 được website đăng ngày 12/10; ngày phát hành trong ảnh được lưu riêng. Dữ liệu đã đối chiếu nằm trong `packages/modules/port/src/qnp-reviewed.ts`, có URL bài, URL ảnh, SHA-256, thời gian công bố và ngày đối chiếu. Đây là bộ dữ liệu tĩnh có phiên bản trong Git, chưa nhập database hoặc chạy refresh tự động.

Các dòng `TCQN` không tự gán sang QNP. Chỉ tuyến P0 ↔ cầu đánh số C1–C6, 1A–1C được đưa vào chỉ tiêu vào/rời cầu; nhãn TC chưa đối chiếu, P16 và tuyến khác giữ riêng, không fuzzy mapping. Chuyển cầu không cộng hai lần vào vào/rời. Đây là `operator_published_berth_plan`, `movement_scope=berth`, không phải actual hoặc lượt vào/rời vùng cảng. Không tuyên bố đã đối chiếu đầy đủ danh mục cầu QNP.

Bản sau thay thế toàn bộ khoảng thời gian chồng với bản trước, gồm dòng đổi giờ hoặc bị xóa. Ảnh từng bản được nhập đủ trước khi dùng quy tắc này. Không chứng nhận ngày thiếu bằng 0. Mỗi dòng giữ DWT nguồn; null không thay bằng GT. Tổng đủ dữ liệu vẫn null vì chưa chứng nhận toàn bộ ngày; số đã ghi nhận vẫn hiển thị. Kỳ không có quan sát giữ unavailable.

Trong bộ đã đối chiếu, tháng 10/2026 chiều rời cầu có 8 dòng / 88.452 DWT; đây không phải tổng hoạt động tháng của toàn QNP. Phạm vi 5 bản tin được ghi ngay cạnh cửa sổ cập nhật; chi tiết chất lượng và các tuyến chưa ghép nằm trong mục đóng.

## Lịch sử còn lại

Discovery đọc 4 trang API WordPress công khai, tìm 344 bài ứng viên từ 01/01/2025, 335 URL ảnh khác nhau; 2 bài không có ảnh. Số bài không phải số bản tin độc lập hoặc số ngày phủ: có bài trùng bản tin và có lỗi năm trong tiêu đề. 339 bài còn ngoài bộ 5 bản đã đối chiếu; cần kiểm tra trùng, ngày trong ảnh, toàn bộ trang ảnh, các tuyến và bản sửa trước khi đưa vào metrics. Không đưa OCR tự động vào số đã ghi nhận.

Chạy `python scripts/collect-qnp-plans.py` để cập nhật danh mục; thêm `--download-images` để archive ảnh gốc theo hash. Kết quả ở `.local/qnp-plans/candidates.json` và `.local/qnp-plans/archive/`; không tự sửa bộ đã đối chiếu. Nguồn rỗng ghi `source_no_images`, lỗi fetch/schema làm tác vụ thất bại. Bộ hiện tại chưa tự phát hiện bản sửa ảnh sau ngày đối chiếu; phải archive/đối chiếu và cập nhật bằng thay đổi Git review được.

[Biên nhận discovery và nguồn đã đối chiếu](catalog-review/qnp-integration-20261025.json). `history_complete=false`, `scheduled_refresh_verified=false`, chưa deploy cloud. QNP đã có phần tích hợp đầu tiên, **chưa hoàn tất QNP**. CMP, NAP, GMD–Dung Quất chưa thay đổi; ưu tiên tiếp tục lịch sử/phạm vi QNP trước khi chuyển mã.

## Kiểm chứng local

136/136 Vitest đạt khi chạy `pnpm test -- --maxWorkers=1`; lần chạy song song ban đầu có 3 suite PGlite timeout khởi tạo, chạy một worker đạt toàn bộ. 4/4 kiểm thử Python discovery, typecheck, lint, Next production build và `git diff --check` đạt. 4/4 Playwright QNP/CDN–miền Trung trên desktop/mobile đạt; đây là các luồng liên quan, chưa chạy lại toàn bộ suite E2E hoặc nghiệm thu cloud.

## Rà lại nguồn chính thức sau phản hồi

Ngày 25/10 đã xác nhận kho Cảng vụ tại https://cangvuhanghaiquynhon.gov.vn/index.aspx?page=news&cat=2014, khác mục vị trí đã trả ERROR. Chạy `python scripts/discover-qnp-authority.py` đã archive 45 trang và 662 lịch ngày có tiêu đề từ 2025 đến 24/10/2026. Đây là danh mục tài liệu cần trích xuất, chưa phải 662 ngày metrics. Ảnh lịch 24/10/2026 tách rõ các bảng Cảng Quy Nhơn, Cảng Thị Nại, Cảng Tân Cảng Miền Trung; phải lọc phạm vi bảng và nhãn bến trước khi cộng.

Trang năng lực chính thức của QNP https://quynhonport.vn/nang-luc-hieu-suat/luong-vao-cang/ liệt kê cầu 1, 2, 3, 4 và TC1. TC1 không được đồng nhất bằng suy đoán với nhãn TCQN hoặc các nhãn TC TL/HL. Trang dulieucangbien.com chỉ dùng tham khảo bố cục; không dùng số liệu của họ làm nguồn.
