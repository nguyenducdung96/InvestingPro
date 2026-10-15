# Nguồn dữ liệu public chính thức cho ngành cảng biển Việt Nam

**Mục đích:** Tài liệu đầu vào để AI thiết kế và triển khai module `Port Intelligence` cho Financial Intelligence PWA.  
**Ngày rà soát:** 2026-10-13  
**Phạm vi:** Nguồn công khai của cơ quan nhà nước, sở giao dịch chứng khoán và doanh nghiệp cung cấp dữ liệu gốc hoặc tài liệu gốc. `dulieucangbien.com` chỉ là website tham khảo về sản phẩm, không phải nguồn dữ liệu đầu vào.

**Bổ sung ngày 15/10/2026:** Đã rà soát thêm VSDC, FPTS EzIR, CafeF, VietstockFinance, SSI Research và FiinPro-X cho việc hoàn thiện registry doanh nghiệp/quan hệ tài sản Slice 1. Vai trò, URL đã tra cứu, giới hạn truy cập và quy tắc truy về tài liệu gốc được ghi tại [Chính sách nguồn chứng khoán cho catalog](catalog-review/securities-source-policy.md). Nguồn tổng hợp/phân tích chỉ dùng discovery và kiểm tra chéo khi chưa có quyền sử dụng phù hợp; không tự trở thành nguồn được duyệt trong database. Không dùng báo không rõ nguồn, diễn đàn hoặc mạng xã hội làm bằng chứng xác minh.

---

## 1. Kết luận nhanh

Không có một cổng duy nhất cung cấp đầy đủ dữ liệu cảng biển Việt Nam ở mức quốc gia, cảng, bến, cầu cảng, tàu, tài chính doanh nghiệp và sự kiện. Pipeline nên ghép nhiều lớp nguồn:

1. **Cục Hàng hải và Đường thủy Việt Nam**: thống kê hàng hóa qua cảng, danh mục cảng/bến/cầu cảng, văn bản và thông tin hạ tầng.
2. **Hệ thống thông tin hàng hải/Thông báo hàng hải**: tuyến luồng, độ sâu, vùng nước, báo hiệu và thay đổi điều kiện khai thác.
3. **Các Cảng vụ Hàng hải địa phương**: báo cáo thống kê tháng, lượt tàu, hàng hóa, TEU và các thông tin địa phương được công bố.
4. **UBCKNN, HOSE, HNX/UPCoM**: BCTC, báo cáo thường niên, nghị quyết, tài liệu ĐHĐCĐ và công bố bất thường của doanh nghiệp cảng.
5. **Cục Thống kê và Hải quan**: dữ liệu nền về vận tải biển, xuất nhập khẩu, hàng hóa và thương mại.
6. **Website IR chính thức của doanh nghiệp**: nguồn đối chiếu và đôi khi công bố tài liệu sớm hoặc đầy đủ hơn cổng tập trung.

Kiến trúc ingestion cần xem từng nguồn là một connector riêng, lưu raw artifact và luôn giữ URL gốc, thời điểm tải, hash và parser version.

---

## 2. Ma trận ưu tiên nguồn

