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

### Đã xác minh một chứng từ Gemalink trước tháng 8/2025

Truy vấn thêm `shipName=CMA CGM`, giữ mã Vũng Tàu 12 và tháng 6/2025, trả 19 kết quả trên một trang. Đã kiểm tra các option/bộ lọc được giữ trong HTML phản hồi. Danh sách để trống cột bến cho những dòng này, nên không thể loại bỏ chúng chỉ vì cột đó trống hoặc gán bến từ tên hãng.

PDF gốc [CMA CGM VISBY](https://hanghai.moc.gov.vn/documents/10180/34181393/giao_thong46026290085730189.pdf), SHA-256 `83474f32084181daf8dc1b3d3fa559a9069f7110db66e58270146d8596e8e020a`, 341.077 bytes, đã trích text và render kiểm tra trực quan trang 1:

- Cơ quan: Cảng vụ Hàng hải Vũng Tàu; loại: **Kế hoạch điều động tàu thuyền**.
- Ngày ban hành/ký 28/06/2025; thời gian dự kiến trong dòng là **29/06/2025 08:30**. Ngày 28/6 ở danh sách không được dùng làm ngày sự kiện.
- Tàu CMA CGM VISBY; DWT **31.285**; LOA 204,29 m; mớn nước 9,7 m.
- Từ SINGAPORE đến **BẾN CẢNG CÁI MÉP GEMADEPT-TERMINAL LINK / CAI MEP GEMADEPT-TERMINAL LINK**: có căn cứ ghép phạm vi Gemalink, chiều vào theo kế hoạch, không phải actual.

Nguồn thay thế **có dữ liệu lịch sử Gemalink**, thay cho kết luận trước đó chỉ tìm thấy nguồn lịch sử chưa biết có dùng được hay không. Tuy vậy chưa nhập mẫu đơn lẻ hoặc 19 hồ sơ hãng tàu vào KPI: phải đọc tất cả tài liệu phù hợp, dùng giờ trong PDF, phân biệt vào/rời/di chuyển, xử lý sửa đổi và trùng hồ sơ. Hai dòng CMA CGM VISBY có cùng thông tin trong danh sách cho thấy cần kiểm tra tài liệu trước khi tính số lượt. Cần mở rộng cửa sổ ngày công bố để không bỏ lịch dự kiến nằm sát biên tháng, đồng thời tránh đếm lại phần trùng với bảng TP.HCM đã tích hợp.

Đã mở chứng từ của cả hai dòng CMA CGM VISBY: URL PDF thứ hai có tên `giao_thong460026288744921697.pdf`, khác URL thứ nhất, nhưng **bytes và SHA-256 trùng hoàn toàn**. Hai dòng danh sách này chỉ là một tài liệu duy nhất, không tính thành hai lượt. Khóa URL hoặc STT danh sách không đủ để loại trùng.

Các khoảng thiếu lịch sử trên dashboard vẫn mở. Gemalink và Bình Dương tiếp tục hiện riêng để không che nhau trong monitor. Bước triển khai tiếp theo là collector/form phiên mới → archive PDF theo hash → parser bảng PDF và hàng đợi review → dedup/revisions → đối chiếu tháng → xuất edition. Không dùng giấy phép rời cảng để thay chứng từ kế hoạch.

## Kiểm chứng

9 kiểm tra Vitest liên quan đối chiếu monthly ledger, nhật ký, hash/raw DWT, null và phạm vi tổng hợp đã qua. Typecheck web và `git diff --check` đã qua. Kết quả tại máy không thay bằng chứng deploy/readback; cron PDN và kết nối HCM cloud vẫn nằm ngoài phạm vi theo chỉ đạo người dùng.

Commit dữ liệu `99b51b5` đã push; Cloudflare Workers Builds thành công. Verifier staging đối chiếu đúng edition đến 28/10: 22 tháng × 10 phạm vi HCM × hai chiều, tổng SGP, tổng quan miền Nam và Bình Dương riêng đều qua. Đây là manual deployment/readback, không phải nghiệm thu cron. Biên nhận tại `catalog-review/south-live-readback-20261029.json` và `catalog-review/binhduong-live-readback-20261029.json`.
