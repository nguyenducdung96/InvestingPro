# Khảo sát nguồn lượt tàu — 17/10/2026

**Quyết định của người dùng sau khảo sát:** không trả phí nhà cung cấp dữ liệu.
Các API thương mại bên dưới chỉ là kết quả tham khảo, không được chọn làm phụ thuộc
hoặc điều kiện nghiệm thu. Bản mở rộng dùng nguồn Cảng vụ miễn phí; hướng dẫn tại
`port-calls-slice2.md`.

Đây là đầu vào để mở rộng Slice 2, không phải biên bản nghiệm thu kết nối toàn quốc. Đã rà soát 26 đầu mối: 21 trang Cảng vụ/cảng và 5 nhà cung cấp API. Có bản kiểm tra HTTP, URL cuối, kích thước và SHA-256 cho 21 trang công khai trong `catalog-review/port-call-source-probe-20261017.json`. HTML gốc giữ tại `.local/port-call-source-review`, không đưa vào Git. Không đăng ký tài khoản, mua gói hoặc gọi API trả phí.

## Nguồn công khai nên tích hợp trước

- **Cần Thơ, Hậu Giang, Mỹ Thới:** [Cần Thơ](https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=ct&page=vtttc), [Hậu Giang](https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=hg&page=vtttc), [Mỹ Thới](https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=st&page=vtttc) trả về bảng HTML thật. Lần kiểm tra thấy lần lượt 9, 8 và 4 dòng tàu; có tên, quốc tịch, DWT/GT, ngày đến đầy đủ và cầu/phao/neo. Hai nhóm cột đều ghi “Ngày đến”, không được biến cột thứ hai thành ngày rời. Đây là ảnh chụp tàu tại cảng, có tàu lưu từ năm 2025; không phải lịch sử đầy đủ mọi lượt đến/rời. Mỗi lần refresh cập nhật quan sát và khử trùng theo sự kiện, không cộng lại toàn bộ bảng. Cần duyệt ánh xạ khu vực/bến trước khi gắn vào danh mục chuẩn.
- **Chân Mây:** [thông báo Cảng vụ Huế](https://cangvuhanghaithuathienhue.gov.vn/index.aspx?cat=3128&page=news) có bảng đến/rời theo ngày nhưng trộn lịch tương lai. Thông báo 17/10 chứa ngày đến 18, 19, 20 và 25/10/2026; cùng tàu xuất hiện lại qua nhiều thông báo. Adapter phải giữ trạng thái dự kiến/được báo cáo, độ chính xác giờ/ngày và lịch sử chỉnh sửa. Không tự nâng sự kiện thành thực tế chỉ vì thời gian dự kiến đã qua.
- **Lèn Bảng:** [Cảng vụ Quảng Trị](https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2076&page=NEWS) có bảng thông báo theo ngày. Có thể tái sử dụng cấu trúc connector Cửa Việt nhưng phải xác minh khu vực và kiểm thử ngày, trùng lặp, thông báo tương lai riêng.
- **Nghệ An:** [kho vị trí tàu](https://cangvuhanghainghean.gov.vn/index.aspx?cat=2017&page=news) có bản tin lưu theo ngày. [Bản 14/10/2026](https://cangvuhanghainghean.gov.vn/index.aspx?id=6067&page=detail) đính kèm XLSX thực, có Cửa Lò, Cửa Hội/Bến Thủy và các bến; có cột đến/đi, hàng hóa và hiện trạng. Tên file ghi 2016 nhưng nội dung workbook có 14/10/2026, metadata sửa ngày 14/10/2026. Không dùng tên file để quyết định năm. Cần parser ô gộp, ngày Excel, trạng thái và đối chiếu từng dòng trước khi đưa thành sự kiện.

## Nguồn cần giữ đúng ý nghĩa hoặc xử lý thêm

- [Hải Phòng](https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx?d=-1): bảng kế hoạch điều động đến/rời/chuyển cầu/quá cảnh. Dùng cho lịch dự kiến; không cộng tất cả vào lượt thực tế.
- [Quảng Ninh](https://kht1.cangvuhanghaiquangninh.gov.vn/vitritau.aspx): bảng vị trí tàu, DWT/LOA/GRT và bến; mốc thời gian dòng thiếu năm. Chưa đủ để tạo lịch sử sự kiện chính xác năm.
- [Đà Nẵng](https://danangport.com/dich-vu-khach-hang/lich-tau-container/): lịch container ghi rõ EXPECTED, ETB. Trang [tàu đang làm hàng](https://danangport.com/tau-dang-lam-hang/) trả về chỉ số sử dụng cầu trong HTML; chưa xác nhận được dòng tàu từ dữ liệu động.
- [Quy Nhơn — cảng](https://quynhonport.vn/chuyen-muc/ke-hoach-khai-thac-tau/): tài liệu kế hoạch khai thác; phải đọc thời gian trong tài liệu, không lấy ngày đăng làm ngày tàu. Trang vị trí của Cảng vụ trả nội dung ERROR dù HTTP 200.
- [CMIT](https://cap.cmit.com.vn/ArgoService/ExportVesselToPdf): PDF có cột ETA/ETD/ATA/ATD nhưng mẫu lấy được không có dòng tàu; chưa chứng minh có feed hoạt động.
- [VICT ePort](https://eport.vict.com.vn/homepage/search-vessel-schedule): nhận được HTML ứng dụng; chưa xác minh dòng dữ liệu hoặc endpoint công khai. [Tân Cảng](https://saigonnewport.com.vn/): chưa xác minh API lượt tàu công khai.
- [Cảng vụ Nha Trang](https://kht.cangvuhanghainhatrang.gov.vn/): chuyển đến đăng nhập. Đồng Nai: mới thấy nhãn menu; chưa tìm được bảng dùng được. Vũng Tàu: endpoint vị trí không phân giải DNS trong lần kiểm tra; kết quả tìm kiếm cũ không chứng minh nguồn đang hoạt động.

## API

- **[VesselFinder PortCalls](https://api.vesselfinder.com/docs/portcalls.html)** phù hợp nhất về hợp đồng dữ liệu: đến/rời, IMO/MMSI, UN/LOCODE, thời gian UTC; lọc cảng, khoảng ngày và lấy tăng dần bằng `last_id`. Tài liệu giá tại thời điểm kiểm tra: 2 credit/sự kiện; gói 10.000 credit €330 chưa VAT, hiệu lực 12 tháng. Tương đương tối đa 5.000 sự kiện nếu chỉ gọi PortCalls cơ bản. Chưa thử coverage Việt Nam, chưa xác nhận quyền hiển thị lại trong sản phẩm. Cần mẫu theo cảng và báo giá/phạm vi sử dụng trước khi chọn.
- **[MarineTraffic/Kpler](https://servicedocs.marinetraffic.com/tag/Single-Vessel-Events/)** có port-call/berth-call API. Cần key/hợp đồng, kiểm tra dịch vụ truy vấn theo cảng và mẫu Việt Nam; chưa có giá hoặc live acceptance.
- **[Datalastic](https://docs.datalastic.com/)** có vị trí, lịch sử và tra cứu cảng. [Giá](https://datalastic.com/pricing/) Starter Data Feed quan sát được €199/tháng, 20.000 credit. Chưa xác minh endpoint lịch sử lượt tàu hoàn chỉnh; không đánh đồng vị trí AIS với call.
- **[AISstream](https://aisstream.io/)** có luồng AIS WebSocket miễn phí, cần tài khoản/key và collector phía server. Phải đo coverage Việt Nam và xây vùng cảng, thời gian lưu, chống trùng để suy luận call; không có sẵn lịch sử đến/rời đầy đủ.
- **[AISHub](https://www.aishub.net/api)** có vị trí JSON/XML/CSV nhưng quyền truy cập dữ liệu tổng hợp phụ thuộc việc đóng góp feed AIS được xác nhận. Không phải API lịch sử call miễn phí dùng ngay.

## Quyết định triển khai đề xuất

1. Tách `planned`, `reported`, `observed_in_port`, `ais_inferred`; mỗi dòng có nguồn, thời điểm thu thập, thời gian sự kiện và độ chính xác. UI hiển thị trạng thái, phạm vi nguồn, độ mới và thiếu dữ liệu; thiếu nguồn không hiển thị 0 lượt.
2. Ưu tiên adapter Cần Thơ/Hậu Giang/Mỹ Thới và thông báo Lèn Bảng/Chân Mây; parser XLSX Nghệ An tiếp theo. Refresh có giới hạn tần suất, timeout, lưu hash, idempotent và phát hiện thay đổi nguồn. Chưa đo được chu kỳ cập nhật của từng website nên chưa cam kết real-time.
3. Tách lịch Hải Phòng/Đà Nẵng/Quy Nhơn thành dữ liệu kế hoạch riêng. Không dùng để lấp số lượt thực tế còn thiếu.
4. Giữ interface nguồn có thể thay thế; không triển khai nhà cung cấp trả phí theo yêu cầu người dùng. AISstream chỉ là nhánh thử nghiệm, chưa là nguồn nghiệm thu toàn quốc.
5. Ma trận 17 nhóm cảng hiện có nằm trong manifest JSON. Bình Dương, Quảng Ngãi, Tiền Giang, Đồng Tháp còn thiếu feed địa phương được xác minh. 17 nhóm này không phải khẳng định đã bao phủ mọi bến cảng Việt Nam. Đã triển khai và refresh thật 5 connector miễn phí: Cửa Việt, Lèn Bảng, Cần Thơ, Hậu Giang, Mỹ Thới. Các nguồn còn lại vẫn là nghiên cứu, chưa được coi là connector hoạt động.

Trang public có thể đọc được không tự chứng minh quyền tái phân phối, độ đầy đủ hoặc độ chính xác. Lưu điều kiện truy cập/sử dụng riêng với kết quả kỹ thuật; không gán trạng thái đã cấp phép khi chưa có căn cứ.

## Đối chiếu reference có sẵn trong docs

Đã đọc `vietnam_port_official_public_data_sources.md`, đặc biệt mục 3.3 và 4.1.
[Trang báo cáo Đà Nẵng](https://cangvuhanghaidanang.gov.vn/vi/chuyen-muc/thong-tin-khac)
có báo cáo tháng, không phải nhật ký từng tàu. Menu chính thức dẫn tới
[Google Sheet thông báo tàu đến](https://docs.google.com/spreadsheets/u/1/d/1F4cQljqrExfn9JlnLGAZQ4pSbFORhOGRFhpO5ZltHjU/edit?usp=sharing):
cột thời gian ghi ETA, nên phải giữ là dự kiến; bản được công cụ web đọc có dòng
tháng 4–5/2026, chưa xác nhận độ mới. Link vị trí `https://tttb.cangvuhanghaidanang.gov.vn/public-kh`
timeout ở lần mở. Hệ thống thống kê IP `http://144.79.79.16/intro.html` chưa xác minh
được truy cập chi tiết công khai. ENC, NSO, danh mục bến/cầu và báo cáo doanh nghiệp
có ích cho các phạm vi khác, không tự tạo call từ số liệu tổng hợp.
