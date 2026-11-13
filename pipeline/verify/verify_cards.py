"""Verify content/cards/cards.json, its images, and content/meta/playbooks.json.

Run from anywhere: pipeline/.venv/bin/python -I pipeline/verify/verify_cards.py
Exits non-zero and lists every problem when a check fails.
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CARDS = ROOT / "content/cards/cards.json"
IMAGES = ROOT / "content/cards/images"
PLAYBOOKS = ROOT / "content/meta/playbooks.json"
BANNED = ROOT / "content/meta/banned.txt"

CATEGORIES = {
    "art-movement", "indian-painting", "indian-dance", "indian-monument", "craft-process", "anthropometry",
    "gestalt", "ui-component", "design-icon", "indian-design-history", "colour-and-type",
}
PRIORITIES = {"P1", "P2", "P3"}
LICENCE = re.compile(r"^(Public domain|CC0( 1\.0)?|CC BY(-SA)? \d\.\d( [a-z\-]+)?|CC BY(-SA)?)$")
MAX_PX = 800
CARD_COUNT = (160, 220)
SLOTS = ["sketching", "creativity", "visual", "form", "problem-id"]
PHASES = {"Read", "Generate", "Commit", "Execute", "Buffer"}
# Spec §5.3 slot scripts, consecutive same-phase rows merged: (phase, from, to).
SPEC_SCRIPTS = {
    "sketching": [("Read", 0, 2), ("Generate", 2, 4), ("Commit", 4, 5), ("Execute", 5, 21), ("Buffer", 21, 24)],
    "creativity": [("Read", 0, 2), ("Generate", 2, 10), ("Commit", 10, 11), ("Execute", 11, 22), ("Buffer", 22, 24)],
    "visual": [("Read", 0, 2), ("Generate", 2, 10), ("Commit", 10, 11), ("Execute", 11, 22), ("Buffer", 22, 24)],
    "form": [("Read", 0, 2), ("Generate", 2, 10), ("Commit", 10, 11), ("Execute", 11, 22), ("Buffer", 22, 24)],
    "problem-id": [("Read", 0, 2), ("Generate", 2, 10), ("Commit", 10, 13), ("Execute", 13, 22), ("Buffer", 22, 24)],
}
REQUIRED_REVEALS = {"ceed-2025-b-q4", "ceed-2022-b-q4"}

errors = []


def err(msg):
    errors.append(msg)


def banned_terms():
    terms = []
    for line in BANNED.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            terms.append(re.compile(r"(?<![\w-])" + re.escape(line) + r"(?![\w-])", re.I))
    return terms


def check_svg(path, cid):
    s = path.read_text()
    root = re.search(r"<svg\b[^>]*>", s)
    if not root:
        return err(f"{cid}: svg has no root element")
    tag = root.group(0)
    if "viewBox=" not in tag:
        err(f"{cid}: svg root has no viewBox")
    if re.search(r"\s(width|height)=", tag):
        err(f"{cid}: svg root sets width/height")
    if re.search(r"#[0-9a-fA-F]{3,8}\b", s):
        err(f"{cid}: svg contains a hex colour")
    for attr, val in re.findall(r"\b(fill|stroke|color|stop-color)=\"([^\"]*)\"", s):
        if val not in ("currentColor", "none"):
            err(f"{cid}: svg {attr}=\"{val}\" (only currentColor/none allowed)")
    if re.search(r"style=\"[^\"]*(fill|stroke|color)\s*:", s):
        err(f"{cid}: svg sets colour through style")


def check_cards():
    cards = json.loads(CARDS.read_text())
    if not isinstance(cards, list):
        return err("cards.json is not a list")
    if not CARD_COUNT[0] <= len(cards) <= CARD_COUNT[1]:
        err(f"card count {len(cards)} outside {CARD_COUNT}")
    terms = banned_terms()
    ids, used_images, reveals = set(), set(), set()
    for c in cards:
        cid = c.get("id", "?")
        keys = set(c)
        need = {"id", "category", "priority", "front", "back", "credit"}
        if not need <= keys or keys - need - {"revealsPromptIds"}:
            err(f"{cid}: keys {sorted(keys)}")
            continue
        if not re.fullmatch(r"card-[a-z0-9]+(-[a-z0-9]+)*", cid):
            err(f"{cid}: bad id")
        if cid in ids:
            err(f"{cid}: duplicate id")
        ids.add(cid)
        if c["category"] not in CATEGORIES:
            err(f"{cid}: bad category {c['category']}")
        if c["priority"] not in PRIORITIES:
            err(f"{cid}: bad priority {c['priority']}")
        front = c["front"]
        if not isinstance(front, dict) or set(front) != {"text", "image"}:
            err(f"{cid}: front must be {{text, image}}")
            continue
        if not isinstance(front["text"], str) or not front["text"].strip():
            err(f"{cid}: empty front text")
        lines = [l for l in c["back"].split("\n") if l.strip()] if isinstance(c["back"], str) else []
        if not 1 <= len(lines) <= 4:
            err(f"{cid}: back has {len(lines)} lines (1–4)")
        text = " ".join([front["text"], c["back"]])
        for t in terms:
            if t.search(text):
                err(f"{cid}: banned term '{t.pattern}'")
        if "revealsPromptIds" in c:
            r = c["revealsPromptIds"]
            if not isinstance(r, list) or not r or not all(isinstance(x, str) for x in r):
                err(f"{cid}: revealsPromptIds must be a non-empty string list")
            else:
                reveals.update(r)
        img, credit = front["image"], c["credit"]
        if img is None:
            if credit is not None:
                err(f"{cid}: credit without image")
            continue
        if not re.fullmatch(r"images/card-[a-z0-9-]+\.(jpg|svg)", img) or img != f"images/{cid}.{img.rsplit('.', 1)[1]}":
            err(f"{cid}: image path {img} must be images/<id>.jpg|svg")
        path = ROOT / "content/cards" / img
        used_images.add(path.name)
        if not path.exists():
            err(f"{cid}: missing {img}")
            continue
        if img.endswith(".svg"):
            check_svg(path, cid)
            if credit is not None:
                err(f"{cid}: drawn svg must have credit null")
            continue
        with Image.open(path) as im:
            if max(im.size) > MAX_PX:
                err(f"{cid}: {im.size} exceeds {MAX_PX}px")
            if im.format != "JPEG":
                err(f"{cid}: not a JPEG")
        if not isinstance(credit, dict) or set(credit) != {"author", "licence", "sourceUrl"}:
            err(f"{cid}: photo needs credit {{author, licence, sourceUrl}}")
            continue
        if not credit["author"].strip():
            err(f"{cid}: empty author")
        if not LICENCE.match(credit["licence"]):
            err(f"{cid}: licence '{credit['licence']}' not allowed")
        if not credit["sourceUrl"].startswith("https://commons.wikimedia.org/wiki/File:"):
            err(f"{cid}: sourceUrl not a Commons file page")
    missing_cats = CATEGORIES - {c.get("category") for c in cards}
    if missing_cats:
        err(f"categories without cards: {sorted(missing_cats)}")
    if not REQUIRED_REVEALS <= reveals:
        err(f"missing revealsPromptIds: {sorted(REQUIRED_REVEALS - reveals)}")
    orphans = sorted(p.name for p in IMAGES.iterdir() if p.is_file() and p.name not in used_images)
    if orphans:
        err(f"orphan images: {orphans}")
    return cards


def check_playbooks():
    books = json.loads(PLAYBOOKS.read_text())
    slots = [b.get("slot") for b in books]
    if sorted(slots) != sorted(SLOTS) or len(slots) != len(set(slots)):
        err(f"playbook slots {slots} must be exactly {SLOTS}")
    terms = banned_terms()
    for b in books:
        s = b.get("slot", "?")
        if set(b) != {"slot", "name", "decision", "script", "failureModes", "criteria"}:
            err(f"playbook {s}: keys {sorted(b)}")
            continue
        for k in ("name", "decision"):
            if not isinstance(b[k], str) or not b[k].strip():
                err(f"playbook {s}: empty {k}")
        for k in ("failureModes", "criteria"):
            if not isinstance(b[k], list) or not b[k] or not all(isinstance(x, str) and x.strip() for x in b[k]):
                err(f"playbook {s}: {k} must be a non-empty string list")
        if len(b["criteria"]) != 4:
            err(f"playbook {s}: expected 4 criteria")
        rows = b["script"]
        t = 0
        for r in rows:
            if set(r) != {"from", "to", "phase", "doThis"} or r["phase"] not in PHASES or not r["doThis"].strip():
                err(f"playbook {s}: bad row {r}")
                continue
            if r["from"] != t or r["to"] <= r["from"]:
                err(f"playbook {s}: row {r['phase']} {r['from']}–{r['to']} not contiguous from {t}")
            t = r["to"]
        merged = []
        for r in rows:
            if merged and merged[-1][0] == r["phase"]:
                merged[-1] = (r["phase"], merged[-1][1], r["to"])
            else:
                merged.append((r["phase"], r["from"], r["to"]))
        if s in SPEC_SCRIPTS and merged != SPEC_SCRIPTS[s]:
            err(f"playbook {s}: script {merged} != spec {SPEC_SCRIPTS[s]}")
        if s == "problem-id" and not any(r["phase"] == "Commit" and (r["from"], r["to"]) == (11, 13) for r in rows):
            err("playbook problem-id: needs the 11–13 pick row")
        blob = json.dumps(b, ensure_ascii=False)
        for term in terms:
            if term.search(blob):
                err(f"playbook {s}: banned term '{term.pattern}'")


def main():
    cards = check_cards() or []
    check_playbooks()
    if errors:
        print(f"FAIL: {len(errors)} problem(s)")
        for e in errors:
            print(" -", e)
        sys.exit(1)
    photos = sum(1 for c in cards if c["credit"])
    svgs = sum(1 for c in cards if c["front"]["image"] and c["front"]["image"].endswith(".svg"))
    print(f"OK: {len(cards)} cards ({photos} photos, {svgs} diagrams, {len(cards) - photos - svgs} text-only); 5 playbooks match spec")


if __name__ == "__main__":
    main()
