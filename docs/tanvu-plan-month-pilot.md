# Tân Vũ — nghiệm thu thử hai tháng lịch điều động

> **Đã mở rộng ngày 22/10/2026:** bản review mặc định hiện có **22 tháng từ 01/2025 đến 21/10/2026, parse 659/659 trang ngày**. Nội dung hai tháng bên dưới là kết quả pilot ban đầu. Xem [biên nhận toàn dải](catalog-review/tanvu-plan-month-history-20261022.json).

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

## Mở rộng tất cả tháng và tháng đang tích lũy

- Cùng lệnh collector nay mặc định thu từ `2025-01-01` đến ngày đã qua gần nhất của Việt Nam/nguồn; có `--from` và `--through`. Không đưa ngày hiện tại chưa hoàn tất hoặc ngày tương lai vào tổng. Chạy lại dùng raw cache đã xác minh hash, lấy mới bốn ngày cuối (ngày chốt và ba ngày trước đó) cùng những ngày lỗi.
- Đã parse **659/659 ngày**, gồm 12 tháng năm 2025 và 10 tháng năm 2026; tháng 10/2026 chốt ở 21/10. Không có ngày tải/parse lỗi sau kiểm tra cấu trúc mục trống; không thiếu DWT trên các dòng Tân Vũ được chọn.
- **MTD tàu rời 01–21/10/2026:** 51 dòng, **851.674 DWT**. Cùng phạm vi 01–21/10/2025: 56 dòng, **913.134 DWT**; YoY DWT **−6,73%**. Không dùng tổng cả tháng 10/2025 (1.348.837 DWT) để so với tháng đang tích lũy.
- **YTD tàu rời 01/01–21/10/2026:** 683 dòng, **11.499.305 DWT**. Cùng kỳ 2025: 665 dòng, **11.624.744 DWT**; YoY DWT **−1,08%**.
- MTD tàu vào: 49 dòng, **802.088 DWT**; cùng kỳ 46 dòng, **807.453 DWT**. Người xem chọn riêng chiều vào/rời; không cộng hai chiều.
- HTML có biểu đồ toàn dải, bảng 22 tháng, MTD/YTD, trạng thái tháng đang tích lũy, ngày chốt, đối chiếu cùng phạm vi và nhật ký mở theo tháng/ngày. Tổng tháng chính thức (`monthly_*`) của tháng 10 giữ null; số tích lũy dùng `period_*` và phạm vi ngày rõ. Số cùng kỳ 2024 giữ thiếu vì chưa thu thập năm 2024.
- Trang ngày **22/07/2025** có mục rời tồn tại nhưng rỗng; parser nhận diện đúng phần tử rỗng thay vì đọc nhầm bảng sau nó. Ghi `source_empty_sections: ["Roi"]`, không gọi đây là lỗi tải hoặc bằng chứng không có tàu thực tế. Thiếu phần tử, ngày sai hoặc nội dung bất thường vẫn fail closed.
- Raw mới được nén gzip theo SHA-256 để giảm dung lượng; HTML/receipt dùng dữ liệu nguồn, không hardcode số tổng vào app. Receipt mỗi lần chạy được giữ riêng. Bộ test Python nay **13/13 pass**, gồm MTD, kỳ so sánh cùng ngày, ngày thiếu, năm nhuận và mục nguồn rỗng. Đã kiểm tra chọn chiều và giá trị tháng 10 qua UI localhost.
- Đây vẫn là bản review local; chưa bổ sung database/API/scheduler hoặc thay dashboard staging. Nghiệm thu revision qua nhiều lần quan sát và ghép lượt qua nhiều ngày vẫn chưa hoàn tất.

## Kiểm tra tính động ngày 22/10/2026

- Collector không khóa ngày cuối ở tháng 10/2026: ngày chốt mặc định là ngày đã qua gần nhất theo cả đồng hồ Việt Nam và ngày server nguồn. Tháng mới được sinh từ dải ngày; `--through` chỉ khóa ngày khi người chạy chủ động truyền tham số.
- Đã xóa fallback `PERIODS = ('2025-09', '2026-09')` còn sót từ pilot; `summarize` tự lấy các tháng có trong dữ liệu nếu không truyền danh sách. Phạm vi bắt đầu mặc định 01/01/2025 là cấu hình backfill, không phải giới hạn tháng cuối. Nội dung phạm vi HTML cũng lấy từ receipt.
- Bộ test **16/16 pass**, thêm mô phỏng ngày 02/11/2026 tự xuất tháng 11 và ngày 02/01/2027 tự thu ngày 01/01/2027, nguồn trễ và cutoff truyền tay. Đây là test đồng hồ giả, không phải dữ liệu tương lai.
- **Chưa tự cập nhật đầu-cuối:** localhost chỉ phục vụ file `review.html` đã sinh; trang không gọi nguồn khi mở. Workflow `.github/workflows/php-newsletters.yml` chạy newsletter tấn hàng/TEU, không gọi collector lịch điều động này. Chưa có database/API/scheduler cho series lịch điều động, nên chưa cam kết web tự xuất tháng mới nếu không chạy collector.
- Để vận hành tự động còn cần nối collector vào lịch server, lưu dữ liệu lâu dài và cho dashboard đọc API; chạy lại collector thủ công hiện tái sinh tháng mới mà không sửa code hoặc nhập số vào HTML.
