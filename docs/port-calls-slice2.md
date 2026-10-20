> **Lộ trình đã được người dùng duyệt ngày 21/10/2026:** [Kế hoạch ngành cảng theo góc nhìn đầu tư](port-investment-roadmap-review.md) đưa dashboard theo mã, tháng/quý/YTD và YoY vào Slice 2, nghiệm thu pilot trước khi mở rộng ngành. Đang thực hiện [Slice 2A với PHP](php-slice2a-pilot.md); gate lịch sử actual chưa đạt. Các ranh giới slice/ưu tiên cũ bên dưới là lịch sử; runbook và biên nhận vẫn mô tả phần đã thực hiện.

# Slice 2 — dữ liệu tàu vào/ra phục vụ phân tích đầu tư

**Mục tiêu hiện hành (điều chỉnh 17/10/2026):** [phạm vi dữ liệu đầu tư](slice2-investment-data-scope.md).
Ưu tiên tàu vào/ra, DWT và thời gian để bàn giao dữ liệu lịch sử cho các phase
tổng hợp. Tọa độ, vị trí chi tiết và hồ sơ giấy phép không phải đầu ra bắt buộc.
Các mục triển khai và nghiệm thu bên dưới ghi lại trạng thái từng đợt, không thay
thế mục tiêu/tiêu chí mới và không có nghĩa đã hoàn thành phạm vi tất cả cảng.

Tiến độ và thứ tự tiếp tục tối 17/10/2026: [bàn giao Slice 2](port-calls-slice2-progress.md).

## Mở rộng ngày/giờ và ma trận cảng — tối 17/10/2026

**Vận hành mới nhất:** 23 connector sau migration `202610180001_berth_movements.sql`.
Nguồn Đà Nẵng/Kỳ Hà dùng HTTP đúng từ trang Cảng vụ; Long An/Tiền Giang đối chiếu
nhãn bến từ nguồn TP.HCM. Xem mục mới nhất trong `port-calls-slice2-progress.md`.
Thêm `dongnai-open-anchorage`, `hatinh-open-anchorage`; collector neo tải đủ các
trang 500 dòng đến tối đa 5.000, từ chối total thay đổi, trang thiếu hoặc ID lặp.
Dòng không xác định khu vực giữ quarantine. Parser ba nguồn neo trước lên 1.1.0
để lưu GT, giữ nguyên các bản 1.0.0 đã nhập.

Migration `202610170010_snapshot_parser_precedence.sql` chọn parser hiện hành cho
cùng raw hash đã có bằng chứng fetch mới hơn, tránh bản 1.0.0 che GT đã parse ở
1.1.0 chỉ vì bundle local có timestamp cũ. Không cho nội dung cũ khác hash đè
nguồn tải mới hơn. Replay vẫn không sửa artifact bất biến.

Readback staging 22:38 ngày 17/10: API 01/09–17/10 có 459 sự kiện và 1.300
snapshot từ 21 source areas, không truncated. Database public có 471 sự kiện
trên mọi ngày đã thu thập, gồm 222 sự kiện Nghệ An. Kiểm tra read-only bằng
`node scripts/check-port-call-staging.mjs`; cần `.env.local` server hiện có,
không đọc cookie hoặc dùng quyền quản trị. Biên nhận tại
`catalog-review/slice2-expanded-staging-acceptance-20261017.json`.

Trên staging, `PORT_CALL_IMPORT_MODE=edge` chuyển POST quản trị sang
`/functions/v1/port-call-refresh` trong cùng project Supabase. Function xác minh
người dùng qua Auth và `app_metadata.role=admin`, parse lại evidence rồi gọi
`port.import_port_calls` bằng JWT người dùng, không dùng service role hay sửa RLS.
Mã entrypoint pin commit đã triển khai; cập nhật pin và deploy lại khi đổi parser.
Không đưa token, session URL hoặc service credentials vào Git/chat.

Refresh server Nghệ An lấy một báo cáo mới nhất. CLI lấy tối đa 15 báo cáo và
chia bundle `nghean-reported/daily/<day>.bundle.json` để nhập lịch sử từng ngày.
Nhập lại từng bundle là replay, không cộng trùng lịch sử. Chưa cấu hình tự chạy.

