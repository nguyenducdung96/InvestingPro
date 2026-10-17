# Tiến độ Slice 2 — tiếp tục tối 17/10/2026

**Mục tiêu đã điều chỉnh 17/10/2026:** [dữ liệu hoạt động phục vụ đầu tư](slice2-investment-data-scope.md).
Ưu tiên tàu vào/ra, trọng tải DWT, thời gian và lịch sử có thể tổng hợp cho phase
sau. Không ưu tiên tọa độ, bản đồ, chi tiết vị trí hay giấy phép như sản phẩm riêng.
**Chưa hoàn thành phạm vi mở rộng “tất cả cảng”.** Chỉ dùng nguồn miễn phí,
không phụ thuộc Vnstock. Việc đổi mục tiêu không tự hoàn tất phần triển khai còn thiếu.

## Đã hoàn thành

### Readback staging lúc 22:38 ngày 17/10/2026

- Đã nhập đủ 21 nguồn, gồm Đồng Nai và Hà Tĩnh bằng bundle khi live source chậm/lỗi.
- API 01/09–17/10: **459 sự kiện đến/rời, 1.300 snapshot**, 21 source areas có
  evidence, không chạm giới hạn. Database public giữ 471 sự kiện trên toàn bộ
  ngày đã thu thập; riêng Nghệ An 222 sự kiện, 210 nằm trong kỳ API nêu trên.
- Đối chiếu từng event key/hash/DWT/GT của 5 nguồn neo với bundle thật đều khớp.
  Nghệ An giữ `occurred_at=null`, `event_day=time_day` và GT riêng. Raw API trả
  401 nếu không đăng nhập; public không xuất raw hay người nhập.
- Replay bundle Nghệ An/Hà Tĩnh được UI xác nhận, không tạo lượt trùng.
- Migration `202610170010_snapshot_parser_precedence.sql` sửa trường hợp cùng
  raw hash được parse bằng phiên bản mới nhưng fetch cũ hơn. Chỉ ưu tiên parser
  mới trên cùng nội dung; nội dung khác tải mới hơn vẫn giữ ưu tiên. Có kiểm thử.
- Ma trận vẫn còn **14 nhóm chưa có dữ liệu hoạt động đã tích hợp**: Thanh Hóa,
  Đà Nẵng, Quảng Nam, Quảng Ngãi, Bình Định, Phú Yên, Khánh Hòa, Bình Dương,
  Long An, Tiền Giang, Bến Tre, Đồng Tháp, Sóc Trăng, Vĩnh Long. 20 nhóm còn lại
  chỉ có dữ liệu khu vực một phần; không coi là đã đầy đủ bến hoặc lịch sử vào/ra.
- Biên nhận: `catalog-review/slice2-expanded-staging-acceptance-20261017.json`;
  khảo sát bổ sung: `catalog-review/slice2-nationwide-source-probe-20261017.json`.

**Chưa nghiệm thu full tất cả cảng.** Không dùng ma trận 34 tên, 21 connector,
giấy phép hoặc snapshot để thay cho nhật ký đến/rời còn thiếu ở từng cảng/bến.

### Cập nhật vận hành lúc 22:30 ngày 17/10/2026

- Thêm nguồn neo Đồng Nai và Hà Tĩnh/Quảng Bình, tổng 21 nguồn. Đồng Nai trả
  695 dòng tài nguyên trên hai trang; collector kiểm total, số dòng mỗi trang
  và ID không lặp, không dừng ở trang 500. Kết quả 75 dòng neo đang mở, 12 dòng
  quarantine; Hà Tĩnh 69 dòng đang mở hợp lệ. Không tính bản ghi neo đã kết thúc
  thành vị trí hiện tại hay sự kiện rời cảng.
- Tải lại API timeout trước đó thành công; không giữ kết luận “chưa tải được”
  cho Đồng Nai/Hà Tĩnh ở thời điểm mới. Dòng nguồn không rõ khu vực giữ quarantine.
