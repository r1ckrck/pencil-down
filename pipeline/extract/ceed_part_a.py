"""Extract every Part A question from the official CEED 2020-2026 papers.

For each paper:
  1. Find question-number anchors ("Q.01", "Q 22", ...) in the left margin. Most papers carry
     them in the text layer; CEED 2025 draws them as images, so that paper falls back to OCR.
  2. A question's region runs from its anchor to the next anchor, section heading or Part B,
     continuing across page breaks. Regions are rendered, stacked, trimmed and saved as PNG.
  3. Join the official key (format comes from the key's section: I NAT, II MSQ, III MCQ).
  4. Merge hand-made topic/difficulty tags from ceed_part_a_tags.json (written after looking
     at every crop) and write the content JSON files.

  5. Merge explanations from explanations/<year>.json ({question id: markdown}); ids with no
     entry keep explanation null.

Run: pipeline/.venv/bin/python -I pipeline/extract/ceed_part_a.py [--keep-images]
  --keep-images: reuse existing WebP crops instead of re-rendering them (fast re-run for tags
  or explanations); missing crops are still rendered.
Needs: pipeline/raw/ceed/<year>-qp.pdf and <year>-key.pdf (see pipeline/fetch/fetch_ceed.py), tesseract on PATH.
"""
import io
import json
import re
import subprocess
import sys
from pathlib import Path

import pymupdf
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "pipeline" / "raw" / "ceed"
PART_A = ROOT / "content" / "part-a"
IMAGES = PART_A / "images"
TAGS = Path(__file__).with_name("ceed_part_a_tags.json")
EXPLANATIONS = Path(__file__).with_name("explanations")

YEARS = range(2020, 2027)
ZOOM = 3.0  # 216 dpi; a 455 pt text column renders ~1365 px wide
MAX_WIDTH = 1400
PAD = 24  # px of white kept around the trimmed crop
LOSSLESS_SLACK = 1.5  # keep lossless WebP when it costs at most this multiple of lossy

OLD = {  # 2020-2023, 41 questions / 100 marks
    "NAT": {"correct": 3, "wrong": 0},
    "MCQ": {"correct": 2, "wrong": -0.5},
    "MSQ": {"correct": 3, "wrong": -0.2, "partial": False},
}
NEW = {  # 2024 onward, 44 questions / 150 marks
    "NAT": {"correct": 4, "wrong": 0},
    "MCQ": {"correct": 3, "wrong": -0.5},
    "MSQ": {"correct": 4, "wrong": -1, "partial": True},
}
# Schemes, durations and totals as printed in each paper's Part A instructions.
# 2022: the published PDF has no instructions page. Its 41-question layout (8 NAT, 10 MSQ,
# 23 MCQ) matches 2021 and 2023, which print the identical scheme, so 2022 uses that scheme
# by inference, not from print.
PAPERS = {
    2020: dict(count=41, total=100, duration=60, scheme=OLD, cutoff=None),
    2021: dict(count=41, total=100, duration=60, scheme=OLD, cutoff=None),
    2022: dict(count=41, total=100, duration=60, scheme=OLD, cutoff=24.58),
    2023: dict(count=41, total=100, duration=60, scheme=OLD, cutoff=28.50),
    2024: dict(count=44, total=150, duration=60, scheme=NEW, cutoff=50.26),
    # 2025, 2026: delta = mu + sigma/2 from exam-structure.md (45.48/16.98, 39.35/16.89)
    2025: dict(count=44, total=150, duration=60, scheme=NEW, cutoff=round(45.48 + 16.98 / 2, 2)),
    2026: dict(count=44, total=150, duration=60, scheme=NEW, cutoff=round(39.35 + 16.89 / 2, 2)),
}

ANCHOR_RE = re.compile(r"^Q\s*\.?\s*(\d{1,2})\b")
STOP_RE = re.compile(r"^Part\s*(A\s*[–-]\s*Section|B\b)", re.I)
GIF_RE = re.compile(r"animated\s+GIF", re.I)


# ---------- anchors ----------

def text_lines(page):
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            t = "".join(s["text"] for s in l["spans"]).strip()
            if t:
                yield pymupdf.Rect(l["bbox"]), t


