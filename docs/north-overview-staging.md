# Tổng quan cảng phía Bắc

Phạm vi yêu cầu ngày 24/10/2026: 9 mã PHP, DVP, VGR, VSC, GMD tại Hải Phòng, HAH, DXP, PSP và CQN. Người dùng đã chấp nhận chín dashboard mã, gồm xác nhận CQN trong hội thoại trước yêu cầu trang tổng quan.

Trang: `/industries/ports/north`. API công khai: `/api/v1/industries/ports/north`. Lối vào trên menu chính và trang danh mục cảng; danh mục hạ tầng hiện hữu vẫn có đường dẫn riêng.

## Hành vi

Bảng tám mã Hải Phòng và bảng CQN Quảng Ninh riêng. Mỗi dòng hiển thị phạm vi cảng/bến, lượt và DWT theo lịch, DWT cùng kỳ, YoY DWT, số ngày nguồn của hai kỳ, thời điểm cập nhật và chất lượng. Bộ lọc tháng/quý, thời kỳ từ 2025, chiều vào/rời và sắp xếp DWT/YoY trong từng nhóm. Link sang mã giữ chiều, loại kỳ và năm. Trang mã hiển thị các kỳ trong năm đó để xem sâu.

Mặc định tháng hiện tại đến hết ngày hôm qua theo giờ Việt Nam; kỳ đang tích lũy so đúng khoảng ngày cùng kỳ. Kỳ cũ so trọn kỳ, kể cả khác số ngày tháng Hai năm nhuận. Đổi tháng/quý quy đổi thời kỳ theo cùng năm. Chỉ số chưa đủ dữ liệu giữ null/dấu —; nền 0 không tính YoY. Mã thiếu nguồn vẫn được giữ trong danh sách.

14 phạm vi cảng/bến duy nhất: 13 Hải Phòng và một CQN Cái Lân (bốn cầu được theo dõi). VIP Greenport chỉ được đọc một lần, tái sử dụng cho VGR và VSC. Không có tổng DWT khu vực hoặc tổng cộng các dòng mã; không suy ra thị phần, sản lượng hàng hay tài chính hợp nhất. GMD chỉ gồm Nam Đình Vũ tại Hải Phòng. CQN gồm kế hoạch điều chuyển nội cảng nên không xếp hạng cùng chỉ tiêu Hải Phòng. Không coi lịch là actual.

## Dữ liệu và quyền truy cập

Tái sử dụng các đầu ngày công khai trong `port.php_plan_days`, bộ tính tháng/quý và phép gộp bến đã dùng ở trang mã. Với PHP/VSC, thiếu bến hoặc khác hash phiên bản cùng ngày giữ thiếu, không gộp các bản không đồng bộ. Không thay đổi lịch sử, nguồn, importer, RLS hoặc scheduler hiện hữu.

Ba cửa sổ truy vấn giới hạn theo ngày: kỳ theo dõi, cùng kỳ, ngày chốt. Mỗi cửa sổ chỉ đọc 14 asset được chốt, phân trang 1.000 dòng; hợp các cửa sổ theo asset/ngày để tránh cộng trùng khi chồng lấn. Không tải toàn lịch sử cho từng mã. `Promise.allSettled` giữ số liệu từ các cửa sổ đọc được và hiển thị cảnh báo nếu một cửa sổ lỗi.

Ngày cập nhật dùng thời điểm bản lịch thành công của ngày chốt, lấy mốc cũ nhất nếu nhiều bến. Thiếu bản ngày chốt hoặc quá 36 giờ có cảnh báo; giữ số kỳ cũ còn hợp lệ. Chi tiết độ phủ phân biệt thiếu ngày, thiếu DWT, nhóm cần đối chiếu, lỗi nguồn và nền so sánh. Không hiển thị khóa, thông tin riêng hoặc kỹ thuật importer trên luồng người dùng.

## Kiểm chứng

Kiểm thử domain bao gồm ngày chốt Việt Nam, kỳ tích lũy/trọn kỳ, tháng Hai nhuận, đổi tháng/quý cùng năm, 9 mã/14 asset, VIP dùng chung, CQN tách nhóm, source revision thiếu/khác, DWT null, nền 0, stale và sắp xếp unknown cuối nhóm. Repository kiểm tra phân trang và bộ lọc cửa sổ. E2E đối chiếu từng dòng với API tổng quan tương ứng của mã, bộ lọc, đổi dữ liệu không build lại, trạng thái thiếu, hai theme và không tràn ngang desktop/mobile.

Local: 122/122 tests TypeScript/database, 54/54 Playwright toàn bộ desktop/mobile, typecheck/lint và Next build đạt. Sau chỉnh trạng thái lỗi refresh và mock bộ lọc cửa sổ, chạy lại 4/4 Playwright tổng quan đạt. Kiểm chứng live được ghi riêng sau triển khai. Không tự coi trang tổng quan mới đã được người dùng nghiệm thu hoặc production đã được chấp nhận.
