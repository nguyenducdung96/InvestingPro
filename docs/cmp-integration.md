# CMP — lịch điều động cầu 1 và 2, 25/10/2026

Trang `/companies/CMP#vessel-plans` và API `/api/v1/companies/CMP/plans` có tổng quan hai cầu, chọn cầu, lượt/DWT, hai chiều vào/rời, tháng/quý/năm, YoY DWT, lũy kế đến cutoff và nhật ký 90 ngày/ngày kèm chữ nguồn, trang và SHA-256. Tổng quan miền Trung dùng cùng hàm; không cộng các mã thành tổng vùng.

## Phạm vi và ngữ nghĩa

Nguồn chính: https://cangvuhanghaithuathienhue.gov.vn/index.aspx?page=law&cat=3133 . Đây là authority_published_berth_plan, movement_scope=berth, actual_verified=false. Cả lịch đến/rời trực tiếp và tuyến neo ↔ cầu được ghép vào lượt cấp cầu; không coi là tổng tàu vào/rời vùng cảng hoặc lượt ghé cảng. Chuyển giữa hai cầu CMP giữ riêng. Không lấy snapshot vị trí để suy ngày rời.

Báo cáo 2025 trước đây chỉ đối chiếu cầu 1. Lần này đã đọc thêm danh mục cầu doanh nghiệp và bài Bến số 2 ngày 03/08/2023; bảng Cảng vụ 31/03/2026 cũng ghi cầu 1, cầu 120 m, cầu 2 dưới Công ty CP Cảng Chân Mây, cầu 3 dưới Hào Hưng. Chỉ ghép cầu 1 phía biển/phía bờ và cầu 2. `Bến số 1` là alias chính xác theo nguồn doanh nghiệp; khoảng trắng/dấu gạch và Unicode NFC chuẩn hóa khi so khớp, chữ gốc giữ nguyên. Cầu 120 m chưa có alias đối chiếu trong lịch; cập mạn/hỗ trợ, lỗi chính tả chưa duyệt và nhãn khác giữ riêng. Không khẳng định đủ mọi cầu hoặc ngày hiệu lực pháp lý, không sửa catalog/RLS hay tự nâng quyền nguồn.

Bằng chứng phạm vi: `catalog-review/cmp-berth-scope-20261025.json`. Chỉ trích dữ kiện từ nguồn công khai; không sao chép tài liệu/hình ảnh/thiết kế website vào sản phẩm hoặc tự tuyên bố quyền tái phân phối tài liệu.

## Lịch sử và kiểm soát nguồn

681 bản qua 46 trang, từ 01/2025 đến 24/10/2026. Chuỗi hợp lệ có số ở 22 tháng/cả hai chiều. 11 tiêu đề sai lệch ngày/năm so với thứ tự bản tin bị cách ly, không tự sửa năm. 4.712 dòng nguồn sau cách ly, gồm cả vùng neo và bến ngoài CMP; đây không phải tổng lượt CMP. 169 dòng không đạt cấu trúc/ngày được giữ riêng. Không tuyên bố kiểm tra tay toàn bộ dòng.

Parser kiểm tra accordion, tiến trang, tiêu đề ngày, tiêu đề chiều, mười cột và giờ hợp lệ. Khi thiếu tiêu đề chiều, không dùng lại chiều của bảng trước. DWT chỉ đọc cột DWT; HP, tổng ghép, ô không chắc hoặc không hợp lệ giữ null. Bản bổ sung ghép lịch gốc cùng ngày; khóa đúng giờ/tàu/tuyến trùng chỉ tính một, DWT xung đột giữ null. Không tự coi giờ khác là trùng vì một tàu có thể có nhiều di chuyển trong ngày. Số liệu là kế hoạch được công bố, chưa xác minh actual.

HTML từng trang lưu bất biến theo hash trong `.local/cmp/archive`; bản public giữ các ô gốc và hash để truy vết. URL nguồn là danh mục phân trang, không có permalink riêng cho mỗi lịch; số trang có thể thay đổi sau cập nhật, vì vậy phải đối chiếu cùng hash và ngày. Các giá trị thiếu không biến thành 0. API tổng đầy đủ vẫn null; UI dùng giá trị ghi nhận và YoY khi nền cùng kỳ dương; chất lượng nằm trong details đóng.

## Cập nhật và tái lập

Python 3.12+, `pip install -r scripts/requirements-cmp.txt`; chạy `python scripts/test-cmp-plans.py`, `python scripts/collect-cmp-plans.py`. Không cần OCR. `--cached` chỉ tái phân tích archive và giữ nguyên thời điểm đã kiểm tra nguồn; `--resume` phục hồi lần thu ban đầu bị ngắt. Refresh thường đọc lại toàn bộ lịch sử để không bỏ bản sửa; lỗi HTTP/parser không ghi đè bản dữ liệu thành công. Chặn mất trên 5% tài liệu hoặc mất tháng/chiều trước xuất. Ledger Python độc lập đối chiếu TypeScript cho cả 44 ô tháng/chiều.

Workflow `cmp-plans.yml` dự kiến 07:50 Việt Nam, cùng nhánh staging hiện có; cache archive, lưu receipt và chỉ push sau kiểm thử. Cấu hình trong repo chưa đồng nghĩa cron đã đăng ký trên default branch hoặc đã chạy thực. scheduled_refresh_verified=false.

## Số liệu đối chiếu đến 24/10/2026

Chiều rời cầu: tháng 10 ghi nhận 36 lượt / 509.140,47 DWT; cùng cửa sổ 2025 là 40 lượt / 412.697 DWT. Lũy kế 2026: 510 lượt / 6.174.595,6 DWT; cùng kỳ 2025: 509 lượt / 5.670.995,82 DWT. Các con số giữ phần lịch đã ghi nhận, chưa chứng nhận đầy đủ nguồn hoặc actual.

Kiểm chứng local và staging được chốt riêng trong biên nhận. NAP và GMD–Dung Quất còn pending; không coi toàn miền Trung hoàn tất.

## Kiểm chứng local

145/145 Vitest với một worker; 4/4 hợp đồng Python; typecheck, lint, Next production build và diff-check đạt. CMP/QNP/CDN desktop và mobile: sáu luồng liên quan đạt sau cập nhật kỳ vọng CMP trong bảng miền Trung. OpenNext local hoàn tất Next build nhưng bị Windows EPERM khi tạo symlink; không coi là bundle Cloudflare đạt. Build cloud và readback staging sẽ được ghi riêng.
