# Nghiệm thu Slice 1 trên staging

## Nghiệm thu mô hình hồ sơ theo kỳ — 16/10/2026, bản cuối

**Đạt phạm vi snapshot Slice 1 đã được người dùng chấp thuận** tại `docs/slice_1_reported_catalog_scope.md`: 41 hồ sơ doanh nghiệp ứng viên của kỳ 2025, 63 quan sát tài sản và 22 đường nghiên cứu qua pháp nhân đã được nhập cloud. Chưa chứng nhận độ phủ toàn thị trường, trạng thái sở hữu/giao dịch hiện tại hoặc quyền công bố các nguồn đang chờ duyệt. Các nhận định chưa hoàn thành trong các phần lịch sử bên dưới dùng mô hình/phạm vi trước khi điều chỉnh.

Đã áp dụng đủ năm migration `202610160001`–`202610160005`. Có 62 ngày bắt đầu quan hệ chưa xác định; sáu mốc tài liệu lưu riêng, không điền ngày cấp phép/ngày cuối kỳ thay ngày bắt đầu. ICD và căn cứ công nghiệp được phân nhóm riêng. RLS bật đầy đủ, truy vấn anonymous trả 0 hồ sơ và 0 quan sát chờ duyệt. Không duyệt thêm nguồn hoặc công bố dữ kiện trong đợt này.

Cloudflare build `784d65cf-9d6f-40ae-a965-dac507060135` của commit `ddde915d37e5f986eed86db7b824290d1aa72ded` đã build/deploy thành công; Worker version `973af286-b47d-47d9-bb4d-94dd4cb916d0`. Đã kiểm tra trực tiếp giao diện có đăng nhập tại `/admin/catalog`: GMD có sáu quan sát và ICD riêng; ILB tách mốc cấp phép khỏi ngày bắt đầu; MVN mở được đường nghiên cứu với hai liên kết tài liệu và trang PDF; tra cứu mã hoạt động, ILB không tràn ngang ở viewport 845px.

Kiểm tra local: 64 Vitest, 18 Playwright desktop/mobile, 6 readiness và 3 snapshot acceptance tests đạt; lint và typecheck đạt. Build sản xuất được xác nhận thêm bằng build Cloudflare nói trên. Tests fixture không thay thế quyết định duyệt dữ kiện thật. Biên nhận triển khai: `catalog-review/reported-catalog-staging-receipt-20261016.json`; kết quả nghiệm thu máy đọc: `catalog-review/reported-catalog-acceptance.json`.

## Lịch sử các lần kiểm tra trước

## Trạng thái cloud mới nhất ngày 16/10/2026

Đã kiểm tra lại bằng trình duyệt: staging hiện truy cập được và người dùng đã đăng nhập quản trị. Giới hạn truy cập ghi trong các đợt trước không còn áp dụng cho các thao tác đã thực hiện trong đợt này. Đã nhập nguyên bộ `slice1_company_catalog.handoff.sql` qua Supabase SQL Editor UI, chỉ tạo pending; query độc lập xác nhận đúng 41 company IDs, 41 listing pending và 14 quan hệ pending (10 berth, 2 ICD, 2 terminal). Một doanh nghiệp fixture khác vẫn thuộc nguồn blocked. Mọi bảng core/catalog/port vẫn bật RLS.

Đã thấy nguồn mới trên giao diện `/admin/publication`. Trang công khai listing vẫn báo chưa có thông tin đã xác minh, không lộ proposal. Giữ nguyên ba source approved cũ, 52 source to_verify và một source blocked. Người dùng xác nhận chưa có thỏa thuận sử dụng nguồn; chưa thực hiện bất kỳ quyết định duyệt nguồn/dữ kiện hoặc công bố mới nào. Các văn bản hành chính riêng cần được đánh giá đúng phạm vi; không suy ra quyền đối với toàn file ghép hoặc báo cáo doanh nghiệp.

Biên nhận `docs/catalog-review/company-catalog-cloud-import-receipt-20261016.json` chứa hash bộ SQL và số liệu kiểm tra. Kiểm tra local mới nhất: 63 tests Vitest và 6 tests readiness đạt; 16 browser tests, lint, typecheck và build đã đạt trong lượt hoàn thiện trước khi nhập cloud. **Chưa nghiệm thu toàn bộ Slice 1:** còn căn cứ sử dụng nguồn, 57 quan sát thiếu ngày, xác minh trạng thái hiện tại, chuỗi pháp nhân và độ phủ toàn thị trường. Các trạng thái chưa nhập/bị từ chối ở các phần dưới là lịch sử, không phải trạng thái truy cập mới nhất.

