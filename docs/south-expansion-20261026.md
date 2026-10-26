# Mở rộng miền Nam — bàn giao 26/10/2026

## Phạm vi đã thực hiện tại máy

Tiếp tục CLL/TCL rồi SWC/TCW/VGP, bổ sung phần GMD/SGP có nguồn phù hợp. Theo chỉ đạo mới, người dùng tự kiểm tra nghiệm thu cron PDN và kết nối TP.HCM sau; biến động Long Bình Tân đã được người dùng chấp nhận, không điều tra lại. Bản mở rộng đã commit/push tại `989a319` lên `codex/cloudflare-next-compat` theo yêu cầu người dùng; deploy/readback cần được xác minh riêng và không thay đổi trạng thái nghiệm thu production hay cron.

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


## Điều tra thiếu dữ liệu Bình Dương — 26/10/2026

### Bản cập nhật tiếp theo

- Đã lấy đủ hai phản hồi trực tiếp ngày 25/10 và xuất lại edition đến 25/10/2026: 663 ngày, 1.326 phản hồi, vẫn 8.342 dòng. Không có dòng Bình Dương mới; lịch sử đã ghi nhận không thay đổi.
- Metadata API bổ sung `last_observation_by_direction`, `coverage_status=partial`, `absence_means_zero=false`. Ngày quan sát cuối không thay thế ngày thu thập/cutoff. Chưa chứng nhận độ phủ đủ hoặc actual.
- Web giữ số/YoY đã ghi nhận và thêm bối cảnh nguồn trong phần thu gọn. Đã tìm được đầu mối thay đổi thủ tục, **chưa xác minh nguyên nhân riêng Bình Dương**: [Cục công bố văn bản hợp nhất 64/2026](https://vimawa.gov.vn/en/node/15565), [Cảng vụ hướng dẫn miễn thủ tục cho một số nhóm phương tiện](https://cangvudtndhcm.gov.vn/vi/news/print/thong-tin-khac/dai-dien-cang-vu-duong-thuy-noi-dia-so-3-to-chuc-tuyen-truyen-thong-tu-so-20-2026-tt-bxd-ngay-15-thang-5-nam-2026-cua-bo-xay-dung-370.html), [Đồng Nai sơ kết thực hiện Thông tư 20](https://cangvuhanghaidongnai.gov.vn/index.aspx?id=2666&page=detail). Bản PDF đính kèm của văn bản hợp nhất bị timeout trong lần đọc; chưa kiểm chứng toàn bộ điều khoản hoặc loại đăng kiểm từng tàu. Không dùng nhận định của website tổng hợp làm kết luận nhân quả.
- Verifier riêng `node scripts/verify-binhduong-live.mjs` kiểm tra edition, số tháng hai chiều, null, trạng thái partial và nhật ký có provenance trên staging. Chỉ receipt thành công mới xác nhận readback; không xác nhận cron.
- **Chưa hoàn tất việc bù số thiếu**: cần nguồn nhật ký hoặc dữ liệu doanh nghiệp phù hợp. Không có nguồn công khai đã kiểm chứng để dựng lại phần thiếu; không dùng lịch dịch vụ Smartport thay thế.

Chuỗi đang phát hành chưa đầy đủ: dòng rời cuối 15/07/2026, dòng vào cuối 24/08/2026. Các tháng sau 6/2026 thưa bất thường trong tập phản hồi đã lưu; đây không phải bằng chứng cảng ít hoặc không hoạt động. Không đổi các tổng ghi nhận, null hoặc cách tính YoY.

Đã đối chiếu raw năm 2026 của hai chiều và điều chuyển: nhãn BC198/Cảng Bình Dương không đổi trong các dòng còn tìm được. Probe công khai ngày 24/10 với SHIP, bỏ shipBoat và lịch tổng hợp không tìm được dòng Bình Dương. Probe BOAT chiều vào trả total=1 nhưng data=[] nên **không đủ trang**; không dùng để kết luận BOAT không có dữ liệu. Hai probe bỏ trạng thái bị timeout. Không chứng nhận mọi biến thể truy vấn đã được phủ.

Smartport Gemadept được tra cứu qua giao diện trước đăng nhập, chọn CẢNG BÌNH DƯƠNG và 01–31/07/2026: 46 trang, 10 dòng/trang, trang cuối chỉ STT 451. Bảng có hãng tàu, tên tàu, chuyến nhập/xuất, closing time, ETA/ETB/ETD, trạng thái; không có DWT hoặc vị trí cầu của từng dòng. Ví dụ WAN HAI A01: closing 25/07, ETA/ETB 28/07 nhưng ETD 22/07; không thể dùng trường trạng thái để xác nhận lượt vào/rời thực tế tại Bình Dương. Các dòng này chưa đủ ngữ nghĩa để cộng vào chuỗi Cảng vụ và không được nhập thay số thiếu.

Nguồn đã xem: https://smartport.gemadept.com.vn/login và lịch công khai Đồng Nai tại URL nguồn trong ledger. Bằng chứng truy vấn lưu tại `.local/binhduong-research/` (ignored, không chứa URL phiên trong tài liệu commit). Chưa tìm được nguồn bổ sung đủ điều kiện. Bước cần tiếp: lịch/nhật ký có mã bến Bình Dương, thời gian, chiều vào/rời và DWT từ Cảng vụ hoặc doanh nghiệp; nếu chỉ có lịch dịch vụ Smartport thì cần chuỗi riêng, không ghép vào chỉ tiêu hiện tại. Giao diện bổ sung ngày quan sát cuối theo từng chiều trong chi tiết thu gọn, tính từ dữ liệu đang phát hành.
