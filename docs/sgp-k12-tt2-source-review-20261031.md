# SGP K12 / Tân Thuận 2 — rà nguồn ngày 31/10/2026

Cập nhật tiếp nối: [K12 được chọn riêng từng dòng từ Cảng vụ](sgp-k12-row-integration-20261031.md); không mở alias toàn cục hoặc cộng Hoa tiêu vào tổng. Các quyết định chưa tích hợp K12 bên dưới là biên bản phase trước.

## Kết luận và quyết định

Đã xác nhận **cầu K12 và cầu Tân Thuận 2 thuộc phạm vi cảng biển SGP**, đồng thời tìm được nguồn kế hoạch Hoa tiêu có nhãn riêng `K12` / `TT2`. Nguồn mới phù hợp để chuẩn bị collector lưu kế hoạch riêng từ thời điểm hiện tại. **Chưa thêm alias hoặc dữ liệu vào dashboard/tổng SGP**, vì chưa nghiệm thu phân biệt từng dòng, loại trùng giữa nguồn và chuỗi lịch sử DWT.

Không thiếu DWT không có nghĩa phải loại bỏ số dòng kế hoạch hữu ích: có thể giữ số dòng và GRT nguồn ghi nhận ở một monitor riêng, DWT thiếu vẫn null. Tuy nhiên, không đổi GRT thành DWT hoặc cộng cả nguồn Hoa tiêu và Cảng vụ khi chưa xử lý trùng cùng movement.

[Receipt đầy đủ](catalog-review/sgp-k12-tt2-source-review-20261031.json) ghi URL, thời điểm tải, hash, mẫu dòng và 666 hash bảng ngày. Raw/PDF/HTML giữ tại `.local/sgp-k12-tt2/`, không đi theo Git; cần khôi phục đúng URL/hash khi chuyển máy.

## 1. K12: xác minh được cầu cảng, chưa phân bổ toàn bộ lịch sử

