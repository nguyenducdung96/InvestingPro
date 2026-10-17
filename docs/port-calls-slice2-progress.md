# Tiến độ Slice 2 — tiếp tục tối 17/10/2026

Người dùng tạm dừng và sẽ tiếp tục vào buổi tối. **Chưa hoàn thành phạm vi mở rộng
“tất cả cảng”.** Chỉ dùng nguồn miễn phí, không phụ thuộc Vnstock.

## Đã hoàn thành

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

1. Ưu tiên connector cổng giấy phép: kiểm chứng tìm kiếm/phân trang/ngày/mã Cảng vụ;
   lấy thử Hải Phòng, TP.HCM và phạm vi Cái Mép–Thị Vải.
2. Lưu raw/hash/parser, số giấy phép, định danh nguồn; chống trùng và tách giấy phép,
   kế hoạch, vị trí, thông báo sự kiện. Không lấy ngày tải thay ngày sự kiện.
3. Bổ sung lịch sử theo ngày, đo độ phủ và đối chiếu số dòng với trang nguồn.
4. Đối chiếu danh mục từng cảng/bến; bổ sung khu vực còn thiếu và parser XLSX
   Nghệ An đã có mẫu. Không coi 12 connector là 12 cảng hoặc toàn quốc.
5. Hoàn thiện refresh định kỳ, trạng thái lần chạy, cảnh báo lỗi/nguồn cũ và nghiệm
   thu tự chạy. Hiện có refresh theo thao tác, chưa nghiệm thu tự động.
6. Chỉ chốt “tất cả cảng” sau ma trận độ phủ và đối chiếu từng khu vực; không lấp
   ngày/khu vực thiếu bằng số 0, kế hoạch hoặc số vị trí hiện tại.

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
