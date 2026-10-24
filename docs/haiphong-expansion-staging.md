# Hải Phòng — GMD / HAH / DXP / PSP

Ngày 24/10/2026. Sau khi chấp nhận PHP/DVP/VGR/VSC, người dùng yêu cầu thực hiện bước tiếp theo. Phạm vi đợt này: GMD tại Nam Đình Vũ, HAH tại Hải An, DXP tại Đoạn Xá, PSP tại PTSC Đình Vũ. Chưa mở rộng GMD toàn quốc hoặc tự coi cả khu vực/miền Bắc hoàn thành.

## Mapping và giao diện

[Manifest phạm vi](catalog-review/haiphong-berth-scope-20261024.json). Các báo cáo 2025 GMD/HAH/PSP đã có hồ sơ công bố và bản PDF local đối chiếu hash. DXP được bổ sung mapping bến từ trang giới thiệu chính thức, không suy từ tên giống nhau. Snapshot web lưu là nội dung trích xuất, không giả thành raw HTML; không thay đổi quyền sử dụng PDF hoặc duyệt mapping core đã có. Khoảng hiệu lực quan hệ giữ null.

- GMD qua Công ty Cổ phần Cảng Nam Đình Vũ: chỉ lịch tại Nam Đình Vũ, không gồm Nam Hải Đình Vũ, DVP, Gemalink, Dung Quất hoặc các ICD. Mặc định “Tổng quan GMD · Hải Phòng · 1 cảng”, không gắn nhãn tổng toàn doanh nghiệp.
- HAH qua Công ty TNHH Cảng Hải An: tách lịch bến khỏi hoạt động đội tàu vận tải HAH.
- DXP khai thác Đoạn Xá: không biến các kho nhựa đường hoặc mục tiêu đầu tư thành tài sản cảng mới.
- PSP khai thác PTSC Đình Vũ: tách khỏi DVP, VSC/Nam Hải Đình Vũ, Nam Đình Vũ và VIMC.

Mỗi trang có card cảng ở đầu, nguồn chính thức, Tổng quan mặc định dù một cảng, lựa chọn riêng từng cảng, tháng/quý/năm, vào/rời riêng, MTD/YTD/YoY, DWT bình quân và drilldown. Header đọc edition database; số liệu sự kiện không nằm trong component/seed/build JSON. Quan hệ theo tài liệu và số lịch bến không thay thế phạm vi doanh thu/tài sản hợp nhất hay lịch sử sở hữu.

## Nguồn và vận hành

Cùng nguồn lịch điều động Cảng vụ Hải Phòng; khớp tuyệt đối NAM DINH VU / HAI AN / DOAN XA / PTSC DINH VU ở Đến cho vào, Từ cho rời. Di chuyển nội cảng không đi vào tổng. Không xác nhận đây là actual hoặc chuyến ghé duy nhất. Một kho vật lý cho mỗi bến, scope tổng quan là góc nhìn cùng dữ liệu nên không nhân đôi sự kiện.

Collector `python scripts/collect-php-plans.py --company HAIPHONG`; checkpoint và raw tại `.local/haiphong-plans`. Chuẩn bị refresh bằng `node scripts/prepare-php-plan-refresh.mjs --haiphong`; importer/readback bằng `node scripts/sync-php-plans.mjs --haiphong`. Workflow `haiphong-plans.yml` thiết kế 07:00 Việt Nam, environment staging, checkout nhánh `codex/cloudflare-next-compat`. Cùng job cập nhật bốn mã, tải ngày mới/thiếu/bốn ngày gần nhất. Lịch sử phiên bản, chống trùng, RLS, giữ bản thành công khi nguồn lỗi và không ghi đè bằng cache cũ theo pipeline đã có.

## Đo lịch sử

[Biên nhận](catalog-review/haiphong-plan-history-20261024.json): mỗi bến đủ 661 ngày nguồn từ 01/01/2025 đến 23/10/2026. Nam Đình Vũ 4.232 dòng, Hải An 946, Đoạn Xá 503, PTSC Đình Vũ 1.491; không có nhóm giờ mơ hồ. Nam Đình Vũ có 6 dòng thiếu DWT ở các ngày 19–20/01 và 10,12,18,20/05/2025. Giữ null, không dùng GT hoặc ước tính; DWT/YoY của kỳ bị ảnh hưởng không công bố như số đầy đủ. Các bến khác không thiếu DWT trong tập đã lấy. Đủ ngày nguồn không chứng minh nguồn ghi nhận toàn bộ tàu thực tế.

