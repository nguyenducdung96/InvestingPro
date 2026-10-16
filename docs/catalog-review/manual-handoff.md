# Bộ nhập danh mục doanh nghiệp và tài sản Slice 1

## Trạng thái cloud đã xác nhận sau đăng nhập ngày 16/10/2026

**Đã chạy bộ nhập chung trên Supabase cloud bằng SQL Editor UI**, giữ nguyên transaction và chỉ nhập pending. Query chỉ đọc sau nhập xác nhận đúng các UUID trong bộ: **41 doanh nghiệp, 41 listing pending và 14 quan hệ pending** (10 berth, 2 ICD, 2 terminal). Tổng bảng companies là 42 vì có một fixture thuộc nguồn blocked. Không xóa fixture/lịch sử hoặc tắt RLS: số bảng không có RLS trong core/catalog/port là 0. Ba source approved có từ trước giữ nguyên; 52 source to_verify và một source blocked chưa đổi trạng thái.

Biên nhận có hash của đúng bộ SQL đã chạy: `company-catalog-cloud-import-receipt-20261016.json`. **Không cần chạy lại hướng dẫn import bên dưới cho bộ có cùng hash.** Các cờ cloud_applied trong manifest đầu vào cũ chỉ phản ánh thời điểm chuẩn bị từng đợt; biên nhận thực thi và manifest bộ chung khớp hash là căn cứ đợt nhập hiện tại. Compiler không kết nối cloud; nếu SQL thay đổi, biên nhận cũ không xác nhận bộ mới.

Đã nhìn thấy nguồn STG/CQN mới trên hàng đợi quản trị thật. Trang công khai niêm yết vẫn báo chưa có thông tin đã xác minh, đúng với trạng thái pending. Người dùng xác nhận chưa có thỏa thuận sử dụng nguồn; không đánh dấu quyền nguồn đã duyệt hoặc giả quyết định duyệt. Còn phải xác định căn cứ sử dụng hợp lệ hoặc thay nguồn, xác minh hiệu lực/biến động và đóng độ phủ trước nghiệm thu Slice 1. Các đoạn chưa nhập cloud dưới đây là lịch sử chuẩn bị trước đợt chạy này.

## Cập nhật hoàn thiện ngày 16/10/2026

Bộ hiện tại có **41 doanh nghiệp, 41 lịch sử giao dịch và 14 đề xuất quan hệ tài sản**. STG đã có bằng chứng ngày giao dịch đầu tiên 02/03/2010 tại trang PDF 7, mục 1.1.4 báo cáo thường niên 2012 tải trực tiếp từ Sotrans. Điều này không xác nhận tình trạng giao dịch hoặc tư cách công ty đại chúng năm 2026.

Năm quan hệ mới là CQN khai thác cầu 1, 5, 6, 7 và bến tạm Cái Lân theo giấy chứng nhận 88/2020/GCN-CHHVN ký ngày 24/06/2020, trang PDF 1. Ngày này là mốc giấy chứng nhận, không phải ngày đầu khai thác. Không bao gồm cầu 2–3–4 của CICT, không tạo quan hệ toàn bến hoặc quyền sở hữu. Bản gốc có chữ ký/dấu đã được đọc trực quan. Phải kiểm tra văn bản thay thế/thu hồi và thay đổi 2026 trước duyệt.

Hai bản gốc mới đã lưu riêng tư và tải ngược kiểm tra SHA-256; biên nhận R2 hiện có **82 tệp**. Không có import, duyệt hoặc công bố mới trên Supabase/staging. Bộ nhập mới nhất vẫn là `supabase/imports/slice1_company_catalog.handoff.sql`; chạy nguyên transaction theo bước dưới đây. Số 40 listing/9 quan hệ/80 tệp ở ghi chú lịch sử đã được thay thế bởi cập nhật này.

Để kiểm tra bộ nhập ngoại tuyến, chạy `python scripts/check-slice1-readiness.py --write-report`. Lệnh kiểm tra hash từng SQL đầu vào, nội dung ghép trong transaction, bản lưu raw và tính nhất quán danh mục. `--require-complete` trả mã lỗi khi còn khoảng trống; không dùng kết quả integrity đạt để tuyên bố đã công bố. File `slice1-readiness.json` liệt kê khoảng trống theo từng mã: vẫn còn 57 quan sát thiếu ngày, tình trạng hiện tại và độ phủ toàn thị trường chưa xác nhận.

Khi tái tạo từ đầu, chạy `compile-cqn-license-proposals.py` sau `compile-registry-identity-enrichment.py` và trước `prepare-issuer-registry-handoff.py`. Compiler yêu cầu bản PDF khớp hash và biên nhận R2; không tự tải, duyệt nguồn hay kết nối database.

