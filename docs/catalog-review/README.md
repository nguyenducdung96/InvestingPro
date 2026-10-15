# Hồ sơ rà soát catalog Slice 1

Đây là đầu vào nghiên cứu cho import thủ công, không phải dữ liệu đã được công bố. Không được dùng file này để hardcode danh mục trên giao diện hoặc tự động chuyển proposal thành `verified`.

## Phạm vi

Người dùng cung cấp ảnh danh mục 15 mã: GMD, PHP, VGR, DVP, PDN, CDN, CQN, DXP, PSP, PAP, SGP, QNP, QSP, NAP, MVN. Danh sách này là mức đối chiếu tối thiểu, không phải bằng chứng rằng thị trường chỉ có 15 doanh nghiệp cảng.

Phạm vi yêu cầu vẫn gồm doanh nghiệp trên HOSE/HNX/UPCoM có quan hệ với cảng biển và cảng sông, kể cả sở hữu gián tiếp. ICD hiển thị riêng. Doanh nghiệp khai thác, doanh nghiệp sở hữu và cảng/bến vật lý là các thực thể khác nhau.

## Tài liệu và trạng thái

`listed-port-baseline.json` lưu từng hồ sơ đối chiếu, liên kết tài liệu gốc, SHA-256, thời điểm tải thật và các điểm phải rà soát. Cả 15 hồ sơ hiện có tài liệu ứng viên. Các trường `pending`, `to_verify` và `current_2026_changes_reviewed: false` được giữ nguyên cho đến khi hoàn tất kiểm tra tương ứng.

Đã thu thập 30 PDF công khai cho đợt nghiên cứu rộng hơn. Chúng không đồng nghĩa 30 nguồn đã được duyệt. Hai file PHP gồm một phần báo cáo và bản đầy đủ; hồ sơ baseline chỉ tham chiếu bản đầy đủ. Các bản scan có OCR để tìm trang; OCR không phải kết quả xác minh.

Raw files và ảnh review ở `.local/catalog-research/`, không commit vào Git. Script `scripts/index-catalog-evidence.py` lập chỉ mục và tên object theo hash, không upload hay cấp phép nguồn. `scripts/read-catalog-pdf.py` hỗ trợ đọc/render/OCR ngoại tuyến, không nhập dữ liệu vào database.

Đã upload đủ 30 PDF vào `investing-pro-evidence-staging/catalog-evidence/sha256/` và đối chiếu thấy đủ 30 key mới trên hai trang danh sách object. Bucket giữ riêng tư. `evidence-artifacts.json` lưu metadata của đợt này; chưa tải ngược toàn bộ 30 file để đối chiếu SHA-256, nên `r2_verified` vẫn false và `sha256_readback_status` vẫn pending. Trạng thái lưu trữ không thay thế duyệt quyền sử dụng hoặc duyệt quan hệ doanh nghiệp–tài sản.

## Quy trình duyệt mỗi hồ sơ

1. Xác minh pháp nhân, mã và sàn bằng hồ sơ chính thức hoặc tài liệu doanh nghiệp; lưu bằng chứng ngày hiệu lực. Ảnh tham khảo chỉ xác định yêu cầu độ phủ.
2. Xác định từng cảng/bến/cầu cảng và ICD từ danh mục pháp lý; kiểm tra alias trước khi tạo entity mới. Không suy ra cảng vụ chỉ từ tên hoặc địa bàn doanh nghiệp.
3. Đọc trang gốc xác định quan hệ trực tiếp/gián tiếp và kiểm tra công bố mới hơn, đặc biệt tái cơ cấu hoặc thoái vốn. Tỷ lệ sở hữu pháp nhân không tự trở thành tỷ lệ sở hữu tài sản vật lý.
4. Ghi ngày hiệu lực được tài liệu hỗ trợ. Kỳ báo cáo, ngày ký, ngày đăng và thời điểm tải là những dữ kiện khác nhau. Khi chưa đủ chứng cứ ngày bắt đầu quan hệ, giữ hồ sơ ở trạng thái nghiên cứu thay vì bịa `valid_from`.
5. Duyệt phạm vi quyền sử dụng riêng của nguồn. Việc một PDF có thể tải xuống hoặc một trang cho phép robots không phải giấy phép tái sử dụng toàn bộ dữ liệu. Kho EzIR của QNP được website doanh nghiệp liên kết; không nhập dữ liệu giá/thị trường của nền tảng vào Slice 1.
6. Xác nhận raw object nằm đúng bucket riêng tư và key; ghi receipt kiểm tra riêng. Không dùng một key dự kiến để khẳng định đã lưu thành công.
7. Chuẩn bị import nguồn, entity và các listing/mapping `pending`. Review bằng tài khoản admin qua hàng đợi; không dùng SQL để giả actor hoặc đánh dấu verified.

## Trường hợp đã nhận diện cần xử lý riêng

- QNP và QSP là hai doanh nghiệp khác nhau. Trang PDF 5 báo cáo QSP 2025 đã được đọc trực quan: doanh nghiệp mô tả hợp tác khai thác hạ tầng/cho thuê và không trực tiếp vận hành. Vì vậy không tạo quan hệ `operator` chỉ từ tên doanh nghiệp.
- PHP cần tách chuỗi pháp nhân Hoàng Diệu–Chùa Vẽ sau tái cơ cấu năm 2025 và liên doanh TIL. Quan hệ Tân Vũ đã duyệt trước đó chưa chứng minh đủ danh mục PHP.
- MVN là công ty mẹ của nhiều pháp nhân; phải xác định chuỗi đến tài sản thay vì gán khai thác trực tiếp toàn hệ thống.
- Với GMD, cần tách Nam Hải ICD khỏi cảng Nam Hải lịch sử và kiểm tra giao dịch thoái vốn. Các cơ sở ICD được trình bày riêng.
- Công trình trong kế hoạch/mở rộng không tự được coi là bến đã vận hành. Không gộp toàn khu Cái Lân hoặc Đình Vũ cho một doanh nghiệp vì trùng địa danh.

Chỉ nghiệm thu độ phủ khi từng hồ sơ có danh mục tài sản đối chiếu, nguồn, hiệu lực, quyết định duyệt và các khoảng trống được nêu rõ. Thu thập đủ PDF hoặc tests đạt chưa đáp ứng bước này. Không triển khai Slice 2–5 trong đợt này.
