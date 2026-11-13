"""Extract the objective (single-answer) questions from the CEED 2010-2014 papers.

These papers have no official keys, so every answer is solved by hand and stored with its
explanation in ceed_part_a_tags_2010_2014.json (answerStatus "solved"). A question the
solver was not confident about is listed there under "excluded" with its reason and is
not written. A solved question kept for its paper but never served in mocks, drills or
revisit (no single defensible key) carries an "excluded" reason on its own entry, copied
to the record.

Paper shapes:
  2010, 2011  one pen-and-paper booklet; only Q1 (Visual Perception) holds short items, most
              of them drawn or sequenced. The single-answer items are cropped from fixed
              rectangles (MANUAL). 2011 is a scan, and its Q1.6 options are unlabelled boxes,
              so A-D labels are stamped under them.
  2012        Part A, 40 MCQs (A-D), 50 marks. Scan: anchors ("Q. 7.") come from OCR.
  2013        Part A, 50 MCQs, +2 / -0.5. Anchors "Question No. N"; options printed 1-4,
              stored as A-D in order.
  2014        Part A, 50 MCQs (A-D), +2 / -0.5. Anchors "Q1:", "Q 10:", "Q13.".

Not printed in any of these papers, so set by inference: Part A duration (60 min, the
length of Part A since 2015), the 2012 per-question mark (50 marks / 40 questions = 1.25)
and the absence of negative marking in 2010-2012.

Run: pipeline/.venv/bin/python -I pipeline/extract/ceed_part_a_2010_2014.py
"""
import json
import re
import sys
from pathlib import Path

import io

import pymupdf
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I leaves the script dir off sys.path
from ceed_part_a import (IMAGES, MAX_WIDTH, PAD, PART_A, RAW, ZOOM, ocr_words, question_regions, render,
                         save_webp, text_lines)

TAGS = Path(__file__).with_name("ceed_part_a_tags_2010_2014.json")


def scheme(correct, wrong, natural=None):
    return {
        "NAT": {"correct": natural or correct, "wrong": 0},
        "MCQ": {"correct": correct, "wrong": wrong},
        "MSQ": {"correct": correct, "wrong": wrong, "partial": False},
    }


# count = objective single-answer items in the paper; total = their printed marks.
# The 2010-2011 booklets have no objective section (their other Q1 items are drawn or
# sequenced), so a "past paper" of one or two items is never offered.
PAPERS = {
    2010: dict(count=2, total=4, duration=60, scheme=scheme(2, 0)),  # Q1.1 (2), Q1.6 (2)
    2011: dict(count=1, total=1, duration=60, scheme=scheme(1, 0)),  # Q1.6 (1)
    2012: dict(count=40, total=50, duration=60, scheme=scheme(1.25, 0)),
    2013: dict(count=50, total=100, duration=60, scheme=scheme(2, -0.5)),
    2014: dict(count=50, total=100, duration=60, scheme=scheme(2, -0.5)),
}

# (year, qno) -> [(page_index, Rect in pt)] for the booklet years. qno is the Q1 sub-item.
MANUAL = {
    # 1.1 three developed views, pick the wrong one: three options, so excluded (see tags)
    (2010, 1): [(1, pymupdf.Rect(80, 210, 540, 780))],
    # 1.6 heading sits at the foot of page 5, stem and figure on page 6
    (2010, 6): [(4, pymupdf.Rect(80, 752, 520, 774)), (5, pymupdf.Rect(80, 76, 520, 388))],
    (2011, 6): [(5, pymupdf.Rect(90, 712, 1160, 1590))],
}
# Option labels as printed, when not A-D; they map to A-D in order.
OPTION_LABELS = {2013: ["1", "2", "3", "4"]}

STAMP = {  # crops whose option boxes carry no printed label: stamp A-D centred under each box
    (2011, 6): True,
}

ANCHOR = {
    2013: re.compile(r"^Question No\.\s*(\d{1,2})\b"),
    2014: re.compile(r"^Q\s*(\d{1,2})\s*[:.]"),
}
STOP = re.compile(r"Part\s*-?\s*B", re.I)
SKEW = 11  # pt, 2012 scan lean allowance


