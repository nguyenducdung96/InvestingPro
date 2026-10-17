# Slice 2 — dữ liệu hoạt động tàu phục vụ phân tích đầu tư

Điều chỉnh theo yêu cầu người dùng ngày 17/10/2026. Đây là mục tiêu và tiêu chí
nghiệm thu hiện hành, thay các ưu tiên cũ thiên về vị trí tàu hoặc giấy phép.
Không thay đổi dữ liệu đang chạy chỉ bằng việc sửa tài liệu.

## Mục tiêu

Tạo dữ liệu lịch sử tàu vào/ra theo cảng, trọng tải và thời gian, có thể cập nhật
và tổng hợp nhất quán cho các phase tiếp theo. Nhà đầu tư cần quan sát mức độ
hoạt động và biến động theo thời gian của cảng/bến liên quan doanh nghiệp.

Ưu tiên khả năng lập bảng số liệu đúng và so sánh được. Không đặt mục tiêu xây
hệ thống điều hành hàng hải, bản đồ AIS hay quản lý thủ tục cấp phép.

## Đầu ra bắt buộc

1. **Bảng sự kiện tàu vào/ra theo ngày**, lọc cảng/khu vực và khoảng thời gian.
   Thể hiện tên tàu, vào hay ra, thời gian, DWT khi nguồn có và loại dữ kiện.
2. **Dữ liệu lịch sử lưu bền vững**, chống trùng và cập nhật được; refresh không
   cộng lại bảng cũ hoặc xóa lịch sử đã thu thập. Xuất dữ liệu qua API để Slice 3
   có thể lập bảng theo ngày/tháng/quý/năm mà không phải thu thập lại từ đầu.
3. **Tổng quan lượt tàu cơ bản** theo ngày/tháng cùng số ngày có dữ liệu. Đếm
   lượt vào và lượt ra riêng; không cộng hai sự kiện thành hai lượt ghé của một tàu.
4. **Chất lượng dữ liệu dễ hiểu:** kỳ có dữ liệu, thời điểm cập nhật, ngày thiếu,
   tỷ lệ có DWT và nguồn gốc xem khi cần. Nhà đầu tư không phải đọc hash, parser,
   tọa độ hoặc giấy phép để hiểu bảng chính.

## Dữ liệu tối thiểu cho mỗi sự kiện

- Cảng hoặc khu vực nguồn; bến/cầu nếu có và hữu ích để phân biệt tài sản.
  Liên kết danh mục chuẩn khi đã đối chiếu; giữ tên/mã nguồn nếu chưa xác minh.
- Tên tàu; IMO/định danh nguồn nếu có. Không bắt buộc có IMO mới lưu được dữ liệu,
  không tự gộp các tàu trùng tên hoặc ghép lượt vào/ra thiếu căn cứ.
- Chiều sự kiện: vào hoặc ra.
- Thời gian sự kiện và độ chính xác ngày/giờ; lưu thời điểm lấy dữ liệu riêng.
  Nguồn chỉ có ngày thì giữ mức ngày, không tự tạo giờ 00:00 hoặc năm chưa biết.
- DWT, đơn vị tấn, nếu nguồn có. Thiếu thì để null, không phải 0. GT là dung tích,
  phải giữ riêng; không thay DWT bằng GT hoặc biến DWT thành lượng hàng/TEU thực tế.
- Phân loại căn cứ: sự kiện do nguồn báo cáo, kế hoạch, vị trí quan sát hoặc giấy
  phép. Chỉ dữ kiện phù hợp mới được đưa vào bảng/đếm sự kiện vào/ra tương ứng.
- Khóa chống trùng, nguồn và lịch sử chỉnh sửa phục vụ kiểm tra ở tầng dữ liệu.

## Những gì không phải yêu cầu nghiệm thu bắt buộc

- Tọa độ, đường đi, tốc độ, bản đồ, theo dõi vị trí thời gian thực hoặc AIS.
- Chi tiết neo/cầu/phao khi không giúp phân biệt cảng/bến cần phân tích.
- Số giấy phép, nội dung hồ sơ thủ tục và giao diện tra cứu giấy phép.
- Thông tin kỹ thuật tàu ngoài các trường phục vụ đếm, trọng tải và nhận dạng.
- Ghép hoàn chỉnh mọi lượt vào với lượt ra hoặc xác định thời gian lưu cảng khi
  nguồn không cung cấp đủ căn cứ.