| Priority | Nguồn | Dùng cho | Dạng public quan sát được | Khuyến nghị |
|---|---|---|---|---|
| P0 | Cục Hàng hải và Đường thủy Việt Nam | Thống kê quốc gia, danh mục cảng/bến/cầu cảng, văn bản | HTML, DOCX/PDF đính kèm | Nguồn chuẩn chính cho catalog và thống kê ngành |
| P0 | UBCKNN, HOSE, HNX/UPCoM | BCTC, nghị quyết, ĐHĐCĐ, công bố doanh nghiệp | HTML, PDF/file đính kèm | Nguồn chuẩn cho Report Scanner |
| P1 | Cảng vụ Hàng hải địa phương | Thống kê chi tiết theo khu vực và tháng | HTML, PDF | Connector riêng theo từng Cảng vụ |
| P1 | Hệ thống Thông báo hàng hải | Luồng, độ sâu, tọa độ, vùng nước, thay đổi điều kiện | HTML | Event source cho hạ tầng và năng lực tiếp nhận |
| P1 | Cục Thống kê/PX-Web | Chuỗi vận tải biển và dữ liệu nền dài hạn | HTML, CSV/XLSX/JSON-stat qua giao diện | Dùng cho macro và historical benchmark |
| P1 | Hải quan Việt Nam | Xuất nhập khẩu theo kỳ, tỉnh và mặt hàng | HTML, file tải | Dùng làm demand/proxy, không thay thế throughput cảng |
| P2 | Website IR doanh nghiệp | Tài liệu gốc và đối soát | HTML, PDF/XLSX | Fallback/verification source |
| P2 | Hiệp hội Cảng biển Việt Nam | Số liệu thành viên/ngành nếu được công bố | Thay đổi theo trang | Bổ sung, không coi là dữ liệu toàn quốc nếu phạm vi chỉ gồm hội viên |

---

## 3. Nguồn quản lý nhà nước về cảng biển

### 3.1 Cục Hàng hải và Đường thủy Việt Nam

**Trang thống kê**  
https://vimawa.gov.vn/en/thong-ke

Nội dung đã xác minh trên trang:

- Danh sách các bản công bố `Khối lượng hàng hóa thông qua cảng biển` theo tháng.
- Bản ghi có ngày cập nhật và trang chi tiết để tải tài liệu đính kèm.

**Cách dùng trong app**

- Connector `vimawa_port_statistics`.
- Quét trang danh sách, phát hiện bài mới bằng canonical URL và published/update date.
- Tải file đính kèm, lưu raw, parse theo kỳ báo cáo.
- Phân biệt `reporting_period`, `published_at` và `fetched_at`.

**Danh mục bến cảng, cầu cảng năm 2026**  
https://vimawa.gov.vn/vi/noi-dung/ve-viec-cong-bo-danh-muc-ben-cang-cau-cang-thuoc-cac-cang-bien-viet-nam

Trang công bố Quyết định `505/QĐ-BXD`, ngày ban hành và hiệu lực 17/04/2026; có PDF danh mục bến cảng, cầu cảng đính kèm.

**Danh mục cảng biển Việt Nam**  
https://vimawa.gov.vn/en/node/14139

Trang công bố Quyết định `804/QĐ-TTg`, ngày ban hành và hiệu lực 08/07/2022; có PDF đính kèm.

**Danh mục cảng theo khu vực**  
Ví dụ trang Cảng biển TP. Hồ Chí Minh:  
https://www.vimawa.gov.vn/en/cang-bien/cang-bien-tp-ho-chi-minh

Trang hiển thị tên các bến cảng thuộc cảng biển/khu vực. Nên dùng quyết định/PDF mới nhất làm nguồn sự thật và dùng trang khu vực để kiểm tra chéo.

**Kho văn bản**  
https://vimawa.gov.vn/vi/van-ban

Dùng để theo dõi quyết định, thông tư, quy hoạch, công bố danh mục và các thay đổi pháp lý liên quan đến hàng hải, đường thủy.

**Danh sách cảng thủy nội địa tiếp nhận tàu biển**  
https://vimawa.gov.vn/vi/noi-dung/danh-sach-cang-thuy-noi-dia-tiep-nhan-tau-bien-vn

Trang công khai danh sách, vị trí, cấp kỹ thuật, khả năng tiếp nhận tàu biển và Cảng vụ quản lý. Đây là catalog bổ sung, cần tách khỏi danh mục cảng biển.

### 3.2 Hệ thống thông tin giao thông vận tải lĩnh vực hàng hải

**Trang chính**  
https://enc.vinamarine.gov.vn/

Trang công khai các nhóm:

- Thông báo hàng hải.
- Tuyến luồng hàng hải.
- Hệ thống đèn biển.

**Tra cứu Thông báo hàng hải**  
https://enc.vinamarine.gov.vn/ThongBaoHangHai.aspx

