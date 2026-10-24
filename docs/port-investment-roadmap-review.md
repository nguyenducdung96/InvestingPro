# Đề xuất đổi lộ trình ngành cảng: từ mã cổ phiếu đến tín hiệu hoạt động

> **Tiến độ mới nhất 24/10/2026:** PHP, DVP, VGR, VSC, GMD tại Hải Phòng, HAH, DXP và PSP đã được người dùng chấp nhận. Theo yêu cầu tiếp theo, [CQN](cqn-plans-staging.md) đã có dashboard trên staging, API/UI và manual refresh đạt. CQN dùng kế hoạch cập/rời cầu 1/5/6/7 Cái Lân, gồm điều chuyển nội cảng; không so trực tiếp với lượt vào/rời toàn cảng. Bến tạm/khu neo chưa phủ, 77 ngày nguồn thiếu và ba nhóm cần đối chiếu được giữ rõ. Các đoạn tiến độ cũ bên dưới là lịch sử.

> **Trạng thái 24/10/2026 — PHP đã được người dùng review và chấp nhận trên staging.** Đã hoàn thành phạm vi sản phẩm pilot Slice 2A/2B: dashboard tổng quan mặc định bốn bến, chọn từng bến, lượt/DWT theo lịch công bố, tháng/quý/YoY/YTD, drilldown ngày, sản lượng riêng/gộp và giao diện công khai đã rút gọn. [Nghiệm thu PHP](php-four-berths-staging.md). Slice 2C: backfill, chạy lặp và kiểm chứng live đạt; còn xác nhận đủ hai chu kỳ cron của phiên bản bốn bến. Production chưa nghiệm thu. Slice 3 đã triển khai dashboard lịch DVP trên staging ngày 24/10: 661 ngày, API/UI live và manual refresh đạt; xem [DVP](dvp-plans-staging.md). Còn hai chu kỳ cron DVP và sản lượng DVP; các mã CDN/GMD chưa triển khai dashboard tương đương. Không coi toàn ngành đã hoàn thành.

Ngày: 21/10/2026. Trạng thái: **ĐÃ ĐƯỢC NGƯỜI DÙNG REVIEW VÀ ĐỒNG Ý**. Bắt đầu thực hiện Slice 2A với PHP theo yêu cầu ngày 21/10/2026; các bước 2B/2C theo gate dữ liệu, không suy ra đã nghiệm thu hoặc đã deploy.

## 1. Quyết định sản phẩm cần review

Đổi đơn vị hoàn thành từ “connector/khu vực đã lấy được dữ liệu” sang “nhà đầu tư mở một mã và hiểu các bến liên quan đang tăng hay giảm”. Giữ nền tảng đã làm, nhưng đưa dashboard doanh nghiệp, tổng hợp tháng/quý/lũy kế và so sánh cùng kỳ vào cùng Slice 2. Không tiếp tục mở rộng nguồn toàn quốc như điều kiện phải xong trước dashboard.

Đích đầu tiên: trong khoảng 60 giây người dùng trả lời được:

1. Mã này liên quan cảng/bến nào, sở hữu trực tiếp/gián tiếp hay chỉ vận hành, theo tài liệu kỳ nào?
2. Bến nào tăng/giảm lượt tàu và tổng DWT, tháng/quý/lũy kế so với cùng kỳ?
3. Tăng do nhiều lượt hơn hay tàu có DWT lớn hơn?
4. Hãng tàu nào xuất hiện nhiều, cơ cấu thay đổi thế nào nếu có dữ liệu đáng tin?
5. Số liệu cập nhật đến đâu, phạm vi nào còn thiếu và có so sánh được không?

Đây là chỉ báo hỗ trợ nghiên cứu, không phải mô hình tự dự báo lợi nhuận.

## 2. Đối chiếu website tham khảo và hiện trạng

Tham khảo: https://dulieucangbien.com/ và 17 ảnh người dùng cung cấp (có ảnh trùng). Truy cập trực tiếp ngày 21/10/2026 trả 403; nhận xét tính năng dưới đây dựa trên ảnh. Không xác minh số liệu, sở hữu, tuyến hay hãng tàu trong ảnh; không đề xuất sao chép dữ liệu hoặc vượt quyền truy cập website.

