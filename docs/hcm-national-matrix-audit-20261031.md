# HCM: đối chiếu có giới hạn nguồn quốc gia với bảng lịch — 31/10/2026

## Phạm vi và cách đọc kết quả

Đối chiếu tuần 22–28/10 của **2025 và 2026**, lấy dòng ghi nhận đầu tiên cho từng asset/chiều trong mỗi cửa sổ. Có **40 mẫu có quan sát**, bốn ô không có quan sát: CLL bến 2.200 DWT cả hai chiều năm 2025 và chiều vào 2026; SWC chiều vào 2026. Các ô này không phải số lượt bằng 0 và không chứng minh cảng không hoạt động. Manifest đóng băng raw row, SHA bảng, scope proof K12 và lựa chọn tại [danh sách ca](catalog-review/hcm-national-matrix-cases-20261031.json).

Tra cứu theo tên tàu, bộ lọc Cảng vụ 21 (TP.HCM) và 12 (Vũng Tàu), ngày hồ sơ trong khoảng **hai ngày trước đến hai ngày sau ngày kế hoạch mẫu**. Mỗi case tra kế hoạch; case chiều rời tra thêm giấy phép. Mỗi truy vấn phải giữ đúng bộ lọc, đọc được tổng kết quả và đủ trang đầu; vượt 20 bản ghi thì giữ lỗi vượt giới hạn, không tuyên bố đã đọc đủ. Giới hạn một lượt chạy: 160 truy vấn listing và 120 PDF mới; gặp HTTP 429 thì dừng và giữ Retry-After. Cache cho phép tiếp tục, không cần tải lại toàn bộ.

Kết quả là đối chiếu **từng mẫu**, không phải tỷ lệ bao phủ toàn bộ nguồn, không chứng minh các ngày khác không có dữ liệu và không phải tổng hoạt động tàu. Ngày danh sách khác ngày kế hoạch trong PDF; cửa sổ ±2 ngày không được coi là đầy đủ mọi trường hợp xuất bản trễ/sớm. Không suy actual từ kế hoạch hoặc giấy phép.

## Công cụ và kiểm chứng

- `scripts/audit-hcm-national-matrix.py`: chỉ nghiên cứu; ghi query receipt không chứa session/auth URL, raw PDF theo SHA và metadata nguồn, bảng đối chiếu từng case tại `.local/hcm-national-matrix/`. Không sửa dữ liệu/API/UI hoặc chạy exporter.
- `scripts/test-hcm-national-matrix.py`: bảy kiểm thử gate phân biệt chiều, K12/K12B, khác giờ, ngày kế hoạch, không mượn GT/DWT, định danh, cache hỏng/offline và allowance rõ ràng cho mẫu PDF Vũng Tàu cũ. Cùng 10 national tests hiện hữu đã đạt tại máy; CI chạy cả hai bộ.
- PDF Vũng Tàu cũ chỉ được phép trong audit khi bật allowance; review ba mẫu HCM vẫn mặc định kiểm cơ quan HCM. Chấp nhận đồng hồ nguồn dạng `DD/MM/YYYY- HHMM LT` có kiểm tra ngày/giờ, không tự đặt giờ thiếu thành nửa đêm.
- Chế độ `--offline` đọc lại byte PDF đã lưu, kiểm hash và parse lại bằng code hiện hành; không dùng JSON parse cũ như chân lý. Thiếu query/PDF thì báo thiếu bằng chứng, không gọi mạng hoặc biến thành kết quả trống.

Biên nhận kết quả và CI nằm tại [hcm-national-matrix-audit-20261031.json](catalog-review/hcm-national-matrix-audit-20261031.json). So sánh rộng này thực hiện tại máy; bằng chứng cloud vẫn là ba mẫu của [run 41201078402](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41201078402), không phải nghiệm thu toàn ma trận từ cloud.

## Kết quả đã chốt

Đã hoàn tất **40/40 ca**, lưu **122 snapshot truy vấn đã kiểm bộ lọc/tổng số/trang đầu và 46 PDF khác hash**. Hai truy vấn lỗi mạng ở lượt đầu đã được thử lại có giới hạn, bổ sung một PDF; kết quả cuối không còn query error. Chạy lại offline: 0 request mạng, 0 PDF tải thêm, kết quả từng case giống hệt lượt online. Đồng thời kiểm lại SHA/reparse **9 bảng HTML raw** chứa đủ 40 dòng tham chiếu, gồm một dòng K12 có scope proof đóng băng khớp manifest.

