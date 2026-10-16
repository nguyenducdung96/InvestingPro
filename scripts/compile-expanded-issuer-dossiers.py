"""Build offline issuer dossiers and four pending registry imports.

Never contacts staging, approves records, or invents a mapping start date.
The portfolio manifest retains unresolved facts instead of emitting interests.
"""
import hashlib
import importlib.util
import json
import uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def identity(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "investingpro:expanded-registry-2026:" + key))


def literal(value):
    return "NULL" if value is None else "'" + str(value).replace("'", "''") + "'"


def terminal_id(number):
    if number in (38, 52):
        return "10000000-0000-0000-0000-" + ("000000000007" if number == 38 else "000000000016")
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"investingpro:505-2026:terminal:{number}"))


def compile_dossiers():
    artifacts = {a["artifact_label"]: a for a in read("docs/catalog-review/evidence-artifacts.json")["artifacts"]}
    portfolios = read("supabase/imports/data/company-portfolios.reviewed.json")
    portfolios["items"].extend(read("supabase/imports/data/additional-company-portfolios.reviewed.json")["items"])
    portfolios["scope"] = f"{len(portfolios['items'])} archived issuer dossiers; not an exhaustive market universe or current ownership certification"
    covered = {d["ticker"] for d in portfolios["items"]}
    portfolios["further_universe_research"] = [d for d in portfolios["further_universe_research"] if d["ticker"] not in covered]
    catalog = read("supabase/imports/data/505-commercial-catalog.reviewed.json")
    terminals = {t["number"]: t for t in catalog["terminals"]}
    seen = set()
    for dossier in portfolios["items"]:
        ticker = dossier["ticker"]
        if ticker in seen:
            raise ValueError(f"Duplicate ticker: {ticker}")
        seen.add(ticker)
        artifact = artifacts[dossier["artifact_label"]]
        raw = (ROOT / ".local/catalog-research" / dossier["artifact_label"]).read_bytes()
        if hashlib.sha256(raw).hexdigest() != artifact["content_hash"]:
            raise ValueError(f"Archived PDF hash mismatch: {ticker}")
        pages = dossier["reviewed_pages"]
        if not pages or any(not isinstance(p, int) or not 1 <= p <= artifact["page_count"] for p in pages):
            raise ValueError(f"Invalid page references: {ticker}")
        dossier["evidence"] = {k: artifact[k] for k in (
            "source_url", "content_hash", "fetched_at", "published_at", "raw_storage_key", "r2_verified", "rights_status"
        )}
        for support in dossier.get("supporting_artifacts", []):
            a = artifacts[support["artifact_label"]]
            raw = (ROOT / ".local/catalog-research" / support["artifact_label"]).read_bytes()
            if hashlib.sha256(raw).hexdigest() != a["content_hash"]:
                raise ValueError(f"Supporting artifact hash mismatch: {ticker}")
            if a["page_count"] is not None and (not support["reviewed_pages"] or any(
                not isinstance(p, int) or not 1 <= p <= a["page_count"] for p in support["reviewed_pages"]
            )):
                raise ValueError(f"Supporting pages not reviewed: {ticker}")
            support["evidence"] = {k: a[k] for k in (
                "source_url", "content_hash", "fetched_at", "published_at", "raw_storage_key", "r2_verified", "rights_status"
            )}
        dossier["reporting_period_end"] = "2025-12-31"
        dossier["publication_status"] = "research_only"
        dossier["current_status_verified"] = False
        for asset in dossier["assets"]:
            if "ownership_pct" in asset:
                raise ValueError(f"Corporate equity cannot be assigned to physical assets: {ticker}")
            if asset["effective_from"] is not None:
                date.fromisoformat(asset["effective_from"])
                if not asset.get("date_basis"):
                    raise ValueError(f"Missing date basis: {ticker}")
            if "terminal_number" in asset:
                number = asset["terminal_number"]
                terminal = terminals[number]
                subset = asset.get("berth_subset", [])
                if not set(subset).issubset(terminal["berths"]):
                    raise ValueError(f"Unknown berth subset: {ticker}")
                asset["canonical_terminal_id"] = terminal_id(number)
                asset["canonical_terminal_name"] = terminal["name"]
                asset["canonical_berth_ids"] = [str(uuid.uuid5(uuid.NAMESPACE_URL, f"investingpro:505-2026:berth:{number}:{terminal['berths'].index(name)+1}")) for name in subset]
            # Research observations never become temporal interests automatically.
            asset["sql_interest_generated"] = False
    # Research paths carry BOTH documents. A corporate stake alone never
    # creates an operator mapping, an effective date or a physical equity %.
    by_ticker = {d["ticker"]: d for d in portfolios["items"]}
    for parent in portfolios["items"]:
        parent["derived_candidates"] = []
        for interest in parent.get("corporate_interests", []):
            child_ticker = interest.get("company_ticker")
            if not child_ticker:
                continue
            if child_ticker == parent["ticker"] or child_ticker not in by_ticker:
                raise ValueError("Invalid corporate research edge")
            child = by_ticker[child_ticker]
            for asset in child["assets"]:
                parent["derived_candidates"].append(dict(
                    child_ticker=child_ticker, role="indirect", effective_from=None,
                    via=[*interest.get("via", [interest["company"]]), *asset["via"]],
                    terminal_number=asset.get("terminal_number"),
                    canonical_terminal_id=asset.get("canonical_terminal_id"),
                    canonical_berth_ids=asset.get("canonical_berth_ids", []),
                    berth_subset=asset.get("berth_subset", []),
                    name=asset.get("canonical_terminal_name", asset.get("name")),
                    asset_kind=asset.get("asset_kind", "terminal"),
                    evidence_path=[dict(ticker=d["ticker"], pages=d["reviewed_pages"], **d["evidence"]) for d in (parent,child)],
                    decision="requires_chain_and_period_review", sql_interest_generated=False,
                ))
    observations = [a for d in portfolios["items"] for a in d["assets"]]
    portfolios["universe_complete"] = False
    portfolios["coverage_summary"] = dict(
        issuer_dossiers=len(portfolios["items"]), asset_observations=len(observations),
        unique_matched_terminals=len({a["canonical_terminal_id"] for a in observations if a.get("canonical_terminal_id")}),
        observations_without_exact_effective_date=sum(a["effective_from"] is None for a in observations),
        indirect_research_paths=sum(len(d["derived_candidates"]) for d in portfolios["items"]),
        cloud_applied=False,
    )
    output = ROOT / "docs/catalog-review/company-portfolios-manifest.json"
    output.write_text(json.dumps(portfolios, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    rows = read("supabase/imports/data/additional-issuer-identities.reviewed.json")["items"]
    sql = ["-- OFFLINE PREPARED. Four pending issuer/listing dossiers; no approvals or asset interests.",
           "-- Historical first-trade dates reported by issuers; current exchange status still requires verification.", "begin;"]
    manifests = []
    spec = importlib.util.spec_from_file_location("catalog_compiler", ROOT / "scripts/compile-reviewed-catalog.py")
    compiler = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(compiler)
    slug = compiler.slug
    for row in rows:
        ticker = row["ticker"]
        artifact = artifacts[row["artifact_label"]]
        date.fromisoformat(row["first_trading_date"])
        if not set(row["reviewed_pages"]).issubset(next(d["reviewed_pages"] for d in portfolios["items"] if d["ticker"] == ticker)):
            raise ValueError(f"Registry pages not reviewed: {ticker}")
        source, record, company, listing = (identity(k) for k in (
            ticker + ":source", ticker + ":record:" + artifact["content_hash"], "company:" + row["enterprise_id"],
            ":".join((row["exchange"], ticker, row["first_trading_date"]))
        ))
        sql += [
            f"do $$ begin if exists(select 1 from catalog.companies where enterprise_id={literal(row['enterprise_id'])} and id<>{literal(company)}) or exists(select 1 from catalog.company_listings where exchange={literal(row['exchange'])} and ticker={literal(ticker)} and id<>{literal(listing)}) then raise exception '{ticker} identity already exists; reconcile before import'; end if; end $$;",
            "insert into core.sources(id,code,name,owner,source_class,base_url,rights_status,rights_notes) values",
            "(" + ",".join(map(literal, (source, ticker.lower()+"_annual_2025_registry_research", row["legal_name"]+" – Báo cáo thường niên 2025, chờ duyệt", row["legal_name"], "official_company", row["website"], "to_verify", "Phạm vi dữ kiện pháp nhân và ngày giao dịch theo báo cáo; chưa quyết định quyền sử dụng hoặc trạng thái hiện tại."))) + ") on conflict do nothing;",
            "insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,fetched_at,reporting_period_start,reporting_period_end,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status) values",
            "(" + ",".join(map(literal, (record, source, artifact["source_url"], artifact["source_url"], ticker+"-2025:registry", artifact["published_at"], artifact["fetched_at"], "2025-01-01", "2025-12-31", "application/pdf", artifact["content_hash"], artifact["raw_storage_key"], "manual-visual-review", "expanded-registry-v1", "incomplete"))) + ") on conflict do nothing;",
            "insert into catalog.entities(id,kind,slug,name,source_record_id,quality_status) values",
            "(" + ",".join(map(literal, (company, "company", slug(row["legal_name"]), row["legal_name"], record, "incomplete"))) + ") on conflict do nothing;",
            "insert into catalog.companies(id,legal_name,enterprise_id,official_website) values",
            "(" + ",".join(map(literal, (company, row["legal_name"], row["enterprise_id"], row["website"]))) + ") on conflict do nothing;",
            "insert into catalog.company_listings(id,company_id,ticker,exchange,valid_from,source_record_id,evidence_excerpt) values",
            "(" + ",".join(map(literal, (listing, company, ticker, row["exchange"], row["first_trading_date"], record, row["note"]))) + ") on conflict do nothing;"
        ]
        manifests.append(dict(**row, company_id=company, listing_id=listing, source_id=source, source_record_id=record, artifact=artifact))
    sql += ["commit;", "select ticker,exchange,valid_from,verification_status from catalog.company_listings where ticker in ('CAG','CCR','TCL','PNP') order by ticker;", ""]
    (ROOT / "supabase/imports/expanded_issuer_registry.proposals.sql").write_text("\n".join(sql), encoding="utf-8")
    (ROOT / "docs/catalog-review/expanded-issuer-registry-manifest.json").write_text(json.dumps(dict(publication_status="pending", cloud_applied=False, items=manifests), ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(f"Prepared {len(portfolios['items'])} research dossiers and {len(rows)} pending issuer/listing imports; no cloud changes.")


if __name__ == "__main__":
    compile_dossiers()
