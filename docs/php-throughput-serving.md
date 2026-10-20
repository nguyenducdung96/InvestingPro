# PHP → Tân Vũ: database, API và màn hình

Triển khai local ngày 21/10/2026, nối tiếp [pipeline bản tin](php-newsletter-pipeline.md).

## Luồng dữ liệu

PDF chính thức → collector SQLite/raw theo SHA-256 → đối chiếu số → SQL **pending** → PostgreSQL `port.monthly_throughput` → duyệt bằng chứng/quyền nguồn/số liệu → view `port.published_monthly_throughput` → repository → API và màn hình.

- `/companies/PHP`: phần sản lượng Tân Vũ đứng trước hồ sơ tài sản; chọn tấn hàng hoặc TEU, tháng hoặc quý; bảng YoY, lũy kế đủ điều kiện, PDF/trang/hash. Các bến khác chưa có chuỗi không được cộng thành số PHP hợp nhất.
- `/api/v1/companies/PHP/throughput`: tính aggregate từ facts PostgreSQL tại mỗi request, `no-store`. UI dùng cùng repository và hàm tính; không gọi vòng HTTP vào chính ứng dụng.
- `/admin/throughput`: đăng nhập admin, xem số chờ duyệt và PDF/hash, ghi chú rồi duyệt/từ chối. API ghi kiểm tra session admin và same-origin; SQL RPC kiểm tra lại quyền từ `app_metadata`.
- Chưa có DWT/lượt tàu thực tế trong nguồn bản tin này. Không suy từ tấn hàng, TEU, kế hoạch hoặc giấy phép.

## Nhập dữ liệu

1. Áp dụng migration `supabase/migrations/202610210001_monthly_throughput.sql` trên môi trường đích theo quy trình dự án.
2. Chạy collector/review/export theo tài liệu pipeline, sau đó:

```powershell
python scripts/export-newsletter-db.py
```

Lệnh đọc SQLite hiện hành, kiểm hash raw và tạo `.local/php-newsletters/monthly-throughput.pending.sql`. Import SQL đó bằng kết nối quản trị của môi trường đích. File `supabase/imports/php_monthly_throughput.pending.sql` là handoff khởi tạo có thể review và fixture kiểm thử, không phải file dữ liệu để UI đọc. Các lần sau sinh lại từ SQLite, không sửa số trong SQL hoặc component.

3. Quyền nguồn mặc định `to_verify`, bằng chứng `incomplete`, fact `pending`. Archive PDF vào kho bằng chứng riêng và xác minh nội dung/hash trước khi duyệt bằng chứng bằng quy trình `/admin/publication`. `raw_storage_key` bắt đầu `local:` trong handoff chỉ mô tả bản local thật, không xác nhận đã upload R2. Khi duyệt bằng chứng, cần bản ghi thay thế chỉ đến archive đã xác minh; không cấp quyền rộng cho cả website.
4. Duyệt số ở `/admin/throughput`; RPC tìm đúng bằng chứng verified cùng nguồn/URL/hash và quyền approved. Local visual review không tự cấp quyền công bố. Kiểm tra API/UI bằng tài khoản public.

SQL hiện có 27 document watermarks và 16 tháng số liệu 05/2025–08/2026, mỗi tháng hai chỉ tiêu. Replay cùng facts không nhân dòng. Watermark cũ không đè lần thử mới hơn. Bản PDF đổi hash khiến facts cũ không còn trong view công khai, cần đối chiếu revision mới; tải lỗi giữ hash thành công trước và có nhãn lỗi.

Sửa số đã duyệt phải thêm fact mới và đặt `supersedes_id` đến fact verified cùng bến/kỳ trước khi duyệt; không sửa/xóa số đã duyệt. ID fact sinh theo bằng chứng/kỳ/giá trị nên thay số tạo hàng mới. Nếu nhiều nguồn được duyệt cùng kỳ có số khác nhau, API giữ kỳ ở `conflicts`, không chọn hoặc cộng tùy ý. Nguồn identical được deduplicate khi tổng hợp nhưng giữ các citations.

## Đúng kỳ và độ mới

Quý chỉ có tổng cho chỉ tiêu đủ ba tháng. YoY yêu cầu cả hai giá trị cùng kỳ và mẫu số lớn hơn 0. YTD chỉ dùng đoạn liên tục bắt đầu tháng 1 ở cả hai năm; không dùng tháng 5–8 làm YTD. Đơn vị được giữ tách biệt. UI báo tháng thiếu và kỳ số liệu cũ hơn 75 ngày từ đầu kỳ; ngưỡng hiển thị này không phải cam kết nguồn công bố. Thời điểm thử tải và kỳ nghiệp vụ được hiển thị riêng.

## Xác minh và giới hạn

