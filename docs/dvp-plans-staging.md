# DVP — mở rộng dashboard lịch tàu

Ngày 24/10/2026. Người dùng yêu cầu tiếp tục sau pilot PHP và làm DVP. PHP đã được chấp nhận trên staging; hai chu kỳ cron PHP và production vẫn cần nghiệm thu riêng.

## Phạm vi nguồn

DVP là Công ty Cổ phần Đầu tư và Phát triển Cảng Đình Vũ. [Website doanh nghiệp](https://dinhvuport.com.vn/vn/infrastructure.html) nêu hai cầu, tổng chiều dài 425m. [Trang lịch tàu chính thức](https://dinhvuport.com.vn/vn/shipplan.html) dùng `DINH VU` và ghi lấy dữ liệu từ Cảng vụ Hải Phòng. Trang doanh nghiệp có biểu diễn DWT khác nguồn gốc, vì vậy lấy số từ lịch Cảng vụ, không dùng số trên bản hiển thị lại. Các thông số công suất/cỡ tàu không phải sản lượng.

Phạm vi duy nhất là Bến cảng Đình Vũ, không tách cầu 1/2 khi nguồn không tách. Chỉ khớp tuyệt đối `DINH VU` ở Đến cho vào, Từ cho rời; không cộng Nam Đình Vũ, Nam Hải Đình Vũ, PTSC Đình Vũ, Euro Đình Vũ hoặc di chuyển nội cảng. Không sửa quan hệ sở hữu/hiệu lực đã được duyệt, không cộng DVP vào tổng PHP.

[Biên nhận nguồn](catalog-review/dvp-plan-history-20261024.json): đủ 661 ngày từ 01/01/2025 đến 23/10/2026, 1.466 dòng lịch vào/rời; raw gzip theo hash giữ local. Đây là lịch công bố, chưa xác nhận đã thực hiện. Không phải sản lượng tấn hàng/TEU. Chưa đưa chuỗi sản lượng doanh nghiệp DVP vào dashboard vì chưa có chuỗi đã duyệt; không thay bằng công suất hoặc chia số quý thành tháng.

## Triển khai

Tái sử dụng các bảng/RPC `php_plan_*` làm kho lịch chung theo asset allowlist, thêm duy nhất `dinh_vu`. Tên kho là tên lịch sử nội bộ. Phạm vi tổng PHP vẫn chỉ bốn bến. Migration chỉ mở rộng allowlist và đối chiếu alias importer; RLS, lịch sử bất biến, chống trùng, giữ bản thành công khi nguồn lỗi và chống ghi đè bằng cache cũ giữ nguyên.

Trang `/companies/DVP` và API `/api/v1/companies/DVP/plans` đọc database theo request: tháng/quý/năm, MTD/YTD/YoY đúng khoảng ngày, hai chiều riêng, DWT bình quân, lịch 90 ngày và chi tiết từng ngày. Không có KPI hardcode hay fallback demo. API DVP từ chối asset PHP và ngược lại.

Collector: `python scripts/collect-php-plans.py --company DVP`. Checkpoint/receipt/raw DVP ở `.local/dvp-plans`. Chuẩn bị refresh bằng `node scripts/prepare-php-plan-refresh.mjs --dvp`; nhập bằng `node scripts/sync-php-plans.mjs --dvp`. Workflow `dvp-plans.yml` thiết kế 06:40 Việt Nam hằng ngày, environment staging, checkout nhánh `codex/cloudflare-next-compat`; tải mới/ngày thiếu/bốn ngày cuối và readback. Hai chu kỳ scheduler thực vẫn cần được quan sát, không thay bằng backfill tay.

## Kiểm tra local

113 tests TypeScript/database đạt; 17 tests Python parser đạt; typecheck/lint đạt. DVP desktop/mobile 2/2 đạt; PHP regression 6/6 đạt. Next production build đạt. Bundle OpenNext local dừng ở EPERM symlink Windows; đường deploy hiện có là Workers Builds Linux. Bằng chứng cloud và scheduler được ghi bổ sung sau readback.
