"""Extract the Part A questions from the official CEED 2015-2019 papers (2016: two sessions).

No official answer key exists for these years (the CEED site publishes keys from 2020 only),
so every answer was solved by hand from the crop and is stored with its explanation in
ceed_part_a_tags_2015_2019.json alongside topic and difficulty. A question is excluded when
its answer could not be solved with confidence; its paper then loses past-paper eligibility
and its crop is not kept. A solved question kept for its paper but never served in mocks,
drills or revisit (no single defensible key, or a duplicate) carries an "excluded" reason in
its tag, copied to the record.

For each paper:
  1. Find question anchors ("Q.01", "Q.1", "Question no. 1") in the left margin of the text
     layer; anchors drawn as images are listed in MANUAL_ANCHORS (located by OCR).
  2. A question's region runs from its anchor to the next anchor, section heading or Part B,
     continuing across page breaks; running headers and footers are cut. Regions are rendered,
     stacked, trimmed and saved as WebP with the 2020-2026 extractor's helpers.
  3. Format comes from the printed section; answers, explanations and tags from the JSON file.

Run: pipeline/.venv/bin/python -I pipeline/extract/ceed_part_a_2015_2019.py
"""
import json
import re
import sys
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ceed_part_a import GIF_RE, IMAGES, PART_A, RAW, render, save_webp, text_lines  # noqa: E402

TAGS = Path(__file__).with_name("ceed_part_a_tags_2015_2019.json")


def scheme(nat, mcq, msq_correct=2, nat_wrong=0):
    return {
        "NAT": {"correct": nat, "wrong": nat_wrong},
        "MCQ": {"correct": mcq, "wrong": -0.6},
        "MSQ": {"correct": msq_correct, "wrong": 0, "partial": False},
    }


# Sections as printed in each paper's Part A instructions: (format, count, marks per correct).
# All papers: Part A 60 min, 100 marks; MCQ wrong -0.6; MSQ all-or-nothing, no negative.
# 2015 instructions print the NAT and MCQ penalty as "0.6" under "NEGATIVE marking"; the
# Section I heading prints "Wrong Answer: -0.6".
# 2018 prints two NAT sections (6 and 3 marks) and two MSQ sections (4 and 2 marks); MarkScheme
# holds one value per format, so the scheme carries the larger sections' values (NAT 3, MSQ 2)
# and the paper is not past-paper eligible (a past-paper score would not match the print).
PAPERS = {
    "ceed-2015": dict(file="2015-qp.pdf", year=2015, label="CEED 2015",
                      sections=[("NAT", 5, 2), ("MSQ", 10, 2), ("MCQ", 35, 2)],
                      scheme=scheme(2, 2, nat_wrong=-0.6)),
    "ceed-2016-s1": dict(file="2016-qp1.pdf", year=2016, label="CEED 2016 Paper 1",
                         sections=[("NAT", 10, 2), ("MSQ", 10, 2), ("MCQ", 30, 2)],
                         scheme=scheme(2, 2, nat_wrong=-0.6)),
    "ceed-2016-s2": dict(file="2016-qp2.pdf", year=2016, label="CEED 2016 Paper 2",
                         sections=[("NAT", 10, 2), ("MSQ", 10, 2), ("MCQ", 30, 2)],
                         scheme=scheme(2, 2, nat_wrong=-0.6)),
    "ceed-2017": dict(file="2017-qp.pdf", year=2017, label="CEED 2017",
                      sections=[("NAT", 10, 3), ("MSQ", 10, 2), ("MCQ", 25, 2)],
                      scheme=scheme(3, 2)),
    "ceed-2018": dict(file="2018-qp.pdf", year=2018, label="CEED 2018",
                      sections=[("NAT", 2, 6), ("NAT", 6, 3), ("MSQ", 2, 4), ("MSQ", 6, 2), ("MCQ", 25, 2)],
                      scheme=scheme(3, 2), mixed_marks=True),
    "ceed-2019": dict(file="2019-qp.pdf", year=2019, label="CEED 2019",
                      sections=[("NAT", 10, 3), ("MSQ", 10, 2), ("MCQ", 25, 2)],
                      scheme=scheme(3, 2)),
}
DURATION, TOTAL = 60, 100

# Option labels as printed, when not A-D; they map to A-D in order (NAT items have none).
OPTION_LABELS = {"ceed-2015": ["a", "b", "c", "d"]}

# Anchors drawn inside images (no text layer): {paperId: {qno: (page index, y in pt)}}.
MANUAL_ANCHORS = {
    "ceed-2016-s2": {47: (18, 69), 48: (18, 404)},
}

ANCHOR_RE = re.compile(r"^(?:Q\s*\.?\s*|Question\s+no\.?\s*)(\d{1,2})\b", re.I)
STOP_RE = re.compile(r"^(PART\s*A\s*[,:–-]\s*Section|Part\s*B\b)", re.I)
HEADER_RE = re.compile(r"Question Paper|^\d{1,2}$")


