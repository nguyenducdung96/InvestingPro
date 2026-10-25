> Cập nhật NAP 25/10/2026: miền Trung hiện 4/5 phạm vi có chuỗi: CDN, QNP, CMP và NAP. NAP gồm Cửa Lò/Bến Thủy, 366 workbook, 22 tháng 01/2025–10/2026; API/UI staging desktop/mobile đã đối chiếu ledger. Refresh thủ công GitHub 40160558048 thành công, dữ liệu `03135f3` đã triển khai. Lịch 08:05 Việt Nam đã đăng ký, chưa chứng nhận lần cron thực. Còn GMD–Dung Quất chưa tích hợp lịch sử. Xem [NAP](nap-integration.md) và [CMP](cmp-integration.md). Các phần bên dưới là snapshot lịch sử của đợt kiểm tra trước.

# Tiến độ ngành cảng — 25/10/2026

## Bàn giao mới nhất sau NAP

Đã lưu code và biên nhận NAP trên nhánh `codex/cloudflare-next-compat`; commit bàn giao `4bdb42a`, bản dữ liệu đã kiểm chứng trên staging `03135f3`. Phía Bắc giữ phạm vi chín mã đã tích hợp; lượt NAP này không kiểm chứng lại toàn bộ phía Bắc. Miền Trung có CDN, QNP, CMP, NAP; còn GMD–Dung Quất. NAP dùng báo cáo hoạt động Cảng vụ, CMP dùng điều động cầu; giữ ngữ nghĩa nguồn riêng, không coi tất cả là actual đã xác minh độc lập.

NAP: Cửa Lò và Bến Thủy, 366/369 workbook, 22 tháng; ngày nguồn cuối 24/10/2026. Chiều rời lũy kế 2026: 399 lượt / 2.336.540,52 DWT; tháng 10: 37 lượt / 242.422,2 DWT. Giữ null raw, hợp nhất dòng lặp và giữ bằng chứng sự kiện đã báo cáo khi snapshot sau để trống. Không chứng nhận đủ mọi ngày/cầu.

Kiểm chứng NAP: 151 Vitest, 9 hợp đồng Python, 64 Playwright hosted; typecheck/lint/Next build đạt. Staging API/UI desktop/mobile, 22 tháng hai chiều và tổng hai cảng khớp ledger. Refresh thủ công GitHub `40160558048` thành công; lịch 08:05 Việt Nam đã đăng ký nhưng chưa xác nhận cron thực. Chưa nghiệm thu production hoặc toàn quốc.

### Next steps theo thứ tự

1. Làm GMD–Dung Quất: xác minh chính xác phạm vi khai thác và tên bến trên nguồn chính thức; rà lịch sử tàu, DWT và ngày đến/rời. Lập ma trận nguồn/phạm vi trước khi ghép; không cộng với phạm vi GMD Hải Phòng hoặc suy quyền sở hữu từ tên giống nhau. Nếu nguồn công khai chưa đủ, ghi rõ phần thiếu.
2. Khi có nguồn đủ dùng, triển khai lịch sử, parser có hợp đồng, archive/hash, chống trùng, dashboard/API và nối bảng miền Trung theo mẫu đã có. Kiểm chứng số ghi nhận tháng/quý/YTD/YoY, desktop/mobile và refresh thực trước khi chốt GMD–Dung Quất.
3. Chốt vận hành cụm miền Trung: kiểm tra lần cron thực và ngày nguồn mới của từng mã, cảnh báo lỗi nguồn, giữ dữ liệu tốt cuối cùng. Đối chiếu tổng quan với từng dashboard; không cộng các phạm vi chồng lấn. Chạy thủ công thành công không thay thế bằng chứng cron.
4. Sau khi cụm miền Trung vận hành, bổ sung chuỗi sản lượng tấn/TEU doanh nghiệp công bố để so sánh với hoạt động tàu; DWT vẫn là trọng tải thiết kế, không thay cho lượng hàng. Sau đó chọn phạm vi phía Nam bằng ma trận cảng/bến và nguồn công khai.

## Snapshot lịch sử trước CMP/NAP

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
