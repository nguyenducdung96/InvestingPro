# Bàn giao ngành cảng cho phase sau — 29/10/2026

> Snapshot lịch sử. Đã được thay thế bởi [bàn giao 30/10/2026](ports-next-phase-handoff-20261030.md): TCL đã rút khỏi sản phẩm, không còn là next step; lũy kế dùng các tháng chung ở hai năm.


## Điểm dừng theo yêu cầu người dùng

Người dùng review một lượt trước khi làm tiếp. Đợt bàn giao này chỉ cập nhật tài liệu và commit/push; không bắt đầu collector, migration, refresh, cron hoặc mở rộng dữ liệu mới. Chỉ tiếp tục triển khai khi người dùng yêu cầu sau review.

Workspace: `D:\GitWork\InvestProApp\InvestingPro`. Nhánh: `codex/cloudflare-next-compat`. Điểm code/data đã phát hành là `d0e4031`, bao gồm `22b5d8a` bổ sung lịch sử Gemalink; commit bàn giao tài liệu nằm sau hai commit này. Khi tiếp tục, đọc `AGENTS.md`, tài liệu này và phần đầu `ports-project-status-20261025.md`, rồi kiểm tra Git/remote trước khi sửa. Không dùng snapshot 25–26/10 làm status hiện hành.

## Trạng thái đã xác minh

