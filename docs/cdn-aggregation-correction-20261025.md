# CDN: sửa việc làm trống tháng và bỏ sót DWT đã có

Ngày 25/10/2026, tiếp tục đối chiếu theo link và ảnh người dùng gửi ngày 24/10. Kết luận trước rằng CDN không có chuỗi DWT dùng để vẽ các tháng là quá rộng: **lịch có dòng DWT hợp lệ ở tất cả 22 kỳ tháng đang theo dõi**. Các số tổng đủ điều kiện vẫn khác số đã ghi nhận.

## Bằng chứng trực tiếp

Đã mở bằng browser đúng [lịch Cảng vụ Đà Nẵng](http://tttb.cangvuhanghaidanang.gov.vn/public-kh#/tra-cuu/ke_hoach/0/0/KeHoachDieuDongTau2). UI có ba mục đến, rời, di chuyển. Đã đối chiếu thêm tài nguyên public của chế độ theo khu vực do JS của chính giao diện sử dụng: `vma_itinerary_vma_itineraryschedule_vma_scheduleshifting`. Không cộng `noticeShipType=4` (di chuyển) vào vào/rời. Cùng ngày 23/10/2026, dòng INSIGHT đến vẫn có DWT 0, rời có 21.719,2; đổi chế độ giao diện không tự bổ sung DWT thiếu.

Ảnh người dùng cung cấp có các điểm khớp phần nguyên với cộng DWT dương từ nguồn Tiên Sa: 01/2026 = 2.830.014,96; 04/2026 = 2.803.136,32; 04/2025 = 2.408.819,96; 05/2025 = 2.616.963,94. Đây là đối chiếu một số điểm, không chứng minh phương pháp nội bộ của website tham khảo, nguồn của mọi điểm hoặc tổng của họ đã đầy đủ. Không dùng dữ liệu website tham khảo làm feed; web fetch trang đó hiện trả 403.

## Hai lỗi tổng hợp cần tách

1. Quy tắc “một dòng thiếu DWT → tổng DWT ngày null → tổng tháng null” là tiêu chuẩn cho **tổng đủ dữ liệu**, nhưng chỉ vẽ chỉ tiêu đó đã che toàn bộ phần DWT vẫn có trong tháng. Cột trống không có nghĩa tháng không có lịch.
2. `known_dwt` trước đây cộng các **tổng ngày** còn khác null. Vì vậy khi một ngày có một dòng thiếu DWT, cả DWT hợp lệ của các tàu khác trong ngày cũng bị bỏ khỏi “đã ghi nhận”. Ví dụ 26/01/2026 có QUANG ANH 18 DWT 0, nhưng các tàu còn lại có 155.179,38 DWT. Số đã ghi nhận tháng 01/2026 bị tính 2.674.835,58 thay vì 2.830.014,96.

Đây là lỗi của phép tổng hợp/hiển thị của dự án, không được quy toàn bộ cho nguồn thiếu tháng.

## Sửa đã triển khai

Migration `202610250001_cdn_observed_dwt.sql` bổ sung hai subtotal CDN ở đầu ngày, được tính từ các dòng của **phiên bản nguồn bất biến đang active**. Trigger cập nhật metadata khi importer tạo/cập nhật head, kể cả refresh, replay hoặc lỗi nguồn giữ bản cũ; không mở public quyền đọc bảng phiên bản hoặc cho phép frontend tự ghi tổng. Backfill chỉ tính lại metadata Tiên Sa, không sửa raw, DWT từng tàu, hash, parser, thời điểm thu hoặc tổng đủ điều kiện của Hải Phòng.

`known_dwt` kỳ CDN nay cộng phần DWT từng dòng đã biết, kể cả các ngày thiếu trọng tải ở dòng khác. `observed_dwt` chỉ có số nếu có dòng với DWT hoặc bản lịch chứng minh không có dòng trong phạm vi; kỳ không có báo cáo hoặc toàn bộ dòng đều thiếu DWT không bị biến thành số 0.

Trang CDN có thêm lựa chọn **DWT đã ghi nhận** (`plan_metric=observed_dwt`) cho biểu đồ tháng/quý/cùng kỳ/90 ngày và bảng. Nhãn và cảnh báo nêu đây là phần đã biết, có thể thấp hơn tổng đầy đủ; cột cùng kỳ có cùng nghĩa. Chỉ tiêu **DWT đủ dữ liệu** (`plan_metric=dwt`) và YoY vẫn kiểm tra độ phủ chặt. Mặc định lượt được giữ. Không tự điền DWT thiếu, lấy GT thay DWT, đổi kế hoạch thành actual hoặc thêm Sơn Trà vào CDN.

Ví dụ readback database sau sửa: 01/2026 = 2.830.014,96; 04/2026 = 2.803.136,32; 04/2025 = 2.408.819,96; 05/2025 = 2.616.963,94. Các tháng vẫn có DWT thiếu nên tổng đủ điều kiện tương ứng giữ null. Phần đã ghi nhận hiển thị được mà không giả định phần thiếu bằng 0.

## Những chênh lệch còn phải giữ rõ

Ba ngày chưa có head đủ điều kiện: 20/06/2025 và 03/08/2026 có hai mã hành trình khác nhau nhưng trùng khóa tên/giờ/bến và khác DWT ở chiều vào; 22/10/2025 cả hai mục nguồn trả rỗng. Dữ liệu theo khu vực xác nhận vẫn có các dòng hợp lệ ở hai ngày đầu. Collector hiện giữ cả ngày thiếu thay vì chọn một dòng tùy ý; do đó phần đã ghi nhận của các kỳ này vẫn có thể thấp hơn cộng trực tiếp mọi dòng nguồn. Đây là giới hạn xử lý xung đột cần tách theo chiều/bản ghi trong nhánh tiếp theo, không phải bằng chứng thiếu cả tháng.

Raw và head còn khác ở một số nhóm trùng bị khử theo khóa chuẩn; chưa đối chiếu xong mọi điểm với ảnh. Không tuyên bố mọi tháng sẽ bằng website tham khảo. Cùng kỳ 2024 chưa backfill, không suy YoY 2025 từ 0. Ngày chốt đổi sang 24/10 theo giờ Việt Nam khi sang 25/10; cần tác vụ thu ngày 24 trước khi coi MTD mới đủ ngày.

Phạm vi sở hữu Sơn Trà được rà trong [hồ sơ nguồn](cdn-official-sources-recheck.md), độc lập với sửa tổng hợp này. Không dùng số giống ảnh làm bằng chứng sở hữu.
