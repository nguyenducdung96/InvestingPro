# Refresh dữ liệu doanh nghiệp Slice 1

## Chọn nguồn

Đã đọc tài liệu công khai ngày 16/10/2026. Người dùng chọn nguồn dễ dùng, chi phí thấp và chưa có tài khoản API. Vì vậy ưu tiên thử Vnstock/VCI cho hồ sơ cơ bản, kết hợp website doanh nghiệp và dữ liệu dossier hiện có. FiinGroup là lựa chọn nâng cấp có hợp đồng dữ liệu rõ; không yêu cầu mua để chạy phần miễn phí. Nguồn TCBS cũng có MCP chính thức cho hồ sơ và công ty con, nhưng yêu cầu OAuth tài khoản TCBS; OpenAPI giao dịch không mặc định thay cho API hồ sơ. Tham khảo https://help.tcbs.com.vn/tcbs-mcp-server/ và https://developers.tcbs.com.vn/. Chưa có tài khoản FiinGroup nên chưa gọi API của họ hoặc xác nhận chi phí, hạn mức, độ phủ 41 mã hay quyền hiển thị lại.

- FiinGroup: `/Company/GetOrganization` cung cấp OrganCode, Ticker, OrganName, ComGroupCode, ListingDate, Status, UpdateDate. Docs: https://datafeed.fiingroup.vn/api-doanh-nghiep/ho-so-doanh-nghiep/ho-so-doanh-nghiep/thong-tin-chung-ve-doanh-nghiep
- FiinGroup: `/Company/GetOrganizationRole` cung cấp hai OrganCode và hai role ID, Status, UpdateDate. Docs: https://datafeed.fiingroup.vn/api-doanh-nghiep/ho-so-doanh-nghiep/ho-so-doanh-nghiep/du-lieu-quan-he-giua-cong-ty-voi-cong-ty-cong-ty-lien-ket
- Vietstock có DataFeed theo yêu cầu; tài liệu công khai đã xem chưa cung cấp đủ endpoint/xác thực/response để viết adapter thật: https://static1.vietstock.vn/vietstock/2025/VSTF_Huong_dan_su_dung_2025.pdf
- Vnstock có `Reference().company(symbol).info()` và `.subsidiaries()` qua VCI/KBS. Thư viện truy cập nguồn thứ ba, không phải một hợp đồng phân phối dữ liệu thay cho nguồn đó. Tài liệu hiện có nhiều thế hệ API; chỉ triển khai sau khi pin được phiên bản cài thực tế và test nguồn. https://www.vnstocks.com/docs/vnstock/tham-chieu-reference và https://www.vnstocks.com/docs/vnstock/tham-khao/data-sources
- VNFDATA có trang hồ sơ và công ty con GMD dùng đối chiếu thủ công; chưa tìm được hợp đồng API công khai trong phạm vi đã kiểm tra: https://data.vietnamfinance.vn/co-phieu/GMD/ho-so-doanh-nghiep

Không dùng endpoint web nội bộ bị đoán, không tự chuyển nhà cung cấp khi bị từ chối. Việc tra cứu provider/reference data này được người dùng yêu cầu bổ sung riêng cho Slice 1, không mở rộng sang giá, metrics, port calls hay phân tích tài chính.

## Cách chạy ưu tiên cho nguồn chi phí thấp

Đã kiểm tra với Python 3.12.14; cài Vnstock **5.0.3** từ kho chính thức vào `.local/company-refresh-venv`; không cài vào Python hệ thống. Lần thử live GMD/PHP/MVN lấy được hồ sơ từ `vci`; lần hai GMD trả unchanged. Dữ liệu phản ánh nội dung nhà cung cấp trả về tại lúc tải, không chứng nhận mọi trường đã cập nhật tới hôm nay. API này không cung cấp danh mục cảng vật lý đầy đủ.

```powershell
pnpm data:refresh
pnpm data:status
# Chỉ thử ba hồ sơ, kèm kiểm tra trang web hỗ trợ:
pnpm data:refresh --tickers GMD,PHP,MVN --web
# Trên máy mới có Python 3.12+:
pnpm data:refresh --install
```

Mặc định lệnh đầu refresh hồ sơ cơ bản của cả 41 mã đã chốt, cách ít nhất 12 giây mỗi request, source VCI được chọn rõ. Cache hồ sơ 24 giờ; dùng `--force` khi cần gọi lại thật. Chỉ retry mã giới hạn theo phút tối đa hai lần với thời gian chờ 60 giây; không retry lỗi quyền, challenge hay hạn mức giờ/ngày. Không tải giá, giao dịch hoặc dữ liệu tài khoản. `--web` chỉ kiểm tra hai trang khai báo tại `config/company-web-sources.json`; có thể bổ sung URL thực đã đối chiếu cho doanh nghiệp khác. Lưu HTML riêng, ETag/Last-Modified nếu có, hash và lịch sử kiểm tra. HTML thay đổi chỉ yêu cầu đọc lại, không tự kết luận dữ kiện kinh doanh đã thay đổi. Trang lỗi/redirect không thay bản lưu cũ.