Migration `202610170008_day_precision_calls.sql` thêm 7 nguồn, tổng 19 connector.
Nguồn sự kiện mới: `nghean-reported`, `quangtri-hon-la`, `quangtri-cua-gianh`,
`quangtri-con-co`, `quangtri-my-thuy`. Quan sát neo mới: `thaibinh-open-anchorage`
và `kiengiang-open-anchorage`. Ngày đến/rời không có giờ giữ timestamp null,
`time_day` và `event_day` đúng ngày nguồn. API lọc `event_day` theo giờ Việt Nam.
`gt` và `dwt` là hai trường riêng; không thay thế nhau.

Nghệ An chỉ tải tối đa 15 báo cáo XLSX liên kết từ trang chính thức. Bundle giữ
index, bài đăng và byte workbook trong base64 để máy chủ parse lại. Giới hạn
500 KB/workbook và 10 MB XML giải nén, không đọc external links, macro hoặc chạy
công thức. Cache ngày A2 phải khớp ngày bài đăng; các công thức ô dữ liệu không
được sử dụng. Không dùng tên file ghi 2016 để ghi đè năm báo cáo 2026.

Các nguồn Quảng Trị mới nhận thông báo ngày/giờ và ngày đơn lẻ, kiểm tra tên khu
vực trong title, header cột và ranh giới từng thông báo. Bảng vị trí xen giữa và
thông báo tương lai không được tính vào sự kiện lịch sử. Không nâng kế hoạch
thành dữ kiện thực tế chỉ vì ngày dự kiến đã qua.

`nationwideCoverage` trả đủ 34 nhóm cảng theo danh mục 804/2022 cùng liên kết
nguồn khu vực có liên quan. Quan hệ này là ma trận nghiên cứu, không phải mapping
canonical đã duyệt hay chứng nhận đủ mọi bến của cảng. UI giữ cả nơi thiếu nguồn.
Danh mục bến đầy đủ theo 505/2026, cảng thủy nội địa và dầu khí còn phải đối chiếu.

Kiểm tra bundle tải thật tại local: `node scripts/verify-port-call-bundles.mjs`.
Lệnh chạy migrations trong PGlite, đối chiếu số dòng public, DWT/GT/ngày và replay
từng nguồn, xác nhận raw RLS; không kết nối cloud. Kết quả tại
`.local/port-calls/import-verification.json` không phải readback staging.

## Phạm vi

Nguồn miễn phí, không cần key hoặc hợp đồng API trả phí. Connector đầu tiên: Cảng vụ Hàng hải Quảng Trị,
[khu vực Cửa Việt](https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2073&page=NEWS).
Đây là **thông báo đến/rời do nguồn công bố**, không phải lịch điều động dự kiến,
không phải xác nhận AIS và không tuyên bố bao phủ toàn bộ lượt tàu Việt Nam.
Không thêm tổng DWT, YoY, xếp hạng hoặc các Slice 3–5.

Mở rộng ngày 17/10 theo yêu cầu dùng nguồn public: thêm thông báo **Lèn Bảng**
và ảnh chụp tàu tại cảng **Cần Thơ, Hậu Giang, Mỹ Thới**. Năm nguồn nằm trong
`CALL_SOURCES`; endpoint cố định và parser tương ứng được kiểm tra ở cả ứng dụng
và database. Không có nhà cung cấp trả phí trong luồng vận hành.

Ảnh chụp có bảng riêng và không tính vào biểu đồ lượt đến/rời. Cột ngày đến cảng
và ngày đến cầu/phao/neo không được diễn giải thành đến/rời. Ảnh chụp mới nhất
thay toàn bộ ảnh trước của đúng khu vực; tàu mất khỏi bảng không tự tạo lượt rời.
Thời điểm fetch chỉ là thời điểm quan sát, không thay ngày đến do nguồn ghi.

Khu vực của nguồn được giữ bằng mã `quangtri-cua-viet`. Danh mục Slice 1 hiện
chưa có thực thể tương ứng đã đối chiếu; không gán bằng tên gần giống hoặc địa giới.
Trang hoạt động độc lập tại `/industries/ports/calls`; không gắn sai vào doanh nghiệp.

## Sử dụng

1. Áp dụng migrations `202610170004_port_calls.sql` và
   `202610170005_current_call_review.sql` vào database đã có Slice 1.
