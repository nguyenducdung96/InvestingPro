# Phương án vận hành chuẩn cho nguồn TP.HCM

## HCM đã chốt đối chiếu nguồn mới: chỉ dùng bổ trợ — 31/10/2026

Đã đối chiếu **40 mẫu** cả hai chiều trong tuần 22–28/10 của 2025/2026; giữ riêng bốn ô không có quan sát. **122 snapshot truy vấn và 46 PDF** được lưu/kiểm; chạy lại offline không gọi mạng và cho kết quả từng ca giống hệt. Kiểm SHA/reparse chín bảng HTML tham chiếu, đủ 40 dòng và scope proof K12. Kết quả: **9 khớp trường kế hoạch, 10 chỉ tương ứng giờ giấy phép, 2 khác trường dữ liệu, 9 thiếu định danh, 10 chưa có đối ứng trong cửa sổ**. Không quy đổi các nhóm này thành tỷ lệ bao phủ hoặc hoạt động cảng.

**Quyết định:** nguồn quốc gia chưa tương đương để thay toàn bộ bảng HCM. Giữ kế hoạch MESSAGE_TYPE=70 và giấy phép MESSAGE_TYPE=60 thành hai loại riêng; không mượn GT/DWT, không ghép hai giờ thành hai lượt, không tự xác nhận bến/issuer chỉ từ tên hoặc hậu tố K12. Các dòng khớp vẫn là ứng viên cần mapping/phiên bản trước khi nhập metric. Không sửa dashboard/ledger/alias trong đợt này; HCM vẫn phục vụ đến **28/10**.

Code **eb2c229**, 7 matrix + 10 national Python tests đạt; [Quality 41203772096](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41203772096) và Cloudflare success. Toàn ma trận được đối chiếu tại máy; bằng chứng cloud vẫn là ba mẫu của run 41201078402. [Báo cáo và hợp đồng nguồn](hcm-national-matrix-audit-20261031.md), [receipt](catalog-review/hcm-national-matrix-audit-20261031.json), [manifest ca](catalog-review/hcm-national-matrix-cases-20261031.json).

**Next step:** intake kế hoạch quốc gia độc lập, có raw archive/revision và hàng chờ đối chiếu; mở rộng có giới hạn cửa sổ hồ sơ cho các ca chưa khớp, bổ sung định danh/mapping. Giấy phép giữ ngoài tổng kế hoạch hiện tại. Chỉ nối collect/export/deploy/readback sau khi các gate dữ liệu đạt; chưa nghiệm thu replacement/schedule HCM hoặc production. Raw đầy đủ hiện ở máy; cần lưu bền phần được chọn trước tích hợp. Bình Dương giữ lịch/recorder chờ hai chu kỳ thật khác ngày. PDN cron, Long Bình Tân, Dung Quất định kỳ và ICD/kho bãi giữ để sau.

## HCM có nguồn quốc gia mới đã kiểm chứng mẫu từ cloud — 31/10/2026

Đã chuyển trọng tâm sang HCM trong lúc chờ lịch Bình Dương. Cổng quốc gia có menu kế hoạch điều động và bộ lọc TP.HCM (`maritimeCode=21`), PDF gốc có thời gian kế hoạch/DWT/From/To. [Run cloud 41201078402](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41201078402) **success**, tải/kiểm ba mẫu lịch sử và gần đây; khớp một mẫu K16 năm 2025 và mẫu K12 31/10 với bảng HCM tại máy. Workflow review read-only, dispatch-only, artifact 90 ngày; chưa nối ứng dụng hoặc lịch nghiệp vụ. Code **4d8399f** và sửa nhận số lượng đơn lẻ **d667b83** đều CI/Cloudflare success; 10 national Python tests đạt.

**Chưa thay thế bảng lịch:** ngày danh sách khác ngày kế hoạch; mẫu NEWSUN GREEN 03 mới tìm được kế hoạch vào, chưa đủ hồ sơ rời trong cửa sổ đã rà. Mẫu KIEV có giờ kế hoạch PDF khác bảng HCM; giấy phép rời cảng là loại hồ sơ riêng, mẫu chỉ có GT, không có DWT. Không tự ghép/đếm trùng hoặc gọi giấy phép là actual. Lịch HCM công bố vẫn đến **28/10**, chưa nghiệm thu refresh/schedule/production.

**Next step HCM:** đối chiếu coverage cả hai chiều và phiên bản theo từng phạm vi trong cửa sổ đại diện 2025/2026; tách kế hoạch/giấy phép; chốt chống trùng và hợp đồng nguồn trước khi nối collect/export/deploy/readback. Không còn coi “chưa có đầu mối nguồn mới” là trạng thái hiện hành: đã có đường lấy PDF chính thức từ cloud, còn gate dữ liệu. [Hồ sơ chi tiết](hcm-national-source-review-20261031.md), [receipt](catalog-review/hcm-national-source-review-20261031.json). Website bảng lịch cũ vẫn chưa được nghiệm thu cloud bằng kết quả nguồn mới này.

Bình Dương giữ lịch/recorder chờ hai chu kỳ thật khác ngày. PDN cron, Long Bình Tân, Dung Quất định kỳ, ICD/kho bãi giữ để sau. Các snapshot cũ bên dưới được giữ để truy vết và không thay kết luận mới này.

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