Điểm nên học: danh sách mã rõ ràng; trang mã có các bến liên quan; chọn bến để xem DWT/lượt tàu; đổi tháng/quý; so sánh hai năm và dòng lũy kế; hãng tàu thể hiện bằng biểu đồ; nhật ký ngày ở dưới để kiểm tra. Luồng này gần câu hỏi đầu tư hơn một danh sách nguồn hàng hải.

Điểm cần làm tốt hơn: nhãn và đơn vị phải khớp (biểu đồ DWT không ghi “lượt tàu”); ghi rõ DWT tính ở chiều nào; tăng trưởng bến mới có nền thấp phải thấy ngày vận hành và kỳ có thể so sánh; tách dữ liệu theo bến khỏi cảng vụ; phân biệt operator, hãng khai thác, đại lý và tên thương hiệu trên tàu. Không mặc định một lần tàu xuất hiện chứng minh một tuyến dịch vụ hay khách hàng hợp đồng.

Hiện trạng kiểm tra từ repo, không phải xác nhận production:

- `docs/architecture_plan.md` mục 22.11 đang tách Slice 2 thu thập, Slice 3 tổng hợp, Slice 4 hãng/tuyến, Slice 5 tài chính. Góc nhìn mã có thể bị đẩy quá muộn.
- `docs/slice2-investment-data-scope.md` còn yêu cầu tất cả cảng trong nghiệm thu; điều này tạo đường mở rộng nguồn gần như không có điểm dừng trước khi có sản phẩm đầu tư.
- Đã có catalog, danh mục mã, hồ sơ quan hệ theo báo cáo, parser, lịch sử/revision, chống trùng, metadata và phân loại snapshot/sự kiện. Tái sử dụng các phần này.
- Trang `/industries/ports/companies` đã có danh mục; `/industries/ports/calls` phục vụ tra cứu hoạt động. Chưa có bằng chứng trong lần rà soát này rằng dashboard mã → chuỗi bến → YoY đã được nghiệm thu.
- `company-portfolios.reviewed.json` tự ghi `research_only`, không phải chứng nhận sở hữu hiện hành. Không đưa mọi quan hệ nghiên cứu lên thành mapping đã xác minh.
- Parser Đà Nẵng hiện lấy tối đa ba tháng mỗi lần và ghi DWT null; có lịch đến/rời không đồng nghĩa đã có chuỗi DWT đủ YoY. Bộ chọn tháng của nguồn dựa ATD; không coi đó là lịch đến đầy đủ của tháng.
- Các biên nhận cũ là bằng chứng theo thời điểm; cần đo lại độ phủ trước khi chọn pilot, không lấy số connector/snapshot làm thước đo thành công.

## 3. Luồng màn hình tối thiểu

**Trang ngành:** bảng mã, tên doanh nghiệp, các bến liên quan, kỳ mới nhất, trạng thái số liệu. Khi đủ điều kiện mới có lượt/DWT/YoY. Chọn mã đi thẳng vào dashboard. Bản đồ và xếp hạng cảng vụ là trang phụ.

**Trang mã:** tóm tắt quan hệ tài sản có nguồn/kỳ báo cáo; chọn từng bến hoặc tập bến đủ điều kiện. Mặc định mở bến có chuỗi hữu ích nhất và nói rõ phạm vi. Không dùng tổng toàn cảng vụ thay cho hoạt động của doanh nghiệp.

**Khối số liệu chính:** lượt tàu, tổng DWT đã ghi nhận, DWT bình quân trên lượt có DWT, YoY kỳ và YTD. Bộ chọn tháng/quý/năm, năm so sánh, chiều vào/ra; tháng hiện tại ghi “đang tích lũy”. Biểu đồ hai năm, bảng số liệu và dòng lũy kế cùng phạm vi nằm gần nhau.

**Khối hãng tàu:** top hãng và tỷ trọng trên lượt đã nhận dạng được; công bố mẫu số chưa nhận dạng. Chỉ hiển thị khi đủ căn cứ, nếu thiếu ghi rõ thiếu; không chặn số liệu hoạt động.

