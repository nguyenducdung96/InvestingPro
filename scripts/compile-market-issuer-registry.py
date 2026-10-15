"""Compile additional exchange-profile field excerpts into private proposals.

Indexed profile observations are not a live market-status certification. This
script never fetches, applies SQL, approves evidence or generates port interests.
"""
import hashlib
import json
import re
import unicodedata
import uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def identity(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "investingpro:market-registry-20261016:" + key))


def literal(value):
    return "NULL" if value is None else "'" + str(value).replace("'", "''") + "'"


def compile_import():
    data = json.loads((ROOT / "supabase/imports/data/market-issuer-registry.reviewed.json").read_text(encoding="utf-8"))
    sql = ["-- OFFLINE PROPOSALS ONLY. Indexed exchange-profile excerpts; not live market-status certification.",
           "-- Local-only evidence objects must be archived privately and checked before review.", "begin;"]
    manifest = []
    seen = set()
    for row in data["items"]:
        ticker = row["ticker"]
        if ticker in seen or not re.fullmatch(r"[A-Z]{3}", ticker):
            raise ValueError("Duplicate or invalid ticker")
        seen.add(ticker)
        raw = (ROOT / ".local/catalog-research" / row["artifact_label"]).read_bytes()
        if hashlib.sha256(raw).hexdigest() != row["content_hash"]:
            raise ValueError(f"Evidence hash mismatch: {ticker}")
        if row["current_status_verified"] or row["storage_status"] != "local_only":
            raise ValueError("This compiler does not certify live status or remote storage")
        date.fromisoformat(row["first_trading_date"])
        source, record, company, listing = (identity(k) for k in (
            ticker + ":source", ticker + ":record:" + row["content_hash"],
            "company:" + row["enterprise_id"], ":".join((ticker,row["exchange"],row["first_trading_date"]))
        ))
        normalized = unicodedata.normalize("NFKD", row["legal_name"].lower().replace("đ","d"))
        slug = re.sub(r"[^a-z0-9]+", "-", normalized.encode("ascii","ignore").decode()).strip("-")
        note = (f"Mã {ticker}; ngày giao dịch đầu tiên theo hồ sơ Sở: {row['first_trading_date']}. "
                f"Trạng thái kiểm soát quan sát: {row['control_status_observed']}; trạng thái giao dịch quan sát: {row['trading_status_observed']}. " + row["note"])
        sql += [
            f"do $$ begin if exists(select 1 from catalog.companies where enterprise_id={literal(row['enterprise_id'])} and id<>{literal(company)}) or exists(select 1 from catalog.company_listings where exchange={literal(row['exchange'])} and ticker={literal(ticker)} and id<>{literal(listing)}) then raise exception '{ticker} identity already exists; reconcile before import'; end if; end $$;",
            "insert into core.sources(id,code,name,owner,source_class,base_url,rights_status,rights_notes) values",
            "("+",".join(map(literal,(source,"market_registry_20261016_"+ticker.lower(),"HNX – Hồ sơ "+ticker+", bản trích trường chờ duyệt","Sở Giao dịch Chứng khoán Hà Nội","official_exchange","https://hnx.vn","to_verify",row["note"])))+") on conflict do nothing;",
            "insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,fetched_at,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status) values",
            "("+",".join(map(literal,(record,source,row["source_url"],row["source_url"],ticker+":indexed-profile-fields",row["published_at"],row["fetched_at"],row["content_type"],row["content_hash"],row["raw_storage_key"],"manual-indexed-profile-field-review","market-registry-v1","incomplete")))+") on conflict do nothing;",
            "insert into catalog.entities(id,kind,slug,name,source_record_id,quality_status) values",
            "("+",".join(map(literal,(company,"company",slug,row["legal_name"],record,"incomplete")))+") on conflict do nothing;",
            "insert into catalog.companies(id,legal_name,enterprise_id,official_website) values",
            "("+",".join(map(literal,(company,row["legal_name"],row["enterprise_id"],row["website"])))+") on conflict do nothing;",
            "insert into catalog.company_listings(id,company_id,ticker,exchange,valid_from,source_record_id,evidence_excerpt) values",
            "("+",".join(map(literal,(listing,company,ticker,row["exchange"],row["first_trading_date"],record,note)))+") on conflict do nothing;",
        ]
        manifest.append(dict(**row,company_id=company,listing_id=listing,source_id=source,source_record_id=record))
    sql += ["commit;", "select ticker,exchange,valid_from,verification_status from catalog.company_listings where ticker in ("+",".join(literal(r["ticker"]) for r in data["items"])+") order by ticker;", ""]
    (ROOT / "supabase/imports/market_issuer_registry.proposals.sql").write_text("\n".join(sql),encoding="utf-8")
    (ROOT / "docs/catalog-review/market-issuer-registry-manifest.json").write_text(json.dumps(dict(publication_status="pending",cloud_applied=False,items=manifest),ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Prepared {len(manifest)} pending issuer/listing histories; no cloud changes.")


if __name__ == "__main__":
    compile_import()
