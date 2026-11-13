"""Verify the extracted UCEED Part A content and render contact sheets.

Per paper: question count, format split and mark total equal the printed instructions (less
any listed skips), every question has a valid official answer and tags, every key entry
maps to a question (no orphans), ids are unique, every image exists with the recorded size,
and the paper is never past-paper eligible. Contact sheets (12 crops each, labelled) go to
pipeline/raw/contact/uceed-*.png for visual review.

Run: pipeline/.venv/bin/python -I pipeline/verify/verify_uceed.py   (exit 1 on any failure)
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
PART_A = ROOT / "content" / "part-a"
CONTACT = ROOT / "pipeline" / "raw" / "contact"
sys.path.insert(0, str(ROOT / "pipeline" / "extract"))
from uceed_part_a import SKIP, raw_key  # noqa: E402  (same key reader the extractor used)

# Printed per paper: (NAT, MSQ, MCQ) section sizes and total marks of the objective block.
PRINTED = {
    2015: ((20, 30, 50), 300), 2016: ((20, 20, 40), 300), 2017: ((20, 25, 40), 300),
    2018: ((20, 25, 40), 300), 2019: ((20, 20, 45), 300), 2020: ((18, 18, 32), 240),
    2021: ((18, 18, 32), 240), 2022: ((18, 18, 32), 240), 2023: ((18, 18, 32), 240),
    2024: ((14, 15, 28), 200), 2025: ((14, 15, 28), 200), 2026: ((14, 15, 28), 200),
}
DURATION = {**{y: 180 for y in range(2015, 2020)}, **{y: 150 for y in range(2020, 2024)},
            **{y: 120 for y in range(2024, 2027)}}
TOPICS = {"3d-visualisation", "folding-and-patterns", "mechanisms", "everyday-science",
          "observation", "logic-and-counting", "design-knowledge", "language"}
LETTERS = ["A", "B", "C", "D"]
FIELDS = {"id", "exam", "year", "paperId", "qno", "format", "image", "imageWidth", "imageHeight",
          "optionCount", "answer", "answerStatus", "topic", "difficulty", "animated", "explanation"}

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
    return all(isinstance(a[k], (int, float)) for k in ("min", "max")) and a["min"] <= a["max"]


def main():
    questions = json.loads((PART_A / "questions-uceed.json").read_text())
    papers = json.loads((PART_A / "papers-uceed.json").read_text())
    by_id = {q["id"]: q for q in questions}
    check(len(by_id) == len(questions), "duplicate question ids")
    ceed = json.loads((PART_A / "questions-ceed-2020-2026.json").read_text())
    check(not (set(by_id) & {q["id"] for q in ceed}), "id collides with CEED pool")
    check(sorted(p["year"] for p in papers) == sorted(PRINTED), "papers do not cover every year")
    listed = [i for p in papers for i in p["questionIds"]]
    check(sorted(listed) == sorted(by_id), "questions and paper questionIds differ")

    for p in papers:
        y = p["year"]
        split, total = PRINTED[y]
        count = sum(split)
        skipped = set(SKIP.get(y, {}))
        qs = [by_id[i] for i in p["questionIds"] if i in by_id]
        check(p["id"] == f"uceed-{y}" and p["exam"] == "UCEED", f"{p['id']}: id/exam")
        check(p["pastPaperEligible"] is False and p["cutoff"] is None, f"{p['id']}: eligibility/cutoff")
        check(p["durationMin"] == DURATION[y], f"{p['id']}: duration {p['durationMin']}")
        check(p["totalMarks"] == total, f"{p['id']}: totalMarks {p['totalMarks']} != {total}")
        printed_fmts = ["NAT"] * split[0] + ["MSQ"] * split[1] + ["MCQ"] * split[2]
        expected_qnos = [n for n in range(1, count + 1) if n not in skipped]
        check([q["qno"] for q in qs] == expected_qnos, f"{p['id']}: qno sequence broken")
        check(len(qs) + len(skipped) == count, f"{p['id']}: {len(qs)}+{len(skipped)} skipped != {count}")
        # mark total: every printed question's full marks, skipped ones by their section
        got = sum(p["scheme"][q["format"]]["correct"] if q["answer"]["kind"] != "DROPPED"
                  else q["answer"]["marks"] for q in qs)
        got += sum(p["scheme"][printed_fmts[n - 1]]["correct"] for n in skipped)
        check(abs(got - total) < 1e-9, f"{p['id']}: marks sum {got} != printed {total}")
        key = raw_key(y, count)
        check(sorted(key) == list(range(1, count + 1)), f"{p['id']}: key does not cover 1..{count}")
        orphans = set(key) - {q["qno"] for q in qs} - skipped
        check(not orphans, f"{p['id']}: orphan keys {sorted(orphans)}")
        for q in qs:
            qid, a = q["id"], q["answer"]
            check(set(q) == FIELDS, f"{qid}: fields {sorted(set(q) ^ FIELDS)}")
            check(qid == f"uceed-{y}-q{q['qno']:02d}", f"{qid}: id pattern")
            check(q["exam"] == "UCEED" and q["year"] == y and q["paperId"] == p["id"], f"{qid}: exam/year/paperId")
            check(q["format"] == printed_fmts[q["qno"] - 1], f"{qid}: format differs from printed section")
            if a["kind"] == "ANY":
                ok = len(a["of"]) >= 2 and all(valid_simple(x, q["format"]) for x in a["of"])
            elif a["kind"] == "DROPPED":
                ok = a["marks"] == p["scheme"][q["format"]]["correct"]
            else:
                ok = valid_simple(a, q["format"])
            check(ok, f"{qid}: invalid answer {a}")
            check(q["answerStatus"] == "official" and q["explanation"] is None, f"{qid}: status/explanation")
            check(q["optionCount"] == 4 and isinstance(q["animated"], bool), f"{qid}: optionCount/animated")
            check(q["topic"] in TOPICS, f"{qid}: topic {q['topic']}")
            check(q["difficulty"] in (1, 2, 3), f"{qid}: difficulty {q['difficulty']}")
            img = PART_A / q["image"]
            check(q["image"] == f"images/{qid}.webp", f"{qid}: image path")
            if img.exists():
                with Image.open(img) as im:
                    check(im.size == (q["imageWidth"], q["imageHeight"]), f"{qid}: image size mismatch")
            else:
                errors.append(f"{qid}: image missing")

    stray = {f.stem for f in (PART_A / "images").glob("uceed-*.webp")} - set(by_id)
    check(not stray, f"stray images: {sorted(stray)}")

    sheets = contact_sheets(questions)
    for e in errors:
        print("FAIL", e)
    for p in papers:
        qs = [by_id[i] for i in p["questionIds"] if i in by_id]
        f = {k: sum(q["format"] == k for q in qs) for k in ("NAT", "MSQ", "MCQ")}
        special = {k: sum(q["answer"]["kind"] == k for q in qs) for k in ("ANY", "DROPPED")}
        print(f"{p['year']}: {len(qs)} q  NAT {f['NAT']} MSQ {f['MSQ']} MCQ {f['MCQ']}  "
              f"ANY {special['ANY']} DROPPED {special['DROPPED']}  "
              f"animated {sum(q['animated'] for q in qs)}  skipped {len(SKIP.get(p['year'], {}))}")
    print(f"{sheets} contact sheets -> {CONTACT.relative_to(ROOT)}/uceed-*.png")
    print("OK" if not errors else f"{len(errors)} failures")
    return 1 if errors else 0


def contact_sheets(questions, cols=3, rows=4, cw=620, ch=760):
    CONTACT.mkdir(parents=True, exist_ok=True)
    for old in CONTACT.glob("uceed-*.png"):
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
        sheet.save(CONTACT / f"uceed-{n:02d}-{batch[0]['id']}.png")
    return n


if __name__ == "__main__":
    sys.exit(main())
