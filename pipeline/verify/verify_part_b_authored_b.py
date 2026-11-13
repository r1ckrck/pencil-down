"""Verify content/part-b/prompts-authored-b.json (authored Form and Problem-identification prompts).

Run from anywhere:  python3 -I pipeline/verify/verify_part_b_authored_b.py
Exit code 0 = pass. Prints every failure, then a short summary (counts, twist share, spread).
"""
import collections
import itertools
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PART_B = REPO / "content" / "part-b"
FILE = PART_B / "prompts-authored-b.json"
BANNED_FILE = REPO / "content" / "meta" / "banned.txt"

SLOTS = {"form", "problem-id"}
MIN_PER_SLOT = 55
KEYS = {"id", "source", "origin", "slot", "title", "text", "rules", "criteria", "images", "tags"}
TAG_KEYS = {"user", "setting", "object", "pov", "twist", "hook"}
# Beyond banned.txt: politics, religious conflict, named disasters, death.
EXTRA_BANNED = [
    "politics", "political", "minister", "MLA", "MP", "parliament", "vote", "voting", "campaign rally",
    "hindu", "muslim", "sikh", "christian", "religious", "riots", "pogrom",
    "flood of 20\\d\\d", "kedarnath", "wayanad landslide", "kumbh", "dharali", "chamoli",
    "death", "dead", "dies", "died", "dying", "killed", "corpse", "body bag", "mortuary",
]
SVG_ALLOWED_PAINT = {"currentColor", "none"}
SVG_NS = "{http://www.w3.org/2000/svg}"

errors = []


def err(pid, msg):
    errors.append(f"{pid}: {msg}")


def words(s):
    return re.findall(r"[a-z0-9]+", s.lower())


def shingles(s, n):
    w = words(s)
    return {tuple(w[i:i + n]) for i in range(max(0, len(w) - n + 1))}


def jaccard(a, b):
    return len(a & b) / len(a | b) if a and b else 0.0


def banned_patterns():
    terms = []
    for line in BANNED_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            terms.append(re.escape(line))
    terms += EXTRA_BANNED
    return [(t, re.compile(r"(?<![A-Za-z0-9])" + t + r"(?![A-Za-z0-9])", re.I)) for t in terms]


def check_svg(pid, path):
    raw = path.read_text(encoding="utf-8")
    if "#" in raw:
        err(pid, f"{path.name}: contains '#' (hex colour or fragment ref)")
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as e:
        err(pid, f"{path.name}: not valid XML ({e})")
        return
    if root.tag != SVG_NS + "svg":
        err(pid, f"{path.name}: root is not <svg>")
    if not root.get("viewBox"):
        err(pid, f"{path.name}: no viewBox")
    for a in ("width", "height"):
        if root.get(a) is not None:
            err(pid, f"{path.name}: root has {a}")
    for el in root.iter():
        for a in ("fill", "stroke"):
            v = el.get(a)
            if v is not None and v not in SVG_ALLOWED_PAINT:
                err(pid, f"{path.name}: {a}='{v}' not allowed")
        if el.get("style") is not None:
            err(pid, f"{path.name}: inline style attribute not allowed")
        for a in ("opacity", "stroke-opacity", "stop-color", "color"):
            if el.get(a) is not None:
                err(pid, f"{path.name}: attribute {a} not allowed (use fill-opacity)")
        fo = el.get("fill-opacity")
        if fo is not None and not (0 <= float(fo) <= 1):
            err(pid, f"{path.name}: fill-opacity {fo} out of range")


