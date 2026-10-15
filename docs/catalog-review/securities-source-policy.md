# Nguồn chứng khoán để hoàn thiện catalog Slice 1

Rà soát ngày 15/10/2026 (Asia/Ho_Chi_Minh). Người dùng yêu cầu ưu tiên sở giao dịch, website doanh nghiệp và các nguồn chuyên cho đầu tư chứng khoán; không dùng báo không chính thống. Tài liệu này ghi nhận vai trò nguồn đã tra cứu, không cấp phép nguồn, tạo connector hoặc công bố quan hệ mới.

## 1. Nguồn gốc dùng để xét duyệt

### HOSE, HNX và UPCoM

- [HOSE – Tin tổ chức niêm yết](https://www1.hsx.vn/vi/tin-tuc/tin-to-chuc-niem-yet).
- [HNX – Công bố thông tin niêm yết](https://www.hnx.vn/vi-vn/thong-tin-cong-bo-ny-hnx.html).
- [HNX – Công bố thông tin UPCoM](https://www.upcom.hnx.vn/vi-vn/thong-tin-cong-bo-up-hnx.html).
- [HNX – Danh sách chứng khoán niêm yết](https://www.hnx.vn/vi-vn/cophieu-etfs/chung-khoan-ny.html).

Dùng hồ sơ chứng khoán và quyết định/thông báo của Sở để đối chiếu mã, thị trường, tên tổ chức phát hành, ngày giao dịch đầu tiên, chuyển sàn, hủy niêm yết hoặc hủy đăng ký giao dịch. Phân biệt ngày quyết định với ngày giao dịch; UPCoM là đăng ký giao dịch, không gán nhãn niêm yết HOSE/HNX. Hồ sơ HNX/UPCoM của 11 mã đã được đọc trực tiếp ở đợt trước; lần này đã tìm thấy trang công bố UPCoM có bộ lọc mã và file đính kèm. HOSE trả trang yêu cầu JavaScript trong công cụ web; không coi nội dung hồ sơ cụ thể đã đọc thành công chỉ từ kết quả tìm kiếm.

### UBCKNN và VSDC

- [UBCKNN – Hệ thống công bố thông tin](https://congbothongtin.ssc.gov.vn/).
- [VSDC – Cấp mã chứng khoán](https://www.vsd.vn/sd/RKzwu9SD1frZYxwlm1jIRA).
- [VSDC – Trang chính](https://www.vsd.vn/).

UBCKNN bổ sung đối chiếu công ty đại chúng và hồ sơ công bố. VSDC bổ sung mã chứng khoán, ISIN, đăng ký và thay đổi thông tin chứng khoán. Kết quả tìm kiếm từ VSDC mô tả việc công bố mã/ISIN, nhưng lần mở trực tiếp bài cấp mã bị lỗi; chưa xác minh parser/API hay hồ sơ mã cụ thể trong đợt này. Đăng ký tại VSDC không tự chứng minh chứng khoán đang niêm yết hoặc giao dịch trên một Sở. Nội dung chi tiết cổng UBCKNN chưa trích xuất được bằng công cụ web trong lần rà soát này.

### Website quan hệ cổ đông của doanh nghiệp

- [Gemadept – Cổ đông](https://www.gemadept.com.vn/co-dong/).
- [Gemadept – Báo cáo thường niên](https://www.gemadept.com.vn/co-dong/bao-cao-thuong-nien/).
- [Gemadept – Báo cáo tài chính](https://www.gemadept.com.vn/en/shareholders/financial-statements/).

Đã quan sát các nhóm báo cáo thường niên, BCTC, bản tin IR và công bố mới. Với từng mã, lấy báo cáo thường niên để nhận diện hệ thống cảng; dùng thuyết minh BCTC hợp nhất và báo cáo quản trị để xác minh pháp nhân, công ty con/liên kết, tỷ lệ và kỳ quan sát. Tìm nghị quyết/công bố thay đổi sau kỳ báo cáo để xử lý mua bán, góp vốn, đổi tên hoặc tái cơ cấu. Đọc cả phần BCTC riêng khi cần phân biệt đầu tư trực tiếp của công ty mẹ với tỷ lệ ở cấp tập đoàn. Không tự coi toàn bộ báo cáo thường niên là nội dung đã được kiểm toán.

Trang dịch vụ/danh mục cảng của doanh nghiệp hoặc đơn vị khai thác giúp nối pháp nhân với tài sản vật lý. Đối chiếu tiếp quyết định/danh mục của cơ quan hàng hải, đường thủy và cảng vụ để xác định đúng cảng, bến, cầu cảng. Một pháp nhân có thể sở hữu nhiều tài sản; một bến có thể có nhiều đơn vị khai thác ở các cầu khác nhau.

### FPTS EzIR

- [EzIR – Cổng tra cứu](https://ezir.fpts.com.vn/).
- [EzIR – Hồ sơ QNP](https://ezir.fpts.com.vn/thongtindoanhnghiepclient/QNP).

Trang EzIR giới thiệu tra cứu và dịch vụ quan hệ nhà đầu tư; URL hồ sơ QNP đã mở nhưng nội dung chi tiết phụ thuộc JavaScript. Website QNP đã được đối chiếu liên kết tới nền tảng này ở đợt trước. Chỉ coi một file ở EzIR là tài liệu gốc do doanh nghiệp công bố khi kiểm tra được đơn vị phát hành, nội dung tài liệu và liên kết công bố chính thức; tên miền công ty chứng khoán không tự làm mọi dữ liệu trên nền tảng thành công bố gốc của doanh nghiệp. Lưu cả đơn vị phát hành và nơi lưu file.

## 2. Nguồn chuyên ngành để tìm đầu mối và kiểm tra chéo

### CafeF và VietstockFinance

- [CafeF – GMD, công ty con và liên kết](https://cafef.vn/du-lieu/gmd/cong-ty-con.chn).
- [VietstockFinance – GMD, hồ sơ doanh nghiệp](https://finance.vietstock.vn/GMD/ho-so-doanh-nghiep.htm).

Đã đọc trang CafeF có mục công ty con/liên kết và liên kết công bố; Vietstock có hồ sơ, công ty con/liên doanh/liên kết, lịch sử niêm yết và tài liệu cổ đông. Một số trường Vietstock bị che theo quyền tài khoản; không suy ra giá trị bị che hoặc tìm cách vượt giới hạn. URL CafeF dạng cũ thử ban đầu không đọc được; URL công ty con nêu trên đã đọc thành công.

Dùng để phát hiện mã còn thiếu, tên pháp nhân/alias, đầu mối sở hữu và tài liệu cần tìm. Sau đó truy về báo cáo hoặc quyết định gốc ở Sở/doanh nghiệp. Dữ liệu tổng hợp có thể trộn mốc lịch sử với trạng thái hiện tại; không sao chép cả bảng sở hữu vào app hoặc xem nhãn công ty con là bằng chứng về quyền đối với tài sản vật lý. File doanh nghiệp được lưu lại trên website tổng hợp vẫn phải xác minh người phát hành và phiên bản; ưu tiên lấy bản từ nguồn công bố chính thức.

### SSI Research

- [SSI – Báo cáo công ty, lọc GMD](https://www.ssi.com.vn/khach-hang-ca-nhan/bao-cao-cong-ty?keyword=GMD&page=1).

Đã tìm thấy báo cáo GMD trên chính website SSI; lần đọc lại một truy vấn bị timeout. Có thể dùng báo cáo của công ty chứng khoán để hiểu cấu trúc ngành, tìm danh sách doanh nghiệp/cảng và kiểm tra logic quan hệ. Dự báo, giá mục tiêu, giả định và ước tính của chuyên viên phân tích phải được giữ khác với số doanh nghiệp công bố hoặc dữ kiện pháp lý. Báo cáo chính thức của SSI là nguồn gốc của nhận định SSI, không thay thế hồ sơ gốc của tổ chức phát hành. Việc đọc báo cáo để tìm nguồn không triển khai tài chính/định giá Slice 5.

### FiinPro-X

- [Tài liệu sản phẩm](https://docs.fiinpro.com/).
- [Cơ cấu sở hữu và tài liệu cổ đông](https://docs.fiinpro.com/huong-dan-chung/so-do-tinh-nang-chinh/cum-doanh-nghiep).
- [Giải thích nguồn danh sách cổ đông](https://docs.fiinpro.com/doanh-nghiep/q-and-a).

Đã đọc tài liệu chính chủ mô tả dữ liệu doanh nghiệp, cấu trúc sở hữu và tài liệu cổ đông; phần giải thích nguồn cho biết danh sách cổ đông dựa trên tài liệu doanh nghiệp công bố. Đây là lựa chọn dữ liệu thương mại để cân nhắc nếu sau này cần nguồn chuẩn hóa được cấp quyền. Chưa có quyền truy cập/dùng dữ liệu được xác nhận cho dự án; không thêm phụ thuộc trả phí, đăng ký dịch vụ hoặc nhập dữ liệu từ tài khoản cá nhân trong đợt này.

## 3. Quy tắc chốt dữ liệu Slice 1

1. Mã/sàn/trạng thái giao dịch: ưu tiên hồ sơ và thông báo của Sở; VSDC/UBCKNN bổ sung đối chiếu. Không dùng phân ngành tự động của một trang tài chính làm danh sách cảng đầy đủ.
2. Pháp nhân và quan hệ vốn: ưu tiên thuyết minh BCTC, báo cáo quản trị, báo cáo thường niên và công bố thay đổi mới hơn. Lưu rõ kỳ được tài liệu xác nhận; thiếu ngày bắt đầu thì không bịa ngày hiệu lực lịch sử.
3. Quan hệ vận hành: tìm tài liệu ghi rõ đơn vị khai thác hoặc hợp đồng/quyết định liên quan. Sở hữu vốn tại doanh nghiệp không tự đồng nghĩa trực tiếp vận hành bến.
4. Tài sản vật lý: đối chiếu tên pháp lý, vị trí và hierarchy với danh mục/quyết định chuyên ngành. Tỷ lệ sở hữu công ty không tự trở thành tỷ lệ sở hữu cầu cảng. Quan hệ gián tiếp phải nêu chuỗi pháp nhân.
5. Tài liệu mâu thuẫn: đối chiếu phạm vi, ngày hiệu lực, kỳ báo cáo và bản đính chính; tài liệu mới hơn chỉ thay thế dữ kiện trong phạm vi nó thực sự xác nhận. Không tự chọn tỷ lệ lớn hơn hoặc lấy trung bình. Chưa giải quyết được thì giữ pending và ghi khoảng trống.
6. Mọi quan hệ công bố phải có URL gốc, vị trí trong tài liệu, raw hash/key, thời điểm tải thật, kỳ/ngày hiệu lực được hỗ trợ và quyết định admin. Quyền truy cập cá nhân, PDF public, robots cho phép và uy tín thương hiệu không tự cấp quyền thu thập/phân phối lại. Giữ các bước kiểm tra nguồn theo architecture trước khi ingestion; không mở rộng enum nguồn để coi nguồn thương mại chưa cấp phép là official.
7. Không dùng báo không rõ xuất xứ, diễn đàn, mạng xã hội hoặc đoạn trích kết quả tìm kiếm làm bằng chứng duyệt. Không dùng dự báo môi giới để điền dữ kiện thiếu. dulieucangbien.com tiếp tục chỉ là tham khảo sản phẩm.

Đợt rà soát này không duyệt nguồn mới trong database, không tải raw chứng cứ mới vào R2 và không khẳng định đã hoàn tất coverage doanh nghiệp. Các URL trên là đầu mối đã tra cứu, không phải cam kết quyền/API hay độ đầy đủ của từng nhà cung cấp.
