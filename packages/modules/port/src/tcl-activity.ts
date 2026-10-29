/** TCL service references are not a vessel or monthly cargo series. */
export const tclAnnualSource={
 url:'https://tancanglogistics.com/quan-he-co-dong/Documents/20260319%20-%20TCL%20-%20BAO%20CAO%20THUONG%20NIEN%20202520260319161535.pdf',
 sha256:'f884d92dfb0a3f9c6fdd32abeeff90e83c8d3c9072a593f9e7a5488a592b9cdb',
 report_year:2025,
 checked_at:'2026-10-29T19:44:20.803250+00:00',
};
export const tclScopes={
 tcl:{name:'TCL · dịch vụ doanh nghiệp',note:'Xếp dỡ, khai thác ICD, depot, đóng/rút và vận tải. Chỉ tiêu dịch vụ không phải lượt tàu của toàn Cát Lái.'},
 tcl_nhon_trach:{name:'ICD Tân Cảng Nhơn Trạch',note:'Báo cáo 2025 xác nhận ICD 145.000 m², cầu tàu 320 m. TCL nắm 51% Công ty CP Tiếp vận Tân Cảng Đồng Nai tại 31/12/2025; đã có một phần lượt cập/rời cầu từ ePort TNT; nguồn chưa cung cấp DWT hoặc sản lượng tấn/TEU riêng ICD.'},
 tcl_cat_lai:{name:'Dịch vụ tại Cát Lái · bến đóng/rút 125',note:'TCL cung cấp dịch vụ xếp dỡ và đóng/rút tại Cát Lái. Không gán toàn bộ tàu hoặc sản lượng Cát Lái cho TCL.'},
 tcl_depots:{name:'Depot Mỹ Thủy · Tân Vạn',note:'Depot và đóng/rút container là chỉ tiêu dịch vụ riêng. Diện tích, dung lượng thiết kế và đơn giá không phải sản lượng thực hiện.'},
} as const;
export type TclScope=keyof typeof tclScopes;
export const isTclScope=(value:string):value is TclScope=>Object.hasOwn(tclScopes,value);
export function tclActivity(asset:TclScope='tcl'){
 return {
  ticker:'TCL',asset,scope:tclScopes[asset],semantics:'issuer_reported_service_reference',
  coverage_status:asset==='tcl'?'reported_reference_only':'unavailable',absence_means_zero:false,actual_verified:false,full_scope_certified:false,
  // A rounded, undated monthly average in a report cannot seed a calendar series.
  reference_figures:asset==='tcl'?[{
   metric:'container_handling_monthly_average',value:200000,unit:'TEU/month',approximate:true,
   measurement_kind:'reported_average',observation_month:null,report_year:2025,
   scope:'Dịch vụ xếp dỡ container TCL tại Cát Lái, ICD Tân Cảng Nhơn Trạch và các địa bàn nêu trong báo cáo',
   additive:false,source:{...tclAnnualSource,pdf_page:3},
  }]:[],
  unavailable_metrics:['port_calls','vessel_dwt','monthly_cargo_tonnes','monthly_container_teu'],
  scope_sources:[{...tclAnnualSource,pdf_pages:[3,4,7,8]}],
  exclusions:[
   {scope:'Bến 2.200 DWT hợp tác CLL/TCL',reason:'Theo dõi một lần tại CLL; không cộng lại vào TCL hoặc tổng khu vực.',href:'/companies/CLL?plan_asset=cll_b7#vessel-plans'},
   {scope:'Tân Cảng 128 Hải Phòng',reason:'Công ty liên kết được báo cáo riêng; nằm ngoài phạm vi cảng phía Nam.'},
   {scope:'SCC-VN Nhơn Trạch · Nhà máy điện Nhơn Trạch 1',reason:'Bến khác trong lịch Đồng Nai; trùng địa danh không xác nhận quan hệ TCL.'},
  ],
  source_checks:[
   {name:'Lịch Cảng vụ Đồng Nai',url:'http://123.25.204.166/web/guest/public-kh#/tra-cuu/ke_hoach/0/0/KeHoachDieuDongTau2',result:'Không xác định được nhãn bến TCL trong tập lịch sử đã rà; các bộ lọc SHIP/BOAT được kiểm tra thêm theo ngày mẫu, chưa chứng nhận mọi bộ lọc.'},
   {name:'ePort riêng ICD Nhơn Trạch · mã TNT',url:'https://eport.tcis.co/Ships',result:'Đã có quan sát cập/rời cầu tại mã TNT. Chỉ dùng giờ không mang tiền tố EST; loại các bến khác dù phản hồi tìm kiếm có trả kèm. Cửa sổ tra cứu có giới hạn, chưa đủ lịch sử và không có DWT.'},
   {name:'Trang cảng ICD Nhơn Trạch của SNP',url:'https://saigonnewport.com.vn/cang-cong-ty/tan-cang-nhon-trach-icd',result:'Xác nhận đơn vị TCL và kết nối ICD với Cát Lái/Hiệp Phước/Cái Mép. Quy mô, sức chứa và lịch dịch vụ không thay thế sản lượng thực hiện.'},
   {name:'Cảng vụ ĐTNĐ khu vực III',url:'https://cv3.gov.vn/CangBen/DanhSachCangBen',result:'Đã tìm được trang danh mục cảng/bến; truy cập trực tiếp bị lỗi kết nối. Chưa đọc được dữ liệu để ghép bến hoặc lịch sử.'},
   {name:'Biểu giá dịch vụ TCL',url:'https://tancanglogistics.com/ho-tro-khach-hang/Pages/bang-gia-dich-vu.aspx',result:'Xác nhận dịch vụ tại ICD/bến 125; đơn giá không phải khối lượng thực hiện.'},
  ],
 };
}