- Parser neo cũ lên 1.1.0 để lưu GT riêng; dữ liệu/bản gốc phiên bản trước bất biến.
- Worker gói hiện tại đã thực sự trả `exceededCpu` khi nhập. Đã triển khai
  `port-call-refresh` trên Supabase Edge Functions, vẫn xác minh admin qua Auth,
  parse lại raw/checksum và gọi importer bằng JWT người dùng, không dùng service-role.
  Worker kiểm cùng origin và chuyển tiếp phiên được bảo vệ, không đưa token ra UI.
- Báo cáo Nghệ An được nhập theo từng ngày để giới hạn tải CPU. CLI giữ archive
  15 báo cáo và xuất thêm `nghean-reported/daily/<day>.bundle.json`; refresh từ
  server lấy báo cáo mới nhất. Không tự hứa đã backfill 89 trang archive.
- Staging đã nhập 7 nguồn mới đầu tiên và 15 báo cáo Nghệ An. Readback API kỳ
  01/09–17/10 có 459 sự kiện, 1.173 snapshot, đủ 19 source areas ở lần đọc này,
  `truncated=false`. Hai nguồn Đồng Nai/Hà Tĩnh được nghiệm thu riêng tiếp theo.
- Local nhập đủ 21 nguồn vào PGlite: 467 sự kiện trên toàn bộ ngày nguồn,
  1.305 snapshot; replay, GT/DWT/ngày và raw RLS đạt. Con số khác kỳ API do cửa sổ
  sự kiện và nguồn live thay đổi, không lấy số local làm số cloud.
- 89 Vitest đạt; bộ Playwright mở rộng kiểm cả ma trận 34 nhóm, desktop/mobile.

Phạm vi tất cả cảng vẫn chưa hoàn thành. Còn thiếu nhật ký đến/rời cho nhiều
nhóm, danh mục bến/đường thủy/dầu khí đầy đủ và ánh xạ canonical. Ma trận không
biến nguồn vị trí hay địa giới mới thành nghiệm thu mọi bến cảng.

### Mở rộng tiếp lúc 22:00 ngày 17/10/2026

- Bổ sung 7 connector: báo cáo hoạt động Nghệ An; thông báo đến/rời Hòn La,
  Cửa Gianh, Cồn Cỏ, Mỹ Thủy; bảng neo Thái Bình/Nam Định và Kiên Giang/Cà Mau.
  Tổng 19 connector, trong đó 7 nguồn sự kiện và 12 nguồn quan sát vị trí.
- Nghệ An tải 15 workbook từ archive chính thức: ngày báo cáo trong cache A2
  được đối chiếu với ngày bài đăng, không chạy `TODAY()`, không dùng năm trong
  tên file. Parse 495 dòng, 222 khóa hợp lệ khác nhau, 20 dòng quarantine.
- Hỗ trợ sự kiện chỉ có ngày xuyên suốt database/API/UI, không tạo giờ nửa đêm.
  GT lưu riêng với DWT. Nguồn sai năm/giờ, tương lai hoặc đổi cột vẫn bị loại/giữ
  đối chiếu. Không biến snapshot hoặc giấy phép thành sự kiện thực tế.
- Có ma trận đủ 34 nhóm theo trang 2 danh mục 804/QĐ-TTg năm 2022. Đây là mẫu
  số theo văn bản được lưu ngày, không xác nhận danh mục bến/cảng thủy nội địa/dầu
  khí hiện hành đã đầy đủ, không tự tạo mapping canonical hoặc doanh nghiệp.
- Chạy tải mới 19/19 nguồn. Nhập vào PGlite bằng migration thật, đối chiếu từng
  DWT/GT/ngày: 467 sự kiện đến/rời, 1.173 snapshot. Replay từng nguồn không tăng
  số dòng; raw bị từ chối với anon. Đây là nghiệm thu local, chưa phải cloud data.