- [SGP xác nhận tàu cập cầu K12 thuộc Cảng Tân Thuận ngày 10/02/2024](https://saigonport.vn/chuyen-tau-xong-dat-dau-nam-tai-cang-tan-thuan-cang-sai-gon/). Tờ trình đầu tư **493/TTr-HĐQT ngày 23/04/2026**, trang PDF 9, tiếp tục liệt kê K12 và Tân Thuận 2 trong nhóm năm cầu cảng Tân Thuận cần kiểm định. Đây là chứng cứ nhận diện tài sản, không phải chuỗi lượt tàu.
- Danh mục bản đồ có **hai K12**: cầu Sài Gòn tại khoảng `10.758788, 106.728334` và khu neo Vũng Tàu tại `10.220278, 107.053056`. ID của API chính thức hiện tại là **52 / 403**; bridge cũ là **99 / 573**. ID phải gắn namespace/phiên bản nguồn, không sao chép giữa hai API.
- Đã xác minh hash và parse lại toàn bộ **666 bảng ngày, 01/01/2025–28/10/2026**, không lỗi nguồn trong edition lưu. Nhãn K12 có **228 dòng vào + 224 dòng rời = 452 dòng kế hoạch ứng viên**, thêm **43 dòng điều chuyển** giữ riêng. Đây chưa phải 452 lượt SGP đã được quy thuộc.
- Trong các dòng trực tiếp có tuyến Sài Gòn–Vũng Tàu, Soài Rạp, Sông Dừa, cả Vũng Tàu–Thị Vải và ô tuyến trống. Ví dụ BELLIGHT ngày 30/07/2025 có K12 / Vũng Tàu–Thị Vải; BIEN DONG NAVIGATOR ngày 30/11/2025 cũng có tuyến này. Tuyến có thể ghi sai hoặc mang nghĩa hành trình rộng hơn: không tự phân bổ theo riêng tuyến, tên tàu, DWT hoặc kích thước.

**Quyết định:** giữ 452 dòng ngoài tổng SGP cho đến khi có bằng chứng gắn từng movement với cầu cảng. Không suy vào/rời cảng từ 43 điều chuyển nội cảng.

## 2. TT2: có nguồn mới, khác TTD và B.TT2

[Danh mục Cục Hàng hải — Bến cảng Tân Thuận 2](https://vimawa.gov.vn/vi/noi-dung/ben-cang-tan-thuan-2) ghi địa chỉ 242 Bùi Văn Ba, đơn vị khai thác chi nhánh Cảng Sài Gòn và cầu dài 222 m. Tên pháp nhân trong danh mục dùng hình thức cũ; không dùng trang này để chứng nhận lịch sử sở hữu từng ngày. [SGP công bố năm 2019](https://saigonport.vn/cang-tan-thuan-huong-den-cung-cap-dich-vu-tot-nhat-cho-khach-hang/) cho biết TT2 được hợp nhất vào đơn vị khai thác Tân Thuận từ 01/01/2019; tài liệu đầu tư 2026 củng cố phạm vi hiện hành.

Thông báo hàng hải **38/TBHH-TCTBĐATHHMN, HCM-05-2025, ngày 14/02/2025**, trang PDF 2, nêu riêng khu nước trước **Bến cảng Tân Thuận 2** bằng bốn điểm WGS-84; đã xem bản scan gốc. Văn bản đề cập đề nghị 106/2025/CSG của SGP. Tọa độ khảo sát là chứng cứ vị trí khu nước, không phải vị trí tàu hoặc thông lượng.

Các nhãn cần giữ riêng:

- **`TTD`:** [Cục Hàng hải có hồ sơ Bến cảng Tân Thuận Đông riêng](https://vimawa.gov.vn/vi/noi-dung/ben-cang-tan-thuan-dong), đơn vị khai thác và cầu 145 m khác TT2. Báo cáo SGP có nhắc thuê bãi Tân Thuận Đông; thuê bãi không đủ để quy thuộc cả phạm vi tàu của bến cho SGP.
- **`B.TT2`:** danh mục API chính thức ghi **Phao**, thuộc Bến cảng Sài Gòn, tọa độ `10.755003, 106.745760`; không phải alias cho cầu TT2. Bộ lịch sử có 30 dòng vào, 32 dòng rời và 12 điều chuyển tại nhãn này; chưa nhập các dòng đó vào TT2.
- **`K17`:** [Cục Hàng hải xác nhận thuộc Bến cảng Bông Sen](https://vimawa.gov.vn/vi/noi-dung/ben-cang-bong-sen); không lấy làm TT2.

Trong 666 bảng Cảng vụ đã rà không có nhãn chính xác `TT2`. Đây là kết quả tìm nhãn trong edition này, không phải kết luận TT2 không hoạt động.

## 3. Nguồn Hoa tiêu có thể dùng cho bước triển khai kế tiếp

[Hoa tiêu hàng hải miền Nam — kế hoạch khu vực TP.HCM](https://www.pilotcosouth.vn/ke-hoach-dieu-dong-tau/hoa-tieu-hang-hai-mien-nam-khu-vuc-tphcm-2) là nguồn doanh nghiệp trực tiếp cung cấp dịch vụ. Bản HTML đã lưu có hai ngày **31/10 và 30/10/2026**, mỗi ngày tách vào/rời/điều chuyển. `custom.js` chỉ đổi giữa hai tab đã nhúng; chưa tìm được điều khiển truy vấn lịch sử trong phần giao diện/script đã rà.

Mẫu kế hoạch ngày 31/10:

- `NEWSUN GREEN 03`, vào K12: **GRT 3.985**, giờ cano `23:45`, ô giờ kế hoạch trống, ghi chú `Eta 0000`.
- Cùng tàu, rời K12: **GRT 3.985**, giờ `22:00`; không gộp chiều vào và rời thành một dòng.
- `HAI PHAT 135`, vào TT2: **GRT 6.282**, ô giờ trống, ghi chú `Eta 1200 TÀU CHẬM`.

Các mẫu là **kế hoạch công bố**, bao gồm lịch còn ở tương lai khi thu thập. Không xác nhận đã thực hiện. Nguồn có **GRT**, không có cột DWT; giữ DWT null. Giờ cano, giờ hoa tiêu/giờ kế hoạch và ETA trong ghi chú không được đổi lẫn nhau hoặc tự điền `00:00`. Ghi chú bỏ chuyến, lùi ngày, đổi giờ phải lưu và xử lý revision.

PDF lịch sử được chỉ mục trên domain cũ `www.pilotco1.com` bị chặn bởi kiểm chứng chứng thư; thử đúng đường dẫn tài liệu đó trên domain mới trả 404. Không bỏ qua TLS, không suy một mẫu 404 thành toàn bộ lịch sử không tồn tại. Chưa backfill hoặc quét hàng loạt.

## 4. Kiểm chứng kỹ thuật và giới hạn

- Công cụ đọc lại: `python scripts/audit-sgp-k12-tt2.py`. Chạy thực tế đã kiểm tra hash raw, parse khớp cache cho đủ 666 ngày, đếm các nhóm riêng và ghi kết quả vào `.local/sgp-k12-tt2/verified-archive-audit.json`. Thiếu cache/hash sai sẽ dừng; script không tải mạng hoặc export dữ liệu ứng dụng.
- Frontend bản đồ Cảng vụ hiện gọi **`https://apikehoach.cangvuhanghaitphcm.gov.vn:5000/api/cangvu/getDSTau4`**, thay cho bridge cũ. Đã tải và hash frontend để xác minh đường dẫn, gọi đọc một ngày tại máy bằng curl/Schannel với kiểm chứng chứng thư bình thường. Python ở máy gặp lỗi chuỗi CA; không tắt kiểm chứng TLS.
- Mẫu API chính thức yêu cầu 29/10 trả **563 bản ghi, toàn bộ `source_type=NEO`**. Chỉ dùng nhận diện danh mục/snapshot, không đổi ngày đến/rời dự kiến thành movement đã xác minh. Điểm bản đồ là vị trí cơ sở/grid hiển thị, không phải bằng chứng AIS độc lập.
- Truy cập local một mẫu không chứng minh HCM đã truy cập được từ cloud, không phải nghiệm thu cron hoặc production. Không mở lại campaign HCM connectivity, PDN cron, Long Bình Tân hoặc phạm vi kho/bãi.
- Không sửa alias, API/UI, ledger hay edition công bố của SGP/GMD/PDN. Không cộng nhóm issuer chồng lấn hoặc các nhãn ứng viên vào tổng vùng.

## Bước tiếp theo được đề xuất

Chuẩn bị **collector Hoa tiêu độc lập, chỉ lưu raw/parse để review trước**: lưu cả hai tab theo ngày kế hoạch và từng revision/hash, tách vào/rời/nội cảng, DWT null và GRT riêng, giữ giờ gốc và ghi chú hủy/lùi/đổi giờ. Khi có mẫu lặp đủ để đối chiếu từng dòng với Cảng vụ, mới chốt alias K12/TT2 và chống trùng giữa nguồn. Nếu chưa giải được overlap, giữ monitor riêng ở chi tiết SGP, chưa cộng vào tổng issuer/vùng.

Không coi việc tìm được nguồn là đã tích hợp dashboard hoặc đã bù lịch sử 2025–2026. Đợt này kết thúc ở hồ sơ rà nguồn.
