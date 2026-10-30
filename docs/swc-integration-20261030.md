# SWC — Long Bình và bến phao, 30/10/2026

## Kết quả triển khai

SWC mở mặc định **Sowatco Long Bình**, tách khỏi bốn bến phao hiện có. Có lựa chọn tổng hai phạm vi nhưng không gọi đó là toàn bộ SWC; tổng quan miền Nam có hai dòng theo dõi riêng, không cộng tổng khu vực. API giữ lựa chọn bến phao cũ và thêm `swc_long_binh`/`swc_all`.

Long Bình: **4.434 dòng** sau loại trùng trong 667 ngày 01/01/2025–29/10/2026, từ 1.334 phản hồi vào/rời trực tiếp. Đây là lịch công bố, chưa xác nhận actual hoặc lượt ghé duy nhất. Nhật ký giữ ID, ngày/giờ gốc, DWT gốc, cầu/bến, hash và thời điểm lấy nguồn. Chiều vào/rời độc lập. Xem [ledger](catalog-review/swc-longbinh-history-ledger.json) và [rà nguồn](catalog-review/swc-source-review-20261030.json).

Giữ số ghi nhận khi thiếu ngày/DWT; không có quan sát là unavailable. Lũy kế dùng cùng tập tháng có số liệu hai năm và cutoff tương ứng; tổng full-range API giữ riêng. Không gán GT thành DWT hoặc phân bổ công suất thành sản lượng.

## Căn cứ pháp nhân và bến

