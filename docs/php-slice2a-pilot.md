# Slice 2A — PHP: hồ sơ pilot và kiểm chứng nguồn

> **Trạng thái mới nhất 22/10/2026:** đã triển khai Tân Vũ lên staging, từ 01/2025 đến 21/10/2026, **22 tháng / 659 ngày** trong database, API và trang PHP. Có tháng/quý, MTD/YTD/YoY so đúng khoảng ngày, chi tiết ngày và lịch cập nhật 06:30. Run cập nhật thủ công đã đạt; lần cron đầu còn chờ đúng giờ chạy. [Nghiệm thu staging](tanvu-plans-staging.md). Các trạng thái local/pending bên dưới là lịch sử khảo sát.

> **Cập nhật 22/10/2026:** Đã thu và parse đủ 60/60 trang ngày cho Tân Vũ, tháng 9/2025 và 9/2026. Có chuỗi lượt/DWT **theo lịch điều động công bố**, tách vào và rời; bản review HTML có biểu đồ YoY và drilldown ngày. DWT tàu rời lần lượt 1.071.163 và 968.084, khớp hai điểm trong ảnh tham khảo của người dùng. Nguồn dữ liệu vẫn là Cảng vụ, không lấy số từ ảnh. Không còn chặn nhánh lịch công bố vì “chưa tìm thấy lịch sử”; gate xác nhận actual vẫn tách riêng. Xem [kết quả hai tháng](tanvu-plan-month-pilot.md). Các đoạn “chưa triển khai” bên dưới ghi lại thời điểm khảo sát ban đầu, không thay thế trạng thái triển khai mới hơn.

Ngày review: 21/10/2026 (giờ Việt Nam). Phạm vi người dùng chọn: PHP.
**Kết luận: ưu tiên Tân Vũ, tiếp theo Chùa Vẽ; chưa đạt gate lịch sử lượt tàu/DWT thực tế để nghiệm thu dashboard YoY.**

Đã thực hiện công cụ thu bằng chứng, đo dữ liệu nguồn, đối chiếu hồ sơ doanh nghiệp và bàn giao mapping nghiên cứu. Chưa triển khai Slice 2B/2C, chưa nhập mapping vào production và chưa chứng nhận refresh tự động. Ảnh website tham khảo không tham gia tính số liệu hoặc xác minh quan hệ.

## 1. Những quan hệ xác minh được từ nguồn chính thức

### Tân Vũ — bến ưu tiên số 1

