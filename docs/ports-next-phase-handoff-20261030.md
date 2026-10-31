# Bàn giao ngành cảng — trạng thái chốt 30/10/2026

## HCM cloud đã kiểm lại theo yêu cầu mới — 31/10/2026

Đã mở lại phase nghiệm thu HCM theo yêu cầu người dùng. Probe Ubuntu x64 [41184106677](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41184106677) vẫn failure bootstrap; chẩn đoán Linux ARM/Windows [41184128683](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41184128683) xác nhận TCP 80/443 timeout tới nguồn. Máy phát triển cùng đợt GET được HTTP 200/TLS hợp lệ. Sáu chu kỳ schedule 26–31/10 đều không lấy được nguồn; **cloud/scheduled refresh chưa nghiệm thu**.

Staging vẫn khớp bản tốt đến 28/10, 11 asset × 22 tháng × hai chiều và tổng issuer/vùng. Bổ sung hai kiểm thử đường lỗi theo ngày: giữ dữ liệu/raw/thời điểm thành công cũ; ngày thiếu không tạo quan sát/hash giả. 11 Python + 4 Node tests đạt; không thay dữ liệu hay hành vi ứng dụng. Lịch HCM hiện hữu giữ nguyên, main khớp workflow staging. [Kết quả và cổng tiếp tục](hcm-cloud-acceptance-20261031.md), [biên nhận](catalog-review/hcm-cloud-acceptance-20261031.json).

Bước cần giải quyết là đường lịch chính thức truy cập được từ cloud, rồi kiểm POST lịch sử/ngày mới, raw/hash toàn cửa sổ, export/deploy/readback và hai schedule thật. Không thay nguồn bằng NEO hay kết luận vận hành ổn định từ probe. PDN cron, Long Bình Tân, ICD/kho bãi và production vẫn ngoài phase. Các đoạn ghi HCM để sau bên dưới là snapshot trước yêu cầu mở lại này.

## K12 đã đối chiếu riêng từng dòng — 31/10/2026

**Phát hành chốt:** mã dữ liệu K12 `6c75d59`, bản CI cuối `6ec498c` trên `codex/cloudflare-next-compat`. [Quality 41183079501](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41183079501) **success**: validate gồm lint/typecheck/188 Vitest/Python/Next/OpenNext; E2E desktop và mobile đều success; required `check` chỉ success sau tất cả các job. Cloudflare build `74401468-db7b-416e-af17-493157205739` **success**. Ba attempt trước của run 41181037139 bị runner shutdown sau khoảng 5 phút E2E; đã chia project desktop/mobile thành hai job ngắn, giữ đủ test và không dùng continue-on-error/bỏ check. Local toàn bộ 78 E2E đạt.

API live đã khớp 22 tháng hai chiều cho 11 asset theo dõi, tổng sáu phạm vi SGP và một dòng SGP miền Nam; nhận đúng fingerprint manifest LF `21c19d5beb7046408f354a9f50f8c17c0d5b2dca78b832e3c471ff17fdcc25c2`. UI live desktop/mobile đúng 331/452 dòng, 217/217 ngày tra cứu; hash/giờ/DWT mẫu khớp và K12 khu neo bị giữ ngoài tổng. Đường dẫn ứng dụng/dữ liệu K12 không đổi giữa bản live 6c75d59 và bản CI 6ec498c. [Receipt đầy đủ](catalog-review/sgp-k12-integration-20261031.json).

121 dòng chưa đủ điều kiện và 43 điều chuyển tiếp tục giữ riêng. Không nghiệm thu HCM cloud, schedule refresh hoặc production bằng kết quả này; dữ liệu vẫn là kế hoạch công bố đến 28/10/2026, không xác nhận thực hiện. Phạm vi tra cứu ban đầu đã hoàn tất; phần chưa khớp cần bằng chứng khác theo từng movement, không mở alias K12 toàn cục.

