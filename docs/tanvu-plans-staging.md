# Tân Vũ — lịch điều động trên staging

Ngày triển khai: 22/10/2026 (giờ Việt Nam). Chủ sản phẩm đã yêu cầu hoàn thiện Tân Vũ và dùng số liệu từ nguồn công khai miễn phí. Phạm vi công bố là dữ kiện lịch điều động, không tự duyệt quyền đối với toàn bộ website nguồn và không đổi nhãn thành actual.

## Luồng vận hành

1. `collect-tanvu-plan-months.py` hiệu chuẩn ngày nguồn, thu đến ngày đã qua gần nhất, kiểm tra ngày trong nội dung rồi parse vào/rời riêng với alias chính xác `TAN VU`. Mặc định backfill từ 01/01/2025; không có ngày kết thúc cố định. Ngày mới và bốn ngày cuối được tải lại, ngày lỗi được thử lại ở lần chạy tiếp theo.
2. Raw HTML nén gzip theo SHA-256 và checkpoint từng ngày được cache trong GitHub Actions; không tải PDF cho nhánh này. Receipt lưu riêng mỗi lần chạy. Cache mất/hỏng có thể tải lại từ nguồn; cache không phải cam kết lưu trữ bằng chứng vĩnh viễn.
3. `sync-tanvu-plans.mjs` dùng secret server staging hiện hữu, gửi tối đa 31 ngày/batch vào RPC. Database giữ phiên bản bất biến theo ngày/hash/parser; nhập lại không tạo phiên bản trùng. Bản cũ hơn không ghi đè head mới; lỗi nguồn giữ số đã nhập thành công và cập nhật lỗi.
4. Table tổng ngày và trạng thái run chỉ cho public đọc. Lịch sử phiên bản không cấp public select; RPC chi tiết chỉ trả bản hiện hành của một ngày, không có tên hoa tiêu/đại lý. Chỉ `service_role` được gọi importer; anon/authenticated không có quyền ghi. Không đưa secret vào app.
5. API `/api/v1/companies/PHP/plans` đọc database mỗi request, `Cache-Control: no-store`. `?direction=arrival` đổi chiều; `?day=YYYY-MM-DD` trả chi tiết một ngày. Trang `/companies/PHP#vessel-plans` đọc cùng repository, có năm/tháng/quý, MTD/YTD/YoY và tra cứu ngày.

## Lịch chạy

Workflow `.github/workflows/tanvu-plans.yml` đã đăng ký trên nhánh mặc định `main`, dùng environment `staging`, checkout `codex/cloudflare-next-compat`. Lịch **06:30 Việt Nam hằng ngày**, concurrency một job, timeout 30 phút; GitHub có thể bắt đầu trễ. Có nút **Run workflow** để chạy thủ công tại https://github.com/nguyenducdung96/InvestingPro/actions/workflows/tanvu-plans.yml.

Job giữ checkpoint kể cả khi một ngày lỗi, ghi receipt gọn và trả failure nếu nguồn/DB/readback lỗi. Trang hiển thị job gần nhất, ngày nguồn mới nhất, lỗi và quá hạn; không làm mất lịch cũ chỉ vì lần lấy mới thất bại. Sau khi kết thúc tháng hoặc sang năm, API tự sinh kỳ mới từ đồng hồ và dữ liệu DB; không cần sửa mã hoặc rebuild vì tháng mới.

## Quy tắc số liệu

- DWT là trọng tải thiết kế, không phải tấn hàng/TEU; bảng nguồn mang nhãn kế hoạch. Không cộng vào/rời/di chuyển nội cảng thành một số lượt ghé.
- Tháng/quý đang tích lũy và YTD so đúng khoảng ngày của năm trước. Kỳ đã kết thúc so toàn kỳ, bao gồm khác biệt năm nhuận. Ngày thiếu không thành zero; thiếu DWT không dùng GT thay thế. Không hiển thị tổng đầy đủ hoặc YoY nếu thiếu ngày/DWT hay có nhóm giờ chưa phân giải.
- Một mục nguồn tồn tại nhưng rỗng được ghi `source_empty_sections`, khác với lỗi tải/thiếu phần tử/ngày sai. Không suy số tàu thực tế bằng 0 từ mục kế hoạch rỗng.
- Có lịch sử bản sửa theo ngày khi raw hash hoặc parser đổi; số tổng luôn đọc head mới nhất. Chưa có thuật toán xác nhận chuyến thực tế hoặc nối hai lượt khác ngày thành một chuyến.

## Kiểm tra

### Biểu đồ sản lượng doanh nghiệp công bố — 24/10/2026

Phần sản lượng tấn hàng/TEU dùng cùng biểu đồ cột đôi với hoạt động tàu, nhưng đơn vị và dữ liệu độc lập. Có bộ chọn chỉ tiêu, tháng/quý, năm hoặc toàn bộ lịch sử; bảng số, YoY và nguồn đặt trong phần mở rộng mặc định thu gọn. Giữ toàn bộ lịch sử trong database. Khoảng lịch sử có tháng thiếu được vẽ khoảng trống, không nối bỏ tháng. Quý chỉ cộng khi đủ ba tháng và đủ chỉ tiêu; lũy kế cùng kỳ tiếp tục theo chuỗi liên tục có ở cả hai năm. Bộ chọn năm sinh từ kỳ trong database; không đặt cố định năm cuối hoặc số liệu trên chart. Form sản lượng giữ các bộ lọc `plan_` hiện có và trở về đúng phần `#throughput`.

