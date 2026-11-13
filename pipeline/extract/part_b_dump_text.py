"""Dump per-page text and image counts of CEED question papers to find Part B pages."""
import sys, pathlib, pymupdf
raw = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
for pdf in sorted(raw.glob("*-qp*.pdf")):
    doc = pymupdf.open(pdf)
    with open(out / (pdf.stem + ".txt"), "w") as f:
        for i, p in enumerate(doc):
            f.write(f"\n===== PAGE {i+1} imgs={len(p.get_images())} =====\n")
            f.write(p.get_text())
    print(pdf.stem, len(doc))
