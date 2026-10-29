# GMD và nguồn lịch miền Nam — 29/10/2026

## Cập nhật dữ liệu đã thực hiện

Đã lấy lịch TP.HCM đến hết 28/10/2026, giữ đủ 666 ngày từ 01/01/2025; không lỗi tải trong edition mới. Exporter đối chiếu lại hash và parser của toàn bộ raw. Gemalink tăng từ 1.838 lên 1.854 dòng hai chiều; tổng các phạm vi HCM đã tích hợp tăng từ 10.365 lên 10.455. Đây là lịch công bố, không phải lượt ghé duy nhất hoặc actual.

Tháng 10 của Gemalink hiện ghi nhận chiều vào 49 dòng / 5.057.026 DWT, chiều rời 48 dòng / 5.136.808 DWT. Bản trước tương ứng 40 / 4.485.675 và 41 / 4.589.377. Chỉ cập nhật từ nguồn và giữ ngày chốt; không sửa số cũ bằng nội suy.

Bình Dương đã lấy đủ hai resource vào/rời của ba ngày 26–28/10. Edition đến 28/10 gồm 666 ngày, 1.332 phản hồi, vẫn 8.342 dòng. Dòng vào cuối vẫn 24/08/2026, dòng rời cuối vẫn 15/07/2026. Không quan sát được thêm không có nghĩa không có hoạt động. Không sửa dữ liệu PDN hoặc lịch chạy tự động trong đợt này.

## Rà nguồn lịch sử

- [Lịch TP.HCM đang dùng](https://cangvuhanghaitphcm.gov.vn/index.aspx?page=shipschedule&cat=3146) trả HTTP 200 từ máy phát triển.
- [Lịch Vũng Tàu cũ](https://cangvuhanghaivungtau.gov.vn/Index.aspx?d=0&page=schedule&tab=khtdd) và hostname `www` tiếp tục lỗi DNS tại máy. Đây là lỗi truy cập trong môi trường kiểm tra, chưa chứng minh dữ liệu đã bị xóa.
- [Cổng tra cứu toàn quốc](https://hanghai.moc.gov.vn/tra-cuu-giay-phep) trả HTTP 200. Menu công khai chuyển được sang **kế hoạch điều động tàu** (`flagMenu=2`), khác phần giấy phép rời cảng (`flagMenu=1`). Danh sách hiện có tên tàu, quốc tịch, hô hiệu, đại lý, vị trí, ngày giờ và đường dẫn xem chứng từ; chưa có DWT ở bảng danh sách.
- Truy vấn lịch sử tháng 6/2025, Cảng vụ Vũng Tàu mã 12, từ phiên response đã lưu gặp HTTP 403. **Thử lại đúng phiên cookie mới đã thành công:** bộ lọc 01/06/2025 00:00–30/06/2025 23:59 được giữ trong form; trả 1.065 kết quả, trang đầu 20 dòng. Đây là hồ sơ toàn khu vực, không phải 1.065 lượt Gemalink. Đã có đầu mối lịch sử thay thế; chưa kiểm tra đủ phân trang hoặc chứng từ để nhập dữ liệu.

Chưa nhập hồ sơ toàn quốc hoặc lịch sử Vũng Tàu vào số lượt/DWT. Các khoảng thiếu lịch sử vẫn mở. Gemalink và Bình Dương tiếp tục hiện riêng để không che nhau trong monitor.

## Kiểm chứng

9 kiểm tra Vitest liên quan đối chiếu monthly ledger, nhật ký, hash/raw DWT, null và phạm vi tổng hợp đã qua. Typecheck web và `git diff --check` đã qua. Kết quả tại máy không thay bằng chứng deploy/readback; cron PDN và kết nối HCM cloud vẫn nằm ngoài phạm vi theo chỉ đạo người dùng.
