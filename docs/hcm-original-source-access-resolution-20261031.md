# HCM: ưu tiên khôi phục truy cập lịch gốc — 31/10/2026

Theo chỉ đạo mới của người dùng: **ưu tiên giải quyết access nguồn HCM gốc; hoãn xây intake quốc gia bổ trợ chưa đủ độ phủ**. Mục này thay thứ tự next step từng đề xuất sau audit 40 mẫu. Giữ nguyên bằng chứng audit và không nhập các ứng viên bổ trợ vào metric.

## Bằng chứng mới

Từ máy hiện tại lúc `2026-10-31T15:44:29.776984Z`, DNS nguồn vẫn là `222.253.45.177`. GET trả đúng ngày 31/10/2026, đủ ba bảng; POST bằng form công khai trả đúng ngày yêu cầu, schema và tiêu đề:

- 01/01/2025: 35 dòng vào, 37 dòng rời, 25 dòng điều chuyển; SHA-256 `4af41925ef96be88acdd5ff49c6987443fbd44ddfb41f8ca51bb4b7dd04c8705`.
- 30/10/2026: 82 dòng vào, 77 dòng rời, 52 dòng điều chuyển; SHA-256 `f13458136b1f5a89c17937100d24d3a93476a83cc62123d87ece0452db4a9f60`.

Đây là tổng dòng bảng nguồn, không phải tổng riêng 11 asset đang theo dõi, cũng không phải actual. TLS validation giữ bật. Không sửa parser/alias hoặc publish dữ liệu trong lần kiểm này. Raw gzip tại `.local/ops/hcm-access-recheck`; receipt được lưu tại [catalog-review/hcm-original-source-access-resolution-20261031.json](catalog-review/hcm-original-source-access-resolution-20261031.json).

Các bằng chứng GitHub/Cloudflare/Supabase trước đó cho thấy lỗi kết nối từ những đường cloud đã thử, trong khi máy tại Việt Nam đọc được. Chưa có xác nhận phía nguồn về nguyên nhân: **không gọi chắc chắn là chặn IP nước ngoài hoặc geoblock**. Tăng timeout, đổi User-Agent, chỉnh CORS, TLS hay SQL không giải quyết được thất bại TCP đã quan sát. Cloudflare placement Bangkok và Supabase ba vùng đã thử không chứng minh được đường thay thế. Không lặp lại ma trận cũ khi không có thay đổi mạng/đầu mối mới.

## Phương án chuẩn được đề xuất

**Ưu tiên nguồn gốc và tách nơi thu thập khỏi nơi phục vụ web.** Cloudflare tiếp tục phục vụ dashboard; GitHub tiếp tục kiểm tra/xuất bản. Collector đọc chính bảng HTML/form ngày đang dùng, chạy trên một máy chuyên dụng có đường ra cố định được kiểm chứng tới nguồn. Máy tại Việt Nam là ứng viên hợp lý theo bằng chứng local, nhưng **chưa có VPS/IP trung tâm dữ liệu nào được kiểm chứng** và mua VPS Việt Nam không tự bảo đảm truy cập được.

1. Xin kiểm tra đường truy cập từ IP ứng viên trước khi cam kết hạ tầng: GET form, POST ngày lịch sử và ngày gần nhất, TLS hợp lệ, đúng ngày/schema. Nếu không đạt, đề nghị nguồn/nhà mạng xác minh định tuyến hoặc allowlist IP. Nếu nguồn có feed/API/file xuất chính thức đầy đủ thì ưu tiên đánh giá tương đương bảng gốc, không thay bằng nguồn thiếu dòng.
2. Khi đã có IP đạt, chạy collector chuyên dụng có lịch, persistent raw archive và bản ghi kết quả từng lần. Đồng bộ đủ lịch sử đã kiểm hash trước khi bật guard/export để tránh xuất bản lịch sử rỗng từ cache mới.
3. Chuyển raw/manifest có kiểm hash cho quy trình kiểm tra/xuất bản hiện tại; chỉ cho bên thu thập quyền tối thiểu với vùng dữ liệu cần thiết. Không đưa credential deploy/database vào collector. Giữ dữ liệu tốt cuối nếu mạng, schema, hash hoặc readback lỗi.
4. Chạy collect → validate → export → push staging → Cloudflare → API/UI readback đúng edition, cả hai chiều và 11 phạm vi. Sau đó cần hai schedule thật thành công khác ngày, raw được lưu bền; production nghiệm thu riêng. Độ đầy đủ ở đây là so với bảng gốc và phạm vi đã mapping, không tuyên bố bao phủ mọi hoạt động thực tế.

