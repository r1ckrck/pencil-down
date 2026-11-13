"""Verify the extracted CEED 2015-2019 Part A content and render contact sheets.

Per paper: printed question count and section formats, questionIds match the questions file,
every printed question is either included or carries a recorded exclusion reason (and has no
crop), eligible papers sum to the printed total. Per question: contract shape, unique id, valid
answer for its format, answerStatus "solved" with a non-empty explanation, valid tags, image
present at the recorded size, optionLabels exactly as printed for its paper, and an
"excluded" reason only when its tag records one. Contact sheets of every printed question go
to pipeline/raw/contact/ as sheet-1519-*.png.

Run: pipeline/.venv/bin/python -I pipeline/verify/verify_part_a_2015_2019.py   (exit 1 on any failure)
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
PART_A = ROOT / "content" / "part-a"
CONTACT = ROOT / "pipeline" / "raw" / "contact"
sys.path.insert(0, str(ROOT / "pipeline" / "extract"))
from ceed_part_a_2015_2019 import OPTION_LABELS, PAPERS, TAGS, TOTAL  # noqa: E402

TOPICS = {"3d-visualisation", "folding-and-patterns", "mechanisms", "everyday-science",
          "observation", "logic-and-counting", "design-knowledge", "language"}
LETTERS = ["A", "B", "C", "D"]
KEYS = {"id", "exam", "year", "paperId", "qno", "format", "image", "imageWidth", "imageHeight",
        "optionCount", "answer", "answerStatus", "topic", "difficulty", "animated", "explanation"}
OPTIONAL = {"optionLabels", "excluded"}
PAPER_KEYS = {"id", "exam", "year", "label", "durationMin", "scheme", "totalMarks", "questionIds",
              "pastPaperEligible", "cutoff"}

errors = []


def check(cond, msg):
    if not cond:
        errors.append(msg)


def valid_answer(a, fmt):
    if a.get("kind") != fmt:
        return False
    if fmt == "MCQ":
        return a["option"] in LETTERS
    if fmt == "MSQ":
        o = a["options"]
        return 1 <= len(o) <= 4 and o == sorted(set(o)) and all(x in LETTERS for x in o)
    return all(isinstance(a[k], (int, float)) for k in ("min", "max")) and a["min"] <= a["max"]


def main():
    questions = json.loads((PART_A / "questions-ceed-2015-2019.json").read_text())
    papers = json.loads((PART_A / "papers-ceed-2015-2019.json").read_text())
    tags = json.loads(TAGS.read_text())
    by_id = {q["id"]: q for q in questions}
    check(len(by_id) == len(questions), "duplicate question ids")
    check([p["id"] for p in papers] == list(PAPERS), "paper ids/order differ from PAPERS")

    for q in questions:
        qid = q["id"]
        check(KEYS <= set(q) <= KEYS | OPTIONAL, f"{qid}: keys {sorted(set(q) ^ KEYS)}")
        labels = OPTION_LABELS.get(q["paperId"]) if q["format"] != "NAT" else None
        check(q.get("optionLabels") == labels, f"{qid}: optionLabels {q.get('optionLabels')} != {labels}")
        reason = tags.get(qid, {}).get("excluded")
        check(q.get("excluded") == reason and (reason is None or len(reason) > 10), f"{qid}: excluded")
        check(re.fullmatch(rf"{q['paperId']}-q{q['qno']:02d}", qid) is not None, f"{qid}: id format")
        check(q["exam"] == "CEED" and q["optionCount"] == 4, f"{qid}: exam/optionCount")
        check(valid_answer(q["answer"], q["format"]), f"{qid}: invalid answer {q['answer']}")
        check(q["answerStatus"] == "solved", f"{qid}: answerStatus {q['answerStatus']}")
        check(isinstance(q["explanation"], str) and len(q["explanation"].strip()) > 20,
              f"{qid}: explanation missing or too short")
        check(q["topic"] in TOPICS, f"{qid}: topic {q['topic']}")
        check(q["difficulty"] in (1, 2, 3), f"{qid}: difficulty {q['difficulty']}")
        check(isinstance(q["animated"], bool), f"{qid}: animated not bool")
        img = PART_A / q["image"]
        check(q["image"] == f"images/{qid}.webp", f"{qid}: image path")
        if img.exists():
            with Image.open(img) as im:
                check(im.size == (q["imageWidth"], q["imageHeight"]), f"{qid}: image size mismatch")
        else:
            errors.append(f"{qid}: image missing")

    seen = set()
    for p in papers:
        pid = p["id"]
        cfg = PAPERS[pid]
        check(set(p) == PAPER_KEYS, f"{pid}: keys")
        count = sum(n for _, n, _ in cfg["sections"])
        fmts = [f for f, n, _ in cfg["sections"] for _ in range(n)]
        marks = [m for _, n, m in cfg["sections"] for _ in range(n)]
        check(sum(marks) == TOTAL == p["totalMarks"], f"{pid}: printed sections sum {sum(marks)}")
        for f in ("NAT", "MSQ", "MCQ"):
            per = {m for g, n, m in cfg["sections"] if g == f}
            check(p["scheme"][f]["correct"] in per, f"{pid}: scheme {f} correct not printed")
        qs = [by_id.get(i) for i in p["questionIds"]]
        check(all(qs), f"{pid}: questionIds missing from questions file")
        qs = [q for q in qs if q]
        seen |= {q["id"] for q in qs}
        check([q["qno"] for q in qs] == sorted(q["qno"] for q in qs), f"{pid}: questionIds not in printed order")
        for q in qs:
            check(q["paperId"] == pid and q["year"] == p["year"], f"{q['id']}: paperId/year")
            check(q["format"] == fmts[q["qno"] - 1], f"{q['id']}: format differs from printed section")
        included = {q["qno"] for q in qs}
        for n in range(1, count + 1):
            qid = f"{pid}-q{n:02d}"
            if n not in included:
                check(not (PART_A / "images" / f"{qid}.webp").exists(), f"{qid}: excluded but crop present")
                check(bool(tags.get(qid, {}).get("exclude")), f"{qid}: excluded without a reason")
        complete = len(included) == count
        check(p["pastPaperEligible"] == (complete and not cfg.get("mixed_marks")),
              f"{pid}: pastPaperEligible")
        if complete and not cfg.get("mixed_marks"):
            got = sum(p["scheme"][q["format"]]["correct"] for q in qs)
            check(got == TOTAL, f"{pid}: marks sum {got} != {TOTAL}")
        check(p["cutoff"] is None, f"{pid}: cutoff")
    check(seen == set(by_id), f"orphan questions: {sorted(set(by_id) - seen)}")

    sheets = contact_sheets(papers, by_id)
    for e in errors:
        print("FAIL", e)
    for p in papers:
        cfg = PAPERS[p["id"]]
        qs = [by_id[i] for i in p["questionIds"] if i in by_id]
        f = {k: sum(q["format"] == k for q in qs) for k in ("NAT", "MSQ", "MCQ")}
        count = sum(n for _, n, _ in cfg["sections"])
        print(f"{p['id']}: {len(qs)}/{count}  NAT {f['NAT']} MSQ {f['MSQ']} MCQ {f['MCQ']}  "
              f"animated {sum(q['animated'] for q in qs)}  eligible {p['pastPaperEligible']}")
    print(f"{sheets} contact sheets -> {CONTACT.relative_to(ROOT)}")
    print("OK" if not errors else f"{len(errors)} failures")
    return 1 if errors else 0


def contact_sheets(papers, by_id, cols=3, rows=4, cw=620, ch=760):
    CONTACT.mkdir(parents=True, exist_ok=True)
    for old in CONTACT.glob("sheet-1519-*.png"):
        old.unlink()
    font = ImageFont.load_default(size=22)
    items = []
    for p in papers:
        count = sum(n for _, n, _ in PAPERS[p["id"]]["sections"])
        items += [f"{p['id']}-q{n:02d}" for n in range(1, count + 1)]
    per, n = cols * rows, 0
    for s in range(0, len(items), per):
        batch = items[s:s + per]
        sheet = Image.new("RGB", (cols * cw, rows * ch), (200, 200, 200))
        draw = ImageDraw.Draw(sheet)
        for k, qid in enumerate(batch):
            x, y = (k % cols) * cw, (k // cols) * ch
            draw.rectangle([x + 4, y + 4, x + cw - 5, y + ch - 5], fill="white")
            q = by_id.get(qid)
            label = f"{qid}  {q['format'] if q else 'EXCLUDED'}{'  GIF' if q and q['animated'] else ''}"
            draw.text((x + 10, y + 8), label, fill=(200, 0, 0), font=font)
            path = PART_A / "images" / f"{qid}.webp"
            if path.exists():
                with Image.open(path) as im:
                    im.thumbnail((cw - 16, ch - 46))
                    sheet.paste(im, (x + 8, y + 38))
                    draw.rectangle([x + 8, y + 38, x + 8 + im.width, y + 38 + im.height], outline=(0, 120, 255))
        n += 1
        sheet.save(CONTACT / f"sheet-1519-{n:02d}-{batch[0]}.png")
    return n


if __name__ == "__main__":
    sys.exit(main())