Kiểm tra: lint/typecheck đạt; 4 Playwright desktop/mobile cho sản lượng và lịch điều động đạt. Bao gồm số thay đổi không rebuild, đơn vị tấn hàng/TEU đúng cả nhãn giá trị, cặp cột đúng, 12 tháng, lịch sử giữ khoảng thiếu, quý không đủ để trống, bảng/nguồn thu gọn, hai theme và không tràn trang.

### Cập nhật biểu đồ so sánh 22/10/2026

Trang PHP bổ sung biểu đồ cột đôi cho lưu lượng DWT và so sánh theo tháng/quý của hai năm (xanh/vàng), cùng biểu đồ 90 ngày bấm đến lịch từng ngày. Chọn toàn bộ lịch sử cho biểu đồ chuỗi; phần so sánh năm dùng năm hiện tại khi chọn toàn bộ. Kỳ đang tích lũy so cùng khoảng ngày, kỳ tương lai chỉ vẽ năm trước nếu có; null không trở thành zero. Dùng dữ liệu database hiện hữu, không thêm số từ ảnh tham khảo. Chưa bổ sung hãng tàu hoặc bản đồ tuyến vì dữ liệu tên hãng và tuyến dịch vụ chưa được xác minh.

Kiểm tra riêng thay đổi này: typecheck, lint và Playwright Tân Vũ desktop/mobile đạt (cột đôi có tỷ lệ đúng, đủ 12 tháng/4 quý, xem giá trị bằng bàn phím, click ngày, cập nhật dữ liệu không rebuild và không tràn trang).

- Local: 16 kiểm thử Python, 110 Vitest (gồm PostgreSQL RLS, replay, correction, rollback head, source failure), lint/typecheck đạt. Playwright đầy đủ **38/38** desktop/mobile, gồm thay dữ liệu fixture không rebuild, MTD, lọc chiều/quý, chi tiết ngày và không tràn màn hình.
- Next production build đạt. OpenNext bundle local bị Windows từ chối symlink; Cloudflare Workers Builds Linux đã build/deploy được API mới (HTTP 200), không coi lỗi Windows là kiểm tra cloud thất bại.
- Migration `202610220001_tanvu_published_plans.sql` và `202610220002_tanvu_readback.sql` đã chạy thành công trên project staging `loapslojajawgzekozfv` bằng SQL Editor. Migration thứ hai cho importer đọc lại tổng công khai; không cấp đọc lịch sử riêng tư. Không thay credentials hoặc JWT signing keys.
- Backfill đã nhập **659 ngày / 22 tháng**, từ 01/01/2025 đến 21/10/2026. Run đầu `39646523307` nhập thành công nhưng kiểm tra cuối lỗi HTTP 403 do thiếu SELECT cho service role; đã sửa bằng migration thứ hai và chuyển việc ghi trạng thái thành công xuống sau readback.
- [Run kiểm tra cập nhật `39649461686`](https://github.com/nguyenducdung96/InvestingPro/actions/runs/39649461686) đạt: checkpoint 659 ngày, chỉ tải lại 4 ngày gần nhất, parse/import/readback/cache đều thành công trong 31 giây. API vẫn trả đủ 22 tháng từ database. Raw hash mới có thể tạo phiên bản mới; head ngày duy nhất và tổng không nhân đôi.
- [Run lặp `39649716041`](https://github.com/nguyenducdung96/InvestingPro/actions/runs/39649716041) đạt trong 28 giây, checkpoint vẫn 659 ngày, tải 4 ngày. API trước/sau có cùng toàn bộ chuỗi tháng và YTD. Raw hash đổi tạo 4 phiên bản nguồn mới, không tạo thêm head ngày hoặc cộng trùng số liệu. Chi tiết ngày trả HTTP 200; ngày không hợp lệ trả HTTP 400. [Biên nhận readback](catalog-review/tanvu-plans-staging-20261022.json).
- Nghiệm thu UI live: tháng/quý, vào/rời, toàn bộ lịch sử và tra cứu 01/09/2026 đều trả dữ liệu đúng phạm vi. [Trang staging](https://investing-pro-web-staging.tuyenkinhmon88.workers.dev/companies/PHP#vessel-plans).
- Tàu rời 01–21/10/2026: **51 lượt, 851.674 DWT**, cùng phạm vi 2025: 56 lượt, 913.134 DWT, YoY DWT **-6,73%**. YTD đến 21/10/2026: **683 lượt, 11.499.305 DWT**, YoY **-1,08%**. Đây là số theo lịch công bố, chưa xác nhận actual.
- Lịch 06:30 đã cấu hình trên nhánh mặc định; chưa chứng nhận lần cron đầu tiên trước khi nó thực sự chạy. Manual run kiểm tra cùng workflow không thay thế bằng chứng event `schedule`.