Bản dữ liệu thêm 331 dòng K12 đủ bằng chứng vào Tân Thuận: 173 vào / DWT 2.232.642 và 158 rời / DWT 2.067.706. Giữ 121 dòng trực tiếp chưa đủ điều kiện và 43 điều chuyển ngoài tổng. Không mở alias K12 toàn cục, không cộng snapshot NEO/Hoa tiêu hoặc suy actual. Sáu monitor SGP và một dòng SGP miền Nam giữ nguyên.

Rà 666 bảng lịch và đủ 217/217 bản ngày đăng ký ứng viên; không còn ngày truy vấn ban đầu chưa tải. Đã tôn trọng phản hồi HTTP 429 nghỉ 15 phút rồi tiếp các batch có giới hạn. Raw/hash, từng kết quả và gate manifest được lưu; 10.803 dòng cũ giữ nguyên. Độ phủ K12 chưa đầy đủ/đều giữa hai năm được nêu trong chi tiết thu gọn. [Runbook](sgp-k12-row-integration-20261031.md), [receipt tích hợp](catalog-review/sgp-k12-integration-20261031.json), [manifest](catalog-review/sgp-k12-reviewed-rows.json).

CI/staging đã kiểm chứng như trên; các mục cũ bên dưới là biên bản phase trước. HCM cloud acceptance, PDN cron, Long Bình Tân và ICD/kho bãi chưa mở lại.

## Tân Thuận 2 đã tích hợp — 31/10/2026

Bản ứng dụng cuối **a42c996** trên `codex/cloudflare-next-compat`: [Quality 41174571970](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41174571970) **success ở attempt 2**, gồm lint/typecheck/Vitest/Python/E2E/Next/OpenNext build. Attempt 1 runner nhận shutdown trong E2E; chạy lại cùng SHA, không sửa ứng dụng theo lỗi hạ tầng. Cloudflare build `c0fd6d31-8b72-40f8-8a0e-1b0b94cea27f` **success**. API live khớp 22 tháng hai chiều cho 11 asset theo dõi, tổng sáu phạm vi SGP và dòng miền Nam; bốn ngày mẫu nhật ký khớp raw/hash. UI live desktop/mobile chọn TT2 đúng, một dòng SGP, không tràn ngang. Bản test/evidence a42c996 có cây ứng dụng/packages/scripts giống bản UI đã kiểm chứng cdbd601; API/data không đổi sau readback 262fa2f.

Không dùng kết quả tích hợp lịch sử này để nghiệm thu HCM cloud, schedule refresh hoặc production. Dữ liệu TT2 vẫn đến 28/10/2026; không đưa probe 31/10 hoặc Hoa tiêu vào tổng. K12 tiếp tục cần quy thuộc từng dòng cầu/khu neo; không mở rộng alias bằng tên gần giống.

Đã mở monitor `sg_tan_thuan_2` cho nhãn chính xác TAN.T.2; SGP sáu phạm vi và miền Nam vẫn một dòng SGP. 168 vào + 180 rời = 348 dòng lịch sử, DWT lần lượt 2.691.676 / 3.113.233; 46 điều chuyển riêng, không cộng Hoa tiêu. Rà SHA/reparse đủ 666 bảng, bảo toàn 10.455 dòng cũ. K12, B.TT2, TTD, K17 tiếp tục loại khỏi alias TT2. Mapping dựa nguồn SGP/Cục Hàng hải và một mẫu tàu độc lập; dữ liệu vẫn là kế hoạch công bố.

[Hồ sơ tích hợp](sgp-tt2-integration-20261031.md), [receipt](catalog-review/sgp-tt2-integration-20261031.json). Các mục dưới là biên bản phase trước, không thay trạng thái mới này. HCM cloud acceptance, PDN cron, Long Bình Tân và ICD/kho bãi chưa mở lại.

## Collector SGP K12 / TT2 — triển khai 31/10/2026

