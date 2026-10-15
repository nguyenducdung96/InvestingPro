# Hồ sơ rà soát catalog Slice 1

Đây là đầu vào nghiên cứu cho import thủ công, không phải dữ liệu đã được công bố. Không được dùng file này để hardcode danh mục trên giao diện hoặc tự động chuyển proposal thành `verified`.

## Phạm vi

Người dùng cung cấp ảnh danh mục 15 mã: GMD, PHP, VGR, DVP, PDN, CDN, CQN, DXP, PSP, PAP, SGP, QNP, QSP, NAP, MVN. Danh sách này là mức đối chiếu tối thiểu, không phải bằng chứng rằng thị trường chỉ có 15 doanh nghiệp cảng.

Phạm vi yêu cầu vẫn gồm doanh nghiệp trên HOSE/HNX/UPCoM có quan hệ với cảng biển và cảng sông, kể cả sở hữu gián tiếp. ICD hiển thị riêng. Doanh nghiệp khai thác, doanh nghiệp sở hữu và cảng/bến vật lý là các thực thể khác nhau.

Phạm vi chính đã chốt thêm: cảng thương mại và doanh nghiệp sở hữu cảng/ICD; bến chuyên dùng của nhà máy thuộc nhóm bổ sung riêng. Không đưa mọi doanh nghiệp logistics hoặc mọi khoản đầu tư cổ phiếu vào quan hệ tài sản cảng khi chưa có bằng chứng phù hợp.

## Tài liệu và trạng thái

`listed-port-baseline.json` lưu từng hồ sơ đối chiếu, liên kết tài liệu gốc, SHA-256, thời điểm tải thật và các điểm phải rà soát. Cả 15 hồ sơ hiện có tài liệu ứng viên. Các trường `pending`, `to_verify` và `current_2026_changes_reviewed: false` được giữ nguyên cho đến khi hoàn tất kiểm tra tương ứng.

Đã thu thập 30 PDF công khai cho đợt nghiên cứu rộng hơn. Chúng không đồng nghĩa 30 nguồn đã được duyệt. Hai file PHP gồm một phần báo cáo và bản đầy đủ; hồ sơ baseline chỉ tham chiếu bản đầy đủ. Các bản scan có OCR để tìm trang; OCR không phải kết quả xác minh.

Raw files và ảnh review ở `.local/catalog-research/`, không commit vào Git. Script `scripts/index-catalog-evidence.py` lập chỉ mục và tên object theo hash, không upload hay cấp phép nguồn. `scripts/read-catalog-pdf.py` hỗ trợ đọc/render/OCR ngoại tuyến, không nhập dữ liệu vào database.

Đã upload đủ 30 PDF vào `investing-pro-evidence-staging/catalog-evidence/sha256/` và đối chiếu thấy đủ 30 key mới trên hai trang danh sách object. Bucket giữ riêng tư. `evidence-artifacts.json` lưu metadata từng file: bản VGR đã tải ngược và SHA-256 khớp; 29 bản còn lại chưa đối chiếu tải ngược. Trạng thái lưu trữ không thay thế duyệt quyền sử dụng hoặc duyệt quan hệ doanh nghiệp–tài sản.

## Đợt nhập proposals registry và VGR

Đã chuyển 11 quan sát HNX/UPCoM thành proposals thật trong Supabase staging: CDN, DXP, NAP, PHP, VGR, CQN, PSP, PAP, SGP, QSP, MVN. Mười pháp nhân được thêm ở quality incomplete; PHP tái sử dụng ID thật đã tồn tại. Không sửa entity PHP đã xác minh. Đã lưu riêng 11 snapshot DOM vào R2 theo SHA-256; các snapshot không được hiển thị công khai hoặc dùng để nhập dữ liệu giá.

- `registry-proposals-manifest.json`: nguồn, tên pháp nhân, ngày giao dịch đầu tiên, thời điểm quan sát thật, hash/key và ID từng proposal.
- `registry-import-receipt.json`: biên nhận 11 upload thành công và kết quả SQL cloud: 11 listing pending, 1 operator proposal pending, hai nguồn to_verify.
- `supabase/imports/hnx_registry.proposals.sql`: import có thể chạy lại; không tự duyệt nguồn, entity hay listing. `scripts/compile-registry-proposals.py` biên dịch ngoại tuyến và kiểm tra quan sát khớp raw snapshot.
- `supabase/imports/vgr_operator.proposal.sql`: đề xuất VGR khai thác đúng bến Container Vip Greenport theo trang PDF 1–2 báo cáo năm 2025, mốc lịch sử 27/11/2015 được nêu rõ. Không gộp với bến Greenport; ownership_pct giữ NULL. Bổ sung mã doanh nghiệp/website vào hồ sơ chưa duyệt bằng đúng bằng chứng báo cáo.

Hồ sơ nguồn HNX có ghi yêu cầu liên hệ khi phát hành thông tin website; chưa xác minh quyền phát hành cho dự án. Nguồn báo cáo VGR cũng giữ to_verify. Vì vậy các bản ghi mới chưa được duyệt và chưa xuất hiện trong registry công khai. Không thay đổi quyền nguồn chỉ để làm danh sách có dữ liệu. Cần chốt phạm vi sử dụng hoặc tài liệu gốc thay thế phù hợp, kiểm tra biến động sau kỳ báo cáo và duyệt bằng phiên admin. Đây chưa phải nghiệm thu đầy đủ 15 mã hay toàn thị trường; GMD, DVP, PDN, QNP vẫn chưa có listing proposal trong đợt này.

## Quy trình duyệt mỗi hồ sơ

`registry-exchange-observations.json` lưu lần đối chiếu trực tiếp 11 hồ sơ HNX/UPCoM. Đây là dữ kiện nghiên cứu, chưa phải listing được duyệt và không cấp phép phát hành dữ liệu website HNX. Ngày giao dịch đầu tiên khác ngày quyết định đăng ký; ví dụ PHP cần giữ riêng ngày giao dịch 14/09/2022 với ngày 06/09/2022 nêu trong báo cáo.

Catalog pháp lý đã được mở rộng riêng bằng hồ sơ 505 trong `supabase/imports/data/`: 17 nhóm cảng, 59 bến, 167 mục cầu. 58 định danh mới đã duyệt qua UI staging, không suy ra quan hệ doanh nghiệp. Bến Thủy giữ số 1, 3, 6; Phước An giữ 5, 6, 7; không tự lấp số còn thiếu. Nhóm pháp lý “cảng biển” trong văn bản không tự xác định vị trí địa lý biển/sông của từng bến.

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
