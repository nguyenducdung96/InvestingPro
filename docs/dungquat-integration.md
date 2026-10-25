# GMD – Gemadept Dung Quất, kiểm tra ngày 25/10/2026

## Tiến độ đã đối chiếu

Working tree sạch khi bắt đầu. Mã nguồn và biên nhận NAP hiện có xác nhận cụm miền Trung tích hợp chuỗi CDN, QNP, CMP, NAP (4/5), còn GMD Dung Quất là trang chờ. Miền Bắc có các dashboard đã triển khai; lượt này không nghiệm thu lại toàn bộ dữ liệu miền Bắc. Biên nhận NAP ghi staging đã đối chiếu; đây là bằng chứng trong repo, chưa phải lần readback cloud mới của lượt Dung Quất.

## Nguồn và giới hạn thực tế

- Website doanh nghiệp: https://dqp.gemadept.com.vn/gioi-thieu/tong-quan/ ghi địa chỉ Bến số 1 – Cảng tổng hợp Dung Quất, xã Vạn Tường, Quảng Ngãi. Không suy tỷ lệ sở hữu hoặc ngày hiệu lực từ địa chỉ. Không thay đổi catalog đã duyệt hay quyền nguồn.
- Địa chỉ Cảng vụ hoạt động là **HTTP** http://cangvuhanghaiqni.gov.vn/; HTTPS không tải được trong lần khảo sát. Tên miền `cangvuhanghaiquangngai.gov.vn` trong ghi chú cũ không phải endpoint đang dùng.
- Hai liên kết công khai `?lk=0206` và `?lk=6201` đều trả “Tin mục này đang được cập nhật”. Chưa có bản tin hay phân trang lịch sử trên hai mục này.
- Trang `tivi.aspx` là bảng **vị trí** với 69 dòng tàu, gồm ETA, khu neo và nhiều đơn vị. Một dòng có cột VỊ TRÍ = GMD: HJ TIANHE, DWT 60.434, GT 49.098, thời gian nguyên văn `11/6/2026 18:00`. Một dòng khác có đại lý GEMADEPT DUNG QUẤT nhưng vị trí ETA, bị loại. Không coi đại lý là bến.
- Menu, page sitemap và tìm kiếm công khai của website DQP chưa cho thấy chuỗi lịch tàu phù hợp. Đây là kết quả khảo sát có giới hạn, không khẳng định nguồn không tồn tại ở nơi khác. Không dùng lịch shipping, số liệu toàn vùng hoặc lịch Nam Đình Vũ/Gemalink thay thế.

## Phần đã triển khai local

Trang `/companies/GMD?central_asset=gemadept_dung_quat` giữ phạm vi riêng, bổ sung bảng quan sát vị trí, DWT, nguyên văn thời gian và disclosure chứa nguồn/hash/dòng/giới hạn. API `/api/v1/companies/GMD/dungquat` trả `authority_position_snapshot`, không tạo sự kiện vào/ra; metrics arrivals/departures/DWT lũy kế/YoY đều null. Tổng quan miền Trung vẫn 4/5 chuỗi, GMD không có metric để cộng vào kỳ đầu tư.

Collector chuẩn thư viện Python: `python scripts/collect-dungquat-snapshot.py`. Kiểm tra đủ 11 cột và hàng tàu, chỉ chọn nhãn GMD chính xác ở cột vị trí, GT/DWT tách riêng, giữ raw và thời gian nguyên văn. Trọng tải thiếu/không hợp lệ/0 là null. Lỗi tải/schema không ghi đè bản export đã chấp nhận; tiến trình trả lỗi. Archive `.local/dungquat/archive/<sha256>.html`, export `packages/modules/port/src/dungquat-snapshot-data.ts`. Chưa thiết lập hoặc nghiệm thu refresh định kỳ.

Hợp đồng nguồn: `python scripts/test-dungquat-snapshot.py` dùng đoạn ba dòng thật (GMD, ETA có đại lý Gemadept, Hào Hưng) kiểm tra loại sai phạm vi, phân biệt GT/DWT, schema drift và không sinh sự kiện. Playwright desktop/mobile kiểm tra trang Dung Quất, API, liên kết miền Trung, theme và tràn ngang.

## Còn thiếu để hoàn thành dashboard đầu tư

Cần nguồn lịch sử có ngày/giờ đến/rời hoặc điều động, DWT và bến Dung Quất rõ ràng, đủ dữ liệu hai kỳ để tính YoY. Khi có số đã ghi nhận sẽ hiển thị tháng/quý/lũy kế theo AGENTS.md dù thiếu một số ngày hoặc trọng tải. Hiện không có quan sát sự kiện nên không dựng số 0 hay biểu đồ từ snapshot.

Chưa triển khai cloud cho thay đổi này; chưa nghiệm thu production, quyền tái phát hành nguồn, độ phủ đầy đủ hoặc cron thực. Chi tiết hash và kiểm chứng local ở `catalog-review/dungquat-source-review-20261025.json`.

## Kiểm chứng thay đổi

5 hợp đồng Python, 12 Vitest liên quan NAP/miền Trung, typecheck, ESLint các file thay đổi và Next production build đạt. 4 Playwright đạt cho Dung Quất và CDN/miền Trung trên desktop/mobile, gồm API null metrics, liên kết đúng phạm vi, hai theme và không tràn ngang. Đã xem ảnh mobile. Lần Playwright đầu thiếu bước tạo catalog fixture GMD nên trả 404; đã thêm khởi tạo fixture đúng như các test doanh nghiệp hiện có và chạy lại đạt. Không thay đổi logic production để né lỗi fixture.