Code `e074654`: **Quality 41117367465 success**, Cloudflare build `4ba1d7c9-54c8-48b9-89c4-2cb5f7a772f5` success. Hai run thủ công cloud `41117509985` (runner lạnh) và `41118011611` (khôi phục cache) success; đã có **run schedule thật 41159531589 success**. Đã tải và kiểm tra hash/parse của artifact: 1 → 2 → 3 raw revisions giữ nguyên; latest vẫn 3 dòng, không cộng thành 9. Run schedule ghi nhận nguồn sửa giờ vào của NEWSUN GREEN 03 từ ô trống thành 05:00, giữ cả bản trước. Một chu kỳ schedule thật không thay nghiệm thu vận hành dài hạn/production; `scheduled_refresh_verified=false`.

Đã triển khai collector Hoa tiêu riêng `e074654`, lưu cả hai tab ngày, raw/hash/revision và last-good index; DWT null, GRT/giờ/ghi chú nguyên nguồn, hủy/lùi/đổi giờ và dòng trùng/biến mất phải review. Python 11 collector + 3 overlap đạt. Workflow read-only, không publish app, đã chạy cloud lạnh thành công tại [41117509985](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41117509985); lịch archive đã đăng ký trên main `f4b008a` lúc 06:15/12:15/18:15/23:15 Việt Nam. Đã có một schedule thật được kiểm chứng, chưa nghiệm thu vận hành dài hạn/production; artifact 90 ngày/cache chưa phải archive vĩnh viễn.

Đầu mối mới: HAI PHAT 135 ngày 31/10 ở Hoa tiêu TT2 (GRT 6.282, ETA ghi chú 12:00) khớp ứng viên Cảng vụ TAN.T.2 (giờ 12:00, DWT 13.399). Audit đủ 666 raw tìm thêm 168 vào + 180 rời = **348 dòng TAN.T.2 ứng viên**, 46 điều chuyển riêng. Không gán vào SGP ngay. K12 NEWSUN GREEN 03 có giờ hai nguồn khác nhau; chưa merge/backfill DWT. Hai probe local HCM phục vụ đối chiếu, không nghiệm thu kết nối cloud HCM.

[Runbook collector](sgp-pilot-collector-20261031.md), [receipt](catalog-review/sgp-pilot-collector-20261031.json). **Điểm dừng phase: collector/archive/review; chưa đổi alias/API/UI/edition hoặc tổng issuer/vùng.** Bước tiếp: xác nhận TAN.T.2 và quy tắc chống trùng để chuẩn bị tích hợp lịch sử TT2; K12 tiếp tục phân biệt cầu/khu neo từng dòng. Các phần PDN cron, Long Bình Tân, ICD/kho bãi giữ ngoài phạm vi.


## Rà nguồn SGP K12 / TT2 — hoàn tất 31/10/2026

Đã xác minh phạm vi cầu K12 và TT2, xem bản scan thông báo hàng hải 38/2025 và tờ trình SGP 493/2026; kiểm tra hash/parse đủ 666 bảng Cảng vụ (01/01/2025–28/10/2026). K12 có 228 vào + 224 rời còn mơ hồ giữa cầu Sài Gòn/khu neo Vũng Tàu; 43 điều chuyển giữ riêng. `B.TT2` là phao (30 vào/32 rời), `TTD` là bến khác, `K17` thuộc Bông Sen; không gán sang cầu TT2.

Tìm được nguồn trực tiếp Hoa tiêu miền Nam có nhãn `K12`/`TT2`, hai tab 30–31/10. Mẫu TT2: HAI PHAT 135, GRT 6.282, DWT không có. Có thể chuẩn bị collector lưu kế hoạch riêng; không đổi GRT thành DWT, không suy lịch thành actual hoặc cộng trùng với Cảng vụ. Frontend bản đồ hiện gọi API `apikehoach.cangvuhanghaitphcm.gov.vn:5000`; mẫu local vẫn toàn NEO, không dùng làm movement. Không mở lại nghiệm thu HCM cloud.

