"""Combine prepared private proposals for a user's manual SQL Editor import.

Only prepares a local file. Does not connect to cloud, authenticate or approve
anything. Prerequisite catalog/HNX proposals must already exist.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def prepare():
    chunks = []
    for filename in ("pap_assets.proposals.sql", "vsc_registry.proposals.sql"):
        lines = (ROOT / "supabase/imports" / filename).read_text(encoding="utf-8").splitlines()
        if lines.count("begin;") != 1 or lines.count("commit;") != 1:
            raise ValueError("Unexpected transaction structure: " + filename)
        chunks.append("-- " + filename + "\n" + "\n".join(line for line in lines if line not in ("begin;", "commit;")))
    header = (
        "-- USER HANDOFF: pending catalog data only, no publication or review decisions.\n"
        "-- Prerequisites: existing 505 catalog and HNX registry imports, private archived PAP/VSC evidence.\n"
        "-- All-or-nothing import; do not run until evidence storage is checked.\n"
        "begin;\n"
    )
    check = """
commit;
-- Expected: PAP 3 pending, VSC 1 pending; this does not mean they are public.
select 'PAP berth proposals' as item,count(*)::int as rows,
       count(*) filter(where verification_status='pending')::int as pending
from port.company_asset_interests
where id in ('9262dc99-9352-54bf-8f3f-ebf494996aa1','435f5a9c-6042-5d5f-b8cf-31b5e96b8e0a','f48acef2-fa7b-5673-bbcc-e10770b20d48')
union all
select 'VSC listing',count(*)::int,count(*) filter(where verification_status='pending')::int
from catalog.company_listings where exchange='HOSE' and ticker='VSC';
"""
    target = ROOT / "supabase/imports/slice1_additional_catalog.handoff.sql"
    target.write_text(header + "\n\n".join(chunks) + "\n" + check, encoding="utf-8")
    print("Prepared atomic, private-data-only manual handoff: " + str(target))


if __name__ == "__main__":
    prepare()
