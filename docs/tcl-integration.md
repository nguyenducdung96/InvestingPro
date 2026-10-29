# TCL — ICD Nhơn Trạch và dịch vụ doanh nghiệp

## Phạm vi đã tích hợp ngày 30/10/2026

- Trang TCL và tổng quan miền Nam có **quan sát cập/rời cầu do ePort riêng công bố**, chỉ mã `TNT` của ICD Tân Cảng Nhơn Trạch. Đây là hoạt động tại cầu, không phải lượt tàu vào/rời toàn cảng; không cộng hai chiều thành lượt ghé.
- Edition đầu: **81 cập cầu, 78 rời cầu, 16–29/10/2026**. DWT không có trong nguồn, giữ null. Chưa có nền 2025; YoY và lũy kế so sánh chưa có tháng chung giữ unavailable. Không coi các ngày trước cửa sổ nguồn là 0.
- Chỉ tiêu bình quân xếp dỡ **khoảng 200.000 TEU/tháng** ở trang 3 báo cáo TCL 2025 được hiển thị riêng ở phạm vi dịch vụ doanh nghiệp. Báo cáo 2024 cũng nêu mức bình quân này; không tạo chuỗi tháng, nhân 12 thành tổng năm hoặc tính YoY từ hai số bình quân làm tròn. Không gán chỉ tiêu này riêng cho Nhơn Trạch.
- Báo cáo 2025 trang 4 xác nhận ICD 145.000 m², cầu 320 m; trang 7 xác nhận TCL nắm 51% Tiếp vận Tân Cảng Đồng Nai tại 31/12/2025. Không dùng công suất, diện tích hoặc tỷ lệ vốn để tạo sản lượng. Không gán toàn Cát Lái cho TCL, không cộng lại bến 2.200 DWT hợp tác CLL, không đưa liên kết Tân Cảng 128 Hải Phòng vào miền Nam.

## Nguồn cảng và Cảng vụ đã mở rộng

1. Báo cáo 2025/2024, trang vận hành ICD, trang công ty Tiếp vận Đồng Nai, biểu giá và hướng dẫn khai thác của TCL; trang ICD Nhơn Trạch chính thức trên SNP. Đã đọc bản PDF đầy đủ, kiểm tra Content-Length và SHA-256, đối chiếu trang 3/4/7 trực quan. Biểu giá và quy mô chỉ là bối cảnh.
2. **`https://eport.tcis.co/Ships`** là cổng riêng có lựa chọn `TNT – ICD Nhon Trach`. Lời dẫn ban đầu từ trang hướng dẫn bên ngoài chỉ dùng để tìm địa chỉ; dữ liệu nhập lấy trực tiếp từ cổng tự nhận diện ICD Nhơn Trạch, danh mục site và API công khai của chính cổng.
3. Trang `https://eport.saigonnewport.com.vn/Ships` là cổng khác: danh sách khu vực công khai đã đọc không có TNT. Không dùng số của CTL/TCTT/Hiệp Phước thay thế. Dashboard SNP chuyển tới trang đăng nhập, không dùng nội dung yêu cầu tài khoản.
4. Nguồn Cảng vụ Hàng hải Đồng Nai: đã kiểm tra checksum **1.994 phản hồi** lưu trữ và 204 nhãn bến/vị trí. Những nhãn có Nhơn Trạch thuộc SCC-VN/Nhà máy điện Nhơn Trạch 1 là bến khác. Kiểm tra bổ sung **12 phản hồi thành công**, hai chiều và SHIP/BOAT ở 15/06/2025, 15/06/2026, 15/10/2026, không có nhãn TCL được xác định. Không suy việc vắng nhãn là cảng không hoạt động hoặc mọi bộ lọc đã được phủ.
5. Cảng vụ ĐTNĐ khu vực III: tìm được trang danh mục cảng/bến chính thức `https://cv3.gov.vn/CangBen/DanhSachCangBen`; truy cập trực tiếp HTTP/HTTPS/www thất bại hoặc timeout. Chưa lấy được lịch sử đủ căn cứ để ghép bến. Không coi giấy phép rời là lượt cập hoặc nguồn lịch của bến khác.

## Hợp đồng TCIS và giữ lịch sử

