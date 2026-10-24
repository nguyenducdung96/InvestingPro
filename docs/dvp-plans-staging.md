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

## Readback staging — 24/10/2026

[Biên nhận staging](catalog-review/dvp-plans-staging-20261024.json). Migration DVP đã áp dụng riêng qua CLI Management API, không chạy lại các migration lịch sử chưa có receipt tracking. Host local không kết nối được REST Supabase; backfill tay dùng đúng RPC importer theo từng nhóm trong transaction, không ghi thẳng bảng. Database readback xác nhận 661 ngày, 729 lượt vào, 737 lượt rời, không thiếu DWT/nhóm mơ hồ/ngày lỗi. Lần nhập tay không được coi là scheduler.

Commit `2ac7ba8` đã được Workers Builds Linux build/deploy thành công. Trang DVP và API live HTTP 200; default chiều rời tháng 10 đến 23/10 trả 22 dòng, 313.297 DWT; cùng kỳ 23 dòng / 319.300 DWT, -1,88%. YTD 355 dòng / 4.625.520 DWT; cùng kỳ 318 dòng / 4.166.535 DWT, +11,02%. Đây là DWT theo lịch, không phải hàng bốc xếp hay tàu thực tế đã xác nhận.

Workflow DVP đã đăng ký trên `main` ở commit `e8c2993`, chạy 06:40 Việt Nam. [Manual run 40087198699](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40087198699) thành công: đọc checkpoint, tải ngày mới/gần nhất, nhập phiên bản, readback và giữ cache. Job trên GitHub kết nối REST bình thường. API sau run xác nhận trạng thái success; hai event cron thực vẫn chưa được nghiệm thu.

Kiểm tra live bằng Playwright ở desktop 1440px và mobile 375px: hiển thị đúng KPI, đổi vào/rời và tháng/quý, không tràn ngang; đã đọc ảnh mobile. Ảnh tại `.local/dvp-plans/staging-desktop.png` và `staging-mobile.png`. Chưa có nghiệm thu production, chuỗi actual hoặc sản lượng TEU DVP.

Hồi quy cuối: toàn bộ 44/44 Playwright desktop/mobile đạt sau khi thêm DVP; 113/113 tests TypeScript/database, 17/17 Python parser, typecheck/lint và GitHub CI đều đạt.
