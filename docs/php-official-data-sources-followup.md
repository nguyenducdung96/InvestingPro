# PHP — nơi cung cấp số liệu chính thức, rà lại ngày 21/10/2026

## Kết luận phục vụ triển khai

Có reference trong docs và có số liệu công khai dùng được. Phải tách hai việc: **sản lượng hàng/TEU theo tháng của Tân Vũ đã tìm thấy**, còn **chuỗi DWT của lượt tàu thực tế theo bến chưa được xác minh đủ**. Không cần chờ nguồn DWT mới tiếp tục kiểm chứng sản lượng công bố; không đổi tên tấn hàng/TEU thành DWT.

Thứ tự nguồn cho PHP: (1) archive newsletter của Cảng Hải Phòng cho số liệu bến/tháng; (2) cổng giấy phép toàn quốc cho lịch sử hồ sơ tàu và đối chiếu định danh/cảng; (3) báo cáo thống kê Cục cho bối cảnh ngành; (4) hệ thống báo cáo thống kê ngành để tìm đầu mối báo cáo chi tiết nếu có quyền truy cập.

## 1. Reference đã có trong repo

- [Danh sách nguồn chính thức](vietnam_port_official_public_data_sources.md), mục 3.1: thống kê tháng Cục HH&ĐT; mục 3.3: hệ thống thống kê ngành có biểu chi tiết tàu theo tháng.
- [Rà soát nguồn tàu](port-call-source-review.md), mục nguồn bổ sung sau phần Hải Phòng/TP.HCM: cổng giấy phép toàn quốc, lưu ý form POST và phân trang.
- [Hồ sơ PHP 2A](php-slice2a-pilot.md): vị trí, kế hoạch, lịch cảng, HTIT và newsletter. Lần rà trước chưa đi hết archive và lịch sử trên cổng giấy phép; không được coi phạm vi kiểm tra đó là bằng chứng nguồn không tồn tại.

## 2. Cảng Hải Phòng: archive có kết quả khai thác theo tháng

Các trang đã mở theo liên kết website chính thức:

