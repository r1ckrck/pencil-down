"""Self-check for content/part-b/prompts-real.json and papers-real.json.

Usage: verify_part_b_real.py <repo_root>
Checks the PartBPrompt / PartBPaper shapes (app/src/content/types.ts), criteria totals,
image paths, id uniqueness, paper references and the banned-term list. Exits 1 on any failure.
"""
import json
import pathlib
import re
import sys

SLOTS = {"sketching", "creativity", "visual", "form", "problem-id"}
PROMPT_KEYS = {"id", "source", "origin", "slot", "title", "text", "rules", "criteria", "images", "tags"}
ORIGIN_KEYS = {"exam", "year", "qno", "originalSection", "adapted"}
TAG_KEYS = {"user", "setting", "object", "pov", "twist", "hook"}
PAPER_KEYS = {"id", "year", "label", "durationMin", "promptIds"}
# 2020+ prompts whose printed text had to change (stimulus printed only in the answer booklet).
ADAPTED_2020_PLUS = {"ceed-2020-b-q2", "ceed-2021-b-q2"}
ID_RE = re.compile(r"^ceed-(\d{4})(-s[12])?-b-q(\d+)[a-d]?$")

errors: list[str] = []


def err(where: str, msg: str) -> None:
    errors.append(f"{where}: {msg}")


def is_str(v) -> bool:
    return isinstance(v, str) and v.strip() != ""


def is_int(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def strings_of(p: dict) -> list[str]:
    out = [p["title"], p["text"], *p["rules"], *(c["name"] for c in p["criteria"]), *(i["alt"] for i in p["images"]), *p["tags"].values()]
    if p.get("origin"):
        out.append(p["origin"]["originalSection"])
    return out


def check_prompt(p: dict, base: pathlib.Path) -> None:
    pid = p.get("id", "<no id>")
    if not isinstance(p, dict) or set(p) != PROMPT_KEYS:
        err(pid, f"keys {sorted(set(p) ^ PROMPT_KEYS)} differ from the PartBPrompt shape")
        return
    m = ID_RE.match(pid)
    if not m:
        err(pid, "id does not match ceed-<year>[-s1|-s2]-b-q<n>[a-d]")
    if p["source"] != "real":
        err(pid, "source must be 'real'")
    o = p["origin"]
    if not isinstance(o, dict) or set(o) != ORIGIN_KEYS:
        err(pid, "origin shape")
    else:
        if o["exam"] != "CEED" or not is_int(o["year"]) or not is_int(o["qno"]) or not is_str(o["originalSection"]) or not isinstance(o["adapted"], bool):
            err(pid, "origin field types")
        if m and (int(m.group(1)) != o["year"] or int(m.group(3)) != o["qno"]):
            err(pid, "id year/qno disagree with origin")
        if o["adapted"] != (o["year"] < 2020 or pid in ADAPTED_2020_PLUS):
            err(pid, "adapted must be true before 2020 or for a listed 2020+ change, false otherwise")
    if p["slot"] not in SLOTS:
        err(pid, f"bad slot {p['slot']!r}")
    for k in ("title", "text"):
        if not is_str(p[k]):
            err(pid, f"{k} empty or not a string")
    if not isinstance(p["rules"], list) or not all(is_str(r) for r in p["rules"]):
        err(pid, "rules must be a list of non-empty strings")
    crit = p["criteria"]
    if not isinstance(crit, list) or not crit or not all(isinstance(c, dict) and set(c) == {"name", "marks"} and is_str(c["name"]) and isinstance(c["marks"], (int, float)) and c["marks"] > 0 for c in crit):
        err(pid, "criteria shape")
    elif sum(c["marks"] for c in crit) != 20:
        err(pid, f"criteria sum to {sum(c['marks'] for c in crit)}, not 20")
    if o and isinstance(o, dict) and o.get("adapted") and isinstance(crit, list) and len(crit) not in (2, 3, 4):
        err(pid, f"adapted prompt has {len(crit)} criteria")
    if not isinstance(p["images"], list):
        err(pid, "images must be a list")
    else:
        for im in p["images"]:
            if not isinstance(im, dict) or set(im) != {"path", "alt"} or not is_str(im["path"]) or not is_str(im["alt"]):
                err(pid, "image shape")
                continue
            if not (base / im["path"]).is_file():
                err(pid, f"missing image {im['path']}")
    t = p["tags"]
    if not isinstance(t, dict) or not set(t) <= TAG_KEYS or not all(is_str(v) for v in t.values()):
        err(pid, "tags shape")


def banned_patterns(path: pathlib.Path) -> list[tuple[str, re.Pattern]]:
    out = []
    for line in path.read_text().splitlines():
        term = line.strip()
        if not term or term.startswith("#"):
            continue
        rx = r"\s+".join(re.escape(w) for w in term.split())
        out.append((term, re.compile(rf"(?<![\w-]){rx}(?![\w-])", re.IGNORECASE)))
    return out


def main() -> int:
    root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    base = root / "content" / "part-b"
    prompts = json.loads((base / "prompts-real.json").read_text())
    papers = json.loads((base / "papers-real.json").read_text())

    if not isinstance(prompts, list) or not isinstance(papers, list):
        print("FAIL: top level must be arrays")
        return 1

    ids = [p.get("id") for p in prompts]
    for dup in sorted({i for i in ids if ids.count(i) > 1}):
        err(dup, "duplicate prompt id")
    for p in prompts:
        check_prompt(p, base)

    banned = banned_patterns(root / "content" / "meta" / "banned.txt")
    for p in prompts:
        if set(p) != PROMPT_KEYS:
            continue
        for s in strings_of(p):
            for term, rx in banned:
                if rx.search(s):
                    err(p["id"], f"banned term {term!r}")

    referenced = {im["path"] for p in prompts for im in p.get("images", []) if isinstance(im, dict)}
    for f in sorted((base / "images" / "real").glob("*.png")):
        rel = f.relative_to(base).as_posix()
        if rel not in referenced:
            err(rel, "image file not referenced by any prompt")

    by_id = {p["id"]: p for p in prompts if "id" in p}
    pids = [pp.get("id") for pp in papers]
    for dup in sorted({i for i in pids if pids.count(i) > 1}):
        err(dup, "duplicate paper id")
    for pp in papers:
        pid = pp.get("id", "<no id>")
        if set(pp) != PAPER_KEYS:
            err(pid, "paper keys differ from the PartBPaper shape")
            continue
        if pid != f"ceed-{pp['year']}-b" or pp["label"] != f"CEED {pp['year']} Part B" or pp["durationMin"] != 120:
            err(pid, "paper id/label/duration")
        if len(pp["promptIds"]) != 5 or len(set(pp["promptIds"])) != 5:
            err(pid, "paper must list five distinct prompts")
        slots = []
        for i, q in enumerate(pp["promptIds"], 1):
            pr = by_id.get(q)
            if not pr:
                err(pid, f"references missing prompt {q}")
                continue
            if pr["origin"]["year"] != pp["year"] or pr["origin"]["qno"] != i:
                err(pid, f"{q} out of printed order or from another year")
            slots.append(pr["slot"])
        if slots and slots != ["sketching", "creativity", "visual", "form", "problem-id"]:
            err(pid, f"slot order {slots}")

    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1
    print(f"PASS: {len(prompts)} prompts, {len(papers)} papers, {len(referenced)} images")
    return 0


if __name__ == "__main__":
    sys.exit(main())
