import {dungquatSnapshot as snapshot} from '@invest/port';

const number=(value:number|null)=>value===null?'—':value.toLocaleString('vi-VN');

export function DungquatScope(){
 return <section className="panel" id="central-scope" aria-label="GMD Dung Quất">
  <p className="eyebrow">GMD · PHẠM VI MIỀN TRUNG</p>
  <h2>Gemadept–Dung Quất</h2>
  <p>Bến số 1 · Cảng tổng hợp Dung Quất, theo thông tin doanh nghiệp. Theo dõi riêng với Nam Đình Vũ và Gemalink.</p>
  <p className="notice">Chưa tích hợp lịch sử lượt tàu/DWT đủ điều kiện cho Dung Quất. Bảng dưới là quan sát vị trí trong bản nguồn đã tải; chưa xác nhận tình trạng tàu hiện tại.</p>
  <h3>Quan sát vị trí theo nguồn Cảng vụ</h3>
  <p className="meta">Thời điểm lấy nguồn: {new Date(snapshot.checked_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}. Thời gian nguồn ghi được giữ riêng với thời điểm lấy; chưa xác minh ngày cập nhật của toàn bảng.</p>
  <div className="call-table-wrap"><table className="call-table">
   <caption>Vị trí GMD · không tính vào lượt vào/ra hoặc DWT lũy kế</caption>
   <thead><tr><th scope="col">Tàu</th><th scope="col">Vị trí nguồn</th><th scope="col">DWT theo nguồn</th><th scope="col">Thời gian nguồn ghi</th></tr></thead>
   <tbody>{snapshot.observations.length?snapshot.observations.map(row=><tr key={row.source_row}><td data-label="Tàu">{row.vessel}</td><td data-label="Vị trí nguồn">{row.position}</td><td data-label="DWT theo nguồn">{number(row.dwt)}</td><td data-label="Thời gian nguồn ghi">{row.source_time_raw}</td></tr>):<tr><td colSpan={4}>Bản nguồn không có quan sát tại vị trí GMD.</td></tr>}</tbody>
  </table></div>
  <details><summary>Phạm vi, chất lượng và truy vết nguồn</summary>
   <p>Chỉ chọn nhãn GMD trong cột VỊ TRÍ; không dùng tên đại lý để gán bến. Không gộp ETA, khu neo, PTSC, Hào Hưng, Hòa Phát hoặc các bến khác. Thời gian được giữ nguyên văn vì bảng không định nghĩa đó là ATA/ATD hay giờ cập/rời cầu.</p>
   <p>{snapshot.source_rows} dòng toàn bảng; {snapshot.excluded_rows} dòng ngoài lựa chọn. GT giữ riêng với DWT; trọng tải thiếu hoặc bằng 0 giữ null. Không suy lượt rời khi tàu mất khỏi bảng. Chưa có chuỗi để tính tháng/quý, lũy kế hoặc YoY.</p>
   <p>Khảo sát ngày 25/10/2026: hai mục kế hoạch điều động công khai trả “Tin mục này đang được cập nhật”; bản vị trí ghi thời gian tháng 6/2026. Chưa xác minh lịch sử công khai tại website doanh nghiệp. Miền Trung vẫn có 4/5 phạm vi tích hợp chuỗi.</p>
   <p><a href={snapshot.source_url} target="_blank" rel="noreferrer">Bảng vị trí Cảng vụ Quảng Ngãi ↗</a> · <a href="http://cangvuhanghaiqni.gov.vn/?lk=6201" target="_blank" rel="noreferrer">Mục kế hoạch điều động ↗</a> · <a href="https://dqp.gemadept.com.vn/gioi-thieu/tong-quan/" target="_blank" rel="noreferrer">Phạm vi theo doanh nghiệp ↗</a></p>
   <p>Phiên bản trích xuất: {snapshot.parser_version}. Dòng nguồn: {snapshot.observations.map(r=>r.source_row).join(', ')||'—'}.</p>
   <p className="meta" style={{overflowWrap:'anywhere'}}>SHA-256: {snapshot.source_sha256}</p>
  </details>
  <a href="/industries/ports/central">Về tổng quan miền Trung</a>
 </section>;
}