def ocr_words(page, dpi=200):
    """(Rect in pt, word) for every OCR word on the page."""
    pix = page.get_pixmap(dpi=dpi)
    out = subprocess.run(["tesseract", "stdin", "stdout", "--psm", "3", "tsv"],
                         input=pix.tobytes("png"), capture_output=True, check=True).stdout.decode()
    s = 72 / dpi
    for row in out.splitlines()[1:]:
        f = row.split("\t")
        if len(f) == 12 and f[11].strip():
            x, y, w, h = map(int, f[6:10])
            yield pymupdf.Rect(x * s, y * s, (x + w) * s, (y + h) * s), f[11].strip()


def find_marks(doc, use_ocr):
    """Per page: anchors [(y, qno)], stoppers [y], GIF notes [y], footer top y."""
    pages = []
    for page in doc:
        anchors, stops, gifs = [], [], []
        footer = page.rect.height - 30
        for r, t in text_lines(page):
            if "Question Paper" in t and " of " in t and r.y0 > page.rect.height / 2:
                footer = min(footer, r.y0)
            if GIF_RE.search(t):
                gifs.append(r.y0)
            if r.x0 > 100:  # anchors and headings sit in the left margin
                continue
            m = ANCHOR_RE.match(t)
            if m:
                anchors.append((r.y0, int(m.group(1))))
            elif STOP_RE.match(t):
                stops.append(r.y0)
        if use_ocr:
            anchors, words = [], list(ocr_words(page))
            for r, w in words:
                if r.x0 > 100:
                    continue
                m = re.match(r"^Q\.?(\d{1,2})[\W_]*$", w)
                if m:
                    anchors.append((r.y0, int(m.group(1))))
                elif w == "Part":
                    stops.append(r.y0)
            gifs += [r.y0 for r, w in words if w.lower().startswith("animated")]
        pages.append(dict(anchors=sorted(anchors), stops=sorted(stops), gifs=gifs, footer=footer))
    return pages


def question_regions(doc, marks, count):
    """[(qno, [(page_index, Rect)], animated)] in printed order, Part A only."""
    events = []  # (page, y, kind, qno)
    for i, m in enumerate(marks):
        events += [(i, y, "q", n) for y, n in m["anchors"]]
        events += [(i, y, "stop", None) for y in m["stops"]]
    events.sort()
    # Part A anchors run 1..count; Part B restarts at Q.1, which ends the sequence.
    qs, expect = [], 1
    for idx, (p, y, kind, n) in enumerate(events):
        if kind == "q" and n == expect:
            qs.append(idx)
            expect += 1
            if expect > count:
                break
    if expect <= count:
        raise SystemExit(f"anchors stop at Q{expect - 1}, expected {count}")
    out = []
    for k, idx in enumerate(qs):
        p0, y0, _, n = events[idx]
        # region ends at the next event of any kind (next question, heading, Part B)
        p1, y1 = events[idx + 1][:2] if idx + 1 < len(events) else (p0, marks[p0]["footer"])
        parts = []
        for p in range(p0, p1 + 1):
            w = doc[p].rect.width
            top = y0 - 3 if p == p0 else 50
            bottom = y1 - 3 if p == p1 else marks[p]["footer"] - 3
            if bottom - top > 4:
                parts.append((p, pymupdf.Rect(20, top, w - 20, bottom)))
        animated = any(r.y0 <= g < r.y1 for p, r in parts for g in marks[p]["gifs"])
        out.append((n, parts, animated))
    return out


# ---------- rendering ----------

def trim(im):
    bg = Image.new("RGB", im.size, "white")
    diff = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 18 else 0)
    return diff.getbbox()


def render(doc, parts):
    tiles = []
    for p, rect in parts:
        pix = doc[p].get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM), clip=rect, alpha=False)
        im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        box = trim(im)
        if box:  # skip continuation slices that are blank
            tiles.append(im.crop((0, box[1], im.width, box[3])))
    h = sum(t.height for t in tiles) + PAD * (len(tiles) - 1)
    sheet = Image.new("RGB", (max(t.width for t in tiles), h), "white")
    y = 0
    for t in tiles:
        sheet.paste(t, (0, y))
        y += t.height + PAD
    box = trim(sheet)
    sheet = sheet.crop(box)
    out = Image.new("RGB", (sheet.width + 2 * PAD, sheet.height + 2 * PAD), "white")
    out.paste(sheet, (PAD, PAD))
    if out.width > MAX_WIDTH:
        out = out.resize((MAX_WIDTH, round(out.height * MAX_WIDTH / out.width)), Image.LANCZOS)
    return out


