# Slice 2 — nhật ký lượt tàu theo thông báo

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
