# Bình Dương: lưu và đối chiếu chu kỳ lịch thật — 31/10/2026

## Thay đổi

Bổ sung `scripts/record-binhduong-cycle.mjs` và sáu kiểm thử riêng. Workflow chạy recorder với `if: always()` sau bước đối chiếu live; kể cả khi nguồn, kiểm tra hoặc publish thất bại, chu kỳ được ghi là thất bại. Runtime Node được chuẩn bị trước bước lấy nguồn để hỗ trợ đường lỗi này. Không thay dữ liệu/API hoặc cách tính chỉ số.

Recorder chỉ nhận ngữ cảnh GitHub Actions có run ID/attempt hợp lệ. Để xác nhận bản hiện tại, collector phải success, nguồn/export success, bước readback và trạng thái job phải success; receipt phải khớp event/run/attempt, commit publish, ngày kết thúc và thứ tự thời gian collection/edition. Biên nhận cũ, khác run hoặc thời gian edition tương lai không thể chứng nhận chu kỳ hiện tại.

Mỗi run/attempt ghi `.local/binhduong/receipts/<run_id>-<attempt>.json`. Chỉ thư mục receipt này được cache giữa các run; không khôi phục `collect-receipt.json` hoặc `live-readback.json` cũ vào lần thu thập mới. `scheduled-acceptance.json` và GitHub step summary trình bày kết quả xét lịch. `live-readback.json` tiếp tục là bằng chứng đối chiếu edition của từng run; dùng **scheduled-acceptance.json** để xem kết luận hai chu kỳ.

Quy tắc dùng chung với HCM: chỉ event `schedule`, lấy attempt mới nhất của mỗi run, xét hai run gần nhất trong 72 giờ, khác ngày UTC, không nằm trong tương lai; cả hai đều có source/readback success. Run thủ công không được cộng thành chu kỳ lịch. Lần chạy lại thất bại của chu kỳ đã thành công làm mất điều kiện nghiệm thu. Biên nhận cache sai protocol/kiểu dữ liệu/ngày làm recorder lỗi, không tạo kết luận đạt.

Cache là bộ nhớ phục vụ đối chiếu, không phải kho lưu vĩnh viễn. Cache mất thì bắt đầu lại ở trạng thái chưa đủ bằng chứng; artifact giữ 14 ngày. Khi nghiệm thu các chu kỳ thật cần lưu receipt quan trọng vào tài liệu dự án. Không thay `scheduled_refresh_verified` trong API/metadata dữ liệu hoặc tự nghiệm thu production từ cache.

## Đăng ký và kiểm chứng

Workflow trên `main` được cập nhật riêng tại **f22ee3c**, chỉ một tệp `.github/workflows/binhduong-plans.yml`. Ứng dụng vẫn checkout/publish nhánh staging, không merge ứng dụng sang main. Code recorder tại **df659ef**, thêm điều kiện thời gian edition tại **3dc4189**. Tổng **14 Node tests** gồm verifier và recorder đạt tại máy; CI cũng chạy cùng bộ test.

Lượt thử cloud **41199812097** lấy nguồn thành công nhưng publish bị từ chối vì nhánh đã có cập nhật code mới trong lúc job chạy. Không rebase/force push để bỏ qua bảo vệ. Recorder vẫn lưu `job_status=failure`, `deployment_readback_verified=false`, `scheduled_refresh_verified=false`; readback đã bị skip. Lượt này không được tính là chu kỳ lịch và không phải lỗi nguồn.

[Lượt cloud 41199942594](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41199942594) **success**: nguồn/export/publish/readback và recorder/cache/artifact đều đạt. Publish **9a09810**, edition `checked_at=2026-10-31T12:11:10.764642+00:00`, đến 30/10. Artifact giữ hai biên nhận: lượt trước publication failure, lượt mới source/readback success. Cache đã khôi phục lịch sử đúng; cả hai là `workflow_dispatch` nên `scheduled_run_ids=[]`, `scheduled_refresh_verified=false`.

Bản code **3dc4189** đã qua toàn bộ CI (validate, E2E desktop/mobile, required check) và Cloudflare build. Bản dữ liệu 9a09810 cũng build staging success và được đối chiếu live đủ 22 tháng hai chiều, journal/hash, tổng GMD/vùng và trang chi tiết. [Biên nhận nghiệm thu](catalog-review/binhduong-scheduled-evidence-20261031.json) lưu kết quả và hai chu kỳ thử, không chứa thông tin xác thực.

## Cổng còn lại

Chưa có hai chu kỳ schedule thật thành công; không đổi run thủ công thành schedule. Hai cơ hội tiếp theo là lịch 01–02/11 nếu nguồn và scheduler hoạt động, có thể trễ. Khi đủ bằng chứng phải đọc artifact/summary, kiểm run/event/attempt và lưu receipt nghiệm thu. Production vẫn cần nghiệm thu riêng.

HCM tiếp tục bị chặn theo [hồ sơ truy cập](hcm-cloud-acceptance-20261031.md); chưa có đầu mối nguồn mới để chạy lại cùng phép thử. Không thay lịch gốc bằng NEO hoặc mở alias K12 toàn cục. PDN cron, Long Bình Tân, Dung Quất định kỳ và ICD/kho bãi tiếp tục để sau.