**Kiểm chứng:** bấm cột biểu đồ mở danh sách sự kiện đã tạo ra con số; xem nguồn và chất lượng khi cần. Nhật ký ngày là drilldown, không chiếm màn hình đầu. Bảng có phương án mobile, keyboard focus, nhãn/đơn vị đọc được và không chỉ dùng màu để thể hiện tăng giảm.

## 4. Các slice đề xuất thay thế

### Slice 1 — giữ nền danh mục, chỉ bổ sung mapping cần cho pilot

Giữ nguyên ý nghĩa quan hệ theo báo cáo và quan hệ hiệu lực đã xác minh. Bổ sung đúng đường nối mã → pháp nhân → tài sản/bến → tên bến trong nguồn hoạt động cho pilot. Không tái nghiên cứu toàn bộ ngành như điều kiện bắt đầu Slice 2.

Exit: với mỗi bến pilot có mã định danh và bằng chứng mapping; role, tỷ lệ nếu có, kỳ báo cáo hoặc khoảng hiệu lực được phân biệt. Quan hệ chưa duyệt hiện trạng nghiên cứu riêng, không đi vào KPI doanh nghiệp.

### Slice 2 — dashboard đầu tư dùng được cho pilot

Gộp nền sự kiện hiện tại + phần tháng/quý/YTD/YoY của Slice 3 cũ + lối vào theo mã của Slice 5 cũ. Đây là slice tiếp theo cần làm sau review.

- **2A: chứng minh dữ liệu.** Đo tối đa ba ứng viên bến, kiểm tra tên nguồn/mapping, lịch sử, DWT, quyền sử dụng, quy tắc đếm và khả năng refresh. Đề xuất khảo sát PHP/DVP ở Hải Phòng, GMD ở các bến liên quan, CDN tại Tiên Sa; đây là danh sách nghiên cứu, chưa xác nhận sở hữu hay độ phủ. Chọn một mã và một hoặc hai bến có bằng chứng tốt nhất, không chọn vì tên nổi bật.
- **2B: một luồng hoàn chỉnh.** Dựng dashboard mã/bến, tổng hợp kỳ, so sánh, drilldown và nguồn cho đúng pilot. Không thêm hàng loạt connector trước khi luồng này qua nghiệm thu.
- **2C: vận hành.** Refresh định kỳ theo nhịp nguồn (mục tiêu hằng ngày khi nguồn cho phép), readback, xử lý bản sửa, stale/error, kiểm thử quyền public/admin và đối chiếu đầu-cuối.

Exit: một mã có dashboard hoạt động thật, tháng/quý/YTD, lượt tàu và DWT có mức thiếu rõ, YoY ở kỳ đủ điều kiện, drilldown khớp nguồn và refresh thực chạy. Hãng tàu là phần bổ sung có điều kiện, không giả dữ liệu để đủ giao diện.

### Slice 3 — mở rộng danh mục mã và so sánh bến

Nhân bản luồng đã nghiệm thu sang các mã còn lại, từng đợt có danh sách mã/bến chốt trước. Giữ mục tiêu dài hạn phủ ngành cảng Việt Nam, nhưng không để yêu cầu toàn quốc chặn pilot. Mỗi mã có trạng thái: chỉ danh mục / có hoạt động một phần / đủ so sánh; công bố số bến đủ dữ liệu trên tổng bến thuộc phạm vi đã duyệt.

Bổ sung so sánh nhóm bến và cơ cấu hãng theo kỳ nếu dữ liệu có căn cứ. Xếp hạng chỉ trên tập bến đủ điều kiện, cùng định nghĩa và kỳ; không gọi là thị phần toàn thị trường khi chưa đo đủ mẫu số. Exit: toàn bộ danh sách mã/bến của đợt có trạng thái minh bạch, không âm thầm bỏ mã thiếu dữ liệu.

### Slice 4 — hãng tàu và bối cảnh kinh doanh

Chuẩn hóa hãng/operator/đại lý theo thời gian, tuyến dịch vụ có nguồn, thay đổi cơ cấu, công suất và sự kiện mở bến. Cảnh báo mới xuất hiện/vắng mặt phải ghi “trong dữ liệu quan sát”, không kết luận mất khách hay chuyển cảng. Khung giá chỉ thêm khi trả lời câu hỏi cụ thể, có hiệu lực và đơn vị rõ; không dùng làm giá thực thu. Bản đồ tuyến/3D không thuộc điều kiện hoàn thành.

