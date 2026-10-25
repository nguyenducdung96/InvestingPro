> Cập nhật CMP 25/10/2026: đã bổ sung chuỗi điều động cầu 1 và 2 với 681 bản nguồn, 22 tháng 01/2025–10/2026; dashboard/API và tổng quan miền Trung dùng cùng số ghi nhận. Nghiệm thu staging ghi riêng trong [CMP](cmp-integration.md). NAP và GMD–Dung Quất vẫn pending. Các snapshot/code bên dưới mô tả đợt kiểm tra trước.

# Tiến độ ngành cảng — 25/10/2026

## Đã triển khai trên staging

- Chín mã phía Bắc: PHP, DVP, VGR, VSC, GMD (Nam Đình Vũ/Hải Phòng), HAH, DXP, PSP, CQN. Có trang mã, phạm vi cảng/bến, tổng quan và chọn bến, tháng/quý/YoY/lũy kế, lịch từng ngày. CQN giữ riêng kế hoạch cập/rời cầu.
- CDN: phạm vi Tiên Sa; lịch sử, biểu đồ, tháng/quý/YoY và lũy kế. Không cộng Sơn Trà vào CDN.
- Tổng quan phía Bắc: chín mã, tách Hải Phòng/CQN, không cộng trùng VIP Greenport.
- Tổng quan miền Trung: đủ năm dòng CDN, QNP, CMP, NAP, GMD–Dung Quất; CDN và QNP đã có chuỗi; CMP, NAP và GMD–Dung Quất chưa tích hợp lịch sử.
- Quy tắc hiển thị thống nhất: có dữ liệu ghi nhận thì vẫn cộng tháng/quý/lũy kế và tính YoY từ hai giá trị hiển thị; thiếu nhỏ không làm trống cả kỳ. Chi tiết chất lượng nằm trong mục mở rộng. Quy tắc đã lưu trong AGENTS.md và bộ nhớ theo yêu cầu người dùng.

Code mới nhất: `4c13c30`. Đã xác nhận Workers staging và GitHub check thành công. Bộ kiểm thử dữ liệu 130/130; các kiểm thử desktop/mobile liên quan đạt sau cập nhật kỳ vọng. Readback UI staging: phía Bắc 9/9 mã có DWT; PHP đến 24/10/2026 có lũy kế 35.753.736 DWT, YoY +70,63%.

## Còn phải làm

- Vận hành cập nhật: tại thời điểm kiểm tra, chín mã phía Bắc mới có 23/24 ngày tháng 10, chưa có lịch ngày chốt 24/10. Số đã ghi nhận đã hiển thị bình thường; cần kiểm tra workflow/nguồn và nhập bổ sung nếu nguồn có lịch. Chưa coi cấu hình cron là bằng chứng cập nhật ổn định.
- Ba phạm vi miền Trung chưa có chuỗi tích hợp: CMP, NAP, GMD–Dung Quất. Có đầu mối nghiên cứu, chưa xác minh đủ lịch sử để công bố số.
- Sản lượng tấn/TEU do doanh nghiệp công bố chưa được triển khai đồng đều cho mọi mã. Phần hiện có không phải chuỗi DWT theo lịch.
- Chưa hoàn thành toàn quốc hoặc nghiệm thu production. Các kết quả trên là staging.

## Thứ tự tiếp theo đề xuất

1. Chốt vận hành cụm đã có: kiểm tra các lần refresh gần nhất, bổ sung ngày nguồn có sẵn, xác nhận cập nhật tự động và tránh lỗi một nguồn dừng các nguồn khác. Không chặn hiển thị số đã ghi nhận trong thời gian này.
2. QNP đã có dashboard và 22 tháng lịch chính thức, xử lý trang tiếp, chống trùng và nối bảng miền Trung; xem docs/qnp-integration.md và biên nhận mới nhất. Giữ lịch dự kiến khác actual; TC1 không có alias nguồn thì giữ thiếu.
3. Tiếp tục CMP, NAP, GMD–Dung Quất; ưu tiên lại nếu rà nguồn cho thấy một phạm vi có lịch sử thuận lợi hơn. Mỗi mã phải có chuỗi dùng được và luồng cập nhật trước khi coi là tích hợp.
4. Khi cụm miền Trung vận hành, bổ sung sản lượng tấn/TEU và góc nhìn so sánh giữa mã để hỗ trợ nghiên cứu đầu tư; sau đó chọn cụm phía Nam.

Các con số độ phủ trong tài liệu ngày 24/10 là snapshot lịch sử; dùng tài liệu này và các sửa đổi ngày 25/10 làm trạng thái sản phẩm mới nhất.

## QNP bổ sung ngày 25/10

653/662 tài liệu, 6.465 dòng nguồn, trong đó bổ sung 329 dòng trang tiếp. Dữ liệu ghi nhận từ 01/2025 đến 10/2026; giao diện chỉ giữ YoY DWT. Chín ngoại lệ nguồn đã phân loại và giữ thiếu, không chứng nhận đủ mọi ngày/trọng tải. Số miền Bắc và commit phía trên là snapshot của lần kiểm tra trước, không phải readback lại trong lượt QNP này.

QNP: refresh GitHub 40144613728 (attempt 2) đã thành công và tự push dữ liệu 73a42c9; staging readback khớp. Manual pipeline accepted, cron actual execution chưa chứng nhận. Chi tiết: catalog-review/qnp-final-acceptance-20261025.json.