2. Mở `/admin/port-calls`, đăng nhập bằng phiên quản trị hiện có.
   Bản mở rộng yêu cầu migration `202610170006_free_call_sources.sql`.
3. Bấm **Lấy dữ liệu mới**. Máy chủ chỉ gọi URL cố định, giới hạn 25 giây/5 MB,
   đọc lại HTML bằng parser, kiểm hash rồi nhập atomically. Không nhận URL tùy ý.
4. Nếu nguồn không đáp ứng từ máy chủ: chọn nguồn ở quản trị và chạy
   `pnpm data:refresh:calls -- --source <source-id>` trên máy,
   mở “Nhập bundle từ máy” và nhập `.local/port-calls/staging-bundle.json`.
5. Kiểm tra dòng cần xử lý và trang nhật ký. Refresh thất bại giữ dữ liệu trước.

Source ID: `quangtri-cua-viet`, `quangtri-len-bang`, `cantho-ct`, `cantho-hg`,
`cantho-st`. Bundle chỉ nhận đúng URL trong registry, không tải URL tùy ý.
Trang công khai có bộ lọc khu vực và công bố nguồn chưa có dữ liệu trong kỳ.

Không có lịch tự động được cấu hình. Nguồn đang trả cửa sổ khoảng 15 thông báo gần
nhất; muốn tích lũy lịch sử cần refresh thường xuyên. Không hứa backfill toàn bộ lịch sử.

CLI hỗ trợ `pnpm data:refresh:calls -- --all` để tải lần lượt tất cả nguồn đã
đăng ký. Mỗi nguồn có `.local/port-calls/<source-id>/staging-bundle.json`, preview,
`last-run.json` và archive bất biến theo thời điểm/hash. Một nguồn lỗi vẫn tiếp
tục nguồn tiếp theo, kết thúc với exit code 1. Bundle mới nhất chỉ cập nhật sau
khi parse thành công; kiểm tra `last-run.json` trước khi nhập để tránh dùng bản
cũ. Chạy một nguồn vẫn xuất đường dẫn bundle chung để tương thích quy trình cũ.
Đây là thu thập local, không tự nhập cloud hoặc chứng minh lịch tự chạy.

API bổ sung `quality` theo từng connector đã đăng ký, gồm `reportedDays`,
`missingReportDays`, `eventWindow`, `eventCount`, `eventsWithDwt`,
`dwtCoverageRatio` và `daily`. Tỷ lệ DWT tính trên sự kiện hợp lệ trả về trong kỳ;
`truncated=true` nghĩa là mẫu bị giới hạn. Snapshot/quarantine không tính vào.
Ngày không có sự kiện giữ null; báo cáo ngày không chứng minh đủ sự kiện ngày đó.
Danh sách connector không phải mẫu số cảng/bến toàn quốc; `complete` vẫn false.

## Tính đúng và lineage

- Năm lấy từ tiêu đề từng thông báo, không từ ngày fetch. Giờ Việt Nam UTC+7.
  Tiêu đề Lèn Bảng thiếu năm không được tự điền năm từ máy hoặc thông báo bên cạnh.
- Ngày/giờ sai, thiếu giờ hoặc tên ghép nhiều tàu được giữ trong quarantine.
  Không tự sửa `80:00`, tự điền nửa đêm hoặc chia tàu ghép.
- Nguồn không có IMO/registry ID. `vessels` có nhận dạng riêng cho từng quan sát,
  confidence `source_observation`; không gộp tàu chỉ vì cùng tên. Việc liên kết
  danh tính toàn cục cần nguồn có định danh ổn định, không bị coi là đã hoàn thành.
- Event key gồm nguồn/khu vực, chiều đến/rời, tên nguyên bản đã chuẩn hóa khoảng
  trắng và thời gian. Một event chỉ có một bản hiện hành; arrival/departure không
  tự ghép thành chuyến lưu cảng khi thiếu căn cứ.
- Mỗi raw HTML là artifact SHA-256 bất biến; nhập lại cùng nguồn/hash/parser không tạo thêm
  dòng. Bản nguồn thay đổi thêm phiên bản, không sửa lịch sử. Bản mới nhất theo
  từng ngày thông báo thay thế trọn ngày cũ, kể cả dòng bị rút khỏi thông báo.
