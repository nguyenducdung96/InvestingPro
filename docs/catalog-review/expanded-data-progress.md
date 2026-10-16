# Bộ hồ sơ doanh nghiệp mở rộng — 15/10/2026

**Cập nhật 16/10:** bộ nghiên cứu đã tăng lên **41 hồ sơ / 62 quan sát tài sản / 36 bến pháp lý duy nhất được khớp / 22 đường liên hệ gián tiếp**. Các con số 29/42/32/18 ở phần lịch sử dưới đây là đợt trước. Còn 57 quan sát chưa có ngày hiệu lực chính xác. Không diễn giải 62 quan sát thành 62 tài sản hoặc 62 quan hệ đã được công bố.

Đã bổ sung báo cáo doanh nghiệp cho PVS, ILB, STG, TMS, CMP, CLL, PQN, PSN, VLG, TCW, GIC, VMS. Sáu báo cáo cuối lấy trực tiếp từ file công bố trên HNX; nguồn và hash nằm trong `evidence-artifacts.json`. Hai đề xuất ICD ILB/VLG có bằng chứng ngày riêng, giữ phân biệt cấp phép với ngày khai thác thực tế. Bộ nhập `supabase/imports/slice1_company_catalog.handoff.sql` gộp 41 định danh, 40 listing histories, 9 đề xuất quan hệ VGR/DVP/PAP/ILB/VLG và sửa tên GIC khi hồ sơ vẫn nguyên trạng chờ duyệt. Yêu cầu catalog pháp lý đã được nhập trước. Toàn bộ chưa chạy cloud và không tự công bố.

Đây là dữ liệu nghiên cứu có đối chiếu báo cáo doanh nghiệp, chưa phải dữ liệu đã công bố trên staging. Slice 1 **chưa nghiệm thu đầy đủ** theo phạm vi toàn bộ doanh nghiệp cảng biển/cảng sông, ICD riêng và tài sản trực thuộc mà người dùng yêu cầu. Không thay đổi Slice 2–5.

## Kết quả đợt trước (29 hồ sơ, để đối chiếu lịch sử)

- 29 hồ sơ doanh nghiệp: CAG, CCP, CCR, CCT, CDN, CPI, CQN, DVP, DXP, GMD, HAH, IST, MVN, NAP, PAP, PDN, PHP, PNP, PSB, PSP, QNP, QSP, SGP, SWC, TCL, TNP, VGP, VGR, VSC.
- 42 quan sát tài sản trong các hồ sơ, khớp 32 bến thuộc danh mục pháp lý đã nhập trước đó. Đây là số quan sát, **không phải 42 tài sản duy nhất**, không phải 42 quan hệ được công bố.
- Năm quan sát ICD và ba cơ sở cảng sông có tên được giữ riêng; còn cần quyết định/danh mục nội địa để khớp định danh. Không biến depot thành ICD hoặc coi bến trong nhóm pháp lý cảng biển là cảng sông chỉ theo vị trí địa lý.
- 18 đường liên hệ gián tiếp nghiên cứu từ MVN qua tám doanh nghiệp có hồ sơ tài sản. Mỗi đường giữ cả bằng chứng MVN và bằng chứng của doanh nghiệp con; không nhân/cộng tỷ lệ vốn thành tỷ lệ sở hữu tài sản, không công bố như quan hệ đã duyệt.
- Bộ SQL `supabase/imports/expanded_issuer_registry.proposals.sql` bổ sung bốn pháp nhân/listing chờ duyệt: CAG (HNX, 04/12/2017), CCR (HNX, 19/11/2021), TCL (HOSE, 24/12/2009), PNP (UPCoM, 17/05/2019). Ngày là ngày giao dịch đầu tiên do doanh nghiệp báo cáo, chưa phải xác nhận trạng thái sàn hiện tại. Chưa chạy bộ SQL này trên cloud.

