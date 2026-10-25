# Mở rộng miền Nam — bàn giao 26/10/2026

## Phạm vi đã thực hiện tại máy

Tiếp tục CLL/TCL rồi SWC/TCW/VGP, bổ sung phần GMD/SGP có nguồn phù hợp. Theo chỉ đạo mới, người dùng tự kiểm tra nghiệm thu cron PDN và kết nối TP.HCM sau; biến động Long Bình Tân đã được người dùng chấp nhận, không điều tra lại. Bản mở rộng này được chuẩn bị commit/push lên `codex/cloudflare-next-compat` theo yêu cầu người dùng; deploy/readback cần được xác minh riêng và không thay đổi trạng thái nghiệm thu production hay cron.

CLL đã có dashboard/API cho cầu số 7 (`C.LAI 7`, 1.667 dòng) và bến 2.200 DWT (`CAU CANG 2.200 DWT`, 97 dòng). Báo cáo doanh nghiệp 2025 trang PDF 4–5 xác định cầu container 216 m và bến nhỏ hợp tác TCL; trang 7 mô tả địa bàn kinh doanh. Tổng 1.764 dòng là hai chiều lịch công bố, không phải toàn bộ Cát Lái hoặc lượt tàu ghé duy nhất. Không ghép `B7`, `B7 - CSG`, các cầu Cát Lái khác hoặc cộng lại bến hợp tác cho TCL. Bản báo cáo doanh nghiệp phát hành đang lưu trên CDN CafeF; không mô tả CafeF là bên phát hành hay website doanh nghiệp.

TCL đã rà báo cáo 2025 trang PDF 3–4, 7 và trang công ty con chính thức: dịch vụ xếp dỡ Cát Lái, ICD Tân Cảng Nhơn Trạch, depot, vận tải và các quan hệ pháp nhân. Chưa tìm được chuỗi riêng ICD Nhơn Trạch trong bộ phản hồi SHIP Đồng Nai đang có. Giữ trạng thái chờ nguồn cho chỉ tiêu tàu/DWT; có phần phạm vi và nguồn trên trang doanh nghiệp. Không gán tổng Cát Lái cho TCL và không suy số lượt từ doanh thu hoặc diện tích kho.

SWC đã có 417 dòng lịch tại `SOWATCO-ĐT1`, `SOWATCO-ĐT2`, `SOWATCO-ĐT3`, `SOWATCO-TL9`. Báo cáo 2025 trang PDF 6 (trang in 8–9) phân biệt Long Bình, kho/bãi và bốn phao; phao ĐT9 Thiềng Liềng được nguồn lịch ghi TL9. Tên dashboard là **bốn bến phao SWC**, không gọi đó là chuỗi Long Bình. Long Bình, ICD Sotrans, Mekong – Cần Thơ còn thiếu chuỗi riêng; báo cáo ghi thương vụ Mekong vào 11/2025 nên không hồi gán hoạt động trước kỳ quan hệ. Không dùng các tàu SWC lai dắt ở VICT hay cảng khác thay thế.

TCW đã rà báo cáo 2025 trang PDF 3–6 và website chính thức: kho CFS/ngoại quan, bãi hàng, cảng mở tại Cát Lái, Depot Tân Cảng Suối Tiên và các pháp nhân logistics. Chưa có cầu tàu riêng để gán lịch tàu/DWT. Trang doanh nghiệp hiển thị phạm vi dịch vụ và nguồn; tổng quan giữ chỉ tiêu chưa có quan sát, không tạo số 0. Bước phù hợp tiếp theo là tìm sản lượng dịch vụ doanh nghiệp công bố, không dùng toàn bộ tàu Cát Lái.

VGP đã có 253 dòng tại `K16`, được danh mục Cảng vụ xác định là Bến cảng Rau Quả. Báo cáo 2025 trang PDF 6 mô tả duy trì cho thuê kho/bãi và cầu cảng trong thời gian chuyển đổi công năng. Do đó dashboard theo dõi **hoạt động tại cầu K16**, không xác nhận VGP trực tiếp xếp dỡ mọi tàu, sản lượng hàng hay doanh thu.

SGP bổ sung **1.356 dòng Tân Thuận** tại K12A/B/C/C1. Trang SGP chính thức xác định các cầu này. Danh mục bản đồ có `K12` đồng thời là cầu Sài Gòn và tên khu neo Vũng Tàu; bảng lịch HTML không có mã phân biệt, nên không ghép K12 chỉ theo tên. Chưa thêm TT2 hoặc Tân Thuận Đông. Tổng SGP hiện là năm phạm vi, giữ phần đóng góp của bốn cầu đã đối chiếu, không chứng nhận toàn bộ Tân Thuận.

GMD bổ sung **Cảng Bình Dương**: mã harbour `BC198` cộng token tên chính xác NFC `Cảng Bình Dương` trong nguồn Đồng Nai. Đã kiểm tra 1.324 phản hồi vào/rời của 662 ngày, từ 01/01/2025 đến 24/10/2026, có 8.342 dòng sau đối chiếu. Chỉ dùng resource vào/rời trực tiếp với bộ lọc SHIP hiện có; không ghép shifting, không lấy GT thay DWT. Nơi đi/đến không có trong nguồn giữ null. Dòng cuối được ghép là 24/08/2026; tháng 9–10 không có quan sát, để unavailable. Không suy đây là không có hoạt động tại cảng. Phước Long và Nam Hải ICD tiếp tục thiếu chuỗi; các phao PL03/04/05 không được coi là ICD Phước Long.