- 85 Vitest, 6 Playwright desktop/mobile, typecheck, lint, Next build đạt.
  Build OpenNext trên Windows dừng ở EPERM symlink; cần xác nhận Linux build.
- Migration `202610170008_day_precision_calls.sql` đã chạy thành công trên
  project Supabase staging hiện dùng; tiếp tục triển khai app và nhập dữ liệu.

**Vẫn chưa đủ toàn bộ cảng:** Thanh Hóa trả “Dữ liệu đang được cập nhật”; Đà Nẵng,
Đồng Nai và Hà Tĩnh chưa tải được feed public; Khánh Hòa có hệ thống yêu cầu đăng
nhập; Quảng Nam/Đồng Tháp lỗi chứng thư. Các cảng còn thiếu vẫn nằm trong ma trận.
Lịch refresh định kỳ, đầy đủ bến và lịch sử sự kiện toàn quốc chưa được nghiệm thu.

### Kiểm tra lại local lúc 21:46 ngày 17/10/2026

- Chạy mới cả 12 connector: 11 nguồn tải/parse thành công; Bình Thuận bị từ chối
  do URL resource không khớp kiểm tra nguồn ở lần chạy đầu. Chạy lại riêng Bình
  Thuận thành công: 58 dòng parse, 3 quarantine; chưa khẳng định nguyên nhân lỗi
  tạm thời và không nới allowlist URL. Đây là kết quả local,
  chưa nhập database, chưa deploy và không thay thế readback staging trước đó.
- CLI có `--all`, bundle/preview riêng từng nguồn, archive từng lần tải theo thời
  điểm và SHA-256, trạng thái thành công/lỗi. Một nguồn lỗi không ngắt các nguồn
  còn lại; lần chạy vẫn trả exit code lỗi. Không tự cấu hình lịch định kỳ.
- API bổ sung `quality` theo nguồn: kỳ sự kiện, ngày có/thiếu báo cáo, tỷ lệ DWT,
  số vào/ra theo ngày; snapshot không trở thành sự kiện. Ngày chưa có sự kiện
  giữ null; báo cáo ngày không chứng minh đủ mọi sự kiện ngày đó.
- Ma trận `quality` chỉ bao gồm connector đã đăng ký, không là danh mục tất cả
  cảng/bến Việt Nam. Mọi nguồn vẫn `complete=false`.
- Biên nhận: `catalog-review/slice2-local-refresh-20261017.json`.
- Kiểm tra local: 77/77 Vitest, typecheck, lint và Next production build đạt.

Các khoảng trống toàn quốc trong runbook vẫn mở. Phạm vi tất cả cảng chưa đạt.

- 12 connector công khai đã nhập trên staging. Tại lần nghiệm thu: 1.116 quan sát
  vị trí và 164 thông báo đến/rời; không phải số live kiểm tra lại khi viết ghi chú.
- Hải Phòng 196 quan sát; TP.HCM/Cái Mép–Thị Vải 728 tại lần nhập. Đối chiếu HCM:
  739 dòng nguồn, 9 dòng tàu ghép cần đối chiếu, 2 dòng trùng, 728 khóa hợp lệ.
  Nguồn Hải Phòng thay đổi theo thời điểm, không dùng số cũ làm số tàu hiện tại.
- Nhật ký đến/rời hiện từ Cửa Việt và Lèn Bảng. Snapshot vị trí không cộng vào
  biểu đồ lượt tàu; thiếu dữ liệu không coi là 0.
- Lọc khu vực/tên tàu/bến/cầu; phân trang 50 dòng; DWT khi nguồn có; truy xuất
  URL, thời điểm lấy, parser, hash và bản gốc dành cho quản trị.
- Đã đưa “Dữ liệu vị trí đã có” lên trước nhật ký, ưu tiên nguồn có nhiều dữ liệu
  và liên kết mở thẳng từng bảng. Giao diện sáng/tối, desktop/mobile.
- Refresh qua admin; TP.HCM và Bình Thuận dùng CLI + bundle khi Worker không tải
  được nguồn. Nhập lại bundle Bình Thuận không tạo trùng.