Giao diện có bộ lọc theo từ khóa, thời gian, khu vực và tuyến luồng. Nội dung thông báo có thể gồm số hiệu, ngày, đơn vị thông báo, tọa độ, độ sâu và hướng dẫn hàng hải.

**Ví dụ tuyến luồng Vũng Tàu - Thị Vải**  
https://enc.vinamarine.gov.vn/ChiTietTuyenLuong.aspx?ID=31

Trang hiển thị thông số kỹ thuật tuyến luồng như chiều dài, chiều rộng và độ sâu cho các đoạn luồng.

**Ứng dụng trong app**

- Connector `maritime_notices` phát hiện thông báo mới.
- Parse `notice_no`, `notice_date`, `area`, `channel`, `port/terminal mentions`, tọa độ và độ sâu.
- Sinh event nhưng không tự động diễn giải tác động tài chính nếu chưa có rule/methodology được kiểm chứng.

### 3.3 Hệ thống thông tin thống kê ngành hàng hải

**Trang giới thiệu hệ thống chỉ tiêu**  
http://144.79.79.16/intro.html

Trang công khai danh mục biểu thống kê ngành hàng hải, gồm các biểu về:

- Năng lực thông qua bến/cảng.
- Cầu cảng, luồng, khu neo và báo hiệu.
- Chi tiết tàu biển ra/vào cảng theo tháng.
- Khối lượng hàng hóa, hành khách qua cảng theo tháng.
- Lượt tàu thuyền vào/rời cảng.

**Lưu ý kỹ thuật**

- Đây là địa chỉ IP và cần kiểm tra tính ổn định, điều khoản truy cập và khả năng truy cập không đăng nhập trước khi tích hợp.
- Việc trang liệt kê biểu mẫu không đồng nghĩa toàn bộ dữ liệu chi tiết đều cho phép tải public hoặc tự động hóa.
- Chỉ triển khai production connector sau khi xác minh quyền truy cập và robots/usage terms.

---

## 4. Cảng vụ Hàng hải địa phương

### 4.1 Cảng vụ Hàng hải Đà Nẵng

**Chuyên mục thông tin/báo cáo**  
https://cangvuhanghaidanang.gov.vn/vi/chuyen-muc/thong-tin-khac

Trang liệt kê các báo cáo thống kê theo tháng và các file PDF.

**Ví dụ báo cáo tháng 7/2025**  
https://cangvuhanghaidanang.gov.vn/sites/default/files/di_18_-_bao_cao_so_lieu_thong_ke_thang_07_2025_0001.signed.pdf

File công khai chứa các nhóm chỉ tiêu như khối lượng hàng hóa, container TEU, lượt tàu biển, phương tiện thủy nội địa và một số phân tổ liên quan.

**Mẫu connector**

- `port_authority_da_nang_reports`.
- Discovery từ trang chuyên mục, tải PDF, OCR fallback nếu PDF scan.
- Parse theo mã biểu mẫu và giữ nguyên đơn vị gốc.
- Không cộng số lũy kế và số tháng vào cùng một series.

### 4.2 Các Cảng vụ khác

Cần lập registry và xác minh từng website chính thức của Cảng vụ trước khi coding. Không giả định mọi Cảng vụ dùng cùng CMS, URL pattern hoặc công khai cùng mức chi tiết.

Registry tối thiểu:

```yaml
- authority: "Cảng vụ Hàng hải Hải Phòng"
  official_url: null
  discovery_status: "to_verify"
- authority: "Cảng vụ Hàng hải Quảng Ninh"
  official_url: null
  discovery_status: "to_verify"
- authority: "Cảng vụ Hàng hải TP. Hồ Chí Minh"
  official_url: null
  discovery_status: "to_verify"
- authority: "Cảng vụ Hàng hải Vũng Tàu"
  official_url: null
  discovery_status: "to_verify"
- authority: "Cảng vụ Hàng hải Đồng Nai"
  official_url: null
  discovery_status: "to_verify"
- authority: "Cảng vụ Hàng hải Đà Nẵng"
  official_url: "https://cangvuhanghaidanang.gov.vn/"
  discovery_status: "verified_public_reports"
```

