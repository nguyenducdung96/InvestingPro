# Thu thập bản tin PHP và chuỗi sản lượng Tân Vũ

Bước tiếp theo đã có mã nguồn local: [database, API và màn hình PHP → Tân Vũ](php-throughput-serving.md). Trạng thái chưa nối API/web ở cuối tài liệu này mô tả riêng bước collector ban đầu; không phải nghiệm thu production.

Thực hiện ngày 21/10/2026, tiếp theo [rà soát nguồn chính thức](php-official-data-sources-followup.md).
Phạm vi: pipeline nghiên cứu local, dữ liệu tháng từ PDF gốc; không đổi nguồn DWT, không deploy hay công bố production.

## Kết quả dữ liệu thật

- Discovery từ trang danh sách và ba archive 2024–2026: **27 URL PDF khác nhau**, đã tải đủ sau khi retry một file timeout. Không sinh URL PDF bằng cách đoán tháng/năm.
- Đã render trang đầu và chạy OCR cho 27 nội dung PDF; OCR chỉ tạo đề xuất, không tự phê duyệt số liệu.
- Đã đối chiếu biểu đồ Tân Vũ và tiêu đề kỳ của **16 tháng liên tục 05/2025–08/2026**, mỗi tháng hai chỉ tiêu: tấn hàng và TEU. Không phải DWT tàu.
- Quý chỉ cộng khi đủ ba tháng của chính chỉ tiêu đó. Có YoY cho tháng 5–8/2026; YTD cùng kỳ chưa có vì thiếu kỳ đầu năm 2025. Không lấy tổng tháng 5–8 làm YTD.
- **11 PDF còn lại chưa được đưa vào chuỗi**: khác phạm vi/khu vực, chưa xác nhận kỳ/chỉ tiêu hoặc có số cần làm rõ. Không biến chúng thành 0.
- Bản phát hành 5/2025 thiếu tiêu đề kỳ khai thác rõ và biểu đồ total throughput lặp số general cargo; giữ chờ kiểm tra. Không lấy tên file hay chuỗi RORO để tự gán tháng cho các chỉ tiêu khác.
- URL một PDF nằm trong thư mục `2024` nhưng nội dung phát hành 8/2025; phân kỳ theo nội dung, không theo đường dẫn. Các alias tháng trỏ cùng một PDF không tạo hai lượt nhập.

Đây là snapshot dữ liệu theo nguồn đã tải, không chứng nhận đầy đủ 24 tháng hoặc là kỳ mới nhất trên toàn website. Thời điểm kiểm tra nguồn và kỳ số liệu là hai trường khác nhau; tải mới tháng 10 không làm số tháng 8 thành số tháng 10.

## Cách chạy lại

Dùng Python bundled đã có `pypdf`, `pypdfium2`, Pillow. OCR dùng runtime `.local/ocr-runtime` hiện có (`rapidocr_onnxruntime`); không bắt buộc OCR cho thao tác tải, review hoặc export. Không đưa đường dẫn máy cá nhân vào production config.

Ví dụ PowerShell tại repo:

```powershell
$phpPython = 'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
& $phpPython scripts/php_newsletters.py refresh
& $phpPython scripts/php_newsletters.py retry
& $phpPython scripts/php_newsletters.py extract --ocr
& $phpPython scripts/php_newsletters.py propose
& $phpPython scripts/php_newsletters.py review --file docs/catalog-review/tanvu-newsletters-reviewed-20261021.json
& $phpPython scripts/php_newsletters.py export
```

`retry` chỉ tải lại PDF đã discovery bị lỗi. `refresh` lấy lại index và các PDF được liên kết; có giới hạn tám index, 80 PDF, ba luồng, 16 MB/file, HTTPS cùng domain chính thức. Redirect sang host khác bị từ chối trước khi tải; HTML/trang đăng nhập trả thay PDF bị loại. Có thể dùng `--out` để chọn thư mục dữ liệu khác.

