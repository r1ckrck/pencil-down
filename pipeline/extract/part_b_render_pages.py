"""Render given PDF pages to PNG for visual inspection: part_b_render_pages.py <pdf> <outdir> <dpi> <page,page,...>"""
import sys, pathlib, pymupdf
pdf, out, dpi, pages = sys.argv[1], pathlib.Path(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
out.mkdir(parents=True, exist_ok=True)
doc = pymupdf.open(pdf)
stem = pathlib.Path(pdf).stem
for p in [int(x) for x in pages.split(",")]:
    doc[p - 1].get_pixmap(dpi=dpi).save(out / f"{stem}-p{p}.png")