- `d0e4031`: [Quality 40911108780](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40911108780) thành công, gồm lint, typecheck, Vitest, parser Python, E2E, Next và OpenNext build. Hai lỗi E2E NAP ở commit trước đã sửa bằng cách chọn ngày có quan sát, không sửa NAP product/data.
- Cloudflare staging của `d0e4031`: [build 9e1b5772-42bd-4f3a-b754-26da1d5205e6](https://dash.cloudflare.com/5e84958e47290692c6ec2817fa1d9af6/workers/services/view/investing-pro-web-staging/production/builds/9e1b5772-42bd-4f3a-b754-26da1d5205e6) thành công; version `86ef8f32-a60f-421c-ae2d-d53817afd351`.
- Gemalink đã đọc lại staging thành công sau bản trên: 22 tháng, hai chiều, metadata nguồn, strict null và mẫu PDF CMA CGM VISBY. Biên nhận đã commit của bản tính năng tại [API Gemalink](catalog-review/gemalink-national-live-readback-20261029.json), [miền Nam](catalog-review/south-gemalink-backfill-readback-20261029.json), [UI](catalog-review/gemalink-national-ui-readback-20261029.json). Các receipt này gắn với `22b5d8a`; không đổi nhãn thành chứng cứ cron hoặc production.
- Miền Bắc và miền Trung giữ phạm vi đã tích hợp; Dung Quất giữ công bố chọn lọc, chuỗi định kỳ để ngỏ. Miền Nam có dữ liệu một phần cho GMD, SGP, PDN, CLL, SWC, VGP; TCL/TCW chưa có chuỗi riêng đủ căn cứ. Không coi số mã có dữ liệu là độ phủ đủ tài sản/toàn ngành.

## Dữ liệu và khoảng thiếu phải giữ rõ

HCM và Bình Dương: edition đến **28/10/2026**. HCM Gemalink có 1.854 dòng hai chiều; nguồn PDF quốc gia bổ sung riêng **326 dòng tàu vào tháng 1–7/2025**, sau loại trùng/bản thay thế/giao HCM. Hai nguồn cộng thành 2.180 dòng kế hoạch, không phải số tàu ghé duy nhất. Web Gemalink mặc định tàu vào; API không truyền direction vẫn mặc định tàu rời để tương thích.

Gemalink: quét đủ 7.845 hồ sơ Vũng Tàu công bố 01/12/2024–31/08/2025, 7.683 PDF khác hash; 162 tài liệu trùng, ba dòng bản cũ bị thay thế, một dòng giao HCM. Không còn Gemalink cách ly chưa xử lý. Nguồn đọc được không bù được chiều tàu rời đầu 2025. Không suy tàu rời từ tàu vào hoặc từ giấy phép không cùng hợp đồng dữ liệu. Chi tiết tại [backfill quốc gia](gemalink-national-backfill.md).

Bình Dương: 8.342 dòng trực tiếp từ nguồn Đồng Nai, không gồm shifting. Quan sát rời cuối **15/07/2026**, vào cuối **24/08/2026**; edition mới hơn không có nghĩa có dòng mới. Smartport đã thấy lịch tháng 7 nhưng chưa đủ DWT/bến/chiều để nhập vào chuỗi này. Chưa xác định chắc nguyên nhân khoảng thiếu; không kết luận hoạt động thực tế bằng 0 hoặc nguồn đã hoàn toàn đầy đủ.

CLL gồm cầu số 7 và bến 2.200 DWT đã đối chiếu; phần hợp tác CLL/TCL chỉ tính một lần trong CLL. SWC hiện là bốn bến phao, chưa đại diện Long Bình/Sotrans/Mekong. VGP là cầu K16 cho thuê, không suy sản lượng/doanh thu VGP từ DWT. SGP đã giữ K12A/B/C/C1; K12 chung, khu neo và TT2 cần xác minh riêng.

## Người dùng review trước khi tiếp tục

1. Xem [Gemalink](https://investing-pro-web-staging.tuyenkinhmon88.workers.dev/companies/GMD?plan_asset=gemalink), chuyển năm 2025/2026 và hai chiều; mở bằng chứng PDF. Kiểm tra tên chiều tàu trước khi so sánh YoY.
2. Xem [Bình Dương](https://investing-pro-web-staging.tuyenkinhmon88.workers.dev/companies/GMD?plan_asset=gmd_binh_duong) và [miền Nam](https://investing-pro-web-staging.tuyenkinhmon88.workers.dev/industries/ports/south): hai cảng tách riêng, kỳ không có quan sát để unavailable; chi tiết có ngày quan sát cuối/nguồn.
3. Kiểm tra CLL/SWC/VGP có đúng phạm vi mong muốn và các phần TCL/TCW chưa có chuỗi được giải thích rõ. Phản hồi phạm vi hoặc thứ tự ưu tiên trước khi bắt đầu phase mới.

## Thứ tự phase sau, sau khi người dùng yêu cầu tiếp tục

### 1. Refresh và monitor Bình Dương riêng

Điểm bắt đầu: `scripts/collect-pdn-plans.py` (collector Đồng Nai dùng chung, cần đọc kỹ phạm vi ghi), `scripts/export-binhduong-plans.py`, `scripts/verify-binhduong-live.mjs`, `docs/catalog-review/binhduong-history-ledger.json`. Chưa có cron riêng đã nghiệm thu. Không đổi edition PDN hoặc nhập shifting chỉ để làm refresh Bình Dương.

Thiết kế quy trình giữ evidence/hash, lỗi và dữ liệu cũ khi nguồn lỗi; có chống mất lịch sử, idempotency và commit cạnh tranh với các refresh khác. Phân biệt nguồn lỗi, phản hồi hợp lệ rỗng và không có quan sát mới. Có thể theo dõi độ mới/quan sát cuối trong metadata và chi tiết thu gọn; không biến kỳ trống thành 0 hoặc thêm cảnh báo nổi cho vài ngày thiếu.

Hoàn tất khi refresh thủ công thu thập → export → commit/push → deploy → live readback đúng edition, có receipt. Nếu có đăng ký lịch, chỉ chứng nhận tự động sau khi kiểm chứng sự kiện `schedule` thật và đọc lại bản triển khai; số lần thủ công không thay thế chu kỳ lịch thật. Quy tắc hai chu kỳ PDN không được tự ghi thành PDN đã nghiệm thu.

### 2. Hoàn thiện phạm vi TCL, SWC, TCW

Ưu tiên TCL–ICD Tân Cảng Nhơn Trạch; SWC–Long Bình/Sotrans/Mekong. Với TCW tìm báo cáo kho/bãi/depot hoặc tấn/TEU phù hợp, không gán tàu toàn Cát Lái. Bắt đầu từ `docs/south-expansion-20261026.md` và `docs/catalog-review/south-expansion-source-review-20261025.json`; giữ CLL/VGP đã có.

Mỗi nguồn mới cần bằng chứng quan hệ doanh nghiệp/bến, mã hoặc nhãn chính xác, hợp đồng dữ liệu, khoảng lịch sử, DWT/đơn vị nếu có và mẫu raw có provenance. Chỉ triển khai khi đủ căn cứ; nếu không có nguồn, cập nhật giới hạn có bằng chứng thay vì tạo chuỗi ước tính. Kiểm tra không trùng phạm vi doanh nghiệp/liên doanh.

### 3. Bến GMD/SGP còn thiếu

GMD: Phước Long và Nam Hải ICD; không dùng phao Gemadept thay ICD. SGP: phân biệt K12 với khu neo và xác định TT2 trước khi thêm. Rà nguồn tàu rời Gemalink đầu 2025 và Bình Dương khi có đầu mối mới; không cần tải lại toàn bộ 7.845 hồ sơ chưa thay đổi.

Tiêu chí: mapping có nguồn, parser/dedup đúng nghĩa, số ghi nhận đối chiếu ledger, API/UI đúng phạm vi và readback sau deploy. Không dùng việc có thêm tháng để khẳng định đã phủ đủ nguồn.

### 4. Bổ sung sản lượng doanh nghiệp

Tấn/TEU công bố theo doanh nghiệp/cảng/kỳ giữ thành chuỗi riêng; đối chiếu báo cáo gốc và phạm vi hợp nhất. DWT là trọng tải tàu, không phải tấn hàng hoặc doanh thu. Không suy actual từ lịch công bố.

## Việc giữ ngoài phase này

- Kết nối nguồn HCM trên cloud và nghiệm thu cron PDN: người dùng kiểm tra sau; snapshot network/workflow cũ không phải status live mới. Không tự mở lại trong lúc chờ review.
- Long Bình Tân: người dùng chấp nhận biến động, không điều tra lại.
- GMD–Dung Quất: chuỗi định kỳ tiếp tục để ngỏ theo quyết định trước.
- Không phát hành production hoặc coi staging thành production acceptance.

## Kiểm chứng và bàn giao mỗi thay đổi tiếp theo

Giữ chính sách `AGENTS.md`: tổng ghi nhận tháng/quý/YTD/YoY vẫn hiển thị khi thiếu một phần; raw thiếu giữ null, không có quan sát giữ unavailable, chất lượng thu gọn; không cộng phạm vi chồng lấn. Kiểm tra có trọng tâm theo thay đổi, sau đó đọc CI và deploy đúng commit. Không lặp toàn bộ các kiểm tra đã đạt khi không có thay đổi liên quan.

Các lệnh đọc lại hiện có (chỉ chạy khi cần xác minh, không tự refresh dữ liệu):

```powershell
node scripts/verify-gemalink-backfill-live.mjs
node scripts/verify-binhduong-live.mjs
node scripts/verify-south-live.mjs
```

Raw/cache cục bộ ở `.local/gemalink-national/`, `.local/south-plans/`, `.local/pdn/` không được Git mang sang máy khác. Bản module, ledger và fixture có trong Git; nếu cần xuất lại lịch sử phải khôi phục/thu thập evidence đúng hash. Export Gemalink yêu cầu archive HCM cho toàn bộ giai đoạn giao nhau, thiếu thì dừng, không bỏ bước loại trùng.

Kết thúc từng phạm vi: cập nhật status, nguồn/giới hạn, commit và push nhánh hiện tại, xác minh CI/Cloudflare, lưu receipt API/UI đúng edition và báo các điểm chưa nghiệm thu. Không gửi yêu cầu cho Cảng vụ hoặc bên ngoài khi chưa được người dùng chỉ đạo gửi.
