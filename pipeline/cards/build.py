"""Assemble content/cards/cards.json. Usage: python -I build.py <scratch> <repo>"""
import json, sys
from pathlib import Path

SCR, REPO = Path(sys.argv[1]), Path(sys.argv[2])
sys.path.insert(0, str(SCR / "cardbuild"))
from cards_data import CARDS  # noqa: E402

credits = json.loads((SCR / "cardbuild/credits.json").read_text())
overrides_path = SCR / "cardbuild/overrides.json"
overrides = json.loads(overrides_path.read_text()) if overrides_path.exists() else {}
img_dir = REPO / "content/cards/images"
out, textonly = [], []
for c in CARDS:
    spec = overrides.get(c["id"], c["img"])
    image, credit = None, None
    if spec == "svg":
        image = f"images/{c['id']}.svg"
    elif spec and spec != "none":
        if c["id"] in credits and (img_dir / f"{c['id']}.jpg").exists():
            image = f"images/{c['id']}.jpg"
            k = credits[c["id"]]
            credit = {"author": k["author"], "licence": k["licence"], "sourceUrl": k["sourceUrl"]}
        else:
            textonly.append(c["id"])
    card = {"id": c["id"], "category": c["cat"], "priority": c["pri"],
            "front": {"text": c["front"], "image": image}, "back": c["back"], "credit": credit}
    if c["reveals"]:
        card["revealsPromptIds"] = c["reveals"]
    out.append(card)
(REPO / "content/cards/cards.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
print(len(out), "cards; wanted image but text-only:", textonly)