- Từng dòng công khai có ngày thông báo, số dòng, parser version, fetch time,
  SHA-256 và artifact UUID; quản trị tải raw JSON an toàn (không chạy HTML/script).
- Raw HTML chỉ dành cho quản trị qua RLS. Public chỉ xem các trường dữ kiện có
  cấu trúc, không xuất crew/cargo/agency, văn bản nguồn hay WebForms state.
  Đây là phạm vi biên tập dữ kiện như chính sách catalog hiện hành, không ghi nhận
  một giấy phép API hoặc quyền tái phát hành nguyên trang chưa được cấp.
- DWT null nghĩa là thiếu; không biến thành 0, không tổng hợp DWT trong Slice 2.
  Các số có dấu chấm hàng nghìn/dấu phẩy thập phân được đọc riêng, không “clip” lỗi.
- Biểu đồ đếm lượt đến hợp lệ; lượt rời hiển thị riêng, không cộng đôi.
  Bộ lọc ngày theo thời gian sự kiện, không phải thời điểm tải.
- Độ phủ là ngày có thông báo; thiếu ngày không phải zero. Metadata luôn nêu
  partial coverage, asOf và phương pháp `reported-notices-v1`.

## API và giới hạn

`GET /api/v1/port-calls?from=2026-10-01&to=2026-10-17&area=cantho-ct` trả dữ kiện,
monthly buckets, coverage và metadata. Khoảng tối đa 93 ngày; tối đa 1.000 dòng.
Khi đạt giới hạn, `meta.truncated=true` và UI yêu cầu thu hẹp kỳ; không tuyên bố
tổng lượt đầy đủ. Không cung cấp carrier/vessel type khi nguồn chưa có trường đó.

`POST /api/v1/admin/port-calls` nhận `{action:"refresh",source_id:"cantho-ct"}` hoặc bundle raw có hash.
`GET /api/v1/admin/port-calls?artifact=<uuid>` trả bản gốc cho quản trị đã xác thực.
Ghi dữ liệu yêu cầu cùng origin và Supabase Auth role từ app_metadata.

`data` chỉ chứa thông báo lượt đến/rời; `snapshots` là quan sát mới nhất của từng
nguồn, độc lập bộ lọc ngày sự kiện. Các source areas không được tự nối với cảng
chuẩn/doanh nghiệp khi chưa duyệt mapping. API và giao diện đều giữ giới hạn này.

Reference đã đọc: `vietnam_port_official_public_data_sources.md` và mục Slice 2
trong `architecture_plan.md`. Báo cáo tháng Đà Nẵng, ENC và danh mục bến/cầu hỗ trợ
đối chiếu/mapping, không tạo sự kiện từng tàu từ số tổng hợp. Trang thống kê IP chưa
xác nhận được feed chi tiết không đăng nhập. Nguồn đã rà và các khoảng trống tại
`port-call-source-review.md`. Không tuyên bố đã bao phủ mọi cảng Việt Nam.

## Kiểm tra nghiệm thu

- Fixture HTML trích từ thông báo 16/10/2026 kiểm named entities, hai bảng riêng,
  thời gian và tên tàu thực tế. Full raw ở `.local`/database private, không commit.
- Vitest/PGlite: năm/ngày không hợp lệ, giờ lỗi, tàu ghép, import atomically,
  replay, thay thế thông báo, immutable history và RLS raw/public.
- Playwright: nhật ký, empty state, lọc tên/ngày, lineage, API validation,
  phiên quản trị, desktop/mobile và hai giao diện sáng/tối.
- Nghiệm thu cloud cần xác nhận riêng migration, refresh, replay và public page;
  kết quả local không thay thế được kiểm tra đó.

## Nghiệm thu bản nguồn miễn phí — 17/10/2026

Đã refresh thật qua UI cho 5 nguồn; query Supabase độc lập khớp API công khai:
Cửa Việt 60 thông báo hợp lệ, Lèn Bảng 104; Cần Thơ 8 quan sát tại cảng, Hậu Giang 8,
Mỹ Thới 4. Nhật ký có 85 lượt đến và 79 lượt rời, 16 ngày lịch có thông báo;
19 dòng quarantine không tính vào dữ kiện hợp lệ. Các con số là readback tại lần
nghiệm thu, không phải cam kết độ đầy đủ toàn quốc hoặc cả tháng.