**Bộ công ty và tài sản mới nhất:** `supabase/imports/slice1_company_catalog.handoff.sql` đã gộp registry và 14 đề xuất quan hệ có ngày VGR/DVP/PAP/ILB/VLG/CQN, gồm hai ICD riêng. Nếu sử dụng bộ này thì không cần chạy lại các bộ registry/PAP/VGR/DVP riêng bên dưới. File yêu cầu catalog pháp lý hiện có đúng định danh; nếu lỗi thì cả transaction rollback, không bỏ guard. Bộ này chỉ nhập hồ sơ chờ duyệt, chưa phải công bố. Đã lưu và tải ngược đối chiếu SHA-256 cho 82 tệp bằng chứng trên R2 riêng tư; biên nhận ở `r2-additional-readback-20261016.json`. Việc này không thay thế xác minh dữ kiện hoặc căn cứ sử dụng nguồn. `company-catalog-handoff-manifest.json` ghi các file nguồn/hash; `inland-depots-proposals-manifest.json` ghi phạm vi và giới hạn hai ICD. Đọc cập nhật trong `expanded-data-progress.md` trước khi dùng hướng dẫn đợt cũ dưới đây.

## Sử dụng bộ chung

1. Mở `supabase/imports/slice1_company_catalog.handoff.sql`, sao chép toàn bộ file. Trong SQL Editor của project `loapslojajawgzekozfv`, mở query mới, dán và Run toàn bộ một lần. Đừng chạy từng đoạn để bỏ qua lỗi định danh. Agent chưa thực hiện bước này trên cloud.
2. Đối chiếu kết quả với `company-catalog-handoff-manifest.json`: 41 định danh, 41 lịch sử giao dịch và 14 quan hệ trong bộ hiện tại. Hai ICD ILB/VLG được tạo riêng với vai trò đề xuất operator. Database thật có thể đã có một số bản ghi, bộ nhập giữ nguyên thay vì tạo trùng hoặc đổi quyết định duyệt.
3. Hồ sơ đủ căn cứ vẫn cần được công bố bằng tài khoản quản trị thật. SQL không chứa token, giả actor, GRANT hay thao tác tự duyệt. Việc có hồ sơ chờ duyệt chưa khiến trang công khai xuất hiện dữ liệu mới. 57 quan sát còn thiếu ngày nằm trong manifest nghiên cứu, không được đưa vào bảng quan hệ bằng ngày giả.

Các lệnh Python tái tạo, theo thứ tự: `compile-registry-proposals.py`, `compile-issuer-registry.py`, `compile-market-issuer-registry.py`, `compile-expanded-issuer-dossiers.py`, `compile-final-issuer-identities.py`, `compile-registry-identity-enrichment.py`, `compile-inland-depot-proposals.py`, `compile-cqn-license-proposals.py`, `prepare-issuer-registry-handoff.py`. Các compiler cần bản gốc trong `.local/catalog-research/`; không tải báo cáo vào Git. Script `archive-catalog-evidence.py` mặc định dry-run, chỉ upload/readback khi có `--execute`, dùng bucket riêng tư cố định. `--verify-existing --execute` chỉ đọc lại đợt cũ, không upload/ghi đè. `apply-catalog-readback.py` chỉ cập nhật cờ lưu trữ sau khi byte tải ngược khớp SHA-256, không quyết định quyền nguồn hoặc chất lượng dữ kiện.

## Hướng dẫn đợt PAP/VSC trước đây

**Cập nhật bộ doanh nghiệp 16/10:** bộ chung `supabase/imports/issuer_registry_all.handoff.sql` đã gộp sáu bộ registry: 41 định danh ứng viên và 40 lịch sử giao dịch, chưa chạy cloud. Không cần lắp ghép các bộ registry riêng khi sử dụng bộ chung. Hồ sơ, nguồn và khoảng trống tại `issuer-registry-progress-20261016.md`. Bộ chung không bao gồm PAP berths, không duyệt nguồn/quan hệ, không đồng nghĩa toàn bộ Slice 1 đã hoàn thành. Hướng dẫn PAP/VSC dưới đây là phạm vi cũ; cả hai PDF đã được tải ngược kiểm tra hash cùng các bằng chứng mới trong biên nhận R2 ngày 16/10.

Phần mềm Slice 1 đã có migration/types/repository/API/tests và hàng đợi quản trị. Bộ này bổ sung dữ liệu chuẩn bị ngoại tuyến, **chưa chạy trên cloud và chưa công bố**. Không phải bộ nghiệm thu toàn bộ doanh nghiệp cảng Việt Nam. Không thay đổi Slice 2–5.

## 1. Kiểm tra hai bằng chứng đã lưu trên R2

Mở Cloudflare → R2 → bucket `investing-pro-evidence-staging` → thư mục `catalog-evidence/sha256/`. Tìm và Download hai object có tên:

- PAP: `81f0546ee15331c47767461ea4d7569b1ea6497ed1646379cf67ec474af696ea`.
- VSC: `4bd4f0da1db1c203065c5a7864d4c9d13dd5ed25639dd224f369822b3fc3bbc4`.

Các object này đã nằm trong đợt upload 30 PDF; đừng upload lại hoặc mở public bucket. Với từng file vừa Download, mở PowerShell và chạy lệnh dưới đây, thay đường dẫn bằng file thật:

