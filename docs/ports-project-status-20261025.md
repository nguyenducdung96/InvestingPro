# Tiến độ ngành cảng — 25/10/2026

## Trạng thái hiện hành sau PDN

PDN đã được triển khai trên [web staging](https://investing-pro-web-staging.tuyenkinhmon88.workers.dev/companies/PDN). Code tính năng `5cc2b57`, bản nén nhật ký `ebd80b4`; head ứng dụng đã kiểm chứng `0fd6401`. Cloudflare build `5139c6bd-c526-4c27-8156-b0b64ca2babf` thành công. [Refresh GitHub 40199794476](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40199794476) đã thu thập, kiểm tra, commit dữ liệu `297c58d`, chờ deploy và đối chiếu live thành công. Biên nhận: [pdn-staging-20261025.json](catalog-review/pdn-staging-20261025.json). Lịch tự động PDN đã đăng ký nhưng chưa có hai chu kỳ `schedule` thật để chứng nhận cron.

Hiện có 15 mã có ít nhất một phạm vi được tích hợp; đây không phải 15 doanh nghiệp đã phủ mọi tài sản. Không dùng tỷ lệ mã hoặc số dòng để kết luận hoàn thiện toàn ngành.

- Miền Bắc: 9 mã PHP, DVP, VGR, VSC, GMD tại Nam Đình Vũ, HAH, DXP, PSP, CQN. Giữ phạm vi bến đã làm; CQN là kế hoạch cập/rời cầu, khác lượt vào/rời vùng cảng. VGR/VSC chia sẻ VIP Greenport, không cộng trùng vào tổng khu vực.
- Miền Trung: CDN/Tiên Sa, QNP, CMP, NAP có chuỗi. NAP gồm Cửa Lò/Bến Thủy. GMD–Dung Quất giữ công bố chọn lọc và quan sát bổ trợ; người dùng đã đồng ý để ngỏ chuỗi định kỳ, không tiếp tục coi đây là điều kiện chặn mở rộng.
- Miền Nam: PDN tại Long Bình Tân, Gò Dầu A/B; Gemalink/GMD và 4 phạm vi SGP gồm Sài Gòn–Hiệp Phước, CMIT, SP-PSA, SSIT. Đã có tổng quan miền Nam. GMD có tổng quan Nam Đình Vũ + Gemalink và chọn từng cảng; tổng quan miền Bắc vẫn chỉ lấy Nam Đình Vũ.
- Phạm vi chưa có chuỗi: Bình Dương, Phước Long và Nam Hải ICD của GMD; Tân Thuận và các bến SGP còn lại; CLL, TCL, SWC, TCW, VGP trong danh sách mục tiêu miền Nam. VTP/ILB/IST và các công ty mẹ/liên doanh cần rà phạm vi trước khi bổ sung.

## Dữ liệu và kiểm chứng

PDN: 662 ngày / 1.986 phản hồi vào, rời và điều chuyển; 19.760 dòng ghép gồm 58 điều chuyển giữa các bến PDN giữ riêng. Có tháng/quý/YTD/YoY, nhật ký 90 ngày, chọn ngày và 5 phạm vi PDN/Long Bình Tân/Gò Dầu A+B/A/B. Đối chiếu live 22 tháng, hai chiều, năm phạm vi và bảng miền Nam đều khớp ledger. Nguồn công bố ghi nhận ít dòng Long Bình Tân hơn từ 7/2026; nguyên nhân chưa xác minh, đã lưu ở chi tiết chất lượng/API, không suy thành biến động hoạt động thực tế.

Nguồn TP.HCM cho Gemalink/SGP: 662 bảng ngày từ 01/01/2025 đến 24/10/2026; 6.575 dòng lịch đến/rời được ghép, trong đó Gemalink 1.838 dòng và 4 phạm vi SGP 4.737 dòng. Đây không phải số tàu ghé duy nhất hoặc actual đã xác minh. Các mục di chuyển nội cảng và snapshot vị trí không được cộng vào chỉ tiêu.

Đã đối chiếu API live 22 tháng, hai chiều của cả 5 phạm vi với ledger; kiểm tra tổng 4 phạm vi SGP, tổng GMD hai cảng, bảng miền Nam và nhật ký Gemalink ngày 24/10. Đã đọc giao diện miền Nam/GMD/SGP trên staging. Gemalink/SGP theo `authority_published_plan`; PDN theo `authority_published_berth_plan` với tuyến từ khu neo đến cầu đã ghép; không lấy DWT làm tấn hàng.

Kiểm thử PDN tại `0fd6401`: toàn bộ CI đã qua 172 Vitest, 70 E2E desktop/mobile, gồm hai ca PDN kiểm tra bộ lọc và bằng chứng giờ nguồn, lint, typecheck, Next build và OpenNext Linux build; parser Python mới có 7 kiểm tra qua. Bản nén giải mã khớp toàn bộ JSON trước nén; đường cache lạnh với chỉ 21 phản hồi mới giữ nguyên 22 tháng. Không đồng nghĩa cron tự động đã được nghiệm thu.

Kiểm thử bàn giao Gemalink/SGP trước PDN: 164 Vitest, 5 kiểm tra parser Python, 16 ca E2E liên quan desktop/mobile, lint, typecheck và Next build đã qua. Sau khi gộp dữ liệu QNP mới, 12 kiểm tra QNP/miền Trung/ledger miền Nam đã qua. Đây là bằng chứng lịch sử của lần bàn giao Gemalink/SGP, khác đợt CI PDN nêu trên. OpenNext local vướng symlink Windows; bản Linux Cloudflare đã triển khai được và API/UI live đã kiểm chứng. Không đồng nghĩa nghiệm thu production, quyền nguồn hoặc cron tự động.

Quy tắc hiển thị vẫn theo AGENTS.md: giữ tổng số dòng và DWT ghi nhận, tháng/quý/YTD/YoY dù thiếu ngày/trọng tải; kỳ không có quan sát giữ null. Tháng hiện tại có cửa sổ cập nhật. Chất lượng thu gọn; raw null, provenance và tổng đủ độ phủ giữ riêng. Không cộng phạm vi chồng lấn hoặc nhân hoạt động theo tỷ lệ vốn.

## Next steps theo thứ tự ưu tiên

1. **Chốt cập nhật tự động cho phạm vi đang có — đang vướng kết nối nguồn miền Nam.** `south-plans.yml` đã đăng ký trên default `main` (head `4fad560`) với checkout nhánh staging, lịch 08:35 Việt Nam. Đã thêm giữ bản tốt cuối khi bootstrap lỗi, chặn mất lịch sử khi cache lạnh, lưu biên nhận lỗi và chờ deploy/readback đúng phiên bản sau commit. Các lần thử GitHub đều timeout, chưa có bản dữ liệu mới từ workflow. Kiểm tra HTTPS thực từ Cloudflare Singapore cũng timeout; chưa thêm Cron Trigger hoặc storage khi chưa chứng minh được đường thu thập hoạt động. Chỉ dùng GitHub/Cloudflare theo quyết định người dùng, không dựng máy chủ hoặc lịch phụ thuộc máy cá nhân. Chi tiết tại [kiểm tra vận hành](port-refresh-operations-20261025.md). Dung Quất tiếp tục để ngỏ.
2. **PDN đã tích hợp; tiếp tục kiểm chứng cron và độ phủ nguồn.** Có chuỗi 662 ngày / 1.986 phản hồi, 19.760 dòng gồm 58 điều chuyển nội bộ giữ riêng; dashboard/API và tổng quan miền Nam dùng cùng số ghi nhận. GitHub Ubuntu đọc được nguồn Đồng Nai, không gặp blocker TCP của nguồn TP.HCM. Lịch refresh 08:45 Việt Nam đã đăng ký; chỉ ghi nhận cron được nghiệm thu sau hai chu kỳ `schedule` thật kèm live readback. Nguồn ghi nhận ít dòng Long Bình Tân hơn từ 7/2026; nguyên nhân chưa xác minh, không diễn giải YoY số ghi nhận thành biến động toàn bộ hoạt động thực tế. Chi tiết [PDN](pdn-integration.md).
3. **Bù phạm vi GMD/SGP rồi mở rộng các mã còn lại.** Bình Dương/Phước Long và Tân Thuận phải có nguồn riêng; không gán bến phao hoặc cảng tên gần giống. Với CLL/TCL, phân biệt đúng phạm vi khai thác và dịch vụ xếp dỡ. Với SWC/TCW/VGP, xác định loại hình cảng sông/ICD/kho và chức năng hiện hành trước khi đưa vào cùng thước đo.
4. **Hoàn thiện góc nhìn đầu tư bằng tấn hàng/TEU.** Mở rộng chuỗi sản lượng doanh nghiệp công bố, tháng/quý/YTD/YoY và đối chiếu với xu hướng tàu/DWT. Giữ sản lượng, trọng tải thiết kế và dữ liệu tài chính thành các thước đo riêng. Chưa suy lượng hàng hoặc doanh thu từ DWT.
5. **Nghiệm thu toàn bộ sản phẩm.** Kiểm tra danh sách cảng/bến mục tiêu, quy tắc quan hệ theo kỳ, quyền nguồn, bộ lọc/tháng đang cập nhật/null/YoY, RLS và giao diện desktop/mobile. Chạy bộ E2E đầy đủ và kiểm tra môi trường phát hành dự kiến. Chỉ ghi nhận hoàn thiện theo phạm vi có bằng chứng; chưa tuyên bố toàn quốc hoặc production.

PDN đã được thực hiện theo yêu cầu. Bước tiếp theo là kiểm chứng cron của nguồn Đồng Nai, tiếp tục xử lý đường nguồn TP.HCM và rà CLL/TCL theo phạm vi thực tế. Tiếp tục để ngỏ GMD–Dung Quất theo quyết định đã thống nhất.

Rà đường nguồn TP.HCM sau đó: [chẩn đoán kết nối và nguồn thay thế](hcm-source-connectivity-20261025.md). Đã thử thêm Windows/ARM và Cloudflare Placement Bangkok; IP nguồn chính vẫn không truy cập được từ cloud. Bản đồ/API liên quan truy cập được nhưng đối chiếu chỉ có 5/17 dòng kế hoạch cùng ngày, lịch sử mẫu chỉ NEO; chưa thay chuỗi gốc. Cấu hình Placement thử nghiệm đã được khôi phục mặc định.

Rà phương án serverless tiếp theo: [quyết định đường dữ liệu chuẩn](hcm-source-access-decision.md). Đã deploy probe JWT riêng trên Supabase bằng phiên CLI sẵn có và kiểm chứng Singapore/Tokyo/Mumbai; cả ba timeout tới nguồn chính. Chưa nối probe vào luồng nghiệp vụ. Ưu tiên feed/API/file ngày do phía nguồn hỗ trợ hoặc khôi phục đường truy cập cloud; chưa mua dịch vụ egress, chưa tuyên bố đã khắc phục tự động.

## Tài liệu liên quan

- [PDN · Long Bình Tân/Gò Dầu](pdn-integration.md)
- [Miền Nam và Gemalink/SGP](south-integration.md)
- [Dung Quất: công bố chọn lọc](dungquat-integration.md)
- [NAP](nap-integration.md), [CMP](cmp-integration.md), [QNP](qnp-integration.md)
- [Hướng phát triển sản phẩm](port-investment-roadmap-review.md)

Các trạng thái trước PDN trong lịch sử Git là snapshot lịch sử; tài liệu này thay thế thứ tự ưu tiên cũ yêu cầu giải quyết Dung Quất trước miền Nam.