Thông tin trên có thể giữ như nguồn hỗ trợ, không được trở thành việc phải làm
xong trước khi cung cấp dữ liệu hoạt động có ích. Giấy phép là một cách lấy dữ
liệu nếu hữu ích, không phải mục tiêu sản phẩm và không là dependency bắt buộc.

## Phạm vi nguồn và độ phủ

Tiếp tục dùng nguồn công khai miễn phí: Cảng vụ, trang chính thức của cảng và API
công khai có sẵn. Chọn nguồn theo khả năng cung cấp vào/ra, thời gian và DWT,
không theo việc nguồn có API, giấy phép hay nhiều trường kỹ thuật nhất.

Yêu cầu mở rộng tất cả cảng vẫn được giữ; điều chỉnh này không tự thu hẹp phạm vi
địa lý. Ưu tiên đóng khoảng trống tại Hải Phòng, TP.HCM và Cái Mép–Thị Vải trước,
sau đó hoàn thiện các khu vực còn lại theo ma trận độ phủ cảng/bến đã đối chiếu.
Không coi số connector, số dòng vị trí hoặc số tên Cảng vụ là số cảng đã hoàn thành.
Khu vực thiếu nguồn phải được nêu rõ, không âm thầm loại khỏi mẫu số toàn quốc.

Bảng vị trí hiện có là dữ liệu bổ trợ. Ngày đến có trong bảng vị trí có thể hỗ trợ
nghiên cứu một sự kiện, nhưng không chứng minh đã thu thập đủ lịch sử vào cảng;
tàu biến mất khỏi bảng không tự tạo sự kiện ra cảng. Giấy phép hoặc kế hoạch không
tự biến thành sự kiện thực tế chỉ vì ngày hiệu lực/dự kiến đã qua.

## Tiêu chí hoàn thành Slice 2 đã điều chỉnh

- Có dữ liệu vào/ra, thời gian và DWT khi nguồn cung cấp; trường thiếu thể hiện rõ.
- Lịch sử có cửa sổ thời gian và độ phủ được công bố; tích lũy thêm qua refresh.
  Không hứa backfill toàn bộ lịch sử khi nguồn không cho phép.
- Bảng ngày và tổng quan lượt tàu phản ánh đúng loại dữ kiện; thiếu ngày không là 0.
- API cung cấp sự kiện và metadata chất lượng để phase sau tổng hợp lại nhất quán;
  chống trùng có kiểm thử, bản sửa nguồn không nhân số lượt hoặc mất lịch sử.
- Refresh và trạng thái lần chạy đủ để biết dữ liệu mới, cũ hay đang lỗi. Nếu có
  lịch tự chạy thì phải nghiệm thu thực tế; có nút refresh không chứng minh tự động.
- Đối chiếu số dòng, thời gian và DWT với nguồn thực trên các khu vực trong phạm vi.
- Với mục tiêu tất cả cảng: còn khu vực chưa có dữ liệu vào/ra cần thiết thì vẫn
  ghi chưa hoàn thành; muốn chốt một phạm vi hẹp hơn phải có quyết định riêng.

## Bàn giao sang các phase sau

Slice 2 bàn giao dữ liệu sự kiện sạch và metadata về độ phủ. Slice 3 xây tổng DWT,
trọng tải bình quân, bảng kỳ, so sánh YoY và xếp hạng trên các kỳ đủ điều kiện;
không cộng DWT lặp lại qua các ảnh chụp vị trí. Tổng DWT sự kiện chỉ là chỉ báo
hoạt động/trọng tải tàu, không phải sản lượng hàng thực tế hoặc doanh thu.

Các phase doanh nghiệp sau liên kết dữ liệu với cảng/bến thuộc doanh nghiệp đã
xác minh và đối chiếu tài chính. Slice 2 không tự suy ra sở hữu cảng, doanh thu,
lợi nhuận hay khuyến nghị đầu tư từ số tàu/DWT.
