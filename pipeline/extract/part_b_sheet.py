"""Render pages side by side into one contact sheet with a 50pt grid: part_b_sheet.py <pdf> <out.png> <dpi> <page,...>"""
import sys, pymupdf
from PIL import Image, ImageDraw
pdf, out, dpi, pages = sys.argv[1], sys.argv[2], int(sys.argv[3]), [int(x) for x in sys.argv[4].split(",")]
doc = pymupdf.open(pdf)
ims = []
for p in pages:
    pix = doc[p - 1].get_pixmap(dpi=dpi)
    im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    d = ImageDraw.Draw(im)
    s = dpi / 72
    for v in range(0, 900, 50):
        d.line([(v * s, 0), (v * s, im.height)], fill=(255, 150, 150), width=1)
        d.line([(0, v * s), (im.width, v * s)], fill=(255, 150, 150), width=1)
        d.text((v * s + 2, 2), str(v), fill=(255, 0, 0)); d.text((2, v * s + 2), str(v), fill=(255, 0, 0))
    d.text((im.width // 2, 2), f"p{p}", fill=(0, 0, 255))
    ims.append(im)
sheet = Image.new("RGB", (sum(i.width for i in ims), max(i.height for i in ims)), "white")
x = 0
for i in ims:
    sheet.paste(i, (x, 0)); x += i.width
sheet.save(out)
