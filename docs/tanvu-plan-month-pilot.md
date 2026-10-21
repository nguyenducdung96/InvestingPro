# Tân Vũ — nghiệm thu thử hai tháng lịch điều động

Ngày thực hiện: 22/10/2026, giờ Việt Nam. Phạm vi: Tân Vũ, tháng 9/2025 và 9/2026; chưa triển khai connector mới lên staging.

## Đầu ra

- Collector: `python scripts/collect-tanvu-plan-months.py`.
- Raw HTML theo SHA-256, receipt và bản review tại `.local/php-slice2a/tanvu-month-pilot/`. Mỗi lần chạy mới giữ receipt riêng và tái sinh `review.html` từ dữ liệu thu thập, không đặt các giá trị mẫu vào app.
- Biên nhận gọn, không chứa raw HTML: [tanvu-plan-month-pilot-20261022.json](catalog-review/tanvu-plan-month-pilot-20261022.json).
- Review HTML hiển thị lượt và DWT hai chiều riêng, YoY, độ phủ, DWT thiếu và mở từng ngày xem dòng gốc/nguồn/hash. Có thể mở file trực tiếp hoặc phục vụ qua localhost.

## Kết quả nguồn

Đã tải và parse **30/30 ngày mỗi kỳ**, tổng 60 ngày. Bộ lọc chính xác: bảng vào có `Đến = TAN VU`; bảng rời có `Từ = TAN VU`. Di chuyển nội cảng/qua luồng không cộng vào hai tổng.

- Tháng 9/2025: **63 dòng vào, 1.116.790 DWT**; **65 dòng rời, 1.071.163 DWT**.
- Tháng 9/2026: **63 dòng vào, 983.313 DWT**; **66 dòng rời, 968.084 DWT**.
- YoY DWT vào **−11,95%**, DWT rời **−9,62%**. Lượt vào không đổi; lượt rời **+1,54%**.
- Không thiếu DWT ở các dòng đã chọn. Không có exact duplicate trong ngày; không có nhóm cùng tàu/chiều/tuyến nhưng khác giờ trong ngày theo kiểm tra hiện tại.
- Hai tổng DWT **rời** trùng hai điểm tháng 9 trong ảnh Tân Vũ người dùng gửi. Đây là kiểm tra chéo sau tính, không lấy ảnh làm feed. Chưa chứng minh toàn bộ thuật toán website tham khảo.

## Quy tắc và giới hạn

Nguồn là `https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx`. Collector hiệu chuẩn ngày server qua `d=0`, tính offset cho ngày yêu cầu và kiểm tra tiêu đề nội dung trước parse. URL có `d` không phải permalink ngày tuyệt đối; receipt lưu ngày/hash/thời điểm thu thập.

Nguồn ghi “Kế hoạch điều động”, nên nhãn chỉ tiêu là **theo lịch điều động Cảng vụ**. Không đổi thành actual, không đổi tổng DWT thiết kế thành tấn hàng, không cộng vào+rời thành lượt ghé. Không suy hãng tàu từ đại lý. Đủ trang ngày không chứng minh lịch nguồn đã bao gồm mọi chuyến thực tế.

Khóa chống trùng trong ngày gồm ngày, chiều, tên tàu, giờ, từ/đến. Exact duplicate bị loại; cùng khóa nhưng nội dung mâu thuẫn làm ngày lỗi. Cùng tàu/tuyến khác giờ được đánh dấu cần đối chiếu, không tự gộp. Chưa nghiệm thu ghép chuyến qua nhiều ngày hoặc theo dõi một bản lịch bị sửa qua nhiều lần thu thập; `revision_window_verified = false`.

Ngày lỗi không thành zero; thiếu bất kỳ ngày nào không xuất tổng tháng/YoY đầy đủ. DWT thiếu vẫn giữ số dòng, không xuất tổng DWT tháng. Collector trả exit 1 nếu có ngày tải/parse lỗi và giữ receipt để xử lý.

## Xác minh và bước tiếp theo

- `python scripts/test-tanvu-plan-months.py`: **7/7 pass**, gồm chiều/bến, số DWT, chống trùng/mâu thuẫn, thay giờ, ngày thiếu, DWT thiếu và ngày báo cáo sai.
- Đã parse lại 60 raw capture với kiểm tra bộ cột chặt; tổng không thay đổi. Python compile và git diff check đạt. Bản HTML đã kiểm tra qua trình duyệt; không dùng kết quả này thay E2E app hay cloud acceptance.
- Tiếp theo: đưa model lịch công bố riêng vào database/API/UI của PHP, dùng **chiều rời nhất quán** cho chuỗi so sánh, kèm lựa chọn chiều vào; thêm collector hằng ngày và backfill bản sửa. Nghiệm thu thay giờ/đổi ngày trước khi gọi refresh tự động hoàn chỉnh. Sau đó mới backfill đủ dải tháng để mở quý/YTD; hai tháng 9 chưa tạo được số quý hoặc YTD.
