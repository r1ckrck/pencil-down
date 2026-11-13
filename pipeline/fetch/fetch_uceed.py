"""Download every UCEED question paper and official answer key listed on the UCEED site.

Reads the links from https://www.uceed.iitb.ac.in/2027/downloads.html (the previous-papers
page, question-paper.html, links only the brochure). Only years that have both a question
paper and an official key are kept. Saves to pipeline/raw/uceed/<year>-qp.pdf / <year>-key.pdf.
Files already on disk are skipped.

Run: pipeline/.venv/bin/python -I pipeline/fetch/fetch_uceed.py   (--check: list links only)
"""
import re
import sys
import urllib.request
from pathlib import Path

SITE = "https://www.uceed.iitb.ac.in/2027/"
PAGES = ["downloads.html", "question-paper.html"]
OUT = Path(__file__).resolve().parents[1] / "raw" / "uceed"
UA = {"User-Agent": "Mozilla/5.0 (pencil-down content pipeline)"}

# The site's naming varies: UCEED2015_Question_Paper.pdf, UCEED_2023_Question_Paper.pdf.
LINK_RE = re.compile(r'href="([^"#]*UCEED_?(\d{4})_(Question_Paper|Answer_Key)\.pdf)', re.I)


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def links() -> dict[str, str]:
    """local name -> absolute URL, for years with both a paper and a key."""
    found = {}
    for page in PAGES:
        html = get(SITE + page).decode("utf-8", "replace")
        for href, year, kind in LINK_RE.findall(html):
            local = f"{year}-{'qp' if kind.lower().startswith('q') else 'key'}.pdf"
            found.setdefault(local, SITE + href)
    years = {n[:4] for n in found}
    complete = {y for y in years if f"{y}-qp.pdf" in found and f"{y}-key.pdf" in found}
    for y in sorted(years - complete):
        print(f"skip {y}: no official key or no paper")
    return {n: u for n, u in found.items() if n[:4] in complete}


def main() -> int:
    files = links()
    if "--check" in sys.argv:
        for local, url in sorted(files.items()):
            print(f"{local:14} {url}")
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    failed = []
    for local, url in sorted(files.items()):
        dest = OUT / local
        if dest.exists() and dest.stat().st_size > 0:
            print(f"skip {local}")
            continue
        try:
            data = get(url)
            if not data.startswith(b"%PDF"):
                raise ValueError("not a PDF")
            dest.write_bytes(data)
            print(f"got  {local} ({len(data) // 1024} KB)")
        except Exception as e:
            print(f"FAIL {url}: {e}")
            failed.append(url)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
