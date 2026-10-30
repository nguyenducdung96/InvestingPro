# Bàn giao ngành cảng — 30/10/2026

## Kết quả SWC sau triển khai

SWC đã nghiệm thu **staging** tại `b7378a8`: Cloudflare build `8236e8d1` và Quality `41070711134` success (186 Vitest, 74 E2E, Python, lint/typecheck, Next/OpenNext). API/UI khớp 22 tháng hai chiều, tổng, nhật ký và hai dòng SWC miền Nam. [Receipt](catalog-review/swc-staging-20261030.json). Code tính năng là `ae61032`; bản bảo vệ lịch sử đã rebase trên các refresh QNP/NAP/PDN và push nhánh hiện hành.

Đã hoàn thiện phạm vi Long Bình+bến phao có nguồn, chưa phủ đủ ICD Sotrans/Mekong. Workflow refresh SWC chưa đăng ký default branch/chưa chạy cloud; cron/production vẫn chưa nghiệm thu. Các mốc bên dưới ghi CI SWC còn chờ là lịch sử, không phải trạng thái hiện hành. Tiếp tục Bình Dương riêng rồi TCW/GMD/SGP như kế hoạch; không mở rộng phạm vi từ việc lưu receipt này.


## Bổ sung sau yêu cầu hoàn thiện SWC

Đã triển khai Long Bình K0005/cầu 1–3 riêng với bến phao; 4.434 dòng vào/rời 01/01/2025–29/10/2026, tổng tùy chọn, container rỗng 2023/2024 riêng. Xem [SWC](swc-integration-20261030.md). Các dòng bên dưới ghi SWC mới có bến phao là snapshot cũ. Chưa có chuỗi ICD Sotrans/Mekong. Refresh riêng chạy tại máy thành công; workflow thủ công đã cấu hình, chưa đăng ký cron. Staging `ae61032` đã khớp 22 tháng hai chiều, tổng và nhật ký; receipt tại `catalog-review/swc-staging-20261030.json`. Local 186 Vitest/74 E2E đạt. CI `40979236386` bị runner shutdown ở E2E, cần tiếp tục xác minh CI đúng head; không gọi local/staging là CI toàn bộ. Không thay đổi thứ tự các phạm vi khác và các phần người dùng để sau.


Tài liệu hiện hành cho các phase tiếp theo, thay thế thứ tự trong bàn giao 29/10 và các snapshot cũ. Đợt lưu này chỉ cập nhật hồ sơ, không bắt đầu phase triển khai mới.

## Điểm tiếp tục

- Workspace: `D:\GitWork\InvestProApp\InvestingPro`; nhánh `codex/cloudflare-next-compat`.
- Head code sản phẩm: `f4d930e227c82b0a075b350440d383d0e4e7bc28` — rút TCL khỏi danh mục. Commit bàn giao tài liệu nằm sau head này.
- Đọc `AGENTS.md`, tài liệu này và phần đầu `ports-project-status-20261025.md`; kiểm tra Git/remote trước khi sửa. Không khôi phục TCL từ hồ sơ hoặc workflow lịch sử.
- Mục tiêu sản phẩm là quan sát xu hướng đầu tư trên các phạm vi có dữ liệu phù hợp. **Không đặt mục tiêu phủ đủ mọi mã ngành cảng.** Quyết định rút TCL chưa tự áp dụng cho TCW hoặc doanh nghiệp khác.

## Thay đổi đã hoàn tất trong đợt 30/10

