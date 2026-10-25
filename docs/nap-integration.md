# NAP — hoạt động tàu Cửa Lò và Bến Thủy, 25/10/2026

Dashboard `/companies/NAP#vessel-plans`, API `/api/v1/companies/NAP/activity` (alias tương thích `/plans`) có tổng quan hai cảng, chọn Cửa Lò/Bến Thủy, đến/rời, lượt/DWT, tháng/quý/năm, cùng kỳ, YoY DWT, lũy kế đến cutoff, 90 ngày và nhật ký ngày có workbook/SHA-256/dòng/cột nguồn. Bảng miền Trung dùng cùng hàm và không tạo tổng chồng lấn.

## Nguồn và phạm vi

Nguồn chính: https://cangvuhanghainghean.gov.vn/index.aspx?page=news&cat=2017 . Đây là báo cáo hoạt động tàu thuyền, không phải lấy số dòng snapshot làm số lượt và không trộn PDF kế hoạch điều động. Ngữ nghĩa `authority_reported_terminal_activity`, `movement_scope=terminal`, `actual_verified=false` vì chưa đối chiếu độc lập từng lượt. Chỉ ngày đến/rời do báo cáo nguồn nêu; không suy ngày rời khi tàu biến mất.

Mỗi workbook có bảng riêng ghi rõ Cảng Nghệ Tĩnh tại Xí nghiệp xếp dỡ Cửa Lò và Cảng Bến Thủy. Chỉ hai bảng này được ghép. Bến 5 của Công ty TNHH Cảng Cửa Lò, Vissai, DKC, khu neo chung, công trình, xăng dầu Hưng Hòa và các bến Hà Tĩnh giữ ngoài NAP. Tàu chờ trong đúng bảng của NAP được giữ theo phân bổ nguồn; không gọi đó là lượt cập từng cầu. Danh mục cầu doanh nghiệp tại https://nghetinhport.vn/nguon-luc-khai-thac/cau-ben-va-luong-hang-hai/ được đọc qua web tool; chưa lưu raw HTML vì truy cập tải trực tiếp trả 403. Bằng chứng XLSX được lưu theo hash. Xem `catalog-review/nap-port-scope-20261025.json`.

Không thay đổi catalog/RLS, ngày hiệu lực hoặc trạng thái quyền nguồn. Chỉ công bố các ô dữ kiện cần thiết cho tàu/trọng tải/ngày và truy vết; không sao chép toàn workbook hoặc nội dung/thiết kế website vào sản phẩm.

## Lịch sử và cách tính

Discovery 25 trang có 369 bài từ 01/2025 đến 24/10/2026. 366 workbook trích xuất được, 4.218 dòng NAP hợp lệ, hợp nhất thành 1.399 lượt ghé có ngày đến. Có 2.819 dòng lặp qua các báo cáo được hợp nhất. Các giá trị ghi nhận có mặt trong đủ 22 tháng; điều này không chứng nhận đủ ngày hoặc mọi cầu. Nguồn 2025 thưa hơn 2026; YoY là tỷ lệ của hai giá trị đã ghi nhận, không chứng nhận tăng trưởng của toàn bộ hoạt động.

Khóa lượt gồm cảng, tên tàu chuẩn hóa Unicode/khoảng trắng/hoa-thường và ngày/giờ đến. Không ghép tên gần giống, suy IMO, hoặc nối tàu qua hai cảng. Trong dữ liệu hiện có mọi ô ngày đến/rời được đọc ở độ chính xác ngày; không biến thành giờ 00:00. Bản báo cáo hoạt động mới nhất theo ngày trong workbook thay thế phiên bản cũ của cùng lượt, kể cả khi ô DWT/ngày rời được bỏ. Ngày đăng chỉ dùng thứ tự phụ, để một đợt đăng bù tài liệu cũ không ghi đè báo cáo hoạt động mới hơn. Bằng chứng tất cả phiên bản giữ trong archive.

DWT cột G và GT cột F tách riêng; ô thiếu/không hợp lệ giữ null. Không lấy GT thay DWT. Trùng trong một workbook có trọng tải/ngày rời xung đột giữ phần chưa rõ là null. Ngày đi tương lai hoặc trước ngày đến giữ ngoài sự kiện đã báo cáo. Dòng thiếu ngày đến không đủ khóa lượt, hoặc ngày đến tương lai, được cách ly, không tính lặp theo ngày báo cáo.

Chín báo cáo tháng 02/2025 có tiêu đề cột I của bảng Cửa Lò bị thay bằng một ngày. Parser giữ chiều đến hợp lệ và bảng Bến Thủy, không chứng nhận chiều rời của bảng sai tiêu đề. Ba ngoại lệ chưa tích hợp: bài 5417 có ngày workbook 01/10/2026 trong bài đăng 12/01/2026; bài 5530 và 5536 mỗi bài có hai XLSX chưa đủ căn cứ chọn bản thay thế. Giữ riêng thay vì chọn tùy ý. Chi tiết lỗi, thiếu ngày/khối lượng và phạm vi nằm trong disclosure đóng.

Ngày báo cáo bên trong workbook tách với ngày đăng; cho phép đăng bù đến 90 ngày, nhưng không chấp nhận report date tương lai so với bài. Chỉ chấp nhận hai alias tên sheet Daily Report/Daily report sau chuẩn hóa case; cột, tiêu đề và đơn vị vẫn được kiểm tra. Không quyết định năm từ tên file.

## Kiến trúc và cập nhật

`nap-history-data.ts` chỉ chứa subtotal ngày theo hai cảng và chất lượng. Nhật ký raw chia thành 22 module tháng, import động qua loader có danh sách tháng cố định; bảng miền Trung không nạp/kiểm tra lại toàn raw workbook. Tổng đầy đủ API giữ null; UI dùng số ghi nhận, giữ kỳ hiện tại và YoY khi nền dương. Không có quan sát vẫn unavailable.

Python 3.12+: `pip install -r scripts/requirements-nap.txt`; `python scripts/test-nap-reports.py`; `python scripts/collect-nap-reports.py --workers 3`; `python scripts/export-nap-history.py`. Archive HTML/XLSX bất biến theo hash tại `.local/nap/archive`; parsed source rows tại `.local/nap/parsed`. `--reparse` đọc lại archive, `--reparse-failed` chỉ thử các ngoại lệ, không giả nhận là kiểm tra nguồn mới.

Workflow `nap-activity.yml` dự kiến 08:05 Việt Nam, refresh bốn ngày đăng gần nhất và mọi bài mới/lỗi; giữ phiên bản lịch sử cùng thời điểm kiểm tra cũ. Chạy không có `--refresh-recent` để kiểm lại toàn bộ. Lỗi mới giữ bản nguồn đã kiểm tra trước đó với source_error, không biến mất thành 0. Export chặn ma trận tháng biến mất hoặc parsed reports giảm quá 5% so với bản đã chốt. Ledger Python độc lập so với TypeScript cho từng cảng/tổng NAP, cả hai chiều.

Cấu hình workflow, chạy thủ công, cron thực, staging và production được nghiệm thu riêng trong biên nhận; không tự coi cron đã chạy.

## Kiểm chứng local

151/151 Vitest với một worker; 9/9 hợp đồng Python; typecheck, lint, Next production build và diff-check đạt. NAP/CDN desktop/mobile: 4 luồng liên quan đạt; giữ nhật ký chỉ có ngày, không hiển thị giờ 00:00. Chưa coi local build là triển khai cloud; readback staging và workflow ghi riêng trong biên nhận.
