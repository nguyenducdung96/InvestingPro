# Bình Dương / GMD — refresh độc lập 30/10/2026

Quality **41084003113** của bản tính năng **ea7b7a3** đã **success**, gồm lint/typecheck/Vitest/Python, E2E và cả Next/OpenNext build. CI/readback này không thay nghiệm thu refresh cloud theo lịch hoặc production.

## Kết quả và phạm vi

Đã lấy 14 phản hồi nguồn chính thức cho 23–29/10/2026, chỉ resource vào/rời; xuất edition đến 29/10, 667 ngày / 1.334 phản hồi lịch sử, 8.342 dòng. Quan sát cuối vẫn là vào 24/08/2026 và rời 15/07/2026. Thiếu tháng 9–10 giữ unavailable; đây là kế hoạch công bố, không phải actual, tấn hàng hoặc TEU. Giữ GMD miền Nam = Gemalink + Bình Dương và mỗi mã một dòng vùng.

## Quy trình

```powershell
python scripts/test-binhduong-plans.py
python scripts/refresh-binhduong-plans.py
pnpm exec vitest run tests/binhduong-history.test.ts tests/south-plans.test.ts --maxWorkers=1
pnpm typecheck
# Sau commit/push và deploy:
node scripts/verify-binhduong-live.mjs --wait
```

- `.local/binhduong/raw`: phản hồi gần đây, độc lập `.local/pdn`. Trước/sau thay raw lưu nguyên bytes vào `archive/<source-sha256>/<envelope-sha256>.json.gz`; không ghi đè revision cũ. Cache/raw không theo Git; giữ archive và receipt khi bàn giao máy.
- Export `--recent-only` dùng journal/daily/ledger đã commit cho lịch sử, đối chiếu hash và tổng từng ngày; chỉ cần raw cho bảy ngày cuối và mọi ngày mới chưa có trong edition. Full rebuild dùng `--raw-dir` tường minh nếu raw lịch sử nằm nơi khác.
- Dừng trước khi xuất nếu mất bất kỳ movement đã công bố, raw thiếu/hỏng, filter sai, ID qua nhiều ngày hoặc cutoff lùi. Nguồn lỗi không chạy export; nguồn trả rỗng không được xóa lịch sử. Replay cùng raw cho bytes giống nhau. Không gọi collector/export PDN hoặc thay edition PDN.
- Verifier yêu cầu đúng checked_at/cutoff/parser/days, 22 tháng hai chiều, provenance journal, null ở kỳ không có quan sát; đối chiếu tổng GMD miền Nam và hàng GMD vùng với các thành phần.
- Workflow `.github/workflows/binhduong-plans.yml`: manual, độc lập; push thường và không rebase/force nên commit cạnh tranh bị Git từ chối. Artifact luôn giữ raw/receipt kể cả khi lỗi. Muốn retry sau cạnh tranh phải lấy head mới, thu thập/validate lại, không cherry-pick edition cũ qua dữ liệu mới.

## Kiểm chứng và giới hạn

Ba run Quality bàn giao (`41079292805`, `41080083652`, `41080575259`) đã success. Python 7 kiểm tra và Vitest 7 kiểm tra liên quan đạt; lint/typecheck đạt. Cold runner với lịch sử committed + bảy ngày synthetic rỗng vẫn giữ 8.342 dòng; replay byte-identical; thiếu raw/journal hỏng bị từ chối trước khi ghi. Kiểm tra raw revision giữ bytes cũ và từ chối checksum sai.

Receipt phase: [binhduong-stabilization-20261030.json](catalog-review/binhduong-stabilization-20261030.json). Bản tính năng `ea7b7a3` đã push; Cloudflare build `ebe50cc3-e942-4d6f-9699-09d79d656bf6` success. [Readback staging](catalog-review/binhduong-live-readback-20261030.json) đạt 22 tháng hai chiều, journal, tổng GMD miền Nam và hàng GMD vùng. 44 tệp lịch sử Bình Dương/PDN đối chiếu với head trước phase giữ nguyên. Trong 14 phản hồi mới có 193 dòng toàn nguồn, không có BC198; không suy nguồn rỗng thành không hoạt động. Chưa đăng ký workflow trên default branch, chưa chạy refresh cloud hoặc lịch tự động; chưa nghiệm thu production. Các khoảng thiếu nguồn không được khắc phục chỉ bằng ổn định pipeline.

## Bước tiếp theo

Đăng ký/chạy workflow thủ công trên cloud trước khi cân nhắc lịch riêng Bình Dương. Nghiên cứu khoảng thiếu hoặc tài sản cảng sông/biển GMD/SGP tiếp theo chỉ khi có bằng chứng mới. HCM connectivity, cron PDN, Long Bình Tân, ICD/depot/kho bãi và Dung Quất định kỳ tiếp tục để sau.
