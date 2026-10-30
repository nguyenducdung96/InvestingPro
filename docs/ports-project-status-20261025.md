# Tiến độ ngành cảng — cập nhật 30/10/2026

## SWC — triển khai Long Bình ngày 30/10/2026

Theo yêu cầu mới, đã tiếp tục riêng SWC: mặc định Long Bình K0005/cầu 1–3, thêm 4.434 dòng vào/rời trực tiếp 01/01/2025–29/10/2026; bến phao giữ riêng, tổng hai phạm vi chỉ khi chọn tường minh. Nguồn pháp nhân/bến đã đối chiếu doanh nghiệp, quyết định Bộ và danh mục Cảng vụ 51 bến/79 cầu. Hai dòng không phù hợp cách ly, bốn nhóm trùng được hợp nhất có proof. Container rỗng Long Bình 2023/2024 do SOTRANS Group công bố hiển thị riêng. [Triển khai và giới hạn](swc-integration-20261030.md), [rà nguồn](catalog-review/swc-source-review-20261030.json).

Local đạt 186 Vitest, bốn test Python mới, 74 E2E toàn bộ desktop/mobile, lint/typecheck và Next build. Refresh thủ công bảy ngày (14 phản hồi) thành công, cold-cache/replay khớp. Workflow SWC riêng đã viết, chưa chạy cloud hoặc đăng ký lịch tự động; Staging tại `ae61032` đã khớp 22 tháng hai chiều, nhật ký, tổng và miền Nam; [receipt](catalog-review/swc-staging-20261030.json). CI `40979236386` qua lint/typecheck/Vitest/Python, E2E bị runner shutdown; chưa nghiệm thu CI toàn bộ. ICD Sotrans/Mekong còn thiếu chuỗi; không gọi là phủ đủ SWC. Không mở lại TCL, Long Bình Tân hoặc cron PDN/HCM connectivity.

Bàn giao 30/10 bên dưới là mốc trước triển khai SWC; phần cập nhật này có ưu tiên hơn các dòng còn ghi SWC chỉ có bến phao. Tiếp theo: hoàn tất readback/CI SWC, rồi trở lại refresh Bình Dương và rà chọn lọc TCW/GMD/SGP theo thứ tự trong bàn giao.


## Bàn giao hiện hành — 30/10/2026

Đã lưu theo yêu cầu người dùng; chưa bắt đầu phase triển khai mới. Tài liệu tiếp tục hiện hành là [bàn giao phase sau 30/10](ports-next-phase-handoff-20261030.md), thay thế thứ tự trong bàn giao 29/10 và snapshot cũ.

- Head code sản phẩm `f4d930e` trên `codex/cloudflare-next-compat`: TCL đã rút khỏi danh mục/tìm kiếm/tổng quan miền Nam; mã/ID/API cũ 404, collector và workflow riêng đã gỡ. Không khôi phục chỉ để phủ thêm mã ngành cảng. TCW và mã khác chưa có quyết định rút tương tự.
- Lũy kế chung `564539e`: chỉ cộng cùng các tháng có số liệu hai năm, cutoff tương ứng, ghi danh sách tháng; API full-range giữ riêng. CDN không còn ngoại lệ chỉ tháng hoàn tất. Cảnh báo PDN về thay đổi thủ tục từ 01/07/2026 ở `40139b9`.
- Bản rút TCL đã qua 185 Vitest, 6 Playwright desktop/mobile, lint/typecheck tại máy. Cloudflare staging build `b39e0da7-7c51-47ed-a67e-03193557a81b` success, version `ca20daa5-5603-4078-9dbc-f0b5911159a7`; đã đọc trực tiếp staging đúng hành vi. [Receipt](catalog-review/tcl-withdrawal-staging-20261030.json). Quality run `40950348908` đã kết thúc failure: lint/typecheck/Vitest/Python success, E2E cancelled, hai bước build skipped; chưa xác định nguyên nhân cancellation. Cần xác minh lại CI khi tiếp tục. Không coi staging/local là CI/cron/production acceptance.
- Thứ tự phase sau: (1) refresh/monitor Bình Dương riêng; (2) rà chọn lọc SWC–Long Bình và tính phù hợp dữ liệu TCW; (3) tài sản GMD/SGP và khoảng lịch sử có nguồn mới; (4) tấn/TEU công bố riêng. HCM connectivity, cron PDN và Dung Quất tiếp tục để sau; không rà lại Long Bình Tân.