`vnstock-last-run.json` là trạng thái lần chạy; snapshot/batches nằm trong `by-ticker/<ticker>/vnstock-vci/organizations`. Truy xuất `.subsidiaries()` của VCI và KBS trong phiên guest hiện trả **EntitlementError**; kiểm tra riêng VCI xác nhận mã `VNSTOCK_TIER_ROUTE`; chưa có refresh tự động quan hệ công ty ở mức truy cập này. Không đổi nguồn tự động để né lỗi. Tiếp tục dùng 63 quan sát và 22 đường nghiên cứu của dossier cho phần tài sản/quan hệ; website hỗ trợ đối chiếu. Muốn mở phần quan hệ, chọn cấp truy cập phù hợp của Vnstock hoặc gói API khác, không bắt buộc mua FiinGroup.

## Chạy bằng JSON export của FiinGroup

Không cần API key để xử lý file JSON do tài khoản nhà cung cấp xuất ra. Script dùng Python standard library, không cần thêm package:

```powershell
python scripts/refresh-company-data.py --dataset organizations --input .local/fiingroup-organizations.json
python scripts/refresh-company-data.py --dataset relationships --input .local/fiingroup-relationships.json
```

Nếu response bọc trong `data.items`, thêm `--records-path data.items`. Input phải theo đúng schema được tài liệu hóa của FiinGroup; không đưa export của nguồn khác qua adapter này.

Kết quả nằm trong `.local/company-refresh/`, được Git bỏ qua:

- `raw/<sha256>.json`: dữ liệu gốc để đối chiếu;
- `fiingroup/<dataset>/latest.json`: snapshot gần nhất đã qua kiểm tra schema;
- `fiingroup/<dataset>/batches/*.json`: lịch sử từng lần refresh, before/after và phần mất khỏi response. Batch cũ không bị mất khi lần sau không có thay đổi.

Lần đầu tạo baseline; lần tiếp theo chỉ xuất trường mới/thay đổi để đối chiếu. Dữ liệu thiếu trong response không đồng nghĩa đã xóa. Response rỗng, HTML lỗi, sai schema, mã trùng hoặc sai status không thay snapshot trước. Mỗi batch có fetched_at và raw hash; UpdateDate của nhà cung cấp giữ riêng, không biến thành ngày bắt đầu sở hữu/khai thác.

## Nối API tài khoản

Lưu config riêng dưới `.local/`, không commit credential. Ví dụ cấu trúc ở `config/company-refresh.example.json`. Điền endpoint HTTPS thật được cấp, phương thức, body/filter, records_path và tên biến môi trường chứa header xác thực. `datafeed.fiingroup.vn` là trang tài liệu, không phải endpoint dữ liệu.

```powershell
python scripts/refresh-company-data.py --dataset organizations --config .local/fiingroup-organizations.config.json
```

Phải xác nhận hợp đồng response đầy đủ/filter/phân trang với nhà cung cấp rồi đặt `complete_response_confirmed=true`. Không xem một trang response là toàn thị trường. Adapter hiện xử lý một response/export đầy đủ có giới hạn 10 MiB, chưa tự phân trang theo giao thức chưa được cấp. GET/POST theo tài khoản; không đoán query parameter. Header xác thực được lấy từ môi trường, không lưu vào raw/batch, không theo redirect, không in body lỗi. HTTP 429/5xx thử lại tối đa ba lần; 401/403 dừng.

## Kết hợp nguồn và duyệt thay đổi

1. Dùng hồ sơ API để xác định mã nhà cung cấp và doanh nghiệp. OrganCode không được mặc định bằng ticker hoặc UUID nội bộ. Đối chiếu với 41 mã trong `docs/catalog-review/reported-catalog-manifest.json`.
2. Quan hệ API chỉ nối công ty với công ty. Cần bảng mã role chính thức trước khi diễn giải LeftRoleId/RightRoleId. Không suy ra tỷ lệ sở hữu, quyền khai thác cảng hay ngày bắt đầu từ role ID/CreateDate.
3. Website doanh nghiệp/cảng bổ sung tài sản cụ thể, đơn vị vận hành và thay đổi. Ví dụ nguồn hệ thống cảng Gemadept: https://ndv.gemadept.com.vn/dong-tho-cang-nuoc-sau-gemalink-giai-doan-2-nang-tam-vi-the-cua-ngo-giao-thuong-quoc-te/
4. VNFDATA/Vietstock hỗ trợ đối chiếu hoặc phát hiện thiếu sót. Hai website cùng lấy một feed không được tính thành hai xác nhận độc lập. `ListingDate` có thể được feed biểu diễn dưới dạng UTC; giữ nguyên timestamp, không cắt phần ngày trước khi xác nhận múi giờ với nguồn. Mâu thuẫn giữ cả hai nguồn và thời điểm, không ghi đè âm thầm.
5. Mỗi batch là đầu vào nghiên cứu để bổ sung dossier, nguồn và bằng chứng qua quy trình nhập/review hiện có. Script chưa tự ghi Supabase hay thay quyết định đã duyệt. Dữ liệu công bố vẫn theo từng trường và nguồn được phép; không chặn hồ sơ chỉ vì một trường chưa biết ngày.

