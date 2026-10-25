# Kiểm tra cập nhật tự động — 25/10/2026

## Kết quả

Mục 1 đã có cấu hình và cơ chế bảo toàn/đối chiếu dữ liệu; chưa nghiệm thu được refresh miền Nam đầu cuối vì không kết nối được nguồn từ hạ tầng cloud. Không gọi chạy thử thủ công là cron hoặc dùng bản live cũ để chứng minh lần refresh mới thành công.

Người dùng xác nhận hạ tầng chỉ có GitHub và Cloudflare. Không thiết lập Windows Task Scheduler, self-hosted runner, VPS hoặc dịch vụ trả phí.

## Đã thực hiện

- Đăng ký `.github/workflows/south-plans.yml` trên `main`, head `4fad560845ca640d41389586ef0efa6f762dd49f`. Checkout nhánh `codex/cloudflare-next-compat`, lịch `35 1 * * *` (08:35 Việt Nam).
- Bootstrap thử lại ba lần; thất bại không ghi đè receipt/archive tốt, không export hoặc commit dữ liệu rỗng. Export từ cache lạnh không được làm mất hơn 5% dòng cũ của từng phạm vi có ít nhất 20 dòng.
- Sau khi có dữ liệu export hợp lệ, workflow kiểm thử, commit/rebase/push edition rồi đợi API staging khớp đúng timestamp/version/window. Đối chiếu 22 tháng × 5 phạm vi × 2 chiều với ledger, tổng SGP và tổng quan miền Nam. Biên nhận lưu run/event/attempt/commit; hai ngày cron thật gần nhất đều phải thành công và có live readback mới chứng nhận lịch.
- Chế độ `probe_only` chỉ thử kết nối/schema, không export/publish. Lỗi nguồn vẫn làm run thất bại; dữ liệu live cũ giữ nguyên.

## Bằng chứng kết nối

- [GitHub Ubuntu 26.04 / westus3](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40177006819): TCP timeout.
- [GitHub Ubuntu 24.04 / westus2](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40177546957): TCP timeout sau ba lần thử; compile/publish bị bỏ qua, giữ bản cũ.
- [GitHub macOS / westus, chỉ probe](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40177904675): TCP timeout sau ba lần thử, không publish.
- Máy Windows phát triển đọc cùng URL HTTPS được HTTP 200. Đây chỉ là chẩn đoán; không dùng máy này làm lịch vận hành.
- Cloudflare Worker staging đã deploy route `/api/v1/industries/ports/south/source-health`. Probe đầu gặp lỗi tương thích `redirect: error`, chưa thực hiện gọi nguồn; đã sửa thành `manual` và từ chối HTTP không thành công, gồm redirect. Bản sửa `e9dd3ad`, deployment `2186f08b`, gọi HTTPS thực từ colo SIN lúc 09:07:29 UTC: `source_timeout` / `The operation was aborted`. Route chỉ gọi một URL chính thức cố định, hủy yêu cầu sau 15 giây, body tối đa 4 MiB, cache kết quả 15 phút; không nhận URL đích tùy ý hoặc phát lại HTML.
- Chưa nhận được phản hồi HTTP từ chối truy cập ở các lần lỗi; không kết luận nguyên nhân là IP/firewall. Không tắt kiểm chứng TLS.

## Miền Bắc/Trung

Audit GitHub lúc 08:32 UTC: PHP, DVP, VSC/VGR, nhóm GMD/HAH/DXP/PSP, CQN, CDN, QNP có ít nhất một run `event=schedule` thành công. Các run PHP ngày trước thuộc phạm vi Tân Vũ cũ, không chứng minh hai chu kỳ cho bản bốn bến mới. CMP và NAP active trên main nhưng chưa có run schedule trong lịch sử trả về. Chưa chứng nhận hai chu kỳ cho toàn bộ phạm vi hiện tại.

Readback API lúc 08:40 UTC: chín mã miền Bắc và CDN/QNP/CMP/NAP không báo stale/source_error; regional read_errors rỗng. Miền Bắc qua 24/10. DWT thiếu vẫn giữ null (CDN 1 dòng, QNP 4 dòng trong snapshot kiểm tra). Không đồng nhất dữ liệu mới với bằng chứng lịch ổn định.

## Kiểm chứng và phần còn lại

Đã qua 9 kiểm tra Python, 4 kiểm tra Node cho đối chiếu/cron, 12 Vitest mục tiêu; typecheck web, lint mục tiêu và diff check. Verifier chạy tại máy đã đối chiếu được bản static đang live; receipt ghi `event=local`, không chứng nhận source refresh hoặc cron.

Việc còn lại: xác định đường HTTPS đến nguồn hoạt động từ GitHub/Cloudflare, sau đó chạy lại toàn tuyến collect → commit → Cloudflare deploy → live readback. Khi đường Cloudflare hoạt động mới chọn transport phù hợp; không thêm storage/cron khi chưa kiểm chứng kết nối. Cuối cùng chờ hai chu kỳ lịch thật, kiểm tra riêng CMP/NAP và cập nhật biên nhận. Không mở rộng PDN trong yêu cầu mục 1 này.
