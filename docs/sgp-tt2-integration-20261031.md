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

Local: lint/typecheck đạt; 13 kiểm tra tập trung dữ liệu/YoY đạt; E2E tập trung desktop/mobile 6/6 đạt, gồm TT2 detail, đủ bảy lựa chọn SGP (tổng + sáu monitor) và đối chiếu tổng SGP theo tháng/quý hai chiều. CI lần đầu phát hiện kỳ vọng cũ còn sáu lựa chọn; đã sửa kiểm tra và chạy lại, không đổi dữ liệu để đáp ứng test cũ. Toàn bộ Vitest: 45 files / 187 kiểm tra đạt; toàn bộ E2E local desktop/mobile: 76/76 đạt (3,4 phút). CI/staging đã nghiệm thu theo biên bản dưới.

Lệnh rà live: `node scripts/verify-south-live.mjs`. Verifier đợi đúng ma trận TT2, không chỉ collection timestamp chung vốn không đổi khi mở rộng alias. Không nghiệm thu lịch cập nhật HCM cloud hoặc production qua lần tích hợp này.

## Biên bản phát hành cuối

Bản ứng dụng cuối **a42c996** trên `codex/cloudflare-next-compat`: [Quality 41174571970](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41174571970) **success ở attempt 2**, gồm lint/typecheck/Vitest/Python/E2E/Next/OpenNext build. Attempt 1 runner nhận shutdown trong E2E; chạy lại cùng SHA, không sửa ứng dụng theo lỗi hạ tầng. Cloudflare build `c0fd6d31-8b72-40f8-8a0e-1b0b94cea27f` **success**. API live khớp 22 tháng hai chiều cho 11 asset theo dõi, tổng sáu phạm vi SGP và dòng miền Nam; bốn ngày mẫu nhật ký khớp raw/hash. UI live desktop/mobile chọn TT2 đúng, một dòng SGP, không tràn ngang. Bản test/evidence a42c996 có cây ứng dụng/packages/scripts giống bản UI đã kiểm chứng cdbd601; API/data không đổi sau readback 262fa2f.

Không dùng kết quả tích hợp lịch sử này để nghiệm thu HCM cloud, schedule refresh hoặc production. Dữ liệu TT2 vẫn đến 28/10/2026; không đưa probe 31/10 hoặc Hoa tiêu vào tổng. K12 tiếp tục cần quy thuộc từng dòng cầu/khu neo; không mở rộng alias bằng tên gần giống.