Nhập lại bundle Cần Thơ báo replay, không thêm trùng. Tải raw từ UI quản trị của
Cần Thơ và Lèn Bảng, tính lại SHA-256 đều khớp. API raw không đăng nhập trả 401;
API public không chứa raw HTML/importer. Bộ lọc Cần Thơ hiển thị trực tiếp bảng vị
trí, không vẽ biểu đồ lượt tàu từ snapshot. Ngày lịch có thông báo được loại trùng
qua các nguồn, không cộng hai khu vực cùng ngày thành hai ngày lịch.

70 Vitest, 28 Playwright desktop/mobile đạt ở bản mở rộng; 4 Playwright lượt tàu
được chạy lại sau sửa UI/đếm ngày. Lint, typecheck, Next build đạt. Cloudflare Linux
build và deployment bản cuối `8dc5be9` Ready; build `a7066ed9-298e-4759-b065-c5c3a3e74bd0`,
Worker prefix `66549e26`. Biên nhận: `catalog-review/slice2-free-sources-acceptance-20261017.json`.
Hoàn thành chức năng Slice 2 với 5 nguồn miễn phí; chưa nghiệm thu mọi cảng Việt Nam.

## Mở rộng nguồn khu vực — 17/10/2026

Thêm connector miễn phí Hải Phòng, TP.HCM/Cái Mép–Thị Vải, Quảng Ninh,
Chân Mây, Thuận An, Trà Vinh và vị trí neo Bình Thuận/Cà Ná. Tổng 12 connector,
không đồng nghĩa 12 cảng chuẩn hay bao phủ toàn quốc. Không cần API key.
Migration `202610170007_regional_snapshots.sql` giữ nguyên các bản nhập trước.

Các bảng này là snapshot vị trí, không bổ sung lượt đến/rời vào biểu đồ.
TP.HCM và Huế có ngày đến không có giờ: lưu `time_day`, timestamp null.
Quảng Ninh thiếu năm; Hải Phòng không ghi thời gian: giữ unknown.
API Bình Thuận công khai do trang Cảng vụ liên kết: chỉ lấy bản ghi neo chưa kết
thúc; nhãn `anchorage_start` thể hiện bắt đầu neo, không suy ra đến/rời cảng.
Không tải hoặc lưu metadata phiên khách vào artifact; archive response dữ liệu.
API đầy đủ tối đa 500 dòng; total khác độ dài response thì từ chối nhập.

Bảng công khai phân trang 50 dòng, lọc tên bến/cầu/phao. Repository đọc snapshot
qua các trang 1.000 dòng, giới hạn 5.000; chạm giới hạn sẽ cảnh báo. Lượt đến/rời
vẫn giới hạn 1.000 theo kỳ. Lệnh refresh:
`pnpm data:refresh:calls -- --source haiphong-in-port` hoặc chọn nguồn tại admin.

### Các khoảng trống toàn quốc còn phải xử lý

Reference `vietnam_port_official_public_data_sources.md` đã được đối chiếu.
Không dùng danh mục 17 nhóm cảng hiện tại làm mẫu số toàn quốc: tên địa giới và
phạm vi quản lý thay đổi. Nguồn TP.HCM hiện bao gồm Cái Mép–Thị Vải, không được
nhân bản thành nhiều nguồn độc lập hoặc tự gán mapping doanh nghiệp.

- Nghệ An: tìm thấy báo cáo XLSX chính thức tại danh sách cat=2017, bản 14/10/2026.
  Chưa có parser XLSX server kiểm thử; không coi đã tích hợp. Ngày trong workbook
  là 2026 dù tên file ghi 2016, cần đọc ngày báo cáo trong nội dung.
- Đà Nẵng: hệ thống public-kh timeout; Google Sheet và lịch khai thác tìm thấy là
  kế hoạch, không chứng minh tàu đến/rời. Trang khai thác của cảng chưa có feed chi tiết.
- Quy Nhơn/Gia Lai/Đắk Lắk: trang vị trí trả lỗi/chưa cập nhật; PDF lịch khai thác
  là kế hoạch. Chưa có feed thực tế đã kiểm thử.
- Khánh Hòa: bảng showtv công khai là kế hoạch; hệ thống kht yêu cầu đăng nhập.
- Đồng Nai và Kiên Giang: trang chính thức truy cập được, menu vị trí chưa dẫn tới
  bảng dữ liệu công khai đọc được. Không mặc định không có tàu.