- **9 exact_fields_candidate:** tất cả là chiều vào; khớp tên/hô hiệu/ngày/giờ/DWT và nhãn cầu theo tiêu chí audit. Đây chưa phải xác nhận mapping bến/issuer cuối cùng hoặc chấp thuận tự động nhập metric.
- **10 clearance_time_only:** chỉ tương ứng thời gian trên giấy phép rời cảng, không phải bản kế hoạch thay thế có DWT/berth đã xác minh.
- **2 different_plan_fields:** giữ ngoài lựa chọn tự động. Mẫu TRAN GIA 09/SP-PSA ngày 22/10/2025: bảng 13:00/DWT 1.951, PDF 08:00/DWT 1.950; KMTC BANGKOK/C.LAI 7 ngày 22/10/2026: bảng 01:30, PDF 00:01, DWT cùng 21.663. Không chọn một bản chỉ vì gần giờ hơn hoặc làm tròn chênh lệch trọng tải.
- **9 identity_insufficient:** thiếu hô hiệu trên dòng tham chiếu; chưa ghép chắc chắn bằng tên tàu.
- **10 no_correspondence_in_bounded_query:** chưa có đối ứng đạt điều kiện trong cửa sổ đã tra. Không suy không có hồ sơ ở cửa sổ khác hoặc không có hoạt động tàu.

Trong 21 mẫu chiều rời, chưa có mẫu kế hoạch quốc gia đạt tất cả các trường đối chiếu: 10 chỉ tương ứng giờ giấy phép, ba thiếu định danh và tám chưa có đối ứng. Đây là kết quả của tập mẫu/cửa sổ này, không phải khẳng định toàn nguồn không có kế hoạch chiều rời. Không dùng 9/40 làm tỷ lệ bao phủ hoặc tỷ lệ hoạt động của các cảng.

Code **eb2c229** đã qua [Quality 41203772096](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41203772096), gồm validate/E2E desktop/mobile/required check, và native Cloudflare build success. Raw 46 PDF ở `.local/hcm-national-matrix/pdf/`, source URL/hash/parsed rows trong receipt Git; JSON/hash không thay kho PDF vĩnh viễn. Cần lưu bền các raw được chọn trước khi nhập dữ liệu/đóng nghiệm thu nguồn.

## Hợp đồng nguồn và chống trùng đã chốt cho bước tiếp

1. **Kế hoạch quốc gia, MESSAGE_TYPE=70:** thời gian movement lấy từ PDF, giữ riêng ngày danh sách/ngày hồ sơ. DWT chỉ lấy từ cột DWT. Tàu/hô hiệu/ngày/giờ/DWT/nhãn cầu trùng là ứng viên đối chiếu; tên bến đầy đủ và mapping issuer vẫn phải xác minh. Không mở alias K12 toàn cục từ hậu tố hoặc tên tàu.
2. **Giấy phép rời cảng, MESSAGE_TYPE=60:** loại hồ sơ `departure_permission`, không phải actual hoặc mặc nhiên cùng contract với kế hoạch. DWT giữ null nếu không có, GT riêng. Trùng giờ chỉ là tương ứng thời gian; chưa chứng minh cùng berth hoặc đủ phạm vi asset. Không cộng giấy phép vào tổng kế hoạch và không mượn DWT từ kế hoạch cùng tàu.
3. **Định danh:** các mẫu thiếu hô hiệu giữ `identity_insufficient`; không xác nhận quan hệ chỉ bằng tên tàu. Điều này không xóa dòng nguồn cũ đã hiển thị. Cần bằng chứng bổ sung như hồ sơ tàu/IMO hoặc quy tắc đối chiếu được kiểm chứng trước khi nhập nguồn mới.
4. **Raw và phiên bản:** giữ `(sha256, source_url)` cùng native document/request IDs. Cùng nội dung ở URL khác vẫn giữ provenance; không tạo thêm một lượt chỉ vì có thêm tài liệu. Khác ngày/giờ/trọng tải giữ đối chiếu và phiên bản riêng, không tự coi là hai chuyến hoặc chọn giờ gần bảng nhất. Chỉ chốt thay phiên bản khi có quan hệ tài liệu rõ ràng và căn cứ ký/phát hành; bảng lịch không có request ID nên chưa suy được quan hệ trực tiếp chỉ từ tên/ngày.
5. **Kết luận tích hợp:** chưa đủ căn cứ thay toàn bộ bảng lịch HCM. Hướng an toàn tiếp theo là intake nguồn bổ trợ riêng: archive và hàng chờ review cho kế hoạch; giấy phép tách loại và không tham gia phép cộng hiện tại. Chỉ nối metric sau khi mapping/phiên bản/chống trùng đạt, với provenance và coverage riêng. Không bù trọng tải thiếu, không xóa last-good hoặc đổi semantics để làm nguồn mới có vẻ đầy đủ.

## Trạng thái và bước tiếp theo

Dashboard giữ bản HCM đã duyệt đến **28/10/2026**. `replacement_verified=false`, `actual_verified=false`, production chưa nghiệm thu. Các phần Bình Dương schedule, PDN cron, Long Bình Tân, Dung Quất định kỳ và ICD/kho bãi không được sửa trong audit này.

Ưu tiên tiếp theo là intake kế hoạch quốc gia độc lập có archive/revision và hàng chờ đối chiếu, kiểm tra thêm các ca chưa tương ứng trong cửa sổ ngày hồ sơ rộng hơn có giới hạn, và bổ sung định danh cho các ca thiếu hô hiệu. Nguồn giấy phép giữ riêng làm bằng chứng, không dùng thay DWT/berth-plan metrics. Nghiệm thu cloud đầy đủ và lịch thật chỉ thực hiện sau khi hợp đồng dữ liệu được triển khai và kiểm chứng.