Các phần bên dưới là nhật ký lịch sử. Quyết định rút TCL và bàn giao 30/10 ở trên có ưu tiên cao hơn mọi kế hoạch còn nhắc tiếp tục TCL.

## Nhật ký TCL — 30/10/2026 (tích hợp TNT đã rút)

**Quyết định sản phẩm mới: rút TCL khỏi danh mục doanh nghiệp và tổng quan miền Nam.** Người dùng xác nhận không cần phủ mọi mã ngành cảng. Đã gỡ trang/API hoạt động riêng TNT, dữ liệu chạy kèm và workflow TCL; danh mục công khai lọc TCL trước phân trang và khỏi bản biên tập, đường dẫn mã/ID cũ trả 404. Bằng chứng và hồ sơ nghiên cứu lịch sử được giữ để tham chiếu, không coi là doanh nghiệp còn được theo dõi trên web. Chưa mở rộng quyết định này sang mã khác.

**Theo yêu cầu mới làm TCL cùng cách với các mã khác: chưa hoàn thành.** Đã kiểm tra bổ sung trang chủ và tài liệu ĐHĐCĐ TCL 2026 (314 trang), danh mục Cảng vụ Đồng Nai (51 bến/79 cầu), endpoint điều động tổng hợp ba ngày mẫu. Chưa tìm được chuỗi lịch sử đúng bến TCL kèm DWT; nguồn ĐTNĐ III còn timeout. Phần TNT dưới đây chỉ là dữ liệu một phần, không thay yêu cầu chuỗi 2025–2026. [Hồ sơ rà soát](tcl-source-feasibility-20261030.md), [biên nhận](catalog-review/tcl-feasibility-recheck-20261030.json).

TCL đã có quan sát cập/rời cầu riêng ICD Nhơn Trạch từ ePort TCIS, mã TNT: edition đầu 81 cập/78 rời ngày 16–29/10/2026, không gồm 3 trường giờ rời EST hoặc 497 dòng bến khác trong phản hồi. Nguồn không có DWT; chưa có lịch sử năm trước nên lũy kế so sánh/YoY vẫn unavailable. Không tính thành port arrivals/departures hoặc cộng trùng bến CLL.

Đã bổ sung bình quân xếp dỡ khoảng 200.000 TEU/tháng theo báo cáo 2025 riêng ở phạm vi dịch vụ TCL; không gán từng tháng hoặc riêng ICD. Đã mở rộng rà soát trang cảng TCL/SNP, ePort riêng và Cảng vụ Hàng hải Đồng Nai/ĐTNĐ khu vực III. Chi tiết: [TCL](tcl-integration.md), [biên nhận nguồn](catalog-review/tcl-source-review-20261030.json). Còn thiếu DWT, chuỗi sản lượng tấn/TEU thực hiện và lịch sử trước 16/10/2026. Workflow refresh mới được cấu hình; chưa nghiệm thu schedule/production. Bản tính năng `92d876b` đã Cloudflare success và readback API/HTML hai chiều đúng edition; xem [receipt staging](catalog-review/tcl-staging-20261030.json). CI Quality tổng được theo dõi riêng, không coi build/readback là nghiệm thu cron hoặc production.


## Snapshot bàn giao 29/10 — đã được thay thế

Theo yêu cầu ngày 29/10: cập nhật status/next steps, commit/push tài liệu và dừng triển khai để người dùng review một lượt. **Chưa bắt đầu phase tiếp theo.** Điểm tiếp tục, thứ tự công việc và tiêu chí nghiệm thu tại [bàn giao phase sau](ports-next-phase-handoff-20261029.md); phần này thay thế các thứ tự ưu tiên trong snapshot cũ bên dưới.