Exit: phân tích hãng/tuyến và sự kiện kiểm chứng được ở các bến đã chọn, có tỷ lệ chưa nhận dạng; không suy tuyến từ một cảng đến trước.

### Slice 5 — tài chính và hoàn thiện ngành đầu tiên

Đặt doanh thu, lợi nhuận gộp, biên gộp và sản lượng công bố cạnh hoạt động tàu theo kỳ, ghi rõ hợp nhất/riêng lẻ, phạm vi tài sản, đơn vị và nguồn. Bến liên doanh có thể đóng góp qua lợi nhuận liên kết thay vì doanh thu hợp nhất; không tự quy đổi DWT theo tỷ lệ sở hữu thành doanh thu/TEU.

Exit: dashboard ngành và mã trong universe đã chốt có chuỗi hoạt động, so sánh, hãng khi có dữ liệu, tài chính và nguồn; phần thiếu vẫn công bố. Định giá, mô phỏng lợi nhuận, billing và realtime chứng khoán là backlog riêng, không là điều kiện hoàn thành ngành cảng đầu tiên.

## 5. Hợp đồng chỉ tiêu cần chốt trước code

- **Đơn vị đếm:** sự kiện thực tế do nguồn báo cáo tại bến, chọn một chiều. Mặc định ưu tiên lượt rời bến nếu lịch sử ATD đầy đủ; nguồn chỉ có lượt đến dùng chỉ tiêu đến riêng. Không trộn hai chiều hoặc gộp thông báo cấp cảng với cập/rời bến. Chưa đủ căn cứ ghép port-call thì nhãn ghi “lượt rời/đến”, không khẳng định lượt ghé duy nhất.
- **DWT kỳ:** tổng DWT của các sự kiện đủ điều kiện theo đúng chiều đó, tấn DWT; một lượt đủ điều kiện chỉ tính một lần. Không cộng snapshot, GT, kế hoạch hay giấy phép. Không là khối lượng hàng thực tế/TEU. Không cộng hai nguồn cùng một lượt; chọn nguồn chính và nguồn đối chiếu có provenance.
- **Thiếu DWT:** hiển thị tổng DWT đã ghi nhận và số lượt có DWT/tổng lượt; không ước lượng phần thiếu. Tỷ lệ này không chứng minh đủ sự kiện toàn kỳ.
- **Bình quân:** tổng DWT / số lượt có DWT, không chia tổng lượt gồm dòng thiếu DWT. Mẫu số 0 trả null.
- **Kỳ:** theo ngày sự kiện tại Asia/Ho_Chi_Minh. Quý/năm tổng hợp từ cùng tập sự kiện, không cộng thêm báo cáo tháng đã có vào sự kiện gốc.
- **YoY:** (kỳ hiện tại / kỳ gốc − 1) × 100, cùng metric, chiều, nguồn/phương pháp và tập bến có thể so sánh. Kỳ gốc 0 hoặc thiếu trả không áp dụng, không vô cực. Mở thêm bến cần tách tăng trưởng toàn danh mục và tập bến tương đồng.
- **MTD/QTD/YTD:** mặc định YTD đến tháng đầy đủ gần nhất ở cả hai năm; kỳ đang tích lũy trình bày riêng. Chỉ so đến cùng ngày khi nguồn đủ chi tiết và có mức hoàn tất tương đương. Không so một phần tháng với tháng trọn.
- **Độ phủ:** tách kỳ nguồn xác nhận đầy đủ, kỳ quan sát một phần và chưa biết. Có ngày xuất hiện dòng không chứng minh ngày không có dòng là 0. Không chứng minh đủ kỳ thì không gắn nhãn YoY chuẩn; có thể cho xem số quan sát với cảnh báo và không tính % tăng trưởng.
- **Gộp doanh nghiệp:** chỉ gộp tập bến đã duyệt, không trùng tài sản qua công ty con/liên doanh. Mặc định ghi “hoạt động các bến được theo dõi”, không gọi là sản lượng quy thuộc cổ đông. Khi không có lịch sử hiệu lực, không áp quan hệ hiện tại ngược mọi năm.
- **Hãng tàu:** chỉ phân nhóm từ trường nguồn hoặc mapping có bằng chứng và hiệu lực; không tự nhận dạng bằng tiền tố tên tàu. Tỷ trọng = lượt theo hãng / lượt đủ điều kiện đã xác định hãng, kèm số chưa xác định.