1. **Lũy kế cùng tháng có dữ liệu ở hai năm** — `564539e`. Cùng một tập tháng được dùng cho hai tổng; YoY tính từ hai tổng khi nền dương. Bao gồm tháng hiện tại tới cutoff tương ứng khi hai năm có số liệu; hiển thị danh sách tháng. Áp dụng chung cho các trang cảng đã tích hợp và chỉ tiêu sản lượng công bố. CDN cũng theo quy tắc chung, không còn ngoại lệ chỉ tháng đã kết thúc. Tổng đầy đủ theo cửa sổ và metadata nguồn trong API giữ riêng. Xem [quy tắc và phạm vi áp dụng](ports-paired-cumulative-20261030.md).
2. **Lưu ý PDN về thay đổi thủ tục từ 01/07/2026** — `40139b9`. Trang PDN có cảnh báo ngắn kèm liên kết văn bản: thay đổi thủ tục có thể làm giảm số lượt/DWT ghi nhận; không dùng biểu đồ này để kết luận sản lượng thực giảm tương ứng. Không khẳng định định lượng tác động cho từng bến hoặc nhóm tàu từ lời giải thích này.
3. **Rà TCL và rút khỏi sản phẩm** — rà nguồn `6a91219`, rút sản phẩm `f4d930e`. Trang chủ TCL, ePort, báo cáo thường niên/ĐHĐCĐ và nguồn Cảng vụ chưa cung cấp chuỗi lịch sử đúng TCL đủ căn cứ để làm tương tự các mã khác. ĐTNĐ III còn lỗi truy cập, không kết luận mọi nguồn đều không tồn tại. TCL đã bị gỡ khỏi danh mục/tìm kiếm/tổng quan miền Nam; mã và ID cũ trả 404; API hoạt động, dữ liệu chạy kèm, collector/verifier và workflow riêng đã xóa. Bằng chứng lịch sử giữ trong docs. Bến hợp tác 2.200 DWT vẫn thuộc phạm vi CLL đã đối chiếu, không xóa hoặc cộng lại vì rút TCL.

Các commit `92d876b`/`77d9f24` là thử nghiệm tích hợp TNT đã rút. Không sử dụng hướng dẫn chạy TCL trong tài liệu cũ như quy trình hiện hành. Chỉ xem xét lại TCL khi người dùng yêu cầu và có đầu mối nguồn mới đáng kể. [Kết quả rà soát TCL](tcl-source-feasibility-20261030.md).

## Kiểm chứng và phát hành

