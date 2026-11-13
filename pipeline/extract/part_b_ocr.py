"""OCR every page of a scanned CEED paper with tesseract: part_b_ocr.py <pdf> <outtxt> <workdir>"""
import sys, subprocess, pathlib, pymupdf
pdf, out, work = sys.argv[1], pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
work.mkdir(parents=True, exist_ok=True)
doc = pymupdf.open(pdf)
with open(out, "w") as f:
    for i, page in enumerate(doc):
        png = work / f"p{i+1}.png"
        page.get_pixmap(dpi=200).save(png)
        txt = subprocess.run(["tesseract", str(png), "-", "--psm", "4"], capture_output=True, text=True).stdout
        f.write(f"\n===== PAGE {i+1} =====\n{txt}")
