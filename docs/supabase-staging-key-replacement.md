# Thay khóa Supabase staging đã lộ

Project: `investing-pro-dev`, ref `loapslojajawgzekozfv`.

Quy trình chính thức: https://supabase.com/docs/guides/getting-started/api-keys#rotate-a-leaked-or-compromised-key

1. Mở https://supabase.com/dashboard/project/loapslojajawgzekozfv/settings/api-keys, chọn Publishable and secret API keys. Nếu chưa có, Create new API keys. Tạo secret key tên `php-newsletters-staging` (sb_secret_...), lấy publishable key (sb_publishable_...) cho web. Không gửi khóa vào chat hoặc commit.
2. Mở https://github.com/nguyenducdung96/InvestingPro/settings/environments/24846498746/edit. Trong Environment secrets, sửa giá trị `SUPABASE_SERVICE_ROLE_KEY` bằng secret mới; giữ nguyên tên biến. Không thay URL project hoặc R2 token.
3. Mở Cloudflare worker staging Settings > Variables and Secrets: https://dash.cloudflare.com/5e84958e47290692c6ec2817fa1d9af6/workers/services/view/investing-pro-web-staging/production/settings. Thay giá trị `SUPABASE_ANON_KEY` bằng publishable key; giữ nguyên tên biến. Nếu key này còn được cấu hình riêng cho Builds, cập nhật chỗ đó trước build/deploy. Local `.env.local` cũng cần publishable mới trước khi bỏ legacy.
4. Cần hoàn tất chuyển Edge Function `port-call-refresh`: entrypoint hiện đọc SUPABASE_ANON_KEY legacy được platform inject. Việc đổi key Cloudflare/GitHub không đổi dependency này. Chưa vô hiệu hóa legacy cho đến khi function được chuyển/deploy và kiểm tra với user JWT thật.
5. Chạy manual PHP newsletter workflow từ ref main, xác nhận intake/publication thành công; mở trang PHP, API throughput và API berths, kiểm tra 16 tháng/bốn bến, kiểm tra đăng nhập admin và importer. Không chỉ nhìn trang đã cache hoặc màu xanh của một bước install.
6. Chỉ sau các kiểm tra đó, quay lại API Keys > Legacy anon, service_role API keys, deactivate legacy keys. Tạo key mới không tự thu hồi key cũ. Không xoay JWT signing keys khi chưa có kế hoạch riêng. Kiểm tra lại web/job/importer sau deactivation, khóa cũ phải không còn được chấp nhận.

Code web/PostgREST và job newsletter đã chuẩn bị để gửi key mới qua apikey; user JWT thật tiếp tục đi qua Authorization. Không thay tên secret/environment trong đợt này. Unit kiểm tra cả key legacy, publishable, secret và user JWT; chưa chứng nhận live new-key migration vì người dùng chưa tạo/nhập khóa mới. Không tắt legacy hoặc đổi credential trong lượt chuẩn bị này.
