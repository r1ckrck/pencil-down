"""Crop Part B stimulus images from the official CEED papers.

Usage: part_b_crop_images.py <raw_dir> <out_dir>
Each crop is rendered at 2x (144 dpi) from a page clip and trimmed to its content.
Rects are PDF points (x0, y0, x1, y1), or page fractions when frac=True (scanned papers).
"""
import sys, pathlib, pymupdf
from PIL import Image, ImageOps

# (output stem, paper file stem, page, rect, frac)
CROPS = [
    ("ceed-2010-b-q1-1", "2010-qp", 5, (70, 455, 540, 712), False),
    ("ceed-2010-b-q4a-1", "2010-qp", 13, (72, 250, 523, 505), False),
    ("ceed-2010-b-q4b-1", "2010-qp", 14, (86, 140, 538, 479), False),
    ("ceed-2010-b-q5-1", "2010-qp", 18, (86, 261, 537, 657), False),
    ("ceed-2011-b-q1a-1", "2011-qp", 5, (0.12, 0.12, 0.9, 0.33), True),
    ("ceed-2011-b-q1b-1", "2011-qp", 7, (0.12, 0.13, 0.86, 0.89), True),
    ("ceed-2011-b-q3-1", "2011-qp", 10, (0.2, 0.2, 0.72, 0.5), True),
    ("ceed-2011-b-q4-1", "2011-qp", 14, (0.08, 0.18, 0.8, 0.6), True),
    ("ceed-2013-b-q3-1", "2013-qp", 21, (89, 144, 521, 435), False),
    ("ceed-2014-b-q2-1", "2014-qp", 19, (73, 180, 425, 451), False),
    ("ceed-2015-b-q3-1", "2015-qp", 25, (74, 72, 542, 306), False),
    ("ceed-2017-b-q1-1", "2017-qp", 25, (74, 478, 231, 585), False),
    ("ceed-2018-b-q8-1", "2018-qp", 29, (68, 158, 552, 347), False),
    ("ceed-2019-b-q7-1", "2019-qp", 27, (70, 298, 506, 615), False),
    ("ceed-2019-b-q8-1", "2019-qp", 28, (74, 354, 300, 676), False),
    ("ceed-2020-b-q1-1", "2020-qp", 22, (74, 202, 393, 441), False),
    ("ceed-2020-b-q2-1", "2020-qp", 23, (74, 136, 244, 340), False),
    ("ceed-2020-b-q3-1", "2020-qp", 23, (110, 503, 354, 669), False),
    ("ceed-2020-b-q4-1", "2020-qp", 24, (72, 170, 260, 355), False),
    ("ceed-2020-b-q5-1", "2020-qp", 24, (74, 572, 354, 676), False),
    ("ceed-2021-b-q1-1", "2021-qp", 24, (74, 307, 194, 531), False),
    ("ceed-2021-b-q2-1", "2021-qp", 25, (72, 186, 232, 370), False),
    ("ceed-2021-b-q3-1", "2021-qp", 26, (74, 142, 517, 377), False),
    ("ceed-2021-b-q4-1", "2021-qp", 27, (74, 159, 405, 486), False),
    ("ceed-2021-b-q5-1", "2021-qp", 28, (74, 126, 386, 360), False),
    ("ceed-2022-b-q4-1", "2022-qp", 27, (72, 169, 518, 599), False),
    ("ceed-2022-b-q5-1", "2022-qp", 28, (72, 99, 517, 375), False),
    ("ceed-2023-b-q2-1", "2023-qp", 26, (72, 203, 430, 536), False),
    ("ceed-2023-b-q4-1", "2023-qp", 28, (72, 220, 523, 523), False),
    ("ceed-2023-b-q5-1", "2023-qp", 29, (72, 152, 524, 453), False),
    ("ceed-2024-b-q3-1", "2024-qp", 24, (152, 134, 459, 260), False),
    ("ceed-2024-b-q4-1", "2024-qp", 24, (94, 434, 364, 618), False),
    ("ceed-2024-b-q5-1", "2024-qp", 25, (137, 149, 474, 374), False),
    ("ceed-2025-b-q2-1", "2025-qp", 28, (72, 209, 483, 492), False),
    ("ceed-2025-b-q3-1", "2025-qp", 29, (72, 256, 523, 557), False),
    ("ceed-2025-b-q4-1", "2025-qp", 30, (107, 163, 488, 373), False),
    ("ceed-2025-b-q5-1", "2025-qp", 31, (89, 123, 507, 402), False),
    ("ceed-2026-b-q2-1", "2026-qp", 26, (72, 286, 503, 432), False),
]

PAD = 8


def trim(im: Image.Image) -> Image.Image:
    """Trim near-white margins, keeping a small pad."""
    grey = ImageOps.invert(im.convert("L")).point(lambda v: 255 if v > 25 else 0)
    box = grey.getbbox()
    if not box:
        return im
    x0, y0, x1, y1 = box
    return im.crop((max(0, x0 - PAD), max(0, y0 - PAD), min(im.width, x1 + PAD), min(im.height, y1 + PAD)))


def main() -> None:
    raw, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    docs: dict[str, pymupdf.Document] = {}
    for stem, paper, page_no, rect, frac in CROPS:
        doc = docs.setdefault(paper, pymupdf.open(raw / f"{paper}.pdf"))
        page = doc[page_no - 1]
        r = page.rect
        clip = pymupdf.Rect(
            *(r.x0 + rect[0] * r.width, r.y0 + rect[1] * r.height, r.x0 + rect[2] * r.width, r.y0 + rect[3] * r.height)
            if frac else rect
        )
        pix = page.get_pixmap(dpi=144, clip=clip)
        im = trim(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
        im.save(out / f"{stem}.png", optimize=True)
        print(stem, im.size)


if __name__ == "__main__":
    main()
