"""Extract every objective (Part A) question from the official UCEED 2015-2026 papers.

UCEED is IIT Bombay's undergraduate design entrance, set by the same office as CEED. Its
objective questions join the shared Part A pool as extra practice (never as past papers).
2015-2019 papers are wholly objective; from 2020 the objective block is "Part A".

For each paper:
  1. Find question anchors ("Q.01", "Q. 1", "1.", a bare "55") in the left margin, from the
     first question page on. Only the next expected number is accepted, so numbered lists
     inside a question never split it. Anchors missing from the text layer (a scanned page)
     are given in ANCHOR_FIX.
  2. A question's region runs from its anchor to the next accepted anchor or section/Part
     heading, continuing across page breaks. Regions are rendered with the CEED helpers
     (same zoom, trim, padding, lossless/lossy WebP rule).
  3. Format comes from the printed section ranges; answers from the official key.
  4. Merge hand-made topic/difficulty tags from uceed_part_a_tags.json and write
     content/part-a/questions-uceed.json and papers-uceed.json.

Run: pipeline/.venv/bin/python -I pipeline/extract/uceed_part_a.py
Needs: pipeline/raw/uceed/<year>-qp.pdf and <year>-key.pdf (pipeline/fetch/fetch_uceed.py).
"""
import json
import re
import sys
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).parent))
from ceed_part_a import render, save_webp, text_lines  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "pipeline" / "raw" / "uceed"
PART_A = ROOT / "content" / "part-a"
IMAGES = PART_A / "images"
TAGS = Path(__file__).with_name("uceed_part_a_tags.json")

YEARS = range(2015, 2027)


def scheme(nat, msq, mcq, partial=False):
    return {
        "NAT": {"correct": nat[0], "wrong": nat[1]},
        "MCQ": {"correct": mcq[0], "wrong": mcq[1]},
        "MSQ": {"correct": msq[0], "wrong": msq[1], "partial": partial},
    }


S2020 = scheme((4, 0), (4, -0.19), (3, -0.71))
S2023 = scheme((4, 0), (4, -1), (3, -0.71), partial=True)
# As printed in each paper's instructions: section sizes (NAT, MSQ, MCQ), total marks, the
# time for the objective block, and the marks per question. Sections run in that order.
# 2015-2019 have no drawing part, so the objective block is the whole 3-hour paper.
# 2022: the PDF has no instructions page. Section headings print the sizes and section marks
# (72, 72, 96 -> 4, 4, 3 per question) and Part B prints "30 minutes" of a 3-hour paper.
# Negative marks are not printed; they are taken from 2021, the nearest year that prints them.
PAPERS = {
    2015: dict(split=(20, 30, 50), total=300, duration=180, scheme=scheme((3, -1), (3, 0), (3, -1))),
    2016: dict(split=(20, 20, 40), total=300, duration=180, scheme=scheme((4, -1), (5, -0.5), (3, -1))),
    2017: dict(split=(20, 25, 40), total=300, duration=180, scheme=scheme((4, 0), (4, 0), (3, -1))),
    2018: dict(split=(20, 25, 40), total=300, duration=180, scheme=scheme((4, 0), (4, 0), (3, -1))),
    2019: dict(split=(20, 20, 45), total=300, duration=180, scheme=scheme((3, 0), (3, -0.19), (4, -1.32))),
    2020: dict(split=(18, 18, 32), total=240, duration=150, scheme=S2020),
    2021: dict(split=(18, 18, 32), total=240, duration=150, scheme=S2020),
    2022: dict(split=(18, 18, 32), total=240, duration=150, scheme=S2020),
    2023: dict(split=(18, 18, 32), total=240, duration=150, scheme=S2023),
    2024: dict(split=(14, 15, 28), total=200, duration=120, scheme=S2023),
    2025: dict(split=(14, 15, 28), total=200, duration=120, scheme=S2023),
    2026: dict(split=(14, 15, 28), total=200, duration=120, scheme=S2023),
}
# Page index of the first question (earlier pages are cover and instructions).
START = {2015: 2, 2016: 2, 2017: 2, 2018: 2, 2019: 2, 2020: 2, 2021: 2, 2022: 1,
         2023: 3, 2024: 3, 2025: 3, 2026: 3}