[Hồ sơ rà nguồn](sgp-k12-tt2-source-review-20261031.md), [receipt hash và mẫu](catalog-review/sgp-k12-tt2-source-review-20261031.json), công cụ `scripts/audit-sgp-k12-tt2.py`. **Chưa thay code ứng dụng, alias hoặc edition công bố.** Bước kế tiếp: collector Hoa tiêu độc lập chỉ lưu raw/parse để review, rồi nghiệm thu quy thuộc từng dòng và chống trùng trước khi cộng tổng. Đợt này chỉ rà nguồn, chưa bắt đầu collector/tích hợp. Bình Dương đã bật 08:55; nghiệm thu hai chu kỳ schedule thật/production vẫn theo mục bàn giao riêng.


## Bình Dương đã chạy cloud và đăng ký lịch riêng — 30/10/2026

Bản code cuối **77d88f0**: Quality [41087454420](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41087454420) **success ở attempt 2**, gồm lint/typecheck/Vitest/Python 8 kiểm tra Bình Dương, E2E và Next/OpenNext build. Attempt 1 bị runner shutdown ở E2E, không sửa code theo lỗi hạ tầng. Cloudflare build `a05a1d7b-dd58-4e54-9617-07f1692ca3fe` **success**; readback staging sau deploy đúng edition cloud `b103701` cũng đạt. Đã hoàn tất yêu cầu chạy cloud và cấu hình lịch; nghiệm thu hai chu kỳ schedule thật/production vẫn tách riêng.

Workflow `binhduong-plans.yml` đã active trên default branch `main`, đăng ký lịch **08:55 Việt Nam mỗi ngày** tại `af6fb3f`; checkout/publish vẫn chỉ nhánh staging `codex/cloudflare-next-compat`. Thay đổi `main` chỉ gồm workflow Bình Dương, không merge ứng dụng staging hoặc đổi workflow PDN.

Run thủ công cloud [41085429972](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41085429972) đã **success**: cold runner lấy 14 phản hồi 23–29/10 → export → kiểm tra → push `2e1ec1f` → deploy → readback đúng edition `checked_at=2026-10-30T15:57:29.850729+00:00`, 22 tháng hai chiều và tổng GMD miền Nam khớp. Vẫn 8.342 dòng, không bù được khoảng thiếu. [Receipt cloud](catalog-review/binhduong-cloud-refresh-20261030.json).

Run thứ hai từ chính workflow trên `main` [41086953831](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41086953831) cũng **success**, publish `b103701`, readback hoàn tất 23:10:43 Việt Nam; edition `checked_at=2026-10-30T16:07:26.450609+00:00`. [Receipt cấu hình lịch và hai run cloud](catalog-review/binhduong-schedule-20261030.json). Dữ liệu vẫn 8.342 dòng; cả 20 JSON nhật ký lịch sử và PDN không đổi. Sửa cuối `77d88f0` giữ nguyên tệp nén khi JSON không đổi; Python 8 kiểm tra gồm cold runner với gzip header khác nền tảng đã qua.

Không cần Deploy Hook hoặc secret mới. GitHub không có check trên commit bot không đủ để kết luận Cloudflare không build: readback cloud đã hoàn tất trước khi build commit code tiếp theo bắt đầu. Đã bỏ yêu cầu hook từng thử trong quá trình chẩn đoán. Gzip journal chuẩn hóa header; nếu JSON không đổi thì giữ nguyên tệp nén đã duyệt, kể cả khác zlib/Python. Kiểm tra cold runner mô phỏng header khác nền tảng đã qua. Verifier lưu event/run/attempt/commit và nguồn refresh để audit.

