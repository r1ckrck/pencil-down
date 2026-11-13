"""List allowed Commons candidates for queries. Usage: python -I probe.py <scratch> 'query' ..."""
import sys
from pathlib import Path
sys.argv = [sys.argv[0], sys.argv[1], "/nonexistent"] + sys.argv[2:]
src = (Path(sys.argv[1]) / "cardbuild/fetch.py").read_text().split("missing = []")[0]
src = src.replace('OUT.mkdir(parents=True, exist_ok=True)', '')
g = {"__name__": "probe"}
exec(compile(src, "fetch", "exec"), g)
for q in sys.argv[3:]:
    print("==", q)
    for i, c in enumerate(g["candidates"](q)[:8]):
        print(f"  #{i} {c['title']} [{c['licence']}]")