def save_webp(img, path):
    """Lossy WebP blurs thin lines and small option labels, so line art (few colours,
    compresses well losslessly) stays lossless; photo-heavy crops go lossy at q82."""
    lossy, lossless = io.BytesIO(), io.BytesIO()
    img.save(lossy, "WEBP", quality=82, method=6)
    img.save(lossless, "WEBP", lossless=True, quality=100, method=4)
    use = lossless if lossless.tell() <= LOSSLESS_SLACK * lossy.tell() else lossy
    path.write_bytes(use.getvalue())
    return use is lossless


# ---------- keys ----------

# The 2021 key is a scanned image with no text layer; OCR of its ruled table is unreliable,
# so it is transcribed here from the PDF (pipeline/raw/ceed/2021-key.pdf).
KEY_2021 = {
    "NAT": {1: "72", 2: "3", 3: "68", 4: "55", 5: "34", 6: "5", 7: "94.2 (92.9 – 94.6)", 8: "2.25 (2.24-2.26)"},
    "MSQ": {9: "A, D", 10: "A, C", 11: "A, C", 12: "A, C, D", 13: "A, C, D",
            14: "A, B, D", 15: "A, D", 16: "A", 17: "B, C", 18: "B, D"},
    "MCQ": dict(zip(range(19, 42), "C D C B D A A A B B C C D B C C B B D C D B A".split())),
}

VALUE_RE = re.compile(
    r"^([A-D](\s*,\s*[A-D])*(\s+or\s+[A-D](\s*,\s*[A-D])*)?|[\d.]+(\s*(to|OR|or)\s*[\d.]+)?"
    r"(\s*\([\d.\s–-]+\))?|DROPPED|FULL MARKS|\(\+\d+ marks awarded to all\))$", re.I)
SECTION_RE = re.compile(r"SECTION\s*[–-]\s*(I{1,3})", re.I)


def raw_key(year, count):
    """{qno: (section format, raw value text)} from the key PDF."""
    if year == 2021:
        return {q: (f, v) for f, d in KEY_2021.items() for q, v in d.items()}
    tokens = [t.strip() for t in pymupdf.open(RAW / f"{year}-key.pdf")[0].get_text().splitlines()]
    tokens = [t for t in tokens if t]
    fmt_of = {"I": "NAT", "II": "MSQ", "III": "MCQ"}
    out, fmt, q, i = {}, None, 1, 0
    while i < len(tokens) and q <= count:
        t = tokens[i]
        m = SECTION_RE.match(t)
        if m:
            fmt = fmt_of[m.group(1)]
        elif t == f"{q:02d}":
            vals, i = [], i + 1
            # values run until the next question number (zero-padded below 10, as printed)
            while i < len(tokens) and VALUE_RE.match(tokens[i]) and tokens[i] != f"{q + 1:02d}":
                vals.append(tokens[i])
                i += 1
            out[q] = (fmt, " ".join(vals))
            q += 1
            continue
        i += 1
    return out


def msq(text):
    return {"kind": "MSQ", "options": sorted(re.findall(r"[A-D]", text))}


def nat(text):
    nums = [float(x) for x in re.findall(r"\d+(?:\.\d+)?", text)]
    num = lambda v: int(v) if v == int(v) else v
    if "(" in text:  # "94.2 (92.9 – 94.6)": the bracket is the accepted range
        lo, hi = nums[1], nums[2]
    elif " to " in text:
        lo, hi = nums
    else:
        lo = hi = nums[0]
    return {"kind": "NAT", "min": num(lo), "max": num(hi)}


def parse_answer(fmt, text, scheme):
    if re.search(r"DROPPED|FULL MARKS", text):
        return {"kind": "DROPPED", "marks": scheme[fmt]["correct"]}
    alts = re.split(r"\s+(?:OR|or)\s+", text)
    one = {"NAT": nat, "MSQ": msq, "MCQ": lambda s: {"kind": "MCQ", "option": s.strip()}}[fmt]
    if len(alts) > 1:
        return {"kind": "ANY", "of": [one(a) for a in alts]}
    return one(text)


