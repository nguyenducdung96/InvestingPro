# Phương án vận hành chuẩn cho nguồn TP.HCM

Ngày quyết định: 25/10/2026. Phạm vi: phục hồi việc thu thập lịch HTML gốc cho Gemalink/SGP bằng các nền tảng hiện có, bảo toàn lịch sử và ngữ nghĩa nguồn.

## Quyết định đề xuất

Giữ GitHub làm lịch/kiểm thử và collector hiện tại, Cloudflare phục vụ ứng dụng, Supabase lưu dữ liệu quan hệ. Điều kiện bắt buộc là **có đường dữ liệu được phía nguồn hỗ trợ, truy cập ổn định từ cloud**: endpoint lịch sử công khai/API được phép dùng, hoặc file xuất ngày trên một địa chỉ chính thức truy cập được. Nếu nguồn yêu cầu allowlist thì cần thống nhất IP egress cố định với họ trước khi lựa chọn dịch vụ egress.

Không đổi nguồn thống kê sang bản đồ NEO để tuyên bố đã sửa refresh. Không thay toàn bộ kiến trúc ứng dụng để giải quyết một đường mạng chưa truy cập được. Không có phương án đầy đủ đã được nghiệm thu chỉ bằng đổi setting tại thời điểm này.

## Kiểm chứng mới: Supabase Edge Functions

Đã thử thêm một lựa chọn serverless nằm trong nền tảng dự án đang dùng: function riêng `hcm-source-health`, deploy bằng Supabase CLI chính thức 2.122.0 qua API, không cần Docker/VPS. Function chỉ GET một URL cố định, không đọc database/secret, không trả HTML, giới hạn 4 MB và deadline 15 giây. JWT verification giữ bật; gọi không có Authorization trả 401. Không tạo PAT/API key mới; CLI dùng phiên đã có.

Chỉ định vùng Singapore (`ap-southeast-1`), Tokyo (`ap-northeast-1`) và Mumbai (`ap-south-1`). Cả ba phản hồi từ function HTTP 200 và header vùng khớp, nhưng kết quả **`reachable=false`, `source_timeout`** sau khoảng 15 giây. HTTP 200 ở đây xác nhận probe được thực thi, không chứng minh tải nguồn thành công. Lượt đầu phía client hết hạn 25 giây; lượt kiểm chứng 45 giây có phản hồi đủ từ cả ba vùng và được dùng cho kết luận.

Bằng chứng: [biên nhận Supabase](catalog-review/hcm-supabase-regions-20261025.json). Có thể chạy lại bằng `node scripts/check-hcm-edge-regions.mjs`; script dùng cấu hình sẵn có và không in key. Function là công cụ chẩn đoán có xác thực, không được nối vào workflow nghiệp vụ hoặc website. Bốn kiểm tra Node cho đích cố định/redirect/lỗi/body/deadline đã qua; đây không phải nghiệm thu refresh.

Tài liệu chính thức: [Supabase regional invocation](https://supabase.com/docs/guides/functions/regional-invocation), [API deployment](https://supabase.com/docs/guides/functions/quickstart), [dashboard deployment](https://supabase.com/docs/guides/functions/quickstart-dashboard).

## Các hướng và điều kiện thực hiện

1. **Ưu tiên: feed/API/file ngày từ nguồn chính thức hoặc khôi phục truy cập website gốc.** Giữ nguyên bộ kiểm tra ngày, schema, alias cầu, hash, provenance và parser. Xác nhận được ngày lịch sử cũ và ngày mới trước khi nối lịch 08:35. Không đòi hỏi thêm máy chủ dự án.
2. **Nếu nguồn chỉ hỗ trợ allowlist IP:** thống nhất quyền truy cập và phạm vi IP trước. GitHub standard runners có IP động; GitHub khuyên dùng static-IP larger runners hoặc self-hosted cho trường hợp allowlist. Tài liệu quản trị hiện ghi static IP của larger runners cần Enterprise Cloud. Đây là phương án có điều kiện và chi phí; chưa bật, chưa nâng gói, không bảo đảm tự hết lỗi nếu nguồn chưa chấp thuận.
3. **Trong lúc chờ đường nguồn:** bộ thu thập tại máy đã đọc được bảng gốc có thể chạy theo yêu cầu và xuất bản qua GitHub/Cloudflare. Đây là cập nhật có thao tác, không phải lịch tự động, không yêu cầu máy cá nhân luôn bật. Không đổi tên trạng thái thành cron thành công.
4. **Bản đồ/API:** dùng cho nghiên cứu nguồn bổ trợ hoặc lưu snapshot riêng; không thay lịch sử. Đối chiếu đã có 5/17 dòng cùng ngày và các ngày quá khứ mẫu chỉ NEO. Không có căn cứ để gọi đây là feed đầy đủ.

Tài liệu GitHub: [network/IP động của runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners), [quản lý larger runners và static IP](https://docs.github.com/en/actions/how-tos/manage-runners/larger-runners/manage-larger-runners). Không mua runner hoặc dịch vụ proxy trước khi có bằng chứng đường nguồn được chấp nhận.

## Điều kiện nghiệm thu giải pháp

- Tải từ cloud được GET form và POST đúng một ngày lịch sử cùng ngày gần nhất; TLS hợp lệ, không chuyển hướng sang đích chưa duyệt.
- Tiêu đề/ngày form/ngày yêu cầu khớp; kiểm tra schema, tên cầu chính xác và bản raw SHA-256.
- Đối chiếu cả hai chiều, DWT/null và nhật ký với bảng gốc; không suy actual từ kế hoạch hoặc NEO.
- Giữ dữ liệu tốt cuối khi nguồn lỗi; bản dữ liệu được publish và API/UI live đọc đúng edition sau cập nhật.
- Hai chu kỳ lịch thật có biên nhận thành công. Một probe HTTP 200 hoặc lần chạy thủ công không đáp ứng điều kiện này.

Nội dung kỹ thuật sẵn để đề nghị phía nguồn kiểm tra nằm cuối [báo cáo đường truy cập](hcm-source-connectivity-20261025.md). Chưa gửi liên hệ bên ngoài. Không khẳng định đã biết chính xác quy tắc firewall/định tuyến phía nguồn; các phép thử hiện chỉ khoanh vùng được sự khác biệt đường mạng.
