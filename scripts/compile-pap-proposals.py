"""Offline PAP proposals from visually inspected issuer pages 3-4.

No network, source approval or publication. Reuses canonical berth IDs and
archived bytes. Qualification/opening dates are not first-vessel dates.
"""
import hashlib
import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def identity(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "investingpro:pap-assets-2026:" + key))


def literal(value):
    return "NULL" if value is None else "'" + str(value).replace("'", "''") + "'"


def compile_import():
    artifacts = json.loads((ROOT / "docs/catalog-review/evidence-artifacts.json").read_text(encoding="utf-8"))["artifacts"]
    artifact = next(x for x in artifacts if x["ticker"] == "PAP")
    raw = (ROOT / ".local/catalog-research" / artifact["artifact_label"]).read_bytes()
    if hashlib.sha256(raw).hexdigest() != artifact["content_hash"]:
        raise ValueError("PAP archived evidence changed")
    company = next(x for x in json.loads((ROOT / "docs/catalog-review/registry-proposals-manifest.json").read_text(encoding="utf-8")) if x["ticker"] == "PAP")
    catalog = json.loads((ROOT / "supabase/imports/data/505-commercial-catalog.reviewed.json").read_text(encoding="utf-8"))
    terminal = next(x for x in catalog["terminals"] if x["number"] == 227)
    if terminal["name"] != "Bến cảng Phước An" or terminal["berths"] != ["Cầu cảng số 5", "Cầu cảng số 6", "Cầu cảng số 7"]:
        raise ValueError("PAP canonical numbering changed; review required")
    source = identity("source")
    record = identity("record:p3-p4:" + artifact["content_hash"])
    rows = []
    for index, label in enumerate(terminal["berths"], start=1):
        asset = str(uuid.uuid5(uuid.NAMESPACE_URL, f"investingpro:505-2026:berth:227:{index}"))
        is_seven = label == "Cầu cảng số 7"
        start = "2025-12-05" if is_seven else "2024-12-31"
        basis = "reported_opening_decision" if is_seven else "reported_business_eligibility_certificate"
        decision = "2620/QĐ-CHHVN" if is_seven else "47/2024/GCC-CHHVN"
        note = (
            f"Đọc trực quan báo cáo thường niên PAP 2025, trang PDF 3–4 (trang in 1–2): pháp nhân "
            f"Công ty Cổ phần Dầu khí Đầu tư Khai thác Cảng Phước An, mã doanh nghiệp 3601010336. "
            f"Đối chiếu {label} thuộc bến Phước An mục 227 danh mục 505/QĐ-BXD. "
            f"valid_from {start} là mốc {basis} theo văn bản {decision} do doanh nghiệp báo cáo, "
            "không phải ngày tàu đầu tiên hoặc ngày bắt đầu khai thác thực tế. "
            "Báo cáo nêu phân kỳ 1, cầu 7 và cầu 6 nối dài đã khai thác; cầu 8–9 đang xây dựng. "
            "Không tạo thêm cầu 6 cho phần nối dài, không suy ra sở hữu 100%. "
            "Chưa đối chiếu bản gốc giấy phép, biến động 2026, quyền nguồn hoặc hash tải ngược R2; giữ pending."
        )
        if label == "Cầu cảng số 6":
            note += " Mốc 2024-12-31 chỉ áp dụng cầu 6 ban đầu; phần nối dài có quyết định riêng ngày 2025-12-05."
        rows.append({"id":identity("operator:" + asset + ":" + start), "asset_id":asset,
                     "asset_name":label + " – Phước An", "asset_kind":"berth", "interest_type":"operator",
                     "company_id":company["company_id"], "ownership_pct":None, "valid_from":start,
                     "date_basis":basis, "decision":decision, "evidence_note":note,
                     "source_record_id":record, "verification_status":"pending"})
    checks = " or ".join(
        f"not exists(select 1 from catalog.entities where id={literal(r['asset_id'])} and kind='berth' and name={literal(r['asset_name'])})"
        for r in rows
    )
    sql = [
        "-- OFFLINE PREPARED ONLY. Not applied to cloud. No source/evidence/relationship approval.",
        "-- Before manual import: confirm private raw object and prerequisites; do not use to bypass a denied publication action.",
        "begin;",
        f"do $$ begin if not exists(select 1 from catalog.companies where id={literal(company['company_id'])} and legal_name={literal(company['legal_name'])} and (enterprise_id is null or enterprise_id='3601010336')) or {checks} then raise exception 'PAP issuer/canonical asset prerequisite mismatch'; end if; end $$;",
        "insert into core.sources(id,code,name,owner,source_class,base_url,rights_status,rights_notes) values",
        f"({literal(source)},'pap_annual_2025_research','Phước An – Báo cáo thường niên 2025, chờ duyệt','Công ty Cổ phần Dầu khí Đầu tư Khai thác Cảng Phước An','official_company','https://www.phuocanport.com','to_verify','Tài liệu doanh nghiệp phát hành, lưu tại HNX; chỉ đề xuất pháp nhân và vai trò theo trang PDF 3–4. Không cấp phép website hoặc công bố toàn văn. Chờ kiểm tra quyền nguồn và raw R2.') on conflict do nothing;",
        "insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,fetched_at,reporting_period_start,reporting_period_end,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status) values",
        "(" + ",".join(map(literal, (record, source, artifact["source_url"], artifact["source_url"], "PAP-2025:asset-review-p3-p4", None, artifact["fetched_at"], "2025-01-01", "2025-12-31", "application/pdf", artifact["content_hash"], artifact["raw_storage_key"], "manual-visual-review", "pap-asset-proposals-v1", "incomplete"))) + ") on conflict do nothing;",
        # Verified entities and prior rejected decisions are never changed by this import.
        f"update catalog.entities set source_record_id={literal(record)} where id={literal(company['company_id'])} and quality_status='incomplete' and source_record_id={literal(company['source_record_id'])};",
        f"update catalog.companies set enterprise_id='3601010336',official_website='https://www.phuocanport.com' where id={literal(company['company_id'])} and enterprise_id is null and official_website is null and exists(select 1 from catalog.entities e where e.id=companies.id and e.quality_status='incomplete' and e.source_record_id={literal(record)});",
        "insert into port.company_asset_interests(id,company_id,asset_id,asset_kind,interest_type,ownership_pct,valid_from,source_record_id,evidence_excerpt,resolution_method,confidence,verification_source_id) values",
        ",\n".join("(" + ",".join(map(literal, (r["id"], r["company_id"], r["asset_id"], "berth", "operator", None, r["valid_from"], record, r["evidence_note"], "document_evidence", "0.95", source))) + ")" for r in rows),
        "on conflict do nothing;", "commit;", ""
    ]
    (ROOT / "supabase/imports/pap_assets.proposals.sql").write_text("\n".join(sql), encoding="utf-8")
    manifest = {"publication_status":"pending", "cloud_applied":False, "source_id":source,
                "review_record_id":record, "artifact":artifact, "reviewed_pages":[3,4], "interests":rows,
                "excluded_assets":["Cầu 8", "Cầu 9", "Khu công nghiệp Phước An", "ICD suy ra từ bãi logistics"],
                "review_gaps":["R2 SHA-256 readback", "Source rights", "Original administrative decisions", "2026 legal berth numbering and changes"],
                "as_of_scope":"Issuer annual report 2025; historical qualification/opening dates only, not uninterrupted current berth availability"}
    (ROOT / "docs/catalog-review/pap-asset-proposals-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Prepared three pending PAP berth proposals, not applied or published.")


if __name__ == "__main__":
    compile_import()