- PostgreSQL/PGlite: áp dụng toàn bộ migration và handoff thật, replay, RLS ẩn pending, chặn duyệt khi chưa có quyền/bằng chứng, giữ fact immutable, thay hash ẩn revision cũ, chặn nguồn thu hồi quyền.
- Unit: deduplicate/conflict, quý thiếu chỉ tiêu/tháng, YoY mẫu số 0, YTD.
- Playwright desktop/mobile: backend HTTP fixture thay số giữa hai request, UI/API đổi mà không build; chọn quý, xem nguồn, chế độ sáng/tối và không tràn ngang; kiểm tra dữ liệu trống và API admin chưa đăng nhập. Đây là fixture kiểm thử; không chứng nhận dữ liệu production hay nguồn thay đổi thật.
- Không tích hợp file docs JSON hoặc SQL làm fallback cho màn hình. Database lỗi trả trạng thái lỗi, không số demo.

Trạng thái ban đầu của bước local: chưa áp dụng migration/handoff lên cloud, chưa archive/cấp quyền công bố các PDF, chưa deploy và chưa có scheduler production. Cần nghiệm thu ít nhất hai chu kỳ scheduler có log/readback, cùng luồng nguồn thật → archive → review → database → API/UI trên môi trường đích trước khi tuyên bố cập nhật tự động production.

Kết quả kiểm tra local: toàn bộ 99/99 Vitest đạt; 8/8 Python collector đạt; Playwright riêng luồng PHP đạt 2/2 desktop/mobile; lint, typecheck và Next production build đạt. Kiểm thử PostgreSQL dùng PGlite, E2E dùng HTTP fixture độc lập; không gọi đây là nghiệm thu cloud hoặc toàn bộ bộ E2E của dự án. Handoff sinh lại từ SQLite khớp SHA-256 với bản SQL review trong repo.

## Đợt đưa lên staging ngày 21/10/2026

Đã áp dụng hai migration `202610210001_monthly_throughput.sql`, `202610210002_newsletter_intake.sql` vào project `loapslojajawgzekozfv`. Handoff sinh lại sau archive đã được nhập nguyên transaction qua SQL Editor; readback: **27 documents, 16 facts, 16 pending, kỳ 05/2025–08/2026, 16 bằng chứng incomplete trỏ archive**. Quyền nguồn vẫn `to_verify`; không tự cấp quyền từ việc website công khai hoặc archive thành công.

Đã lưu **16 PDF, 74.596.651 bytes (khoảng 71 MiB)** vào bucket riêng tư hiện có `investing-pro-evidence-staging`, đối chiếu SHA-256 tải ngược đủ 16/16. Không thay quyền truy cập bucket. [Biên nhận archive](catalog-review/php-newsletters-r2-readback-20261021.json) chỉ chứa metadata. Script `archive-php-newsletters.py` kiểm object theo hash trước khi put, không nhân bản cùng nội dung; bản tải ngược tạm được tự dọn sau kiểm tra. Không upload ảnh render/OCR hoặc toàn bộ cache nghiên cứu. Bản gốc cần giữ để đối chiếu số và revision; hash một mình không khôi phục được tài liệu. Không đưa PDF vào PostgreSQL hoặc bundle web.

Đã chạy lại toàn bộ E2E: **36/36 đạt** (desktop/mobile), cùng 99/99 Vitest, 8/8 Python, lint/typecheck. Migration intake chỉ nhận phạm vi PHP, ghi pending, chống replay, không duyệt quyền hay số liệu; test chặn JWT thiếu role/user_metadata giả admin và xác nhận service importer không truyền được trạng thái verified.

## Lịch tự động đã chuẩn bị, chưa kích hoạt

Workflow `.github/workflows/php-newsletters.yml` chạy dự kiến 06:20 Việt Nam mỗi ngày, có concurrency, timeout và `workflow_dispatch`. Runner tải nguồn chính thức vào đĩa tạm, retry, OCR đề xuất, chỉ replay quyết định review còn đúng hash hiện hành, archive riêng PDF dùng cho facts, rồi gọi RPC nhập pending. PDF mới/bản sửa không tự nhận số đã duyệt trước đó. GitHub chỉ giữ metadata/proposal/receipt 14 ngày, không upload PDF/cache OCR/render thành artifact.

Hai secrets trong environment `staging` cần được chủ tài khoản cấu hình trước khi bật:

- `PHP_NEWSLETTERS_R2_TOKEN`: token máy chủ giới hạn R2 read/write cho bucket bằng chứng hiện có; không dùng OAuth token cá nhân của Wrangler.
- `SUPABASE_SERVICE_ROLE_KEY`: chỉ trong secret store của job, tuyệt đối không đặt vào ứng dụng web hoặc commit. Có quyền rộng; chỉ cấp cho workflow tin cậy, không truyền vào PR/fork job. Job chỉ gọi RPC pending đã kiểm thử.

Variable không nhạy cảm `SUPABASE_URL` phải trỏ đúng project staging. GitHub UI hiện xác nhận chưa có repository/environment secrets. Đưa workflow lên default branch là điều kiện để GitHub chạy lịch; branch hiện làm việc là `codex/cloudflare-next-compat`, default là `main`. Không tuyên bố file workflow trên branch này đã kích hoạt cron. Cần cấu hình quyền và đưa workflow lên nhánh mặc định, sau đó nghiệm thu hai chu kỳ thực với log/readback. Chưa có bằng chứng cho hai chu kỳ đó.