```powershell
(Get-FileHash -Algorithm SHA256 -LiteralPath "C:\Users\Admin\Downloads\TEN_FILE_VUA_TAI").Hash.ToLowerInvariant()
```

Kết quả phải trùng đúng tên hash tương ứng. Chỉ đối chiếu file vừa tải từ R2, không dùng file gốc trong repo để kết luận tính toàn vẹn bản lưu trên cloud. Không khớp hoặc không tìm thấy object thì dừng bộ nhập và báo tên/hash; không cần gửi mật khẩu hay token.

## 2. Nhập proposals bằng một lần Run

Mở file `supabase/imports/slice1_additional_catalog.handoff.sql` trong Codex. Chọn toàn bộ nội dung file (Ctrl+A), sao chép (Ctrl+C).

Mở Supabase project `loapslojajawgzekozfv` → **SQL Editor** → **New query**. Dán toàn bộ nội dung vào một query mới rồi nhấn **Run**. Đừng chèn vào giữa query cũ hoặc thay tên bảng/UUID. File đã gói phần nhập trong một transaction; nếu một điều kiện trước nhập sai, cả bộ phải rollback, không chạy từng đoạn để bỏ qua lỗi. Không có lệnh xóa, cấp quyền, tạo user hay giả actor duyệt.

Kết quả cuối phải có hai dòng:

- `PAP berth proposals`: `rows = 3`, `pending = 3`.
- `VSC listing`: `rows = 1`, `pending = 1`.

Nếu một hồ sơ đã được duyệt hợp lệ từ trước, pending có thể thấp hơn rows; giữ nguyên quyết định đó và báo kết quả, không đổi ngược về pending. Bộ nhập không sửa quyết định đã duyệt. Có thể chạy lại, không tạo thêm proposal/audit nếu nội dung đã tồn tại đúng như bộ này.

## 3. Phạm vi đã đối chiếu để dùng khi review

PAP: báo cáo thường niên 2025 trang PDF 3–4 (trang in 1–2), pháp nhân 3601010336. Cầu 5/6 dùng mốc chứng nhận đủ điều kiện ngày 31/12/2024; cầu 7 dùng mốc quyết định mở ngày 05/12/2025. Đây không phải ngày tàu đầu tiên. Cầu 6 nối dài không tạo thành cầu trùng. Không nhập cầu 8–9 là đang khai thác, không gắn sở hữu 100%, không suy ra ICD từ bãi logistics. Còn phải đối chiếu bản gốc văn bản và biến động 2026 trước khi kết luận về tình trạng hiện tại.

VSC: báo cáo thường niên 2025 trang PDF 3 (trang in 2), pháp nhân 0200453688, mã VSC, HOSE, doanh nghiệp báo cáo giao dịch đầu tiên 09/01/2008. Bộ này chỉ thêm company/listing chờ duyệt. Các chuỗi VGR/GLC/Quảng Bình–Đình Vũ và chênh lệch tỷ lệ HAH được lưu riêng trong `factual-review-20261015.json`; không thêm quan hệ tài sản hoặc suy ra tỷ lệ sở hữu vật lý. Chưa phải xác nhận trạng thái giao dịch hiện tại.

Nguồn/bằng chứng/định danh/listing vẫn đi qua quy trình trong `docs/admin_publication_guide.md`. Không dùng ghi chú dữ kiện ở trên làm giấy phép nguồn và không duyệt một hồ sơ còn thiếu căn cứ chỉ để bật dữ liệu. Người dùng có thể tự thao tác trên giao diện; agent không dùng đường vòng để thực hiện hành động công bố mà công cụ đã từ chối.

## Còn thiếu để nghiệm thu toàn bộ phạm vi người dùng yêu cầu

Bộ nghiên cứu mở rộng mới nhất nằm ở `expanded-data-progress.md`. Ngoài PAP/VSC, file `supabase/imports/expanded_issuer_registry.proposals.sql` đã chuẩn bị bốn company/listing CAG, CCR, TCL, PNP chờ duyệt trong một transaction, có câu truy vấn kết quả ở cuối. File này chưa chạy cloud; khi nhập cần giữ nguyên toàn bộ transaction như bước 2, không chạy từng đoạn nếu có xung đột. Metadata/hash và trang đã đối chiếu của bốn PDF nằm trong `expanded-issuer-registry-manifest.json`; cần kiểm tra bản lưu R2 trước. SQL chỉ thêm đề xuất, không tự duyệt hoặc khiến dữ liệu xuất hiện trên website.

Chưa chốt toàn bộ universe ngoài danh sách tối thiểu; chưa đủ danh mục tài sản và chuỗi pháp nhân của mọi mã; chưa xử lý xong các mâu thuẫn, thay đổi 2026, quyền nguồn; chưa công bố/đối chiếu độ phủ trên staging. Việc nhập thành công bộ bổ sung này không đánh dấu Slice 1 hoàn thành.