## Cập nhật kiểm tra local ngày 16/10/2026

Đã chạy lại toàn bộ 16 kiểm tra trình duyệt desktop/mobile trên fixture và xem ảnh catalog/quản trị: đạt. Bộ nhập mới có 41 định danh, 41 lịch sử giao dịch và 14 quan hệ chờ duyệt; thêm listing STG và 5 cầu/bến tạm CQN với nguồn/ngày cụ thể. 82 tệp raw đã có SHA-256 tải ngược R2 khớp. Toàn bộ 63 tests Vitest và 5 tests kiểm tra readiness đạt. Chưa import bộ mới, duyệt nguồn hoặc công bố staging; các số liệu và UI fixture không xác nhận trạng thái cloud.

`docs/catalog-review/slice1-readiness.json` ghi từng mã còn thiếu gì, và kiểm tra bộ SQL không thay đổi so với manifest/biên nhận. Kết quả integrity đạt, nghiệm thu tổng thể chưa đạt: 57 quan sát thiếu ngày, biến động hiện tại/chuỗi gián tiếp/quyền nguồn/độ phủ toàn thị trường chưa xong. Quyền thao tác staging bị từ chối từ lượt trước vẫn là giới hạn đã ghi nhận; không sử dụng SQL/HTTP/CLI để đi vòng thao tác bị từ chối.

Ngày 15/10/2026 (Asia/Ho_Chi_Minh). Kết quả: đạt chức năng Slice 1 và bộ catalog thật nhỏ. **Chưa nghiệm thu độ đầy đủ dữ liệu Slice 1 trên toàn thị trường.** Không triển khai Slice 2–5.

## Phạm vi dữ liệu cần hoàn thiện

Theo yêu cầu bổ sung của người dùng ngày 15/10/2026, Slice 1 chỉ được coi là hoàn thành dữ liệu sau khi rà soát doanh nghiệp cảng trên HOSE, HNX và UPCoM, đối chiếu các tài sản cảng biển/cảng sông trực tiếp và gián tiếp, và công khai các khoảng trống bằng chứng. ICD phải hiển thị riêng. Một quan hệ đã xác minh không chứng minh hồ sơ doanh nghiệp đầy đủ. Bộ dữ liệu nhỏ và tests dưới đây chỉ là nghiệm thu chức năng, không phải nghiệm thu độ phủ.

Ảnh người dùng cung cấp xác định 15 mã đối chiếu tối thiểu. Đã lưu hồ sơ tài liệu ứng viên cho cả 15 mã tại [catalog-review](catalog-review/README.md), gồm nguồn gốc, hash và thời điểm tải; tất cả vẫn chờ duyệt. Thu thập được báo cáo không đồng nghĩa hoàn tất xác minh sàn, tài sản, quan hệ, ngày hiệu lực hoặc biến động năm 2026. Danh sách 15 mã không thay thế việc rà soát toàn thị trường và phạm vi cảng sông/ICD bổ sung.

## Môi trường

Worker investing-pro-web-staging, Supabase phát triển loapslojajawgzekozfv, nhánh codex/cloudflare-next-compat. Runtime có SUPABASE_URL/SUPABASE_ANON_KEY dạng Secret; web không dùng service-role key. Bucket investing-pro-evidence-staging là Standard, Public Access Disabled.

## Bộ dữ liệu thật

### Đợt mở rộng danh mục pháp lý ngày 15/10/2026

Đã nạp `supabase/imports/505_commercial_catalog.reviewed.sql`: tổng catalog thật có 17 nhóm cảng biển pháp lý, 59 bến và 167 mục cầu cảng. Đây là các mục đã đọc trực quan trong Quyết định 505/QĐ-BXD, không phải toàn bộ danh mục quốc gia. Hồ sơ đầu vào ở `supabase/imports/data/505-commercial-catalog.reviewed.json`; compiler ngoại tuyến chỉ tạo import thủ công, không chạy connector hay tự duyệt.

Đã duyệt riêng 58 định danh mới qua UI quản trị bằng phiên người dùng, có ghi chú tài liệu/trang/phạm vi cho từng mục; định danh Chùa Vẽ đã duyệt trước đó được giữ nguyên. Hàng đợi `entity_mappings` sau đợt này không còn proposal. Quyết định định danh không xác minh chủ sở hữu, đơn vị khai thác hoặc tình trạng hoạt động. Bằng chứng raw sử dụng lại file 505 đã kiểm tra SHA-256 sau tải ngược R2; source record mới giữ thời điểm tải thật từ record trước, không sửa evidence bất biến.

