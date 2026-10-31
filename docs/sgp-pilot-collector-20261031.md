# SGP K12 / TT2 — collector kế hoạch Hoa tiêu, 31/10/2026

## Kiểm chứng cloud và CI

Code `e074654`: **Quality 41117367465 success**, Cloudflare build `4ba1d7c9-54c8-48b9-89c4-2cb5f7a772f5` success. Hai run thủ công cloud `41117509985` (runner lạnh) và `41118011611` (khôi phục cache) success; đã có **run schedule thật 41159531589 success**. Đã tải và kiểm tra hash/parse của artifact: 1 → 2 → 3 raw revisions giữ nguyên; latest vẫn 3 dòng, không cộng thành 9. Run schedule ghi nhận nguồn sửa giờ vào của NEWSUN GREEN 03 từ ô trống thành 05:00, giữ cả bản trước. Một chu kỳ schedule thật không thay nghiệm thu vận hành dài hạn/production; `scheduled_refresh_verified=false`.

## Phạm vi đã triển khai

Collector độc lập lưu nguồn [Hoa tiêu miền Nam — khu vực TP.HCM](https://www.pilotcosouth.vn/ke-hoach-dieu-dong-tau/hoa-tieu-hang-hai-mien-nam-khu-vuc-tphcm-2), cả hai tab ngày và ba bảng vào/rời/điều chuyển. Chỉ chọn chính xác K12/TT2; K12A, B.TT2, TTD, K17 và NEO K12 không được nhận nhầm. **Không có exporter hoặc bước ghi dữ liệu vào dashboard/tổng issuer/vùng.**

Code collector tại `e074654`; Python 11 kiểm tra collector + 3 kiểm tra overlap đạt. Đã thu thập local hai ngày 30–31/10/2026: ba dòng kế hoạch lựa chọn, DWT đều null; GRT và giờ/ghi chú nguồn giữ riêng. [Biên nhận phase](catalog-review/sgp-pilot-collector-20261031.json).

## Quy trình local

```powershell
python scripts/test-sgp-pilot-plans.py
python scripts/test-sgp-pilot-overlap.py
python scripts/collect-sgp-pilot-plans.py
python scripts/review-sgp-pilot-overlap.py
```

Collector ghi `.local/sgp-pilot/archive/<sha>.html.gz` và `revisions/sgp-pilot-review-1.0.0/<sha>.json` bất biến. `index.json` giữ mọi ngày/revision và tham chiếu bản thu thập tốt gần nhất. Mỗi revision là một snapshot đầy đủ, **không cộng số dòng qua các revision**. Replay cùng bytes không nhân file hoặc event. Nếu raw hoặc parsed revision lịch sử sai hash/nội dung, parser đổi header, mất bảng/ngày hoặc nguồn quá cũ/bất thường, dừng và giữ index cũ. Raw nguồn lỗi vẫn giữ để rà soát.

Dòng từng có nhưng biến mất hoặc một tàu có nhiều dòng cùng khóa ngày/chiều/vị trí sẽ vào `review_required`; không xóa bản tốt trước đó hoặc tự collapse các chuyến. Tàu bị bỏ, lùi ngày, đổi giờ, bổ sung, chậm được lưu cùng status flags. Điều chuyển luôn riêng; không suy lượt vào/rời cảng. Khóa ứng viên không phải ID movement do nguồn cấp và không chứng nhận cùng một lượt ghé.

GRT giữ `grt`/`grt_raw`; **DWT luôn null tại nguồn Hoa tiêu**. Ô giờ trống không thành 00:00; giờ cano, giờ kế hoạch và ETA trong ghi chú không được đổi lẫn nhau. Bản ngày hiện tại/tương lai vẫn là kế hoạch công bố, không phải actual. Ngày không có quan sát mục tiêu không được suy thành hoạt động bằng 0.

## Đối chiếu mới với Cảng vụ

Đã lấy riêng hai bảng Cảng vụ 30/10 và 31/10 bằng form ngày chính thức, kiểm tra ngày tiêu đề/bộ lọc và hash. Đây là hai probe local phục vụ đối chiếu, không thay cache/edition HCM đang công bố hoặc nghiệm thu HCM cloud.

- `HAI PHAT 135` ngày 31/10: Hoa tiêu ghi **TT2**, GRT 6.282, ô giờ trống, ghi chú ETA 12:00; Cảng vụ ghi **TAN.T.2**, giờ 12:00, DWT 13.399. Đây là đầu mối alias mới; số GRT và DWT khác nhau đúng bản chất, không backfill DWT vào raw Hoa tiêu.
- `NEWSUN GREEN 03` vào K12 cùng ngày: Hoa tiêu ghi ETA 00:00, ô giờ trống; Cảng vụ ghi 01:00, DWT 4.893. Lịch Hoa tiêu chiều rời 22:00 chưa có ứng viên trong bảng Cảng vụ đã lấy. Không tự gộp theo riêng tên tàu/ngày hoặc xem thiếu ứng viên là không có hoạt động.
- Review tool cho hai quan hệ `possible_overlap_time_unverified` và một `no_candidate_in_available_board`; không merge tự động. Ngày không có archive Cảng vụ là `authority_day_unavailable`, không phải bằng chứng không trùng. Cloud collector không gọi lại nguồn HCM.

Chạy lại audit có hash/parse đủ 666 ngày đến 28/10 với nhãn mới **TAN.T.2** tìm được **168 vào + 180 rời = 348 dòng lịch sử ứng viên**, thêm **46 điều chuyển** riêng. Đây chưa phải lịch sử TT2 đã được phê duyệt và chưa được cộng vào SGP. Các kết luận cũ về nhãn chính xác `TT2` không có trong bộ lịch sử vẫn đúng; không đồng nghĩa không có lịch sử dưới tên khác.

Lệnh đối chiếu các probe local:

```powershell
python scripts/review-sgp-pilot-overlap.py --authority-dir .local/sgp-pilot/authority-probes --authority-raw-dir .local/sgp-pilot/authority-probes/archive
python scripts/audit-sgp-k12-tt2.py
```

## Vận hành cloud và lưu trữ

Workflow `.github/workflows/sgp-pilot-review.yml` dùng **contents:read**, không commit/push hoặc deploy app. Cache riêng lưu history và raw giữa các run; artifact `sgp-pilot-review` giữ 90 ngày, gồm raw, parsed revisions, index, receipt và overlap report. Khi runner lạnh, receipt ghi rõ `cold_runner=true` và cửa sổ history thực có; không giả định đã khôi phục toàn bộ lịch sử. Cache có thể bị evict; artifact/cache này chưa phải kho lưu trữ vĩnh viễn. Trước khi nghiệm thu nguồn production cần kho bằng chứng dài hạn và quy trình khôi phục đã kiểm chứng.

Lịch đã active trên `main` tại `f4b008a`: **06:15, 12:15, 18:15, 23:15 Việt Nam**, sau khi manual cloud thành công. Đã kiểm tra workflow trên default branch khớp cấu hình; run schedule thật đã lưu trong receipt phase. Thời gian lấy nguồn thực tế của run `41159531589` là 09:20:19 Việt Nam, không giả định cron luôn chạy đúng phút. Hai run thủ công không chứng nhận schedule; lưu raw thành công không chứng nhận quy thuộc issuer hoặc tích hợp dashboard.

## Bước tiếp theo và điểm dừng

Phase này hoàn thiện collector/archive/review. Đối chiếu thêm mẫu độc lập để chốt alias `TAN.T.2` với cầu TT2 và điều kiện trùng từng dòng; sau đó mới chuẩn bị tích hợp chuỗi Cảng vụ TT2 với raw/DWT/provenance đầy đủ. K12 giữa cầu cảng và khu neo tiếp tục cần bằng chứng riêng từng dòng. Không mở lại HCM cloud acceptance, PDN cron, Long Bình Tân, kho/bãi hoặc các issuer đã rút.