- [Hồ sơ Long Bình của SWC](https://sowatco.com.vn/dich-vu/khai-thac-cang/cang-sowatco-long-binh/) ghi địa chỉ Nguyễn Xiển, phường Long Bình, TP.HCM, bờ sông Đồng Nai. Bảng giới thiệu dịch vụ và báo cáo thường niên có thông số cầu khác nhau; không dùng làm chuỗi hoạt động hoặc chứng nhận số cầu hiện hành.
- [Quyết định 706/QĐ-BGTVT ngày 06/06/2022](https://mt.gov.vn/Images/editor/files/KIM%20CUC/2022/17_06_54-02_06_2022_qd-cong-bo-cang-long-bin4_signed.pdf) xác nhận Tổng công ty CP Đường sông miền Nam và cầu số 1/2/3, giao Cảng vụ ĐTNĐ khu vực III quản lý chuyên ngành. Đã đọc nội dung PDF qua chỉ mục tìm kiếm nguồn Bộ; tải PDF trực tiếp thất bại, không khai hash raw không có.
- [Cảng vụ Hàng hải Đồng Nai](https://cangvuhanghaidongnai.gov.vn/) cung cấp cổng lịch công khai đang dùng. Danh mục trực tiếp vừa lấy lại có 51 bến/79 cầu: **K0005 = Cảng thủy nội địa Long Bình**, K0013/K0015/K0016 tương ứng cầu 1/2/3. Phân biệt cơ quan xuất bản dữ liệu và cơ quan quản lý chuyên ngành theo quyết định; không đồng nhất hai vai trò.
- **BC185** là Long Bình Tân của PDN, **K0008** là bến xăng dầu Long Bình Tân; cả hai không vào SWC. Bảng XLSX danh mục cảng biển của Đồng Nai không đủ để xác minh cảng thủy nội địa; không suy cảng không tồn tại vì không thấy trong XLSX.
- [Báo cáo SWC 2025 trên HNX](https://owa.hnx.vn/ftp///cims/2026/4_W2/000000016132083_VI_BaoCaoThuongNien_2025.pdf) xác nhận Long Bình, ICD Sotrans và mua Mekong – Cần Thơ tháng 11/2025. Không hồi gán hoạt động trước quan hệ đó. Website SWC có nội dung trong chỉ mục tìm kiếm nhưng một số lần tải trực tiếp bị timeout/502; hồ sơ ghi rõ phương thức truy cập, không kết luận nguồn không tồn tại.

## Hợp đồng nguồn, loại trùng và giới hạn

Chỉ lấy `arrival`/`departure`, `maritimeCode=11`, `shipBoat=SHIP`, trạng thái `3,4,5,7,8,9`. Các mẫu SHIP/BOAT ngày 15/06/2025, 15/06/2026 và 28/10/2026 được đối chiếu riêng trong receipt; không cộng BOAT lên SHIP hoặc tuyên bố đã phủ mọi nhóm phương tiện. Chưa cộng bảng shifting hoặc snapshot vị trí; số ghi nhận là một phần.

Mỗi dòng cần mã K0005, tên cảng chính xác, vùng sông Đồng Nai, cặp mã/nhãn cầu được rà. Ngoài K0013/K0015/K0016, giữ các mã cầu lịch sử có nhãn rõ trong raw; không suy mã cầu bằng số thứ tự. Hai dòng sai vùng sông hoặc chỉ khu neo được cách ly kèm ID/hash/lý do. Bốn nhóm trùng cùng chiều/giờ/tàu/tuyến giữ một dòng; một nhóm có DWT trống và DWT công bố ở dòng còn lại giữ dòng có trọng tải, cả hai ID lưu trong ledger. Hai DWT khác nhau cùng dương làm export dừng.

Quan sát gần nhất: vào 24/10, rời 28/10/2026. Nguồn thưa từ tháng 7/2026; Thông tư 20/2026/TT-BXD là bối cảnh thay đổi thủ tục, chưa định lượng nguyên nhân riêng Long Bình. Không coi giảm lịch/DWT là giảm tương ứng hoạt động hoặc sản lượng.

## Sản lượng doanh nghiệp công bố

[SOTRANS Group, phỏng vấn Giám đốc Long Bình ngày 20/08/2026](https://sotransgroup.vn/phong-van-diem-tua-logistics-vai-tro-icd/) công bố **container rỗng tiếp nhận**: 250.000 TEU năm 2023, 350.000 TEU năm 2024, tăng 40%. Hiển thị riêng với DWT; không gọi là toàn bộ hàng qua cảng, không rải thành tháng hoặc suy số 2025–2026. Năng lực hệ thống 1,3 triệu TEU/năm trong bài là công suất, không nhập thành thực hiện.

## Các tài sản chưa có chuỗi phù hợp

ICD Sotrans có hồ sơ doanh nghiệp và ePort phục vụ giao dịch nhưng chưa có chuỗi công khai đúng bến/ngày/DWT được xác minh. Rà danh mục Đồng Nai và nhãn trong archive lịch HCM chưa tìm được phạm vi đủ căn cứ để ghép riêng. Mekong – Cần Thơ có bằng chứng quan hệ nhưng chưa chốt được bến cụ thể và nguồn lịch; không gán cảng dầu Petro Mekong chỉ vì trùng tên. Tri Phương ngoài phạm vi phía Nam đợt này. Không cộng VICT/PDN vào SWC theo tỷ lệ vốn hoặc cộng chồng các dòng doanh nghiệp đã có.

Các khoảng này còn mở; hoàn thiện Long Bình không có nghĩa phủ đủ toàn hệ thống SWC.

## Refresh và kiểm chứng

- `python scripts/refresh-swc-plans.py`: lấy ít nhất bảy ngày gần nhất, bổ sung các ngày mới kể từ edition trước, dùng archive riêng `.local/swc/raw`. Lỗi nguồn hoặc mất bất kỳ dòng đã công bố làm dừng trước export; sửa trọng tải vẫn được đối chiếu. Không viết lại PDN/Bình Dương.
- `python scripts/export-swc-longbinh-plans.py --recent-only --raw-dir .local/swc/raw`: giữ lịch sử đã phát hành sau kiểm tra hash/proof và đối chiếu tổng ngày. Bản đầy đủ cần raw theo ngày; cache cũ tại `.local/pdn/raw` chỉ được đọc cho lần dựng đầu, không sửa dữ liệu PDN.
- `.github/workflows/swc-plans.yml`: refresh thủ công, kiểm tra, commit/push fast-forward và chờ đọc edition trên staging. Push cạnh tranh bị từ chối; không force push hoặc ghi đè bản khác. Chưa đăng ký lịch tự động và chưa có bằng chứng chạy workflow refresh cloud cho SWC.
- `node scripts/verify-swc-live.mjs`: đối chiếu 22 tháng hai chiều, nhật ký, tổng Long Bình+bến phao, hai dòng miền Nam và mặc định API. `--wait` dùng khi chờ deploy; biên nhận không tự coi là cron.
- Local: 186 Vitest, bốn Python test mới, bốn E2E SWC/miền Nam desktop/mobile, lint/typecheck và Next production build đạt. Cold-cache giữ lịch sử với 14 raw mới; replay 23 file dữ liệu/ledger giống từng byte. Toàn bộ 74 E2E tại máy đạt. Staging đã khớp 22 tháng hai chiều, tổng, nhật ký và miền Nam tại `ae61032`; [receipt](catalog-review/swc-staging-20261030.json). CI `40979236386` qua lint/typecheck/Vitest/Python nhưng E2E bị runner shutdown, hai bước build skipped; chưa gọi CI thành công.

CI cũ `40950348908` nhận shutdown signal từ runner ở E2E rồi cancellation; log chưa chứng minh assertion sản phẩm thất bại. Không sửa sản phẩm từ cancellation đó. Chưa nghiệm thu production hoặc schedule SWC/PDN.