## 6. Gate dữ liệu và nghiệm thu pilot

Mục tiêu pilot: chuỗi 24 tháng đầy đủ để đọc mùa vụ và YoY; tối thiểu cần một cặp kỳ tương ứng đủ điều kiện để có so sánh thật. Chuỗi ngắn hơn vẫn xem được nhưng chưa đạt mục tiêu dashboard so sánh. Không hứa backfill khi nguồn chưa chứng minh cho phép.

Trong 2A tạo một biên bản ngắn cho từng ứng viên: mã, terminal ID, alias nguồn, bằng chứng quan hệ, lịch sử tải được, sự kiện/chiều, DWT có/thiếu, kỳ hoàn tất, quyền sử dụng, refresh và chi phí. Khảo sát tối đa ba ứng viên rồi ra quyết định; không mở nghiên cứu vô hạn.

Nếu không ứng viên nào có lịch sử đủ dùng: bàn giao gap cụ thể và lựa chọn cần quyết định (nguồn chính thức khác, nguồn được cấp quyền, hoặc chấp nhận tích lũy từ nay). Dừng mở rộng connector không giúp khép gap; không lấy dữ liệu minh họa làm kết quả thật. Đổi yêu cầu “nguồn miễn phí” chỉ sau khi người dùng quyết định riêng.

Bài nghiệm thu bắt buộc:

1. Chọn mã → chọn bến → thấy đúng quan hệ, nguồn và kỳ.
2. Đối chiếu ít nhất hai tháng, một quý và một cặp cùng kỳ/YTD với danh sách sự kiện; drilldown phải tái tạo tổng chính xác.
3. Replay không tăng lượt; sửa/xóa dòng nguồn thay đúng revision và tính lại kỳ ảnh hưởng.
4. Các trường hợp thiếu ngày, thiếu DWT, kỳ gốc 0, bến mới, đổi mapping, trùng nguồn, tháng đang chạy và snapshot không tạo YoY sai.
5. Chạy refresh tự động thành công ít nhất hai chu kỳ; một lần lỗi không xóa lịch sử, UI có stale/error và thời điểm thành công cuối.
6. Kiểm tra desktop/mobile, keyboard, đơn vị/nhãn, quyền public/admin. Ghi riêng local, staging và production, không dùng kết quả local thay nghiệm thu cloud.

## 7. Công việc giữ lại, dừng và thứ tự thực hiện

Giữ catalog, source registry, raw archive, parser hữu ích, sự kiện/lịch sử/revision, chống trùng, RLS và UI kiểm chứng. Không cần thay stack hoặc viết lại hệ thống. Tầng tổng hợp phải lưu metric version, tập bến, source revision và coverage để tái dựng kết quả.

Dừng ưu tiên: bổ sung mọi Cảng vụ, vị trí AIS/tọa độ, giấy phép như màn hình chính, metadata kỹ thuật trên dashboard, bản đồ toàn quốc/3D, tuyến suy diễn, giá và mô phỏng tài chính trước khi có chuỗi hoạt động. Các nguồn cũ giữ làm tài sản dữ liệu, không tự xóa và không phải hoàn thiện tất cả để pilot xong.

Sau khi duyệt đề xuất: làm 2A → chốt pilot có bằng chứng → 2B → 2C → review dashboard thật → Slice 3. Không mở đồng thời Slice 4/5. Mỗi connector mới phải nêu nó lấp khoảng trống nào của mã/bến/metric đã chọn.

## 8. Các điểm đề nghị duyệt

- Chuyển tổng hợp tháng/quý/YTD/YoY và góc nhìn theo mã vào Slice 2.
- Nghiệm thu một mã, một hoặc hai bến trước; toàn ngành là các đợt Slice 3 có danh sách rõ, không bắt toàn quốc xong trong Slice 2.
- Ưu tiên bằng chứng lịch sử/DWT khi chọn pilot; danh sách PHP/DVP, GMD, CDN chỉ là ứng viên khảo sát.
- Giữ hãng tàu ở mức có căn cứ trong pilot, hoàn thiện ở Slice 4; tài chính ở Slice 5; map, billing và định giá để sau.