Nguồn, SHA-256, thời điểm tải, object R2, trang PDF và các điểm chưa xác minh nằm trong `company-portfolios-manifest.json` và `expanded-issuer-registry-manifest.json` cùng thư mục. Đã kiểm tra SHA-256 của byte tải ngược từ R2 cho 80 tệp bằng chứng; xem `r2-additional-readback-20261016.json`. Toàn bộ 50 tệp trong evidence index có bản lưu được kiểm tra. Quyền nguồn và quyết định duyệt dữ kiện vẫn tách biệt với lưu trữ.

## Những phân biệt đã giữ trong dữ liệu

- Cái Lân: CPI → CICT chỉ liên quan các cầu 2–3–4; không gắn toàn bộ bến Cái Lân và không trộn với CQN.
- Cần Thơ: Hoàng Diệu, Cái Cui và cơ sở cảng sông Duyên Hải; Cái Cui mục 296 khác Tân Cảng Cái Cui mục 295.
- CAG: Mỹ Thới và Bình Long; xí nghiệp trực thuộc không tự thành pháp nhân công ty con.
- HAH: quan hệ tới bến Hải An qua Công ty TNHH Cảng Hải An. Pan Hải An là hoạt động kho bãi/bãi container theo trang đã đọc, chưa đủ để gắn nhãn ICD.
- TCL: hoạt động dịch vụ tại ICD và vốn pháp nhân liên quan không đồng nghĩa sở hữu toàn bộ cảng Tân Cảng.
- PSB: bãi thuê/căn cứ công nghiệp nằm nhóm bổ sung; liên doanh đã chấm dứt năm 2012 không được đưa lại thành tài sản hiện tại. Số đăng ký doanh nghiệp cần đối chiếu độc lập.
- QSP: vai trò cho thuê/hợp tác hạ tầng được giữ nguyên, không đổi thành đơn vị khai thác trực tiếp.

## Khoảng trống chưa được che bằng dữ liệu suy đoán

40 trong 42 quan sát chưa xác định được ngày bắt đầu quan hệ chính xác. Compiler không dùng ngày tải, ngày báo cáo, ngày thành lập tiền thân hoặc ngày đầu tháng suy đoán để sinh temporal interest. Các quan hệ có ngày đã đối chiếu VGR/DVP và bộ PAP vẫn giữ bộ import riêng hiện có; không tạo bản trùng từ manifest này.

Universe chưa đóng; bộ định danh và bộ portfolio hiện cùng bao phủ 41 ứng viên, chưa phải xác nhận toàn thị trường. Chi tiết và ngoại lệ tại `issuer-registry-progress-20261016.md`. Dữ liệu báo cáo 2025 không tự được coi là tình trạng tháng 10/2026. Còn thiếu một số cảng sông, ICD, cầu cảng chi tiết, biến động vốn/khai thác, thời hạn và căn cứ nguồn. Không đánh dấu hoàn thành chỉ vì có đủ tên/mã.

## Tái tạo và kiểm tra

Chạy `scripts/compile-expanded-issuer-dossiers.py` bằng Python có sẵn trong môi trường để tạo lại hai manifest và SQL. Cần các PDF gốc trong `.local/catalog-research/`; PDF không được commit hoặc mở public bucket.

Các kiểm tra PostgreSQL/PGlite chạy bộ SQL thực: chống trùng pháp nhân, rollback toàn bộ khi hồ sơ ở giữa xung đột, replay không tạo audit thừa, không sửa tài sản đã duyệt, không tự tạo quan hệ/ngày hiệu lực, và RLS không công bố proposal cho anon. Kiểm tra dữ liệu giữ tập cầu CICT, định danh Chùa Vẽ hiện có, cảng sông/ICD riêng và cả hai nguồn trên đường MVN.

## Trạng thái cloud

Đã hoàn tất lưu bằng chứng riêng tư trên R2 và kiểm tra hash tải ngược. Không có thao tác import dữ liệu chuẩn hóa vào Supabase, duyệt hay công bố trong đợt này. Origin staging đang bị chính sách công cụ từ chối; không dùng SQL/HTTP/CLI để thực hiện lại hành động công bố bị từ chối. Điều này không ngăn nghiên cứu và kiểm tra ngoại tuyến nêu trên, nhưng chưa thể xác nhận dữ liệu mới đã xuất hiện trên website.
