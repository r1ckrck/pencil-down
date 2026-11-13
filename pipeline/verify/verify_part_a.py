"""Verify the extracted CEED 2020-2026 Part A content and render contact sheets.

Per paper: question count and mark total equal the printed values, the format split matches
the printed sections, every question has a valid answer and tags, no key is orphaned, and
every image exists with the recorded size. Contact sheets (12 crops each, labelled with ids)
go to pipeline/raw/contact/ for visual review.

Run: pipeline/.venv/bin/python -I pipeline/verify/verify_part_a.py   (exit 1 on any failure)
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
PART_A = ROOT / "content" / "part-a"
CONTACT = ROOT / "pipeline" / "raw" / "contact"
sys.path.insert(0, str(ROOT / "pipeline" / "extract"))
from ceed_part_a import raw_key  # noqa: E402  (same key reader the extractor used)

# Printed per paper: question count, total marks, (NAT, MSQ, MCQ) section sizes.
PRINTED = {y: (41, 100, (8, 10, 23)) for y in range(2020, 2024)}
PRINTED |= {y: (44, 150, (8, 10, 26)) for y in range(2024, 2027)}
TOPICS = {"3d-visualisation", "folding-and-patterns", "mechanisms", "everyday-science",
          "observation", "logic-and-counting", "design-knowledge", "language"}
LETTERS = ["A", "B", "C", "D"]

errors = []


def check(cond, msg):
    if not cond:
        errors.append(msg)


def valid_simple(a, fmt):
    if a["kind"] != fmt:
        return False
    if fmt == "MCQ":
        return a["option"] in LETTERS
    if fmt == "MSQ":
        o = a["options"]
        return 1 <= len(o) <= 4 and o == sorted(set(o)) and all(x in LETTERS for x in o)
    return isinstance(a["min"], (int, float)) and a["min"] <= a["max"]


def marks_for(q, scheme):
    a = q["answer"]
    return a["marks"] if a["kind"] == "DROPPED" else scheme[q["format"]]["correct"]


def main():
    questions = json.loads((PART_A / "questions-ceed-2020-2026.json").read_text())
    papers = json.loads((PART_A / "papers-ceed-2020-2026.json").read_text())
    by_id = {q["id"]: q for q in questions}
    check(len(by_id) == len(questions), "duplicate question ids")

    for p in papers:
        y = p["year"]
        count, total, split = PRINTED[y]
        qs = [by_id[i] for i in p["questionIds"] if i in by_id]
        check(len(qs) == len(p["questionIds"]), f"{p['id']}: questionIds missing from questions file")
        check(len(qs) == count, f"{p['id']}: {len(qs)} questions, printed {count}")
        check([q["qno"] for q in qs] == list(range(1, count + 1)), f"{p['id']}: qno sequence broken")
        check(p["totalMarks"] == total, f"{p['id']}: totalMarks {p['totalMarks']} != {total}")
        got = sum(marks_for(q, p["scheme"]) for q in qs)
        check(got == total, f"{p['id']}: marks sum {got} != printed {total}")
        fmts = tuple(sum(q["format"] == f for q in qs) for f in ("NAT", "MSQ", "MCQ"))
        check(fmts == split, f"{p['id']}: format split {fmts} != {split}")
        key = raw_key(y, count)
        check(sorted(key) == [q["qno"] for q in qs], f"{p['id']}: orphan or missing keys")
        for q in qs:
            a, qid = q["answer"], q["id"]
            if a["kind"] == "ANY":
                ok = len(a["of"]) >= 2 and all(valid_simple(x, q["format"]) for x in a["of"])
            elif a["kind"] == "DROPPED":
                ok = a["marks"] == p["scheme"][q["format"]]["correct"]
            else:
                ok = valid_simple(a, q["format"])
            check(ok, f"{qid}: invalid answer {a}")
            check(key[q["qno"]][0] == q["format"], f"{qid}: format differs from key section")
            check(q["answerStatus"] == "official", f"{qid}: answerStatus")
            check(q["paperId"] == p["id"], f"{qid}: paperId")
            check(q["topic"] in TOPICS, f"{qid}: topic {q['topic']}")
            check(q["difficulty"] in (1, 2, 3), f"{qid}: difficulty {q['difficulty']}")
            img = PART_A / q["image"]
            if img.exists():
                with Image.open(img) as im:
                    check(im.size == (q["imageWidth"], q["imageHeight"]), f"{qid}: image size mismatch")
            else:
                errors.append(f"{qid}: image missing")

    tw = ROOT / "content" / "meta" / "topic-weights.json"
    if tw.exists():
        w = json.loads(tw.read_text())["weights"]
        check(set(w) == TOPICS and abs(sum(w.values()) - 1) < 1e-9, "topic-weights: keys or sum")
    else:
        errors.append("topic-weights.json missing")

    sheets = contact_sheets(questions)
    for e in errors:
        print("FAIL", e)
    by_year = {}
    for q in questions:
        by_year.setdefault(q["year"], []).append(q)
    for y, qs in sorted(by_year.items()):
        f = {k: sum(q["format"] == k for q in qs) for k in ("NAT", "MSQ", "MCQ")}
        print(f"{y}: {len(qs)} q  NAT {f['NAT']} MSQ {f['MSQ']} MCQ {f['MCQ']}  "
              f"animated {sum(q['animated'] for q in qs)}")
    print(f"{sheets} contact sheets -> {CONTACT.relative_to(ROOT)}")
    print("OK" if not errors else f"{len(errors)} failures")
    return 1 if errors else 0


def contact_sheets(questions, cols=3, rows=4, cw=620, ch=760):
    CONTACT.mkdir(parents=True, exist_ok=True)
    for old in CONTACT.glob("*.png"):
        old.unlink()
    font = ImageFont.load_default(size=22)
    per = cols * rows
    n = 0
    for s in range(0, len(questions), per):
        batch = questions[s:s + per]
        sheet = Image.new("RGB", (cols * cw, rows * ch), (200, 200, 200))
        draw = ImageDraw.Draw(sheet)
        for k, q in enumerate(batch):
            x, y = (k % cols) * cw, (k // cols) * ch
            draw.rectangle([x + 4, y + 4, x + cw - 5, y + ch - 5], fill="white")
            label = f"{q['id']}  {q['format']}{'  GIF' if q['animated'] else ''}"
            draw.text((x + 10, y + 8), label, fill=(200, 0, 0), font=font)
            path = PART_A / q["image"]
            if path.exists():
                with Image.open(path) as im:
                    im.thumbnail((cw - 16, ch - 46))
                    sheet.paste(im, (x + 8, y + 38))
                    draw.rectangle([x + 8, y + 38, x + 8 + im.width, y + 38 + im.height], outline=(0, 120, 255))
        n += 1
        sheet.save(CONTACT / f"sheet-{n:02d}-{batch[0]['id']}.png")
    return n


if __name__ == "__main__":
    sys.exit(main())
