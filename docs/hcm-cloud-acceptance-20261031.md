# Nghiệm thu refresh HCM — 31/10/2026

Người dùng đã yêu cầu tiếp tục nghiệm thu HCM trong chat. Phase này được mở lại; các phần PDN cron, Long Bình Tân, ICD/kho bãi và production không được mở theo.

## Kết luận hiện tại

**Chưa nghiệm thu nguồn cloud hoặc hai chu kỳ lịch.** Nút chặn vẫn là đường mạng từ hosted runner tới website lịch gốc. Không sửa parser, alias, số liệu hay quyền SQL để che lỗi mạng. Chưa biết chính xác nguyên nhân lọc mạng/định tuyến phía nguồn.

- [Probe mới 41184106677](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41184106677) chạy Ubuntu x64 trên nhánh staging: **failure**, bootstrap timeout lúc 08:21:08 UTC (15:21 Việt Nam), `exportable=false`, không export/push dữ liệu.
- [Chẩn đoán 41184128683](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41184128683): Linux ARM và Windows đều phân giải `222.253.45.177`, nhưng TCP 80/443 timeout. GET HTTPS cũng timeout; chưa tới TLS/parser. Job chẩn đoán **success** chỉ xác nhận đã chạy phép thử, không phải nguồn truy cập thành công.
- Cùng đợt, máy phát triển đọc được bảng gốc HTTP 200, đủ ba bảng, TLS 1.3 hợp lệ; SHA-256 raw `33996cb0daa511c5acc8bc9cad29c9965bdfc4d811f853df1078d139b201f179`. Phản hồi cục bộ không chứng minh hosted runner đã truy cập được.
- Sáu lượt `event=schedule` từ 26–31/10 đều có `source_refresh_success=false`, `deployment_readback_verified=false`, không publish commit. Lượt gần nhất [41180687031](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41180687031) thất bại bootstrap, giữ bản đã công bố. Hai run ID trong receipt chỉ là ứng viên được xét, không phải hai chu kỳ thành công.

Biên nhận đã lưu bền: [hcm-cloud-acceptance-20261031.json](catalog-review/hcm-cloud-acceptance-20261031.json). Artifact GitHub gốc có thời hạn 14 ngày; JSON này giữ kết quả kiểm chứng cần thiết, không chứa thông tin xác thực.

## Dữ liệu tốt gần nhất và kiểm chứng fallback

Readback staging mới lúc 08:19:58 UTC khớp 11 asset × 22 tháng × hai chiều, sáu phạm vi SGP và từng hàng issuer miền Nam. Edition HCM vẫn `checked_at=2026-10-29T14:12:52.063915+00:00`, `through=2026-10-28`, bao gồm fingerprint K12 đã duyệt. Đây là nghiệm thu **bản đang phục vụ**, không phải refresh nguồn vừa thành công.

Đã bổ sung hai kiểm thử collector thực thi đường lỗi theo ngày: giữ nguyên events/raw hash/raw bytes/thời điểm lấy thành công khi refresh thất bại; ngày cold-cache thất bại không có quan sát hoặc hash giả. Tổng **11 Python collector tests và 4 Node verifier tests đạt**. Không thay hành vi collector/exporter/API, không thay số liệu đã công bố.

Workflow HCM trên `main` khớp nhánh staging; lịch vẫn cấu hình 08:35 Việt Nam mỗi ngày. Thời gian chạy thực tế có thể trễ. Không đăng ký thêm workflow hoặc tạo secret/hook; không gộp ứng dụng staging vào `main`.

## Cổng tiếp tục

1. Cần đường truy cập được nguồn hỗ trợ tới bảng lịch gốc từ cloud, hoặc feed/file ngày chính thức tương đương. Nội dung kỹ thuật để phía nguồn kiểm tra đã có tại [hồ sơ truy cập](hcm-source-connectivity-20261025.md); chưa gửi liên hệ bên ngoài.
2. Khi GET truy cập được, kiểm tra POST một ngày lịch sử và ngày gần nhất với TLS/ngày/schema hợp lệ. Sau đó khôi phục hoặc thu lại đủ raw/parsed của toàn cửa sổ lịch sử, kiểm hash và manifest K12. Cache cloud hiện chỉ khoảng 1,5–1,7 KB ở ba lượt schedule mới nhất; không giả định đã có 666 bảng local trên runner. Giữ guard chống thay lịch sử bằng cache thưa.
3. Chạy collect → export → kiểm tra → push staging → native Cloudflare build → readback đúng edition/fingerprint. Giữ dữ liệu tốt cuối nếu bất kỳ bước nguồn/xác minh nào lỗi.
4. Chỉ đặt `scheduled_refresh_verified=true` sau hai chu kỳ **schedule thật**, khác ngày, gần đây, đều có nguồn thành công và readback đúng bản. Run thủ công/probe không thay điều kiện này. Production cần nghiệm thu riêng.

Không dùng NEO làm movement, không đổi GRT thành DWT và không mở alias K12 toàn cục. Hướng vận hành giữ theo [quyết định truy cập nguồn](hcm-source-access-decision.md); kết quả mới chưa chứng minh cần hoặc đủ để đổi nền tảng.
