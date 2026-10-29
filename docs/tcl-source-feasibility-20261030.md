# TCL — kiểm tra khả năng dùng chuỗi tàu/DWT chung ngày 30/10/2026

Kết quả: **chưa tìm được nguồn công khai đã kiểm chứng để lập chuỗi lượt tàu và DWT 2025–2026 đúng phạm vi TCL như các mã khác**. Đây là giới hạn nguồn đã truy cập, không phải kết luận TCL không có số liệu hay không có hoạt động. Phần ePort TNT hiện có chỉ là quan sát cập/rời cầu trong cửa sổ ngắn; chưa hoàn thành yêu cầu chuỗi lịch sử tháng/quý/lũy kế/YoY.

## Trang chính thức TCL

- Từ [trang chủ TCL](https://tancanglogistics.com/pages/default.aspx), liên kết “Thông tin chuyến tàu” dẫn tới [ePort SNP](https://eport.saigonnewport.com.vn/Ships). Trang công khai ghi chỉ tìm tàu trước 7 ngày và sau 10 ngày; chưa có truy vấn ngày lịch sử để lấy các tháng 2025/2026. Không gán hoạt động toàn Cát Lái cho TCL.
- [ePort riêng ICD Nhơn Trạch](https://eport.tcis.co/Ships) có site TNT và dữ liệu giờ tại cầu. Hợp đồng đã ghi trong `tcl-integration.md`: không có trường DWT, chưa có nền năm trước. Dữ liệu này chưa đáp ứng chuỗi so sánh như PDN/HTIT.
- Đã tải đầy đủ [tài liệu ĐHĐCĐ 2026](https://tancanglogistics.com/quan-he-co-dong/Pages/tcl-cbtt-tai-lieu-dhdcd-thuong-nien-nam-2026.aspx), PDF 12.992.917 byte, trích xuất văn bản 314 trang. Phần kết quả 2025 và kế hoạch 2026 ở trang PDF 8–10 có nhận xét về sản lượng, bảng kết quả tài chính; chưa tìm thấy bảng lượt tàu/DWT hoặc tấn/TEU thực hiện theo tháng/quý để nhập. Không chuyển doanh thu hoặc nhận xét tăng/giảm thành sản lượng.
- Mức khoảng 200.000 TEU/tháng trong báo cáo thường niên là tham chiếu bình quân dịch vụ doanh nghiệp đã ghi ở hồ sơ trước; không phải từng tháng của ICD, không thể nhân 12 hoặc tạo YoY.

## Nguồn Cảng vụ chính thức

- Đi từ [trang thủ tục của Cảng vụ Hàng hải Đồng Nai](https://cangvuhanghaidongnai.gov.vn/index.aspx?cat=2069&page=about) tới bảng điều động công khai. Khởi tạo ba nhóm metadata `kehoachaction`, `vma`, `danhmucriengaction`, không lưu URL phiên tạm vào hồ sơ công khai.
- Tra danh mục với `maritimeCode=11`: 51 bản ghi bến cảng và 79 bản ghi cầu bến; chưa có tên TCL/Tân Cảng/Tiếp vận được xác nhận là ICD Nhơn Trạch. SCC-VN Nhơn Trạch và Nhà máy điện Nhơn Trạch 1 là những bến khác. Danh mục không đủ chứng minh mọi phạm vi quản lý hiện hành đều đã được cập nhật.
- Kiểm tra thêm endpoint tổng hợp mà giao diện sử dụng (`findVmaItinerary_VmaItinerarySchedule_VmaScheduleShifting_URL`), ngoài các truy vấn vào/rời đã kiểm tra trước. Ba ngày 15/06/2025, 15/06/2026, 15/10/2026 trả lần lượt 101, 177, 34 dòng; không có nhãn bến TCL đã xác định. Tên tàu “Tân Cảng” có ở Phước An/bến khác không phải căn cứ quy thuộc TCL. Đây là kiểm tra mẫu, không phải backfill toàn lịch sử.
- Tải workbook danh mục từ [Danh mục bến cảng](https://cangvuhanghaidongnai.gov.vn/index.aspx?cat=2053&page=news): ba sheet “Bến cảng”, “Khu neo”, “Bến cảng thoả thuận”. Chưa tìm được mục TCL để ghép với chuỗi. Nội dung có các mốc cũ; không dùng sự vắng tên làm kết luận hiện hành. DWT trong danh mục là thông số bến, không thay DWT của từng tàu.
- [Danh mục Cảng vụ ĐTNĐ khu vực III](https://cv3.gov.vn/CangBen/DanhSachCangBen) tiếp tục timeout/không truy cập được qua các lần thử; chưa đọc được dữ liệu của nguồn này. Vì vậy không thể tuyên bố đã loại trừ mọi nguồn Cảng vụ hoặc rằng không tồn tại lịch sử.

## Quyết định sau rà soát

Chưa thay công thức hoặc tạo chuỗi số mới từ các nguồn trên. Khi có bản ghi đúng bến, thời gian, chiều và DWT theo nguồn, TCL sẽ dùng cùng quy tắc tổng hợp tháng/quý/lũy kế/YoY với các mã khác; thiếu riêng DWT vẫn giữ số lượt ghi nhận và DWT null. Dữ liệu tại cầu và sản lượng tấn/TEU giữ đúng đơn vị/phạm vi của nguồn.

Điểm chưa giải quyết: mã bến TCL trên nguồn Cảng vụ, quyền truy cập công khai/lịch sử của nguồn ĐTNĐ, lịch sử trước cửa sổ ePort TNT và DWT từng tàu. Không gọi phần tích hợp TNT hiện tại là TCL hoàn thiện theo yêu cầu mới.

Biên nhận truy vấn, số dòng, kích thước và SHA-256: [tcl-feasibility-recheck-20261030.json](catalog-review/tcl-feasibility-recheck-20261030.json). Bản raw lưu tại `.local/tcl-recheck/`; chưa có số mới đủ căn cứ để nhập vào sản phẩm.