- Local của `f4d930e`: **185 Vitest**, **6 Playwright desktop/mobile**, lint và typecheck đạt. E2E kiểm tra danh mục không còn TCL, tìm TCL không có kết quả, mã/ID/API cũ 404, tổng quan miền Nam không còn TCL và các phạm vi khác tiếp tục hoạt động.
- Cloudflare staging `f4d930e`: [build b39e0da7](https://dash.cloudflare.com/5e84958e47290692c6ec2817fa1d9af6/workers/services/view/investing-pro-web-staging/production/builds/b39e0da7-7c51-47ed-a67e-03193557a81b) **success**; version `ca20daa5-5603-4078-9dbc-f0b5911159a7`.
- Đã đọc trực tiếp staging: danh mục và tổng quan không còn liên kết TCL; tìm TCL không có kết quả; GMD vẫn có trong danh mục; đường dẫn TCL theo mã/ID và API cũ 404. Receipt: [rút TCL trên staging](catalog-review/tcl-withdrawal-staging-20261030.json). Danh sách niêm yết đã xác minh hiện trả rỗng, nên phép kiểm tra không có TCL ở endpoint đó không chứng minh danh mục này có đầy đủ doanh nghiệp; danh mục biên tập được kiểm tra riêng.
- [Quality run 40950348908](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40950348908): **completed / failure**. Lint, typecheck, Vitest và Python success; bước `pnpm test:e2e` bị `cancelled`, hai bước Next/OpenNext build bị skipped. Chưa xác định nguyên nhân cancellation; chưa có căn cứ gọi đây là lỗi assertion hay lỗi sản phẩm. Khi tiếp tục, xem log/run đúng head và xác minh lại CI trước khi triển khai phase mới. Không ghi CI thành công từ việc local hoặc Cloudflare đã đạt.
- Đây là staging/manual readback. Chưa chứng nhận production hoặc cron. Receipt trước đó vẫn gắn với commit/edition của nó, không đổi nhãn thành chứng cứ mới.

## Phạm vi và khoảng thiếu đang giữ

- Miền Nam có dữ liệu một phần cho **GMD, SGP, PDN, CLL, SWC, VGP**; TCW còn trong danh mục theo dõi chờ nguồn; TCL đã rút. GMD Gemalink và Bình Dương là hai dòng monitor riêng. Không cộng các mã thành tổng khu vực.
- HCM/Bình Dương: edition đã bàn giao đến **28/10/2026**, chưa refresh lại trong đợt này. Bình Dương vẫn 8.342 dòng; quan sát rời cuối 15/07/2026, vào cuối 24/08/2026. Thiếu quan sát không phải hoạt động bằng 0.
- Gemalink: HCM 1.854 dòng hai chiều và 326 dòng tàu vào tháng 1–7/2025 từ PDF quốc gia sau loại trùng. Chiều rời đầu 2025 còn thiếu. Đã quét 7.845 hồ sơ/7.683 hash PDF; không tải lại toàn bộ khi chưa có đầu mối mới. Web mặc định tàu vào, API giữ mặc định tàu rời để tương thích.
- CLL: cầu số 7 và bến 2.200 DWT; SWC: bốn bến phao, chưa đại diện Long Bình/Sotrans/Mekong; VGP: cầu K16 cho thuê, không suy doanh thu từ DWT. SGP có K12A/B/C/C1, chưa tự gộp K12 chung/khu neo/TT2.
- Miền Bắc/Trung giữ các phạm vi đã tích hợp. Không tuyên bố phủ đủ tài sản hay toàn quốc. Chi tiết lịch sử Gemalink/Bình Dương tại [bàn giao 29/10](ports-next-phase-handoff-20261029.md).

## Thứ tự phase tiếp theo

### Phase 1 — ổn định refresh/monitor các phạm vi đang dùng

Điểm bắt đầu ưu tiên: **Bình Dương riêng**. Đọc `scripts/collect-pdn-plans.py`, `scripts/export-binhduong-plans.py`, `scripts/verify-binhduong-live.mjs` và ledger Bình Dương. Đánh giá cơ chế thu thập/export độc lập, không đổi edition PDN hoặc nhập shifting để làm mới Bình Dương.

Giữ raw/hash bất biến, không mất lịch sử khi nguồn rỗng/lỗi, replay không nhân dòng, commit cạnh tranh không ghi đè. Phân biệt nguồn lỗi, phản hồi rỗng hợp lệ và không có quan sát mới. Hoàn tất khi refresh thủ công → export → commit/push → deploy → live readback khớp edition có receipt. Có cấu hình lịch chưa phải đã nghiệm thu chạy lịch thật.

Việc đầu tiên khi tiếp tục: đọc log Quality `40950348908` để xác định vì sao E2E bị cancelled và xác minh lại CI; chỉ sửa code nếu log hoặc tái hiện chứng minh có lỗi. Không tự triển khai phase này chỉ từ việc lưu bàn giao.

### Phase 2 — chọn lọc phạm vi có nguồn và giá trị theo dõi

Ưu tiên rà nguồn chính thức cho **SWC–Long Bình**; sau đó Sotrans/Mekong theo quan hệ và phạm vi thực tế. Với TCW, kiểm tra có chỉ tiêu kho/bãi/depot hoặc tấn/TEU đủ kỳ để theo dõi hữu ích hay không. Không làm một màn hình riêng chỉ để giữ thêm mã trong danh mục; nếu không có nguồn phù hợp, báo rõ kết quả và đề xuất quyết định phạm vi. Không tự xóa TCW theo quyết định dành riêng TCL.

Mỗi ứng viên cần xác định pháp nhân/bến, mã/nhãn nguồn, hợp đồng dữ liệu, lịch sử, đơn vị, mẫu raw và provenance trước khi viết collector/UI. Dùng quy tắc tổng hợp và hiển thị chung khi dữ liệu phù hợp. Không gán toàn Cát Lái cho doanh nghiệp dịch vụ, không lấy tên tàu làm mã bến.

### Phase 3 — hoàn thiện tài sản GMD/SGP và khoảng lịch sử

Rà **GMD Phước Long/Nam Hải ICD**, **SGP K12/TT2** khi có nguồn đủ căn cứ. Không dùng phao Gemadept thay ICD hoặc gộp khu neo với cầu. Bổ sung chiều rời Gemalink đầu 2025 và khoảng thiếu Bình Dương chỉ khi có bằng chứng mới; không ước tính chiều rời từ chiều vào.

Hoàn tất từng phạm vi khi mapping có nguồn, parser/dedup đúng nghĩa, ledger khớp API/UI, kiểm tra không chồng lấn và readback sau deploy. Dữ liệu một phần vẫn được giữ nhưng không gọi là phủ đủ.

### Phase 4 — sản lượng tấn/TEU do doanh nghiệp công bố

Thu thập chuỗi tháng/quý/năm có kỳ và phạm vi rõ ràng, giữ riêng với DWT/lịch tàu. Phân biệt công suất, bình quân tham khảo và sản lượng thực hiện. Không nhân bình quân thành tổng năm; không suy doanh thu hay tấn hàng từ DWT. Lũy kế chỉ so các tháng chung có dữ liệu theo `AGENTS.md`.

### Phase vận hành để sau — chỉ mở lại khi người dùng yêu cầu

- Kết nối nguồn HCM trên cloud và nghiệm thu cron PDN: vẫn để sau theo chỉ đạo trước. Khi mở lại phải kiểm tra sự kiện `schedule` thật và readback đúng bản triển khai; với PDN cần hai chu kỳ lịch thật. Không dùng run thủ công làm bằng chứng schedule.
- Long Bình Tân: không điều tra lại biến động đã được người dùng chấp nhận. Giữ lưu ý PDN đang hiển thị.
- GMD–Dung Quất: chuỗi định kỳ tiếp tục để ngỏ theo quyết định trước.
- Không tự mở lại TCL, mở rộng toàn ngành hoặc phát hành production từ yêu cầu lưu tiến độ.

## Quy tắc tiếp tục và bàn giao

Giữ tổng ghi nhận dù thiếu ngày/trọng tải; raw thiếu null, kỳ không có quan sát unavailable, chất lượng thu gọn. Lũy kế dùng cùng tập tháng hai năm và cutoff tương ứng; không cộng phạm vi chồng lấn hoặc nhân theo tỷ lệ vốn. Giữ kế hoạch, giờ tại cầu, snapshot và actual đúng ngữ nghĩa của từng nguồn.

Các verifier còn dùng: `node scripts/verify-gemalink-backfill-live.mjs`, `node scripts/verify-binhduong-live.mjs`, `node scripts/verify-south-live.mjs`. Chỉ chạy khi cần kiểm chứng, không tự refresh hoặc quét lại nguồn trong đợt bàn giao.

Raw/cache `.local/gemalink-national/`, `.local/south-plans/`, `.local/pdn/`, `.local/tcl/`, `.local/tcl-recheck/` không đi theo Git. Ledger/module/docs/receipt đã commit mới là mốc có thể lấy lại từ repository; muốn export lại phải khôi phục bằng chứng đúng hash. Không gửi yêu cầu cho bên ngoài khi chưa được chỉ đạo.

Kết thúc mỗi phạm vi: cập nhật status/giới hạn, kiểm tra phù hợp, commit/push nhánh hiện tại, đọc CI/Cloudflare đúng commit, lưu receipt API/UI đúng edition và báo riêng phần chưa nghiệm thu. Không cần hỏi lại quyền commit/push đã được người dùng giao trong chuỗi công việc này.