Tài liệu này đã được duyệt, thay các ranh giới sản phẩm cũ cho công việc tiếp theo. Các runbook và biên nhận hiện tại tiếp tục mô tả hệ thống đã có, không bị sửa thành kết quả nghiệm thu của kế hoạch mới.

## 9. Yêu cầu bắt buộc: dữ liệu động và cập nhật tự động

Bổ sung theo yêu cầu người dùng ngày 21/10/2026. Dashboard phải hoạt động bằng dữ liệu lấy từ Cảng vụ/cảng chính thức và lưu trong database; không hardcode giá trị KPI, chuỗi thời gian, hãng tàu hoặc % tăng trưởng trong component, seed production hay file JSON đóng gói theo lần build. Cấu hình endpoint, quy tắc parser và định nghĩa metric có thể nằm trong code; số liệu nghiệp vụ phải đi qua pipeline dữ liệu.

Luồng vận hành: lịch tự chạy → tải nguồn chính thức → lưu raw và thời điểm lấy → parse/kiểm tra → cập nhật sự kiện và revision → tính lại các kỳ bị ảnh hưởng → làm mới cache → API → biểu đồ. Không cần sửa code, build hoặc deploy để xuất hiện ngày/tháng/quý mới. Bộ chọn kỳ lấy từ dữ liệu, không là danh sách năm/tháng cố định.

- **Hằng ngày:** scheduler production kiểm tra mỗi nguồn pilot đang hoạt động ít nhất mỗi ngày theo giờ Việt Nam, kể cả khi không có người mở web. Khi nguồn có bản ghi mới hợp lệ, lần chạy thành công tiếp theo phải nhập và cập nhật dashboard. Chốt giờ chạy và ngưỡng trễ riêng từng nguồn trong 2A; báo lỗi khi quá hạn, không chỉ có nút refresh thủ công.
- **Hằng tháng:** tổng tháng hiện tại cập nhật sau mỗi lần nhập, ghi đang tích lũy. Tự tạo kỳ tháng mới; chỉ đánh dấu tháng hoàn tất khi có căn cứ đủ dữ liệu, không chỉ vì đã qua cuối tháng.
- **Hằng quý/năm:** tự tổng hợp quý/năm/YTD từ cùng tập dữ liệu đã chuẩn hóa, cập nhật sau mỗi lần nhập; không cần nhập số tổng bằng tay. Tự chuyển kỳ khi sang quý/năm mới.
- **Bản sửa và dữ liệu đến muộn:** mỗi nguồn có cửa sổ tải lại theo cách nguồn công bố; phát hiện sửa/xóa theo đúng semantics của nguồn. Tính lại tháng/quý/năm/YTD và YoY liên quan, kể cả kỳ cũ. Không coi một lần tải lỗi hay trang thiếu dữ liệu là lệnh xóa lịch sử.
- **Minh bạch độ mới:** UI hiển thị riêng “kiểm tra nguồn thành công lúc”, “dữ liệu sự kiện đến ngày” và “kỳ hoàn tất đến”. Fetch thành công nhưng nguồn chưa đăng mới không được giả là dữ liệu nghiệp vụ mới. Nguồn lỗi/chậm hiện stale hoặc lỗi, vẫn giữ số liệu gần nhất với nhãn rõ.
- **Giới hạn cam kết:** bảo đảm hệ thống tự kiểm tra và xử lý theo lịch, không bảo đảm nguồn chính thức đăng dữ liệu mới mỗi ngày. Nếu nguồn chỉ công bố theo tháng/quý, web cập nhật theo lần công bố đó; không nội suy dữ liệu ngày để tạo cảm giác realtime.

Nghiệm thu bổ sung bắt buộc cho Slice 2:

