# Tiến độ ngành cảng — 25/10/2026

## Trạng thái hiện hành sau Gemalink/SGP

Ứng dụng đã được triển khai và đối chiếu trực tiếp trên [web staging](https://investing-pro-web-staging.tuyenkinhmon88.workers.dev/industries/ports/south). Code tính năng `3395d39`; head triển khai `f8623688a7dc57d015d5a42b58d1c68c26c78881` đã gộp bản cập nhật QNP `8437f26`. Cloudflare build `824a481c-e75f-4d1d-813f-11fc843c0c1d`. Biên nhận: [south-staging-20261025.json](catalog-review/south-staging-20261025.json).

Hiện có 14 mã có ít nhất một phạm vi được tích hợp; đây không phải 14 doanh nghiệp đã phủ mọi tài sản. Không dùng tỷ lệ mã hoặc số dòng để kết luận hoàn thiện toàn ngành.

- Miền Bắc: 9 mã PHP, DVP, VGR, VSC, GMD tại Nam Đình Vũ, HAH, DXP, PSP, CQN. Giữ phạm vi bến đã làm; CQN là kế hoạch cập/rời cầu, khác lượt vào/rời vùng cảng. VGR/VSC chia sẻ VIP Greenport, không cộng trùng vào tổng khu vực.
- Miền Trung: CDN/Tiên Sa, QNP, CMP, NAP có chuỗi. NAP gồm Cửa Lò/Bến Thủy. GMD–Dung Quất giữ công bố chọn lọc và quan sát bổ trợ; người dùng đã đồng ý để ngỏ chuỗi định kỳ, không tiếp tục coi đây là điều kiện chặn mở rộng.
- Miền Nam: Gemalink/GMD và 4 phạm vi SGP gồm Sài Gòn–Hiệp Phước, CMIT, SP-PSA, SSIT. Đã có tổng quan miền Nam. GMD có tổng quan Nam Đình Vũ + Gemalink và chọn từng cảng; tổng quan miền Bắc vẫn chỉ lấy Nam Đình Vũ.
- Phạm vi chưa có chuỗi: Bình Dương, Phước Long và Nam Hải ICD của GMD; Tân Thuận và các bến SGP còn lại; PDN, CLL, TCL, SWC, TCW, VGP trong danh sách mục tiêu miền Nam. VTP/ILB/IST và các công ty mẹ/liên doanh cần rà phạm vi trước khi bổ sung.

## Dữ liệu và kiểm chứng

Nguồn miền Nam: 662 bảng ngày từ 01/01/2025 đến 24/10/2026; 6.575 dòng lịch đến/rời được ghép, trong đó Gemalink 1.838 dòng và 4 phạm vi SGP 4.737 dòng. Đây không phải số tàu ghé duy nhất hoặc actual đã xác minh. Các mục di chuyển nội cảng và snapshot vị trí không được cộng vào chỉ tiêu.

Đã đối chiếu API live 22 tháng, hai chiều của cả 5 phạm vi với ledger; kiểm tra tổng 4 phạm vi SGP, tổng GMD hai cảng, bảng miền Nam và nhật ký Gemalink ngày 24/10. Đã đọc giao diện miền Nam/GMD/SGP trên staging. Miền Nam theo `authority_published_plan`; không lấy DWT làm tấn hàng.

Kiểm thử tính năng: 164 Vitest, 5 kiểm tra parser Python, 16 ca E2E liên quan desktop/mobile, lint, typecheck và Next build đã qua. Sau khi gộp dữ liệu QNP mới, 12 kiểm tra QNP/miền Trung/ledger miền Nam đã qua. Không phải kết quả chạy toàn bộ E2E ở head triển khai. OpenNext local vướng symlink Windows; bản Linux Cloudflare đã triển khai được và API/UI live đã kiểm chứng. Không đồng nghĩa nghiệm thu production, quyền nguồn hoặc cron tự động.

Quy tắc hiển thị vẫn theo AGENTS.md: giữ tổng số dòng và DWT ghi nhận, tháng/quý/YTD/YoY dù thiếu ngày/trọng tải; kỳ không có quan sát giữ null. Tháng hiện tại có cửa sổ cập nhật. Chất lượng thu gọn; raw null, provenance và tổng đủ độ phủ giữ riêng. Không cộng phạm vi chồng lấn hoặc nhân hoạt động theo tỷ lệ vốn.

## Next steps theo thứ tự ưu tiên

1. **Chốt cập nhật tự động cho phạm vi đang có — đang vướng kết nối nguồn miền Nam.** `south-plans.yml` đã đăng ký trên default `main` (head `4fad560`) với checkout nhánh staging, lịch 08:35 Việt Nam. Đã thêm giữ bản tốt cuối khi bootstrap lỗi, chặn mất lịch sử khi cache lạnh, lưu biên nhận lỗi và chờ deploy/readback đúng phiên bản sau commit. Các lần thử GitHub đều timeout, chưa có bản dữ liệu mới từ workflow. Kiểm tra HTTPS thực từ Cloudflare Singapore cũng timeout; chưa thêm Cron Trigger hoặc storage khi chưa chứng minh được đường thu thập hoạt động. Chỉ dùng GitHub/Cloudflare theo quyết định người dùng, không dựng máy chủ hoặc lịch phụ thuộc máy cá nhân. Chi tiết tại [kiểm tra vận hành](port-refresh-operations-20261025.md). Dung Quất tiếp tục để ngỏ.
2. **Ưu tiên PDN cho đợt dữ liệu miền Nam kế tiếp.** Rà nguồn chính thức Long Bình Tân/Gò Dầu A/B và nhãn cầu; lập ma trận cầu–nguồn–khoảng thời gian. Chỉ ghép khi có bằng chứng, không coi kế hoạch/snapshot là actual. Mục tiêu bàn giao: chuỗi dùng được, API/dashboard, refresh và staging readback.
3. **Bù phạm vi GMD/SGP rồi mở rộng các mã còn lại.** Bình Dương/Phước Long và Tân Thuận phải có nguồn riêng; không gán bến phao hoặc cảng tên gần giống. Với CLL/TCL, phân biệt đúng phạm vi khai thác và dịch vụ xếp dỡ. Với SWC/TCW/VGP, xác định loại hình cảng sông/ICD/kho và chức năng hiện hành trước khi đưa vào cùng thước đo.
4. **Hoàn thiện góc nhìn đầu tư bằng tấn hàng/TEU.** Mở rộng chuỗi sản lượng doanh nghiệp công bố, tháng/quý/YTD/YoY và đối chiếu với xu hướng tàu/DWT. Giữ sản lượng, trọng tải thiết kế và dữ liệu tài chính thành các thước đo riêng. Chưa suy lượng hàng hoặc doanh thu từ DWT.
5. **Nghiệm thu toàn bộ sản phẩm.** Kiểm tra danh sách cảng/bến mục tiêu, quy tắc quan hệ theo kỳ, quyền nguồn, bộ lọc/tháng đang cập nhật/null/YoY, RLS và giao diện desktop/mobile. Chạy bộ E2E đầy đủ và kiểm tra môi trường phát hành dự kiến. Chỉ ghi nhận hoàn thiện theo phạm vi có bằng chứng; chưa tuyên bố toàn quốc hoặc production.

Bước kế tiếp nên làm là mục 1, sau đó PDN. Tiếp tục để ngỏ GMD–Dung Quất theo quyết định đã thống nhất.

## Tài liệu liên quan

- [Miền Nam và Gemalink/SGP](south-integration.md)
- [Dung Quất: công bố chọn lọc](dungquat-integration.md)
- [NAP](nap-integration.md), [CMP](cmp-integration.md), [QNP](qnp-integration.md)
- [Hướng phát triển sản phẩm](port-investment-roadmap-review.md)

Các trạng thái trước Gemalink/SGP trong lịch sử Git là snapshot lịch sử; tài liệu này thay thế thứ tự ưu tiên cũ yêu cầu giải quyết Dung Quất trước miền Nam.
