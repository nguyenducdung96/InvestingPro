"""Offline research helper; never imports or verifies production facts.

Run with the bundled Python. Optional scan support requires
rapidocr_onnxruntime==1.4.4 in .local/ocr-runtime. OCR output is a discovery
aid: a reviewer must inspect the rendered page before approving a mapping.
"""
import argparse
import json
import sys
from pathlib import Path

from pypdf import PdfReader
import pypdfium2 as pdfium


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--pages", default="1-12", help="1-based range or comma-separated pages")
    parser.add_argument("--ocr", action="store_true")
    args = parser.parse_args()
    requested = []
    for part in args.pages.split(","):
        limits = list(map(int, part.split("-")))
        requested.extend(range(limits[0], limits[-1] + 1))
    reader = PdfReader(args.pdf)
    doc = pdfium.PdfDocument(args.pdf)
    output = args.pdf.parent / (args.pdf.stem + "-review")
    output.mkdir(exist_ok=True)
    engine = None
    if args.ocr:
        sys.path.insert(0, str(Path(".local/ocr-runtime").resolve()))
        from rapidocr_onnxruntime import RapidOCR
        engine = RapidOCR(intra_op_num_threads=2, inter_op_num_threads=1)
    for page_number in requested:
        if not 1 <= page_number <= len(reader.pages):
            raise ValueError(f"Invalid page: {page_number}")
        page = doc[page_number - 1]
        bitmap = page.render(scale=1.5)
        image = bitmap.to_pil()
        image_path = output / f"page-{page_number}.png"
        image.save(image_path)
        text = reader.pages[page_number - 1].extract_text()
        method = "pdf-text"
        if engine and len(text.strip()) < 100:
            result, _ = engine(str(image_path))
            text = "\n".join(item[1] for item in (result or []))
            method = "ocr-unreviewed"
        (output / f"page-{page_number}.json").write_text(json.dumps({
            "page": page_number, "method": method, "text": text,
            "verification_status": "pending", "rendered_page": str(image_path),
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{args.pdf.stem} page {page_number}: {method}, {len(text)} chars", flush=True)
        bitmap.close()
        page.close()
    doc.close()


if __name__ == "__main__":
    main()
