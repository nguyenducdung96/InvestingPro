import type { ReportedAssetItem } from "@invest/domain";
import { displayDate, label } from "@/lib/display";
import { SourceBadge } from "./catalog";
import { ReportedReview } from "./reported-review";

const roles: Record<string,string> = {
  indirect:"Quan hệ gián tiếp theo báo cáo", group_portfolio:"Trong mạng lưới tập đoàn; chưa chốt vai trò pháp nhân",
  business_cooperation:"Hợp tác kinh doanh", cargo_handling_service:"Dịch vụ xếp dỡ",
  lessor_and_infrastructure_cooperation:"Cho thuê / hợp tác hạ tầng", warehouse_and_yard_service:"Dịch vụ kho bãi",
};
export function ReportedAssets({items,review=false}:{items:ReportedAssetItem[];review?:boolean}) {
  return <>
    <p className="notice">Đây là các quan hệ doanh nghiệp nêu trong tài liệu của kỳ báo cáo. Ngày cuối kỳ không phải ngày bắt đầu sở hữu/khai thác và không chứng nhận tình trạng hiện tại. Dịch vụ tại cảng không đồng nghĩa sở hữu cảng.</p>
    {[
      {key:"ports",name:"Cảng biển / cảng sông theo báo cáo",rows:items.filter(x=>x.observation.asset_kind!=="icd"&&x.observation.scope_group!=="supplementary_industrial_base")},
      {key:"icds",name:"ICD / cảng cạn theo báo cáo",rows:items.filter(x=>x.observation.asset_kind==="icd")},
      {key:"supplementary",name:"Bổ sung: căn cứ công nghiệp và bến chuyên dùng",rows:items.filter(x=>x.observation.scope_group==="supplementary_industrial_base"&&x.observation.asset_kind!=="icd")},
    ].filter(g=>g.rows.length).map(group=><section key={group.key} aria-label={group.name}><h3>{group.name}</h3>{group.rows.map(({observation:o,lineage})=><article className="panel" key={o.id}>
      <span className="badge">{label(o.verification_status)}</span>
      <h3>{o.asset_name}</h3>
      <p>{label(o.asset_kind)} · {roles[o.reported_role]??label(o.reported_role)}</p>
      <p>Kỳ báo cáo đến {displayDate(o.reporting_period_end)} · Ngày bắt đầu quan hệ: {displayDate(o.relationship_started_on,"Chưa xác định")}</p>
      {o.documented_date&&<p>Mốc trong tài liệu: {displayDate(o.documented_date)} · {o.date_basis?.includes("first_vessel")?"Doanh nghiệp báo cáo bắt đầu khai thác":o.date_basis?.includes("certificate")?"Giấy chứng nhận; không mặc định là ngày đầu khai thác":"Mốc cấp phép / quyết định; không mặc định là ngày đầu khai thác"}</p>}
      {o.via.length>0&&<p>Qua pháp nhân: {o.via.join(" → ")}</p>}
      {o.berth_scope.length>0&&<p>Chỉ phạm vi: {o.berth_scope.join(", ")}. Không đại diện toàn bến.</p>}
      {!o.asset_id&&<p>Chưa khớp định danh pháp lý của tài sản.</p>}
      {review&&<p>Trang PDF đã đọc: {o.evidence_pages.join(", ")}</p>}
      {review&&<details><summary>Phạm vi bằng chứng và giới hạn</summary><p>{o.evidence_note}</p>
        {o.supporting_evidence.map(s=><p key={s.content_hash}><a href={s.source_url} target="_blank" rel="noreferrer">Tài liệu đối chiếu bổ sung</a> · Trang {s.reviewed_pages.join(", ")||"HTML"}</p>)}
      </details>}
      <SourceBadge citation={lineage}/>
      {review&&o.verification_status==="pending"&&<details><summary>Duyệt quan sát này</summary><ReportedReview id={o.id}/></details>}
    </article>)}</section>)}
  </>;
}
