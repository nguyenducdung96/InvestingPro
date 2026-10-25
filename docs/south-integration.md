# Miền Nam: Gemalink và các phạm vi SGP

## Phạm vi bản tích hợp 25/10/2026

- `/industries/ports/south`: tổng quan tháng/quý, vào/rời, DWT ghi nhận và YoY; các mã chờ nguồn vẫn hiện, không có tổng khu vực.
- `/companies/GMD`: mặc định Nam Đình Vũ + Gemalink; `plan_asset=gemalink` xem riêng Gemalink. `plan_asset=gmd` hoặc `nam_dinh_vu` giữ chuỗi Hải Phòng cũ. Không thêm Gemalink vào tổng quan phía Bắc.
- `/companies/SGP`: bốn phạm vi được ghép: Sài Gòn–Hiệp Phước, CMIT, SP-PSA, SSIT. Chưa gồm Tân Thuận và mọi bến SGP. Không nhân DWT theo tỷ lệ vốn hoặc gọi đây là kết quả hợp nhất.
- Dung Quất giữ phần công bố chọn lọc đã làm; chuỗi định kỳ để ngỏ theo quyết định người dùng. Bình Dương, Phước Long, Nam Hải ICD chưa có chuỗi được ghép. Không gán bến phao Gemadept vào Phước Long hoặc Nam Hải Đình Vũ vào GMD.

## Bằng chứng và ngữ nghĩa

Nguồn lịch: https://cangvuhanghaitphcm.gov.vn/index.aspx?page=shipschedule&cat=3146 . Đọc GET công khai để lấy trạng thái form, POST theo đúng bộ chọn ngày Telerik; kiểm tra cả ngày yêu cầu, ngày được chọn và tiêu đề hiển thị. Đã đối chiếu thao tác bộ chọn ngày trên trình duyệt. Không cần đăng nhập hoặc vượt CAPTCHA. Nếu schema/ngày thay đổi thì từ chối bản mới, giữ bản thành công cũ với lỗi cập nhật riêng.

Nhận diện cầu theo danh mục trong bản đồ công khai https://kehoach.cangvuhanghaitphcm.gov.vn/welcome . API được chính trang này gọi tại backend phuongdinh.name.vn; không chứng nhận backend là sở hữu cơ quan nhà nước. Chỉ dùng danh mục cầu, không dùng các dòng NEO làm sự kiện. Bằng chứng tên cầu và quan hệ báo cáo doanh nghiệp 2025 lưu trong `catalog-review/south-source-review-20261025.json`. Không xác nhận ngày hiệu lực sở hữu lịch sử hoặc nâng quyền nguồn/fact-review trong catalog.

Gemalink khớp duy nhất `CAI MEP GEMADEPT-TERMINAL LINK`. Hiệp Phước khớp cầu số 1–3 SG-HP; CMIT, SP-PSA, SSIT theo danh sách chính xác trong `south-plans.ts`. Không fuzzy-match tên cảng. Các nhãn có liên quan doanh nghiệp được kiểm tra trong báo cáo GMD và SGP 2025; chúng thể hiện phạm vi quan hệ theo báo cáo, không phải tỷ lệ sở hữu ở từng thời điểm quá khứ.

`authority_published_plan`, `actual_verified=false`. Chỉ mục đến/rời được dùng; loại mục di chuyển nội cảng. Ngày là ngày bảng lịch được công bố; giờ đến VT/rời SG theo cột nguồn, không phải ATB/ATD từng cầu. Hai chiều tách riêng, không coi là tàu ghé duy nhất hoặc hàng hóa thông qua cảng. Giữ dấu `*` và các ô nguồn trong nhật ký; tên tàu hiển thị bỏ dấu đánh dấu này.

## Lịch sử và tái lập

Đã kiểm tra 662 ngày từ 01/01/2025 đến 24/10/2026, không lỗi tải trong bản đầu. Gemalink: 1.838 dòng từ 23/07/2025; Hiệp Phước: 535 dòng từ 04/01/2025; CMIT: 2.561 dòng từ 09/07/2025; SP-PSA: 679 dòng từ 01/08/2025; SSIT: 962 dòng từ 23/07/2025. Đây là tổng dòng hai chiều, không phải số lượt tàu ghé. Sự xuất hiện muộn của nhãn trong nguồn không xác nhận cảng bắt đầu khai thác vào ngày đó.