[Hồ sơ chi nhánh chính thức](https://haiphongport.com.vn/vi/don-vi-thanh-vien/chi-nhanh-cang-tan-vu-389.html) và sơ đồ tổ chức tại trang PDF 7 của [BCTN 2025](https://haiphongport.com.vn/FileUpload/Documents/bao_cao_thuong_nien_nam_2025pdf.pdf) xác nhận Tân Vũ là chi nhánh Cảng Hải Phòng.

Danh mục 505 đã có trong repo: mục 52, năm cầu cảng số 1–5. Alias nguồn Cảng vụ quan sát được: `TAN VU`. Chọn để khép dữ liệu trước vì quan hệ chi nhánh rõ và tách được nhãn bến nguồn. Chưa khẳng định có lịch sử DWT tốt nhất; đây là ưu tiên khảo sát tiếp, không chứng nhận data-ready.

### Chùa Vẽ và Hoàng Diệu — hai khu vực vật lý, cùng đơn vị thành viên

[Hồ sơ đơn vị hiện hành](https://haiphongport.com.vn/vi/don-vi-thanh-vien/cong-ty-tnhh-mot-thanh-vien-cang-hoang-dieu-chua-ve-2423.html) mô tả hai khu vực xếp dỡ. [Thông báo tái cấu trúc 21/7/2025](https://haiphongport.com.vn/vi/hoat-dong-dang/cang-hai-phong-tai-cau-truc-toan-dien-thanh-lap-cong-ty-tnhh-mtv-cang-hoang-dieu-chua-ve-va-kien-toan-nhan-su-chu-chot.html) nêu việc tổ chức lại Hoàng Diệu và kết thúc chi nhánh Chùa Vẽ. BCTN 2025 trang PDF 8 ghi PHP sở hữu 100% công ty Hoàng Diệu Chùa Vẽ tại 31/12/2025.

Giữ riêng bến Chùa Vẽ (mục 38), Hoàng Diệu Hải Phòng (mục 28); alias `CHUA VE`, `HOANG DIEU`. Không gộp hai bến thành một chỉ vì gộp pháp nhân. Không gọi Chùa Vẽ là chi nhánh trực tiếp trong mọi kỳ. Tháng thay đổi tổ chức là 7/2025; ngày hiệu lực pháp lý và phạm vi di dời 2026 cần hồ sơ bổ sung, không tự tạo 01/07/2025. Chùa Vẽ là bến thứ hai đề xuất; Hoàng Diệu giữ theo dõi riêng.

### HTIT — liên doanh vận hành bến Lạch Huyện 3–4

[Hồ sơ của PHP](https://haiphongport.com.vn/vi/don-vi-thanh-vien/cong-ty-tnhh-cang-quoc-te-til-cang-hai-phong-htit-2213.html), [website HTIT](https://htit.com.vn/en.html) và danh mục 505 mục 62 cùng liên kết HTIT với bến số 3–4 Lạch Huyện. Trang PDF 9 BCTN 2025 ghi **lợi ích 51%, biểu quyết 50% tại 31/12/2025**, thuộc mục liên doanh/liên kết. Không chuyển thành công ty con chỉ dựa trên tỷ lệ 51%.

[Tin chuyến thương mại đầu tiên](https://haiphongport.com.vn/vi/san-xuat-kinh-doanh/chuyen-tau-thuong-mai-dau-tien-buoc-khoi-dau-moi-cho-hoat-dong-khai-thac-cang-htit-thuoc-cong-ty-cp-cang-hai-phong.html) ghi 16/4/2025. Khánh thành trong tháng 5/2025 là mốc khác; không dùng hai mốc thay nhau hoặc tạo số 0 cho mọi tháng trước đó. Alias nguồn: `HTIT`; tuyệt đối không nhận `HICT`, `HHIT` hoặc mọi nhãn `LACH HUYEN` là cùng bến.

Các tỷ lệ trên là snapshot năm 2025, không chứng nhận tỷ lệ hiện hành 2026. Ngày bắt đầu/đến của quan hệ chưa biết giữ null. Mục 505 là số thứ tự văn bản, không phải UUID database. DVP/Đình Vũ là tài sản liên quan khác, không tự cộng vào tập bến trực tiếp pilot PHP.

## 2. Kiểm chứng dữ liệu vận hành

**Cảng vụ — [vị trí tàu](https://csdltau.cangvuhaiphong.gov.vn/pages/position.aspx):** tải HTTP 200 và parse bằng `haiphong-positions/1.0.0` hiện có. Lần đo lưu trong biên nhận có 208 dòng toàn bảng; alias pilot có Tân Vũ 7, Chùa Vẽ 3, HTIT 2, Hoàng Diệu 0 dòng quan sát. Các dòng của ba bến có quan sát đều có trường DWT. Đây có cả phương tiện lai dắt/nhỏ, không phải số tàu hàng qua bến. Không cộng DWT snapshot thành lưu lượng; không có dòng Hoàng Diệu không chứng minh không có lượt tàu. Không cung cấp kỳ tháng đầy đủ hoặc cửa sổ 24 tháng.

**Cảng vụ — [điều động](https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx?d=-1):** có DWT/GT, chiều, giờ, từ/đến và đại lý, gồm alias bến cần tìm. Tiêu đề và các bảng xác định đây là kế hoạch. Ngày đã qua vẫn là kế hoạch; không nâng thành actual. Navigation quan sát chỉ trỏ các offset ngày gần hiện tại; có hai nhãn ngày cùng trỏ `d=-4`, nên phải đọc ngày trong nội dung, không suy từ nhãn link. Chưa chứng minh được truy vấn lịch sử dài hạn hay actual status.

**Cảng vụ — [ứng dụng mới](https://csdltau.cangvuhaiphong.gov.vn/):** mở giao diện thật, thấy màn hình đăng nhập. Không dùng endpoint nghiệp vụ tìm thấy trong JavaScript để vượt đăng nhập. Chưa có quyền truy cập lịch sử actual qua ứng dụng này.

**Cảng Hải Phòng — [trang tàu ra/vào](https://haiphongport.com.vn/vi/thong-tin-tau-ra-vao-cang):** trang chính thức nhúng [bảng container](https://container.haiphongport.com.vn/vi/thongtintau.ttt.html). Bảng mẫu có cột cập/rời bến DK, mã TV1–TV5, thiếu DWT; một ngày rời dự kiến nằm ở 2027. Không dùng timestamp 00:00/23:59 và nhãn “tàu ra” để chứng minh actual. Mã TV1–5 là ứng viên alias cầu cần đối chiếu riêng trước mapping cầu chuẩn. Chưa thấy bộ lọc lịch sử tháng công khai trong bảng này.

**HTIT — [tra cứu lịch tàu](https://eport.htit.com.vn/search?item=vessel):** đi từ link trên website HTIT, mở được không đăng nhập. Giao diện có tên/mã tàu, chuyến nhập/xuất, hãng, đại lý và ETA; lần kiểm tra thấy 73 kết quả theo phân trang. Không coi 73 là lượt ghé, danh sách hãng thực tế hoặc lịch sử đủ; mẫu hiển thị có ETA trống và không có DWT/ATA/ATD. Chưa dùng làm nguồn actual monthly.

**[Bản tin tháng](https://haiphongport.com.vn/en/support/port-of-hai-phong-monthly-newsletter-2025.html):** có archive PDF tháng 5–12/2025 được liên kết ở trang này. Đã tải và xem trực quan trang 1 [bản tin 3/2026](https://haiphongport.com.vn/FileUpload/Documents/BAN%20TIN%20THANG/2026/tieng-viet-Newsletter-thang03-2026.pdf). Trang công bố kết quả tháng 2: tấn hàng/TEU riêng Tân Vũ và nhóm Hoàng Diệu Chùa Vẽ; chỉ tiêu lượt tàu không tách rõ từng bến tại bảng KPI. Đây là nguồn bổ sung sản lượng công bố, **không phải DWT tàu**, không tách số tổng nhóm cho riêng Chùa Vẽ. Chưa kiểm tra đầy đủ tất cả PDF để chứng nhận lịch sử hoặc kỳ mới nhất.

## 3. Gate 2A và quyết định bàn giao

- Quan hệ PHP và phạm vi bốn bến: có bằng chứng chính thức, đã ghi khác biệt pháp nhân/tài sản và thời gian; mapping là hồ sơ nghiên cứu, chưa tự sửa dữ kiện đã duyệt trong DB.
- Tên bến nguồn Cảng vụ: đối chiếu được các nhãn chính, giữ match chính xác; cầu TV1–5 và biến thể alias chưa duyệt không tự fuzzy match.
- Lượt actual và DWT lịch sử theo bến: **chưa đạt**. Số ngày/tháng đầy đủ, ngày đầu/đến và tỷ lệ có DWT trên toàn bộ lượt actual đều chưa xác định. Không đưa tỷ lệ DWT trên snapshot thay độ phủ lịch sử.
- YoY tháng/quý/YTD: **chưa đủ căn cứ**; chưa có cặp kỳ actual hoàn tất, chưa nói tới 24 tháng.
- Quyền: quan sát được public access cho các trang đã nêu; chưa xác lập quyền tái phân phối dữ liệu. Không coi HTTP 200 là giấy phép sử dụng thương mại.
- Refresh: kiểm tra tải local thành công 15/15 URL trong lần cuối; chưa cài scheduler production, chưa nghiệm thu chu kỳ ngày hoặc SLA của nguồn. Có công cụ chạy lại thủ công, không gắn nhãn tự động.

**Quyết định:** PHP vẫn là pilot người dùng đã chọn. Tân Vũ là bến khép nguồn trước, Chùa Vẽ thứ hai; HTIT theo sau khi có lịch sử actual; Hoàng Diệu cần làm rõ phạm vi hoạt động/di dời. Chưa chuyển sang công bố biểu đồ actual DWT/YoY bằng dữ liệu đang có. Đây là kết quả gate dữ liệu, không phải bỏ PHP hoặc mở khảo sát các mã khác.

## 4. Khoảng trống cụ thể cần khép để bắt đầu 2B

1. Một nguồn chính thức cho **lượt đã thực hiện** tại Tân Vũ, có ngày, chiều, định danh lượt và DWT; cần tài liệu mô tả hoặc trạng thái actual rõ. Nguồn có thể là lịch sử khai thác của cảng hoặc báo cáo actual của Cảng vụ. Không yêu cầu phải đủ cả vào và ra; chọn một chiều nhất quán.
2. Xác nhận khả năng lấy ít nhất một cặp kỳ tương ứng đủ dữ liệu; mục tiêu 24 tháng. Chỉ ghi kỳ thiếu, không lấp từ lịch kế hoạch hoặc archive website tham khảo.
3. Cơ chế truy cập được phép, quyền sử dụng và lịch cập nhật. Nếu lịch sử nằm sau đăng nhập/không public, cần quyền/đầu mối dữ liệu do người dùng cung cấp hoặc nguồn được cấp quyền; không tự gửi yêu cầu cho bên ngoài.
4. Sau khi có dữ liệu: probe mẫu tháng, khóa dedup/revision, so tổng nguồn, rồi mới chốt connector actual và triển khai 2B. Nguồn sản lượng tấn/TEU từ newsletter có thể bổ sung riêng, không âm thầm đổi yêu cầu DWT.

Nếu chưa có nguồn actual, phương án khả thi là giữ danh mục/nguồn và quan sát vị trí riêng, hoặc xây mục kế hoạch với nhãn kế hoạch. Cả hai không đáp ứng dashboard actual đã duyệt; không tự chọn phương án này thay người dùng.

## 5. Công cụ và bằng chứng bàn giao

- `python scripts/probe-php-pilot.py`: chỉ đọc 15 URL chính thức đã chốt; HTTPS xác minh chứng thư, giới hạn thời gian/kích thước, ba luồng tải. Lưu raw theo thư mục thời điểm UTC, SHA-256, HTTP/final URL và cấu trúc; không gọi DB.
- `node scripts/measure-php-pilot.mjs`: kiểm hash của raw thành công rồi dùng parser hiện có để đo snapshot theo alias. Các trường actual và monthly DWT luôn null trong kết quả này; không tạo sự kiện từ snapshot.
- `.local/php-slice2a/receipt.json`: con trỏ biên nhận lần gần nhất; thư mục theo thời điểm giữ capture và receipt bất biến giữa các lần chạy. Lỗi tải ở lần nào ghi ở lần đó, không coi HTTP 200 kèm timeout là tải đủ.
- [Biên nhận nguồn](catalog-review/php-slice2a-source-receipt-20261021.json), [phép đo](catalog-review/php-slice2a-measurement-20261021.json), [hồ sơ mapping nghiên cứu](catalog-review/php-slice2a-evidence-20261021.json) là snapshot review, **không phải data feed của UI**. Raw và ảnh PDF ở `.local`, chưa upload hay công bố.

Xác minh PDF: đã render và đọc trực quan trang PDF 8–9 BCTN và trang 1 newsletter 3/2026. Snapshot đo lại dùng parser thật, không ước lượng số dòng từ ảnh. Kết quả kiểm thử ghi trong phần nghiệm thu khi chạy; không tuyên bố E2E/cloud nếu chưa làm.

## 6. Kết quả xác minh local

- `pnpm exec vitest run tests/port-calls.test.ts`: 8/8 đạt, gồm chống trùng/revision và RLS, không tạo departure từ snapshot.
- Kiểm tra cú pháp Python và SHA-256: 15/15 raw khớp biên nhận cuối; bốn asset đều tham chiếu evidence hợp lệ.
- `node scripts/measure-php-pilot.mjs` chạy thành công với parser thật; đầu ra phân biệt snapshot với actual null.
- `git diff --check` đạt. Không chạy/khẳng định E2E hoặc cloud acceptance; không thay code UI, migration hay scheduler production.

## 7. Bổ sung rà nguồn sau commit cfcd5fa

Đã theo lại reference và kiểm tra thêm cổng giấy phép, hệ thống thống kê ngành, archive newsletter 2024–2026 và file thống kê Cục. [Kết quả chi tiết](php-official-data-sources-followup.md): có cặp số liệu sản lượng hàng/TEU Tân Vũ tháng 8/2025 và 8/2026; có lịch sử hồ sơ giấy phép tháng 9 của hai năm với bộ lọc ngày giờ. Gate actual DWT vẫn chưa đạt. Không còn hiểu phần khảo sát ban đầu là kết luận không có dữ liệu lịch sử công khai.

## 8. Đã thực hiện pipeline newsletter local

Theo yêu cầu tiếp tục, đã thêm [pipeline thu thập và chuỗi Tân Vũ](php-newsletter-pipeline.md): archive 27 PDF và review 16 tháng 05/2025–08/2026, có hai chỉ tiêu tấn hàng/TEU và citations. Đây là số liệu sản lượng công bố, không bổ sung/giả lập DWT. Chưa nối scheduler/API/UI production.
