# Tự duyệt hồ sơ trên InvestingPro staging

## Xem dữ liệu ngay theo kỳ báo cáo

Mở https://investing-pro-web-staging.tuyenkinhmon88.workers.dev/admin/catalog sau khi đăng nhập. Nhập mã như GMD, MVN, ILB hoặc CQN rồi chọn **Tra cứu hồ sơ**. Trang này đọc trực tiếp 41 hồ sơ và 63 quan sát từ database, có kỳ báo cáo, vai trò, pháp nhân trung gian, trang tài liệu và các khoảng trống. ICD và nhóm bến chuyên dùng được tách riêng. 22 đường nghiên cứu qua pháp nhân nằm ở phần cần đối chiếu, không được gọi là sở hữu đã xác minh.

Không cần nhập ngày bắt đầu giả để xem hoặc rà soát một hồ sơ. Ngày cuối kỳ, mốc cấp phép và ngày bắt đầu được doanh nghiệp báo cáo là các trường khác nhau. Muốn xử lý một quan sát thì mở **Duyệt quan sát này**; chỉ xác minh khi đã hoàn tất nguồn, bằng chứng và định danh liên quan. Thiếu quyền công bố không làm mất hồ sơ nội bộ, nhưng bản đó không hiện ra danh sách công khai.

Đường dẫn: https://investing-pro-web-staging.tuyenkinhmon88.workers.dev/admin/publication

Luồng này thuộc Slice 1. Duyệt xong một hồ sơ không có nghĩa đã đủ danh mục toàn thị trường hoặc mọi tài sản của doanh nghiệp đó.

## Đăng nhập

Nếu trang đã hiện các hồ sơ thì dùng phiên hiện tại. Nếu hiện ô mã truy cập, mở PowerShell:

```powershell
Set-Location D:\GitWork\InvestProApp\InvestingPro
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\get-admin-access-token.ps1 -Email "tuyenkinhmon88@gmail.com"
```

Nhập mật khẩu user trong Supabase Authentication, không phải mật khẩu dashboard. Script copy token vào clipboard; dán vào ô Mã truy cập và nhấn Đăng nhập quản trị. Không gửi token/mật khẩu vào chat. Nếu phiên hết hạn, chạy lại lệnh. Không cần mở Supabase SQL Editor để duyệt.

## 1. Quyền sử dụng nguồn

Mở tab **1. Quyền sử dụng nguồn**. Đọc tên đơn vị và nguồn gốc; ghi:

- Căn cứ được sử dụng: giấy phép, văn bản đồng ý hoặc căn cứ áp dụng cụ thể đã kiểm tra.
- Phạm vi: tài liệu, những trường dữ kiện được dùng, quyền lưu bằng chứng và điều kiện ghi nguồn. Không coi một PDF công khai hoặc robots cho truy cập là giấy phép toàn website.
- Liên kết điều khoản/văn bản nếu có, và lý do quyết định; mỗi phần căn cứ/phạm vi/lý do ít nhất 20 ký tự.

Chọn ô xác nhận rồi nhấn **Duyệt quyền nguồn**. Nếu chưa biết căn cứ, giữ hồ sơ chờ duyệt. Không điền một lý do giả chỉ để bật danh sách doanh nghiệp. **Từ chối hồ sơ** sẽ chặn nguồn; dữ liệu phụ thuộc nguồn đó sẽ bị ẩn đối với người xem công khai. Nguồn bị chặn vẫn có thể được xem xét lại với căn cứ mới.

Không duyệt nguồn `synthetic_dev`: đó là dữ liệu thử đã được chủ động chặn.

## 2. Bằng chứng

Mở tab **2. Bằng chứng** sau khi quyền nguồn đã duyệt. Với mỗi bản ghi:

1. Mở tài liệu gốc, đối chiếu pháp nhân, mã, ngày và phạm vi trang/mục. Phân biệt ngày thành lập công ty, ngày cấp phép, ngày giao dịch và ngày tàu đầu tiên.
2. Mở **Thông tin bản bằng chứng để đối chiếu**, xem object key và SHA-256.
3. Trong Cloudflare R2, vào bucket `investing-pro-evidence-staging`, thư mục `catalog-evidence/sha256/`; tìm tên hash và Download. Bucket giữ riêng tư.
4. Trong PowerShell, lấy hash của đúng file vừa tải, thay đường dẫn bằng file thực tế:

   ```powershell
   (Get-FileHash -Algorithm SHA256 -LiteralPath "C:\Users\Admin\Downloads\TEN_FILE_VUA_TAI").Hash.ToLowerInvariant()
   ```

5. So sánh kết quả với hash trên web, dán hash thực tế vào ô SHA-256. Nếu khác, chưa duyệt.
6. Ghi rõ trang/mục đã đọc, dữ kiện được xác minh và giới hạn; chọn xác nhận, nhấn **Xác minh bằng chứng**.