GitHub khuyến nghị static-IP larger runners hoặc self-hosted cho nhu cầu allowlist thay vì danh sách IP động rộng của runner chuẩn: [runner networking](https://docs.github.com/en/actions/reference/runners/github-hosted-runners). [Static IP larger runners](https://docs.github.com/en/actions/how-tos/manage-runners/larger-runners/manage-larger-runners) hiện cần tổ chức Enterprise Cloud; repository đang thuộc tài khoản cá nhân, không phải lựa chọn chỉ đổi một dòng `runs-on`.

Repository hiện public và API trả **0 self-hosted runners**. Không gắn máy cá nhân/collector lâu dài vào pipeline PR công khai. Collector độc lập chạy code đã kiểm soát và chuyển dữ liệu ra ngoài phù hợp hơn cho trường hợp này; nếu chọn self-hosted thì phải đánh giá cô lập và chỉ nhận workflow tin cậy trước khi đăng ký. [Yêu cầu kết nối runner](https://docs.github.com/en/actions/reference/runners/self-hosted-runners), [GitHub security guidance](https://github.github.com/gh-aw/guides/self-hosted-runners/).

## Đầu mối chính thức và yêu cầu kỹ thuật

Homepage gốc vừa đọc công bố email `cangvuhhtphcm@cangvuhanghaitphcm.gov.vn`, điện thoại văn phòng `028.37719125 / 028.37719126`, đơn vị phát triển Vishipel. Đây là đầu mối cơ quan, chưa xác nhận là bộ phận vận hành mạng; đề nghị chuyển yêu cầu đến quản trị website/nhà mạng. Chưa gửi liên hệ.

Nội dung sẵn để liên hệ: đề nghị kiểm tra HTTPS công khai tới `cangvuhanghaitphcm.gov.vn:443` (`222.253.45.177`), đường `/index.aspx?page=shipschedule&cat=3146`; cung cấp thời gian, IP egress của máy triển khai khi đã có, kết quả DNS/TCP/TLS và hai mẫu POST ngày. Xin xác nhận truy cập tự động biểu mẫu công khai, giới hạn tần suất, yêu cầu allowlist hoặc endpoint/file ngày tương đương **đầy đủ bảng đến/rời**, gồm ngày, cầu bến, tàu/hô hiệu, giờ và DWT. Không yêu cầu tài khoản nghiệp vụ nội bộ. [Homepage nguồn](https://cangvuhanghaitphcm.gov.vn/).

## Trạng thái chốt

Đã chứng minh nguồn gốc còn cung cấp lịch sử và ngày mới tại máy; đã nghiên cứu giới hạn nền tảng và xác định đường triển khai phù hợp. **Chưa có host/IP chuyên dụng đã thử, chưa khôi phục cloud refresh, chưa nghiệm thu schedule hoặc production.** Không mua VPS, bật dịch vụ trả phí, tạo quyền truy cập hoặc gửi email trong phase nghiên cứu này. Bước triển khai cụ thể tiếp theo là có máy/IP ứng viên hoặc phản hồi quản trị nguồn rồi chạy preflight GET/POST trên đúng máy đó; không xây intake quốc gia để thay vấn đề access.
