# CDN và tổng quan miền Trung

> **Sửa phép cộng DWT ngày 25/10/2026:** [Kết quả đối chiếu lại](cdn-aggregation-correction-20261025.md): `known_dwt` đã bỏ mất DWT hợp lệ ở những ngày còn một dòng thiếu trọng tải. Bổ sung DWT đã ghi nhận theo dòng và lựa chọn chart riêng; không gọi các tháng trống ở chỉ tiêu nghiêm ngặt là tháng không có lịch.

> **Đính chính độ phủ sau phản hồi người dùng 24/10/2026:** [Rà lại nguồn CDN và Sơn Trà](cdn-official-sources-recheck.md) xác nhận nguồn chính thức nhưng chưa có chuỗi tổng DWT liên tục như Hải Phòng: 22 kỳ tháng có 18 kỳ đủ lượt, 12 kỳ đủ DWT chiều rời và 0 kỳ đủ DWT chiều vào. 658 ngày đọc được không đồng nghĩa đủ trọng tải để vẽ mọi tháng. Sơn Trà không được cộng vào CDN; nguồn PTSC và báo cáo CDN 2025 được đối chiếu riêng. Kết quả UI/refresh bên dưới là kiểm chứng kỹ thuật, chưa phải người dùng chấp nhận chất lượng chuỗi DWT.

Phạm vi được người dùng chọn ngày 24/10/2026: CDN, QNP, CMP, NAP và GMD–Dung Quất. CDN có dashboard lịch; bốn dòng còn lại giữ trạng thái chưa tích hợp lịch sử đủ điều kiện. Không coi năm mã đều đã có dữ liệu hoạt động.

## CDN

Trang `/companies/CDN` có thẻ Tiên Sa và bộ chọn mặc định Tổng quan CDN, kể cả chỉ một cảng. Quan hệ vận hành dựa báo cáo CDN 2025, trang 9, 11–12; không suy ngày hiệu lực hiện hành. Không đưa Sông Hàn, dự án Liên Chiểu hoặc Hòa Vang vào hoạt động Tiên Sa.

Nguồn lịch: `http://tttb.cangvuhanghaidanang.gov.vn/public-kh`, được liên kết từ trang Cảng vụ Đà Nẵng. Chỉ dùng ba tài nguyên đọc của giao diện công khai: khởi tạo/category, lịch đến và lịch rời. Mã Cảng vụ 18, mã cảng BC78 và nhãn Tiên Sa phải khớp. Không lưu URL phiên/session trong biên nhận công khai; chi tiết chuẩn hóa chỉ gồm tàu, giờ, chiều, hai đầu bến và DWT.

Lịch đến/rời là **kế hoạch công bố**, chưa xác nhận actual. Pipeline ATB/ATD container hiện hữu vẫn riêng, không dùng để bù kế hoạch thiếu. Lịch sử 01/01/2025–23/10/2026: 658/661 ngày đọc được, 4.813 lượt (1.692 vào, 3.121 rời). Ba ngày không đủ điều kiện: 20/06/2025 và 03/08/2026 có cùng khóa lịch nhưng DWT mâu thuẫn; 22/10/2025 không có dòng nguồn để chứng nhận tổng bằng 0. Các lần trả trang không nhất quán đã được tải lại tuần tự trước khi chốt.

260 lượt thiếu DWT, gồm một giá trị vượt giới hạn kiểm tra. DWT nguồn bằng 0 hoặc bất thường giữ null; không tự sửa dấu thập phân hoặc thay bằng GT. Biểu đồ mặc định lượt, có lựa chọn DWT; đơn vị giữ đúng trên biểu đồ, bộ lọc và drilldown. DWT kỳ thiếu giữ null thay vì cộng phần có trọng tải thành tổng. YoY lượt chỉ tính khi đủ ngày hai kỳ. Biên nhận từng ngày và hash ở [Lịch sử CDN](catalog-review/cdn-plan-history-20261024.json).

Database dùng importer phiên bản hóa hiện hữu, chống trùng, lịch sử hash, RLS và nguồn/alias giới hạn. Migrations CDN bổ sung asset Tiên Sa, không mở allowlist chung. Import failed head không xóa bản thành công trước đó. Lỗi nguồn không được đổi thành ngày 0.

## Tổng quan miền Trung

Trang `/industries/ports/central`, API `/api/v1/industries/ports/central`: năm dòng cố định, tháng/quý/chiều/thời kỳ và cùng kỳ theo ngày chốt Việt Nam. CDN tái sử dụng metric trang mã. QNP Quy Nhơn chưa đối chiếu các bản kế hoạch bố trí cầu nhiều ngày; CMP phạm vi cầu 1 theo báo cáo 2025; NAP Cửa Lò/Bến Thủy chưa ghép nguồn khu vực đến bến; GMD chỉ Dung Quất. Không dùng dữ liệu Hải Phòng/Gemalink thay GMD–Dung Quất. Link GMD từ cụm mở đúng trạng thái Dung Quất.

Không có tổng DWT miền Trung, thị phần, sản lượng hàng hoặc số liệu tài chính hợp nhất. Bốn dòng thiếu giữ null và có nguồn/phạm vi để nghiên cứu tiếp. Cụm chưa được coi là phủ toàn miền Trung.

## Kiểm chứng và vận hành

Local: 124/124 Vitest, 56/56 Playwright desktop/mobile toàn suite, 14/14 kiểm thử parser Python; typecheck/lint và Next build đạt. Sau sửa đơn vị biểu đồ chạy lại 2/2 Playwright CDN desktop/mobile đạt. Không coi local là xác nhận triển khai.

Workflow `cdn-plans.yml` dự kiến hằng ngày 07:20 giờ Việt Nam; GitHub có thể bắt đầu trễ. Chọn ngày mới, ngày thiếu và bốn ngày gần nhất; có checkpoint, hash archive, nhập lại idempotent, readback và fail rõ lỗi fetch/schema. Ngày nguồn công khai không dùng được ghi unavailable; thành công tác vụ không có nghĩa đủ 661 ngày. Kiểm chứng staging/manual refresh và build sẽ ghi trong biên nhận riêng sau triển khai. Chưa xác nhận chu kỳ cron thực, người dùng review CDN/cụm mới hoặc production.

## Staging đã kiểm chứng — 24/10/2026

[Biên nhận live](catalog-review/cdn-central-staging-20261024.json), [ma trận năm mã](catalog-review/central-coverage-20261024.json). Workers Builds Linux của `c910bd2` thành công. API tổng quan CDN khớp Tiên Sa; CDN trong bảng miền Trung khớp API trang mã. Ngày chốt 23/10: tháng 10 có 113 lượt rời, 76 lượt vào; DWT tổng null do thiếu dữ liệu. Cùng kỳ thiếu ngày 22/10/2025 nên YoY và lũy kế không được hiển thị thành số đủ điều kiện.

UI live 1440px/375px đạt: thẻ Tiên Sa, mặc định Tổng quan và đơn vị lượt trên cả ba biểu đồ; đổi DWT giữ qua chọn bến; năm dòng cụm/four pending, tháng/quý/chiều, hai theme, không tràn ngang. Đã xem ảnh CDN desktop và miền Trung mobile. GMD từ cụm mở thông báo Dung Quất, không hiện lịch Hải Phòng.

[Manual refresh 40108291133](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40108291133) thành công: kiểm tra lại bảy ngày, bốn ngày parsed và ba ngày unavailable công khai giữ thiếu. Không còn lỗi fetch/schema trong lần này. Đây là kiểm chứng chạy thủ công, chưa xác nhận cron thực hoặc độ phủ đủ mọi ngày.
