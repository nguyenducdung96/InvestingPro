# PHP → Tân Vũ: database, API và màn hình

Triển khai local ngày 21/10/2026, nối tiếp [pipeline bản tin](php-newsletter-pipeline.md).

## Luồng dữ liệu

PDF chính thức → collector SQLite/raw theo SHA-256 → đối chiếu số → SQL **pending** → PostgreSQL `port.monthly_throughput` → quyết định công bố dữ kiện số đã đối chiếu → view `port.published_monthly_throughput` → repository → API và màn hình.

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

## Công bố dữ kiện số theo quyết định chủ dự án

Chủ dự án đã yêu cầu dùng ngay số liệu từ nguồn chính thức sau đối chiếu, không yêu cầu thêm giấy tờ quyền nguồn cho bộ dữ kiện số này. Migration `202610210003_editorial_throughput.sql` tạo chính sách công bố Tân Vũ và snapshot dữ kiện số độc lập, cùng nguyên tắc với editorial catalog hiện có. Quyết định này không sửa `rights_status=to_verify`, evidence `incomplete` hoặc fact gốc `pending` thành trạng thái khác và không đăng lại PDF. Luồng duyệt nguồn nguyên bản ở trên vẫn tồn tại cho các nguồn được cấp phép riêng.

Publisher chỉ nhận ID fact; trigger sao chép giá trị chuẩn từ database, kiểm archive/hash hiện hành, từ chối fact rejected và nguồn blocked. Snapshot công bố bất biến, có audit. Public view đọc trực tiếp database, chính sách tắt/nguồn bị chặn/PDF đổi hash sẽ thu hồi dữ kiện liên quan. Admin queue không tiếp tục yêu cầu duyệt những fact đã có quyết định công bố này.

Job chỉ gửi tiếp ID trong bundle được tạo từ quyết định visual review khớp hash; OCR mới hoặc PDF sửa không có quyết định khớp vẫn chờ đối chiếu. Không có cơ chế tự duyệt OCR hoặc đổi quyền nguồn.

## Lịch tự động đã cấu hình

Workflow `.github/workflows/php-newsletters.yml` hiện có trên default branch `main`, checkout code `codex/cloudflare-next-compat`, chạy **06:20 Việt Nam mỗi ngày**, có concurrency, timeout và `workflow_dispatch`. Environment `staging` chỉ cho ref `main`, đã có hai secrets `PHP_NEWSLETTERS_R2_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` và variable `SUPABASE_URL` đúng project staging. Secrets chỉ được truyền vào step cần dùng; không vào web hoặc commit. R2 token giới hạn Object Read/Write cho bucket bằng chứng; CI dùng S3 vì token này không có quyền management API.

Runner tải nguồn chính thức vào đĩa tạm, retry, OCR đề xuất, replay quyết định review đúng hash, archive riêng PDF dùng cho facts, nhập pending rồi công bố dữ kiện đã có quyết định review khi policy bật. GitHub chỉ giữ metadata/proposal/receipt 14 ngày, không upload PDF/cache OCR/render thành artifact.

Run thật thủ công [39482783164](https://github.com/nguyenducdung96/InvestingPro/actions/runs/39482783164), attempt 2 thành công toàn bộ: 27 documents, không lỗi nguồn, replay không nhân facts. Attempt 1 lỗi archive do dùng management API với bucket-scoped token; đã sửa sang S3, không mở rộng quyền token. Run thủ công không tính là chu kỳ cron. **Chưa nghiệm thu hai chu kỳ daily thực tế**; cần đọc kết quả sau các lần lịch chạy, không cam kết nguồn có bản tin mới mỗi ngày. Job kiểm tra hằng ngày, số tháng/quý chỉ đổi khi nguồn công bố và đã đối chiếu.

## Readback sau công bố

Đã áp dụng migration 003 và bật policy trên staging. Public API thực tế trả HTTP 200, **16 tháng**, mới nhất 08/2026: **1.770.647 tấn, 93.754 TEU**, đúng PDF tháng 09/2026. Browser `/companies/PHP` hiển thị đủ chuỗi và YoY; YTD null vì thiếu đầu năm 2025. Dữ liệu từ 0 lên 16 hàng ngay sau transaction database, không cần redeploy app. Chưa có DWT/lượt tàu từ bộ bản tin này, chưa có chuỗi Chùa Vẽ/Hoàng Diệu/HTIT.

Sau migration editorial: 100/100 Vitest đạt với `--maxWorkers=2` (lượt chạy song song mặc định bị timeout hook catalog 10 giây; chạy giới hạn workers đạt toàn bộ). Typecheck/lint đạt. Các kết quả E2E 36/36 nêu trên thuộc triển khai UI trước đó; thay đổi lần này chủ yếu là DB publication và CI sync.
