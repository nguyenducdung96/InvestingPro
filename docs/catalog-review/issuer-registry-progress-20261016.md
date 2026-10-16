# Danh mục doanh nghiệp chứng khoán — bộ nghiên cứu 16/10/2026

**Cập nhật danh mục tài sản:** đã đối chiếu báo cáo cho toàn bộ 41 ứng viên hiện có và ghi 62 quan sát tài sản, 22 đường liên hệ gián tiếp. Đây là hồ sơ nghiên cứu, chưa phải đầy đủ tài sản của mọi doanh nghiệp. Bộ nhập chung mới `supabase/imports/slice1_company_catalog.handoff.sql` gồm registry bên dưới, VGR/DVP/PAP và hai đề xuất ICD ILB/VLG (tổng 9 quan hệ chờ duyệt), giữ tách ICD và không phát sinh ngày cho 57 quan sát còn thiếu. Tên GIC được sửa từ LOGISTCS sang Logistics theo báo cáo gốc nếu hồ sơ vẫn nguyên trạng chờ duyệt; không sửa hồ sơ đã xác minh. Bản trích HNX ban đầu vẫn giữ nguyên trong lineage.

Đã gộp sáu bộ nhập thành `supabase/imports/issuer_registry_all.handoff.sql`: **41 định danh doanh nghiệp ứng viên, 40 lịch sử niêm yết/đăng ký giao dịch có ngày cụ thể**. Đây là hồ sơ chờ duyệt, chưa nhập cloud và chưa phải xác nhận đủ mọi doanh nghiệp có cảng tại Việt Nam. Không triển khai Slice 2–5.

Danh sách: CAG, CCP, CCR, CCT, CDN, CLL, CMP, CPI, CQN, DVP, DXP, GIC, GMD, HAH, ILB, IST, MVN, NAP, PAP, PDN, PHP, PNP, PQN, PSB, PSN, PSP, PVS, QNP, QSP, SGP, STG, SWC, TCL, TCW, TMS, TNP, VGP, VGR, VLG, VMS, VSC.

## Nguồn và phạm vi xác minh

Nguồn là hồ sơ HNX, tài liệu HOSE và tài liệu do doanh nghiệp phát hành. Báo cáo 2025 mới bổ sung gồm PVS, ILB, CMP, TMS, STG, CLL; ngày giao dịch HAH dùng báo cáo 2023, ILB dùng niên giám HOSE 2019, TMS dùng lịch sử trên website doanh nghiệp. Bản CLL do doanh nghiệp phát hành nhưng tải từ CDN CafeF, chưa có bản tải trực tiếp từ website doanh nghiệp; không mô tả đó là tài liệu do CafeF phát hành.

16 hồ sơ HNX mới là **bản trích trường được công cụ tìm kiếm lập chỉ mục**, không phải bản HTML tải trực tiếp hoặc trạng thái thị trường thời gian thực. Kiểu thu thập, URL, hash, thời điểm lưu và giới hạn nằm trong `market-issuer-registry-manifest.json`. Bằng chứng danh tính và bằng chứng ngày giao dịch được giữ tách biệt khi đến từ hai tài liệu khác nhau.

`issuer-universe-manifest.json` tổng hợp định danh và trỏ về từng manifest nguồn. Trường không có bằng chứng vẫn là null. Chín hồ sơ HNX cũ được bổ sung bằng chứng mã số doanh nghiệp đọc trực tiếp từ PDF. Bộ nhập chỉ cập nhật hồ sơ chờ duyệt còn nguyên trạng. Trong fixture, 40/41 doanh nghiệp có mã số sau nhập; PHP đã duyệt được giữ nguyên, bằng chứng bổ sung nằm riêng trong hàng chờ. Không coi có tên/mã chứng khoán là đã xác minh mọi trường pháp nhân.

## Các ngoại lệ cần giữ rõ