`python scripts/collect-south-plans.py --workers 3 --refresh-recent 4` thu thập đến ngày hôm qua theo giờ Việt Nam, kiểm tra lại ngày gần nhất, lưu raw HTML gzip theo SHA-256 tại `.local/south-plans/archive`. `python scripts/export-south-plans.py` đọc lại archive, kiểm tra hash và kết quả parse, xuất daily subtotal gọn, 22 module nhật ký tháng tải riêng và ledger tháng độc lập. Dòng có giờ không đọc được được cách ly; trùng khóa tàu/hô hiệu/giờ/tuyến cần duyệt sẽ chặn export. Không điền giờ 00:00 hoặc DWT từ GT. DWT trống/0/không hợp lệ giữ null.

Các tổng ghi nhận cộng dòng và DWT có bằng chứng dù thiếu ngày/trọng tải; YoY dùng hai số hiển thị khi nền dương. Không có quan sát vẫn là null. Tổng đủ độ phủ/API strict giữ riêng và chưa chứng nhận đủ toàn phạm vi. GMD gộp nguồn Hải Phòng và TP.HCM giữ phần đóng góp sẵn có khi một nguồn lỗi; nhật ký từng nguồn dẫn đúng hash của chính nguồn đó.

API: `/api/v1/industries/ports/south`, `/api/v1/companies/SGP/plans?asset=sgp`, `/api/v1/companies/GMD/plans?asset=gemalink` hoặc `gmd_all`. Thêm `day=YYYY-MM-DD` để lấy nhật ký có nguồn. GMD API không có asset tiếp tục giữ default Hải Phòng cũ để tương thích; UI mặc định phạm vi hai cảng mới.

Workflow `south-plans.yml` được cấu hình cập nhật và commit bản dữ liệu vào nhánh staging lúc 08:35 Việt Nam. Workflow chưa có trên default main tại lần kiểm tra 25/10; chưa xác minh chạy định kỳ trên GitHub. Bản ứng dụng đã triển khai cloud và có biên nhận riêng. Bản dữ liệu hoạt động là một edition trong build, không tự thay đổi trên bản deploy nếu chưa có build mới. Không thay đổi quyền nguồn, dữ liệu catalog đã duyệt hoặc RLS. Nguồn công khai chưa đồng nghĩa quyền tái phân phối được phê duyệt.

## Phần ngành còn mở

Danh sách miền Nam hiện là danh sách mục tiêu triển khai, chưa phải toàn bộ thị trường: PDN cần lịch Long Bình Tân/Gò Dầu và alias cầu; CLL cần đúng phạm vi CLL trong Cát Lái; TCL cần phân biệt dịch vụ xếp dỡ với cảng; SWC cần nguồn cảng sông Long Bình; TCW cần xác định phạm vi bến phù hợp; VGP cần xác minh chức năng hiện hành. Tiếp tục kiểm tra nhóm VTP/ILB/IST và doanh nghiệp mẹ/liên doanh trước khi bổ sung, tránh coi mọi mã logistics là doanh nghiệp cảng biển. Tỷ lệ hoàn thiện phải đo theo từng cảng/cầu mục tiêu, không đo bằng số connector hoặc số dòng.

Miền Bắc giữ các phạm vi đã tích hợp, miền Trung giữ CDN/QNP/CMP/NAP và Dung Quất chọn lọc. Việc hoàn thiện ngành vẫn cần nguồn cho các phạm vi còn mở, xác minh cập nhật định kỳ thực tế, và kiểm tra API/UI trên môi trường được triển khai. Không tuyên bố hoàn tất toàn quốc từ bản tích hợp này.

## Kiểm tra tại máy phát triển

Ngày 25/10/2026: 5 kiểm tra parser Python, toàn bộ 164 kiểm tra Vitest, lint, typecheck và Next production build đã qua. 16 ca E2E liên quan trên desktop/mobile đã qua qua các lần chạy mục tiêu: miền Nam, miền Bắc, Hải Phòng, miền Trung/CDN, Dung Quất và danh mục biên tập. Kiểm tra ledger đối chiếu mọi tháng/cảng/chiều với nhật ký; kiểm tra giao diện gồm bộ lọc, ngày thiếu, YoY, provenance thu gọn, hai giao diện màu và không tràn ngang. Không phải kết quả chạy toàn bộ E2E.

`pnpm build:cloudflare` qua phần Next build nhưng dừng khi OpenNext tạo symlink với `EPERM` trên Windows. Máy chưa có WSL. Sau đó đã push head `f862368` và triển khai bằng Cloudflare Workers Builds Linux; API/UI staging đã đối chiếu trực tiếp lúc 05:58 UTC ngày 25/10/2026. Xem `catalog-review/south-staging-20261025.json`. Chưa xác minh cron GitHub hoặc nghiệm thu production.