1. Quan sát ít nhất hai chu kỳ scheduler trên môi trường triển khai, có log và readback database/API/UI; không lấy chạy local hay refresh tay thay nghiệm thu tự động.
2. Bổ sung bản ghi nguồn hợp lệ trong fixture kiểm thử pipeline: KPI và biểu đồ đổi đúng mà không sửa component hoặc build lại. Kiểm tra riêng luồng tải thật khi nguồn có thay đổi để xác nhận production đầu-cuối; nếu chưa có thay đổi thật thì ghi rõ phần đó chưa nghiệm thu.
3. Kiểm tra chuyển tháng/quý/năm, nguồn sửa kỳ cũ, chạy lại không trùng, lỗi nguồn và cache hết hạn/làm mới. Kiểm thử chuyển kỳ có thể dùng thời gian giả lập, ghi riêng với nghiệm thu production.
4. Giá trị biểu đồ tái dựng được từ database và drilldown; không có fallback số liệu demo khi API lỗi hoặc kỳ trống. Mọi dữ liệu mẫu chỉ dùng test/dev và được tách khỏi production.

Đây là điều kiện hoàn thành dashboard động, không phải hạng mục tùy chọn sau khi giao diện xong. Hiện tài liệu chỉ chốt yêu cầu; chưa xác nhận hệ thống hiện có đã đạt các tiêu chí này.

## 10. Thực hiện Slice 2A — PHP

Người dùng chọn PHP, không tiếp tục so sánh ba mã ứng viên. Hồ sơ và kết quả gate tại [php-slice2a-pilot.md](php-slice2a-pilot.md). Đã kiểm chứng quan hệ và đo nguồn; ưu tiên Tân Vũ, Chùa Vẽ. Gate lịch sử actual DWT/YoY chưa đạt, không chuyển kế hoạch/snapshot thành actual để triển khai biểu đồ.


## 11. Chấp nhận PHP và bàn giao bước tiếp theo — 24/10/2026

Người dùng xác nhận “Tôi thấy ổn rùi” sau khi review tổng quan PHP mặc định. Ba finding cuối đã xử lý và deploy staging: màu tăng/giảm YoY, dòng lũy kế trong bảng so sánh, lựa chọn tổng quan bốn bến mặc định. Không còn finding giao diện PHP đã nêu đang mở. Commit chức năng cuối: `e6e36d9`; trước đó `5b7f521` cho màu/luỹ kế và `e3821cb`/`0abb15b` cho rút gọn nội dung kỹ thuật.

- **Hoàn thành và được chấp nhận:** phạm vi sản phẩm PHP pilot trên staging. Không nâng lịch điều động thành actual, tổng bốn bến thành toàn vùng Hải Phòng, hay dữ liệu vật lý thành phạm vi hạch toán doanh nghiệp.
- **Chưa khép nghiệm thu vận hành:** cần bằng chứng hai event cron thực của phiên bản bốn bến và readback. Không lấy hai manual run thay điều kiện này; tài liệu hiện chưa ghi nhận bằng chứng bổ sung. Đây là việc theo dõi vận hành song song với mở rộng, không cần sửa giao diện PHP để bắt đầu khảo sát mã tiếp theo.
- **Giới hạn dữ liệu giữ nguyên:** HTIT chưa có chuỗi sản lượng tháng trên hệ thống; số thiếu và nền so sánh thiếu giữ null. Chưa có nghiệm thu production hay hoàn thành toàn ngành.

Bước tiếp theo được đề xuất là Slice 3, đợt mở rộng đầu tiên:

1. Khảo sát **DVP** trước: đọc reference hiện có và nguồn chính thức miễn phí, chốt mã → pháp nhân → bến, alias trong lịch nguồn, khoảng lịch sử và DWT. Đây là ứng viên ưu tiên khảo sát, chưa phải xác nhận đủ dữ liệu để triển khai.
2. Đầu ra khảo sát: danh sách bến trong phạm vi, nguồn và các kỳ có thể sử dụng, trạng thái dữ liệu kế hoạch/thực tế, khả năng refresh và phần thiếu. Nếu DVP không đạt thì khảo sát CDN, rồi các bến thuộc GMD; không tạo số liệu để lấp giao diện.
3. Khi đủ dữ liệu, tái sử dụng luồng PHP: tổng quan trong phạm vi đã chốt, từng bến, tháng/quý/YoY/YTD, nhật ký ngày, cập nhật động và kiểm thử desktop/mobile.
4. Bổ sung lối vào/bảng tổng quan ngành để mở từng mã và thấy kỳ mới nhất; chỉ so sánh/xếp hạng những mã/bến có cùng định nghĩa, kỳ và độ phủ phù hợp.