- Thanh Hóa và Quảng Bình cũ: domain nguồn cũ không phân giải. Quảng Trị đã có
  Cửa Việt/Lèn Bảng, chưa đủ chứng minh mọi bến trong phạm vi sau sắp xếp.
- Quảng Nam cũ: chứng thư không được trust; không tắt kiểm tra TLS để lấy dữ liệu.
- Quảng Ngãi, Hà Tĩnh, Hưng Yên/Thái Bình cũ, Ninh Bình, Tây Ninh/Long An,
  Vĩnh Long/Bến Tre, Đồng Tháp/Tiền Giang, Cà Mau: chưa xác lập feed chi tiết
  công khai có thể refresh và kiểm thử. Chưa đủ căn cứ tuyên bố toàn quốc.
- Cổng thống kê được reference dẫn tới `http://144.79.79.16/intro.html` hiển thị
  các biểu tổng hợp; ứng dụng `/webtkhh` yêu cầu đăng nhập, không phải API lượt tàu.

Đây là danh sách công việc còn mở, không phải dữ liệu zero và không phải trạng thái
hoàn tất yêu cầu tất cả cảng. Không dùng kế hoạch, tổng hợp tháng hoặc số vị trí hiện
có để điền giả lịch sử lượt tàu ở các khu vực còn thiếu.

### Readback staging nguồn khu vực

Ngày 17/10/2026, đã nhập thành công cả 7 connector mới. Hải Phòng 196,
TP.HCM/Cái Mép–Thị Vải 728, Quảng Ninh 90, Chân Mây 18, Thuận An 2,
Trà Vinh 2, Bình Thuận/Cà Ná 60 quan sát hợp lệ. Cộng 20 quan sát từ ba nguồn
Cần Thơ/Hậu Giang/Mỹ Thới trước đó: API công khai trả 1.116 snapshot, vượt trang
1.000 dòng đầu tiên của Supabase và không bị cắt ở lần readback này.
164 thông báo đến/rời vẫn tách riêng; không tăng từ các snapshot mới.

5 nguồn mới refresh trực tiếp trên staging; TP.HCM và Bình Thuận không tải được
từ Worker tại lần thử, dùng CLI tải mới và nhập bundle qua UI quản trị. Nhập lại
bundle Bình Thuận báo replay, không thêm trùng. Live source thay đổi nên số dòng
khác mẫu nghiên cứu trước đó là bình thường; không dùng số fixture làm số live.

74 Vitest, 6 Playwright lượt tàu desktop/mobile, lint/typecheck/Next build đạt.
Kiểm thử thêm bảng 51 dòng, chuyển trang, ngày không có giờ, ngày chưa rõ và lọc bến.
Biên nhận `catalog-review/slice2-regional-expansion-acceptance-20261017.json` giữ
ranh giới nghiệm thu nguồn khu vực và yêu cầu tất cả cảng vẫn chưa hoàn thành.


## Hoạt động cầu bến container — 18/10/2026

Nguồn `danang-berth-reported` lấy form POST công khai trên trang Cảng Đà Nẵng.
CLI lấy tháng hiện tại và hai tháng trước; refresh từ admin chỉ lấy tháng hiện
hành để giới hạn tải. Lọc bảng tháng theo **ngày rời bến**, không theo ngày ATB.
Các chuyến còn làm hàng chưa thuộc bảng hoàn thành; không hứa đầy đủ mọi tàu.

Database view `port.published_port_calls` có `movement_scope='port'|'berth'`;
consumer SQL phải giữ scope khi đếm. API `/api/v1/port-calls` giữ `data` và
`monthly` riêng cho scope cảng, thêm `berthMovements` cho ATB/ATD. Không cộng
hai tập này thành số lượt vào cảng; không ghép theo tên tàu. ID chuyến trong
link chi tiết, năm và vsl được đưa vào khóa quan sát. DWT/GT thiếu giữ null.

Bản tháng sửa/xóa thay thế phạm vi ngày đã qua của tháng rời bến; bản gốc cũ
vẫn giữ. Ngày có trong archive tháng không tự chứng minh nguồn công bố báo cáo
hàng ngày hoặc không thiếu chuyến. Phạm vi toàn quốc vẫn chưa hoàn thành.
