# Gemalink — lịch sử từ PDF kế hoạch Cảng vụ

## Hợp đồng dữ liệu

Nguồn là menu **Kế hoạch điều động tàu / Shifting Order** tại `https://hanghai.moc.gov.vn/tra-cuu-giay-phep`, mã Cảng vụ Vũng Tàu `12`, không phải menu giấy phép rời cảng. Truy vấn danh sách từ 01/12/2024 đến 31/08/2025 để có biên ngày công bố hai bên giai đoạn kế hoạch 01/01–31/07/2025. Không dùng ngày ở danh sách thay ngày giờ trong dòng PDF.

Đã kiểm tra mã cảng `VNDQG` (Cảng quốc tế Gemadept) trong danh mục công khai nhưng bộ lọc lịch sử theo mã này trả rỗng. Vì vậy collector đọc đầy đủ danh sách Vũng Tàu, kiểm tra pagination và bộ lọc được giữ, rồi nhận diện Gemalink từ trường **Từ/Đến** trong PDF. Không gán bến theo tên đại lý Gemadept hoặc tên hãng tàu.

PDF được lưu theo SHA-256. Hai URL khác nhau có thể trả cùng bytes; chỉ giữ một tài liệu khi parse. Ô tên cảng thiếu đường kẻ được đọc bằng vị trí cột, không lấy nhầm đại lý. Mẫu giờ `0830 LT` được đọc là 08:30 đúng ngày ghi trong ô; không điền giờ từ ngày tra cứu. DWT chỉ lấy từ cột có tiêu đề DWT, giữ độ chính xác nguồn; không lấy GT, LOA hoặc lượng hàng. Giá trị không đọc được giữ null.

Các bản kế hoạch cùng hồ sơ/tàu/chiều được đối chiếu thời điểm ký trong PDF; chỉ dùng bản muộn hơn khi thứ tự rõ ràng, lưu bản bị thay thế trong ledger. Xung đột cùng thời điểm ký hoặc thiếu bằng chứng thứ tự được cách ly để xem lại. Sau đó loại trùng theo ngày kế hoạch, giờ, tàu và chiều. Loại phần trùng ngày/tàu/chiều với lịch TP.HCM, kể cả khi hai nguồn dùng đồng hồ khác nhau. Chuyển giữa vị trí trong cùng khu vực cảng không cộng vào chỉ tiêu trực tiếp.

Độ phủ được ghi riêng theo chiều. Nguồn đã đọc cho thấy chủ yếu kế hoạch tàu vào; không suy tàu rời từ tàu vào hoặc giấy phép rời cảng. Không chứng nhận full scope hoặc actual. Giữ số ghi nhận, raw DWT, PDF/hash, trang/dòng và ngày ký riêng.

## Thu thập và tái lập

Sử dụng Python 3.12+ và các phiên bản thư viện trong `scripts/requirements-gemalink-national.txt`. Bộ Python đi kèm Codex ở máy phát triển đã có các phiên bản này.

```powershell
python -m pip install -r scripts/requirements-gemalink-national.txt
python scripts/collect-gemalink-national.py --from 2024-12-01 --through 2025-08-31 --workers 6
python scripts/export-gemalink-national.py
python scripts/test-gemalink-national.py
```

Collector dùng tối đa sáu luồng đọc, thử lại có giới hạn và cache hợp lệ theo hash. Các phiên/CSRF URL chỉ ở bộ nhớ; manifest giữ URL đọc công khai không có session/token. Nguồn có bản ghi AAAA không kết nối được tại máy phát triển, gây chờ khoảng 20 giây trước mỗi lần chuyển sang IPv4. Collector giải DNS A bình thường và kết nối IPv4, vẫn giữ hostname/SNI và kiểm chứng chứng chỉ HTTPS. Không ghim IP hoặc tắt TLS.

Raw và cache ở `.local/gemalink-national/`: `listings/`, `documents/`, `pdf/`, `parsed/`, `receipt.json`, `review.json`. Có thể chạy tiếp sau lỗi. Export yêu cầu đủ listing và download, hash đúng, không còn dòng Gemalink chưa xử lý. Không ghi dữ liệu HCM, PDN hoặc Bình Dương.

Nguồn này được xuất thành module và nhật ký tháng riêng. Web/API ghép vào Gemalink sau khi loại trùng; workflow refresh HCM không ghi đè phần bổ sung. Chưa tạo hoặc nghiệm thu cron cho nguồn quốc gia trong công việc này.

## Kiểm chứng và phát hành

Kết quả edition 29/10/2026: 7.845 hồ sơ tải thành công, 7.683 PDF khác hash, 162 bản trùng. Bổ sung 326 dòng tàu vào tháng 1–7/2025; loại ba bản bị thay thế và một dòng giao lịch HCM. Không còn Gemalink trong hàng đợi cách ly. Không có dòng tàu rời đủ căn cứ trong phần bổ sung; chiều rời vẫn giữ lịch HCM sẵn có. Mặc định web Gemalink chuyển sang tàu vào; API mặc định giữ tàu rời để tương thích.

Đã đối chiếu toàn bộ tháng/journal/ledger: 178 Vitest, 10 Python, lint, typecheck và E2E miền Nam desktop/mobile đạt. Cùng input xuất lại byte-identical. Một bài test ban đầu coi hash chỉ có một URL đã được sửa thành kiểm tra cặp hash/URL vì nguồn có nhiều URL cùng bytes. Export yêu cầu raw HCM từng ngày giai đoạn giao nhau khớp hash edition đã công bố, tránh bỏ bước loại trùng trên máy thiếu archive. Bộ fixture bao gồm PDF 12 cột có GRT và DWT riêng, trang trống và dòng tiếp trang.

Fixture PDF gốc trong `tests/fixtures/gemalink-national/` kiểm tra ngày kế hoạch khác ngày ban hành, ô mất đường kẻ, giờ LT, DWT có đơn vị và dòng lặp ở trang tiếp theo. Python kiểm tra thứ tự bản sửa, xung đột DWT và hợp đồng danh sách. Vitest đối chiếu tất cả tháng với nhật ký/ledger và phép ghép hai nguồn; E2E kiểm tra tàu vào năm 2025, bộ lọc tàu rời và liên kết bằng chứng PDF trên desktop/mobile.

`node scripts/verify-gemalink-backfill-live.mjs` đối chiếu edition nguồn quốc gia, tất cả tháng hai chiều, strict null và mẫu CMA CGM VISBY 29/06/2025. `verify-south-live.mjs` tiếp tục đối chiếu miền Nam với tổng đã bổ sung. Chỉ receipt thành công mới chứng nhận staging readback, không thay nghiệm thu cron hoặc hoạt động tàu thực tế.
