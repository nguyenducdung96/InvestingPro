"""Prepare five issuer identities using separate identity/listing evidence.

No invented listing is emitted when its historical effective date is unknown.
"""
import hashlib
import json
import re
import unicodedata
import uuid
from datetime import date
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def identity(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL,"investingpro:issuer-identities-20261016:"+key))


def literal(value):
    return "NULL" if value is None else "'"+str(value).replace("'","''")+"'"


def compile_import():
    artifacts={a["artifact_label"]:a for a in json.loads((ROOT/"docs/catalog-review/evidence-artifacts.json").read_text(encoding="utf-8"))["artifacts"]}
    rows=json.loads((ROOT/"supabase/imports/data/final-issuer-identities.reviewed.json").read_text(encoding="utf-8"))["items"]
    sql=["-- OFFLINE PENDING IDENTITIES. Separate legal identity and historical listing evidence.","-- Historical listings do not certify current trading status. No cloud approval or interests.","begin;"]
    manifest=[]
    for row in rows:
        ticker=row["ticker"];company=identity("company:"+row["enterprise_id"])
        if row["first_trading_date"]:
            date.fromisoformat(row["first_trading_date"])
            if not row["listing_artifact"] or not row["note"].strip():
                raise ValueError("Missing listing evidence: " + ticker)
        listing=identity(ticker+":"+str(row["first_trading_date"])) if row["first_trading_date"] else None
        guard=f"exists(select 1 from catalog.companies where enterprise_id={literal(row['enterprise_id'])} and id<>{literal(company)})"
        if listing:guard+=f" or exists(select 1 from catalog.company_listings where exchange={literal(row['exchange'])} and ticker={literal(ticker)} and id<>{literal(listing)})"
        sql.append(f"do $$ begin if {guard} then raise exception '{ticker} identity already exists; reconcile before import'; end if; end $$;")
        records={}
        for name in dict.fromkeys([row["identity_artifact"],row["listing_artifact"]]):
            if name is None:continue
            a=artifacts[name];raw=(ROOT/".local/catalog-research"/name).read_bytes()
            if hashlib.sha256(raw).hexdigest()!=a["content_hash"]:raise ValueError("Changed evidence: "+name)
            for kind in ("identity", "listing"):
                if row[kind+"_artifact"] != name:
                    continue
                pages = row[kind+"_pages"]
                if a["page_count"] is not None and (not pages or any(type(p) is not int or not 1 <= p <= a["page_count"] for p in pages)):
                    raise ValueError("Invalid reviewed pages: " + ticker + ":" + kind)
            source=identity(ticker+":source:"+name);record=identity(ticker+":record:"+a["content_hash"])
            records[name]=record
            owner="Sở Giao dịch Chứng khoán Thành phố Hồ Chí Minh" if name=="hose-2019-factbook.pdf" else row["legal_name"]
            source_class="official_exchange" if name=="hose-2019-factbook.pdf" else "official_company"
            base="https://hsx.vn" if source_class=="official_exchange" else row["website"]
            sql += ["insert into core.sources(id,code,name,owner,source_class,base_url,rights_status,rights_notes) values",
                "("+",".join(map(literal,(source,"issuer_identity_20261016_"+ticker.lower()+"_"+re.sub(r'[^a-z0-9]+','_',name),ticker+" – "+name+", chờ duyệt",owner,source_class,base,"to_verify",row["note"])))+") on conflict do nothing;",
                "insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,fetched_at,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status) values",
                "("+",".join(map(literal,(record,source,a["source_url"],a["source_url"],ticker+":"+name,a["published_at"],a["fetched_at"],a["content_type"],a["content_hash"],a["raw_storage_key"],"manual-issuer-identity-review","issuer-identities-v1","incomplete")))+") on conflict do nothing;"]
        normalized=unicodedata.normalize("NFKD",row["legal_name"].lower().replace("đ","d"))
        slug=re.sub(r'[^a-z0-9]+','-',normalized.encode('ascii','ignore').decode()).strip('-')
        sql += ["insert into catalog.entities(id,kind,slug,name,source_record_id,quality_status) values",
            "("+",".join(map(literal,(company,"company",slug,row["legal_name"],records[row["identity_artifact"]],"incomplete")))+") on conflict do nothing;",
            "insert into catalog.companies(id,legal_name,enterprise_id,official_website) values",
            "("+",".join(map(literal,(company,row["legal_name"],row["enterprise_id"],row["website"])))+") on conflict do nothing;"]
        if listing:
            sql += ["insert into catalog.company_listings(id,company_id,ticker,exchange,valid_from,source_record_id,evidence_excerpt) values",
                "("+",".join(map(literal,(listing,company,ticker,row["exchange"],row["first_trading_date"],records[row["listing_artifact"]],row["note"])))+") on conflict do nothing;"]
        manifest.append(dict(**row,company_id=company,listing_id=listing,source_records=records,current_status_verified=False))
    sql += ["commit;",""]
    (ROOT/"supabase/imports/final_issuer_identities.proposals.sql").write_text("\n".join(sql),encoding="utf-8")
    (ROOT/"docs/catalog-review/final-issuer-identities-manifest.json").write_text(json.dumps(dict(publication_status="pending",cloud_applied=False,items=manifest),ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Prepared {len(rows)} pending identities and {sum(r['first_trading_date'] is not None for r in rows)} historical listings; no cloud changes.")


if __name__=="__main__":compile_import()