Không điền URL bằng suy đoán. AI implement phải xác minh domain từ trang Cục hoặc nguồn chính thức trước khi thêm connector.

---

## 5. Nguồn công bố thông tin doanh nghiệp

### 5.1 Ủy ban Chứng khoán Nhà nước

**Hệ thống công bố thông tin**  
https://congbothongtin.ssc.gov.vn/

Trang hỗ trợ lọc công bố theo sàn, mã chứng khoán, tên báo cáo, thời gian, năm và quý. Các nhóm công bố quan sát được gồm BCTC, định kỳ, bất thường/24h và chào bán/phát hành.

**Danh sách công ty đại chúng**  
https://congbothongtin.ssc.gov.vn/faces/CompanyProfilesSearch

Có thể dùng để ánh xạ tên doanh nghiệp, mã số doanh nghiệp, sàn và mã chứng khoán. URL session trong kết quả tìm kiếm không được lưu làm canonical URL.

**Khuyến nghị**

- Dùng URL gốc không chứa `jsessionid`.
- Connector phải quản lý session/cookie hợp lệ nếu trang yêu cầu.
- Không tự suy đoán endpoint API nội bộ nếu chưa xác minh điều khoản sử dụng.

### 5.2 HOSE

**Tin tổ chức niêm yết**  
https://www1.hsx.vn/vi/tin-tuc/tin-to-chuc-niem-yet

Trang công khai các loại tin như BCTC, nghị quyết HĐQT, tài liệu ĐHĐCĐ, thay đổi nhân sự và các công bố khác, kèm thời gian tạo.

**Trang chính**  
https://www.hsx.vn/

Có các nhóm dữ liệu giao dịch, thông tin công bố, niêm yết, đấu giá và văn bản. Trang cũng giới thiệu dịch vụ Data Feed; không giả định dữ liệu realtime được phép lấy miễn phí từ website công khai.

**Ứng dụng**

- Discovery theo mã cảng thuộc HOSE.
- Tải file từ domain `staticfile.hsx.vn` khi link được công bố chính thức.
- Hash file và xử lý đính chính như một document version mới, không ghi đè bản cũ.

### 5.3 HNX và UPCoM

**Thông tin công bố**  
https://www.hnx.vn/vi-vn/thong-tin-cong-bo-ny-hnx.html

Trang có tin từ Sở, tin từ tổ chức phát hành, file đính kèm và lịch thực hiện quyền.

**Ví dụ hồ sơ mã DXP**  
https://hnx.vn/cophieu-etfs/chi-tiet-chung-khoan-ny-DXP.html?_des_tab=3

Hồ sơ hiển thị thông tin chung, báo cáo định kỳ, thông tin công bố và các tài liệu doanh nghiệp của mã DXP.

**RSS thông tin từ Sở**  
https://www.hnx.vn/vi-vn/1/vi_vn/thong-tin-cong-bo-tu-so.rss

RSS có thể dùng làm discovery channel cho tin từ Sở. Cần kiểm tra liệu có feed tương ứng cho toàn bộ tin tổ chức phát hành trước khi thiết kế coverage.

---

## 6. Nguồn thống kê nền và vĩ mô

### 6.1 Cục Thống kê

**PX-Web**  
https://www.nso.gov.vn/en/px-web/

**Ví dụ chuỗi vận tải hàng hóa theo phương thức**  
https://www.nso.gov.vn/en/px-web/?pxid=E1210&theme=Transport%2C%20Postal%20Services%20and%20Telecommunications

Trang cho phép chọn năm và loại hình vận tải, trong đó có maritime transport.

**Ví dụ dữ liệu theo địa phương và định dạng tải**  
https://pxweb.nso.gov.vn/pxweb/en/Transport,%20Postal%20Services%20and%20Telecommunications/Transport,%20Postal%20Services%20and%20Telecommunications/E12.19.px/

Giao diện công khai các lựa chọn xuất như Excel, CSV và JSON-stat. Cần dùng đúng matrix và metadata; không đồng nhất `vận tải đường thủy` với `hàng hóa thông qua cảng biển`.

