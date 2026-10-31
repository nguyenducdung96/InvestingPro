# HCM: nguồn kế hoạch quốc gia truy cập được từ cloud — 31/10/2026

Đã hoàn tất bước đối chiếu ma trận 40 mẫu tiếp theo; dùng [kết quả và hợp đồng nguồn mới](hcm-national-matrix-audit-20261031.md) làm trạng thái hiện hành. Báo cáo ba mẫu ban đầu bên dưới giữ để truy vết.

## Kết luận và phạm vi

Đã tìm và kiểm chứng một đường nguồn chính thức mới cho HCM trên [cổng dịch vụ công hàng hải quốc gia](https://hanghai.moc.gov.vn/tra-cuu-giay-phep): menu kế hoạch điều động, `maritimeCode=21` có nhãn TP. HỒ CHÍ MINH, hồ sơ `MESSAGE_TYPE=70`. Không phải API bản đồ/NEO. **Đã đạt tải ba mẫu từ cloud; chưa đạt thay thế toàn bộ bảng lịch HCM hoặc refresh tự động.** Website bảng lịch cũ vẫn chưa được nghiệm thu truy cập cloud bằng kết quả này.

[Run 41201078402](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41201078402) success trên Ubuntu hosted runner: GET form/menu → POST đúng bộ lọc ba ngày → tải ba PDF → kiểm nội dung, schema DWT/From/To và tên tàu. Workflow chỉ có `contents: read`, không có lịch, không export/push ứng dụng. Đăng ký riêng workflow trên main tại `de445c2`; không merge ứng dụng staging vào main. Artifact raw PDF/hash/receipt giữ 90 ngày; đây chưa phải kho archive vĩnh viễn.

Code review mẫu **4d8399f** đã qua CI/Cloudflare. Sửa thêm parser số lượng khi nguồn dùng `Showing 1 result` thay vì số nhiều tại **d667b83**; giữ fail-closed với thông báo không nhận dạng. **10 Python national tests đạt**, [Quality 41201404500](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41201404500) success gồm validate/E2E desktop/mobile/required check; Cloudflare build success. Không đổi ledger, API/UI, alias hoặc số liệu đã công bố.

[Biên nhận đầy đủ](catalog-review/hcm-national-source-review-20261031.json) tách mẫu cloud và kiểm tra bổ sung tại máy. Các đường xem hồ sơ đã bỏ session/auth query; không lưu credential vào tài liệu dự án.

## Mẫu kế hoạch và đối chiếu

- HINANO: truy vấn 01/01/2025, PDF kế hoạch vào BẾN CẢNG RAU QUẢ/K16 lúc 22:00 cùng ngày, DWT 12.292; khớp mẫu bảng HCM đã lưu. SHA PDF `3adf372ab95d89525dfcfb90445e6c1e7a818772b7a59a3f8c0a115fe549bfb3`.
- NYK OCEANUS: truy vấn 25/10/2026 nhưng PDF ghi kế hoạch **26/10 00:00**, DWT 104.525, đến TCCT. Đây là mẫu schema/ngày, không gán vào SGP/GMD chỉ từ tên tàu hay nhãn cầu số 1. SHA `64ee7a8a7dddfdb02f62db42a5a5b5774874e39e2af6b05f2ffecb791e93ac63`.
- NEWSUN GREEN 03: truy vấn 30/10 nhưng PDF ghi **31/10 01:00**, Đà Nẵng → **BẾN CẢNG SÀI GÒN/K12**, DWT 4.893. Đã render trang PDF và đối chiếu bảng HCM ngày 31/10 tại máy: tên/giờ/DWT/cầu K12 khớp chiều vào. SHA `a55aedb719bf7cb197bfd7e7dfdaa0f4b1c1c97d0cb6e2b46ac4b52d2d25556f`.

Số bản ghi danh sách ba truy vấn tương ứng 41/49/51; chỉ trang đầu và một PDF chọn trước mỗi ngày được kiểm chứng. Không dùng các số này làm số lượt tàu hoặc chứng nhận đã tải đủ danh sách. Ngày truy vấn/ngày hiển thị danh sách **không được dùng thay thời gian kế hoạch bên trong PDF**.

## Chiều rời và khác phiên bản: chưa thể nối thẳng

Kiểm tra bổ sung tại máy, không được coi là bằng chứng cloud cho các tài nguyên này:

- NEWSUN GREEN 03, bộ lọc tên tàu + TP.HCM + cửa sổ 30–31/10: danh sách đầy đủ của truy vấn chỉ có **một** PDF kế hoạch chiều vào đã nêu. Bảng HCM còn có kế hoạch rời K12 31/10 22:00. Chưa tìm được PDF kế hoạch đối ứng chiều rời trong cửa sổ này; không suy không có hoạt động rời hoặc không có tài liệu ở cửa sổ khác.
- KIEV, TP.HCM + 24–26/10: ba hồ sơ kế hoạch và ba giấy phép rời cảng. PDF kế hoạch vào CMIT ngày 25/10 ghi **09:30**, còn bảng HCM lưu cho cùng tên tàu/cầu ghi **13:30**, DWT đều 57. Chưa xác lập đầy đủ quan hệ phiên bản giữa hai hồ sơ; giữ cả bằng chứng, không đếm hai giờ thành hai lượt hoặc tự chọn một giờ làm actual.
- Giấy phép rời cảng KIEV `26151959/HCM` ghi giờ rời được phép 25/10 05:00, trùng giờ kế hoạch rời CMIT trên bảng HCM. Nhưng đây là **port clearance (`MESSAGE_TYPE=60`)**, ghi **Gross tonnage 140**, không có DWT. DWT 57 trên kế hoạch là trường khác; không đổi GT 140 thành DWT, không mượn trọng tải từ hồ sơ kế hoạch để điền vào giấy phép và không gọi giấy phép là actual.

Đã xem trang render của PDF K12, K16, KIEV kế hoạch/giấy phép để kiểm vị trí cột, đơn vị và thời gian; không suy dữ liệu bảng chỉ từ thứ tự text trích xuất.

## Next step thực thi

1. Lập đối chiếu có giới hạn cho từng phạm vi đang theo dõi và cả hai chiều, trên các cửa sổ đại diện 2025/2026. Mở rộng cửa sổ theo **ngày hồ sơ** để bao phủ **ngày kế hoạch**, xác minh pagination và lưu raw/hash; ba mẫu hiện tại chưa là kiểm định độ phủ.
2. Giải quyết khác giờ/phiên bản và chống trùng theo tàu, phạm vi, chiều, thời gian kế hoạch và chứng cứ nguồn. Không mở alias K12 toàn cục; PDF có tên bến đầy đủ là chứng cứ từng hồ sơ.
3. Giữ kế hoạch và giấy phép rời cảng thành hai loại hồ sơ riêng. Nếu không chứng minh được tương đương bảng lịch, thiết kế hợp đồng nguồn bổ sung có coverage/semantics riêng trước khi ghép; không dùng nguồn mới để xóa lịch sử hoặc bù trọng tải thiếu.
4. Chỉ khi các gate dữ liệu đạt mới nối collect/export/deploy/readback, rồi nghiệm thu schedule thật. Hiện giữ bản HCM tốt đến 28/10, `replacement_verified=false`, `scheduled_refresh_verified=false`, production chưa nghiệm thu. Bình Dương tiếp tục lịch và recorder hiện hữu, chờ hai chu kỳ thật khác ngày.

Chạy lại mẫu có giới hạn: cài `scripts/requirements-gemalink-national.txt`, rồi `python scripts/review-hcm-national-source.py`, hoặc dispatch workflow `hcm-national-review.yml`. Công cụ này chỉ review ba mẫu cố định; không dùng nó như collector đầy đủ.