- Migration cloud đến `202610170007_regional_snapshots.sql`.
- Bản mở rộng có 74 Vitest đạt. Giao diện cuối có 6 Playwright lượt tàu
  desktop/mobile đạt; lint/typecheck/Next build đã đạt trong quá trình xác minh.
- Bản giao diện cuối `073814e` Cloudflare Ready; Worker prefix `4c12530b`.

## Phát hiện quan trọng chưa tích hợp

https://hanghai.moc.gov.vn/tra-cuu-giay-phep — cổng chính thức được trang Cảng vụ
TP.HCM liên kết, tra cứu không cần đăng nhập. Đã dùng form lọc Hải Phòng ngày
17/10/2026, nhận 15 kết quả: số giấy phép, tên tàu, IMO, hô hiệu, ngày hiệu lực,
cảng rời. Trang mặc định có hơn 534.000 bản ghi, phân trang và danh sách 25 tên
Cảng vụ theo hệ thống nguồn. Không coi các con số này là độ phủ toàn quốc đã nghiệm thu.

**Connector chưa triển khai.** GET tự dựng không cho cùng kết quả như form POST;
cần theo đúng form và kiểm chứng bộ lọc/phân trang. Giấy phép rời cảng phải được
giữ riêng, không tự diễn giải thành xác nhận tàu đã rời hoặc lượt đến.

## Thứ tự làm tiếp buổi tối

1. Đóng khoảng trống dữ liệu tàu vào/ra, thời gian và DWT tại Hải Phòng, TP.HCM,
   Cái Mép–Thị Vải; chọn nguồn Cảng vụ/trang cảng/API công khai hữu ích nhất.
   Cổng giấy phép là một ứng viên nguồn, không phải dependency bắt buộc.
2. Chuẩn hóa sự kiện, lịch sử, DWT/đơn vị và khóa chống trùng. Không suy ra lượt
   ra từ tàu mất khỏi snapshot; giữ kế hoạch/giấy phép khác dữ kiện sự kiện.
3. Hoàn thiện bảng ngày, tổng quan lượt tàu cơ bản, kỳ dữ liệu và tỷ lệ có DWT;
   đưa chi tiết kỹ thuật nguồn vào phần mở khi cần, không làm nhiễu bảng đầu tư.
4. Bàn giao API dữ liệu sự kiện cho phase tổng hợp, kiểm tra số dòng/ngày/DWT
   với nguồn; bổ sung các cảng còn thiếu theo ma trận độ phủ.
5. Hoàn thiện refresh định kỳ, trạng thái lần chạy và cảnh báo lỗi/nguồn cũ;
   nghiệm thu tự chạy riêng. Hiện chưa nghiệm thu tự động.
6. Chốt theo tiêu chí mới trong tài liệu phạm vi; không đòi tọa độ, giấy phép
   hoặc chi tiết neo/cầu khi không phục vụ phân tích. Tất cả cảng vẫn là mục tiêu,
   không lấp ngày/khu vực thiếu bằng số 0, kế hoạch hoặc số vị trí hiện tại.

## Điểm mở lại

- [Trang công khai](https://investing-pro-web-staging.tuyenkinhmon88.workers.dev/industries/ports/calls).
- [Trang quản trị](https://investing-pro-web-staging.tuyenkinhmon88.workers.dev/admin/port-calls).
- [Runbook và khoảng trống khu vực](port-calls-slice2.md).
- [Đối chiếu nguồn](port-call-source-review.md).
- [Biên nhận](catalog-review/slice2-regional-expansion-acceptance-20261017.json).
- Lệnh local: `pnpm data:refresh:calls -- --source hcm-in-port`.
- Không ghi token vào docs/chat. Kiểm tra phiên admin khi cần nhập; nếu hết hạn,
  người dùng đăng nhập tại trang admin. Nghiên cứu/parser/kiểm thử local tiếp tục
  được độc lập với phiên quản trị.