Các lệnh độc lập để không chạy lại OCR khi chỉ cần cập nhật proposal hoặc xuất chuỗi. Muốn chạy trên máy khác phải tạo môi trường phụ thuộc tương đương và thu thập raw; file review pin hash không tự tạo dữ kiện khi chưa có bản nguồn đúng hash.

## Lưu bền vững và bản sửa

`.local/php-newsletters/newsletters.sqlite` lưu URL nguồn, thời điểm thử/thành công cuối, lỗi, các revision và quyết định review. `raw/<sha256>.pdf` giữ nội dung gốc; index HTML cũng được archive. Một URL đổi hash tạo revision mới; số cũ không được gắn vào revision mới khi chưa review.

Nguồn tải lỗi giữ revision thành công trước cùng trạng thái lỗi; không xóa lịch sử hoặc ghi lại thời điểm thành công giả. Nếu cả hai bản ngôn ngữ cho cùng kỳ/cùng số, export chỉ có một tháng và nhiều citations. Nếu các nguồn hiện hành đã review mâu thuẫn, kỳ đó bị giữ ở `conflicts`, không tự chọn một số hoặc cộng hai bản.

Review lặp cùng hash/số không nhân dòng. Sửa lỗi chép số trên cùng PDF cần `correction_reason`; SQLite lưu before/after, người review và lý do trong `review_corrections`. Số thiếu giữ null, không biến thành 0. `cargo_tonnes` không được lấy từ biểu đồ general cargo và `container_teu` không đổi thành DWT.

## Đầu ra và ranh giới tự động hóa

- `tanvu-series.json`: chuỗi tháng có citations/hash/reviewer; quý, YoY, YTD đủ điều kiện; coverage, conflict, lỗi nguồn và danh sách pending review. Đây là hợp đồng dữ liệu local cho bước API/dashboard tiếp theo.
- `extracted/<sha>/page-1.json`: text, OCR có tọa độ/confidence, kỳ và số đề xuất; `page-1.png`/`charts.png` để đối chiếu. Proposal luôn pending, không tự cấp trạng thái đã xác minh từ confidence cao.
- `last-refresh.json`, `last-retry.json`, `last-extraction.json`: biên nhận từng bước. Một bước lỗi có exit code khác 0; không dùng thành công HTTP thay nghiệm thu parser/số liệu.
- [Số đã đối chiếu](catalog-review/tanvu-newsletters-reviewed-20261021.json), [snapshot chuỗi](catalog-review/tanvu-newsletter-series-20261021.json) và [biên nhận](catalog-review/tanvu-newsletter-pipeline-20261021.json) để review thay đổi. Các file trong docs là snapshot bằng chứng, không phải fallback hardcode cho giao diện.

Phần **tự động đã có trong công cụ**: discovery, tải/archive/revision, OCR đề xuất và tính lại aggregate/export từ DB. **Chưa có** scheduler production, API/web đọc chuỗi, quyền công bố đã duyệt hoặc auto-approval OCR. File mới/bản sửa cần qua review số liệu; không hứa dashboard tự cập nhật số mới hằng ngày từ pipeline local này. Nối scheduler/serving/review vào app là bước triển khai tiếp, cần nghiệm thu riêng hai chu kỳ thực chạy theo kế hoạch đã duyệt.

## Xác minh

Chạy `python -m unittest discover -s tests -p test_php_newsletters.py`. Các invariant gồm URL ngoài nguồn, PDF giả, replay, bản sửa, correction audit, nguồn mâu thuẫn, thiếu tháng/chỉ tiêu, tháng gốc 0, YTD không đủ từ tháng 1 và rollover năm từ tiêu đề nguồn. Không thay đổi UI/TypeScript/migration trong bước này, không tuyên bố E2E hoặc cloud acceptance.

Nghiệm thu local cuối: 8/8 unit tests đạt; hai lần refresh nguồn thật, lần hai gặp năm timeout nhưng giữ nguyên 16 tháng; retry riêng kết thúc không còn lỗi. Áp dụng cùng review ba lần vẫn 16 dòng, không nhân dữ liệu; hash 27 revision khớp raw. `git diff --check` đạt. Hai lần chạy thủ công không là hai chu kỳ scheduler production.