API đọc công khai: POST `https://eport.tcis.co/ships/Searcher`, JSON `{siteId:"TNT",vesselName:""}`. Trình tìm kiếm công khai yêu cầu tên; phản hồi rộng của endpoint được dùng như bản quan sát, **không chứng nhận đầy đủ**. Edition đầu trả 578 dòng nhưng chỉ 81 dòng có `SITE_ID.trim() === 'TNT'`; loại 497 dòng bến khác.

Các trường tên `ACTUAL_BERTH_TIME` / `ACTUAL_DEPATURE_TIME` vẫn chứa `EST:`. Parser xét từng trường, chỉ giữ giờ hợp lệ không mang tiền tố dự kiến, loại giá trị năm 1900 và từ chối giờ tương lai không được đánh dấu. Ba giờ rời EST không vào tổng; giờ cập hợp lệ trên cùng dòng vẫn được giữ. Không tra tên để ghép DWT từ tàu khác.

Khóa quan sát gồm site, tàu, chuyến, chiều và giờ nguồn. Trùng khóa không nhân lượt; xung đột giờ của cùng chuyến gần nhau dừng để review. Quan sát đã có chứng cứ không bị xóa khi biến mất khỏi cửa sổ tra cứu hoặc nguồn về blank/EST. Mỗi quan sát giữ nguyên raw fields liên quan, hash phản hồi, dòng nguồn và thời điểm thu thập. Raw đầy đủ lưu `.local/tcl/archive/<sha256>.json`; không gắn hash cho dữ liệu khác.

## API, thao tác và nghiệm thu

- UI: `/companies/TCL#tcl-activity`, riêng ICD `?plan_asset=tcl_nhon_trach`, hai chiều, tháng/quý/năm, nhật ký theo ngày và nguồn thu gọn. Các phạm vi Cát Lái/depot chưa có chuỗi riêng không dùng lại số Nhơn Trạch.
- API: `/api/v1/companies/TCL/activity?asset=tcl_nhon_trach&direction=departure`; `day=YYYY-MM-DD` trả thêm sự kiện đúng ngày/chiều. `asset=tcl` có reference TEU bình quân riêng; `tcl_cat_lai`/`tcl_depots` không trả chuỗi TNT. Phạm vi/chiều/ngày sai bị từ chối.
- Refresh: `python scripts/collect-tcl-activity.py`; replay không gọi mạng: `--input <response.json>`. Lỗi nguồn giữ bản tốt, ghi lỗi riêng. Không ghi dữ liệu PDN/Bình Dương/HCM.
- Python: `python scripts/test-tcl-activity.py`; TypeScript: `pnpm exec vitest run tests/tcl-activity.test.ts tests/south-plans.test.ts`; UI: `pnpm exec playwright test tests/e2e/tcl.spec.ts tests/e2e/south-expansion.spec.ts tests/e2e/south-plans.spec.ts`.
- Live readback: `node scripts/verify-tcl-live.mjs`, mặc định staging, có thể đổi `TCL_VERIFY_BASE`. Verifier đối chiếu edition, tháng, nguồn từng dòng và tổng quan miền Nam với dữ liệu đã commit; receipt ở `.local/tcl/live-readback.json`.
- Workflow `tcl-activity.yml` có cấu hình 08:35 Việt Nam và chạy thủ công, cache/archive, artifact 30 ngày, kiểm tra trước khi commit/push. Lịch GitHub chỉ hoạt động khi workflow được đăng ký trên default branch. **Chưa chứng nhận chạy schedule thật hoặc cron acceptance**; không suy từ cấu hình hay lần chạy tại máy.

Biên nhận nguồn và ledger: `docs/catalog-review/tcl-source-review-20261030.json`. Kiểm tra tại máy, CI, build Cloudflare và live readback là các bước riêng. Không có production acceptance hoặc chứng nhận quyền tái phân phối trong phần việc này.

Kiểm chứng local của edition đầu: 186 Vitest toàn dự án, 5 kiểm tra parser Python, 6 Playwright desktop/mobile (TCL + mở rộng miền Nam + hồi quy miền Nam), lint và typecheck đạt. Replay phản hồi không tạo thêm quan sát.