Bằng chứng gốc không bị sửa: hệ thống tạo bản đã duyệt, giữ URL/hash/thời điểm tải/thời điểm công bố/phiên bản xử lý, có liên kết về bản gốc. Chỉ các đề xuất chưa duyệt và định danh chưa công bố được chuyển sang bản đã duyệt. Các quyết định đã xác minh hoặc từ chối trước đó giữ nguyên.

Một PDF có thể có nhiều bản ghi phục vụ phạm vi khác nhau: duyệt registry chưa tự xác minh quan hệ tài sản. Ghi chú đã duyệt nằm trong lịch sử `core.publication_reviews` và audit, không bị ghi đè bằng thao tác nhập lại.

## 3. Doanh nghiệp / thực thể

Mở tab **3. Doanh nghiệp / thực thể**. Đối chiếu tên pháp nhân, mã số doanh nghiệp nếu có, nguồn định danh và tài liệu. Ghi lý do, chọn xác nhận và nhấn **Xác minh doanh nghiệp / thực thể**. Thiếu bằng chứng hoặc quyền nguồn sẽ khóa nút duyệt và nêu bước cần làm trước.

Sau bước này doanh nghiệp có thể xuất hiện trong **Tất cả doanh nghiệp**; chưa tự xuất hiện trong danh sách mã chứng khoán.

## 4. Mã chứng khoán và quan hệ

Mở https://investing-pro-web-staging.tuyenkinhmon88.workers.dev/admin/mappings

- **Mã chứng khoán và sàn**: kiểm tra mã, pháp nhân, sàn và ngày hiệu lực. Ghi lý do rồi xác minh để hiển thị trong registry niêm yết/đăng ký giao dịch.
- **Quan hệ doanh nghiệp**: kiểm tra từng tài sản, vai trò trực tiếp/gián tiếp, mốc hiệu lực và tỷ lệ có bằng chứng. Không đổi việc khai thác thành sở hữu 100%. Xác minh từng quan hệ riêng.
- **Định danh thực thể**: xử lý alias/định danh; duyệt định danh không tự xác minh chủ sở hữu.

Nút bị khóa sẽ liệt kê điều kiện thiếu và liên kết về ba bước trước. Nếu hồ sơ thay đổi trong lúc duyệt, tải lại trang để đọc bản hiện tại; không gửi lại quyết định hàng loạt.

## Hồ sơ DVP để đối chiếu

Tài liệu đầu vào và khoảng trống được lưu tại `docs/catalog-review/dvp-asset-proposals-manifest.json`. Bản raw DVP và VGR đã được tải ngược R2 và hash khớp; việc đó không thay thế quyền sử dụng nguồn hoặc quyết định dữ kiện của người duyệt.

- DVP: báo cáo thường niên 2025 trang PDF 1 xác minh pháp nhân/registry; trang 2 nêu các mốc cấp phép khai thác.
- Bến Đình Vũ đúng mục 51 của danh mục 505, gồm cầu 1 và 2; không gộp PTSC/VIMC/Nam Hải Đình Vũ.
- Valid_from trong các đề xuất DVP là mốc cấp phép được báo cáo nêu: 25/02/2005 và 13/06/2008, không phải ngày tàu đầu tiên. Website lịch sử chỉ nêu chuyến đầu tháng 05/2005.
- Có thông báo lựa chọn nhà thầu cải tạo cầu 1 năm 2026. Chưa xác minh đầy đủ ảnh hưởng/tiến độ để kết luận hoạt động liên tục. Giữ quan hệ chờ duyệt nếu chưa giải quyết được điểm này.
- Duyệt registry DVP không xác nhận đã đủ depot, pháp nhân liên quan hoặc toàn bộ danh mục tài sản.

## Kiểm tra kết quả

1. Mở **Doanh nghiệp → Tất cả doanh nghiệp** để xem định danh đã duyệt.
2. Mở **Niêm yết / đăng ký giao dịch** để xem mã đã duyệt.
3. Vào trang công ty kiểm tra từng quan hệ đã duyệt, nguồn và hiệu lực. Quan hệ chỉ hiện trong khoảng hiệu lực và khi các hồ sơ nguồn/định danh phụ thuộc đủ điều kiện.
4. Nếu trống, xem lại điều kiện ở hàng đợi. Không sửa RLS hoặc cấp GRANT ALL để buộc dữ liệu hiện.

## Refresh và kết hợp nguồn API

Lệnh `pnpm data:refresh` cập nhật hồ sơ cơ bản qua Vnstock/VCI, lưu raw/hash, snapshot và batch thay đổi trong `.local/company-refresh`. Có cache 24 giờ và giữ bản trước khi lỗi. Xem `docs/company-data-refresh.md` để cài đặt, refresh một số mã, kiểm tra website hỗ trợ hoặc nhập JSON FiinGroup. Đây là công cụ nghiên cứu local, chưa tự ghi Supabase hoặc tự duyệt/public dữ kiện; dữ liệu trên giao diện staging không tự đổi sau khi chỉ chạy CLI.