def find_marks(doc, year):
    pages = []
    for page in doc:
        h = page.rect.height
        anchors, stops, footer = [], [], h - 30
        if year == 2012:
            words = list(ocr_words(page))
            for k, (r, w) in enumerate(words):
                if r.y0 > h - 70 and w.startswith("CEED"):
                    footer = min(footer, r.y0 - 4)
                if r.x0 > 110:
                    continue
                m = re.match(r"^Q\.?(\d{1,2})?[.,]?", w)
                if w.startswith("Q") and m:
                    num = m.group(1)
                    if not num and k + 1 < len(words):
                        num = (re.match(r"(\d{1,2})", words[k + 1][1]) or [None, None])[1]
                    if num:
                        # the scans lean: a line's right end sits up to ~10 pt above its left
                        # end, so cut that much higher than the margin anchor
                        anchors.append((r.y0 - SKEW, int(num)))
                elif STOP.match(w):
                    stops.append(r.y0 - SKEW)
        else:
            for r, t in text_lines(page):
                if r.y0 > h - 70 and re.fullmatch(r"\d{1,2}", t):
                    footer = min(footer, r.y0 - 4)
                if r.x0 > 100:
                    continue
                m = ANCHOR[year].match(t)
                if m:
                    anchors.append((r.y0, int(m.group(1))))
                elif STOP.search(t) and "CEED" in t:
                    stops.append(r.y0)
        pages.append(dict(anchors=sorted(anchors), stops=sorted(stops), gifs=[], footer=footer))
    return pages


def clean_box(im):
    """Content bbox of a scanned tile, ignoring isolated scanner specks."""
    ink = im.convert("L").point(lambda v: 255 if v < 150 else 0)
    ink = ink.filter(ImageFilter.MedianFilter(5))
    w, h = ink.size
    data = ink.tobytes()
    rows = [data[y * w:(y + 1) * w].count(255) for y in range(h)]
    # group inked rows into bands split by >= 40 px of blank; drop faint bands (stray
    # scanner marks) from both ends
    bands, start, last = [], None, None
    for y, n in enumerate(rows):
        if n:
            if start is None or y - last > 40:
                if start is not None:
                    bands.append((start, last))
                start = y
            last = y
    if start is None:
        return None
    bands.append((start, last))
    weight = lambda b: sum(rows[b[0]:b[1] + 1])
    while len(bands) > 1 and weight(bands[-1]) < 300:
        bands.pop()
    while len(bands) > 1 and weight(bands[0]) < 300:
        bands.pop(0)
    top, bottom = bands[0][0], bands[-1][1] + 1
    box = ink.crop((0, top, w, bottom)).getbbox()
    return (box[0], top, box[2], bottom) if box else None


def render_scan(doc, parts):
    """render() for scanned pages: same stacking, but trimmed against speck noise."""
    tiles = []
    for p, rect in parts:
        pix = doc[p].get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM), clip=rect, alpha=False)
        im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        box = clean_box(im)
        if box:
            tiles.append(im.crop((max(0, box[0] - 12), box[1], min(im.width, box[2] + 12), box[3])))
    width = max(t.width for t in tiles)
    sheet = Image.new("RGB", (width, sum(t.height for t in tiles) + PAD * (len(tiles) - 1)), "white")
    y = 0
    for t in tiles:
        sheet.paste(t, (0, y))
        y += t.height + PAD
    out = Image.new("RGB", (sheet.width + 2 * PAD, sheet.height + 2 * PAD), "white")
    out.paste(sheet, (PAD, PAD))
    if out.width > MAX_WIDTH:
        out = out.resize((MAX_WIDTH, round(out.height * MAX_WIDTH / out.width)), Image.LANCZOS)
    return out


def crop(doc, year, qno, parts):
    img = (render_scan if year in (2011, 2012) else render)(doc, parts)
    return stamp_labels(img) if STAMP.get((year, qno)) else img


