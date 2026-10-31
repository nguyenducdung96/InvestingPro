# K12 SGP — đối chiếu từng dòng kế hoạch, 31/10/2026

Phạm vi là cầu cảng biển tại Tân Thuận thuộc SGP. Nhãn K12 đồng thời tồn tại ở khu neo Vũng Tàu; không thêm alias K12 toàn cục. Các dòng đủ bằng chứng được thêm vào monitor Tân Thuận hiện có, không tạo thêm dòng SGP ở bảng miền Nam hoặc monitor kho/ICD.

## Phương pháp

Rà SHA và parse lại đủ 666 bảng lịch 01/01/2025–28/10/2026; giữ 452 dòng trực tiếp K12 và 43 điều chuyển riêng. Chỉ dùng dòng kế hoạch vào/rời có sẵn để tạo chỉ tiêu. Đăng ký NEO từ API Cảng vụ được lưu raw/hash, ngày truy vấn và chỉ số dòng; chỉ dùng để đối chiếu bến đăng ký của cùng chuyến, không trở thành movement hoặc bằng chứng AIS/actual.

Điều kiện lựa chọn từng dòng: tên tàu chuẩn hóa giới hạn khoảng trắng/dấu chấm; ngày/giờ khớp đúng chiều; giờ vào vùng cảng và giờ vào cầu không bị đổi lẫn; LOA và DWT khi cả hai nguồn có phải khớp. Raw phải ghi K12 thuộc BẾN CẢNG SÀI GÒN, đồng thời danh mục provider `hcm-kehoach/getDSTau4` ghi cầu K12 / id 52 / loại Cầu / cùng bến cảng. Không dùng riêng tuyến luồng, kích thước, tên tàu hoặc điểm bản đồ để gán SGP. Bản ghi khác bến, nhiều ứng viên, khác giờ hoặc thiếu đối chiếu giữ ngoài tổng.

Manifest [từng dòng được chọn](catalog-review/sgp-k12-reviewed-rows.json) đóng băng raw kế hoạch, row id, bản đăng ký đối chiếu, hash và chỉ số dòng nguồn. Exporter kiểm tra lại điều kiện với đúng raw row; mọi sửa đổi làm mất dòng đã rà sẽ dừng export và giữ edition trước. Đồng thời giữ ngoài các dòng K12 trùng khóa ngày/chiều/tên tàu/giờ với phạm vi SGP khác. Snapshot và revision không được cộng thêm thành lượt/DWT.

## Mẫu cần phân biệt

- FORTUNE NAVIGATOR vào 24/10/2026 20:00: kế hoạch K12, LOA 119,16, DWT 8.649 khớp bản đăng ký K12 / Bến cảng Sài Gòn / cầu 52. Chiều rời 25/10 12:30 phải có dòng kế hoạch riêng mới được tính.
- VIMC PIONEER vào 30/07/2025 23:30: khớp cầu K12 SGP và DWT 9.088. BELLIGHT cùng ngày có giờ vào vùng 08:00 nhưng đăng ký cầu Thị Vải ODA lúc 23:00; không đổi hai vai trò giờ rồi gán sang K12 SGP.
- TONGAN 31/07/2025, TAICHUNG 18/08/2025 và ARMADA 86 02 06/09/2025 có đăng ký K12 thuộc KHU NEO VTAU; giữ ngoài SGP.
- MINH PHUC 86 có đối chiếu NB-12, BIENDONG STAR có đăng ký K12B; không nhận nhầm thành cầu K12 theo riêng nhãn gần giống. Phần các cầu đã tích hợp trước đó được giữ nguyên.