Nguồn `synthetic_dev` đã được chuyển sang blocked bằng import có điều kiện đúng ID/code/owner/URL. Không xóa entities hoặc lịch sử audit. API cloud sau thay đổi trả về 17 nhóm cảng và 59 bến, không còn bến synthetic. Bộ 37 tests đạt, gồm 3 tests mới về import lặp lại, hierarchy, số cầu không liên tiếp và việc ẩn đúng fixture mà vẫn giữ dữ liệu thật. Lint đạt. Các kết quả 2 bến/10 cầu bên dưới là mốc bộ mẫu ban đầu.

Chưa có listing thật hoặc quan hệ doanh nghiệp mới nào được xác minh trong đợt mở rộng này. Vì vậy **chưa hoàn thành nghiệm thu dữ liệu Slice 1**. Phạm vi chính đã chốt: cảng thương mại và doanh nghiệp sở hữu cảng/ICD, gồm biển và sông; ICD riêng; bến chuyên dùng của nhà máy thuộc nhóm bổ sung riêng. Còn phải chốt universe, hoàn thiện chuỗi pháp nhân/tài sản và nguồn/thời gian, nhập proposals rồi duyệt và đối chiếu độ phủ từng mã.

### Sửa đường truy cập danh mục

Trang `/industries/ports` trước đây chỉ liệt kê cảng vụ, khiến các nhóm cảng chưa có `authority_id` không được tìm thấy từ trang chính. Đã đổi mặc định sang danh sách cảng và bổ sung điều hướng Cảng / Bến cảng / Cầu cảng / ICD và cảng cạn / Cảng vụ. Mỗi danh sách dùng repository và RLS hiện có, không gán cảng vụ bằng suy đoán hoặc hardcode dữ liệu doanh nghiệp. Phân trang giữ loại danh mục, giới hạn và ngày truy vấn. Trang chính nêu riêng độ thiếu dữ liệu doanh nghiệp để không đồng nhất catalog hạ tầng với hồ sơ niêm yết đầy đủ.

Kiểm tra local đạt: lint, typecheck, Next production build và 14 kiểm tra desktop/mobile, gồm hồi quy cảng không có cảng vụ, chuyển loại và phân trang. Ảnh kiểm tra local dùng fixture, không phải bằng chứng dữ liệu cloud. Quyền quan sát origin staging trong công cụ trình duyệt đang bị thiết lập đã lưu chặn; chưa xác nhận trực quan bản giao diện mới trên cloud.

### Đợt registry chờ duyệt

Đã chạy import registry trên cloud: 11 listing HNX/UPCoM pending và một đề xuất VGR khai thác VIP Greenport pending. Biên nhận tại `docs/catalog-review/registry-import-receipt.json`; query count sau import trả đúng 11 và 1, rights_status của hai nguồn vẫn to_verify. Đã lưu 11 snapshot riêng tư trên R2; PDF VGR tải ngược có hash khớp. Không tự duyệt nguồn, không công bố listing hoặc quan hệ mới. Toàn bộ 41 tests và lint đạt, gồm kiểm tra replay không tạo thêm audit, không sửa PHP đã xác minh, bảo toàn ngày giao dịch/capture time và chặn admin xuất bản khi nguồn chưa được duyệt. Vẫn chưa nghiệm thu dữ liệu Slice 1 đầy đủ.

### Bổ sung registry HOSE

Đã nhập thêm GMD, DVP, PDN, QNP từ hồ sơ doanh nghiệp chính thức được đọc trực tiếp. Query trên Supabase cloud xác nhận tổng 15 listing pending: HNX 3, HOSE 4, UPCOM 8; nguồn vẫn to_verify. Ba raw object mới đã upload thành công vào bucket riêng tư; bốn PDF báo cáo thường niên dùng lại bản lưu trước. Bảy source records mới giữ published_at NULL và không đổi thời điểm tải cũ. Biên nhận riêng tại `docs/catalog-review/issuer-registry-import-receipt.json`.

