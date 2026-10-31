# Sao lưu raw HCM ngoài VPS — 01/11/2026

## Thiết kế

GitHub đọc gói dữ liệu cố định từ VPS bằng khóa SSH hạn chế hiện có, kiểm tra đầy đủ raw/parsed và lưu vào bucket R2 `investing-pro-evidence-staging`, prefix `port-raw/hcm/`. Không đưa khóa R2 lên VPS, không đổi n8n, không sửa database/dashboard/metric.

Mỗi file raw HTML gzip và parsed JSON gzip được đặt tên theo SHA-256 của bytes lưu trữ. Manifest chứa đường dẫn file để phục hồi, hash file gốc và file nén, ngày nguồn, URL, parser version và receipt thu thập. Manifest cũng có tên theo hash nội dung. Các file không đổi được tái sử dụng giữa các ngày; phiên bản raw/parsed cũ vẫn được giữ qua manifest trước.

Mỗi object mới hoặc đã tồn tại đều được **GET toàn bộ** và so SHA-256, không dựa vào ETag/custom metadata. Object tồn tại mà khác nội dung sẽ làm run thất bại; script không ghi đè. Khi tạo mới dùng `If-None-Match: *` để chống ghi đè do chạy đồng thời. Đây là chính sách ghi của ứng dụng, không phải chứng nhận WORM/object lock.

Sau khi lưu manifest, script tạo thư mục trống khác, tải **toàn bộ** file từ R2, kiểm hash bytes lưu và bytes giải nén, tái parse raw từng ngày và đối chiếu với parsed đã lưu. Khôi phục chỉ đọc R2; không dùng VPS, cache hoặc file đầu vào làm fallback. Không thay file đang vận hành bằng bản phục hồi thử.

## Tự động và quyền truy cập

[Workflow](../.github/workflows/hcm-raw-backup.yml) có lịch **09:05 Việt Nam** mỗi ngày, sau lịch thu thập 08:15, và chạy thủ công được. Workflow đăng ký trên main; code collector/backup checkout nhánh staging đã kiểm. Environment `staging` chỉ cho workflow main chạy; không thay protection rules. Dùng lại secret `PHP_NEWSLETTERS_R2_TOKEN` có quyền bucket hiện có, không tạo/mở rộng quyền hoặc đưa token vào artifact/log. Chỉ bước R2 được nhận token; VPS chỉ được đọc qua khóa riêng hiện có.

Bucket đã kiểm qua management API: managed public domain **disabled**, không có custom domain. Lifecycle chỉ có abort multipart chưa hoàn tất sau bảy ngày, **không có rule xóa object backup**. Workflow không tạo TTL, không xóa object. Artifact GitHub 30 ngày chỉ lưu biên nhận; bản raw lâu dài là object/manifest ở R2.

Backup có thể lưu bản lịch sử tốt gần nhất ngay cả khi chưa phải ngày mới nhất. Nó không chứng nhận source refresh/schedule hoặc actual; timestamp/through trong manifest giữ đúng bản nguồn, không đổi thành ngày backup. Luồng xuất bản hiện tại vẫn kiểm freshness riêng như trước.

## Phục hồi khi chuyển/mất VPS

1. Chọn `manifest_key` trong biên nhận backup đã thành công, kiểm ngày nguồn cần phục hồi.
2. Chạy thủ công workflow từ **main**, nhập `restore_manifest` bằng đúng key đó. Đây là run chỉ phục hồi: bước SSH/VPS bị bỏ qua.
3. Hoặc dùng môi trường có token R2 hiện có và Python dependencies: `python scripts/archive-hcm-raw.py --restore-manifest <manifest-key> --restore-dir <thu-muc-trong>`. Không dán token vào lệnh/chat. Script từ chối thư mục không trống và đường dẫn không hợp lệ.
4. Khi phục hồi vào máy collector mới, tải vào vùng tạm, kiểm raw/parsed, seed đúng thư mục dữ liệu rồi chạy collector để bổ sung ngày mới. Không đưa bản lịch sử cũ qua gate cập nhật hiện tại bằng cách sửa timestamp.

## Kiểm chứng

Sáu unit tests cho roundtrip/reuse, nội dung R2 bị sửa, manifest/path traversal, không ghi đè object sai, kiểm read-after-write và thư mục phục hồi không trống. Sáu tests bundle hiện hữu tiếp tục đạt. Kết quả upload thật, số file/ngày, phục hồi độc lập, CI và lịch được chốt trong receipt sau khi run cloud hoàn tất.

## Kết quả thực tế

Backup `41222934855` và phục hồi độc lập `41223745082` đều success: 668 ngày đến 30/10, 1.338 file, 36.481.371 bytes. Manifest SHA-256 `d46b0d7fb5e1a510e37e60b1b2088c12c80513c814893150959ba5c0200c6edd`. Run phục hồi mới bỏ qua SSH/VPS và kiểm lại toàn bộ raw/parsed từ R2. Code `61d1f8f` Quality/Workers success. Lịch 09:05 đã đăng ký trên main; chưa có chu kỳ schedule backup được nghiệm thu. [Receipt](catalog-review/hcm-raw-backup-20261101.json).
