# Bộ hồ sơ doanh nghiệp mở rộng — 15/10/2026

Đây là dữ liệu nghiên cứu có đối chiếu báo cáo doanh nghiệp, chưa phải dữ liệu đã công bố trên staging. Slice 1 **chưa nghiệm thu đầy đủ** theo phạm vi toàn bộ doanh nghiệp cảng biển/cảng sông, ICD riêng và tài sản trực thuộc mà người dùng yêu cầu. Không thay đổi Slice 2–5.

## Kết quả cụ thể trong bộ này

- 29 hồ sơ doanh nghiệp: CAG, CCP, CCR, CCT, CDN, CPI, CQN, DVP, DXP, GMD, HAH, IST, MVN, NAP, PAP, PDN, PHP, PNP, PSB, PSP, QNP, QSP, SGP, SWC, TCL, TNP, VGP, VGR, VSC.
- 42 quan sát tài sản trong các hồ sơ, khớp 32 bến thuộc danh mục pháp lý đã nhập trước đó. Đây là số quan sát, **không phải 42 tài sản duy nhất**, không phải 42 quan hệ được công bố.
- Năm quan sát ICD và ba cơ sở cảng sông có tên được giữ riêng; còn cần quyết định/danh mục nội địa để khớp định danh. Không biến depot thành ICD hoặc coi bến trong nhóm pháp lý cảng biển là cảng sông chỉ theo vị trí địa lý.
- 18 đường liên hệ gián tiếp nghiên cứu từ MVN qua tám doanh nghiệp có hồ sơ tài sản. Mỗi đường giữ cả bằng chứng MVN và bằng chứng của doanh nghiệp con; không nhân/cộng tỷ lệ vốn thành tỷ lệ sở hữu tài sản, không công bố như quan hệ đã duyệt.
- Bộ SQL `supabase/imports/expanded_issuer_registry.proposals.sql` bổ sung bốn pháp nhân/listing chờ duyệt: CAG (HNX, 04/12/2017), CCR (HNX, 19/11/2021), TCL (HOSE, 24/12/2009), PNP (UPCoM, 17/05/2019). Ngày là ngày giao dịch đầu tiên do doanh nghiệp báo cáo, chưa phải xác nhận trạng thái sàn hiện tại. Chưa chạy bộ SQL này trên cloud.

Nguồn, SHA-256, thời điểm tải, object R2, trang PDF và các điểm chưa xác minh nằm trong `company-portfolios-manifest.json` và `expanded-issuer-registry-manifest.json` cùng thư mục. Hash PDF gốc trên máy được kiểm tra khi biên dịch; điều đó không thay thế kiểm tra hash file tải ngược từ R2. Không gắn cờ R2 đã xác minh khi chưa thực hiện.

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

Universe chưa đóng. Cập nhật 16/10: đã bổ sung báo cáo gốc PVS, ILB, STG và hồ sơ HNX TCW; bộ định danh tổng hợp đạt 41 doanh nghiệp ứng viên, 40 lịch sử giao dịch. Chi tiết và ngoại lệ tại `issuer-registry-progress-20261016.md`. Bộ portfolio 29 doanh nghiệp/42 quan sát ở trên chưa tự mở rộng theo số định danh mới. Dữ liệu báo cáo 2025 không tự được coi là tình trạng tháng 10/2026. Còn thiếu một số cảng sông, ICD, cầu cảng chi tiết, biến động vốn/khai thác, thời hạn và căn cứ nguồn. Không đánh dấu hoàn thành chỉ vì có đủ tên/mã.

## Tái tạo và kiểm tra

Chạy `scripts/compile-expanded-issuer-dossiers.py` bằng Python có sẵn trong môi trường để tạo lại hai manifest và SQL. Cần các PDF gốc trong `.local/catalog-research/`; PDF không được commit hoặc mở public bucket.

Các kiểm tra PostgreSQL/PGlite chạy bộ SQL thực: chống trùng pháp nhân, rollback toàn bộ khi hồ sơ ở giữa xung đột, replay không tạo audit thừa, không sửa tài sản đã duyệt, không tự tạo quan hệ/ngày hiệu lực, và RLS không công bố proposal cho anon. Kiểm tra dữ liệu giữ tập cầu CICT, định danh Chùa Vẽ hiện có, cảng sông/ICD riêng và cả hai nguồn trên đường MVN.

## Trạng thái cloud

Không có thao tác import, duyệt hay công bố cloud trong đợt này. Origin staging đang bị chính sách công cụ từ chối; không dùng SQL/HTTP/CLI để thực hiện lại hành động công bố bị từ chối. Điều này không ngăn nghiên cứu và kiểm tra ngoại tuyến nêu trên, nhưng chưa thể xác nhận dữ liệu mới đã xuất hiện trên website.
