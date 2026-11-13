"""Download every official CEED question paper (2010-2026) and answer key (2020-2026).

Saves to pipeline/raw/ceed/<year>-qp.pdf and <year>-key.pdf (2016 had two sessions: qp1, qp2).
Files already on disk are skipped. Run: pipeline/.venv/bin/python -I pipeline/fetch/fetch_ceed.py
Pass --check to only confirm every URL resolves (HTTP HEAD), without downloading.
"""
import sys
import urllib.request
from pathlib import Path

BASE = "https://www.ceed.iitb.ac.in/2027/downloads/"
OUT = Path(__file__).resolve().parents[1] / "raw" / "ceed"

# Local name -> remote file name, as linked from https://www.ceed.iitb.ac.in/2027/
# (the site's naming is inconsistent, including the "Qestion" typo for 2022).
FILES = {f"{y}-qp.pdf": f"CEED{y}qp.pdf" for y in range(2010, 2021) if y != 2016}
FILES |= {
    "2016-qp1.pdf": "CEED2016qp1.pdf",
    "2016-qp2.pdf": "CEED2016qp2.pdf",
    "2020-key.pdf": "CEED2020ans.pdf",
    "2021-qp.pdf": "CEED_2021_Question_Paper.pdf",
    "2021-key.pdf": "CEED_2021_Final_Answer_Keys.pdf",
    "2022-qp.pdf": "CEED_2022_Qestion_Paper.pdf",
    "2022-key.pdf": "CEED_2022_Answer_Key.pdf",
}
for y in range(2023, 2027):
    FILES[f"{y}-qp.pdf"] = f"CEED_{y}_Question_Paper.pdf"
    FILES[f"{y}-key.pdf"] = f"CEED_{y}_Answer_Key.pdf"

UA = {"User-Agent": "Mozilla/5.0 (pencil-down content pipeline)"}


def head_ok(url: str) -> bool:
    req = urllib.request.Request(url, method="HEAD", headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status == 200
    except Exception:
        return False


def main() -> int:
    check_only = "--check" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    failed = []
    for local, remote in sorted(FILES.items()):
        url = BASE + remote
        dest = OUT / local
        if check_only:
            ok = head_ok(url)
            print(f"{'ok  ' if ok else 'FAIL'} {url}")
            if not ok:
                failed.append(url)
            continue
        if dest.exists() and dest.stat().st_size > 0:
            print(f"skip {local}")
            continue
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
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
