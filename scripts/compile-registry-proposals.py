"""Build a private, pending listing import from reviewed exchange observations.

Offline only. Does not fetch, upload, grant source rights or verify listings.
Raw DOM snapshots must be archived privately before applying the SQL.
"""
import hashlib
import json
import re
import unicodedata
import uuid
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / ".local/catalog-research"
SOURCE = str(uuid.uuid5(uuid.NAMESPACE_URL, "investingpro:registry-hnx-2026:source"))


def identity(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "investingpro:registry-hnx-2026:" + key))


def literal(value):
    return "NULL" if value is None else "'" + str(value).replace("'", "''") + "'"


def slug(name):
    text = unicodedata.normalize("NFKD", name.lower().replace("đ", "d"))
    return re.sub(r"[^a-z0-9]+", "-", text.encode("ascii", "ignore").decode()).strip("-")


def compile_import():
    observations = json.loads((ROOT / "docs/catalog-review/registry-exchange-observations.json").read_text(encoding="utf-8"))["observations"]
    upload_dir = RESEARCH / "registry-r2-objects"
    upload_dir.mkdir(exist_ok=True)
    manifest, records, entities, companies, listings = [], [], [], [], []
    for item in observations:
        ticker, exchange = item["ticker"], item["exchange"]
        if not re.fullmatch(r"[A-Z0-9]{1,12}", ticker) or exchange not in ("HNX", "UPCOM"):
            raise ValueError("Unreviewed ticker or exchange")
        fields = item["fields"]
        if fields["Mã CK"] != f"Mã CK {ticker}":
            raise ValueError("Ticker does not match the reviewed field")
        source_url = urlparse(item["source_url"])
        if source_url.scheme != "https" or source_url.hostname not in ("hnx.vn", "www.hnx.vn") or source_url.query:
            raise ValueError("Expected the reviewed canonical exchange profile URL")
        name = fields["Tên TCPH"].removeprefix("Tên TCPH ").strip()
        observed_state = fields["Trạng thái giao dịch"].removeprefix("Trạng thái giao dịch ").strip()
        raw_date = fields["Ngày GD đầu tiên"].removeprefix("Ngày GD đầu tiên ")
        first_trade = datetime.strptime(raw_date, "%d/%m/%Y").date().isoformat()
        observed_at = item["captured_at"]
        if first_trade > observed_at[:10]:
            raise ValueError("First trading date is after observation")
        raw_path = RESEARCH / f"{ticker.lower()}-profile.snapshot.txt"
        raw = raw_path.read_bytes()
        text = raw.decode("utf-8")
        if not all(value in text for value in (ticker, name, raw_date, observed_state)):
            raise ValueError(f"Observation does not match original snapshot: {ticker}")
        digest = hashlib.sha256(raw).hexdigest()
        (upload_dir / digest).write_bytes(raw)
        record = identity(f"source-record:{ticker}:{digest}")
        company = "10000000-0000-0000-0000-000000000017" if ticker == "PHP" else identity("company:" + ticker)
        key = "catalog-evidence/sha256/" + digest
        note = (f"Hồ sơ HNX, {name}, mã {ticker}, thị trường {exchange}: ngày giao dịch đầu tiên {raw_date}; "
                f"trạng thái quan sát ‘{observed_state}’ tại {observed_at}. valid_from là ngày giao dịch đầu tiên, "
                "không phải ngày quyết định. Bằng chứng DOM đã đối chiếu thủ công; không khẳng định lịch sử chuyển sàn, "
                "không xác nhận quan hệ tài sản. Chờ đánh giá quyền sử dụng nguồn và quyết định admin.")
        manifest.append({"ticker": ticker, "exchange": exchange, "legal_name": name,
                         "first_trading_date": first_trade, "observed_at": observed_at,
                         "source_url": item["source_url"], "content_hash": digest,
                         "bytes": len(raw), "content_type": "text/plain; charset=utf-8",
                         "raw_storage_key": key, "source_record_id": record,
                         "company_id": company, "listing_id": identity(f"listing:{exchange}:{ticker}:{first_trade}"),
                         "rights_status": "to_verify", "verification_status": "pending"})
        receipt_path = ROOT / "docs/catalog-review/r2-additional-readback-20261016.json"
        if receipt_path.exists():
            receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
            if receipt["bucket"] != "investing-pro-evidence-staging":
                raise ValueError("Unexpected archive bucket")
            checked = next((r for r in receipt["items"] if r["content_hash"] == digest and r["status"] == "sha256_readback_verified"), None)
            if checked:
                cached = RESEARCH / "r2-readback-20261016" / digest
                if hashlib.sha256(cached.read_bytes()).hexdigest() != digest:
                    raise ValueError("Changed remote readback cache")
                manifest[-1].update(r2_verified=True,r2_checked_at=checked["checked_at"],archival_receipt="r2-additional-readback-20261016.json")
        records.append((record, SOURCE, item["source_url"], item["source_url"], f"hnx-profile:{ticker}:2026-10-15", observed_at, "text/plain; charset=utf-8", digest, key, "manual-dom-snapshot", "registry-proposals-v1", "incomplete"))
        entities.append((company, "company", slug(name), name, record, "incomplete"))
        companies.append((company, name))
        listings.append((manifest[-1]["listing_id"], company, ticker, exchange, first_trade, record, note))
    if len({x["ticker"] for x in manifest}) != len(manifest):
        raise ValueError("Duplicate ticker")
    sql = ["-- Private research proposals, NOT approved data or a seed.",
           "-- Archive all snapshot hashes in the private R2 bucket before applying.",
           "-- No source rights, entity quality, listing or asset relationship is auto-approved.", "begin;",
           "insert into core.sources(id,code,name,owner,source_class,base_url,rights_status,rights_notes,terms_url) values",
           f"('{SOURCE}','hnx_registry_research_2026','HNX – Hồ sơ chứng khoán, chờ duyệt quyền sử dụng','Sở Giao dịch Chứng khoán Hà Nội','official_exchange','https://www.hnx.vn','to_verify','Nghiên cứu nội bộ từ hồ sơ công khai. Footer HNX yêu cầu liên hệ khi phát hành thông tin website; chưa xác minh quyền phát hành cho dự án. Không dùng cho dữ liệu giá hoặc tự mở nguồn công khai.','https://hnx.vn/vi-vn/khuyen-cao.html') on conflict do nothing;"]

    def insert(table, columns, rows):
        sql.append(f"insert into {table}({columns}) values\n" + ",\n".join("(" + ",".join(map(literal, r)) + ")" for r in rows) + "\non conflict do nothing;")

    insert("core.source_records", "id,source_id,source_url,canonical_url,external_id,fetched_at,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status", records)
    insert("catalog.entities", "id,kind,slug,name,source_record_id,quality_status", entities)
    insert("catalog.companies", "id,legal_name", companies)
    insert("catalog.company_listings", "id,company_id,ticker,exchange,valid_from,source_record_id,evidence_excerpt", listings)
    sql.append("commit;\n")
    (ROOT / "supabase/imports/hnx_registry.proposals.sql").write_text("\n".join(sql), encoding="utf-8")
    (ROOT / "docs/catalog-review/registry-proposals-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(manifest)} pending listings; source rights remain to_verify. Upload directory: {upload_dir}")


if __name__ == "__main__":
    compile_import()
