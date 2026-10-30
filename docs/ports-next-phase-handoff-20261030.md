# Bàn giao ngành cảng — trạng thái chốt 30/10/2026

Tài liệu tiếp tục hiện hành. Thay thế các thứ tự phase cũ và các đoạn snapshot còn ghi giữ TCW, tách nhiều dòng mỗi mã trên vùng hoặc SWC chỉ có bến phao. Đợt lưu này không bắt đầu phase triển khai tiếp theo.

## Cập nhật phase Bình Dương theo yêu cầu mới 30/10/2026

Đã bắt đầu và hoàn thiện tại máy quy trình refresh riêng Bình Dương; xem [triển khai](binhduong-refresh-20261030.md) và [receipt](catalog-review/binhduong-stabilization-20261030.json). Ba run Quality `41079292805`, `41080083652`, `41080575259` đều success, thay trạng thái còn chờ bên dưới. Edition mới đến 29/10: 8.342 dòng không đổi, last observation vẫn vào 24/08 và rời 15/07. Không đổi PDN.

Bước còn lại trong phase: kiểm tra CI/deploy/readback đúng SHA bản mới, lưu receipt. Workflow Bình Dương hiện chỉ cấu hình thủ công trên nhánh staging; chưa đăng ký default branch, chưa chạy refresh cloud hoặc schedule. Không xem cấu hình là nghiệm thu vận hành. Sau readback, bước vận hành kế tiếp là đăng ký/chạy workflow thủ công cloud, rồi mới xét lịch riêng Bình Dương; không mở lại cron PDN.

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

1. **Chốt kiểm chứng head hiện hành:** xem kết quả CI/Cloudflare nêu trên và các commit tài liệu về sau. Nếu có lỗi, xử lý đúng bằng chứng; staging đã có receipt, không cần lặp toàn bộ audit nếu không có thay đổi.
2. **Bình Dương riêng:** đánh giá refresh/monitor độc lập, không refresh hoặc thay edition PDN để làm mới Bình Dương. Đọc `scripts/collect-pdn-plans.py`, `scripts/export-binhduong-plans.py`, `scripts/verify-binhduong-live.mjs` và ledger. Giữ raw/hash bất biến, lịch sử khi nguồn rỗng/lỗi, replay không nhân dòng, chống ghi đè do commit cạnh tranh. Đích: refresh thủ công → export → push → deploy → readback đúng edition, có receipt. Có cấu hình lịch không đồng nghĩa đã chạy lịch thật.
3. **Phạm vi cảng sông/biển có nguồn của GMD/SGP:** ưu tiên khoảng trống SGP K12/TT2 và các tài sản phù hợp còn thiếu khi có chứng cứ mới. Không tự gộp K12/khu neo/TT2, không dùng phao Gemadept thay cảng. Phước Long/Nam Hải ICD và phần cảng cạn/kho bãi để phạm vi riêng sau này theo quyết định mới.
4. **Khoảng lịch sử:** chỉ điều tra khi có đầu mối mới. Gemalink hiện có 326 dòng vào Jan–Jul/2025 từ PDF quốc gia, còn thiếu chiều rời đầu 2025; đã quét 7.845 hồ sơ/7.683 hash, không tải lại toàn bộ vô cớ. Bình Dương edition đang bàn giao đến 28/10/2026, 8.342 dòng; quan sát rời cuối 15/07 và vào cuối 24/08/2026. Thiếu quan sát không có nghĩa bằng 0.
5. **Sản lượng công bố tấn/TEU của cảng đủ phạm vi:** giữ riêng với DWT và lịch tàu; kỳ, đơn vị và actual/plan phải rõ. Không lấy bình quân/công suất nhân thành tổng kỳ. TCW và sản lượng kho/bãi không nằm trong phase này.

## Các phần tiếp tục để sau

- HCM cloud connectivity; cron PDN (khi mở lại cần hai chu kỳ schedule thật và readback); GMD Dung Quất định kỳ.
- Không điều tra lại Long Bình Tân, không khôi phục TCL/TCW, không triển khai cảng cạn/kho/bãi hoặc production từ yêu cầu lưu trạng thái.
- Không liên hệ bên ngoài khi chưa được người dùng chỉ đạo.

## Dữ liệu và quy trình kết thúc phase

Raw/cache `.local/swc/`, `.local/swc-longbinh/`, `.local/tcw-recheck/`, `.local/gemalink-national/`, `.local/south-plans/`, `.local/pdn/`, `.local/tcl-recheck/` không đi theo Git; xem tên đường dẫn chính xác trong hồ sơ từng phạm vi. Khôi phục đúng hash trước khi export lại; không giả định máy mới có cache. Module/ledger/docs/receipt đã commit mới là mốc khôi phục từ repository.

Kết thúc mỗi phạm vi: cập nhật trạng thái/giới hạn, kiểm tra phù hợp, commit/push nhánh hiện tại, kiểm tra CI/Cloudflare đúng SHA và lưu readback đúng edition. Không cần hỏi lại quyền commit/push đã được giao. Đợt lưu bàn giao hiện tại dừng ở hồ sơ; chưa bắt đầu Bình Dương hoặc các phase sau.