## API, giao diện và dữ liệu

- CLL: `/companies/CLL`, `/api/v1/companies/CLL/plans?asset=cll`; có lựa chọn hai cầu riêng.
- SWC: `/companies/SWC`, `/api/v1/companies/SWC/plans?asset=swc_buoys`.
- VGP: `/companies/VGP`, `/api/v1/companies/VGP/plans?asset=vgp_k16`.
- SGP: thêm `plan_asset=sg_tan_thuan` trên UI, `asset=sg_tan_thuan` trên API; `sgp` gồm năm phạm vi.
- GMD: `gmd_binh_duong` xem riêng; `gmd_south` gồm Gemalink + Bình Dương; `gmd_all` gồm Nam Đình Vũ + hai phạm vi miền Nam. API GMD không truyền asset vẫn giữ mặc định Hải Phòng cũ. Tổng quan miền Bắc giữ Nam Đình Vũ.
- TCL/TCW có phần phạm vi và nguồn, tiếp tục chờ chuỗi riêng. Tổng quan miền Nam hiển thị sáu mã có ít nhất một phần dữ liệu, hai mã chờ nguồn; không cộng thành tổng khu vực.

Giữ tháng/quý/YTD/YoY theo số ghi nhận, raw null và strict completeness riêng. API và nhật ký trả đúng URL, hash, ngày nguồn; Bình Dương thêm ID nguồn, mã harbour/wharf, giờ và DWT gốc. Lọc ngày API hiện trả đúng chiều yêu cầu; giá trị direction ngoài arrival/departure bị từ chối 400. Quan hệ doanh nghiệp chỉ theo bằng chứng kỳ báo cáo, không chứng nhận toàn bộ lịch sử sở hữu hoặc quyền tái phân phối.

Nhật ký HCM được chuyển sang module tháng gzip/base64; giải mã dùng `DecompressionStream`, có giới hạn kích thước. Exporter kiểm tra giải nén khớp bytes JSON trước khi ghi; các kiểm tra ledger tiếp tục đối chiếu từng tháng/cầu/chiều và hash/raw DWT. Bình Dương có module và ledger riêng, dùng cùng codec nhưng không ghi vào dữ liệu PDN. Parser Đồng Nai dùng lại validator với terminal matrix tường minh; mặc định PDN giữ nguyên kiểm tra tuyến nghiêm ngặt.

## Tái lập và vận hành

Từ đủ raw HCM đã thu thập: `python scripts/export-south-plans.py`. Export không cho một receipt probe một ngày thu hẹp cửa sổ lịch sử đã công bố; phải có đủ tập ngày liên tục và vượt kiểm tra giữ bản tốt cũ.

Bình Dương dùng hai resource công khai trong collector Đồng Nai hiện có: `python scripts/collect-pdn-plans.py --directions arrival,departure`, rồi `python scripts/export-binhduong-plans.py --through 2026-10-24` để tái lập edition bàn giao. Khi cập nhật đến hôm qua, bỏ `--through`. Collector có thể dùng raw cache hợp lệ; exporter yêu cầu đủ raw hai resource mỗi ngày và dừng khi thiếu, không lấy phần thiếu làm 0. Các file raw dùng chung thư mục `.local/pdn/raw`; exporter mới chỉ ghi `binhduong-*`, không ghi edition PDN. **Chưa nối Bình Dương vào cron tự động riêng**; phần này cần làm cùng đợt vận hành sau. Không sửa lịch PDN hoặc tuyên bố cron mới được nghiệm thu.

Verifier HCM hiện được mở rộng cho các scope mới và tổng SGP năm phạm vi; nhận `SOUTH_VERIFY_BASE` để kiểm tra local hoặc staging. Các workflow/cron đang có chưa được chạy nghiệm thu trong task mở rộng này.

## Bằng chứng và kiểm chứng

- Phạm vi, hash PDF đã đối chiếu và các nhãn danh mục: `catalog-review/south-expansion-source-review-20261025.json`.
- Từng tháng/cầu/chiều HCM: `catalog-review/south-history-ledger.json`.
- Bình Dương: `catalog-review/binhduong-history-ledger.json`, gồm hai hash phản hồi mỗi ngày và ledger tháng.
- Đã qua 174 Vitest toàn dự án; 20 kiểm tra Python liên quan (9 HCM, 7 PDN validator, 4 Bình Dương); 72/72 E2E toàn bộ desktop/mobile, gồm mở rộng miền Nam, luồng cũ và PDN hồi quy. Test NAP chọn ngày có bằng chứng theo ledger để không giả định ngày hôm qua luôn có dữ liệu khi sang ngày mới; không đổi logic sản phẩm NAP. Fixture catalog được seed độc lập để các test chạy riêng không 404 giả.
- Lint, typecheck và Next production build đã qua; thêm 4 kiểm tra verifier Node đã qua. Biên nhận: `catalog-review/south-expansion-local-20261026.json`. Các kiểm chứng tại máy không thay staging readback, cron thật hoặc production acceptance.

## Tiếp tục

Ưu tiên tìm nguồn riêng cho ICD Nhơn Trạch/TCL, Long Bình–Sotrans–Mekong của SWC và Phước Long/GMD; với TCW, ưu tiên dữ liệu sản lượng kho/bãi/depot phù hợp. Tân Thuận cần thêm mã/nguồn phân biệt K12 và TT2 trước khi mở rộng. Kiểm tra vận hành HCM, cron PDN và lịch refresh Bình Dương do người dùng để sau. Không mở lại vấn đề giảm số ghi nhận Long Bình Tân.
