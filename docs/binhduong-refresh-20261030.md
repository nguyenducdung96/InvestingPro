# Bình Dương / GMD — refresh độc lập 30/10/2026

## Bình Dương đã chạy cloud và đăng ký lịch riêng — 30/10/2026

Bản code cuối **77d88f0**: Quality [41087454420](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41087454420) **success ở attempt 2**, gồm lint/typecheck/Vitest/Python 8 kiểm tra Bình Dương, E2E và Next/OpenNext build. Attempt 1 bị runner shutdown ở E2E, không sửa code theo lỗi hạ tầng. Cloudflare build `a05a1d7b-dd58-4e54-9617-07f1692ca3fe` **success**; readback staging sau deploy đúng edition cloud `b103701` cũng đạt. Đã hoàn tất yêu cầu chạy cloud và cấu hình lịch; nghiệm thu hai chu kỳ schedule thật/production vẫn tách riêng.

Workflow `binhduong-plans.yml` đã active trên default branch `main`, đăng ký lịch **08:55 Việt Nam mỗi ngày** tại `af6fb3f`; checkout/publish vẫn chỉ nhánh staging `codex/cloudflare-next-compat`. Thay đổi `main` chỉ gồm workflow Bình Dương, không merge ứng dụng staging hoặc đổi workflow PDN.

Run thủ công cloud [41085429972](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41085429972) đã **success**: cold runner lấy 14 phản hồi 23–29/10 → export → kiểm tra → push `2e1ec1f` → deploy → readback đúng edition `checked_at=2026-10-30T15:57:29.850729+00:00`, 22 tháng hai chiều và tổng GMD miền Nam khớp. Vẫn 8.342 dòng, không bù được khoảng thiếu. [Receipt cloud](catalog-review/binhduong-cloud-refresh-20261030.json).

Run thứ hai từ chính workflow trên `main` [41086953831](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41086953831) cũng **success**, publish `b103701`, readback hoàn tất 23:10:43 Việt Nam; edition `checked_at=2026-10-30T16:07:26.450609+00:00`. [Receipt cấu hình lịch và hai run cloud](catalog-review/binhduong-schedule-20261030.json). Dữ liệu vẫn 8.342 dòng; cả 20 JSON nhật ký lịch sử và PDN không đổi. Sửa cuối `77d88f0` giữ nguyên tệp nén khi JSON không đổi; Python 8 kiểm tra gồm cold runner với gzip header khác nền tảng đã qua.

Không cần Deploy Hook hoặc secret mới. GitHub không có check trên commit bot không đủ để kết luận Cloudflare không build: readback cloud đã hoàn tất trước khi build commit code tiếp theo bắt đầu. Đã bỏ yêu cầu hook từng thử trong quá trình chẩn đoán. Gzip journal chuẩn hóa header; nếu JSON không đổi thì giữ nguyên tệp nén đã duyệt, kể cả khác zlib/Python. Kiểm tra cold runner mô phỏng header khác nền tảng đã qua. Verifier lưu event/run/attempt/commit và nguồn refresh để audit.

Lịch đã đăng ký không thay bằng chứng chạy lịch. Tại lúc cấu hình chưa có run `event=schedule`; `scheduled_refresh_verified=false`, production chưa nghiệm thu. Hai chu kỳ sớm nhất để đối chiếu là sau 08:55 ngày 31/10 và 01/11/2026, có thể trễ theo scheduler. Chỉ chốt schedule khi hai chu kỳ thật có source/export/publish và readback đúng edition; không lấy hai run thủ công làm bằng chứng schedule. HCM connectivity, cron PDN, Long Bình Tân, ICD/kho bãi và Dung Quất định kỳ tiếp tục để sau.


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

Receipt phase: [binhduong-stabilization-20261030.json](catalog-review/binhduong-stabilization-20261030.json). Bản tính năng `ea7b7a3` đã push; Cloudflare build `ebe50cc3-e942-4d6f-9699-09d79d656bf6` success. [Readback staging](catalog-review/binhduong-live-readback-20261030.json) đạt 22 tháng hai chiều, journal, tổng GMD miền Nam và hàng GMD vùng. 44 tệp lịch sử Bình Dương/PDN đối chiếu với head trước phase giữ nguyên. Trong 14 phản hồi mới có 193 dòng toàn nguồn, không có BC198; không suy nguồn rỗng thành không hoạt động. Giới hạn của snapshot phase thủ công trước đó: lúc ấy chưa đăng ký workflow hoặc chạy cloud; kết quả cloud và lịch mới ở đầu tài liệu. Production chưa nghiệm thu. Các khoảng thiếu nguồn không được khắc phục chỉ bằng ổn định pipeline.

## Bước tiếp theo

Đã đăng ký lịch riêng; tiếp theo nghiệm thu hai run schedule thật sau 31/10 và 01/11, không suy từ manual runs. Nghiên cứu khoảng thiếu hoặc tài sản cảng sông/biển GMD/SGP tiếp theo chỉ khi có bằng chứng mới. HCM connectivity, cron PDN, Long Bình Tân, ICD/depot/kho bãi và Dung Quất định kỳ tiếp tục để sau.