def find_marks(doc, paper_id):
    pages = []
    for i, page in enumerate(doc):
        h = page.rect.height
        anchors, stops, gifs = [], [], []
        footer, header = h - 30, 40
        for r, t in text_lines(page):
            if HEADER_RE.search(t):
                if r.y0 > h - 75:
                    footer = min(footer, r.y0)
                elif r.y1 < 75:
                    header = max(header, r.y1 + 2)
            if GIF_RE.search(t):
                gifs.append(r.y0)
            if STOP_RE.match(t):
                stops.append(r.y0)
            elif r.x0 < 110:
                m = ANCHOR_RE.match(t)
                if m:
                    anchors.append((r.y0, int(m.group(1))))
        for q, (p, y) in MANUAL_ANCHORS.get(paper_id, {}).items():
            if p == i:
                anchors.append((y, q))
        pages.append(dict(anchors=sorted(anchors), stops=sorted(stops), gifs=gifs,
                          footer=footer, header=header))
    return pages


def question_regions(doc, marks, count):
    events = []
    for i, m in enumerate(marks):
        events += [(i, y, "q", n) for y, n in m["anchors"]]
        events += [(i, y, "stop", None) for y in m["stops"]]
    events.sort(key=lambda e: (e[0], e[1]))
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
    for idx in qs:
        p0, y0, _, n = events[idx]
        p1, y1 = events[idx + 1][:2] if idx + 1 < len(events) else (p0, marks[p0]["footer"])
        parts = []
        for p in range(p0, p1 + 1):
            w = doc[p].rect.width
            top = y0 - 3 if p == p0 else marks[p]["header"]
            bottom = y1 - 3 if p == p1 else marks[p]["footer"] - 3
            if bottom - top > 4:
                parts.append((p, pymupdf.Rect(20, top, w - 20, bottom)))
        animated = any(r.y0 <= g < r.y1 for p, r in parts for g in marks[p]["gifs"])
        out.append((n, parts, animated))
    return out


def parse_answer(fmt, text):
    text = text.strip()
    if fmt == "MCQ":
        return {"kind": "MCQ", "option": text}
    if fmt == "MSQ":
        return {"kind": "MSQ", "options": sorted(re.findall(r"[A-D]", text))}
    num = lambda s: int(float(s)) if float(s) == int(float(s)) else float(s)
    lo, _, hi = text.partition(" to ")
    return {"kind": "NAT", "min": num(lo), "max": num(hi or lo)}


def main():
    IMAGES.mkdir(parents=True, exist_ok=True)
    tags = json.loads(TAGS.read_text()) if TAGS.exists() else {}
    questions, papers, missing = [], [], []
    for pid, cfg in PAPERS.items():
        doc = pymupdf.open(RAW / cfg["file"])
        count = sum(n for _, n, _ in cfg["sections"])
        fmts = [f for f, n, _ in cfg["sections"] for _ in range(n)]
        regions = question_regions(doc, find_marks(doc, pid), count)
        ids, excluded = [], []
        for qno, parts, animated in regions:
            qid = f"{pid}-q{qno:02d}"
            tag = tags.get(qid)
            if not tag or "answer" not in tag:
                (IMAGES / f"{qid}.webp").unlink(missing_ok=True)
                excluded.append(qid)
                if not (tag and tag.get("exclude")):
                    missing.append(qid)
                continue
            img = render(doc, parts)
            save_webp(img, IMAGES / f"{qid}.webp")
            fmt = fmts[qno - 1]
            record = {
                "id": qid, "exam": "CEED", "year": cfg["year"], "paperId": pid, "qno": qno,
                "format": fmt, "image": f"images/{qid}.webp",
                "imageWidth": img.width, "imageHeight": img.height, "optionCount": 4,
                "answer": parse_answer(fmt, tag["answer"]), "answerStatus": "solved",
                "topic": tag["topic"], "difficulty": tag["difficulty"],
                "animated": animated or bool(tag.get("animated")),
                "explanation": tag["explanation"],
            }
            if pid in OPTION_LABELS and fmt != "NAT":
                record["optionLabels"] = OPTION_LABELS[pid]
            if tag.get("excluded"):
                record["excluded"] = tag["excluded"]
            questions.append(record)
            ids.append(qid)
        papers.append({
            "id": pid, "exam": "CEED", "year": cfg["year"], "label": cfg["label"],
            "durationMin": DURATION, "scheme": cfg["scheme"], "totalMarks": TOTAL,
            "questionIds": ids,
            "pastPaperEligible": not excluded and not cfg.get("mixed_marks"),
            "cutoff": None,
        })
        print(f"{pid}: {len(ids)}/{count} included" + (f", excluded {excluded}" if excluded else ""))
    (PART_A / "questions-ceed-2015-2019.json").write_text(json.dumps(questions, indent=2) + "\n")
    (PART_A / "papers-ceed-2015-2019.json").write_text(json.dumps(papers, indent=2) + "\n")
    if missing:
        print(f"no answer or exclusion recorded: {len(missing)}", file=sys.stderr)


if __name__ == "__main__":
    main()