def main():
    data = json.loads(FILE.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        print("FAIL: top level is not a list")
        return 1
    pats = banned_patterns()

    # ids unique within this file and across every other prompts*.json
    other_ids = set()
    for f in PART_B.glob("prompts*.json"):
        if f.name != FILE.name:
            other_ids |= {p.get("id") for p in json.loads(f.read_text(encoding="utf-8"))}
    seen = set()
    per_slot = collections.Counter()
    for p in data:
        pid = p.get("id", "<no id>")
        if set(p) != KEYS:
            err(pid, f"keys {sorted(set(p) ^ KEYS)} missing or extra")
            continue
        if pid in seen:
            err(pid, "duplicate id")
        if pid in other_ids:
            err(pid, "id also used in another prompts*.json")
        seen.add(pid)
        m = re.fullmatch(r"pb-(form|problem-id)-(\d{4})", pid)
        if not m:
            err(pid, "id does not match pb-<slot>-<NNNN>")
        elif m.group(1) != p["slot"]:
            err(pid, f"id slot != slot '{p['slot']}'")
        if p["slot"] not in SLOTS:
            err(pid, f"slot '{p['slot']}' not form/problem-id")
        per_slot[p["slot"]] += 1
        if p["source"] != "authored":
            err(pid, "source must be 'authored'")
        if p["origin"] is not None:
            err(pid, "origin must be null")
        if not isinstance(p["title"], str) or not p["title"].strip() or len(p["title"]) > 60:
            err(pid, "title empty or longer than 60 chars")
        if not isinstance(p["text"], str) or len(words(p["text"])) < 25:
            err(pid, "text missing or under 25 words")
        if not isinstance(p["rules"], list) or not all(isinstance(r, str) and r.strip() for r in p["rules"]):
            err(pid, "rules must be a list of non-empty strings")
        # criteria
        c = p["criteria"]
        if not isinstance(c, list) or len(c) != 4:
            err(pid, "criteria must be a list of 4")
        else:
            for x in c:
                if set(x) != {"name", "marks"} or not isinstance(x["name"], str) or not x["name"].strip() \
                        or not isinstance(x["marks"], int) or x["marks"] <= 0:
                    err(pid, f"bad criterion {x}")
            if sum(x.get("marks", 0) for x in c) != 20:
                err(pid, f"criteria marks sum to {sum(x.get('marks', 0) for x in c)}, not 20")
            if len({x['name'] for x in c}) != 4:
                err(pid, "criteria names repeat")
        # images
        imgs = p["images"]
        if not isinstance(imgs, list):
            err(pid, "images must be a list")
            imgs = []
        if p["slot"] == "form" and not imgs:
            err(pid, "form prompt has no stimulus image")
        for i, im in enumerate(imgs, 1):
            if set(im) != {"path", "alt"} or not im["alt"].strip():
                err(pid, f"image {i} needs path and non-empty alt")
                continue
            if im["path"] != f"images/authored/{pid}-{i}.svg":
                err(pid, f"image {i} path '{im['path']}' should be images/authored/{pid}-{i}.svg")
            fp = PART_B / im["path"]
            if not fp.is_file():
                err(pid, f"image file missing: {im['path']}")
            else:
                check_svg(pid, fp)
        # tags
        t = p["tags"]
        if not isinstance(t, dict) or not set(t) <= TAG_KEYS or not all(isinstance(v, str) and v.strip() for v in t.values()):
            err(pid, "tags must be a dict of non-empty strings with known keys")
        elif not t.get("user") or not t.get("setting"):
            err(pid, "tags.user and tags.setting are required")
        # banned terms everywhere a reader sees text
        blob = " ".join([p["title"], p["text"], " ".join(p["rules"]), " ".join(t.values() if isinstance(t, dict) else []),
                         " ".join(im.get("alt", "") for im in imgs)])
        for term, rx in pats:
            if rx.search(blob):
                err(pid, f"banned term '{term}'")
        # register: second person present in every prompt
        if not re.search(r"\byou(r)?\b|^(conceptualise|visualise|identify|list|draw|write|re-imagine|inspired)", p["text"], re.I | re.M) \
                and not re.search(r"\b(Conceptualise|Visualise|Identify|List|Draw|Write|Re-imagine|Imagine|Sketch|Design|Render)\b", p["text"]):
            err(pid, "no direct instruction to the candidate")

    for s in SLOTS:
        if per_slot[s] < MIN_PER_SLOT:
            errors.append(f"slot {s}: {per_slot[s]} prompts, need >= {MIN_PER_SLOT}")

    # duplicate user + setting + task
    combo = collections.defaultdict(list)
    for p in data:
        t = p.get("tags", {})
        task = t.get("object") or p["title"]
        combo[(p["slot"], t.get("user", "").lower(), t.get("setting", "").lower(), task.lower())].append(p["id"])
    for k, ids in combo.items():
        if len(ids) > 1:
            errors.append(f"duplicate user+setting+task {k}: {ids}")

    # near-duplicate text inside the file (same slot)
    sh = {p["id"]: shingles(p["text"], 4) for p in data}
    for a, b in itertools.combinations(data, 2):
        if a["slot"] == b["slot"]:
            j = jaccard(sh[a["id"]], sh[b["id"]])
            # boilerplate tails are shared on purpose; flag only when the scenario itself overlaps
            if j > 0.55:
                errors.append(f"near-duplicate texts {a['id']} / {b['id']} (4-gram Jaccard {j:.2f})")

    # not a copy of any real CEED prompt: compare the scenario part (first paragraph)
    real_file = PART_B / "prompts-real.json"
    if real_file.is_file():
        real = json.loads(real_file.read_text(encoding="utf-8"))
        real_sh = [(r["id"], shingles(r["text"], 5)) for r in real]
        for p in data:
            first = shingles(p["text"].split("\n\n")[0], 5)
            for rid, rs in real_sh:
                inter = len(first & rs)
                if first and inter / len(first) > 0.35:
                    errors.append(f"{p['id']}: first paragraph overlaps real prompt {rid} ({inter}/{len(first)} 5-grams)")

    # summary
    twist = collections.Counter(p["slot"] for p in data if p.get("tags", {}).get("twist"))
    hooks = collections.Counter(p["slot"] for p in data if p.get("tags", {}).get("hook"))
    print(f"prompts: {len(data)}  " + "  ".join(f"{s}={per_slot[s]}" for s in sorted(SLOTS)))
    print("twist share: " + "  ".join(f"{s}={twist[s]}/{per_slot[s]} ({twist[s] / max(1, per_slot[s]):.0%})" for s in sorted(SLOTS)))
    print("hook share:  " + "  ".join(f"{s}={hooks[s]}/{per_slot[s]}" for s in sorted(SLOTS)))
    n_img = sum(len(p["images"]) for p in data)
    print(f"stimulus SVGs checked: {n_img}")
    if errors:
        print(f"\nFAIL: {len(errors)} problem(s)")
        for e in errors:
            print("  - " + e)
        return 1
    print("\nPASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
