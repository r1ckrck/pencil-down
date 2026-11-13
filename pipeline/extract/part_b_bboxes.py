"""Print raster-image and drawing bounding boxes (PDF points) on given pages: part_b_bboxes.py <pdf> <page,...>"""
import sys, pymupdf
doc = pymupdf.open(sys.argv[1])
for p in [int(x) for x in sys.argv[2].split(",")]:
    page = doc[p - 1]
    print(f"-- page {p} size {page.rect}")
    for info in page.get_image_info():
        b = pymupdf.Rect(info["bbox"])
        if b.width > 15 and b.height > 15:
            print("  img", [round(v) for v in b])
    dr = page.get_drawings()
    if dr:
        u = pymupdf.Rect(dr[0]["rect"])
        for d in dr[1:]:
            u |= d["rect"]
        print(f"  drawings n={len(dr)} union", [round(v) for v in u])