def stamp_labels(img):
    """Label the four option boxes A-D (left to right) under their bottom edge."""
    g = img.convert("L")
    w, h = g.size
    # option boxes: the lowest band of dark pixels; split it into four runs of columns
    rows = [y for y in range(h) if sum(1 for x in range(0, w, 2) if g.getpixel((x, y)) < 120) > 8]
    bottom = max(rows)
    band_top = bottom - int(h * 0.06)
    cols = [x for x in range(w) if any(g.getpixel((x, y)) < 120 for y in range(band_top, bottom + 1, 2))]
    runs, start = [], cols[0]
    for a, b in zip(cols, cols[1:]):
        if b - a > 20:
            runs.append((start, a))
            start = b
    runs.append((start, cols[-1]))
    if len(runs) != 4:
        raise SystemExit(f"stamp: found {len(runs)} option boxes")
    pad = 70
    out = img.crop((0, 0, w, h + pad)).copy()
    out.paste((255, 255, 255), (0, h, w, h + pad))
    d = ImageDraw.Draw(out)
    font = ImageFont.load_default(size=34)
    for label, (x0, x1) in zip("ABCD", runs):
        t = f"({label})"
        tw = d.textlength(t, font=font)
        d.text(((x0 + x1) / 2 - tw / 2, bottom + 14), t, fill="black", font=font)
    return out


def answer_of(fmt, value):
    if fmt == "NAT":
        lo, hi = (value, value) if not isinstance(value, list) else value
        return {"kind": "NAT", "min": lo, "max": hi}
    if fmt == "MSQ":
        return {"kind": "MSQ", "options": sorted(value)}
    return {"kind": "MCQ", "option": value}


def preview(out):
    """Render every candidate crop to `out` for solving and review, ignoring the tags file."""
    out.mkdir(parents=True, exist_ok=True)
    for year, cfg in PAPERS.items():
        doc = pymupdf.open(RAW / f"{year}-qp.pdf")
        if year in (2010, 2011):
            regions = [(q, parts, False) for (y, q), parts in MANUAL.items() if y == year]
        else:
            regions = question_regions(doc, find_marks(doc, year), cfg["count"])
        for qno, parts, _ in regions:
            img = crop(doc, year, qno, parts)
            img.save(out / f"ceed-{year}-q{qno:02d}.png")


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--preview":
        return preview(Path(sys.argv[2]))
    IMAGES.mkdir(parents=True, exist_ok=True)
    tags = json.loads(TAGS.read_text())
    solved, excluded = tags["questions"], tags["excluded"]
    questions, papers, missing = [], [], []
    for year, cfg in PAPERS.items():
        doc = pymupdf.open(RAW / f"{year}-qp.pdf")
        if year in (2010, 2011):
            regions = [(q, parts, False) for (y, q), parts in MANUAL.items() if y == year]
        else:
            regions = question_regions(doc, find_marks(doc, year), cfg["count"])
        ids = []
        for qno, parts, _ in regions:
            qid = f"ceed-{year}-q{qno:02d}"
            if qid in excluded:
                (IMAGES / f"{qid}.webp").unlink(missing_ok=True)
                continue
            tag = solved.get(qid)
            if not tag:
                missing.append(qid)
                continue
            img = crop(doc, year, qno, parts)
            save_webp(img, IMAGES / f"{qid}.webp")
            record = {
                "id": qid, "exam": "CEED", "year": year, "paperId": f"ceed-{year}", "qno": qno,
                "format": tag["format"], "image": f"images/{qid}.webp",
                "imageWidth": img.width, "imageHeight": img.height, "optionCount": 4,
                "answer": answer_of(tag["format"], tag["answer"]), "answerStatus": "solved",
                "topic": tag["topic"], "difficulty": tag["difficulty"], "animated": False,
                "explanation": tag["explanation"],
            }
            if year in OPTION_LABELS and tag["format"] != "NAT":
                record["optionLabels"] = OPTION_LABELS[year]
            if tag.get("excluded"):
                record["excluded"] = tag["excluded"]
            questions.append(record)
            ids.append(qid)
        papers.append({
            "id": f"ceed-{year}", "exam": "CEED", "year": year, "label": f"CEED {year}",
            "durationMin": cfg["duration"], "scheme": cfg["scheme"], "totalMarks": cfg["total"],
            "questionIds": ids, "pastPaperEligible": year >= 2012 and len(ids) == cfg["count"],
            "cutoff": None,
        })
        print(f"{year}: {len(ids)} of {cfg['count']} objective items")
    (PART_A / "questions-ceed-2010-2014.json").write_text(json.dumps(questions, indent=2) + "\n")
    (PART_A / "papers-ceed-2010-2014.json").write_text(json.dumps(papers, indent=2) + "\n")
    if missing:
        print(f"neither solved nor excluded: {missing}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