Lịch đã đăng ký không thay bằng chứng chạy lịch. Tại lúc cấu hình chưa có run `event=schedule`; `scheduled_refresh_verified=false`, production chưa nghiệm thu. Hai chu kỳ sớm nhất để đối chiếu là sau 08:55 ngày 31/10 và 01/11/2026, có thể trễ theo scheduler. Chỉ chốt schedule khi hai chu kỳ thật có source/export/publish và readback đúng edition; không lấy hai run thủ công làm bằng chứng schedule. HCM connectivity, cron PDN, Long Bình Tân, ICD/kho bãi và Dung Quất định kỳ tiếp tục để sau.


Tài liệu tiếp tục hiện hành. Thay thế các thứ tự phase cũ và các đoạn snapshot còn ghi giữ TCW, tách nhiều dòng mỗi mã trên vùng hoặc SWC chỉ có bến phao. Đã cập nhật thêm kết quả phase Bình Dương được người dùng giao trong cùng ngày; snapshot trước phase giữ bên dưới.

## Cập nhật phase Bình Dương theo yêu cầu mới 30/10/2026

Quality **41084003113** của bản tính năng **ea7b7a3** đã **success**, gồm lint/typecheck/Vitest/Python, E2E và cả Next/OpenNext build. CI/readback này không thay nghiệm thu refresh cloud theo lịch hoặc production.

Đã hoàn tất refresh thủ công → export → push → deploy → readback staging riêng Bình Dương (`ea7b7a3`); xem [triển khai](binhduong-refresh-20261030.md) và [receipt](catalog-review/binhduong-stabilization-20261030.json). Ba run Quality `41079292805`, `41080083652`, `41080575259` đều success, thay trạng thái còn chờ bên dưới. Edition mới đến 29/10: 8.342 dòng không đổi, last observation vẫn vào 24/08 và rời 15/07. Không đổi PDN.

Cloudflare build `ebe50cc3-e942-4d6f-9699-09d79d656bf6` success; readback 22 tháng hai chiều, journal, tổng GMD miền Nam và hàng GMD vùng đều đạt. [Readback](catalog-review/binhduong-live-readback-20261030.json). Workflow Bình Dương hiện chỉ cấu hình thủ công trên nhánh staging; chưa đăng ký default branch, chưa chạy refresh cloud hoặc schedule. Không xem cấu hình là nghiệm thu vận hành. Bước vận hành kế tiếp là đăng ký/chạy workflow thủ công cloud, rồi mới xét lịch riêng Bình Dương; không mở lại cron PDN.

Các snapshot bên dưới là trước phase Bình Dương, giữ làm mốc lịch sử.

## Workspace và mốc code

- Workspace: `D:\GitWork\InvestProApp\InvestingPro`; branch `codex/cloudflare-next-compat`.
- Head tính năng: `53d226f0a42db803304b1b1d303e6c63cff4fa88` — rút TCW. Hồ sơ staging đã push tại `34005f1`; commit lưu bàn giao nằm sau mốc này.
- Khi tiếp tục: đọc `AGENTS.md`, tài liệu này và đầu `ports-project-status-20261025.md`, kiểm tra Git/remote; không dùng chỉ dẫn trong hồ sơ lịch sử thay trạng thái hiện hành.

## Quyết định sản phẩm phải giữ

1. Chỉ theo dõi **cảng sông và cảng biển**. Cảng cạn, depot, kho bãi tách sang phạm vi riêng sau này; không bắt đầu module TCW kho/bãi hoặc mở rộng ICD chỉ để giữ thêm mã.
2. **TCL và TCW đã rút** khỏi danh mục/tìm kiếm/tổng quan; mã, ID và API công khai cũ trả 404. Hồ sơ nghiên cứu giữ nguyên. Việc rút TCW là quyết định phạm vi sau rà nguồn chưa xác lập được cảng đủ căn cứ, không khẳng định doanh nghiệp chắc chắn không có cảng ở mọi nơi. Không tự rút thêm mã khác.
3. Tổng quan vùng: **mỗi ticker đúng một dòng tổng**, chỉ tài sản trong vùng. GMD miền Nam = `gmd_south` (Gemalink + Bình Dương); SWC = `swc_all` (Long Bình + bốn phao). Cảng riêng theo dõi trong chi tiết mã. Không cộng các issuer thành tổng khu vực hoặc cộng phạm vi chồng lấn.
4. Giữ số lượt/DWT ghi nhận dù thiếu ngày hoặc trọng tải; raw thiếu vẫn null, không có quan sát vẫn unavailable. Coverage/lỗi nguồn thu gọn.
5. Lũy kế/YoY dùng cùng các tháng có số liệu ở cả hai năm, cùng cutoff cho tháng hiện tại; ghi rõ tập tháng. API tổng đầy đủ giữ riêng. Kế hoạch công bố không thành actual, DWT không thành tấn hàng/TEU/doanh thu.

