# Catalog công khai: dữ kiện biên tập, độc lập nhà cung cấp

## Quyết định phạm vi ngày 17/10/2026

Người dùng yêu cầu hoàn thiện sản phẩm công khai, không phụ thuộc quyền API Vnstock. Bản phát hành `slice1-editorial-facts-v1` là tập dữ kiện InvestingPro tự biên tập từ hồ sơ đã đọc và lưu dấu vết, không phải bản xuất lại dữ liệu của VCI/Vnstock, HNX hoặc toàn văn báo cáo doanh nghiệp.

Chỉ công bố tên/mã doanh nghiệp, thị trường ghi nhận trong hồ sơ, kỳ báo cáo, tên tài sản, vai trò theo báo cáo, tên pháp nhân trung gian, phạm vi cầu, các mốc có căn cứ và liên kết/trang/hash nguồn. Không công bố giới thiệu API, bảng công ty có góp vốn của nhà cung cấp, toàn văn, ảnh, biểu đồ, file báo cáo, đường dẫn kho bằng chứng riêng hoặc trích đoạn nguyên văn. Các câu mô tả trạng thái và giới hạn là câu do InvestingPro biên tập.

## Căn cứ và giới hạn

[Văn bản hợp nhất 155/VBHN-VPQH về Luật Sở hữu trí tuệ](https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/9/155-vbhn-vpqh.pdf), Điều 15, trang PDF 11–12, phân biệt đối tượng không thuộc phạm vi bảo hộ quyền tác giả, trong đó có số liệu, với tác phẩm và sưu tập dữ liệu được bảo hộ ở Điều 14. Căn cứ sử dụng ở đây là phạm vi dữ kiện do dự án chọn lọc, đối chiếu và trình bày lại; không suy ra giấy phép sao chép báo cáo hoặc toàn bộ cơ sở dữ liệu. Đây là quyết định biên tập cho đúng trường dữ kiện, không phải xác nhận có thỏa thuận với bất kỳ nguồn nào.

Nguồn HNX được dẫn tới tài liệu doanh nghiệp công bố để người đọc đối chiếu. Không phát hành lại giao diện, bài viết, bảng tổng hợp, file hoặc feed HNX. Không coi việc có tài khoản Vnstock hoặc file công khai là giấy phép tái phân phối API. API và bản lưu tài liệu tiếp tục nội bộ theo cơ chế hiện có.

## Trạng thái dữ kiện

41 doanh nghiệp là phạm vi đối chiếu cố định, không phải toàn thị trường. 63 quan sát là thông tin theo báo cáo 2025, không được gắn nhãn quan hệ đang hiệu lực đã xác minh. 22 đường liên hệ giữ nhãn cần đối chiếu. Hồ sơ không có quan sát không được diễn giải là không có tài sản. ICD riêng, dịch vụ không biến thành sở hữu, mốc quyết định không biến thành ngày bắt đầu. Không lấy tỷ lệ pháp nhân từ API để suy ra tỷ lệ sở hữu cảng.

## Quy trình phát hành và refresh

1. Đọc và đối chiếu nguồn; cập nhật hồ sơ nghiên cứu theo quy trình hiện có, lưu nguyên bản riêng và kiểm tra hash.
2. Chạy `python scripts/export-public-catalog.py` bằng Python đã cấu hình của dự án. Script kiểm tra 41 mã/63 quan sát, hash từng file gốc và biên nhận R2; xuất `.local/company-refresh/public-catalog.json` cùng bản dữ kiện để review trong Git tại `docs/catalog-review/public-catalog-facts.json`. Script không import hoặc gọi Vnstock.
3. Tại `/admin/catalog`, mở **Phát hành bản dữ kiện công khai**, chọn file, ghi căn cứ/phạm vi/kết quả rà soát và xác nhận. Chỉ admin đã được Supabase xác thực được thực hiện.
4. RPC đối chiếu mã, kỳ, hash/URL/trang tài liệu và từng quan sát với database. Bản phát hành là transaction bất biến, có actor, thời gian, ghi chú và audit. Nhập lại không tạo bản trùng; không sửa quyền nguồn, bằng chứng hoặc quan hệ đã xác minh trước đó.
5. Trang danh mục và trang doanh nghiệp công khai đọc edition từ Supabase, không gọi API nhà cung cấp hoặc yêu cầu phiên đăng nhập. Bản phát hành cũ vẫn phục vụ khi nguồn tham khảo bên ngoài bị lỗi.

Mở rộng kỳ/phạm vi phải cập nhật hợp đồng và kiểm tra tương ứng; không âm thầm đổi 41 mã thành toàn thị trường. `pnpm data:refresh` vẫn cập nhật API tham khảo nội bộ riêng; dữ liệu mới không tự được phát hành công khai.
