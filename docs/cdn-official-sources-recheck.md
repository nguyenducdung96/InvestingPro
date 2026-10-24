# CDN: rà lại nguồn, phạm vi Sơn Trà và các cột tháng trống

> **Đính chính tiếp ngày 25/10/2026:** [Đối chiếu trực tiếp và sửa tổng hợp](cdn-aggregation-correction-20261025.md) tìm được lỗi `known_dwt` bỏ DWT hợp lệ của cả ngày khi một dòng thiếu trọng tải. Lịch vẫn có dữ liệu ở cả 22 kỳ tháng; các con số đủ điều kiện 18/12/0 dưới đây là trạng thái chỉ tiêu nghiêm ngặt của lần kiểm tra cũ, không phải số tháng có/không có dữ liệu để vẽ. Đã bổ sung chỉ tiêu DWT đã ghi nhận, giữ cảnh báo độ phủ và tổng đủ điều kiện riêng.

Ngày 24/10/2026, theo yêu cầu người dùng sau khi xem CDN và ảnh website tham khảo. [Biên nhận nguồn/độ phủ](catalog-review/cdn-source-recheck-20261024.json). Kết quả rà soát này thay thế cách diễn giải rằng kiểm thử giao diện hoặc đủ nhiều báo cáo ngày đồng nghĩa CDN đã có chuỗi DWT đủ như Hải Phòng.

## Kết luận

Nguồn lịch CDN là chính thức, nhưng **chuỗi tổng DWT liên tục chưa đạt điều kiện so sánh như Hải Phòng**. Trong 22 kỳ tháng từ 01/2025 đến 10/2026 (tháng cuối chỉ đến 23/10), API live đủ điều kiện tính lượt ở 18 kỳ; tổng DWT chiều rời chỉ đủ 12 kỳ, chiều vào không có kỳ nào đủ. Không phải 10 hoặc 22 tháng hoàn toàn không có lịch tàu. Có 658/661 ngày đọc được; 244 dòng vào và 16 dòng rời thiếu DWT. Ngoài ba ngày nguồn không đủ điều kiện, một nhóm cùng tàu/tuyến khác giờ tháng 04/2025 cần đối chiếu khiến tổng kỳ đó được giữ null.

Phần chưa đạt nằm ở **độ phủ giá trị và khả năng đối chiếu nguồn**, không phải bản thân chart không render. Đổi null thành 0, cộng phần DWT đã biết thành tổng đầy đủ, hoặc thêm bến không thuộc CDN sẽ tạo kết quả sai. Lượt, DWT, nền cùng kỳ và lũy kế phải đánh giá độc lập.

## Tiên Sa và Sơn Trà: vùng cảng khác với doanh nghiệp CDN

Ảnh tham khảo ghi **Tiên Sa**, không phải Tiên Sơn. Hai bến Tiên Sa và Sơn Trà đều nằm trong vùng cảng biển Đà Nẵng; điều đó không chứng minh cùng thuộc pháp nhân niêm yết CDN.