# (page index, y in pt) for anchors that have no text layer.
ANCHOR_FIX = {2018: {15: (7, 50)}}
# Footer top (pt) on scanned pages, where the footer has no text layer.
FOOTER_FIX = {2018: {7: 775}}
# Questions left out because they depend on material the PDF does not carry: {year: {qno: why}}.
SKIP: dict[int, dict[int, str]] = {}

ANCHOR_RE = re.compile(r"^(?:Q\s*\.?\s*(\d{1,3})\b|(\d{1,3})\s*\.(?!\d)|(\d{1,3})$)")
STOP_RE = re.compile(r"^(Section\s*[A-C1-3]\s*:|SECTION\s*[–-]|PART\s*[-–]?\s*[AB]\b|Part\s*[-–]?\s*B\b|END OF THE QUESTION PAPER|\*{5,})")
GIF_RE = re.compile(r"\bGIF\b")
NEXT_GIF_RE = re.compile(r"following question contains an animated GIF", re.I)


def formats(cfg):
    nat, msq, mcq = cfg["split"]
    return ["NAT"] * nat + ["MSQ"] * msq + ["MCQ"] * mcq  # index qno - 1


# ---------- regions ----------

def page_marks(page):
    anchors, stops, gifs, gif_next = [], [], [], []
    footer = page.rect.height - 30
    for r, t in text_lines(page):
        if r.y0 > page.rect.height - 80 and ("UCEED" in t or re.match(r"Page \d", t)):
            footer = min(footer, r.y0)
        if NEXT_GIF_RE.search(t):
            # 2022 prints "(The following question contains an animated GIF image)" above
            # the anchor: it ends the previous question and flags the next one
            gif_next.append(r.y0)
            stops.append(r.y0)
            continue
        if GIF_RE.search(t):
            gifs.append(r.y0)
        if STOP_RE.match(t):  # headings may be centred, so any x
            stops.append(r.y0)
            continue
        if r.x0 > 100:
            continue
        m = ANCHOR_RE.match(t)
        if m:
            anchors.append((r.y0, int(next(g for g in m.groups() if g))))
    return dict(anchors=anchors, stops=stops, gifs=gifs, gif_next=gif_next, footer=footer)


def question_regions(doc, year, count):
    """[(qno, [(page_index, Rect)], gif)] in printed order."""
    marks = [page_marks(p) for p in doc]
    for p, y in FOOTER_FIX.get(year, {}).items():
        marks[p]["footer"] = y
    for q, (p, y) in ANCHOR_FIX.get(year, {}).items():
        marks[p]["anchors"].append((y, q))
    events = []
    for i in range(START[year], len(doc)):
        events += [(i, y, "q", n) for y, n in marks[i]["anchors"]]
        events += [(i, y, "stop", None) for y in marks[i]["stops"]]
    events.sort(key=lambda e: (e[0], e[1]))
    accepted, expect = [], 1
    for idx, (p, y, kind, n) in enumerate(events):
        if kind == "q" and n == expect:
            accepted.append(idx)
            expect += 1
            if expect > count:
                break
    if expect <= count:
        raise SystemExit(f"{year}: anchors stop at Q{expect - 1}, expected {count}")
    out = []
    for k, idx in enumerate(accepted):
        p0, y0, _, n = events[idx]
        nxt = accepted[k + 1] if k + 1 < len(accepted) else None
        end = None
        for j in range(idx + 1, len(events)):
            if j == nxt or events[j][2] == "stop" or (nxt is None and events[j][2] == "q"):
                end = events[j][:2]
                break
        p1, y1 = end if end else (p0, marks[p0]["footer"])
        parts = []
        for p in range(p0, p1 + 1):
            w = doc[p].rect.width
            top = y0 - 3 if p == p0 else 40
            bottom = y1 - 3 if p == p1 else marks[p]["footer"] - 3
            if bottom - top > 4:
                parts.append((p, pymupdf.Rect(20, top, w - 20, bottom)))
        gif = any(r.y0 <= g < r.y1 for p, r in parts for g in marks[p]["gifs"])
        gif |= any(y0 - 60 < g < y0 for g in marks[p0]["gif_next"])
        out.append((n, parts, gif))
    return out


