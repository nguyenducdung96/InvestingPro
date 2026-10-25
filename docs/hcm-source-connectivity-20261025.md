# Nguồn TP.HCM: kết nối, cấu hình và phương án — 25/10/2026

## Kết quả đã chứng minh

Website lịch gốc hoạt động tại máy phát triển. GitHub phân giải đúng IPv4 `222.253.45.177`, nhưng không mở được TCP 80 hoặc 443; chưa đến bước TLS/HTTP/parser. Kiểm tra mới gồm Ubuntu 24.04 x64, Windows và Ubuntu 24.04 ARM. Các lần Ubuntu/macOS trước cũng timeout. Không kết luận chắc chắn chặn địa lý/IP: nguyên nhân cụ thể giữa lọc mạng và định tuyến vẫn cần phía nguồn hoặc nhà mạng xác nhận.

Trong **cùng job GitHub**, cổng bản đồ chính thức và backend mà client của cổng này gọi đều HTTP 200. Cloudflare cũng đọc được hai đường này. Vì vậy không có bằng chứng GitHub/Worker bị tắt toàn bộ truy cập Internet.

Bằng chứng: [ma trận mạng](catalog-review/hcm-network-review-20261025.json), [đối chiếu bản đồ](catalog-review/hcm-map-source-review-20261025.json). Lượt GitHub [40180688786](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40180688786) và [40181225160](https://github.com/nguyenducdung96/InvestingPro/actions/runs/40181225160) hoàn tất **chẩn đoán**, không phải refresh dữ liệu thành công.

## Advanced settings đã rà và thử

- Cloudflare staging ban đầu Placement `Default`, không có Cron/Queue/binding dữ liệu mới. Thử `placement.hostname` theo nguồn: vẫn timeout; header `local-HKG`, chưa chứng minh được chuyển tới vùng gần nguồn.
- Thử vùng cụ thể `placement.region=aws:ap-southeast-7`: Cloudflare build thành công, deployment `a143ae09`, header **`remote-BKK`** xác nhận thực thi từ Bangkok; cả tên miền chính và `www` vẫn timeout. Trường `colo` trong JSON là vị trí request đầu vào, không dùng thay header placement để kết luận nơi thực thi.
- Đã bỏ cấu hình Placement thử nghiệm bằng commit `e952d97`, trả về mặc định. Thay đổi vị trí thực thi áp dụng cho toàn Worker; không giữ một cấu hình thử nghiệm chưa giúp đường nguồn.
- HTTP 80 tại máy trả 302 lên HTTPS. `www` trỏ cùng IPv4 với tên miền chính. Hai cách này không cung cấp đường độc lập. Tên miền chính không có IPv6 trong kết quả DNS hiện tại.
- TLS tại máy hợp lệ, TLS 1.3, chứng chỉ tới 24/01/2027 giờ Việt Nam. GitHub thất bại trước TLS nên chỉnh chứng chỉ, User-Agent, CORS hoặc quyền SQL không giải quyết được bước TCP đã quan sát.
- GitHub standard runners không có lựa chọn region/static egress trong workflow này. Đổi OS/kiến trúc đã được thử; chưa có runner chuẩn nào trong các mẫu truy cập được IP nguồn. Không thêm larger runner trả phí.
- Supabase chỉ được đọc danh sách extension: chưa có `pg_net`, `http`, `pg_cron`. Không cài extension hay thay quyền để biến database thành proxy. Wrangler OAuth hiện không truy cập được API deployment, nên dùng Workers Builds hiện có; không xin thêm scope/token.

Tài liệu nền tảng: [Cloudflare Placement](https://developers.cloudflare.com/workers/configuration/placement/), [GitHub runner networking](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows). Placement chọn nơi thực thi; không phải cam kết IP ra cố định hoặc quyền truy cập phía nguồn.

## Nguồn đã mở rộng

1. [Lịch HTML gốc](https://cangvuhanghaitphcm.gov.vn/index.aspx?page=shipschedule&cat=3146): giữ nguồn chính cho lịch sử đến/rời. Ngày yêu cầu, tiêu đề và ngày form được kiểm tra; raw theo hash.
2. [Bản đồ chính thức](https://kehoach.cangvuhanghaitphcm.gov.vn/welcome): homepage Cảng vụ liên kết tới đây. Client công khai gọi `https://phuongdinh.name.vn/api/cangvu/getDSTau4?ngay=DD/MM/YYYY`. Đây là backend **được client chính thức sử dụng**; chưa chứng nhận chủ sở hữu domain backend.
3. [Tra cứu giấy phép Cảng vụ](https://tcgp.cangvuhanghaitphcm.gov.vn): cùng IP website gốc; chưa có đường cloud độc lập được chứng minh. Giấy phép và lịch điều động là hai loại hồ sơ khác nhau.
4. Các link chính thức `dnhh` và `qlct` hiện phân giải ra địa chỉ private, không thích hợp làm nguồn Internet công khai; không tiếp tục truy cập địa chỉ private.
5. [Tra cứu giấy phép toàn quốc](https://hanghai.moc.gov.vn/tra-cuu-giay-phep): đã có dossier nguồn trong dự án; cần đánh giá riêng cho bến TP.HCM/DWT. Không dùng số giấy phép làm lượt actual hoặc GT làm DWT. Chưa xác minh được nguồn này thay lịch gốc trong yêu cầu hiện tại.

### Vì sao chưa chuyển sang API bản đồ

Payload lịch sử mẫu 01/01/2025, 23/10/2026 và 24/10/2026 chỉ có `NEO`; không chuyển các ngày đến/rời trên snapshot thành sự kiện lịch. Payload ngày 25/10 có `DEN`, `DI`, `DI_CHUYEN`, `NEO`.

Đối chiếu ngày 25/10 trong đúng nhóm cầu đang tích hợp: HTML có **17** dòng đến/rời; API bản đồ có **5** dòng kế hoạch, cả 5 khớp tên tàu/cầu/chiều/giờ/DWT với HTML. Chênh lệch này chứng minh API không trả toàn bộ cùng bảng tại thời điểm kiểm tra. Có thể nghiên cứu làm nguồn bổ trợ riêng có coverage/provenance, nhưng chưa dùng thay nguồn gốc, chưa gộp NEO hoặc điều chuyển vào số đến/rời, chưa sửa dashboard/ledger.

## Phương án khả thi theo bằng chứng

**Để khôi phục chuỗi đầy đủ:** cần đường công khai đến lịch gốc được phía nguồn mở/khắc phục cho cloud, hoặc một endpoint lịch sử chính thức cung cấp đủ bảng tương đương. Cấu hình nội bộ đã thử chưa vượt qua điểm nghẽn mạng này. Chưa xác minh được giải pháp tự động đầu cuối bằng cách đổi setting.

**Để có dữ liệu bổ trợ từ hạ tầng hiện tại:** đường bản đồ/API đã hoạt động từ GitHub và Cloudflare. Có thể xây intake riêng lưu snapshot hiện tại và các dòng `DEN/DI` có bằng chứng, giữ cửa sổ cập nhật, nguồn và thiếu hụt riêng. Không hồi dựng lịch sử từ NEO, không chứng nhận đầy đủ hoặc thay thế chuỗi đang có. Đây là phương án mở rộng khác ngữ nghĩa, chưa tự triển khai thay thế trong lần chẩn đoán.

### Nội dung kỹ thuật sẵn để đề nghị phía nguồn kiểm tra — chưa gửi

Đề nghị kiểm tra truy cập HTTPS công khai tới trang lịch điều động tại `cangvuhanghaitphcm.gov.vn`, IP `222.253.45.177`, cổng 443. Ngày 25/10/2026 khoảng 16:25–16:40 Việt Nam, kết nối từ máy tại Việt Nam thành công; GitHub-hosted runners timeout khi mở TCP 80/443; Cloudflare mặc định và thực thi Bangkok cũng timeout HTTPS. DNS cùng trả về IPv4 nêu trên. Xin xác nhận giới hạn truy cập mạng, hướng dẫn đường/API công khai được phép dùng cho lịch sử bảng đến/rời, hoặc endpoint lịch sử phía cổng bản đồ. Cần giữ tên cầu, tên tàu/hô hiệu, DWT, thời gian, ngày bảng và loại chuyển động; không cần tài khoản nội bộ.

Không gửi email/liên hệ bên ngoài trong task này. Không tạo VPS, dùng proxy không rõ nguồn, tắt TLS, cấp token mới hoặc thay dữ liệu cũ để làm run xanh.

## Kiểm chứng phần thay đổi

Route chẩn đoán chỉ có bốn URL cố định, từ chối đích tùy ý và inherited keys, không đi theo redirect, giới hạn body 4 MiB, hủy yêu cầu 15 giây và cache 15 phút. Ba Vitest mới đã qua; web typecheck/lint mục tiêu và diff check đã qua ở phần route. Workflow chẩn đoán không có lịch, chỉ có `contents: read`, không export hoặc publish dữ liệu nghiệp vụ.
