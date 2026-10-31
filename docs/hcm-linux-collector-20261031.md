# Collector HCM trên Linux — 31/10/2026

## Phạm vi

Giữ bảng lịch HTML gốc của Cảng vụ HCM và parser/ngữ nghĩa hiện tại. Thu thập trên máy Linux đã kiểm chứng truy cập được nguồn; GitHub-hosted runner chỉ nhận dữ liệu, kiểm lại raw/schema/ngày, export và publish staging. Cloudflare vẫn phục vụ web. Không triển khai intake quốc gia bổ trợ hoặc sửa mapping/metric.

## Cấu hình vận hành

- Code root-owned tại `/opt/investingpro-hcm/scripts`, chỉ gồm collector và công cụ đóng gói/xuất dữ liệu; không tự pull hay chạy code PR.
- Tài khoản `invest-hcm` không có shell đăng nhập; dữ liệu tại `/var/lib/investingpro-hcm`. Unit [hcm-collector.service](../scripts/deploy/hcm-collector.service) có CPU quota 50%, memory tối đa 512 MB, chỉ ghi vùng dữ liệu riêng, không đổi cấu hình n8n.
- Timer [hcm-collector.timer](../scripts/deploy/hcm-collector.timer) lúc **08:15 Việt Nam** hằng ngày, persistent. GitHub giữ lịch **08:35 Việt Nam** để nhận bản mới, thời gian chạy thực tế có thể trễ. Cần kiểm trạng thái bật timer trong receipt nghiệm thu; tệp cấu hình không chứng minh lịch đã chạy.
- Lịch sử raw/parsed được seed từ bản đã kiểm; lần đầu đã thu/kiểm đủ **668 ngày**, 01/01/2025–30/10/2026, không lỗi nguồn. Các ngày gần nhất được tải lại; không gọi toàn bộ lịch sử seed là thu mới trên VPS.
- Export `latest.tar.gz` thay thế atomically chỉ sau khi collector success và toàn lịch sử qua kiểm chứng; archive raw theo SHA giữ lại trên đĩa. Seed ở máy phát triển là bản dự phòng ban đầu; chưa coi cache/artifact 14 ngày là kho raw lâu dài ngoài VPS.
- Tài khoản `invest-hcm-export` chỉ có khóa SSH `restrict` với forced command `serve-hcm-bundle.py`. Bất kỳ lệnh client nào cũng chỉ được nhận tệp dữ liệu cố định; không shell, forwarding hoặc SFTP. Server đối chiếu lần collect gần nhất với gói trước khi phục vụ: nếu lần mới thất bại, không trả lại gói success cũ như success mới.
- GitHub secrets chỉ gồm `HCM_COLLECTOR_HOST`, `HCM_COLLECTOR_KNOWN_HOSTS`, `HCM_COLLECTOR_SSH_KEY` của tài khoản đọc gói. Không lưu root password hoặc đưa quyền database/deploy lên VPS. SSH host key được pin; không dùng `StrictHostKeyChecking=no`.

## Gate dữ liệu

Importer từ chối path traversal, links, duplicate entry, entry/size vượt giới hạn, gói cũ quá 30 giờ, run thất bại, thiếu ngày lịch sử, source error, parser version sai, hash sai hoặc nội dung parse không khớp raw. Cửa sổ phải từ 01/01/2025 đến hôm qua theo giờ Việt Nam; không dùng bundle ngày hôm trước để cập nhật ngày mới.

Chỉ sau khi kiểm toàn gói mới thay input làm việc; giữ receipt đã có và guard chống co lịch sử khi export. Các bộ kiểm tháng, tổng SGP/vùng và edition live tiếp tục chạy. Chỉ run `event=schedule` thật, khác ngày, source success và live readback đúng edition mới được tính nghiệm thu lịch. Run thủ công này không được tính.

## Chuyển máy sau này

1. Kiểm GET/POST lịch sử và ngày mới từ IP máy mới trước khi chuyển; không suy máy cùng nhà cung cấp sẽ truy cập được.
2. Cài Python 3, user/unit/code có phiên bản; chuyển raw/parsed và biên nhận, kiểm hash. Không copy thông tin đăng nhập root vào repo.
3. Tạo khóa export hạn chế trên máy mới, pin host key mới và cập nhật ba secret. Chạy thủ công end-to-end; tắt timer cũ trước khi bật timer mới, tránh nhận nhầm bản/collector kép.
4. Giữ bản máy cũ để rollback đến khi readback đạt. Không cần chuyển Cloudflare hoặc Supabase.

## Kiểm thử

Sáu Python tests cho roundtrip, DWT thiếu giữ null, raw/parsed bị sửa, stale collection, unsafe tar và lần mới lỗi không phục vụ success cũ; 11 tests collector hiện hữu và tám Node tests verifier đạt tại máy. Quality/Workers/live acceptance và trạng thái timer được lưu riêng trong receipt sau triển khai.

## Nghiệm thu triển khai

Code `f72852a` Quality/Workers success; run thủ công [41221110728](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41221110728) success toàn luồng, publish `bd62179` và Cloudflare success. Live đến 30/10, đủ 11 phạm vi × 22 tháng × hai chiều và tổng SGP/vùng. Timer đã enabled/active; lần tiếp theo 01/11 08:15 Việt Nam. Raw ngoài VPS lên kho cloud lâu dài, hai lịch thật và production chưa nghiệm thu. [Receipt](catalog-review/hcm-linux-collector-20261031.json).