Hãng tàu/tuyến và tài chính vẫn thuộc Slice 4/5, sau đợt mở rộng dashboard; không thêm bản đồ/3D như điều kiện hoàn thành PHP.

## 12. DVP — đợt mở rộng đầu tiên, 24/10/2026

Theo yêu cầu người dùng, đã triển khai [DVP trên staging](dvp-plans-staging.md), dùng alias chính xác DINH VU, toàn bến hai cầu, không chia giả số từng cầu. Lịch sử 01/01/2025–23/10/2026 đủ 661 ngày; database/API/UI live và manual workflow đã qua kiểm tra. Có tháng/quý/MTD/YTD/YoY, DWT bình quân, hai chiều riêng và drilldown động. PHP giữ phạm vi bốn bến.

Trạng thái DVP: **dashboard lịch công bố đủ so sánh trong phạm vi quan sát trên staging**; actual, sản lượng công bố, hai chu kỳ cron và production chưa nghiệm thu. Không tự nâng quyền nguồn/mapping nghiên cứu hay số lịch thành actual. Các mã còn lại vẫn theo danh sách và gate nguồn đã duyệt; CDN/GMD là ứng viên kế tiếp, chưa được coi hoàn thành.

## 13. Ưu tiên Hải Phòng: VGR / VSC — 24/10/2026

Người dùng chấp nhận DVP và chuyển ưu tiên sang hoàn thiện Hải Phòng trước CDN. Đã yêu cầu làm ngay VGR/VSC. [Hồ sơ triển khai](vsc-vgr-plans-staging.md): VGR dùng VIP Greenport; VSC dùng phạm vi bốn cảng đã đối chiếu Greenport / VIP Greenport / Nam Hải Đình Vũ / VIMC Đình Vũ. Một kho VIP dùng chung hai góc nhìn mã; không cộng trùng khi mở rộng thống kê khu vực. VIMC được ghi quan hệ cổ đông, không tự coi công ty con.

Luồng giao diện giữ chuẩn: header danh sách cảng, Tổng quan mặc định kể cả một cảng, chọn từng cảng, tháng/quý/YTD/YoY và drilldown. Phạm vi hiện tại được áp lên lịch sử hoạt động bến, không xác nhận lịch sử sở hữu hay tổng doanh thu hợp nhất. Cron hai chu kỳ và nguồn sản lượng riêng vẫn cần nghiệm thu riêng. Các mã HAH/DXP/PSP và GMD tại Hải Phòng là ứng viên kế tiếp, chưa tự triển khai trong yêu cầu VGR/VSC.

## 14. Đợt Hải Phòng tiếp theo — GMD / HAH / DXP / PSP

Ngày 24/10/2026, sau khi chấp nhận VSC/VGR, người dùng yêu cầu thực hiện tiếp kế hoạch Hải Phòng. [Hồ sơ triển khai](haiphong-expansion-staging.md): GMD chỉ phạm vi Nam Đình Vũ tại Hải Phòng; HAH–Hải An; DXP–Đoạn Xá; PSP–PTSC Đình Vũ. Giữ Tổng quan mặc định kể cả một cảng, danh sách cảng và nguồn ở đầu trang, chart kỳ và drilldown động. Chưa mở GMD toàn quốc hoặc coi miền Bắc hoàn thành.

Nguồn mỗi cảng có 661 ngày từ 01/01/2025 đến 23/10/2026. Riêng Nam Đình Vũ có sáu dòng thiếu DWT năm 2025, giữ null và không tính YoY kỳ có nền thiếu; các cảng khác trong đợt chưa thấy thiếu DWT. Các cảnh báo là độ đầy đủ của nguồn đã quan sát, không xác nhận đủ tàu thực tế.

PHP/DVP/VGR/VSC đã được người dùng chấp nhận trên staging. Bốn dashboard mới chờ review sau readback staging; nghiệm thu hai chu kỳ cron, production, actual, hãng tàu/tuyến và tài chính vẫn là các trạng thái riêng. Không dùng một job chạy tay để khép nghiệm thu cron.