## Nhịp vận hành đề xuất

Refresh reference data mỗi ngày hoặc theo hạn mức/gói dịch vụ; rà website doanh nghiệp khi có batch thay đổi, công bố thông tin mới hoặc theo tuần. Đây là khuyến nghị vận hành, **chưa tạo lịch tự chạy**. Lệnh refresh VCI hiện đã thử live và có thể chạy thủ công. Chỉ bật lịch sau khi chốt hạn mức và nơi vận hành. Với FiinGroup, cần kiểm tra thêm phân trang, mã role, timestamp và các điều kiện hiển thị theo tài khoản thật.

## Điều kiện còn thiếu để nghiệm thu API live

Endpoint tài khoản, thông số xác thực được cấu hình bên ngoài chat, mẫu response thật, quy tắc phân trang/lọc, bảng mã role và phạm vi quyền dùng gói dữ liệu. Có thể triển khai phần refresh/export và kiểm thử ngay; không ghi nhận API live đã hoạt động chỉ dựa trên ví dụ trong tài liệu.

Phần điều kiện trên áp dụng cho FiinGroup và API quan hệ chưa mở, không phủ nhận kiểm tra VCI hồ sơ thật đã thực hiện. Nếu Vnstock thay schema hoặc báo `VNSTOCK_RELEASE_EXPIRED`, giữ snapshot cũ; cập nhật pin trong `config/requirements-company-refresh.txt`, cài lại và chạy kiểm tra mẫu/so sánh trước khi thay phiên bản vận hành. Không tự nâng phiên bản khi người dùng bấm refresh.

## Kết quả kiểm tra live 16/10/2026

Đã lấy đủ 41/41 hồ sơ cơ bản trong phạm vi qua VCI, kiểm tra SHA-256 của cả 41 raw JSON và ticker trong response khớp mã yêu cầu. GMD đã được gọi lại thật và nhận unchanged. Raw/snapshot ở local riêng tư, chưa upload R2 hay nhập Supabase; trạng thái cloud của Slice 1 không bị thay đổi. Biên nhận không chứa nội dung profile: `catalog-review/company-refresh-live-receipt-20261016.json`. Trang hỗ trợ VNFDATA lưu baseline thành công; trang Nam Đình Vũ trả HTTP 500 lúc kiểm tra trực tiếp. API quan hệ VCI trong phiên guest báo `VNSTOCK_TIER_ROUTE`, không coi phần quan hệ API đã hoàn tất.

## Khép kín luồng staging ngày 17/10/2026

`pnpm data:refresh` tự xuất `.local/company-refresh/staging-bundle.json` sau khi kiểm tra raw hash. Mở `/admin/refresh` bằng phiên admin, chọn bundle rồi **Nhập và đối chiếu thay đổi**. API kiểm tra hash một lần nữa; RPC kiểm tra 41 mã/UUID trong phạm vi, nhập transaction và chống trùng. Trang hiển thị dữ liệu thật từ Supabase, lần nhập gần nhất, snapshot mới nhất và so sánh phiên bản trước. Quyết định chấp nhận tham chiếu hoặc từ chối có actor/note/thời gian và bất biến sau duyệt; quyết định này không thay xác minh quan hệ cảng hoặc quyền công bố. Raw JSON lưu trong bảng chỉ admin truy cập. Người dùng không cần SQL Editor để cập nhật hồ sơ.

Các đoạn nói công cụ chưa nhập được Supabase ở trên mô tả lượt triển khai local ngày 16/10; luồng upload có xác thực này thay thế giới hạn đó. Không có lịch tự chạy hoặc lấy token từ trình duyệt.

## Kích hoạt Cộng đồng và kiểm tra API quan hệ — 17/10/2026

Đã đăng nhập tài khoản hiện có và kích hoạt thư viện; `vnstock.status()` xác nhận tier `free`. API `Reference().company(ticker).subsidiaries(source="vci")` đã chạy thật: GMD 26 quan hệ duy nhất, PHP 14 và MVN 32. GMD có hai cặp dòng trùng hoàn toàn; giữ nguyên raw, gộp khi so sánh, vẫn từ chối duplicate mâu thuẫn. Các ghi chú guest bị chặn ở trên là lịch sử trước kích hoạt, không còn là trạng thái của môi trường local hiện tại. File tạm chứa key đã xóa; key không đưa vào Git/chat. Đây là quan hệ công ty do nhà cung cấp trả về, không tự xác minh sở hữu tài sản cảng hoặc quyền hiển thị lại. Biên nhận: `catalog-review/vnstock-community-live-receipt-20261017.json`.
