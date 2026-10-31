# GMD: tổng mặc định và sửa DWT đã ghi nhận — 31/10/2026

Đã triển khai code `15211a6` trên `codex/cloudflare-next-compat`, áp dụng migration `202610310001_php_observed_dwt.sql` vào Supabase đang phục vụ ứng dụng, và đọc lại API/giao diện staging. [Quality 41214590904](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41214590904) đạt validate, E2E desktop/mobile và required check. Cloudflare build `449bf9bc-c200-4f17-a05a-6299bf76a48d` success. [Biên nhận](catalog-review/gmd-default-and-dwt-fix-20261031.json).

## Hành vi giao diện

Trang GMD mặc định tổng **Nam Đình Vũ + Gemalink + Bình Dương**, chiều tàu rời; tab đang chọn, bộ lọc và chart cùng phạm vi. Chuyển tab giữ năm, chiều, chỉ tiêu, kỳ và ngày đang chọn. Có thẻ tổng đã ghi nhận trong năm, tách khỏi lũy kế cùng kỳ theo tháng chung. Không đổi hợp đồng API mặc định GMD cũ; ứng dụng yêu cầu aggregate một cách tường minh.

Tổng này chỉ gồm ba cảng đã có chuỗi, chưa phải toàn bộ GMD. Tổng GMD miền Nam vẫn chỉ Gemalink + Bình Dương; không cộng Nam Đình Vũ vào miền Nam. Dung Quất chưa có chuỗi định kỳ, Nam Hải/Nam Hải Đình Vũ không đưa vào tổng tài sản hiện hành; ICD/kho bãi để phạm vi riêng. DWT vẫn là trọng tải thiết kế tàu theo lịch công bố, không phải hàng hóa thông qua hoặc actual.

## Lỗi đã xác định và sửa

Trigger `port.set_cdn_known_dwt()` trước đây chỉ tính trọng tải đã biết cho Tiên Sa, xóa các cột này ở asset khác. Với ngày có một tàu thiếu DWT, tổng strict DWT là null; khi không có tổng known DWT thay thế, phần DWT đã biết của những tàu khác cùng ngày cũng bị bỏ khỏi số hiển thị.

Nam Đình Vũ 2025 có bốn ngày như vậy: 19/01 (134.713 DWT đã biết), 10/05 (53.201), 12/05 (82.345), 18/05 (27.645). Tổng bị bỏ sót **297.904 DWT** thuộc các tàu có trọng tải đã ghi nhận, không phải trọng tải suy đoán cho bốn tàu thiếu. Raw bốn tàu PHU XUAN 01/04 (SB) để trống DWT, chỉ có GT 33/67; tiếp tục giữ null, không thay GT thành DWT. SHA-256 bốn archive gốc đã kiểm lại.

Migration tính lại cột known DWT từ events của version hiện hành cho các asset trong `php_plan_days`, giữ nguyên raw, strict totals, version, hash và metadata. Hàm/trigger giữ tên cũ để tương thích; không mở thêm quyền truy cập. Có regression test cho ngày thiếu trọng tải, preservation khi nguồn lỗi, nhập mới asset khác và quyền gọi hàm.

## Đối soát năm 2025 — chiều rời

- **Nam Đình Vũ:** 1.168 dòng; từ 23.414.212 lên **23.712.116 DWT**, khớp tổng events lưu trữ và ảnh tham chiếu; vẫn bốn dòng thiếu DWT.
- **Gemalink:** 279 dòng / **32.250.988 DWT**, không đổi và khớp ảnh; lịch rời mới có từ 08/2025, không coi các tháng trước là zero.
- **Bình Dương:** 2.972 dòng / **12.116.892,67 DWT**, một dòng thiếu. Reparse 365 ngày/730 phản hồi gốc khớp journal đã xuất; không sửa theo tổng website khác.
- **GMD ba cảng:** 4.419 dòng / **68.079.996,67 DWT** sau sửa; năm dòng thiếu DWT. Trước sửa là 67.782.092,67 DWT.

Ảnh bên khác ghi Bình Dương 2.953 dòng / 12.042.067 DWT: chênh **19 dòng / 74.825,67 DWT** chưa có đối chiếu từng dòng. Dòng KIM GIA PHÁT 05 ngày 15/11/2025 có raw DWT=0, được giữ null; riêng ngày này không giải thích toàn bộ chênh lệch. Không đủ bằng chứng kết luận bên nào lọc đúng/sai hoặc đổi dữ liệu của ta. Bộ ảnh là tham chiếu, không phải nguồn nhập.

## Kiểm chứng và giới hạn

189 Vitest tests/46 files đạt ở lượt kiểm toàn bộ trước khi thêm thẻ tổng năm; typecheck và hai E2E GMD desktop/mobile đạt sau thay đổi cuối. Bốn E2E SouthPlans/regional totals đạt. CI trên commit cuối đạt validate và E2E hai viewport; Cloudflare Linux build đạt. Không dùng kết quả build Windows thay nghiệm thu Workers.

Đọc lại API staging lúc `2026-10-31T15:24:40.922Z` xác nhận bốn tổng trên; trang mặc định năm 2025 có aggregate và thẻ 68.079.996,67 DWT. Kiểm UI live chuyển Gemalink → tổng ba cảng giữ 2025/tàu rời/DWT; dropdown, tổng và chart cùng scope. Screenshot tại `.local/ops/gmd-comparison/gmd-live-desktop.png`; SQL sau migration tại `ndv-corrected-supabase.png`. Bằng chứng raw/ảnh đầy đủ ở máy; JSON biên nhận và hash được lưu trong repo, không coi đường dẫn máy là kho lưu cloud bền.

## Next steps còn mở

1. Nếu cần khớp chính xác Bình Dương với bên tham chiếu, cần tập bản ghi và quy tắc lọc có thể đối chiếu, không suy từ tổng ảnh.
2. Bình Dương tiếp tục chờ hai schedule thật thành công khác ngày theo recorder hiện hành; lần đọc thủ công này không cộng vào nghiệm thu lịch. `scheduled_refresh_verified=false` theo trạng thái đã lưu, chưa tái nghiệm thu trong phase này.
3. HCM: intake nguồn kế hoạch quốc gia độc lập, raw/revision và mapping/hàng chờ đối chiếu theo kết luận 40 mẫu; chưa thay bảng cũ đến 28/10. Không trộn giấy phép với kế hoạch.
4. Chưa nghiệm thu production hoặc tuyên bố hoàn thành tự động toàn ngành. PDN cron, Long Bình Tân, Dung Quất định kỳ và ICD/kho bãi vẫn để sau.
