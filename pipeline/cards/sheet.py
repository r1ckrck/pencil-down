"""Contact sheet. Usage: python -I sheet.py <out.png> <cols> <cell> files..."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

out, W, cell = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
fs = sys.argv[4:]
H = (len(fs) + W - 1) // W
sheet = Image.new("RGB", (W * cell, H * (cell + 22)), "white")
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
except Exception:
    font = None
for i, f in enumerate(fs):
    im = Image.open(f).convert("RGB")
    im.thumbnail((cell - 8, cell - 8))
    x, y = (i % W) * cell, (i // W) * (cell + 22)
    sheet.paste(im, (x + 4, y + 4))
    name = Path(f).name.replace("card-", "").split(".")[0]
    d.text((x + 4, y + cell + 2), name, fill="red", font=font)
sheet.save(out)
print(out, len(fs))