Toàn bộ 42 tests, lint và typecheck đạt. Các tests bổ sung kiểm tra ngày giao dịch, tên Gemadept theo điều lệ 2026, bảo toàn PHP, replay và ẩn dữ liệu chưa duyệt. Chưa duyệt listing hoặc tự cấp phép nguồn; chưa thêm quan hệ tài sản cho bốn mã này. Trình duyệt vẫn từ chối quyền quan sát origin staging khi thử lại sau import. Cần hoàn thiện phạm vi doanh nghiệp/tài sản và duyệt hợp lệ trước khi tuyên bố hoàn thành Slice 1.

### Đề xuất quan hệ DVP

Đã tải ngược raw DVP từ R2, SHA-256 khớp bản gốc; đọc trực quan trang PDF 1–2. Import cloud thêm ba quan hệ pending cho bến Đình Vũ và cầu 1, 2; query đọc lại tên, ngày và ownership_pct NULL khớp dossier. Bằng chứng mới giữ quality incomplete, nguồn to_verify; không sửa entity hay bản ghi bằng chứng cũ. Mốc valid_from là mốc cấp phép được báo cáo nêu, không phải ngày tàu đầu tiên. Cần đối chiếu quyết định gốc và thay đổi khai thác/cải tạo 2026 trước duyệt. Chưa công bố quan hệ hoặc hoàn tất danh mục DVP. Bộ 43 tests và lint đạt; biên nhận ở `docs/catalog-review/dvp-asset-import-receipt.json`.

### Luồng duyệt nguồn, bằng chứng và định danh

Đã bổ sung `/admin/publication` và API admin cho ba bước nguồn → bằng chứng → định danh, nối sang hàng đợi mã/quan hệ hiện có. Không tự duyệt nguồn thật. Migration `202610150004_admin_publication_review.sql` đã áp dụng trên Supabase cloud; query kiểm tra cho thấy bảng review tồn tại, RLS bật, authenticated có quyền gọi RPC (hàm vẫn kiểm tra admin/UID), anon không có quyền execute và chưa có quyết định công bố nào được tạo.

Xác minh bằng chứng append bản immutable mới, bảo toàn metadata tải/công bố/hash/key/parser, ghi actor và lý do riêng; chỉ repoint các đề xuất pending và định danh chưa công bố. Bản gốc và quyết định đã duyệt giữ nguyên. Duyệt bằng chứng không tự duyệt doanh nghiệp/listing/quan hệ. Hàng đợi quan hệ hiển thị tên thực thể và khóa xác minh khi thiếu nguồn/bằng chứng/định danh.

Đạt 47 tests, 16 kiểm tra desktop/mobile, lint, typecheck và production build. Kiểm thử SQL đi hết luồng từ private tới public, kiểm tra từ chối người không có quyền, hash sai, replay, bằng chứng bất biến, audit actor và ẩn dữ liệu khi nguồn bị thu hồi. Ảnh UI dùng fixture; không phải ảnh duyệt dữ liệu thật trên staging. Hướng dẫn người dùng ở `docs/admin_publication_guide.md`. Luồng quản trị hoàn thiện không đồng nghĩa đã nghiệm thu độ phủ dữ liệu Slice 1.

### Chi tiết bộ mẫu ban đầu (lịch sử)

1 cảng vụ Hải Phòng, 1 cảng biển Hải Phòng, 2 bến Chùa Vẽ/Tân Vũ, 10 cầu cảng, Công ty cổ phần Cảng Hải Phòng: 15 entities. Đã duyệt định danh Chùa Vẽ và quan hệ vận hành doanh nghiệp–Tân Vũ qua UI. Hiệu lực quan hệ từ phạm vi quyết định 04/06/2026, không phải ngày bắt đầu khai thác lịch sử. Tỷ lệ sở hữu giữ null. Không dùng danh sách cũ để khẳng định doanh nghiệp trực tiếp vận hành Chùa Vẽ sau thay đổi đơn vị năm 2025.

Chưa nạp ticker thật từ nguồn chưa duyệt. Danh mục tất cả doanh nghiệp tách khỏi danh mục niêm yết/đăng ký giao dịch; không tự gắn PHP hoặc sàn giao dịch. Chức năng listing được kiểm tra bằng fixtures và SQL tests.

## Bằng chứng và phạm vi quyền

Chỉ duyệt các văn bản quy phạm/hành chính cụ thể theo khoản 2 Điều 15 Luật SHTT, không phải toàn website, bài báo, ảnh hoặc giá. Attribution giữ trong citation. Nguồn ứng viên khác vẫn to_verify.

