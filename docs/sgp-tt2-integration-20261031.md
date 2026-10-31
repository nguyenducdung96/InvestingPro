# SGP Tân Thuận 2 — tích hợp lịch sử ngày 31/10/2026

Đã thêm monitor riêng `sg_tan_thuan_2`, chỉ nhận nhãn Cảng vụ **TAN.T.2**. SGP có sáu phạm vi; bảng miền Nam vẫn đúng một dòng SGP, cộng sáu phần trong vùng. K12 chưa được mở rộng.

## Căn cứ mapping

[SGP công bố chi nhánh Tân Thuận gồm Tân Thuận và Tân Thuận 2](https://saigonport.vn/cac-chi-nhanh-cong-ty-con/cang-tan-thuan/). [Danh mục Cục Hàng hải](https://vimawa.gov.vn/vi/noi-dung/ben-cang-tan-thuan-2) xác định đây là bến thuộc cảng biển TP.HCM, nằm trên sông Sài Gòn. Vị trí trên sông không làm bến này thành ICD/kho hoặc cảng thủy nội địa.

Thông báo 38/2025 giữ riêng khu nước TT2. Mẫu độc lập HAI PHAT 135 ngày 31/10: Hoa tiêu ghi TT2, LOA 120, mớn 8,2, ETA ghi chú 12:00; Cảng vụ ghi TAN.T.2, LOA 119,80, mớn 8,2, giờ 12:00. Đây là **suy luận mapping đã rà soát từ tên, nguồn doanh nghiệp và mẫu đối chiếu**, chưa phải xác nhận từng lượt thực tế hoặc lịch sử hiệu lực sở hữu. Chỉ có một mẫu tàu độc lập; không tuyên bố có thêm mẫu.

GRT Hoa tiêu 6.282 và DWT Cảng vụ 13.399 giữ riêng. Ô giờ kế hoạch Hoa tiêu trống; ETA trong ghi chú không được ghi đè thành giờ kế hoạch. Probe 31/10 không được ghép vào edition lịch sử đến 28/10.

## Dữ liệu và chống trùng

Đã kiểm tra SHA/reparse đủ 666 bảng từ 01/01/2025 đến 28/10/2026. Thêm **168 dòng vào / DWT ghi nhận 2.691.676** và **180 dòng rời / DWT ghi nhận 3.113.233**; không thiếu DWT trong 348 dòng này. DWT là tổng trọng tải trên các dòng kế hoạch, không phải sản lượng hàng hoặc số tàu duy nhất. 46 dòng điều chuyển không đi vào tổng vào/rời.

Giữ nguyên nội dung và thứ tự **10.455 dòng đã công bố** thuộc các asset cũ; nhật ký mới chỉ thêm TT2. Mỗi dòng mới đối chiếu raw/hash, ngày/chiều/tàu/giờ/DWT/tuyến. Không có khóa trùng trong tập lựa chọn hoặc raw row dùng lặp giữa các asset. Không nhập dòng Hoa tiêu; vì thế không nhân đôi một lượt giữa hai nguồn hoặc nhiều revision. K12, B.TT2, TTD và K17 không là alias của monitor này.

Cộng dồn/YoY tiếp tục dùng các tháng có dữ liệu ở cả hai năm và cutoff tương ứng; giữ số ghi nhận khi có khoảng thiếu, không biến ngày không quan sát thành 0, không chứng nhận actual/toàn phạm vi. Bộ API tổng hợp toàn khoảng vẫn giữ riêng. Các nguồn độc lập Bình Dương, PDN, Long Bình và Gemalink national không bị xuất lại.

[Receipt mapping, số liệu, hash từng ngày và bất biến](catalog-review/sgp-tt2-integration-20261031.json). Raw đầy đủ ở archive local; workflow Hoa tiêu chỉ lưu bằng chứng riêng, chưa tích hợp product và chưa được coi là archive vĩnh viễn.

## Kiểm tra và triển khai

Local: lint/typecheck đạt; 13 kiểm tra tập trung dữ liệu/YoY đạt; E2E desktop/mobile 4/4 đạt, gồm TT2 detail và đối chiếu tổng SGP theo tháng/quý hai chiều. Toàn bộ Vitest: 45 files / 187 kiểm tra đạt. CI/staging được ghi nhận bổ sung khi hoàn tất.

Lệnh rà live: `node scripts/verify-south-live.mjs`. Verifier đợi đúng ma trận TT2, không chỉ collection timestamp chung vốn không đổi khi mở rộng alias. Không nghiệm thu lịch cập nhật HCM cloud hoặc production qua lần tích hợp này.
