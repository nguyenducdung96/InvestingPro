# VGR / VSC — dashboard lịch tàu Hải Phòng

Ngày 24/10/2026. Người dùng yêu cầu triển khai VGR và VSC sau khi chấp nhận PHP/DVP, ưu tiên hoàn thiện Hải Phòng.

## Phạm vi được đối chiếu

VGR: VIP Greenport. VSC: Greenport, VIP Greenport, Nam Hải Đình Vũ và VIMC Đình Vũ. Mỗi trang mặc định có Tổng quan; vẫn chọn được từng cảng, kể cả VGR chỉ có một cảng. Header dùng edition database theo ticker; không đóng gói số KPI hoặc chuỗi sự kiện trong code.

- VGR khai thác VIP Greenport; VSC liên quan qua Công ty Cổ phần Cảng Xanh VIP theo báo cáo 2025 đã đối chiếu. Website VIP xác nhận tên pháp nhân và bến. Một kho `vip_green_port` phục vụ cả hai mã, không có bản sao sự kiện theo ticker.
- Greenport: website chính thức xác nhận pháp nhân Công ty TNHH MTV Dịch vụ Cảng Xanh; website Viconship liệt kê đơn vị thành viên. Đối chiếu với báo cáo VSC 2025, không nối chỉ vì giống tên.
- Nam Hải Đình Vũ: quan hệ qua pháp nhân theo báo cáo VSC 2025; tách khỏi Nam Hải, Nam Đình Vũ và Đình Vũ/DVP.
- VIMC Đình Vũ: trang giới thiệu chính thức nêu Viconship là cổ đông lớn. Header ghi quan hệ cổ đông, không nâng thành công ty con hoặc khai thác trực tiếp.

Nguồn đối chiếu: https://greenport.com.vn/ ; https://vipgreenport.com.vn/index.php/sgioi-thieu/gioi-thieu-ve-cong-ty ; https://vimcdinhvu.com.vn/gioi-thieu-ve-chung-toi-a75.html ; https://viconship.com/wp-content/uploads/2026/04/CBTT-Bao-cao-thuong-nien-nam-2025.pdf . Snapshot web là nội dung trích xuất qua web tool, không giả là raw HTML; bản PDF 2025 đã có local và kiểm tra hash. Greenport/Viconship trả 403 cho client tải trực tiếp ở lần này; không vượt chặn, nguồn web trích xuất và hồ sơ PDF đã đối chiếu được giữ tách biệt.

[Manifest mapping](catalog-review/vsc-vgr-berth-scope-20261024.json) lưu hash và ghi chú. Quan hệ là quan sát tài liệu, ngày hiệu lực giữ null. Tổng lịch sử lịch tại các bến trong phạm vi hiện tại không xác nhận lịch sử sở hữu của VSC, không phải sản lượng hoặc doanh thu hợp nhất, không nhân DWT theo tỷ lệ vốn. Chưa xác nhận đây là toàn bộ mọi khoản đầu tư cảng của VSC.

## Pipeline và số liệu

Collector chung chọn `--company VSC`, một lần tải nguồn cung cấp bốn bến. Khớp chính xác GREEN PORT / VIP GREEN PORT / NAM HAI DINH VU / VIMC ở Đến cho vào, Từ cho rời. Di chuyển nội cảng không đi vào tổng. DWT giữ null khi thiếu, không dùng GT; nguồn vẫn là kế hoạch công bố, chưa actual.

[Biên nhận lịch sử](catalog-review/vsc-vgr-plan-history-20261024.json): mỗi bến đủ 661 ngày từ 01/01/2025 đến 23/10/2026. Greenport 787 dòng, VIP Greenport 1.409, Nam Hải Đình Vũ 1.217, VIMC Đình Vũ 904; không thiếu DWT hay nhóm giờ mơ hồ. Bốn kho vật lý, hai góc nhìn mã.

Tổng VSC chỉ tính khi mọi bến có head cùng hash nguồn/ngày; thiếu bến hoặc lệch revision giữ tổng kỳ null. Detail tổng cũng yêu cầu đồng nhất revision. VGR không phụ thuộc độ đầy đủ của ba bến khác. API `/api/v1/companies/VGR/plans` và `/api/v1/companies/VSC/plans` đọc database theo request; chart tháng/quý, MTD/YTD/YoY đúng khoảng ngày, bình quân và drilldown ngày dùng chung các quy tắc đã nghiệm thu PHP/DVP.

Workflow `vsc-plans.yml` thiết kế 06:50 Việt Nam hằng ngày, environment staging, checkout `codex/cloudflare-next-compat`. Cùng job cập nhật bốn bến và cả hai dashboard, tải lại ngày mới/thiếu/bốn ngày gần nhất, lưu revision/cache và readback. Cron thực cần nghiệm thu hai chu kỳ, không dùng manual run thay thế.

## Validation local

115/115 tests TypeScript/database, 17/17 Python parser, typecheck/lint đạt. 10/10 Playwright DVP/PHP/VGR/VSC desktop/mobile đạt. Tests gồm identity dữ liệu VIP giữa VGR/VSC, đủ bốn bến, thiếu bến, revision lệch, alias chính xác, nhập lặp, quyền đọc/ghi, default Tổng quan và đổi từng cảng. Chưa bổ sung chuỗi sản lượng công bố TEU/tấn, hãng tàu hoặc tài chính; không suy từ DWT.