- [Archive 2024](https://haiphongport.com.vn/en/port-of-hai-phong-monthly-newsletters-50/port-of-hai-phong-monthly-newsletter-2024.html): hiển thị tháng 1–12; tháng 2 và nhãn tháng 3 đang trỏ cùng một PDF, nên không đếm nhãn thành số kỳ đầy đủ.
- [Archive 2025](https://haiphongport.com.vn/en/support/port-of-hai-phong-monthly-newsletter-2025.html): liên kết tháng 5–12 trên trang đã đọc; chưa khẳng định không có tháng 1–4 ở nơi khác.
- [Archive 2026](https://haiphongport.com.vn/en/port-of-hai-phong-monthly-newsletters-50/port-of-hai-phong-monthly-newsletter-2026.html): lấy được chín URL PDF khác nhau tương ứng tháng phát hành 1–9. Chưa tải/đọc toàn bộ chín file, chưa tuyên bố mọi kỳ đều có số liệu giống nhau hoặc bản tháng 9 là bản mới nhất toàn website.

Đã tải và render trang 1 hai PDF cùng kỳ:

- [Newsletter tháng 9/2025](https://haiphongport.com.vn/FileUpload/Documents/BAN%20TIN%20THANG/2025/10-09-2025-Newsletterthang8-tienganh.pdf): kết quả khai thác **tháng 8/2025**; Tân Vũ 1.773.423 tấn hàng, 95.700 TEU; nhóm Hoàng Diệu Chùa Vẽ 782.570 tấn, 26.027 TEU.
- [Newsletter tháng 9/2026](https://haiphongport.com.vn/FileUpload/Documents/BAN%20TIN%20THANG/2026/Eng-Newsletter-09-2026.pdf): kết quả khai thác **tháng 8/2026**; Tân Vũ 1.770.647 tấn hàng, 93.754 TEU; nhóm Hoàng Diệu Chùa Vẽ 909.908 tấn, 25.205 TEU.

Có cơ sở để tiếp tục dựng chuỗi **sản lượng công bố**, ưu tiên Tân Vũ. Bảng lượt tàu ở newsletter không tách rõ từng bến, không gán tổng đó cho Tân Vũ. Không tách sản lượng nhóm Hoàng Diệu Chùa Vẽ thành riêng từng bến.

Tự động hóa khả thi theo hướng discovery URL PDF → archive/hash → trích xuất → kiểm tra kỳ/đơn vị/phạm vi → lưu fact đã kiểm chứng → API. Biểu đồ KPI trong hai PDF là phần đồ họa, trích text thông thường không lấy được các giá trị; cần parser ảnh/OCR có kiểm chứng và hàng đợi review khi độ tin cậy thấp. Không nhập hai điểm mẫu này vào component hay gọi đó là pipeline production hoàn tất. Tần suất phát hành tháng không tạo thành dữ liệu ngày; ngày phát hành và tháng số liệu luôn tách riêng.

## 3. Cổng toàn quốc: có lịch sử hồ sơ công khai, cần đúng ngày giờ

[Tra cứu giấy phép](https://hanghai.moc.gov.vn/tra-cuu-giay-phep): chọn Hải Phòng, nhập `dd/MM/yyyy HH:mm`. Nhập ngày thiếu giờ cho kết quả rỗng dù ngày đó có hồ sơ.

Đã thử tháng 9/2026: 704 kết quả; tháng 9/2025: 690. Trang 2 của kỳ 2025 giữ bộ lọc, hiển thị dòng 21–40. Đây là số hồ sơ trả về, không là lượt tàu thực tế hoặc độ phủ toàn bộ tháng đã nghiệm thu.

PDF mẫu `26149911/HPG`, ATLANTIC OCEAN, Chùa Vẽ: GT 4.813, hàng khai báo 4.398 tấn, không có DWT. Ngày ở danh sách là 20/10, giờ rời ghi trên giấy phép là 02:00 ngày 21/10; không lấy ngày danh sách làm actual departure. Các nhãn cảng rộng chưa tự ánh xạ sang Tân Vũ/HTIT.

Nguồn hữu ích cho lịch sử hồ sơ và đối chiếu tàu; chưa đủ cho KPI actual DWT. Không lưu URL session/token vào docs hoặc code.

## 4. Hệ thống thống kê ngành: đúng loại báo cáo, phần dữ liệu yêu cầu đăng nhập

[Trang giới thiệu đã có trong docs](http://144.79.79.16/intro.html) truy cập được. Danh mục nêu biểu 11-T về chi tiết tàu tháng, 13-T về lượt vào/rời, 15-T về hàng qua bến/khu vực và 34-Q về khai thác cảng. Đây là đầu mối sát nhu cầu hơn việc thu thêm snapshot.

Link đăng nhập trên chính trang dẫn tới [ứng dụng thống kê](http://144.79.79.16/webtkhh), hiện hiển thị màn hình tên đăng nhập/mật khẩu. Chưa có bằng chứng tải dữ liệu các biểu này công khai. Đầu mối phù hợp để xin báo cáo là Cảng vụ/đơn vị quản lý hệ thống; chưa gửi liên hệ bên ngoài. Không gọi endpoint nội bộ để vượt đăng nhập.

## 5. Cục HH&ĐT: có file tháng mới, phạm vi tổng ngành

[Trang thống kê](https://vimawa.gov.vn/en/thong-ke) liệt kê các kỳ 7–9/2026. Đã tải [file tháng 9/2026](https://vimawa.gov.vn/vi/noi-dung/khoi-luong-hang-hoa-thong-qua-cang-bien-thang-9-2026): tổng hợp hàng qua cảng biển và cảng thủy nội địa, có ước thực hiện tháng và lũy kế/cùng kỳ; không có dòng Tân Vũ/Chùa Vẽ hoặc DWT tàu. Dùng làm bối cảnh ngành; giữ nhãn ước tính, không phân bổ số tổng cho PHP.

Menu [Cảng vụ Hải Phòng](https://cangvuhaiphong.gov.vn/) còn dẫn tới [giấy phép điện tử HTTP](http://tttb.cangvuhaiphong.gov.vn/), nơi có link tra cứu public. HTTPS không kết nối được trong lần thử, HTTP liên kết chính thức hoạt động; không kết luận thiếu nguồn từ riêng lỗi HTTPS. Các báo cáo tổng kết Cảng vụ là cấp vùng quản lý, không mặc định là hoạt động PHP. Reference báo cáo tháng Đà Nẵng vẫn có trong docs; lần mở lại chuyên mục bị timeout, chưa xác nhận độ mới và không dùng số Đà Nẵng cho PHP.

## 6. Bước triển khai kế tiếp đã có căn cứ

1. Thu thập archive newsletter 2024–2026 theo URL liên kết thật, lập ma trận kỳ phát hành/kỳ số liệu và đơn vị bến. Không suy từ tên file hoặc cộng lại hai bản ngôn ngữ.
2. Đối chiếu OCR với hình gốc, kiểm tra các kỳ thay đổi pháp nhân, thiếu file, sửa file và ngày cập nhật. Tạo chuỗi tấn hàng/TEU công bố riêng, không tự đổi phạm vi dashboard DWT đã duyệt.
3. Nếu tiếp tục khai thác cổng giấy phép: làm adapter form/pagination đúng ngày giờ, bảo toàn semantics giấy phép và alias chưa duyệt. Chưa cần tải hàng chục nghìn hồ sơ trước khi chứng minh được trường cần dùng.
4. DWT actual vẫn cần nguồn/report có trạng thái thực hiện; ưu tiên biểu 11-T hoặc lịch sử TOS/cảng được cấp quyền. Không chuyển giấy phép/kế hoạch thành actual chỉ để đủ số.

Biên nhận [php-source-followup-20261021.json](catalog-review/php-source-followup-20261021.json) lưu tám raw hash, các phép thử form không chứa session, hai mẫu newsletter đã xem trực quan và các giới hạn. Chưa nhập DB, chưa deploy, chưa nghiệm thu scheduler. Đây là phần bổ sung nghiên cứu của Slice 2A.

## 7. Rà lại lịch điều động lịch sử ngày 21/10/2026

**Đính chính:** lần rà trước mới đọc navigation gần hiện tại, chưa thử được archive qua độ lệch ngày. Không có căn cứ kết luận thiếu nguồn lịch sử lượt/DWT. Khả năng lấy lịch sử nay đã được chứng minh bằng ba ngày mẫu, chưa phải mọi ngày trong 24 tháng.

Nguồn trực tiếp là [lịch điều động Cảng vụ Hải Phòng](https://csdltau.cangvuhaiphong.gov.vn/pages/ship_plan.aspx?d=-1). `d` là độ lệch ngày so với ngày server; phải đọc tiêu đề báo cáo để xác nhận ngày, không lưu offset cố định như permalink ngày tuyệt đối. Tại ngày kiểm tra 21/10/2026:

- `d=-1`: nội dung 20/10/2026; 29 dòng vào, 24 dòng rời, 18 dòng di chuyển. PHP pilot có 7 dòng vào, 6 dòng rời.
- `d=-366`: nội dung 20/10/2025; 17 dòng vào, 24 dòng rời, 11 dòng di chuyển. Pilot có 4 dòng vào, 5 dòng rời, 2 dòng di chuyển.
- `d=-731`: nội dung 20/10/2024; 35 dòng vào, 21 dòng rời, 9 dòng di chuyển. Pilot có 5 dòng vào, 3 dòng rời.

Các con số là số dòng bảng trước ghép chuyến/đối chiếu thực hiện; không gọi là lượt ghé cảng actual. Bảng vào/rời chứa DWT, GT, giờ, từ/đến, đại lý; không thay GT cho DWT. Qua luồng không thuộc phép đo pilot này và không cộng di chuyển nội cảng vào tổng vào/rời.

Ví dụ trực tiếp ngày 20/10/2026: bảng rời ghi **ZIM MOUNT OLYMPUS, 08:30, 161.070 DWT, HTIT → CHINA**. Các trường tên/giờ/DWT/bến khớp ảnh tham khảo người dùng gửi. Đây là bằng chứng đối chiếu mạnh cho nguồn gốc loại dữ liệu, không chứng minh thuật toán nội bộ hoặc độ chính xác toàn bộ website tham khảo.

[Trang nguồn của dulieucangbien.com](https://dulieucangbien.com/nguon-du-lieu), đọc qua UI công khai, tự mô tả thu lịch Cảng vụ, cập nhật 05:00, backfill ba ngày và xử lý bản sửa trong cửa sổ bảy ngày. Chỉ dùng tuyên bố này để định hướng khảo sát, không tải dữ liệu thành viên hay dùng bảng của họ làm feed. Pipeline có thể tự thu dòng ngày → chuẩn hóa bến → chống trùng/bản sửa → tổng hợp tháng/quý/YTD; không cần nguồn có sẵn chart hay API tổng hợp.

**Quyết định đề xuất cho PHP:** triển khai một series ghi rõ **“Lượt và tổng DWT theo lịch điều động Cảng vụ”**, tách khỏi sản lượng tấn hàng/TEU và actual được xác nhận. Không chặn khả năng khai thác nguồn này chỉ vì chưa chứng nhận actual; đồng thời không đổi nhãn kế hoạch thành thực hiện. Trước backfill lớn, kiểm tra một tháng đầy đủ và cùng tháng năm trước, ghi missing-day/parse-error/DWT-missing, thử bản sửa và dedup khi đổi giờ. Một tàu vào rồi rời không được cộng hai lần thành một chỉ tiêu lượt ghé; chọn một chiều nhất quán. Hãng tàu không suy từ tên đại lý.

Phép đo có thể chạy lại: `python scripts/probe-haiphong-plan-history.py`. Script chỉ tải ba ngày mẫu, xác minh ngày báo cáo/cấu trúc bảng và lưu HTML/hash cùng receipt ở `.local/php-slice2a/plan-history-recheck/`; không ghi DB hay thay dashboard staging. Biên nhận review: [php-plan-history-recheck-20261021.json](catalog-review/php-plan-history-recheck-20261021.json).