**Metadata chỉ tiêu năng lực cảng biển**  
https://www.nso.gov.vn/du-lieu-dac-ta/2023/11/htcttkqg-so-luong-nang-luc-boc-xep-hien-co-va-moi-tang-cua-cang-bien/

Trang mô tả khái niệm, phân tổ, kỳ công bố, nguồn số liệu và cơ quan chịu trách nhiệm cho chỉ tiêu số lượng/năng lực bốc xếp cảng biển.

### 6.2 Hải quan Việt Nam

**Trang thống kê hải quan**  
https://www.customs.gov.vn/index.jsp?pageId=445

Trang công khai lịch công bố, chỉ tiêu sơ bộ/điều chỉnh/chính thức và số liệu định kỳ. Nội dung có các bảng xuất nhập khẩu theo kỳ, tỉnh/thành phố và mặt hàng.

**Dùng cho**

- Bối cảnh nhu cầu xuất nhập khẩu.
- Phân tích hàng hóa và địa bàn có liên quan đến hinterland của cảng.
- Đối chiếu xu hướng, không dùng như số throughput trực tiếp của từng cảng/bến.

---

## 7. Nguồn pháp lý và quy hoạch

### Bộ Xây dựng/Bộ quản lý chuyên ngành

**Cổng văn bản**  
https://mt.gov.vn/vn/pages/vanban.aspx

**Ví dụ danh mục bến cảng được công bố**  
https://mt.gov.vn/mtthc/Pages/ChiTietTin.aspx?groupID=858&IDNews=80235

Trang nêu việc công bố danh mục bến cảng theo quyết định và trách nhiệm cập nhật. Khi quyết định mới được ban hành, ưu tiên văn bản mới nhất trên Cục/Bộ.

**Ứng dụng**

- Theo dõi quy hoạch, phân loại cảng, mức giá/khung giá, danh mục bến/cầu cảng và vùng nước.
- Lưu văn bản và phụ lục như versioned documents.
- Trích `document_no`, `issuer`, `issued_at`, `effective_at`, `replaces`, `amends`.

---

## 8. Website IR chính thức của doanh nghiệp cảng

AI implement phải xây bảng registry doanh nghiệp, không hardcode một danh sách mã mà không có cơ chế cập nhật.

Các trường cần lưu:

```yaml
company_id: "..."
ticker: "..."
exchange: "HOSE|HNX|UPCOM|OTC"
legal_name: "..."
official_website: "..."
ir_url: "..."
exchange_profile_url: "..."
ssc_profile_url: "..."
verified_at: "YYYY-MM-DD"
verification_source: "exchange|ssc|company_filing"
```

**Thứ tự ưu tiên tài liệu doanh nghiệp**

1. Công bố trên Sở/UBCKNN.
2. Website IR chính thức của doanh nghiệp.
3. Tài liệu trong báo cáo thường niên/BCTC có chữ ký hoặc xác nhận.
4. Nguồn tổng hợp chỉ dùng discovery, không dùng làm source of truth.

**Quy tắc đính chính**

- Không xóa tài liệu cũ.
- Liên kết bản đính chính với bản trước bằng `supersedes_document_id`.
- Bản dùng trong phân tích phải có `effective_version` và lý do lựa chọn.

---

## 9. Không nên dùng làm nguồn gốc

Các website tổng hợp, báo chí, blog, diễn đàn và nền tảng dữ liệu tài chính có thể dùng để discovery hoặc tham khảo UX, nhưng không nên là nguồn gốc cho số liệu nếu đã tồn tại tài liệu chính thức.

Cụ thể:

- `https://dulieucangbien.com/` chỉ dùng tham khảo sản phẩm/UX theo yêu cầu dự án.
- Không scrape hoặc tái phân phối dữ liệu có paywall, dữ liệu độc quyền, hay dữ liệu không rõ giấy phép.
- Không lấy số liệu từ snippet của công cụ tìm kiếm làm dữ liệu production.
- Không coi AIS hoặc vessel-tracking commercial data là public/open chỉ vì có thể xem trên web.

