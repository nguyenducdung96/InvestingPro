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

Sản lượng doanh nghiệp công bố vẫn là metric độc lập. Tân Vũ có 16 tháng tấn hàng/TEU riêng. Đã đối chiếu thêm 19 fact đúng phạm vi: Chùa Vẽ riêng 05–07/2025 (3 tháng), Hoàng Diệu riêng 05–07/2025 (3 tháng, TEU không có và giữ null), Hoàng Diệu–Chùa Vẽ gộp 08/2025–08/2026 (13 tháng). Không tự cộng hai chuỗi riêng thành nhóm hoặc chia nhóm cho từng bến. [Biên bản số liệu đã nhìn đối chiếu](catalog-review/php-newsletters-scoped-reviewed-20261024.json).

Bộ chọn phạm vi sản lượng độc lập với bến lịch tàu, nhãn riêng/gộp hiện ngay đầu khối. Khi xem lịch Chùa Vẽ/Hoàng Diệu, mặc định sản lượng là nhóm có số mới hơn và ghi rõ tổng nhóm. API dùng `throughput?asset=...`. HTIT chưa có chuỗi tháng nhập database; UI ghi phần chưa có, không thay bằng số bến khác.

Các fact mới dùng cùng pipeline newsletter hiện có, đối chiếu raw hash, current source revision và R2 receipt; chỉ fact đã review mới vào bundle. Hash nguồn mới/chưa review vẫn chờ kiểm chứng, không auto-approve OCR hoặc dùng JSON trong frontend. Không tải thêm PDF chỉ vì mở rộng phạm vi: cùng bản nguồn phục vụ nhiều chỉ tiêu.

## Kiểm tra

- Local: [biên nhận 661 ngày mỗi bến](catalog-review/php-four-berths-local-20261024.json); raw được xác nhận ngày/schema/hash và tách alias riêng.
- 17 Python, 112 Vitest đạt; PostgreSQL kiểm tra cross-berth isolation, alias sai, quyền public/service, replay, lịch sử bất biến, phạm vi sản lượng riêng/gộp và HTIT không có nền so sánh trước 05/2025.
- Playwright desktop/mobile kiểm tra ba lần đổi bến, API trả đúng chuỗi/bến, chi tiết tàu không lẫn và không tràn trang; kiểm tra sản lượng Tân Vũ hiện hữu cũng đạt. Lint/typecheck đạt.
- Migration `202610240001_php_berth_plans.sql` và `202610240002_php_scoped_throughput.sql` đã chạy thành công trên staging.

## Nghiệm thu live 24/10/2026

- [Backfill `40075205094`](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40075205094) đạt: 661 báo cáo ngày được tải một lần/ngày rồi tách bốn bến, 2.644 head bến/ngày. Không lỗi nguồn. Tân Vũ, Chùa Vẽ, Hoàng Diệu có 22 tháng; HTIT có 18 tháng hiển thị từ 05/2025. Các chuỗi cập nhật đến 23/10/2026.
- [Cập nhật lặp `40075982129`](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40075982129) đạt trong 38 giây: checkpoint 2.644 head, chỉ tải 4 báo cáo ngày gần nhất, nhập/readback cả bốn bến đều thành công. MTD/YTD trước và sau trùng khớp. Hash HTML mới tạo phiên bản mới, không cộng trùng head hoặc tổng.
- [Bản tin `40075843585`](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40075843585) đạt: nhập và công bố 19 fact bổ sung; API trả Tân Vũ 16 tháng, Chùa Vẽ riêng 3 tháng, Hoàng Diệu riêng 3 tháng, Hoàng Diệu–Chùa Vẽ gộp 13 tháng. TEU Hoàng Diệu riêng vẫn null. Nguồn dùng 27 tài liệu đã discovery; không đưa tổng lượt tàu của bản tin vào riêng bến.
- Kiểm chứng UI live: chọn Chùa Vẽ/HTIT trả đúng alias, chart, MTD/YTD và DWT bình quân; bộ lọc nguồn/ngày theo bến; sản lượng mặc định cho Chùa Vẽ/Hoàng Diệu ghi rõ tổng nhóm. HTIT không hiển thị chuỗi sản lượng của bến khác khi chưa có dữ liệu riêng.
- [Biên nhận API](catalog-review/php-four-berths-staging-20261024.json). Số liệu theo lịch điều động, chưa xác nhận actual; không suy đủ sự kiện thực tế chỉ từ đủ trang lịch.
- Scheduler cũ cho Tân Vũ đã quan sát được ba event `schedule` thành công ngày 22/23/24: `39707061652`, `39885652387`, `40051357349`. Giờ đặt 06:30 nhưng GitHub thực chạy khoảng 08:40–08:47; không cam kết đúng phút. Bản mở rộng bốn bến đã qua hai manual run cùng workflow, lần cron bốn bến đầu còn chờ kỳ tiếp theo.
- Full Playwright 38/38 đạt sau mở rộng bến; sau bổ sung sản lượng riêng/gộp và KPI bình quân, bộ kiểm tra PHP desktop/mobile chạy lại 4/4 đạt. Lint/typecheck đạt. Production chưa nằm trong nghiệm thu này.
