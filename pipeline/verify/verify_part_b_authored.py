"""Verify authored Part B prompt files against the PartBPrompt contract and the authoring rules.

Usage: python3 -I pipeline/verify/verify_part_b_authored.py content/part-b/prompts-authored-a.json [more.json ...] [--min 55]

Checks: shape, criteria sum to 20, unique ids (across all files given), image paths exist,
SVG hygiene (no '#', viewBox set, no root width/height, currentColor/none paint only, no <text>),
banned terms (content/meta/banned.txt plus extra sensitive terms, whole-word), at least --min prompts
per slot present, and no repeated user + setting within a slot.
"""
import json
import re
import sys
import collections
import xml.etree.ElementTree as ET
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PART_B = REPO / "content" / "part-b"
BANNED_FILE = REPO / "content" / "meta" / "banned.txt"

SLOTS = {"sketching", "creativity", "visual", "form", "problem-id"}
TOP_KEYS = {"id", "source", "origin", "slot", "title", "text", "rules", "criteria", "images", "tags"}
TAG_KEYS = {"user", "setting", "object", "pov", "twist", "hook"}
# Sensitive topics beyond banned.txt: politics, religious conflict, death.
EXTRA_BANNED = ["politics", "political", "politician", "religious conflict", "death", "dead", "died", "dying",
                "kill", "killed", "killing", "corpse", "massacre", "war", "violence", "disaster"]
PAINT_OK = {"currentColor", "none"}


def load_banned():
    terms = []
    for line in BANNED_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            terms.append(line)
    return terms + EXTRA_BANNED


def strings_of(p):
    yield p.get("title", "")
    yield p.get("text", "")
    yield from p.get("rules", [])
    for c in p.get("criteria", []):
        yield c.get("name", "")
    for im in p.get("images", []):
        yield im.get("alt", "")
    yield from (v for v in p.get("tags", {}).values() if isinstance(v, str))


def check_svg(path, err):
    raw = path.read_text()
    if "#" in raw:
        err(f"{path.name}: contains '#'")
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as e:
        err(f"{path.name}: not valid XML ({e})")
        return
    if not root.tag.endswith("svg"):
        err(f"{path.name}: root is not <svg>")
    if "viewBox" not in root.attrib:
        err(f"{path.name}: root has no viewBox")
    for a in ("width", "height"):
        if a in root.attrib:
            err(f"{path.name}: root has {a} attribute")
    for el in root.iter():
        tag = el.tag.split("}")[-1]
        if tag == "text":
            err(f"{path.name}: contains a <text> element")
        for a in ("fill", "stroke", "color"):
            v = el.attrib.get(a)
            if v is not None and v not in PAINT_OK:
                err(f"{path.name}: {tag} has {a}=\"{v}\"")
        if "style" in el.attrib:
            err(f"{path.name}: {tag} uses an inline style attribute")


