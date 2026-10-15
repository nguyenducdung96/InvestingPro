"""Offline, fail-closed compiler for explicitly reviewed DVP asset proposals.

Reuses archived issuer bytes and canonical 505 asset IDs. Adds an immutable
review record and pending interests; never approves sources or updates entities.
Legal authorization dates are not represented as first-vessel-call dates.
"""
import hashlib
import json
import uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def identity(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "investingpro:dvp-assets-2026:" + key))


def literal(value):
    return "NULL" if value is None else "'" + str(value).replace("'", "''") + "'"


def compile_import():
    dossier = json.loads((ROOT / "supabase/imports/data/dvp-asset.proposals.json").read_text(encoding="utf-8"))
    registry = json.loads((ROOT / "docs/catalog-review/issuer-registry-proposals-manifest.json").read_text(encoding="utf-8"))
    company = next(x for x in registry["companies"] if x["ticker"] == dossier["ticker"])
    artifact = next(x for x in registry["artifacts"] if x["key"] == dossier["artifact_key"])
    catalog = json.loads((ROOT / "supabase/imports/data/505-commercial-catalog.reviewed.json").read_text(encoding="utf-8"))
    terminal = next(x for x in catalog["terminals"] if x["number"] == dossier["terminal_number"])
    if company["enterprise_id"] != dossier["enterprise_id"] or artifact["ticker"] != dossier["ticker"]:
        raise ValueError("Issuer identity mismatch")
    if terminal["name"] != dossier["terminal_name"] or dossier["reviewed_pages"] != [1, 2]:
        raise ValueError("Canonical target or explicit review scope mismatch")
    if dossier["date_basis"] != "reported_legal_authorization" or dossier["publication_status"] != "pending":
        raise ValueError("Unsupported date/publication basis")
    raw = (ROOT / ".local/catalog-research" / artifact["label"]).read_bytes()
    if hashlib.sha256(raw).hexdigest() != artifact["content_hash"]:
        raise ValueError("Archived issuer bytes changed")
    record_id = identity("record:p1-p2:" + artifact["content_hash"])
    target_ids = []
    interests = []
    manifest_rows = []
    for item in dossier["interests"]:
        if item["interest_type"] != "operator" or item["ownership_pct"] is not None:
            raise ValueError("Ownership is not supported by the reviewed evidence")
        date.fromisoformat(item["valid_from"])
        if item["asset_kind"] == "terminal" and item["berth_label"] is None:
            key = f"terminal:{terminal['number']}"
            name = terminal["name"]
        elif item["asset_kind"] == "berth" and item["berth_label"] in terminal["berths"]:
            number = terminal["berths"].index(item["berth_label"]) + 1
            key = f"berth:{terminal['number']}:{number}"
            name = item["berth_label"] + " – " + terminal["name"].removeprefix("Bến cảng ")
        else:
            raise ValueError("Unknown canonical asset; do not invent a berth")
        aid = str(uuid.uuid5(uuid.NAMESPACE_URL, "investingpro:505-2026:" + key))
        if aid in target_ids:
            raise ValueError("Duplicate target")
        target_ids.append(aid)
        iid = identity("operator:" + aid + ":" + item["valid_from"])
        note = (
            f"Đọc trực quan báo cáo DVP 2025 trang PDF 1–2, pháp nhân {dossier['enterprise_id']}; "
            f"đối chiếu {name} với mục 51 danh mục 505/QĐ-BXD. "
            f"Mốc {item['valid_from']} là ngày cấp phép khai thác theo quyết định {item['decision']} "
            "được báo cáo nêu; valid_from dùng cho đề xuất vai trò được cấp phép, không khẳng định ngày tàu đầu tiên "
            "hoặc hoạt động liên tục đến hiện tại. Không gộp PTSC Đình Vũ, VIMC Đình Vũ hoặc Nam Hải Đình Vũ. "
            "Chưa xác minh quyết định gốc, quyền sử dụng nguồn và biến động/cải tạo năm 2026; chưa đủ điều kiện công bố. "
            "Tỷ lệ sở hữu NULL vì cấp phép khai thác không chứng minh quyền sở hữu."
        )
        interests.append((iid, company["company_id"], aid, item["asset_kind"], "operator", None,
                          item["valid_from"], record_id, note, "document_evidence", "0.95"))
        manifest_rows.append({**item, "id":iid, "company_id":company["company_id"], "asset_id":aid,
                              "asset_name":name, "source_record_id":record_id, "verification_status":"pending"})
    expected = " or ".join(
        f"not exists(select 1 from catalog.entities where id={literal(row['asset_id'])} and kind={literal(row['asset_kind'])} and name={literal(row['asset_name'])})"
        for row in manifest_rows
    )
    sql = ["-- Pending DVP legal-authorization proposals only; no publication or source approval.",
           "-- Requires HOSE issuer and canonical 505 imports. Confirm private raw object first.", "begin;",
           f"do $$ begin if not exists(select 1 from catalog.companies where id={literal(company['company_id'])} and enterprise_id={literal(dossier['enterprise_id'])}) or {expected} then raise exception 'DVP issuer/canonical asset prerequisite mismatch'; end if;",
           f"if not exists(select 1 from core.source_records where id={literal(artifact['source_record_id'])} and content_hash={literal(artifact['content_hash'])} and raw_storage_key={literal(artifact['raw_storage_key'])}) then raise exception 'Archived DVP evidence prerequisite missing'; end if; end $$;",
           "insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,fetched_at,reporting_period_start,reporting_period_end,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status)",
           f"select {literal(record_id)},source_id,source_url,canonical_url,'DVP-2025:asset-review-p1-p2',null,fetched_at,'2025-01-01','2025-12-31',content_type,content_hash,raw_storage_key,'manual-visual-review','dvp-asset-proposals-v1','incomplete' from core.source_records where id={literal(artifact['source_record_id'])} on conflict do nothing;",
           "insert into port.company_asset_interests(id,company_id,asset_id,asset_kind,interest_type,ownership_pct,valid_from,source_record_id,evidence_excerpt,resolution_method,confidence,verification_source_id)"]
    sql.append("values\n" + ",\n".join("(" + ",".join(map(literal, row)) + f",(select source_id from core.source_records where id={literal(record_id)}))" for row in interests))
    sql.append("on conflict do nothing;\ncommit;\n")
    (ROOT / "supabase/imports/dvp_assets.proposals.sql").write_text("\n".join(sql), encoding="utf-8")
    manifest = {"publication_status":"pending", "date_basis":dossier["date_basis"], "artifact":artifact,
                "review_record_id":record_id, "reviewed_pages":dossier["reviewed_pages"], "interests":manifest_rows,
                "review_gaps":dossier["review_gaps"], "cross_checks":dossier["cross_checks"]}
    (ROOT / "docs/catalog-review/dvp-asset-proposals-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(interests)} pending DVP legal-authorization interests; no new raw files.")


if __name__ == "__main__":
    compile_import()
