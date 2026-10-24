# CQN — lịch cập/rời cầu theo kế hoạch

Ngày đối chiếu: 24/10/2026. Phạm vi người dùng yêu cầu: CQN, tiếp nối tám dashboard Hải Phòng đã được chấp nhận. Dashboard CQN chờ người dùng review; không suy ra nghiệm thu production.

## Phạm vi và nguồn

Một cảng: Cái Lân của Công ty Cổ phần Cảng Quảng Ninh. Card đầu trang dẫn giấy chứng nhận 88/2020/GCN-CHHVN ngày 24/06/2020, có cầu 1, 5, 6, 7, bến tạm và khu neo Hòn Gai. Chỉ ghép bốn nhãn nguồn chính xác `Cầu 1/5/6/7 - Cái Lân`; bến tạm và khu neo chưa nằm trong chỉ tiêu, CICT cầu 2–3–4 bị loại. Không khẳng định tổng hoạt động toàn CQN hoặc hiệu lực pháp lý hiện hành; ngày bắt đầu/kết thúc quan hệ giữ null. [Biên nhận phạm vi](catalog-review/cqn-berth-scope-20261024.json).

Nguồn hoạt động là [kế hoạch điều động Cảng vụ Quảng Ninh](https://kht1.cangvuhanghaiquangninh.gov.vn/), gửi form ngày ASP.NET `rdptime`. URL không chứa ngày lịch sử: biên nhận lưu method/event/report_day, thời điểm và SHA-256; raw gzip lưu riêng trong `.local/cqn-plans/raw`. Không công khai thông tin hoa tiêu, đại lý, điện thoại từ raw.

Lấy một lần từ bảng khu vực Hòn Gai, đối chiếu chính xác tàu + ngày giờ + điểm đi/đến + DWT với bảng tàu đến/rời/di chuyển. Không cộng lại các bảng nguồn trùng nhau. Một số dòng tới/từ P/S được nguồn xếp trong mục di chuyển; giữ nguyên phân loại mục nguồn, không suy ra port departure chỉ từ nhãn P/S. Migration `202610240010` giữ đúng ngoại lệ đã quan sát này. STT và các trường không phục vụ chỉ tiêu không phải khóa sự kiện. Cùng khóa chuẩn hóa chỉ giữ một dòng; DWT xung đột, sai ngày/schema hoặc không đối chiếu được thì không nhập bản thành công.

`authority_published_berth_plan`, `movement_scope=berth`, `includes_internal_transfers=true`, `actual_verified=false`. Chiều arrival là cập cầu, departure là rời cầu. Kế hoạch chuyển giữa hai cầu CQN có hai dấu chiều riêng; không cộng hai chiều thành lượt tàu ghé. Không trộn với lượt vào/rời toàn cảng, snapshot vị trí hoặc actual. DWT là trọng tải thiết kế, không thay GT hay quy thành tấn hàng/doanh thu.

## Dữ liệu và giao diện

Khảo sát 661 ngày từ 01/01/2025 đến 23/10/2026: 584 ngày có lịch hợp lệ, 77 ngày không có bản lịch đủ chứng minh 0; không có lỗi đối chiếu còn lại. 813 dấu cập và 810 dấu rời, gồm 568 dấu điều chuyển nội cảng, 437 kế hoạch đến và 618 kế hoạch rời cảng. Không thiếu DWT trong 1.623 dòng. Có ba nhóm cùng tàu/tuyến khác giờ; kỳ liên quan giữ trạng thái cần đối chiếu, không âm thầm bỏ dòng để có tổng. [Biên nhận từng ngày](catalog-review/cqn-plan-history-20261024.json).

Đầu trang có card cảng/nguồn, mặc định Tổng quan CQN, luôn có lựa chọn cảng riêng. Hai lựa chọn dùng cùng bộ dữ liệu. Tháng/quý/YTD/YoY so đúng ngày đã qua; thiếu ngày, nhóm mơ hồ hoặc thiếu DWT giữ null tương ứng. Nhật ký ngày hiển thị loại kế hoạch, chiều cập/rời cầu, DWT, giờ và điểm đi/đến. Link nguồn giải thích cách chọn ngày cũ; ghi rõ bến tạm/khu neo chưa phủ.

## Vận hành và kiểm tra

Migration `202610240008` và `202610240009` bổ sung allowlist CQN riêng, giữ nguyên allowlist nguồn/parser Hải Phòng, phân quyền importer, phiên bản bất biến và bảo toàn bản thành công khi nguồn lỗi. Metadata scope được nhập qua edition có nguồn, không tự duyệt các đề xuất ownership trong catalog. Backfill qua `port.import_php_plan_days`, không ghi trực tiếp bảng.

Workflow `cqn-plans.yml`: 07:10 Việt Nam hằng ngày; checkpoint chọn ngày mới/thiếu và bốn ngày gần nhất, đối chiếu lại bản sửa, cache raw đã xác minh hash. Ngày nguồn không có bản lịch được ghi thiếu; run lấy/nhập có thể thành công với parsed_days < requested_days, không chứng nhận đủ độ phủ. Lỗi fetch/schema/import hoặc không đọc lại được ngày chốt làm run thất bại. Không dùng một lần chạy thủ công thay nghiệm thu hai chu kỳ cron.

Local: 14/14 kiểm thử parser CQN, 17/17 parser Hải Phòng, 117/117 TypeScript/database, 50/50 Playwright desktop/mobile, typecheck/lint/Next build đạt. Một lần chạy Vitest đồng thời với E2E bị timeout hook do tải máy; chạy lại hai workers đạt toàn bộ. Staging/API/UI và manual refresh được ghi riêng sau triển khai trong biên nhận staging.