## Phần đã hoàn tất

- **SWC:** Long Bình K0005, cầu 1/2/3 và bốn bến phao theo dõi riêng trong chi tiết mã; có tổng `swc_all`. Long Bình 4.434 dòng vào/rời 01/01/2025–29/10/2026; nguồn là kế hoạch công bố. Code `ae61032`, bảo vệ lịch sử `b7378a8`; Quality `41070711134` và Cloudflare `8236e8d1` success, API/UI staging 22 tháng hai chiều khớp. Chưa phủ đủ tài sản; không tự đưa ICD Sotrans/depot/kho vào phạm vi hiện tại. [Hồ sơ SWC](swc-integration-20261030.md), [receipt](catalog-review/swc-staging-20261030.json).
- **Tổng quan vùng:** `f916399`, biên nhận `afaf5f3`; staging khớp tổng API/UI hai chiều. Quality `41073780446` và `41074411845` đã xác minh success qua GitHub API ở đợt rút TCW. [Receipt vùng](catalog-review/regional-issuer-totals-20261030.json).
- **TCW:** đã rà website/báo cáo/ĐHĐCĐ, 103 mục bến cảng TP.HCM và 51 cảng/79 cầu Đồng Nai. Chưa có mapping cảng đang khai thác đủ căn cứ. Số kho/bãi năm 2024/2025 chỉ lưu nghiên cứu; không tích hợp vào sản phẩm cảng. Rút mã tại `53d226f`; local 7 Vitest, 4 E2E desktop/mobile, lint/typecheck đạt. Staging danh mục/tìm kiếm/tổng quan không còn mã, mã/ID/API cũ 404; GMD còn hoạt động. [Rà nguồn TCW](tcw-source-feasibility-20261030.md), [receipt rút mã](catalog-review/tcw-withdrawal-staging-20261030.json).
- **Lũy kế cùng tháng:** `564539e`; [hợp đồng tính](ports-paired-cumulative-20261030.md).
- **PDN:** lưu ý thay đổi thủ tục từ 01/07/2026 đã hiển thị tại `40139b9`; không mở lại điều tra Long Bình Tân hoặc suy mức giảm hoạt động thực từ thiếu bản ghi.

## CI, triển khai và giới hạn nghiệm thu

- Khi lưu, kiểm tra lại Quality **`41079292805` của `53d226f`** và Cloudflare build **`520fb24a-eb4c-4175-a5cf-22a95861c17e`**. Trạng thái máy đọc được lưu ở [snapshot bàn giao](catalog-review/ports-status-snapshot-20261030.json).
- Cloudflare bản tính năng `53d226f`: **Ready**, version `e347c515`, 100% traffic trên worker staging; build `520fb24a`. Build tài liệu `34005f1` còn chạy lúc lưu. Quality `41079292805` (tính năng) và `41080083652` (tài liệu) còn chạy E2E lúc kiểm tra cuối.
- Readback staging bản rút TCW đã đạt; không gọi CI toàn bộ thành công khi run còn chạy hoặc bỏ qua bước. Không suy một lần readback thành cron hoặc production đã nghiệm thu.
- CI cũ `40950348908`/`40979236386` là lịch sử; không dùng làm điểm bắt đầu thay cho head hiện hành. Nếu run hiện hành failure/cancelled, đọc bước/log đúng SHA và chỉ sửa khi có bằng chứng lỗi; không tự chạy lại quét nguồn.
- SWC refresh thủ công tại máy đạt; workflow mới chưa đăng ký default branch/chưa chạy cloud. Chưa nghiệm thu scheduled refresh/production.