- [Công bố PTSC ngày 06/04/2016](https://www.ptsc.com.vn/tin-tuc/tin-ptsc-1/san-xuat-kinh-doanh/ptsc-ky-hop-dong-nhan-chuyen-nhuong-cang-son-tra) mô tả hợp đồng ký 30/09/2015: PTSC mua toàn bộ 12.500.000 cổ phần, tương ứng phần vốn 50% của CDN tại Cảng Sơn Trà. Bài nêu PTSC nắm trên 99% sau giao dịch. Ngày ký và ngày đăng không tự trở thành ngày hiệu lực pháp lý trong database.
- [Danh mục Cục HH&ĐT](https://vimawa.gov.vn/vi/node/7824) ghi đơn vị khai thác Sơn Trà là Công ty Dịch vụ Dầu khí Đà Nẵng. Danh mục là bằng chứng operator, không tự chứng minh đầy đủ chuỗi sở hữu hiện hành.
- [PTSC ngày 14/06/2024](https://www.ptsc.com.vn/cang-son-tra--lan-dau-tiep-nhan-tau-tren-18000-dwt) tiếp tục mô tả Sơn Trà–PTSC Đà Nẵng và hoạt động khai thác bến. Báo cáo PTSC 2025 trong public catalog dự án cũng có Sơn Trà trong danh mục cảng của tập đoàn.
- [Báo cáo CDN 2025](https://danangport.com/wp-content/uploads/2026/03/VN-CDN-2025-updated.pdf), phần sơ đồ tổ chức và công ty liên kết, ghi một Xí nghiệp Cảng Tiên Sa, không có công ty con; hai công ty liên kết là Tàu lai Cảng Đà Nẵng và Logistics Cảng Đà Nẵng. Các dòng “Ban Quản lý dự án Cảng Sơn Trà” nằm trong lý lịch công tác giai đoạn 2008–2012 của lãnh đạo, không phải danh mục tài sản hiện tại.

Giữ CDN = Tiên Sa trong phạm vi đang theo dõi. Sơn Trà có thể là một dòng nghiên cứu khu vực/nhóm PTSC riêng; **không cộng vào CDN để lấp tháng**. Website tham khảo có thể đang dùng phạm vi địa lý hoặc dữ liệu quan hệ cũ; chưa xác minh phương pháp của họ. Không kết luận website đó sai chỉ từ ảnh, và không lấy số của họ làm feed.

## Đối chiếu với chuẩn đã áp dụng ở Hải Phòng

Reference dự án đã có: [registry nguồn chính thức](vietnam_port_official_public_data_sources.md), [rà lại nguồn PHP](php-official-data-sources-followup.md), [pilot PHP bốn bến](php-four-berths-staging.md) và mục 2A trong [lộ trình](port-investment-roadmap-review.md).

Hải Phòng đã kiểm tra lịch sử theo độ lệch ngày, ngày trong tiêu đề, bảng vào/rời, alias bến, DWT và một tháng đầy đủ/cùng kỳ trước backfill. CDN dùng giao diện ngày và các tài nguyên public do trang Cảng vụ công bố; đã có ngày/hash/direction/pagination/mapping BC78 + nhãn Tiên Sa và chống trùng. Các tham số noticeShipType, maritimeCode 18, markedAsArrival/Departure và shipBoat khớp JS của giao diện nguồn. DWT nguồn sử dụng đúng trường `dwt`, không lấy nhầm GT.

Điểm không tương đương: nguồn Đà Nẵng trả nhiều DWT bằng 0, một số ngày không dùng được và một nhóm lịch cần đối chiếu. Backfill 661 ngày, parser tests và manual refresh thành công chỉ chứng minh thu/nhập theo hợp đồng; **không chứng nhận các trường DWT đủ để vẽ biểu đồ liên tục**. Báo cáo tiến độ cần giữ trạng thái “dashboard chạy, lượt có độ phủ từng kỳ, DWT chưa đủ”, thay vì coi CDN đạt chất lượng dữ liệu như các bến Hải Phòng.

## Rà lại nguồn chính thức

Đã tải lại 16 đầu mối công khai, ba bảng tính do CDN nhúng, các sheet con và JS bảng tàu. HTTP thành công chỉ xác nhận truy cập được; không phải xác nhận dữ liệu đủ.

1. **Cảng vụ Đà Nẵng:** [trang lịch điều động](https://cangvuhanghaidanang.gov.vn/vi/ke-hoach-dieu-dong-tau-thuyen) nhúng `http://tttb.cangvuhanghaidanang.gov.vn/public-kh`. Nguồn đang dùng khớp UI công khai. Raw mẫu 23/10/2026: INSIGHT, IMO 9790907, đến Tiên Sa, `dwt=0`, đơn vị TNE; dòng rời có DWT dương. Vì vậy null ở bản chuẩn hóa phản ánh thiếu ở dòng đến, không phải parser bỏ một trường DWT đã có.
2. **CDN – kế hoạch ca/dự báo:** [trang công khai](https://danangport.com/dich-vu-khach-hang/ke-hoach-ca-du-bao-tau-den/) nhúng ba published Google Sheets; đã mở cả ba sheet con. Bảng ca hiện ngày 24/10/2026, dự báo tàu hàng và tàu khách có giờ đến/cập/rời, cầu, LOA/mớn nước và hàng/khối lượng; không có cột DWT. Bảng dự báo có sự kiện tương lai/hủy, không là lịch sử actual đầy đủ. Số tấn hàng trong bảng không thay DWT.
3. **CDN – lịch container:** [bảng dự kiến](https://danangport.com/dich-vu-khach-hang/lich-tau-container/) có vessel/shipping line/agent/ETB, không có DWT. Không bao trùm tàu hàng rời/tàu khách. Trang [tra cứu container đã rời bến](https://danangport.com/tra-cuu-tau-container/) hiện hữu có ATB/ATD/TEU, không có DWT; pipeline đó vẫn riêng, không cộng vào port plans hoặc gọi tháng chọn theo ATD là đủ lượt vào tháng.
4. **CDN – tàu đang làm hàng:** theo link công khai từ homepage tới `https://tvshow.danangport.com/`, đọc JS và đúng GET `https://eport.danangport.com:13443/WS/pwbi/dash_taudanglamhang.php` mà UI sử dụng. Trả bốn tàu snapshot, cầu TS, ATB/ATW/ETC, LOA, hàng/TEU; không có DWT. Không gọi các API doanh thu khác dù chúng xuất hiện trong bundle; không thử tham số lịch sử không được giao diện công bố.
5. **Báo cáo Cảng vụ:** [chuyên mục thống kê](https://cangvuhanghaidanang.gov.vn/vi/chuyen-muc/thong-tin-khac) truy cập lại được bằng HTTP client dù web fetch có lúc timeout. Trang danh sách đầu đang có báo cáo tháng 07/2025 và các kỳ cũ; đây là đầu mối thống kê vùng/hàng hóa, không được tự gán tổng vùng cho CDN hoặc coi tấn hàng là DWT. Chưa xác minh một chuỗi mới đầy đủ DWT theo tàu/bến từ báo cáo này.
6. **Cục/Bộ:** URL `mt.gov.vn` người dùng cung cấp là đầu mối Bộ, lần tải trả 500; không kết luận thiếu nguồn chỉ vì lỗi này. Đã mở [website Cục HH&ĐT](https://vimawa.gov.vn/vi) và [thống kê tháng](https://vimawa.gov.vn/en/thong-ke). Các công bố thống kê ngành không tự trở thành lịch sử DWT của riêng Tiên Sa. Cổng [tra cứu giấy phép](https://hanghai.moc.gov.vn/tra-cuu-giay-phep) mở được và có lựa chọn Đà Nẵng 18; lần rà này chưa kiểm chứng toàn bộ kết quả lịch sử/PDF Đà Nẵng. Không dùng giấy phép thành actual hoặc bổ sung DWT khi tài liệu không có trường đó. [Hệ thống biểu thống kê](http://144.79.79.16/intro.html) có danh mục báo cáo; chưa xác minh tải chi tiết công khai để thay thế chuỗi.

Rà nguồn có giới hạn: chưa chứng minh không tồn tại nguồn tốt hơn; mới xác nhận các ứng viên quan sát được ở trên chưa giải quyết tổng DWT lịch sử trong cách tích hợp hiện tại.

## Hướng sửa dữ liệu có căn cứ, chưa áp dụng suy diễn

Trong raw đã lưu, 232/260 dòng thiếu DWT có một DWT dương quan sát được ở dòng khác có cùng itineraryNo và IMO. Đây là ứng viên đối chiếu mạnh hơn ghép tên tàu, nhưng chưa phải 232 giá trị được duyệt: cần kiểm tra ngữ nghĩa mã hành trình, đơn vị, phiên bản, hai đầu bến, thời điểm và lưu lineage chéo báo cáo. 28 dòng còn lại không có giá trị duy nhất đủ điều kiện theo phép kiểm tra sơ bộ. Không tự mang DWT năm khác, lấy GT hoặc sửa dấu thập phân để hoàn thiện chart.

Nếu triển khai nhánh đối chiếu này, phải version hóa cả nguồn gốc bổ sung, chạy kiểm thử xung đột/revision/IMO/mã hành trình/đơn vị và đo lại độ phủ từng tháng trước công bố. Không thể chỉ đổi chart sang known_dwt rồi gọi đó là tổng DWT.

## Thay đổi sau rà soát

Trang CDN bổ sung độ phủ động của lựa chọn năm/tháng/quý/chiều: số kỳ đủ lượt, số kỳ đủ DWT, số dòng thiếu DWT, ngày thiếu và nhóm cần đối chiếu. Khi không kỳ nào đủ DWT, có lời giải thích và hướng chọn lượt. Phần nguồn nêu phạm vi Sơn Trà và công bố chuyển nhượng để tránh nhầm vùng cảng với CDN. Không sửa dữ liệu nguồn hoặc thêm Sơn Trà vào CDN. Các dashboard Hải Phòng giữ quy tắc cũ.
