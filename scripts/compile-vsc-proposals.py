"""Prepare the additional VSC issuer dossier offline; never publishes facts.

The first-trade date is reported by the issuer, not a current exchange status
assertion. No subsidiary equity percentage is assigned to physical port assets.
"""
import hashlib
import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def identity(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "investingpro:vsc-registry-2026:" + key))


def literal(value):
    return "NULL" if value is None else "'" + str(value).replace("'", "''") + "'"


def compile_import():
    artifacts = json.loads((ROOT / "docs/catalog-review/evidence-artifacts.json").read_text(encoding="utf-8"))["artifacts"]
    artifact = next(x for x in artifacts if x["ticker"] == "VSC")
    raw = (ROOT / ".local/catalog-research" / artifact["artifact_label"]).read_bytes()
    if hashlib.sha256(raw).hexdigest() != artifact["content_hash"]:
        raise ValueError("VSC archived evidence changed")
    source, record, company, listing = (identity(k) for k in ("source", "record:p3:" + artifact["content_hash"], "company:0200453688", "listing:HOSE:VSC:2008-01-09"))
    note = ("Đọc trực quan báo cáo thường niên VSC 2025 trang PDF 3 (trang in 2): "
            "Công ty Cổ phần Container Việt Nam, mã doanh nghiệp 0200453688, mã VSC, "
            "giao dịch đầu tiên tại HOSE ngày 09/01/2008; quyết định niêm yết 12/12/2007 là mốc khác. "
            "Phạm vi registry theo báo cáo; chưa xác minh đầy đủ trạng thái giao dịch hoặc biến động năm 2026. "
            "Các trang PDF 6–7 và 11 dùng tìm chuỗi pháp nhân, không gán VSC khai thác trực tiếp "
            "mọi cảng của công ty con; tỷ lệ vốn không phải tỷ lệ sở hữu cầu cảng. Chờ duyệt nguồn, bằng chứng và listing.")
    sql = [
        "-- OFFLINE PREPARED ONLY. VSC is additional to the initial fifteen-ticker baseline.",
        "-- Confirm private R2 raw object before manual import. No publication or source rights decision.",
        "begin;",
        # Fail rather than create a duplicate company if another import already used its enterprise ID.
        f"do $$ begin if exists(select 1 from catalog.companies where enterprise_id='0200453688' and id<>{literal(company)}) or exists(select 1 from catalog.company_listings where exchange='HOSE' and ticker='VSC' and id<>{literal(listing)}) then raise exception 'VSC identity already exists; reconcile before import'; end if; end $$;",
        "insert into core.sources(id,code,name,owner,source_class,base_url,rights_status,rights_notes) values",
        f"({literal(source)},'vsc_annual_2025_research','Viconship – Báo cáo thường niên 2025, chờ duyệt','Công ty Cổ phần Container Việt Nam','official_company','https://viconship.com','to_verify','Chỉ đề xuất registry theo báo cáo doanh nghiệp, trang PDF 3. Không cấp phép toàn website hoặc tự xác minh chuỗi tài sản, tỷ lệ vốn và biến động hiện tại.') on conflict do nothing;",
        "insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,fetched_at,reporting_period_start,reporting_period_end,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status) values",
        "(" + ",".join(map(literal, (record, source, artifact["source_url"], artifact["source_url"], "VSC-2025:registry-review-p3", None, artifact["fetched_at"], "2025-01-01", "2025-12-31", "application/pdf", artifact["content_hash"], artifact["raw_storage_key"], "manual-visual-review", "vsc-registry-proposals-v1", "incomplete"))) + ") on conflict do nothing;",
        "insert into catalog.entities(id,kind,slug,name,source_record_id,quality_status) values",
        f"({literal(company)},'company','cong-ty-co-phan-container-viet-nam','Công ty Cổ phần Container Việt Nam',{literal(record)},'incomplete') on conflict do nothing;",
        "insert into catalog.companies(id,legal_name,enterprise_id,official_website) values",
        f"({literal(company)},'Công ty Cổ phần Container Việt Nam','0200453688','https://viconship.com') on conflict do nothing;",
        "insert into catalog.company_listings(id,company_id,ticker,exchange,valid_from,source_record_id,evidence_excerpt) values",
        "(" + ",".join(map(literal, (listing, company, "VSC", "HOSE", "2008-01-09", record, note))) + ") on conflict do nothing;",
        "commit;", ""
    ]
    (ROOT / "supabase/imports/vsc_registry.proposals.sql").write_text("\n".join(sql), encoding="utf-8")
    manifest = {"ticker":"VSC", "publication_status":"pending", "cloud_applied":False,
                "company_id":company, "listing_id":listing, "source_id":source, "source_record_id":record,
                "enterprise_id":"0200453688", "legal_name":"Công ty Cổ phần Container Việt Nam",
                "exchange":"HOSE", "first_trading_date":"2008-01-09", "reviewed_pages":[3],
                "artifact":artifact, "note":note, "interests_added":0,
                "review_gaps":["Current exchange status", "2026 changes", "R2 SHA-256 readback", "Source rights"],
                "portfolio_review":"See factual-review-20261015.json; HAH percentages unresolved, ICD chain separate"}
    (ROOT / "docs/catalog-review/vsc-registry-proposals-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Prepared one pending VSC issuer/listing, not applied or published.")


if __name__ == "__main__":
    compile_import()