## Điểm tiếp tục sau khi người dùng yêu cầu làm tiếp

1. **Đã chốt phase Bình Dương thủ công:** tính năng `ea7b7a3`, Quality `41084003113` và Cloudflare `ebe50cc3` success; staging đúng edition đến 29/10, 8.342 dòng, 22 tháng hai chiều và tổng GMD miền Nam khớp. Xem receipt phase và readback ở đầu tài liệu.
2. **Bình Dương đã chạy cloud và đăng ký 08:55 Việt Nam:** xem mục đầu tài liệu; tiếp theo nghiệm thu hai chu kỳ schedule thật (sớm nhất 31/10 và 01/11), giữ source/export/readback đúng edition. Không mở lại cron PDN. Các snapshot chưa đăng ký bên dưới là lịch sử trước đợt vận hành này.
3. **Collector Hoa tiêu K12/TT2 đã triển khai 31/10:** xem runbook/receipt đầu tài liệu. Bước kế tiếp xác nhận alias TAN.T.2 (348 dòng vào/rời ứng viên có DWT) và chống trùng trước khi tích hợp lịch sử TT2; giữ K12/khu neo/B.TT2/TTD/K17 riêng. Chưa đổi dashboard hoặc tổng SGP. ICD/kho/bãi để phạm vi riêng.
4. **Khoảng lịch sử:** chỉ điều tra khi có đầu mối mới. Gemalink hiện có 326 dòng vào Jan–Jul/2025 từ PDF quốc gia, còn thiếu chiều rời đầu 2025; đã quét 7.845 hồ sơ/7.683 hash, không tải lại toàn bộ vô cớ. Bình Dương edition đang bàn giao đến 28/10/2026, 8.342 dòng; quan sát rời cuối 15/07 và vào cuối 24/08/2026. Thiếu quan sát không có nghĩa bằng 0.
5. **Sản lượng công bố tấn/TEU của cảng đủ phạm vi:** giữ riêng với DWT và lịch tàu; kỳ, đơn vị và actual/plan phải rõ. Không lấy bình quân/công suất nhân thành tổng kỳ. TCW và sản lượng kho/bãi không nằm trong phase này.

## Các phần tiếp tục để sau

- HCM cloud connectivity; cron PDN (khi mở lại cần hai chu kỳ schedule thật và readback); GMD Dung Quất định kỳ.
- Không điều tra lại Long Bình Tân, không khôi phục TCL/TCW, không triển khai cảng cạn/kho/bãi hoặc production từ yêu cầu lưu trạng thái.
- Không liên hệ bên ngoài khi chưa được người dùng chỉ đạo.

## Dữ liệu và quy trình kết thúc phase

Raw/cache `.local/swc/`, `.local/swc-longbinh/`, `.local/tcw-recheck/`, `.local/gemalink-national/`, `.local/south-plans/`, `.local/pdn/`, `.local/tcl-recheck/` không đi theo Git; xem tên đường dẫn chính xác trong hồ sơ từng phạm vi. Khôi phục đúng hash trước khi export lại; không giả định máy mới có cache. Module/ledger/docs/receipt đã commit mới là mốc khôi phục từ repository.

Kết thúc mỗi phạm vi: cập nhật trạng thái/giới hạn, kiểm tra phù hợp, commit/push nhánh hiện tại, kiểm tra CI/Cloudflare đúng SHA và lưu readback đúng edition. Không cần hỏi lại quyền commit/push đã được giao. Đợt lưu bàn giao hiện tại dừng ở hồ sơ; chưa bắt đầu Bình Dương hoặc các phase sau.
