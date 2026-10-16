"""Offline compiler for four reviewed issuer-document registry proposals.

Preserves original acquisition times for existing archived evidence. New raw
files must be uploaded and confirmed separately before SQL application.
Does not fetch, approve sources, verify listings or infer asset ownership.
"""
import hashlib
import json
import re
import unicodedata
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / ".local/catalog-research"


def identity(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "investingpro:issuer-registry-2026:" + key))


def literal(value):
    return "NULL" if value is None else "'" + str(value).replace("'", "''") + "'"


def slug(name):
    text = unicodedata.normalize("NFKD", name.lower().replace("đ", "d"))
    return re.sub(r"[^a-z0-9]+", "-", text.encode("ascii", "ignore").decode()).strip("-")


def compile_import():
    dossier = json.loads((ROOT / "supabase/imports/data/hose-registry.proposals.json").read_text(encoding="utf-8"))
    archived = {x["artifact_label"]: x for x in json.loads((ROOT / "docs/catalog-review/evidence-artifacts.json").read_text(encoding="utf-8"))["artifacts"]}
    upload_dir = LOCAL / "issuer-registry-r2-objects"
    upload_dir.mkdir(exist_ok=True)
    artifacts = {}
    for declaration in dossier["artifacts"]:
        if not declaration.get("reviewed_pages") and not declaration.get("reviewed_sections"):
            raise ValueError("Missing explicit review scope")
        path = LOCAL / declaration["label"]
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        previous = archived.get(declaration["label"])
        if previous and previous["content_hash"] != digest:
            raise ValueError("Archived artifact has changed; append a correction instead")
        if path.suffix == ".pdf" and not raw.startswith(b"%PDF-"):
            raise ValueError("Expected a PDF")
        url = previous["source_url"] if previous else declaration["source_url"]
        if urlparse(url).scheme != "https":
            raise ValueError("Expected an HTTPS evidence URL")
        fetched_at = previous["fetched_at"] if previous else datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat()
        needs_upload = not previous or previous.get("storage_upload_status") not in ("uploaded", "uploaded_and_listed")
        receipt_path = ROOT / "docs/catalog-review/r2-additional-readback-20261016.json"
        checked = None
        if receipt_path.exists():
            receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
            if receipt["bucket"] != "investing-pro-evidence-staging":
                raise ValueError("Unexpected archive bucket")
            checked = next((r for r in receipt["items"] if r["content_hash"] == digest and r["status"] == "sha256_readback_verified"), None)
            if checked:
                cached = LOCAL / "r2-readback-20261016" / digest
                if hashlib.sha256(cached.read_bytes()).hexdigest() != digest:
                    raise ValueError("Changed remote readback cache")
                needs_upload = False
        if needs_upload:
            (upload_dir / digest).write_bytes(raw)
        artifacts[declaration["key"]] = {**declaration, "source_url": url, "fetched_at": fetched_at,
            "content_hash": digest, "bytes": len(raw), "raw_storage_key": "catalog-evidence/sha256/" + digest,
            "source_record_id": identity("record:" + declaration["key"] + ":" + digest),
            "content_type": "application/pdf" if path.suffix == ".pdf" else "text/html; charset=utf-8",
            "upload_needed": needs_upload, "rights_status": "to_verify", "verification_status": "pending"}
        if checked:
            artifacts[declaration["key"]].update(r2_verified=True,r2_checked_at=checked["checked_at"],archival_receipt="r2-additional-readback-20261016.json")
    companies = dossier["companies"]
    if len({x["ticker"] for x in companies}) != len(companies) or len({x["enterprise_id"] for x in companies}) != len(companies):
        raise ValueError("Duplicate company identity")
    sources, records, entities, company_rows, listings = [], [], [], [], []
    for company in companies:
        ticker = company["ticker"]
        if not re.fullmatch(r"[A-Z0-9]{1,12}", ticker) or not re.fullmatch(r"\d{10}", company["enterprise_id"]):
            raise ValueError("Invalid reviewed identity")
        first_trade = date.fromisoformat(company["first_trading_date"])
        source = identity("source:" + ticker)
        cid = str(uuid.uuid5(uuid.NAMESPACE_URL, "investingpro:company:vn:" + company["enterprise_id"]))
        sources.append((source, f"issuer_registry_{ticker.lower()}_2026", company["legal_name"] + " – Hồ sơ registry chờ duyệt", company["legal_name"], "official_company", company["official_website"], "to_verify", "Chỉ chuẩn bị dữ kiện pháp nhân và registry từ tài liệu doanh nghiệp đã đọc. Chưa xác minh quyền phát hành; không cấp phép toàn website, báo cáo, ảnh, giá hoặc dữ liệu của nền tảng lưu file."))
        for key in company["supporting_artifacts"]:
            artifact = artifacts[key]
            if artifact["ticker"] != ticker or first_trade.isoformat() > artifact["fetched_at"][:10]:
                raise ValueError("Evidence belongs to another issuer or predates claimed first trade")
            records.append((artifact["source_record_id"], source, artifact["source_url"], artifact["source_url"], "issuer-registry:" + key, artifact["fetched_at"], artifact["content_type"], artifact["content_hash"], artifact["raw_storage_key"], "manual-document-review", "issuer-registry-v1", "incomplete"))
        identity_record = artifacts[company["identity_artifact"]]["source_record_id"]
        listing_record = artifacts[company["listing_artifact"]]["source_record_id"]
        support = " ".join(f"Bằng chứng bổ sung: {artifacts[k]['source_url']}." for k in company["supporting_artifacts"] if k != company["listing_artifact"])
        entities.append((cid, "company", slug(company["legal_name"]), company["legal_name"], identity_record, "incomplete"))
        company_rows.append((cid, company["legal_name"], company["enterprise_id"], company["official_website"], company["ir_url"]))
        listings.append((identity(f"listing:HOSE:{ticker}:{first_trade}"), cid, ticker, "HOSE", first_trade.isoformat(), listing_record, company["evidence_note"] + " " + support))
    if len({r[0] for r in records}) != len(records):
        raise ValueError("Duplicate evidence record")
    sql = ["-- Pending issuer-document registry proposals; not a seed or source approval.",
           "-- Confirm the three new raw objects were uploaded privately before applying.",
           "-- Existing archived PDF acquisition times are preserved. No asset mapping inferred.", "begin;"]

    def insert(table, columns, rows):
        sql.append(f"insert into {table}({columns}) values\n" + ",\n".join("(" + ",".join(map(literal, row)) + ")" for row in rows) + "\non conflict do nothing;")

    insert("core.sources", "id,code,name,owner,source_class,base_url,rights_status,rights_notes", sources)
    insert("core.source_records", "id,source_id,source_url,canonical_url,external_id,fetched_at,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status", records)
    insert("catalog.entities", "id,kind,slug,name,source_record_id,quality_status", entities)
    insert("catalog.companies", "id,legal_name,enterprise_id,official_website,ir_url", company_rows)
    insert("catalog.company_listings", "id,company_id,ticker,exchange,valid_from,source_record_id,evidence_excerpt", listings)
    sql.append("commit;\n")
    (ROOT / "supabase/imports/hose_registry.proposals.sql").write_text("\n".join(sql), encoding="utf-8")
    manifest = {"publication_status":"pending", "artifacts":list(artifacts.values()), "companies":[{**company, "company_id":row[0]} for company,row in zip(companies,company_rows)]}
    (ROOT / "docs/catalog-review/issuer-registry-proposals-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(companies)} HOSE proposals and {len(records)} evidence records; {sum(a['upload_needed'] for a in artifacts.values())} new uploads required.")


if __name__ == "__main__":
    compile_import()