Chưa bổ sung chuỗi sản lượng công bố tấn/TEU hoặc tài chính. Đặc biệt GMD YTD so với năm 2025 có thể thiếu nền DWT do sáu dòng nói trên, khác với tháng 10 so cùng kỳ có đủ DWT. Không lấy công suất thiết kế thay sản lượng.

## Kiểm tra local

116/116 tests TypeScript/database, 17/17 Python parser, typecheck/lint đạt. 12/12 Playwright dashboard PHP/DVP/VGR/VSC và bốn mã mới desktop/mobile đạt. Tests gồm alias chính xác, chống nhập lặp, phân quyền, không nhận scope của mã khác, bản công bố bến không thêm ngày hiệu lực giả, Tổng quan bằng bến riêng và bảo toàn bộ lọc.

Rà toàn bộ nhãn Từ/Đến ở các mục vào/rời trong raw lịch sử: số nhãn chính xác khớp các dòng đã nhập. `XANG DAU NAM DINH VU` xuất hiện một lần nhưng không khớp alias đã duyệt nên bị loại, không cộng theo chuỗi con. UI bổ sung ghi rõ khi nền cùng kỳ thiếu DWT, gồm dòng lũy kế, để phân biệt thiếu DWT với thiếu ngày nguồn.

## Readback staging — 24/10/2026

[Biên nhận staging](catalog-review/haiphong-plans-staging-20261024.json). Migration lịch và edition bốn mã đã áp dụng riêng qua Supabase Management API; backfill dùng RPC importer theo batch, không ghi thẳng bảng. Readback database xác nhận 661 ngày mỗi bến, không có ngày lỗi/nhóm mơ hồ; Nam Đình Vũ thiếu đúng sáu DWT nguồn, các bến khác bằng 0.

Commits `0757b2a` và `03012f0` được Workers Builds Linux deploy thành công. Bốn API và trang mã live HTTP 200. Tàu rời tháng 10 đến 23/10 theo lịch: GMD–Nam Đình Vũ 78 dòng / 1.500.303 DWT; HAH–Hải An 15 / 261.349; DXP–Đoạn Xá 9 / 104.981; PSP–PTSC Đình Vũ 19 / 244.530. GMD YTD DWT 2026 là 18.569.220, nhưng YoY giữ null vì nền tàu rời 2025 thiếu bốn DWT (hai DWT nguồn còn lại thiếu ở chiều vào). Không thay bằng GT hoặc giả 0.

Workflow `haiphong-plans.yml` đã đăng ký trên main ở `b0f2195`, lịch 07:00 Việt Nam. [Manual run 40094682947](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40094682947) thành công qua checkpoint, tải nguồn, import/readback và giữ cache. Bốn API sau run cùng xác nhận run status success. Hai event cron thực vẫn chưa nghiệm thu; không dùng manual run thay thế.

Hồi quy 48/48 Playwright đạt. Sau bổ sung giải thích nền thiếu DWT, đã chạy lại typecheck/lint và 2/2 checks desktop/mobile của bốn mã đạt. Kiểm tra live ở 1440px/375px cho cả bốn mã đạt: card nguồn đầu trang, Tổng quan mặc định, bằng số bến riêng, chuyển scope giữ chiều/quý, không tràn ngang. Riêng GMD kiểm tra scope Hải Phòng và phần giải thích nền thiếu DWT. Ảnh `.local/haiphong-plans/top-{GMD,HAH,DXP,PSP}-{desktop,mobile}.png` và `staging-{GMD,HAH,DXP,PSP}-{desktop,mobile}.png`; đã đọc ảnh desktop GMD. Chờ người dùng review bốn dashboard mới; chưa nghiệm thu production.

GitHub CI của commit cuối có thay đổi chức năng `03012f0` đã thành công, gồm lint/typecheck/tests/Playwright/Next build/OpenNext Cloudflare bundle trên Linux.