- STG mới có định danh pháp nhân, chưa tạo listing vì chưa đối chiếu được ngày giao dịch đầu tiên. Có công bố năm 2026 về điều kiện công ty đại chúng; cần quyết định cập nhật, không suy ra tình trạng hiện tại từ báo cáo 2025.
- CCP/CCT có cảnh báo trong hồ sơ quan sát; CPI có thông tin tạm ngừng giao dịch. CMP có công bố về việc không đáp ứng điều kiện công ty đại chúng. Không gắn nhãn cả danh sách đang giao dịch bình thường.
- PSB có tên mới Cảng Kỹ thuật PTSC Sao Mai; VLG có tên VIMC Logistics. Bản trích HNX của GIC ghi VSC GREEN LOGISTCS; bằng chứng đó giữ nguyên. Báo cáo doanh nghiệp ghi Logistics; bộ bổ sung chỉ sửa tên hồ sơ chờ duyệt còn nguyên trạng.
- GIC, TCW, VMS còn cần xác minh phạm vi sở hữu/khai thác cảng hoặc ICD. Không gộp doanh nghiệp dịch vụ kho bãi thành chủ cảng chỉ vì nằm trong nhóm ngành.
- CLL không đại diện toàn bộ cảng Cát Lái của Tân Cảng Sài Gòn. ILB và IST là hai pháp nhân ICD riêng. Các cơ sở chuyên dùng của PSB thuộc nhóm bổ sung.
- Các ngày giao dịch lịch sử không phải ngày bắt đầu sở hữu tài sản. Bộ registry riêng không tạo thêm company_asset_interests; bộ công ty và tài sản chung có 9 đề xuất có ngày, không dùng tỷ lệ vốn công ty làm tỷ lệ sở hữu cầu/bến cảng.

## Bộ nhập và kiểm tra

`scripts/prepare-issuer-registry-handoff.py` tạo bộ SQL chung từ sáu SQL nguồn, giữ nguyên guard chống trùng và một transaction bên ngoài. Không có kết nối database, duyệt nguồn hoặc tự công bố. Nếu có xung đột phải đối chiếu định danh; không bỏ guard để chạy tiếp. Trên bộ fixture hiện tại, kết quả cuối là companies=41 và listing_histories=40; dữ liệu bổ sung ngoài bộ này trên database thật có thể làm số lịch sử lớn hơn.

Kiểm tra PGlite thực thi SQL, ép lỗi ở bộ cuối để xác nhận rollback toàn bộ, chạy lại không thêm audit, giữ hồ sơ PHP và quan hệ đã duyệt, và xác nhận proposal không hiện cho anon. Các tests riêng xác nhận ngày cụ thể, tên đổi, cảnh báo giao dịch và lineage tách biệt.

Đã tải ngược và đối chiếu SHA-256 của 80 tệp từ bucket R2 riêng tư: 50 tệp trong evidence index, 16 bản trích HNX, 11 snapshot HNX và 3 tài liệu HOSE bổ sung. Biên nhận: `r2-additional-readback-20261016.json`. Metadata thu thập ban đầu giữ nguyên; cờ lưu trữ cập nhật sau khi byte tải ngược khớp. Bucket không mở public. Còn căn cứ sử dụng nguồn, biến động 2026, danh mục tài sản và ngày hiệu lực cần đối chiếu trước nghiệm thu toàn bộ Slice 1.

## Trạng thái công bố

Không nhập hoặc công bố dữ liệu mới trên staging trong đợt này. Công cụ đã từ chối thao tác tại origin staging; không dùng SQL/CLI/HTTP làm đường vòng để thực hiện hành động đó. Vì vậy website hiện tại chưa được xác nhận có 41 hồ sơ mới. **Slice 1 chưa hoàn thành toàn bộ dữ liệu theo phạm vi người dùng yêu cầu**, dù bộ phần mềm và bộ nhập ngoại tuyến đã có kiểm thử.
