"""Index local public filings for manual catalog review, without publishing.

Reads the discovery journal created from the exchange UI and verifies PDF MIME,
hash, actual acquisition time and page count. Source rights and facts remain
pending until a reviewer completes the dossier. R2 presence is never assumed.
"""
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from pypdf import PdfReader

root = Path(".local/catalog-research")
discovered = json.loads((root / "hnx-discovered-reports.json").read_text(encoding="utf-8"))
urls = {}
for item in discovered:
    candidates = [u for u in item["reports"] if re.search(
        r"VI_|VN_|BAO_CAO_THUONG_NIEN|BaoCaoThuongNien|Baocaothuongnien|Bao_cao_thuong_nien|BC_thuong_nien|BCTN_2025", u, re.I
    ) and not re.search(r"_EN_|__Cong_bo|__cbtt_", u, re.I)]
    if candidates:
        urls[item["ticker"].lower() + "-2025.pdf"] = candidates[0]
urls.update({
    "gmd-2025.pdf": "https://www.gemadept.com.vn/wp-content/uploads/2026/04/20260418_GMD-AR_VN_SmartPDF01.pdf",
    "vsc-2025.pdf": "https://viconship.com/wp-content/uploads/2026/04/CBTT-Bao-cao-thuong-nien-nam-2025.pdf",
    "hah-2025.pdf": "https://haiants.vn/files/Quan_he_co_dong/Bao-cao-thuong-nien/HAH-Bao-cao-thuong-nien-nam-2025.pdf",
    "cct-2025.pdf": "https://owa.hnx.vn/ftp/cims/2026/4_W1/000000016093289_VI__BAO_CAO_THUONG_NIEN_2025.pdf",
    "dvp-2025.pdf": "https://dinhvuport.com.vn/userdata/IR/2026/15-20260313---DVP---BAO-CAO-THUONG-NIEN-NAM-2025.pdf",
    "tcl-2025.pdf": "https://tancanglogistics.com/quan-he-co-dong/Documents/20260319%20-%20TCL%20-%20BAO%20CAO%20THUONG%20NIEN%20202520260319161535.pdf",
    "pdn-2025.pdf": "https://storage-vnportal.vnpt.vn/bpc-khdn/3234/V%C4%83n%20b%E1%BA%A3n/20260330%20-%20PDN%20-%20Bao%20cao%20thuong%20nien-VI.pdf",
    "php-2025-full.pdf": "https://haiphongport.com.vn/FileUpload/Documents/bao_cao_thuong_nien_nam_2025pdf.pdf",
    "qnp-2025.pdf": "https://file.fpts.com.vn/FileStore2/File/EzIR/UploadFile/News/2026/03/18/File_1_1206_20260318_-_QNP_-_Bao_cao_thuong_nien_2025.pdf",
})
manifest = []
uploads = root / "r2-objects"
uploads.mkdir(exist_ok=True)
for filename, url in sorted(urls.items()):
    path = root / filename
    if not path.exists():
        continue
    data = path.read_bytes()
    if not data.startswith(b"%PDF-"):
        raise ValueError(f"Not a PDF: {filename}")
    digest = hashlib.sha256(data).hexdigest()
    (uploads / digest).write_bytes(data)
    manifest.append({
        "ticker": filename.split("-")[0].upper(), "local_file": str(path),
        "source_url": url, "content_type": "application/pdf",
        "content_hash": digest, "bytes": len(data),
        "fetched_at": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
        "published_at": None, "page_count": len(PdfReader(path).pages),
        "raw_storage_key": "catalog-evidence/sha256/" + digest,
        "r2_verified": False, "rights_status": "to_verify",
        "fact_review_status": "pending", "parser_version": "manual-catalog-review-v1",
        "note": "Candidate evidence only; no verified facts or storage presence inferred by this script.",
    })
(root / "evidence-index.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Indexed {len(manifest)} PDF artifacts; no source rights or facts approved.")