---

## 10. Source registry đề xuất

```yaml
sources:
  - id: "vimawa_statistics"
    owner: "Cục Hàng hải và Đường thủy Việt Nam"
    base_url: "https://vimawa.gov.vn/"
    discovery_url: "https://vimawa.gov.vn/en/thong-ke"
    source_class: "official_government"
    expected_formats: ["html", "docx", "pdf"]
    priority: "P0"

  - id: "vimawa_ports_catalog"
    owner: "Cục Hàng hải và Đường thủy Việt Nam"
    discovery_url: "https://vimawa.gov.vn/vi/noi-dung/ve-viec-cong-bo-danh-muc-ben-cang-cau-cang-thuoc-cac-cang-bien-viet-nam"
    source_class: "official_government"
    expected_formats: ["html", "pdf"]
    priority: "P0"

  - id: "maritime_notices"
    owner: "Cục Hàng hải"
    discovery_url: "https://enc.vinamarine.gov.vn/ThongBaoHangHai.aspx"
    source_class: "official_government"
    expected_formats: ["html"]
    priority: "P1"

  - id: "ssc_disclosures"
    owner: "Ủy ban Chứng khoán Nhà nước"
    discovery_url: "https://congbothongtin.ssc.gov.vn/"
    source_class: "official_regulator"
    expected_formats: ["html", "pdf", "xlsx"]
    priority: "P0"

  - id: "hose_disclosures"
    owner: "Sở Giao dịch Chứng khoán TP.HCM"
    discovery_url: "https://www1.hsx.vn/vi/tin-tuc/tin-to-chuc-niem-yet"
    source_class: "official_exchange"
    expected_formats: ["html", "pdf"]
    priority: "P0"

  - id: "hnx_disclosures"
    owner: "Sở Giao dịch Chứng khoán Hà Nội"
    discovery_url: "https://www.hnx.vn/vi-vn/thong-tin-cong-bo-ny-hnx.html"
    source_class: "official_exchange"
    expected_formats: ["html", "pdf", "rss"]
    priority: "P0"

  - id: "nso_pxweb"
    owner: "Cục Thống kê"
    discovery_url: "https://www.nso.gov.vn/en/px-web/"
    source_class: "official_statistics"
    expected_formats: ["html", "csv", "xlsx", "json-stat"]
    priority: "P1"

  - id: "customs_statistics"
    owner: "Hải quan Việt Nam"
    discovery_url: "https://www.customs.gov.vn/index.jsp?pageId=445"
    source_class: "official_government"
    expected_formats: ["html", "downloadable_reports"]
    priority: "P1"

  - id: "danang_port_authority_reports"
    owner: "Cảng vụ Hàng hải Đà Nẵng"
    discovery_url: "https://cangvuhanghaidanang.gov.vn/vi/chuyen-muc/thong-tin-khac"
    source_class: "official_port_authority"
    expected_formats: ["html", "pdf"]
    priority: "P1"
```

---

## 11. Data quality và lineage bắt buộc

Mỗi artifact/record phải có tối thiểu:

```text
source_id
source_url
canonical_url
external_id
published_at
updated_at
fetched_at
reporting_period_start
reporting_period_end
content_type
content_hash
raw_storage_key
parser_name
parser_version
quality_status
supersedes_document_id
```

**Quality rules**

- Kiểm tra unit: tấn, nghìn tấn, TEU, lượt tàu, DWT và tấn.km không được trộn.
- Phân biệt số tháng, lũy kế, năm và cùng kỳ.
- Phân biệt official actual, estimate, preliminary, adjusted và final.
- Không coi DWT là khối lượng hàng thực tế.
- Không suy ra doanh thu từng bến nếu doanh nghiệp không công bố hoặc không có methodology đã kiểm chứng.
- Không tự map bến sang doanh nghiệp niêm yết chỉ bằng tên gần giống; cần mapping có nguồn và `valid_from/valid_to`.