def main(argv):
    min_per_slot = 55
    files = []
    it = iter(argv)
    for a in it:
        if a == "--min":
            min_per_slot = int(next(it))
        else:
            files.append(Path(a))
    if not files:
        files = [PART_B / "prompts-authored-a.json"]

    errors = []
    banned = load_banned()
    banned_res = [(t, re.compile(r"(?<![\w-])" + re.escape(t) + r"(?![\w-])", re.I)) for t in banned]
    seen_ids = {}

    for f in files:
        f = f if f.is_absolute() else (Path.cwd() / f)
        def err(msg, f=f):
            errors.append(f"{f.name}: {msg}")
        try:
            data = json.loads(f.read_text())
        except Exception as e:
            err(f"cannot load JSON ({e})")
            continue
        if not isinstance(data, list):
            err("top level is not a list")
            continue

        per_slot = collections.Counter()
        combos = collections.defaultdict(list)
        titles = collections.defaultdict(list)
        for i, p in enumerate(data):
            pid = p.get("id", f"<index {i}>") if isinstance(p, dict) else f"<index {i}>"
            def e(msg, pid=pid):
                err(f"{pid}: {msg}")
            if not isinstance(p, dict):
                e("record is not an object")
                continue
            keys = set(p)
            if keys != TOP_KEYS:
                e(f"keys differ: missing {sorted(TOP_KEYS - keys)}, extra {sorted(keys - TOP_KEYS)}")
            slot = p.get("slot")
            if slot not in SLOTS:
                e(f"bad slot {slot!r}")
            if not re.fullmatch(rf"pb-{re.escape(str(slot))}-\d{{4}}", str(p.get("id", ""))):
                e("id must be pb-<slot>-NNNN matching its slot")
            if pid in seen_ids:
                e(f"duplicate id (also in {seen_ids[pid]})")
            seen_ids[pid] = f.name
            if p.get("source") != "authored":
                e("source must be 'authored'")
            if p.get("origin") is not None:
                e("origin must be null")
            for k in ("title", "text"):
                if not isinstance(p.get(k), str) or not p.get(k).strip():
                    e(f"{k} must be a non-empty string")
            rules = p.get("rules")
            if not isinstance(rules, list) or not all(isinstance(r, str) and r.strip() for r in rules):
                e("rules must be a list of non-empty strings")
            crit = p.get("criteria")
            if not isinstance(crit, list) or len(crit) != 4:
                e("criteria must be a list of 4")
            else:
                ok = all(isinstance(c, dict) and set(c) == {"name", "marks"} and isinstance(c["name"], str)
                         and c["name"].strip() and isinstance(c["marks"], int) and c["marks"] > 0 for c in crit)
                if not ok:
                    e("each criterion needs a name and positive integer marks")
                elif sum(c["marks"] for c in crit) != 20:
                    e(f"criteria sum to {sum(c['marks'] for c in crit)}, not 20")
                if len({c.get('name') for c in crit if isinstance(c, dict)}) != len(crit):
                    e("criteria names repeat")
            imgs = p.get("images")
            if not isinstance(imgs, list):
                e("images must be a list")
                imgs = []
            for im in imgs:
                if not isinstance(im, dict) or set(im) != {"path", "alt"} or not all(isinstance(im.get(k), str) and im.get(k).strip() for k in ("path", "alt")):
                    e("each image needs non-empty path and alt")
                    continue
                ip = PART_B / im["path"]
                if not ip.is_file():
                    e(f"image missing: {im['path']}")
                elif ip.suffix == ".svg":
                    check_svg(ip, e)
            tags = p.get("tags")
            if not isinstance(tags, dict):
                e("tags must be an object")
                tags = {}
            if set(tags) - TAG_KEYS:
                e(f"unknown tag keys {sorted(set(tags) - TAG_KEYS)}")
            if not all(isinstance(v, str) and v.strip() for v in tags.values()):
                e("tag values must be non-empty strings")
            for s in strings_of(p):
                for term, rx in banned_res:
                    if rx.search(s):
                        e(f"banned term {term!r} in: {s[:80]!r}")
            if slot in SLOTS:
                per_slot[slot] += 1
                u, st = tags.get("user"), tags.get("setting")
                if u and st:
                    combos[(slot, u.strip().lower(), st.strip().lower())].append(pid)
                titles[(slot, str(p.get("title", "")).strip().lower())].append(pid)
                if re.search(r"\bpb-|TODO|TBD|lorem", str(p.get("text", ""))):
                    e("text carries a placeholder")

        for slot, n in sorted(per_slot.items()):
            if n < min_per_slot:
                err(f"slot {slot}: {n} prompts, need at least {min_per_slot}")
        for (slot, u, st), ids in combos.items():
            if len(ids) > 1:
                err(f"slot {slot}: user+setting repeated ({u} / {st}): {ids}")
        for (slot, t), ids in titles.items():
            if len(ids) > 1:
                err(f"slot {slot}: title repeated ({t}): {ids}")
        print(f"{f.name}: {len(data)} prompts; " + ", ".join(f"{s} {n}" for s, n in sorted(per_slot.items()))
              + f"; twist share " + ", ".join(
                  f"{s} {sum(1 for p in data if isinstance(p, dict) and p.get('slot') == s and 'twist' in p.get('tags', {}))}/{n}"
                  for s, n in sorted(per_slot.items())))

    if errors:
        print(f"FAIL: {len(errors)} problem(s)")
        for m in errors:
            print("  " + m)
        return 1
    print("PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
