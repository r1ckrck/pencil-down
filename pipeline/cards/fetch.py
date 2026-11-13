"""Fetch card images from Wikimedia Commons. Usage: python -I fetch.py <scratch_dir> <repo> [ids...]"""
import html, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

SCR, REPO = Path(sys.argv[1]), Path(sys.argv[2])
ONLY = set(sys.argv[3:])
sys.path.insert(0, str(SCR / "cardbuild"))
from cards_data import CARDS  # noqa: E402

UA = {"User-Agent": "pencil-down-content-builder/1.0"}
API = "https://commons.wikimedia.org/w/api.php"
ALLOWED = re.compile(r"^(public domain|pd|cc0|cc by(-sa)?( \d\.\d)?( [a-z\-]+)?)$", re.I)
DL = SCR / "commons-download"
DL.mkdir(exist_ok=True)
OUT = REPO / "content/cards/images"
OUT.mkdir(parents=True, exist_ok=True)
credits_path = SCR / "cardbuild/credits.json"
credits = json.loads(credits_path.read_text()) if credits_path.exists() else {}
overrides_path = SCR / "cardbuild/overrides.json"
overrides = json.loads(overrides_path.read_text()) if overrides_path.exists() else {}


def get(params):
    params = {**params, "format": "json"}
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers=UA)
    for attempt in range(7):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:  # rate limit / transient
            print("  api retry", e, flush=True)
            time.sleep(20 * (attempt + 1))
            err = e
    raise err


def candidates(q):
    base = dict(prop="imageinfo", iiprop="url|extmetadata|mime|size", iiurlwidth=960,
                iiextmetadatafilter="LicenseShortName|Artist|Credit")
    if q.startswith("File:"):
        data = get({**base, "action": "query", "titles": q})
    else:
        data = get({**base, "action": "query", "generator": "search", "gsrnamespace": 6,
                    "gsrsearch": q + " filetype:bitmap", "gsrlimit": 12})
    pages = list(data.get("query", {}).get("pages", {}).values())
    pages.sort(key=lambda p: p.get("index", 0))
    out = []
    for p in pages:
        ii = (p.get("imageinfo") or [None])[0]
        if not ii:
            continue
        md = ii.get("extmetadata", {})
        lic = html.unescape(re.sub(r"<[^>]+>", "", md.get("LicenseShortName", {}).get("value", ""))).strip()
        if not ALLOWED.match(lic):
            continue
        if ii.get("mime") not in ("image/jpeg", "image/png", "image/tiff", "image/webp", "image/svg+xml"):
            continue
        artist = md.get("Artist", {}).get("value", "") or md.get("Credit", {}).get("value", "")
        artist = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", artist))).strip() or "Unknown"
        out.append(dict(title=p["title"], licence=lic, author=artist[:160],
                        sourceUrl=ii["descriptionurl"], thumb=ii.get("thumburl") or ii["url"]))
    return out


def save(card_id, c):
    from PIL import Image
    req = urllib.request.Request(c["thumb"], headers=UA)
    raw = DL / (card_id + ".bin")
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                raw.write_bytes(r.read())
            break
        except Exception as e:
            print("  retry", card_id, e, flush=True)
            time.sleep(20 * (attempt + 1))
    else:
        raise RuntimeError("download failed " + card_id)
    im = Image.open(raw)
    im = Image.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, 255)), im.convert("RGBA")).convert("RGB")
    im.thumbnail((800, 800), Image.LANCZOS)
    im.save(OUT / (card_id + ".jpg"), "JPEG", quality=80, optimize=True)


missing = []
for card in CARDS:
    cid = card["id"]
    q = overrides.get(cid, card["img"])
    if not q or q == "svg" or q == "none":
        continue
    if ONLY and cid not in ONLY:
        continue
    if not ONLY and cid in credits:
        continue
    pick = int(q.split("#")[1]) if "#" in q else 0
    q = q.split("#")[0]
    cands = candidates(q)
    if len(cands) <= pick:
        print("MISSING", cid, q, len(cands))
        missing.append(cid)
        continue
    c = cands[pick]
    save(cid, c)
    credits[cid] = dict(author=c["author"], licence=c["licence"], sourceUrl=c["sourceUrl"],
                        title=c["title"], alternates=[x["title"] for x in cands[:6]])
    credits_path.write_text(json.dumps(credits, indent=1, ensure_ascii=False))
    print("OK", cid, c["title"], c["licence"], flush=True)
    time.sleep(2.5)
print("missing:", missing)