---

## 12. Kế hoạch connector cho MVP

### Batch A: Catalog và văn bản

1. `vimawa_ports_catalog`
2. `vimawa_documents`
3. `maritime_notices`

### Batch B: Công bố doanh nghiệp

1. `ssc_disclosures`
2. `hose_disclosures`
3. `hnx_disclosures`
4. `company_ir_fallback`

### Batch C: Throughput và thống kê

1. `vimawa_port_statistics`
2. `danang_port_authority_reports`
3. Các Cảng vụ khác sau khi xác minh URL chính thức và coverage.

### Batch D: Macro/context

1. `nso_pxweb`
2. `customs_statistics`

**Không triển khai tất cả cùng lúc.** Với mỗi connector cần hoàn thành discovery, raw storage, parser fixture, normalization, data-quality tests và monitoring trước khi chuyển connector tiếp theo.

---

## 13. Acceptance criteria cho AI implement

- Không dùng `dulieucangbien.com` làm nguồn dữ liệu.
- Không dùng URL chưa xác minh hoặc URL session làm canonical URL.
- Mỗi connector có source registry entry và ghi chú quyền/điều khoản truy cập.
- Lưu raw artifact trước khi parse.
- Có fixture lấy từ tài liệu public chính thức và test parser.
- Không bypass CAPTCHA, login, paywall hoặc anti-bot.
- Tôn trọng robots.txt, terms, rate limit và bản quyền.
- Mọi số hiển thị có source URL, reporting period, fetched time và quality status.
- Có cơ chế correction/versioning cho file đính chính.
- Nếu nguồn thay đổi layout, connector phải fail visibly và giữ checkpoint, không ghi dữ liệu rỗng thay thế.

---

## 14. Prompt đính kèm khi yêu cầu AI bắt đầu làm

```text
Hãy sử dụng tài liệu `vietnam_port_official_public_data_sources.md` làm source registry ban đầu cho module Port Intelligence.

Yêu cầu:
1. Không dùng dulieucangbien.com làm nguồn dữ liệu. Website này chỉ là tham khảo về sản phẩm/UX.
2. Bắt đầu với ba connector: vimawa_ports_catalog, vimawa_port_statistics và ssc_disclosures.
3. Trước khi coding, kiểm tra lại URL, robots.txt, điều khoản sử dụng và định dạng response thực tế của từng nguồn.
4. Không suy đoán API nội bộ. Chỉ dùng endpoint public đã xác minh và được phép truy cập.
5. Lưu raw artifact, content hash, source URL, published_at, fetched_at và parser_version.
6. Tạo fixtures và parser tests. Không dùng dữ liệu synthetic ngoài dev/test.
7. Dữ liệu chuẩn hóa phải phân biệt tấn, TEU, lượt tàu, DWT, kỳ tháng, lũy kế và năm.
8. Mọi API/UI trả dữ liệu phải có metadata nguồn, as-of/reporting period và quality status.
9. Nếu nguồn không truy cập được hoặc quyền sử dụng không rõ, dừng connector đó, ghi blocker và tiếp tục phần không phụ thuộc.
10. Sau khi implement, chạy lint, typecheck, unit tests và integration tests; báo file đã tạo, lệnh đã chạy, kết quả và blockers.
```

---

## 15. Các giới hạn còn lại

- Chưa xác minh được website chính thức và mức dữ liệu public của toàn bộ Cảng vụ Hàng hải; registry để `to_verify` thay vì đoán URL.
- Chưa xác minh một API public chính thức cung cấp lịch tàu/port calls toàn quốc. Danh mục biểu thống kê có tồn tại, nhưng khả năng tải/tự động hóa dữ liệu chi tiết cần kiểm tra riêng.
- Website của cơ quan nhà nước có thể thay đổi domain, CMS hoặc cấu trúc. Connector phải cấu hình được và có health checks.
- Dữ liệu thị trường realtime chính thức có thể thuộc dịch vụ Data Feed; không mặc định website public cho phép thu thập hoặc phân phối lại realtime.