- Thông tư 23/2019/TT-BGTVT: https://vanban.chinhphu.vn/default.aspx?docid=197297&pageid=27160 . Đã render/read trực quan tên cảng vụ/cảng. Footer yêu cầu ghi nguồn Chính phủ khi phát hành lại. Không nhập ranh giới hoặc tuyên bố mọi quy định chưa bị sửa đổi.
- Danh mục 505/QĐ-BXD: https://moc.gov.vn/vn/pages/ChiTietVanBan.aspx?TypeVB=1&vID=4914 . Đối chiếu VIMAWA; hai PDF trùng hash. Đã đọc trực quan dòng 38 trang 5–6 và dòng 52 trang 6. PDF trống số/ngày ở trang đầu; metadata đối chiếu hai cổng chính thức. Không khẳng định chữ ký số.
- Quyết định Tân Vũ công bố tại website chính thức doanh nghiệp: https://haiphongport.com.vn/vi/tin-tuc/cang-hai-phong-nang-cao-nang-luc-tiep-nhan-tau-den-55000-dwt-tai-ben-cang-tan-vu-hoan-thien-ha-tang-luong-hang-hai-phuc-vu-khach-hang.html . Đã đọc PDF tiêu đề, Điều 3 khoản 2 và Điều 4. Số 1241/ngày 04/06/2026 đối chiếu https://cangvuhaiphong.gov.vn/thong-tin-cau-cang/ . Chỉ dùng quyết định hành chính, không cấp quyền bài báo; không khẳng định chữ ký số.

Robots đã kiểm tra: Cảng vụ cho phép truy cập; doanh nghiệp cho phép PDF nhưng chặn Admin/WebService và một số đường dẫn; VIMAWA trả 404. Robots không được coi là giấy phép tái phân phối.

## R2, lineage và correction

Cả ba file đã upload riêng tư, tải lại từ R2 và tính SHA-256 khớp bản gốc:

- Thông tư: b3443a0b3803fe7820fac3ad85f38e9bf24adeade737a7a9b0d4703370826548.
- Danh mục: f04add8517aac678a238ef8c94aea3e3cbd02c57971694c42c6e3d06c9861a04.
- Quyết định Tân Vũ: 1b3f9147f3d2536d1306b47e6e21624658154aa8f475916b66ceb28015acc11b.

Object keys có tiền tố catalog-evidence/sha256/. Upload thủ công qua dashboard có Content-Type application/octet-stream và chưa custom metadata; source record ghi loại PDF của nguồn. Adapter persistRawEvidence có unit tests, chưa chạy adapter đó trực tiếp trên R2 cloud. Không có connector tự động.

Source records ghi fetched_at thật. Đã append source correction hp-catalog-v2 giữ published_at null khi chưa biết timestamp công bố chính xác; ngày hiệu lực được lưu riêng. Không UPDATE evidence bất biến. Interest cũ ...0023 được supersede bằng ...0034, mapping cũ ...0013 bằng ...0035 (tiền tố UUID 10000000-0000-0000-0000-). Cả hai corrections được duyệt lại qua UI; API active chỉ trả một quan hệ. Lịch sử cũ vẫn còn.

## Kết quả kiểm tra

- Lint, typecheck, 34 tests (gồm 15 SQL constraint/RLS cases), 12 desktop/mobile checks, Next.js build: đạt; đã chạy lại ngày 15/10/2026 cho phần ICD và duyệt listing.
- API thật: 2 bến, mỗi bến 5 cầu; coverage.ratio null, không biến thiếu dữ liệu thành zero.
- Tài sản công ty tại 03/06/2026: 0 quan hệ; tại 04/06/2026: 1 verified. Sau correction: đúng một active interest ...0034, nguồn v2, publishedAt null.
- Anonymous admin API: 401. Audit mẫu đã xác nhận actor/thời điểm/ghi chú; review thật chạy qua UI, không UPDATE verification_status bằng SQL.
- Windows không bundle OpenNext do symlink; Workers Builds Linux là đường triển khai Cloudflare đã dùng.

SQL trong supabase/imports là import thủ công có bằng chứng, không phải seed và không chạy trong build. Thay placeholder thời điểm tải thật và xác minh R2 trước khi nhập. Review các proposals qua UI; corrections append lịch sử. Không dùng script để tự cấp phép nguồn mới.

Dữ liệu toàn quốc, ticker thật, connector định kỳ, lượt tàu, DWT, ranking, giá và tài chính không thuộc bộ dữ liệu nghiệm thu này.