Head code/data đã phát hành: `d0e4031`, nhánh `codex/cloudflare-next-compat`, gồm backfill Gemalink `22b5d8a`. Đã đọc lại GitHub: [Quality run 40911108780](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40911108780) thành công; [Cloudflare build 9e1b5772](https://dash.cloudflare.com/5e84958e47290692c6ec2817fa1d9af6/workers/services/view/investing-pro-web-staging/production/builds/9e1b5772-42bd-4f3a-b754-26da1d5205e6) thành công, version `86ef8f32-a60f-421c-ae2d-d53817afd351`. Verifier Gemalink đọc staging thành công sau triển khai này, đối chiếu 22 tháng hai chiều. Đây là staging/manual readback, chưa phải nghiệm thu production hoặc cron.

Edition HCM/Bình Dương đến 28/10/2026; PDF quốc gia chỉ bổ sung lịch sử Gemalink tháng 1–7/2025. Tách riêng Gemalink/Bình Dương đã phát hành. Các khoảng thiếu còn mở: tàu rời Gemalink đầu 2025, Bình Dương rời sau 15/07 và vào sau 24/08/2026. Không suy thiếu quan sát thành không hoạt động. TCL/TCW chưa có chuỗi riêng; SWC mới có bến phao, chưa đại diện Long Bình. HCM connectivity và cron PDN do người dùng để sau; không rà lại Long Bình Tân.

## Bổ sung lịch sử Gemalink — 29/10/2026

Đã quét đủ 7.845 hồ sơ kế hoạch Vũng Tàu công bố 01/12/2024–31/08/2025 trên cổng Cục Hàng hải và Đường thủy. 7.683 PDF khác hash, 162 bản trùng; sau xử lý ba bản bị thay thế và một dòng giao lịch HCM, bổ sung **326 dòng kế hoạch tàu vào Gemalink tháng 1–7/2025**. Không còn dòng Gemalink cách ly chưa xử lý. Chưa tìm được dòng tàu rời phù hợp để bù chiều đó; không suy chiều rời từ chiều vào. Đây là kế hoạch công bố, không phải actual hoặc chứng nhận phủ đủ.

Web/API dùng module lịch sử riêng, ghép Gemalink sau loại trùng; giữ Bình Dương tách riêng. Trang Gemalink mặc định chiều tàu vào; API vẫn giữ mặc định chiều tàu rời cũ khi không truyền direction. Chi tiết thu gọn có PDF/hash, hồ sơ, trang/dòng, ngày ký và giới hạn theo chiều. Tổng ghi nhận và YoY vẫn hiển thị theo AGENTS.md.

Đã qua 178 Vitest, 10 kiểm tra parser Python, lint, typecheck, Next production build và E2E miền Nam desktop/mobile. Xuất lại cùng raw cho kết quả byte-identical. Export dừng nếu thiếu/lệch hash archive HCM dùng đối chiếu trùng. Chi tiết: [backfill Gemalink](gemalink-national-backfill.md), [ledger](catalog-review/gemalink-national-ledger.json).

Commit `22b5d8a` đã push lên `codex/cloudflare-next-compat`; Cloudflare Workers Builds thành công, version `96f80601-c1a1-43d0-bbff-5ff262b98ff8`. Staging đã khớp Gemalink 22 tháng hai chiều, mẫu PDF, strict null; toàn bộ 10 phạm vi HCM, tổng SGP và tổng quan miền Nam cũng khớp. UI live xác nhận mặc định tàu vào, DWT tháng 1/2025 và PDF CMA CGM VISBY. Biên nhận: [Gemalink API](catalog-review/gemalink-national-live-readback-20261029.json), [miền Nam](catalog-review/south-gemalink-backfill-readback-20261029.json), [UI](catalog-review/gemalink-national-ui-readback-20261029.json). Đây là manual readback, không phải cron.

CI tại `22b5d8a` qua lint/typecheck/Vitest/Python và 70/72 E2E; hai ca NAP giả định ngày cutoff phải có tàu. Đã sửa test chọn ngày có quan sát từ API, không đổi dữ liệu hoặc hành vi NAP, rồi chạy lại desktop/mobile 2/2 đạt. Bản sửa và biên nhận tại `d0e4031`; CI toàn bộ của chính commit này đã thành công, bao gồm E2E và hai bước Next/OpenNext build.

Các đoạn bên dưới là lịch sử bàn giao trước bản bổ sung này. HCM connectivity, nghiệm thu cron PDN và điều tra Long Bình Tân tiếp tục ngoài phạm vi theo chỉ đạo người dùng.

## Cập nhật 29/10/2026 — dữ liệu và nguồn GMD

Đã chuẩn bị edition lịch miền Nam đến 28/10/2026: Gemalink 1.854 dòng hai chiều (tăng 16), Bình Dương vẫn 8.342 dòng sau khi lấy thêm ba ngày nguồn. Giữ monitor riêng hai cảng. Trang Vũng Tàu cũ vẫn lỗi DNS; cổng toàn quốc đã truy vấn thành công 1.065 hồ sơ kế hoạch điều động Vũng Tàu tháng 6/2025 bằng phiên mới. Chưa đối chiếu đủ bến/DWT/phân trang để nhập vào chuỗi Gemalink. Chi tiết: [GMD source follow-up 29/10](gmd-source-followup-20261029.md). Không nghiệm thu cron hoặc điều tra lại Long Bình Tân.

Đã xác minh PDF gốc CMA CGM VISBY: kế hoạch vào Gemalink 29/06/2025 08:30, DWT 31.285, ban hành 28/06. Nguồn toàn quốc có lịch sử Gemalink trước tháng 8; chưa backfill hàng loạt. Cần parser PDF, phân biệt ngày ban hành/ngày kế hoạch và xử lý trùng/sửa đổi. Commit dữ liệu `99b51b5` đã deploy thành công; readback hai chiều 22 tháng trên staging đã qua cho HCM và Bình Dương.

## Snapshot 26/10 — mở rộng miền Nam tại máy

Theo yêu cầu mới, GMD được tách Gemalink và Cảng Bình Dương thành hai dòng monitor miền Nam; trang GMD mặc định Gemalink, tổng hợp chỉ mở khi chọn tường minh. Đã quét lại nguồn Cảng vụ chính thức: bảng TP.HCM và liên kết lịch từ trang Đồng Nai hoạt động; Vũng Tàu cũ lỗi DNS tại máy. Chưa tìm được nguồn bổ sung đã kiểm chứng cho khoảng thiếu. Xem [quét nguồn và thay đổi giao diện](south-expansion-20261026.md#tách-theo-dõi-gmd-và-quét-lại-nguồn-chính-thức--26102026).

Theo chỉ đạo mới, người dùng tự kiểm tra kết nối TP.HCM và nghiệm thu cron PDN sau. Biến động Long Bình Tân đã được người dùng chấp nhận; không điều tra lại. Ưu tiên là tiếp tục các phạm vi miền Nam có nguồn phù hợp.

Đã triển khai tại máy: CLL (cầu số 7 và bến 2.200 DWT, 1.764 dòng); SWC (bốn bến phao, 417 dòng); VGP (cầu K16, 253 dòng); SGP thêm phần Tân Thuận K12A/B/C/C1 (1.356 dòng); GMD thêm Cảng Bình Dương BC198 (8.342 dòng vào/rời trực tiếp). Các số là tổng dòng hai chiều trong edition 01/01/2025–24/10/2026, không phải actual hoặc lượt ghé duy nhất. Bình Dương không có dòng được ghép sau 24/08/2026 trong hai resource này; tháng 9–10 giữ unavailable, không suy hoạt động bằng 0.

TCL và TCW đã rà báo cáo/phạm vi, có phần giải thích nguồn trên trang doanh nghiệp nhưng chưa có chuỗi tàu riêng đủ căn cứ. Không gán toàn Cát Lái cho TCL/TCW; bến 2.200 DWT hợp tác CLL/TCL chỉ được ghi một lần trong CLL. SWC hiện theo dõi bến phao, chưa phải Long Bình. VGP là hoạt động tại cầu cho thuê, không suy doanh thu hay sản lượng của doanh nghiệp.

Tổng quan miền Nam hiện có sáu mã có một phần dữ liệu: GMD, SGP, PDN, CLL, SWC, VGP; TCL/TCW chờ nguồn riêng. Cộng với các phạm vi miền Bắc/Trung đã làm là 18 mã có ít nhất một phần theo dõi tại máy, chưa phải phủ đủ tài sản hoặc đã phát hành cả 18 mã. GMD có tổng Nam Đình Vũ + Gemalink + Bình Dương; tổng quan miền Bắc giữ Nam Đình Vũ và tổng quan miền Nam chỉ hai cảng miền Nam. Không cộng tổng khu vực.

Bản mở rộng đã commit/push tại `989a319` lên `codex/cloudflare-next-compat` theo yêu cầu người dùng; chưa chứng nhận deploy/readback. Đã qua 174 Vitest, 20 kiểm tra Python liên quan, 4 kiểm tra verifier Node, 72/72 E2E toàn bộ desktop/mobile, lint, typecheck và Next production build; kiểm chứng local không thay readback staging hoặc cron. Phần PDN đang phát hành vẫn giữ edition/acceptance trước đó. Bình Dương có exporter/ledger riêng, chưa nối cron riêng; yêu cầu đủ raw, thiếu thì dừng. Bàn giao chi tiết: [mở rộng miền Nam](south-expansion-20261026.md), [phạm vi và nguồn](catalog-review/south-expansion-source-review-20261025.json), [ledger Bình Dương](catalog-review/binhduong-history-ledger.json).

Bình Dương đang điều tra khoảng thiếu sau tháng 6: rời cuối 15/07, vào cuối 24/08. Smartport có 451 dòng lịch tháng 7 nhưng thiếu DWT và căn cứ cầu/chiều tương ứng; chưa nhập vào chỉ tiêu Cảng vụ. Xem kết quả và giới hạn probe trong [bàn giao miền Nam](south-expansion-20261026.md#điều-tra-thiếu-dữ-liệu-bình-dương--26102026). Chưa khắc phục được nguồn thiếu.

Edition Bình Dương được cập nhật đến 25/10 (663 ngày, 1.326 phản hồi), vẫn 8.342 dòng. API có metadata độ phủ partial và ngày quan sát cuối theo chiều. Web bổ sung bối cảnh thay đổi thủ tục có nguồn Cảng vụ; chưa kết luận thay đổi đó gây ra khoảng thiếu riêng Bình Dương. Có verifier readback riêng; không nối hoặc nghiệm thu cron trong đợt này. Hoàn thiện metadata/giải thích không có nghĩa đã bù đủ dữ liệu.

## Snapshot vận hành 25/10, 22:15–22:18 Việt Nam — người dùng để sau

- Đọc trực tiếp GitHub API: workflow PDN trên `main` đã có lịch 08:45 Việt Nam và checkout nhánh staging. Toàn bộ lịch sử hiện trả về chỉ có hai run `workflow_dispatch` thành công (`40185054799`, `40199794476`), **chưa có run `schedule`**. Vì vậy `scheduled_refresh_verified=false`; hai lần thủ công không thay thế hai chu kỳ lịch thật. Hai mốc sớm nhất để kiểm tra tiếp là sau 08:45 ngày 26 và 27/10/2026, có thể trễ theo scheduler. Mỗi lần phải đạt collector, publish và live readback; chưa thể nghiệm thu trước khi các sự kiện này tồn tại.
- Chạy lại `node scripts/verify-pdn-live.mjs`: đã đối chiếu thành công 22 tháng, năm phạm vi, hai chiều, nhật ký, truy vấn không hợp lệ và tổng quan miền Nam. Edition live khớp `checked_at=2026-10-25T13:55:17.139900+00:00`, cutoff 24/10. Đây là kiểm chứng local mới, không phải schedule mới. Biên nhận: [PDN live recheck](catalog-review/pdn-live-recheck-20261025.json).
- Nguồn TP.HCM: DNS vẫn `222.253.45.177`; tại máy TCP/TLS và GET lịch chính thành công, đủ ba bảng. Collector POST ngày 01/01/2025 và 24/10/2026 thành công, không lỗi parser; raw và kết quả giữ tại `.local/south-plans`, chưa export/publish edition. Supabase Singapore/Tokyo/Mumbai được gọi lại và cả ba tiếp tục `reachable=false`, `source_timeout` sau 15 giây, dù HTTP của function là 200. Không có đường cloud mới đã chứng minh được; chưa thay nguồn bằng bản đồ thiếu dòng hoặc đổi dữ liệu công bố. Biên nhận: [cloud recheck](catalog-review/hcm-cloud-recheck-20261025.json), [network local recheck](catalog-review/hcm-local-recheck-20261025.json).
- Lịch sử `south-plans.yml` hiện vẫn có ba lần thủ công thất bại, chưa có refresh cloud thành công mới. Đường xử lý đầy đủ vẫn cần phía nguồn khôi phục truy cập cloud hoặc cung cấp feed/file lịch sử tương đương; nội dung kỹ thuật đề nghị kiểm tra đã có trong tài liệu kết nối, chưa gửi bên ngoài. Bằng chứng workflow/đăng ký lịch: [GitHub recheck](catalog-review/refresh-acceptance-recheck-20261025.json).

Kết quả kiểm tra vận hành trên là snapshot trước chỉ đạo mở rộng. Kết nối HCM và nghiệm thu cron PDN do người dùng để sau; không còn yêu cầu điều tra Long Bình Tân.

## Snapshot đã phát hành trước mở rộng miền Nam (25/10)

PDN đã được triển khai trên [web staging](https://investing-pro-web-staging.tuyenkinhmon88.workers.dev/companies/PDN). Code tính năng `5cc2b57`, bản nén nhật ký `ebd80b4`; head ứng dụng đã kiểm chứng `0fd6401`. Cloudflare build `5139c6bd-c526-4c27-8156-b0b64ca2babf` thành công. [Refresh GitHub 40199794476](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40199794476) đã thu thập, kiểm tra, commit dữ liệu `297c58d`, chờ deploy và đối chiếu live thành công. Biên nhận: [pdn-staging-20261025.json](catalog-review/pdn-staging-20261025.json). Lịch tự động PDN đã đăng ký nhưng chưa có hai chu kỳ `schedule` thật để chứng nhận cron.

Hiện có 15 mã có ít nhất một phạm vi được tích hợp; đây không phải 15 doanh nghiệp đã phủ mọi tài sản. Không dùng tỷ lệ mã hoặc số dòng để kết luận hoàn thiện toàn ngành.

- Miền Bắc: 9 mã PHP, DVP, VGR, VSC, GMD tại Nam Đình Vũ, HAH, DXP, PSP, CQN. Giữ phạm vi bến đã làm; CQN là kế hoạch cập/rời cầu, khác lượt vào/rời vùng cảng. VGR/VSC chia sẻ VIP Greenport, không cộng trùng vào tổng khu vực.
- Miền Trung: CDN/Tiên Sa, QNP, CMP, NAP có chuỗi. NAP gồm Cửa Lò/Bến Thủy. GMD–Dung Quất giữ công bố chọn lọc và quan sát bổ trợ; người dùng đã đồng ý để ngỏ chuỗi định kỳ, không tiếp tục coi đây là điều kiện chặn mở rộng.
- Miền Nam: PDN tại Long Bình Tân, Gò Dầu A/B; Gemalink/GMD và 4 phạm vi SGP gồm Sài Gòn–Hiệp Phước, CMIT, SP-PSA, SSIT. Đã có tổng quan miền Nam. GMD có tổng quan Nam Đình Vũ + Gemalink và chọn từng cảng; tổng quan miền Bắc vẫn chỉ lấy Nam Đình Vũ.
- Phạm vi chưa có chuỗi: Bình Dương, Phước Long và Nam Hải ICD của GMD; Tân Thuận và các bến SGP còn lại; CLL, TCL, SWC, TCW, VGP trong danh sách mục tiêu miền Nam. VTP/ILB/IST và các công ty mẹ/liên doanh cần rà phạm vi trước khi bổ sung.

## Dữ liệu và kiểm chứng

PDN: 662 ngày / 1.986 phản hồi vào, rời và điều chuyển; 19.760 dòng ghép gồm 58 điều chuyển giữa các bến PDN giữ riêng. Có tháng/quý/YTD/YoY, nhật ký 90 ngày, chọn ngày và 5 phạm vi PDN/Long Bình Tân/Gò Dầu A+B/A/B. Đối chiếu live 22 tháng, hai chiều, năm phạm vi và bảng miền Nam đều khớp ledger. Nguồn công bố ghi nhận ít dòng Long Bình Tân hơn từ 7/2026; nguyên nhân chưa xác minh, đã lưu ở chi tiết chất lượng/API, không suy thành biến động hoạt động thực tế.

Nguồn TP.HCM cho Gemalink/SGP: 662 bảng ngày từ 01/01/2025 đến 24/10/2026; 6.575 dòng lịch đến/rời được ghép, trong đó Gemalink 1.838 dòng và 4 phạm vi SGP 4.737 dòng. Đây không phải số tàu ghé duy nhất hoặc actual đã xác minh. Các mục di chuyển nội cảng và snapshot vị trí không được cộng vào chỉ tiêu.

Đã đối chiếu API live 22 tháng, hai chiều của cả 5 phạm vi với ledger; kiểm tra tổng 4 phạm vi SGP, tổng GMD hai cảng, bảng miền Nam và nhật ký Gemalink ngày 24/10. Đã đọc giao diện miền Nam/GMD/SGP trên staging. Gemalink/SGP theo `authority_published_plan`; PDN theo `authority_published_berth_plan` với tuyến từ khu neo đến cầu đã ghép; không lấy DWT làm tấn hàng.

Kiểm thử PDN tại `0fd6401`: toàn bộ CI đã qua 172 Vitest, 70 E2E desktop/mobile, gồm hai ca PDN kiểm tra bộ lọc và bằng chứng giờ nguồn, lint, typecheck, Next build và OpenNext Linux build; parser Python mới có 7 kiểm tra qua. Bản nén giải mã khớp toàn bộ JSON trước nén; đường cache lạnh với chỉ 21 phản hồi mới giữ nguyên 22 tháng. Không đồng nghĩa cron tự động đã được nghiệm thu.

Kiểm thử bàn giao Gemalink/SGP trước PDN: 164 Vitest, 5 kiểm tra parser Python, 16 ca E2E liên quan desktop/mobile, lint, typecheck và Next build đã qua. Sau khi gộp dữ liệu QNP mới, 12 kiểm tra QNP/miền Trung/ledger miền Nam đã qua. Đây là bằng chứng lịch sử của lần bàn giao Gemalink/SGP, khác đợt CI PDN nêu trên. OpenNext local vướng symlink Windows; bản Linux Cloudflare đã triển khai được và API/UI live đã kiểm chứng. Không đồng nghĩa nghiệm thu production, quyền nguồn hoặc cron tự động.

Quy tắc hiển thị vẫn theo AGENTS.md: giữ tổng số dòng và DWT ghi nhận, tháng/quý/YTD/YoY dù thiếu ngày/trọng tải; kỳ không có quan sát giữ null. Tháng hiện tại có cửa sổ cập nhật. Chất lượng thu gọn; raw null, provenance và tổng đủ độ phủ giữ riêng. Không cộng phạm vi chồng lấn hoặc nhân hoạt động theo tỷ lệ vốn.

## Rà tổng PDN sau phản hồi biểu đồ tháng 8–10

Đã đối chiếu API staging ở cả hai chiều, cả năm phạm vi, tháng 6–10/2026 và cùng kỳ 2025. Tổng PDN bằng Long Bình Tân + Gò Dầu A + Gò Dầu B; Gò Dầu A+B chỉ là nhóm xem, không cộng thêm lần nữa. Sai lệch cộng lớn nhất dưới 0,000001 DWT do số thực. YoY lấy từ hai tổng ghi nhận, không lấy trung bình YoY các cảng con. Tháng 10 so cùng cửa sổ 1–24/10 hai năm. Biên nhận: [pdn-total-audit-20261025.json](catalog-review/pdn-total-audit-20261025.json).

Chiều tàu rời như ảnh người dùng: tháng 8 tổng 704.494,56 DWT (-62,40%), trong đó Long Bình Tân 76.045,23 (-93,49%), Gò Dầu A 191.036,83 (-8,32%), Gò Dầu B 437.412,50 (-12,18%). Long Bình Tân chỉ có 26 dòng so với 404 dòng cùng kỳ; cả 26 có DWT. Tháng 9 Long Bình Tân còn 16 dòng, 51.165,77 DWT (-94,92%); tháng 10 còn 20 dòng, 60.361,40 DWT (-92,66%), một dòng thiếu DWT. Tổng PDN giảm tương ứng 64,14% và 55,57%.

Đối chiếu lại phản hồi rời lưu trữ đủ ngày tháng 6–10: số dòng toàn nguồn giảm từ 1.902 tháng 6 xuống 379 tháng 7, 378 tháng 8, 334 tháng 9 và 336 trong 24 ngày tháng 10. Không có dòng mang mã bến PDN bị loại vì nhãn không khớp trong các phản hồi này. Các số này chỉ đếm resource rời trực tiếp, khác tổng sản phẩm có ghép điều chuyển từ cầu ra khu neo. Kết luận: chưa thấy lỗi phép cộng; cần điều tra độ phủ/truy vấn nguồn Long Bình Tân từ tháng 7. Chưa xác định nguồn đổi cách công bố, tham số truy vấn thiếu phạm vi hay hoạt động thực tế thay đổi; không chứng nhận giảm hoạt động từ biểu đồ. Đợt rà này không đổi code/công thức hoặc dữ liệu công bố.

## Next steps hiện hành

Xem [bàn giao 30/10](ports-next-phase-handoff-20261030.md) để tiếp tục đúng phase và tiêu chí nghiệm thu. Chưa triển khai phase mới trong đợt lưu này.

1. Kiểm tra CI đúng head `f4d930e`, sau đó ưu tiên refresh/monitor Bình Dương riêng khi được yêu cầu tiếp tục.
2. Rà nguồn có chọn lọc SWC–Long Bình/Sotrans/Mekong và chỉ tiêu dịch vụ phù hợp TCW; chưa tự rút thêm mã. TCL đã rút, không còn là next step.
3. Hoàn thiện GMD Phước Long/Nam Hải ICD, SGP K12/TT2 và khoảng thiếu Gemalink/Bình Dương khi có nguồn mới.
4. Bổ sung tấn/TEU công bố riêng với DWT, giữ quy tắc lũy kế các tháng chung.
5. HCM connectivity/cron PDN/Dung Quất để sau theo chỉ đạo; không điều tra lại Long Bình Tân hoặc tự mở rộng toàn ngành.

## Tài liệu liên quan

- [Bàn giao phase sau hiện hành 30/10](ports-next-phase-handoff-20261030.md)
- [Snapshot bàn giao 29/10](ports-next-phase-handoff-20261029.md)
- [Mở rộng CLL/TCL/SWC/TCW/VGP và GMD/SGP](south-expansion-20261026.md)
- [PDN · Long Bình Tân/Gò Dầu](pdn-integration.md)
- [Miền Nam và Gemalink/SGP](south-integration.md)
- [Dung Quất: công bố chọn lọc](dungquat-integration.md)
- [NAP](nap-integration.md), [CMP](cmp-integration.md), [QNP](qnp-integration.md)
- [Hướng phát triển sản phẩm](port-investment-roadmap-review.md)

Các trạng thái trước PDN trong lịch sử Git là snapshot lịch sử; tài liệu này thay thế thứ tự ưu tiên cũ yêu cầu giải quyết Dung Quất trước miền Nam.

## Readback Bình Dương 26/10/2026

Commit `6f52024` đã push lên `codex/cloudflare-next-compat`; Cloudflare Workers Builds thành công. Verifier riêng đã đối chiếu staging thành công 22 tháng ở cả hai chiều, metadata edition đến 25/10, null và nhật ký dòng quan sát cuối. Biên nhận: [Bình Dương live readback](catalog-review/binhduong-live-readback-20261026.json). Không chứng nhận cron hoặc toàn bộ hoạt động cảng; khoảng thiếu sau tháng 6 vẫn chưa có nguồn bù đủ điều kiện.
