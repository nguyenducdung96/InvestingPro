# Slice 2 — nhật ký lượt tàu theo thông báo

## Phạm vi

Một connector công khai, không cần key: Cảng vụ Hàng hải Quảng Trị,
[khu vực Cửa Việt](https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2073&page=NEWS).
Đây là **thông báo đến/rời do nguồn công bố**, không phải lịch điều động dự kiến,
không phải xác nhận AIS và không tuyên bố bao phủ toàn bộ lượt tàu Việt Nam.
Không thêm tổng DWT, YoY, xếp hạng hoặc các Slice 3–5.

Khu vực của nguồn được giữ bằng mã `quangtri-cua-viet`. Danh mục Slice 1 hiện
chưa có thực thể tương ứng đã đối chiếu; không gán bằng tên gần giống hoặc địa giới.
Trang hoạt động độc lập tại `/industries/ports/calls`; không gắn sai vào doanh nghiệp.

## Sử dụng

1. Áp dụng migration `202610170004_port_calls.sql` vào database đã có Slice 1.
2. Mở `/admin/port-calls`, đăng nhập bằng phiên quản trị hiện có.
3. Bấm **Lấy dữ liệu mới**. Máy chủ chỉ gọi URL cố định, giới hạn 25 giây/5 MB,
   đọc lại HTML bằng parser, kiểm hash rồi nhập atomically. Không nhận URL tùy ý.
4. Nếu nguồn không đáp ứng từ máy chủ: chạy `pnpm data:refresh:calls` trên Windows,
   mở “Nhập bundle từ máy” và nhập `.local/port-calls/staging-bundle.json`.
5. Kiểm tra dòng cần xử lý và trang nhật ký. Refresh thất bại giữ dữ liệu trước.

Không có lịch tự động được cấu hình. Nguồn đang trả cửa sổ khoảng 15 thông báo gần
nhất; muốn tích lũy lịch sử cần refresh thường xuyên. Không hứa backfill toàn bộ lịch sử.

## Tính đúng và lineage

- Năm lấy từ tiêu đề từng thông báo, không từ ngày fetch. Giờ Việt Nam UTC+7.
- Ngày/giờ sai, thiếu giờ hoặc tên ghép nhiều tàu được giữ trong quarantine.
  Không tự sửa `80:00`, tự điền nửa đêm hoặc chia tàu ghép.
- Nguồn không có IMO/registry ID. `vessels` có nhận dạng riêng cho từng quan sát,
  confidence `source_observation`; không gộp tàu chỉ vì cùng tên. Việc liên kết
  danh tính toàn cục cần nguồn có định danh ổn định, không bị coi là đã hoàn thành.
- Event key gồm nguồn/khu vực, chiều đến/rời, tên nguyên bản đã chuẩn hóa khoảng
  trắng và thời gian. Một event chỉ có một bản hiện hành; arrival/departure không
  tự ghép thành chuyến lưu cảng khi thiếu căn cứ.
- Mỗi raw HTML là artifact SHA-256 bất biến; nhập lại cùng hash không tạo thêm
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

`GET /api/v1/port-calls?from=2026-10-01&to=2026-10-17` trả dữ kiện,
monthly buckets, coverage và metadata. Khoảng tối đa 93 ngày; tối đa 1.000 dòng.
Khi đạt giới hạn, `meta.truncated=true` và UI yêu cầu thu hẹp kỳ; không tuyên bố
tổng lượt đầy đủ. Không cung cấp carrier/vessel type khi nguồn chưa có trường đó.

`POST /api/v1/admin/port-calls` nhận `{action:"refresh"}` hoặc bundle raw có hash.
`GET /api/v1/admin/port-calls?artifact=<uuid>` trả bản gốc cho quản trị đã xác thực.
Ghi dữ liệu yêu cầu cùng origin và Supabase Auth role từ app_metadata.

## Kiểm tra nghiệm thu

- Fixture HTML trích từ thông báo 16/10/2026 kiểm named entities, hai bảng riêng,
  thời gian và tên tàu thực tế. Full raw ở `.local`/database private, không commit.
- Vitest/PGlite: năm/ngày không hợp lệ, giờ lỗi, tàu ghép, import atomically,
  replay, thay thế thông báo, immutable history và RLS raw/public.
- Playwright: nhật ký, empty state, lọc tên/ngày, lineage, API validation,
  phiên quản trị, desktop/mobile và hai giao diện sáng/tối.
- Nghiệm thu cloud cần xác nhận riêng migration, refresh, replay và public page;
  kết quả local không thay thế được kiểm tra đó.