# ---------- keys ----------

# 2017-2019 keys are scanned tables with no text layer; transcribed from the PDFs
# (pipeline/raw/uceed/<year>-key.pdf), one entry per question in printed order.
KEY_SCANNED = {
    2017: (
        "12|25|7|28|11|7669|1.5|11|8|8|17|10|10|3|0.7 - 0.72|0.7 - 0.71|36|55|15|10|"
        "A C|B C D|B D|C D|B D|A B|A B C D|A B D|A B C D|C D|A B C|B C|A C D|A B|A C D|A C D|"
        "B C D|A D|B D|A C|C D|A C D or A C|A C D|B C|A C|"
        "D|A|A|B|D|C|A|B|B|A|B|A|B|B|D|D|B|C|B|A|C|D|A|B|C|D|C|B|C|A|B|A|C|B|D|C|C|D|C|C"
    ),
    2018: (
        "21|113|22|12|6|49|7|8|40|46|11|65 or 1.12 - 1.14|8|25|3|18|20|36|2 or 4|10|"
        "B C D|B D|B D|A B D|A C|A B|A B|D|A B C|A B|A B C D|A B|C D or D|A B C or B C|D|A B D|"
        "A B D|B C|A C D|C D|B D|A D|B C|A B C|B C or A B C or B C D or A B C D|"
        "D|C|A|A|C|C|D|D|D|D|B|B|D|D|C|A|A|A|A or B|B|A|A|C|C|C|A|B|C|C|C|C|C|C or D|C|B|A|A|B|"
        "A or B|A"
    ),
    2019: (
        "3|22|315 or -315|44|18|18|20|7|9|57|10|450|399|96|24|1190|22 or 23|9|112|160|"
        "C D|A B|B C D|A B C D|C|B D|C or C D|A C D|A B|A C|A C D|B D|A B D|B D|A C|A C|A B D|"
        "A C|B D|A B C D|"
        "D|A|B|B|A|A|B|C|C|C|B|D|B|A|A|C|D|C|B|A|B|A|C|B|B|C|B|B|B|D|D|B|C|A|C|A|D|B|D|D|B|B|A|C|A"
    ),
}

QNO_RE = re.compile(r"^Q?\s*(\d{1,3})$")


def raw_key(year, count):
    """{qno: raw value text} from the official key."""
    if year in KEY_SCANNED:
        vals = KEY_SCANNED[year].split("|")
        return dict(zip(range(1, len(vals) + 1), vals))
    doc = pymupdf.open(RAW / f"{year}-key.pdf")
    tokens = [t.strip() for p in doc for t in p.get_text().splitlines() if t.strip()]
    out, i = {}, 0
    # Keys are tables read row by row: question number, then its value. A value may run on
    # to a continuation cell: "or, 26—27", "(+3 marks is awarded to all)".
    while i < len(tokens) - 1:
        m = QNO_RE.match(tokens[i])
        q = int(m.group(1)) if m else None
        if q and 1 <= q <= count and q not in out:
            vals, i = [tokens[i + 1]], i + 2
            while i < len(tokens) and re.match(r"(?i)^(or\b|\()", tokens[i]):
                vals.append(tokens[i])
                i += 1
            out[q] = " ".join(vals)
            continue
        i += 1
    return out


def num(v):
    v = float(v)
    return int(v) if v == int(v) else v


