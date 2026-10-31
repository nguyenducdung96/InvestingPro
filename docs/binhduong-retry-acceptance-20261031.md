# Bình Dương: kiểm chứng retry và refresh cloud — 31/10/2026

## Kết quả

Đã tiếp tục từ bản sửa có sẵn `cfa010c`, không viết lại phần retry. [Quality 41198578621](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41198578621) của bản này success, gồm validate, E2E desktop/mobile và required check; native Cloudflare build `20cbff24-4d63-41ab-84f1-e8d814192e00` success. Kiểm lại tại máy: **8 Node verifier tests + 8 Python Bình Dương tests đạt**.

[Workflow cloud 41198997846](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41198997846) dispatch từ workflow đã đăng ký trên `main`, checkout/publish nhánh `codex/cloudflare-next-compat`, đã **success**. Không thay workflow trên main, thêm secret/hook hoặc merge ứng dụng staging vào main.

- Lấy đủ 14 phản hồi ngày 24–30/10; source collection và export success.
- Publish `873fba7f18529d9cf88f41eda7e5bee03d4cfca5`; native Cloudflare build success.
- Edition `checked_at=2026-10-31T11:58:04.721707+00:00`, `through=2026-10-30`.
- Readback hoàn tất `2026-10-31T12:00:19.239Z` (19:00:19 Việt Nam): `source_refresh_success=true`, `deployment_readback_verified=true`. Khớp 22 tháng hai chiều, journal mẫu/raw hash, tổng Gemalink + Bình Dương, một hàng GMD miền Nam và trang chi tiết.
- Không thêm quan sát mới: last observation vẫn vào 24/08, rời 15/07; cập nhật edition không chứng minh hoạt động mới.

[Biên nhận bền](catalog-review/binhduong-retry-cloud-20261031.json) chứa kết quả CI, collection, publish/build và readback. Không dùng artifact có hạn 14 ngày làm bản lưu duy nhất.

## Phạm vi retry đã kiểm chứng

Tối đa bốn attempt, backoff 5/10/20 giây, timeout 30 giây mỗi request. Chỉ retry HTTP 502/503/504 và các lỗi timeout/kết nối tạm thời đã định danh. Không retry 404/429/500, lỗi redirect hoặc chứng chỉ; không bỏ kiểm tra edition, ma trận tháng, DWT, provenance hoặc phạm vi tổng. Lỗi kéo dài vẫn làm run thất bại. Mỗi lần retry có biên nhận `transient_retries`.

Tests mô phỏng đã kiểm tra 503→200, 503 kéo dài hết attempt, timeout/reset/backoff, và từ chối retry lỗi ngoài phạm vi. Run cloud mới không gặp lỗi tạm thời (`transient_retries=[]`), nên chứng minh luồng đầy đủ hoạt động với bản sửa; không tuyên bố vừa quan sát thực tế một lần 503 hồi phục trên cloud.

## Chưa nghiệm thu và bước tiếp theo

`scheduled_refresh_verified=false`, production chưa nghiệm thu. Run này là `workflow_dispatch`; không sửa thành `schedule` hoặc thay kết quả schedule 41181536014 đã lỗi 503. Cần hai chu kỳ schedule thật thành công, khác ngày, đều nguồn/export/publish và readback đúng edition. Các chu kỳ 01–02/11 là cơ hội kế tiếp nếu scheduler và nguồn hoạt động; thời điểm bắt đầu thực tế có thể trễ.

HCM còn bị chặn theo [hồ sơ nguồn](hcm-cloud-acceptance-20261031.md). Chưa có đường truy cập chính thức mới từ cloud; không chạy lặp lại các phép thử mạng cũ khi không có đầu mối mới. Cổng tiếp tục là nguồn hỗ trợ đường truy cập lịch hoặc feed/file tương đương, rồi xác minh lịch sử/raw/hash/manifest K12 và toàn luồng deploy/readback. Không thay movement bằng NEO, không mở alias K12 toàn cục. PDN cron, Long Bình Tân, Dung Quất định kỳ và ICD/kho bãi giữ để sau.
