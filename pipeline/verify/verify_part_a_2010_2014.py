"""Verify the solved CEED 2010-2014 Part A content and render contact sheets.

Checks: every record has the PartAQuestion shape; ids are unique and match year/qno; every
question is answerStatus "solved" with a valid answer and a non-empty explanation; topics
and difficulties are valid; images exist with the recorded size; each paper's questionIds
are its questions in printed order; optionLabels are exactly as printed for the paper; a
record's "excluded" reason (kept, never served) matches its tag; per paper, included +
excluded = the objective item count; pastPaperEligible holds only for a complete Part A paper. Contact sheets (12 crops
each, labelled with id and key) go to pipeline/raw/contact/ as a1014-*.png.

Run: pipeline/.venv/bin/python -I pipeline/verify/verify_part_a_2010_2014.py   (exit 1 on any failure)
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
PART_A = ROOT / "content" / "part-a"
CONTACT = ROOT / "pipeline" / "raw" / "contact"
TAGS = ROOT / "pipeline" / "extract" / "ceed_part_a_tags_2010_2014.json"

# Objective single-answer items per paper (included + excluded) and printed marks per item.
PRINTED = {2010: (2, 2), 2011: (1, 1), 2012: (40, 1.25), 2013: (50, 2), 2014: (50, 2)}
KEYS = {"id", "exam", "year", "paperId", "qno", "format", "image", "imageWidth", "imageHeight",
        "optionCount", "answer", "answerStatus", "topic", "difficulty", "animated", "explanation"}
TOPICS = {"3d-visualisation", "folding-and-patterns", "mechanisms", "everyday-science",
          "observation", "logic-and-counting", "design-knowledge", "language"}
LETTERS = ["A", "B", "C", "D"]
OPTIONAL = {"optionLabels", "excluded"}
OPTION_LABELS = {2013: ["1", "2", "3", "4"]}  # printed 1-4; every other paper prints A-D

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
    return isinstance(a["min"], (int, float)) and a["min"] <= a["max"]


def main():
    questions = json.loads((PART_A / "questions-ceed-2010-2014.json").read_text())
    papers = json.loads((PART_A / "papers-ceed-2010-2014.json").read_text())
    tags = json.loads(TAGS.read_text())
    excluded, solved = tags["excluded"], tags["questions"]
    by_id = {q["id"]: q for q in questions}
    check(len(by_id) == len(questions), "duplicate question ids")
    old = json.loads((PART_A / "questions-ceed-2020-2026.json").read_text())
    check(not set(by_id) & {q["id"] for q in old}, "ids collide with the 2020-2026 file")

    for q in questions:
        qid = q["id"]
        check(KEYS <= set(q) <= KEYS | OPTIONAL, f"{qid}: keys {sorted(set(q) ^ KEYS)}")
        labels = OPTION_LABELS.get(q["year"]) if q["format"] != "NAT" else None
        check(q.get("optionLabels") == labels, f"{qid}: optionLabels {q.get('optionLabels')} != {labels}")
        reason = solved.get(qid, {}).get("excluded")
        check(q.get("excluded") == reason and (reason is None or len(reason) > 10), f"{qid}: excluded")
        check(qid == f"ceed-{q['year']}-q{q['qno']:02d}", f"{qid}: id does not match year/qno")
        check(q["exam"] == "CEED" and q["paperId"] == f"ceed-{q['year']}", f"{qid}: exam/paperId")
        check(q["optionCount"] == 4 and q["animated"] is False, f"{qid}: optionCount/animated")
        check(q["answerStatus"] == "solved", f"{qid}: answerStatus {q['answerStatus']}")
        check(valid_answer(q["answer"], q["format"]), f"{qid}: invalid answer {q['answer']}")
        check(isinstance(q["explanation"], str) and len(q["explanation"].strip()) > 20,
              f"{qid}: explanation missing")
        check(q["topic"] in TOPICS, f"{qid}: topic {q['topic']}")
        check(q["difficulty"] in (1, 2, 3), f"{qid}: difficulty {q['difficulty']}")
        check(qid not in excluded, f"{qid}: both written and excluded")
        img = PART_A / q["image"]
        check(q["image"] == f"images/{qid}.webp", f"{qid}: image path")
        if img.exists():
            with Image.open(img) as im:
                check(im.size == (q["imageWidth"], q["imageHeight"]), f"{qid}: image size mismatch")
        else:
            errors.append(f"{qid}: image missing")
    for qid in excluded:
        check(not (PART_A / "images" / f"{qid}.webp").exists(), f"{qid}: excluded but image present")

    check(sorted(p["year"] for p in papers) == sorted(PRINTED), "papers: years")
    for p in papers:
        y, (count, per) = p["year"], PRINTED[p["year"]]
        qs = [by_id.get(i) for i in p["questionIds"]]
        check(all(qs), f"{p['id']}: questionIds missing from questions file")
        qs = [q for q in qs if q]
        check([q["qno"] for q in qs] == sorted(q["qno"] for q in qs), f"{p['id']}: not in printed order")
        check({q["id"] for q in questions if q["year"] == y} == set(p["questionIds"]),
              f"{p['id']}: questions of this year not all listed")
        n_ex = sum(k.startswith(f"ceed-{y}-") for k in excluded)
        check(len(qs) + n_ex == count, f"{p['id']}: {len(qs)} included + {n_ex} excluded != {count}")
        check(p["totalMarks"] == count * per, f"{p['id']}: totalMarks {p['totalMarks']} != {count * per}")
        check(p["scheme"]["MCQ"]["correct"] == per and p["scheme"]["MSQ"]["partial"] is False,
              f"{p['id']}: scheme")
        check(p["pastPaperEligible"] == (y >= 2012 and n_ex == 0), f"{p['id']}: pastPaperEligible")
        check(p["cutoff"] is None and p["exam"] == "CEED" and p["label"] == f"CEED {y}", f"{p['id']}: meta")
        f = {k: sum(q["format"] == k for q in qs) for k in ("NAT", "MSQ", "MCQ")}
        print(f"{y}: {len(qs)} included, {n_ex} excluded of {count}  "
              f"NAT {f['NAT']} MSQ {f['MSQ']} MCQ {f['MCQ']}  eligible {p['pastPaperEligible']}")

    sheets = contact_sheets(questions)
    for e in errors:
        print("FAIL", e)
    print(f"{sheets} contact sheets -> {CONTACT.relative_to(ROOT)}/a1014-*.png")
    print("OK" if not errors else f"{len(errors)} failures")
    return 1 if errors else 0


def key_text(a):
    return a["option"] if a["kind"] == "MCQ" else f"{a['min']}" if a["kind"] == "NAT" else ",".join(a["options"])


def contact_sheets(questions, cols=3, rows=4, cw=620, ch=760):
    CONTACT.mkdir(parents=True, exist_ok=True)
    for old in CONTACT.glob("a1014-*.png"):  # only this script's sheets; others share the folder
        old.unlink()
    font = ImageFont.load_default(size=22)
    per, n = cols * rows, 0
    for s in range(0, len(questions), per):
        batch = questions[s:s + per]
        sheet = Image.new("RGB", (cols * cw, rows * ch), (200, 200, 200))
        draw = ImageDraw.Draw(sheet)
        for k, q in enumerate(batch):
            x, y = (k % cols) * cw, (k // cols) * ch
            draw.rectangle([x + 4, y + 4, x + cw - 5, y + ch - 5], fill="white")
            draw.text((x + 10, y + 8), f"{q['id']}  {q['format']}  key {key_text(q['answer'])}",
                      fill=(200, 0, 0), font=font)
            with Image.open(PART_A / q["image"]) as im:
                im.thumbnail((cw - 16, ch - 46))
                sheet.paste(im, (x + 8, y + 38))
                draw.rectangle([x + 8, y + 38, x + 8 + im.width, y + 38 + im.height], outline=(0, 120, 255))
        n += 1
        sheet.save(CONTACT / f"a1014-{n:02d}-{batch[0]['id']}.png")
    return n


if __name__ == "__main__":
    sys.exit(main())
