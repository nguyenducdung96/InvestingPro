"""Compile an explicitly reviewed catalog dossier into a manual SQL import.

Offline only: no fetching, source-rights changes, admin impersonation, or mapping
verification. Existing reviewed decisions are never updated on replay.
"""
import json
import re
import unicodedata
import uuid
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "supabase/imports/data/505-commercial-catalog.reviewed.json"
OUTPUT = ROOT / "supabase/imports/505_commercial_catalog.reviewed.sql"
BASE = "10000000-0000-0000-0000-"
SOURCE = BASE + "000000000002"
PREVIOUS_RECORD = BASE + "000000000032"


def identity(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "investingpro:505-2026:" + key))


def slug(text):
    normalized = unicodedata.normalize("NFKD", text.lower().replace("đ", "d"))
    return re.sub(r"[^a-z0-9]+", "-", normalized.encode("ascii", "ignore").decode()).strip("-")


def literal(value):
    return "NULL" if value is None else "'" + str(value).replace("'", "''") + "'"


def compile_import():
    dossier = json.loads(DATA.read_text(encoding="utf-8"))
    terminals = dossier["terminals"]
    if any(t["visual_review"] != "reviewed_against_rendered_pdf" for t in terminals):
        raise ValueError("Only manually reviewed rows may be compiled")
    record = identity("source-record:commercial-visual-review-v1")
    nodes, ports, terminal_rows, berth_rows, mappings = [], [], [], [], []
    for name in sorted({t["port"] for t in terminals}):
        pid = BASE + "000000000006" if name == "Hải Phòng" else identity("port:" + name)
        nodes.append((pid, "port", "cang-bien-" + slug(name), "Cảng biển " + name, record, "verified"))
        ports.append((pid, BASE + "000000000005" if name == "Hải Phòng" else None, "marine"))
    for t in terminals:
        n = t["number"]
        tid = BASE + ("000000000007" if n == 38 else "000000000016") if n in (38, 52) else identity(f"terminal:{n}")
        pid = next(p[0] for p in ports if p[0] == (BASE + "000000000006" if t["port"] == "Hải Phòng" else identity("port:" + t["port"])))
        nodes.append((tid, "terminal", slug(t["name"]), t["name"], record, "verified"))
        terminal_rows.append((tid, pid))
        for i, name in enumerate(t["berths"], start=1):
            bid = BASE + f"{i + (7 if n == 38 else 17):012d}" if n in (38, 52) else identity(f"berth:{n}:{i}")
            display = name + " – " + t["name"].removeprefix("Bến cảng ")
            # Preserve the existing real-sample slugs and IDs on replay.
            bslug = f"chua-ve-cau-cang-{i}" if n == 38 else f"tan-vu-cau-cang-{i}" if n == 52 else slug(display)
            nodes.append((bid, "berth", bslug, display, record, "verified"))
            berth_rows.append((bid, tid))
        if n != 38:  # Existing reviewed Chùa Vẽ mapping ...0035 is immutable.
            pages = ", ".join(map(str, t["pages"]))
            note = f"Đối chiếu trực quan Quyết định 505/QĐ-BXD, phụ lục I, mục {n}, trang PDF {pages}: tên bến, nhóm cảng biển và các mục cầu cảng. Không xác nhận doanh nghiệp sở hữu/khai thác, ngày bắt đầu hoạt động hoặc tình trạng đang vận hành."
            if t.get("review_note"):
                note += " " + t["review_note"]
            mappings.append((identity(f"mapping:terminal:{n}"), tid, SOURCE, record, f"505-QD-BXD-2026:phu-luc-I:{n}", t["name"], dossier["effective_date"], "document_evidence", "1", note))
    ids = [n[0] for n in nodes]
    if len(ids) != len(set(ids)) or len({(n[1], n[2]) for n in nodes}) != len(nodes):
        raise ValueError("Duplicate entity ID or slug")
    for n in nodes:
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", n[2]):
            raise ValueError("Invalid slug")

    sql = ["-- Reviewed government catalog only. Not a seed or connector.",
           "-- Requires the previously verified private R2 artifact and source correction ...0032.",
           "-- Missing authorities remain NULL. Mapping decisions remain pending for admin review.",
           "begin;",
           f"do $$ begin if not exists(select 1 from core.source_records r join core.sources s on s.id=r.source_id where r.id='{PREVIOUS_RECORD}' and r.content_hash='{dossier['verified_raw_sha256']}' and r.quality_status='verified' and s.rights_status='approved') then raise exception 'Verified 505 evidence prerequisite missing'; end if; end $$;",
           "insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,fetched_at,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status)",
           f"select '{record}',source_id,source_url,canonical_url,'505-QD-BXD-2026:commercial-visual-review-v1',null,fetched_at,content_type,content_hash,raw_storage_key,'manual-visual-review','505-commercial-catalog-v1','verified' from core.source_records where id='{PREVIOUS_RECORD}' on conflict do nothing;"]

    def insert(table, columns, rows):
        sql.append(f"insert into {table}({columns}) values\n" + ",\n".join("(" + ",".join(map(literal, r)) + ")" for r in rows) + "\non conflict do nothing;")

    insert("catalog.entities", "id,kind,slug,name,source_record_id,quality_status", nodes)
    insert("port.ports", "id,authority_id,port_category", ports)
    insert("port.terminals", "id,port_id", terminal_rows)
    insert("port.berths", "id,terminal_id", berth_rows)
    insert("port.entity_mappings", "id,entity_id,verification_source_id,source_record_id,external_id,external_name,valid_from,resolution_method,confidence,evidence_excerpt", mappings)
    sql.append("commit;\n")
    OUTPUT.write_text("\n".join(sql), encoding="utf-8")
    print(f"Compiled {len(ports)} port groups, {len(terminal_rows)} terminals, {len(berth_rows)} berth entries; {len(mappings)} pending identity decisions.")


if __name__ == "__main__":
    compile_import()
