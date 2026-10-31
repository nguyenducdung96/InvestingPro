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

Chọn **291 dòng**: **152 vào / DWT 1.985.936** và **139 rời / DWT 1.839.204**, không thiếu DWT trong tập được chọn. 167 dòng năm 2025 và 124 dòng năm 2026. Đây là tổng trọng tải trên dòng kế hoạch, không phải sản lượng hàng hoặc số tàu duy nhất.

**161 dòng trực tiếp giữ ngoài SGP**: 148 chưa có đăng ký khớp chính xác, 9 khác bến đăng ký, 3 khác vai trò giờ vùng cảng/giờ vào cầu và 1 có nhiều đăng ký xung đột. 43 điều chuyển vẫn riêng. Đã lưu 193/217 ngày đăng ký ứng viên; 24 ngày chưa tải không được diễn giải là không có hoạt động. Sau khi nguồn yêu cầu nghỉ 15 phút, đã dừng đủ thời gian rồi tải thêm hai batch giới hạn 80 và 15 ngày, không tiếp tục tải vượt quota để ép hoàn tất phạm vi.

Audit độc lập kiểm tra từng hash raw API và bản ghi đúng chỉ số trong manifest, đối chiếu raw/DWT/giờ với bảng kế hoạch, không chuyển DWT từ bản đồ. Bảo toàn giá trị và thứ tự **10.803 dòng đã phát hành**; không có khóa ngày/chiều/tên tàu/giờ trùng với SGP đã theo dõi hoặc trùng giữa các ứng viên K12. Các nguồn riêng Bình Dương/PDN/Long Bình/Gemalink national không thay đổi.

Local: 16 kiểm tra Python về nhận diện/cooldown/gate đạt; E2E desktop/mobile tập trung 6/6 đạt, gồm bằng chứng K12 và tổng SGP theo tháng/quý hai chiều; lint/typecheck đạt. Một lần Vitest chạy đồng thời với E2E làm hook PGlite của registry quá 10 giây; chạy lại không có E2E đồng thời: **45 files / 188 kiểm tra đạt**, không sửa timeout hoặc mã ứng dụng theo lỗi tải máy.

Verifier staging nay kiểm tra cả SHA manifest phạm vi, vì thời điểm thu thập bảng ngày không đổi khi chỉ bổ sung quyết định đối chiếu. Bản cũ cùng timestamp không được nhận nhầm là edition mới. [Receipt tích hợp](catalog-review/sgp-k12-integration-20261031.json). Biên bản CI/staging sẽ bổ sung sau deploy; chưa nghiệm thu HCM cloud, schedule refresh hoặc production.