# ---------- main ----------

def load_explanations():
    """{question id: markdown} merged from every explanations/*.json."""
    out = {}
    for path in sorted(EXPLANATIONS.glob("*.json")):
        for qid, text in json.loads(path.read_text()).items():
            if qid in out:
                raise SystemExit(f"{path.name}: {qid} already explained in another file")
            if text and text.strip():
                out[qid] = text.strip()
    return out


def main():
    keep_images = "--keep-images" in sys.argv[1:]
    IMAGES.mkdir(parents=True, exist_ok=True)
    tags = json.loads(TAGS.read_text()) if TAGS.exists() else {}
    explanations = load_explanations()
    questions, papers, untagged, lossless = [], [], [], []
    for year in YEARS:
        cfg = PAPERS[year]
        doc = pymupdf.open(RAW / f"{year}-qp.pdf")
        marks = find_marks(doc, use_ocr=(year == 2025))
        regions = question_regions(doc, marks, cfg["count"])
        key = raw_key(year, cfg["count"])
        if sorted(key) != list(range(1, cfg["count"] + 1)):
            raise SystemExit(f"{year}: key covers {sorted(key)}")
        ids = []
        for qno, parts, animated in regions:
            qid = f"ceed-{year}-q{qno:02d}"
            path = IMAGES / f"{qid}.webp"
            if keep_images and path.exists():
                with Image.open(path) as img:
                    img.load()
            else:
                img = render(doc, parts)
                if save_webp(img, path):
                    lossless.append(qid)
            fmt, text = key[qno]
            tag = tags.get(qid)
            if not tag:
                untagged.append(qid)
            questions.append({
                "id": qid, "exam": "CEED", "year": year, "paperId": f"ceed-{year}", "qno": qno,
                "format": fmt, "image": f"images/{qid}.webp",
                "imageWidth": img.width, "imageHeight": img.height, "optionCount": 4,
                "answer": parse_answer(fmt, text, cfg["scheme"]), "answerStatus": "official",
                "topic": tag["topic"] if tag else None,
                "difficulty": tag["difficulty"] if tag else None,
                # an animated question whose PDF marker lives inside an image is flagged in the tags
                "animated": animated or bool(tag and tag.get("animated")),
                "explanation": explanations.pop(qid, None),
            })
            ids.append(qid)
        papers.append({
            "id": f"ceed-{year}", "exam": "CEED", "year": year, "label": f"CEED {year}",
            "durationMin": cfg["duration"], "scheme": cfg["scheme"], "totalMarks": cfg["total"],
            "questionIds": ids, "pastPaperEligible": len(ids) == cfg["count"],
            "cutoff": cfg["cutoff"],
        })
        print(f"{year}: {len(ids)} questions")
    if not keep_images:
        print(f"lossless WebP: {len(lossless)} of {len(questions)}")
    print(f"explanations: {sum(q['explanation'] is not None for q in questions)} of {len(questions)}")
    if explanations:
        print(f"explanations for unknown ids: {sorted(explanations)}", file=sys.stderr)
    (PART_A / "questions-ceed-2020-2026.json").write_text(json.dumps(questions, indent=2) + "\n")
    (PART_A / "papers-ceed-2020-2026.json").write_text(json.dumps(papers, indent=2) + "\n")
    write_topic_weights(questions)
    if untagged:
        print(f"untagged: {len(untagged)} (add to {TAGS.name})", file=sys.stderr)


def write_topic_weights(questions):
    """Share of each topic among the 2024-2026 questions (132 slots)."""
    topics = ["3d-visualisation", "folding-and-patterns", "mechanisms", "everyday-science",
              "observation", "logic-and-counting", "design-knowledge", "language"]
    recent = [q for q in questions if q["year"] >= 2024]
    if any(q["topic"] is None for q in recent):
        return
    weights = {t: round(sum(q["topic"] == t for q in recent) / len(recent), 4) for t in topics}
    # absorb rounding drift so the weights sum to exactly 1
    top = max(weights, key=weights.get)
    weights[top] = round(weights[top] + 1 - sum(weights.values()), 4)
    (ROOT / "content" / "meta" / "topic-weights.json").write_text(json.dumps({"weights": weights}, indent=2) + "\n")


if __name__ == "__main__":
    main()