[Thông cáo Cục Hàng hải về GLENGYLE](https://www.vimawa.gov.vn/vi/tin-tuc/thong-cao-bao-chi-ve-tai-nan-dam-va-tau-bien-tren-luong-hang-hai-sai-gon-vung-tau) ghi hướng vào K12 trước sự cố; [đơn vị Hiệp Phước công bố cứu hộ và khai thác tàu](https://sggt.vn/cang-sai-gon-hiep-phuoc-no-luc-cuu-ho-va-khai-thac-thanh-cong-tau-glengyle/). Tàu này không có trong 452 dòng K12 trực tiếp của edition; không tạo thêm lượt từ tin bài hoặc dùng tên tàu để gán toàn bộ lịch sử. Hai nguồn minh họa sự khác nhau giữa kế hoạch và kết quả thực tế.

## Độ phủ và vận hành

Nguồn API đã trả HTTP 429 yêu cầu chờ 15 phút; đã dừng tải và lưu thông báo/hash, không đổi IP hoặc bỏ TLS. Các bản đã lưu vẫn dùng được cho review offline. Lệnh tải giới hạn tối đa 80 ngày mới mỗi batch, tuần tự và giãn nhịp; cache hợp lệ không tải lại, cooldown được kiểm tra trước mọi yêu cầu mới. Không coi phần chưa tải được là không có hoạt động.

Lệnh review: `python scripts/review-sgp-k12.py`; thêm `--fetch --max-new-days 30` khi được phép tải nguồn và đã hết cooldown. `--spread-days` phân bố một batch giữa các ngày còn thiếu; `--write-reviewed-manifest` chỉ được dùng khi chủ động cập nhật hồ sơ phạm vi, sau đó export/check lại. Không có workflow tự động đưa quyết định review mới vào dashboard.

Độ phủ đối chiếu K12 còn thiếu và không đều giữa hai năm; giữ số ghi nhận theo chính sách dự án, chi tiết thu gọn trong UI/API. Không chứng nhận toàn bộ K12, không backfill DWT từ map/GRT, không gán điều chuyển vào/rời. Bình Dương, PDN, Long Bình, Gemalink national, TT2 và 10.803 dòng lịch sử đã phát hành trước phase được bảo toàn.

[Hồ sơ đầy đủ từng ứng viên và nguồn](catalog-review/sgp-k12-row-review-20261031.json). Số liệu cuối, kiểm tra và biên bản staging được bổ sung sau khi chốt manifest.

## Số liệu chốt và kiểm tra

Chọn **331 dòng**: **173 vào / DWT 2.232.642** và **158 rời / DWT 2.067.706**, không thiếu DWT trong tập được chọn. 169 dòng năm 2025 và 162 dòng năm 2026. Đây là tổng trọng tải trên dòng kế hoạch, không phải sản lượng hàng hoặc số tàu duy nhất.

**121 dòng trực tiếp giữ ngoài SGP**: 107 chưa có đăng ký khớp chính xác, 10 khác bến đăng ký, 3 khác vai trò giờ vùng cảng/giờ vào cầu và 1 có nhiều đăng ký xung đột. 43 điều chuyển vẫn riêng. Đã lưu đủ **217/217 ngày đăng ký ứng viên**, không còn ngày truy vấn trong phạm vi ban đầu chưa tải. Đủ ngày truy vấn không chứng nhận đủ mọi hoạt động hoặc đủ scope cho các dòng chưa khớp. Sau khi nguồn yêu cầu nghỉ 15 phút, đã dừng đủ thời gian rồi tải thêm các batch giới hạn 80 và 15 ngày; khi cửa sổ quota tiếp theo mở đã khép nốt 24 ngày còn lại, không vượt giới hạn hoặc đổi IP. Toàn bộ 291 dòng K12 đã chọn trước đó được giữ; đợt cuối bổ sung 40 dòng.

Audit độc lập kiểm tra từng hash raw API và bản ghi đúng chỉ số trong manifest, đối chiếu raw/DWT/giờ với bảng kế hoạch, không chuyển DWT từ bản đồ. Bảo toàn giá trị và thứ tự **10.803 dòng đã phát hành**; không có khóa ngày/chiều/tên tàu/giờ trùng với SGP đã theo dõi hoặc trùng giữa các ứng viên K12. Các nguồn riêng Bình Dương/PDN/Long Bình/Gemalink national không thay đổi.

Local: 17 kiểm tra Python về nhận diện/cooldown/gate đạt; E2E desktop/mobile tập trung 6/6 đạt, gồm bằng chứng K12 và tổng SGP theo tháng/quý hai chiều; lint/typecheck đạt. Một lần Vitest chạy đồng thời với E2E làm hook PGlite của registry quá 10 giây; chạy lại không có E2E đồng thời: **45 files / 188 kiểm tra đạt**, không sửa timeout hoặc mã ứng dụng theo lỗi tải máy.

Verifier staging nay kiểm tra cả SHA manifest phạm vi, vì thời điểm thu thập bảng ngày không đổi khi chỉ bổ sung quyết định đối chiếu. Bản cũ cùng timestamp không được nhận nhầm là edition mới. Hash manifest dùng bản UTF-8 chuẩn LF, khớp Git blob trên Linux và checkout CRLF trên Windows; hash raw phản hồi nguồn vẫn tính nguyên bytes. Có kiểm tra hồi quy cho hai kiểu xuống dòng. [Receipt tích hợp](catalog-review/sgp-k12-integration-20261031.json). Biên bản CI/staging đã chốt bên dưới; chưa nghiệm thu HCM cloud, schedule refresh hoặc production.

Toàn bộ E2E local trên bộ dữ liệu cuối: **78/78 đạt (3,5 phút)**. API staging đã khớp 22 tháng hai chiều / 11 asset theo dõi, tổng sáu phạm vi SGP và một dòng SGP miền Nam. Smoke UI desktop/mobile đúng 331/452 dòng và 217/217 ngày; raw/hash của mẫu được chọn khớp, mẫu K12 khu neo không lọt vào tổng. Ba attempt CI trên cùng SHA nhận runner shutdown trong E2E. Đã chia E2E thành desktop/mobile và giữ chốt check bắt buộc; bộ CI mới đã đạt. Các cập nhật tự động NAP c434390, PDN 1f15041 và Bình Dương 5346778 được fast-forward giữ nguyên, không được diễn giải là nghiệm thu cron của các phase đó.

## Biên bản phát hành cuối

**Phát hành chốt:** mã dữ liệu K12 `6c75d59`, bản CI cuối `6ec498c` trên `codex/cloudflare-next-compat`. [Quality 41183079501](https://github.com/nguyenducdung96/InvestingPro/actions/runs/41183079501) **success**: validate gồm lint/typecheck/188 Vitest/Python/Next/OpenNext; E2E desktop và mobile đều success; required `check` chỉ success sau tất cả các job. Cloudflare build `74401468-db7b-416e-af17-493157205739` **success**. Ba attempt trước của run 41181037139 bị runner shutdown sau khoảng 5 phút E2E; đã chia project desktop/mobile thành hai job ngắn, giữ đủ test và không dùng continue-on-error/bỏ check. Local toàn bộ 78 E2E đạt.

API live đã khớp 22 tháng hai chiều cho 11 asset theo dõi, tổng sáu phạm vi SGP và một dòng SGP miền Nam; nhận đúng fingerprint manifest LF `21c19d5beb7046408f354a9f50f8c17c0d5b2dca78b832e3c471ff17fdcc25c2`. UI live desktop/mobile đúng 331/452 dòng, 217/217 ngày tra cứu; hash/giờ/DWT mẫu khớp và K12 khu neo bị giữ ngoài tổng. Đường dẫn ứng dụng/dữ liệu K12 không đổi giữa bản live 6c75d59 và bản CI 6ec498c. [Receipt đầy đủ](catalog-review/sgp-k12-integration-20261031.json).

121 dòng chưa đủ điều kiện và 43 điều chuyển tiếp tục giữ riêng. Không nghiệm thu HCM cloud, schedule refresh hoặc production bằng kết quả này; dữ liệu vẫn là kế hoạch công bố đến 28/10/2026, không xác nhận thực hiện. Phạm vi tra cứu ban đầu đã hoàn tất; phần chưa khớp cần bằng chứng khác theo từng movement, không mở alias K12 toàn cục.