def nat(text):
    t = text.replace("−", "-").replace(",", " ").strip()
    m = re.search(r"\(\s*(-?[\d.]+)\s*[~–—-]\s*(-?[\d.]+)\s*\)", t)  # "16.12 (15.00~16.50)"
    if m:
        return {"kind": "NAT", "min": num(m.group(1)), "max": num(m.group(2))}
    m = re.fullmatch(r"(-?[\d.]+)\s*(?:[~–—]|\s-\s|-|to)\s*(-?[\d.]+)", t)
    if m:
        return {"kind": "NAT", "min": num(m.group(1)), "max": num(m.group(2))}
    m = re.fullmatch(r"-?[\d.]+", t)
    if not m:
        raise ValueError(f"NAT value {text!r}")
    return {"kind": "NAT", "min": num(t), "max": num(t)}


def msq(text):
    opts = sorted(set(re.findall(r"[A-D]", text)))
    if not opts or re.sub(r"[A-D,.\s]", "", text):
        raise ValueError(f"MSQ value {text!r}")
    return {"kind": "MSQ", "options": opts}


def mcq(text):
    if not re.fullmatch(r"\s*[A-D]\s*", text):
        raise ValueError(f"MCQ value {text!r}")
    return {"kind": "MCQ", "option": text.strip()}


def parse_answer(fmt, text, sch):
    if re.search(r"(?i)dropped|full marks", text):
        return {"kind": "DROPPED", "marks": sch[fmt]["correct"]}
    alts = [a for a in re.split(r"(?i)\s*\bor\b,?\s*", text) if a.strip()]
    one = {"NAT": nat, "MSQ": msq, "MCQ": mcq}[fmt]
    if len(alts) > 1:
        return {"kind": "ANY", "of": [one(a) for a in alts]}
    return one(text)


# ---------- main ----------

def main():
    IMAGES.mkdir(parents=True, exist_ok=True)
    tags = json.loads(TAGS.read_text()) if TAGS.exists() else {}
    questions, papers, untagged, lossless = [], [], [], []
    for year in YEARS:
        cfg = PAPERS[year]
        fmts = formats(cfg)
        count = len(fmts)
        key = raw_key(year, count)
        if sorted(key) != list(range(1, count + 1)):
            raise SystemExit(f"{year}: key covers {sorted(key)}")
        doc = pymupdf.open(RAW / f"{year}-qp.pdf")
        ids = []
        for qno, parts, gif in question_regions(doc, year, count):
            if qno in SKIP.get(year, {}):
                continue
            qid = f"uceed-{year}-q{qno:02d}"
            path = IMAGES / f"{qid}.webp"
            img = render(doc, parts)
            if save_webp(img, path):
                lossless.append(qid)
            fmt = fmts[qno - 1]
            tag = tags.get(qid)
            if not tag:
                untagged.append(qid)
            questions.append({
                "id": qid, "exam": "UCEED", "year": year, "paperId": f"uceed-{year}", "qno": qno,
                "format": fmt, "image": f"images/{qid}.webp",
                "imageWidth": img.width, "imageHeight": img.height, "optionCount": 4,
                "answer": parse_answer(fmt, key[qno], cfg["scheme"]), "answerStatus": "official",
                "topic": tag["topic"] if tag else None,
                "difficulty": tag["difficulty"] if tag else None,
                "animated": gif or bool(tag and tag.get("animated")),
                "explanation": None,
            })
            ids.append(qid)
        papers.append({
            "id": f"uceed-{year}", "exam": "UCEED", "year": year, "label": f"UCEED {year}",
            "durationMin": cfg["duration"], "scheme": cfg["scheme"], "totalMarks": cfg["total"],
            "questionIds": ids, "pastPaperEligible": False, "cutoff": None,
        })
        print(f"{year}: {len(ids)} questions")
    print(f"lossless WebP: {len(lossless)} of {len(questions)}")
    (PART_A / "questions-uceed.json").write_text(json.dumps(questions, indent=2) + "\n")
    (PART_A / "papers-uceed.json").write_text(json.dumps(papers, indent=2) + "\n")
    if untagged:
        print(f"untagged: {len(untagged)} (add to {TAGS.name})", file=sys.stderr)


if __name__ == "__main__":
    main()
