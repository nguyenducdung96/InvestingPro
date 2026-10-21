# Thay khóa Supabase staging đã lộ

Project: `investing-pro-dev`, ref `loapslojajawgzekozfv`.

Quy trình chính thức: https://supabase.com/docs/guides/getting-started/api-keys#rotate-a-leaked-or-compromised-key

1. Mở https://supabase.com/dashboard/project/loapslojajawgzekozfv/settings/api-keys, chọn Publishable and secret API keys. Nếu chưa có, Create new API keys. Tạo secret key tên `investingpro-data-sync-staging` (sb_secret_...), lấy publishable key (sb_publishable_...) cho web. Tên này là nhãn mô tả bên Supabase, không giới hạn key cho mã PHP. Không gửi khóa vào chat hoặc commit.
2. Mở https://github.com/nguyenducdung96/InvestingPro/settings/environments/24846498746/edit. Trong Environment secrets, sửa giá trị `SUPABASE_SERVICE_ROLE_KEY` bằng secret mới; giữ nguyên tên biến. Không thay URL project hoặc R2 token.
3. Mở Cloudflare worker staging Settings > Variables and Secrets: https://dash.cloudflare.com/5e84958e47290692c6ec2817fa1d9af6/workers/services/view/investing-pro-web-staging/production/settings. Thay giá trị `SUPABASE_ANON_KEY` bằng publishable key; giữ nguyên tên biến. Nếu key này còn được cấu hình riêng cho Builds, cập nhật chỗ đó trước build/deploy. Local `.env.local` cũng cần publishable mới trước khi bỏ legacy.
4. Edge Function `port-call-refresh` đã chuyển sang `SUPABASE_PUBLISHABLE_KEYS` do platform inject, không fallback sang `SUPABASE_ANON_KEY`. Giữ xác thực user JWT và quyền admin của importer. Bản chuyển đổi đã deploy và kiểm tra bằng phiên admin thật ngày 21/10/2026.
5. Chạy manual PHP newsletter workflow từ ref main, xác nhận intake/publication thành công; mở trang PHP, API throughput và API berths, kiểm tra 16 tháng/bốn bến, kiểm tra đăng nhập admin và importer. Không chỉ nhìn trang đã cache hoặc màu xanh của một bước install.
6. Chỉ sau các kiểm tra đó, quay lại API Keys > Legacy anon, service_role API keys, deactivate legacy keys. Tạo key mới không tự thu hồi key cũ. Không xoay JWT signing keys khi chưa có kế hoạch riêng. Kiểm tra lại web/job/importer sau deactivation, khóa cũ phải không còn được chấp nhận.

Code web/PostgREST và job newsletter gửi key mới qua apikey; user JWT thật tiếp tục đi qua Authorization. Không thay tên secret/environment trong đợt này. Unit kiểm tra cả key legacy, publishable, secret và user JWT.

## Kết quả staging ngày 21/10/2026 (giờ Việt Nam)

- Người dùng xác nhận đã cập nhật GitHub và Cloudflare. Manual workflow [39628737756](https://github.com/nguyenducdung96/InvestingPro/actions/runs/39628737756) thành công; receipt ghi `credential_kind: secret`, nhận 27 tài liệu, không chèn lại fact hoặc công bố trùng.
- API throughput PHP trả 16 tháng, API berths trả bốn bến trong lượt kiểm tra khóa mới.
- Edge Function đã deploy entrypoint của commit `73e0ca6`. Probe bằng anon JWT nhận HTTP 401; cấu hình thiếu publishable key được kiểm tra fail closed bằng unit test.
- Người dùng tự đăng nhập tại `/admin/port-calls`. Refresh `haiphong-in-port` qua nút **Lấy dữ liệu mới** thành công: UI báo **190 quan sát, 0 dòng cần xử lý**. Trang công khai hiển thị **Hải Phòng · 190**, thời điểm cập nhật **23:13:23 21/10/2026 UTC+7**. Đây là quan sát vị trí, không phải lượt đến/rời hoặc sản lượng DWT.
- Bộ test local 106/106 pass trước lượt kiểm tra admin; không có thay đổi code trong lượt xác nhận này.
- Người dùng đã tắt **Disable JWT-based API keys**. Probe read-only bằng public anon key legacy tới Auth settings ngày 21/10/2026 nhận **HTTP 401**, xác nhận key cũ bị từ chối (không in key vào log).
- Kiểm tra sau khi tắt: API throughput HTTP 200 với **16 tháng**, API berths HTTP 200 với **4 entries**; trang PHP hiển thị bình thường. Refresh Hải Phòng bằng phiên admin thật tiếp tục thành công với **190 quan sát, 0 dòng cần xử lý**.
- Workflow sau deactivation [39635911010](https://github.com/nguyenducdung96/InvestingPro/actions/runs/39635911010), job `119346208737`, hoàn tất thành công. Receipt lúc **23:36:41 ngày 21/10/2026 UTC+7** ghi `credential_kind: secret`, nhận **27 tài liệu**, `facts_inserted: 0`, `published: 0`; chạy lại không tạo dữ kiện trùng. Đây là manual verification, không tính thêm một chu kỳ cron.
- Migration staging đã được kiểm tra sau thu hồi legacy. Cấu hình local vẫn cần publishable key mới trước khi dùng lại script đăng nhập; kết quả staging không chứng nhận cấu hình local. Không xoay JWT signing keys trong quy trình này.
