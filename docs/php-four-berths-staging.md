# PHP — dashboard bốn bến

Ngày 24/10/2026. Người dùng yêu cầu hoàn thiện PHP bằng nguồn công khai miễn phí. Đây là mở rộng luồng đầu tư đã nghiệm thu ở Tân Vũ, không phải xác nhận toàn bộ tàu thực tế hoặc toàn bộ tài sản PHP.

## Phạm vi

- Tân Vũ — `TAN VU`, Chùa Vẽ — `CHUA VE`, Hoàng Diệu — `HOANG DIEU`, HTIT — `HTIT`. Các alias khớp tuyệt đối ở cột Đến cho tàu vào và Từ cho tàu rời. Không gồm di chuyển nội cảng, HICT, HHIT hay Đình Vũ/DVP.
- Quan hệ bến dùng edition đã đối chiếu từ tài liệu PHP ngày 21/10/2026; không suy hiệu lực hoặc tỷ lệ sở hữu. [Đơn vị Hoàng Diệu Chùa Vẽ](https://haiphongport.com.vn/vi/don-vi-thanh-vien/cong-ty-tnhh-mot-thanh-vien-cang-hoang-dieu-chua-ve.html), [bài tái cấu trúc PHP](https://haiphongport.com.vn/vi/hoat-dong-dang/cang-hai-phong-tai-cau-truc-toan-dien-thanh-lap-cong-ty-tnhh-mtv-cang-hoang-dieu-chua-ve-va-kien-toan-nhan-su-chu-chot.html).
- [PHP mô tả khai thác HTIT từ tháng 4/2025](https://haiphongport.com.vn/vi/tin-tuc/ben-so-3-4-lach-huyen-tao-cu-hich-cang-hai-phong-php-tang-toc-voi-loat-du-an-moi.html). Dashboard HTIT lấy 05/2025 làm tháng đầu của chuỗi so sánh, tránh dùng tháng khởi động chưa trọn kỳ làm nền; đây là quy tắc so sánh, không khẳng định ngày tàu đầu tiên. Hiện cảnh báo bến mới và hiệu ứng nền thấp. Quý/YTD thiếu khoảng so sánh giữ null.
- Nguồn hoạt động: [Kế hoạch điều động tàu Cảng vụ Hải Phòng](https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx). Hiệu chuẩn ngày máy chủ rồi xác nhận ngày trong từng trang. Không lấy dữ liệu từ website tham khảo.

## Pipeline

`prepare-php-plan-refresh.mjs` chọn ngày mới/thiếu/lỗi ở bất kỳ bến nào và bốn ngày gần nhất → `collect-php-plans.py` tải một báo cáo/ngày, tách bốn bến → `sync-php-plans.mjs` nhập từng bến và đọc lại kết quả. Lịch 06:30 Việt Nam trong workflow `tanvu-plans.yml` được mở rộng cho bốn bến; giữ concurrency để không chạy chồng.

Database mới `php_plan_versions/days/runs` có khóa gồm bến, RLS và bản nguồn bất biến. Migration giữ lịch Tân Vũ cũ trước khi chuyển web sang bảng chung. Service importer không nhận dòng của alias khác, chỉ được nhập bốn bến cho phép; public chỉ đọc tổng và chi tiết đã lọc. Không có credential ở frontend. Replay không cộng trùng; lỗi một ngày/bến giữ head thành công trước đó.

Raw HTML nén theo hash được cache; không tải thêm PDF cho nhánh lịch tàu. Cache mất có thể backfill lại, không phải archive vĩnh viễn. Số KPI/chart đọc database, không đọc receipt JSON đóng gói trong code. Receipt local chỉ phục vụ kiểm chứng.

## Giao diện và số liệu

Trang PHP có bộ chọn bến; mỗi bến có tháng/quý/MTD/YTD/YoY, chiều vào/rời, biểu đồ cột đôi, lịch 90 ngày và drilldown nguồn riêng. Card bến ghi ngày nguồn hiện có, không dùng nhãn actual. Không cộng bốn bến thành tổng doanh nghiệp vì chưa đủ căn cứ ghép sự kiện giữa bến và phạm vi hạch toán.

Sản lượng doanh nghiệp công bố vẫn là metric độc lập. Tân Vũ có chuỗi tấn hàng/TEU riêng. Bản tin có số gộp Hoàng Diệu–Chùa Vẽ nhưng chưa chia thành chuỗi riêng từng bến; HTIT chưa có chuỗi tháng nhập database. UI ghi rõ phần chưa có, không hiển thị số Tân Vũ cho bến khác.

## Kiểm tra

- Local: [biên nhận 661 ngày mỗi bến](catalog-review/php-four-berths-local-20261024.json); raw được xác nhận ngày/schema/hash và tách alias riêng.
- 17 Python, 111 Vitest đạt; PostgreSQL kiểm tra cross-berth isolation, alias sai, quyền public/service, replay, lịch sử bất biến và HTIT không có nền so sánh trước 05/2025.
- Playwright desktop/mobile kiểm tra ba lần đổi bến, API trả đúng chuỗi/bến, chi tiết tàu không lẫn và không tràn trang; kiểm tra sản lượng Tân Vũ hiện hữu cũng đạt. Lint/typecheck đạt.
- Migration `202610240001_php_berth_plans.sql` đã chạy thành công trên staging. Import và kiểm chứng live sẽ được ghi sau khi workflow hoàn tất.
