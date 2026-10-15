# Nghiệm thu Slice 1 trên staging

Ngày 15/10/2026 (Asia/Ho_Chi_Minh). Kết quả: đạt chức năng Slice 1 và bộ catalog thật nhỏ. **Chưa nghiệm thu độ đầy đủ dữ liệu Slice 1 trên toàn thị trường.** Không triển khai Slice 2–5.

## Phạm vi dữ liệu cần hoàn thiện

Theo yêu cầu bổ sung của người dùng ngày 15/10/2026, Slice 1 chỉ được coi là hoàn thành dữ liệu sau khi rà soát doanh nghiệp cảng trên HOSE, HNX và UPCoM, đối chiếu các tài sản cảng biển/cảng sông trực tiếp và gián tiếp, và công khai các khoảng trống bằng chứng. ICD phải hiển thị riêng. Một quan hệ đã xác minh không chứng minh hồ sơ doanh nghiệp đầy đủ. Bộ dữ liệu nhỏ và tests dưới đây chỉ là nghiệm thu chức năng, không phải nghiệm thu độ phủ.

## Môi trường

Worker investing-pro-web-staging, Supabase phát triển loapslojajawgzekozfv, nhánh codex/cloudflare-next-compat. Runtime có SUPABASE_URL/SUPABASE_ANON_KEY dạng Secret; web không dùng service-role key. Bucket investing-pro-evidence-staging là Standard, Public Access Disabled.

## Bộ dữ liệu thật

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

- Lint, typecheck, 29 tests (gồm 12 SQL constraint/RLS cases), 12 desktop/mobile checks, Next.js build: đạt.
- API thật: 2 bến, mỗi bến 5 cầu; coverage.ratio null, không biến thiếu dữ liệu thành zero.
- Tài sản công ty tại 03/06/2026: 0 quan hệ; tại 04/06/2026: 1 verified. Sau correction: đúng một active interest ...0034, nguồn v2, publishedAt null.
- Anonymous admin API: 401. Audit mẫu đã xác nhận actor/thời điểm/ghi chú; review thật chạy qua UI, không UPDATE verification_status bằng SQL.
- Windows không bundle OpenNext do symlink; Workers Builds Linux là đường triển khai Cloudflare đã dùng.

SQL trong supabase/imports là import thủ công có bằng chứng, không phải seed và không chạy trong build. Thay placeholder thời điểm tải thật và xác minh R2 trước khi nhập. Review các proposals qua UI; corrections append lịch sử. Không dùng script để tự cấp phép nguồn mới.

Dữ liệu toàn quốc, ticker thật, connector định kỳ, lượt tàu, DWT, ranking, giá và tài chính không thuộc bộ dữ liệu nghiệm thu này.
