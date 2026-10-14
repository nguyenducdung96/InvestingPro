const labels: Record<string, string> = {
  verified: "Đã xác minh",
  preliminary: "Sơ bộ",
  estimated: "Ước tính",
  incomplete: "Chưa đầy đủ",
  pending: "Chờ duyệt",
  rejected: "Đã từ chối",
  port_authority: "Cảng vụ",
  port: "Cảng biển",
  terminal: "Bến cảng",
  berth: "Cầu cảng",
  company: "Doanh nghiệp",
  catalog: "Danh mục",
  ownership: "Sở hữu",
  operator: "Vận hành",
  joint_venture: "Liên doanh",
  concession: "Nhượng quyền",
  lease: "Thuê",
  indirect: "Sở hữu gián tiếp",
  official_identifier: "Định danh chính thức",
  document_evidence: "Bằng chứng tài liệu",
  fuzzy_name: "Tên gần giống",
  authority_id: "Mã cảng vụ",
  port_id: "Mã cảng biển",
  terminal_id: "Mã bến cảng",
  legal_name: "Tên pháp lý",
  country_code: "Mã quốc gia",
  province: "Tỉnh/thành phố",
  latitude: "Vĩ độ",
  longitude: "Kinh độ",
  unlocode: "Mã UN/LOCODE",
  code: "Mã",
  address: "Địa chỉ",
  tax_code: "Mã số thuế",
  registration_number: "Số đăng ký",
  website: "Website",
  region: "Khu vực",
  terminal_type: "Loại bến cảng",
  enterprise_id: "Mã doanh nghiệp",
  official_website: "Website chính thức",
  ir_url: "Trang quan hệ nhà đầu tư",
  "listed-company registry": "Danh mục niêm yết / đăng ký giao dịch",
  "admin mapping proposals": "Đề xuất quan hệ chờ duyệt",
  "admin mapping proposal": "Đề xuất quan hệ",
  "admin mapping decision": "Quyết định duyệt quan hệ",
};
export const label = (value: string) => labels[value] ?? value;
export function scopeLabel(value: string) {
  const date = /^verified interests effective (\d{4}-\d{2}-\d{2})$/.exec(value);
  return date
    ? `Quan hệ đã xác minh có hiệu lực ngày ${displayDate(date[1])}`
    : label(value);
}
export function displayDate(value: string | null, fallback = "Chưa công bố") {
  if (!value) return fallback;
  const date = new Date(
    value.length === 10 ? `${value}T00:00:00+07:00` : value,
  );
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(value.length > 10 ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}
export const warningLabel = (value: string) =>
  ({
    "Catalog evidence does not establish operational data coverage.":
      "Bằng chứng danh mục không xác định độ bao phủ dữ liệu hoạt động.",
    "No verified evidence available.": "Chưa có bằng chứng đã xác minh.",
  })[value] ?? value;
export function requestError(status: number, review = false) {
  if (status === 401)
    return "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.";
  if (status === 403) return "Tài khoản không có quyền thực hiện thao tác này.";
  if (status === 409)
    return "Quan hệ đã được duyệt hoặc xung đột với dữ liệu danh mục. Vui lòng tải lại trang.";
  if (status === 400)
    return review
      ? "Quyết định hoặc ghi chú không hợp lệ."
      : "Vui lòng nhập mã truy cập hợp lệ.";
  return "Không thực hiện được yêu cầu. Vui lòng thử lại sau.";
}
