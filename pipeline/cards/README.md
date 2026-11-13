# Card content builder

Rebuilds `content/cards/` from `cards_data.py` (card text) + `overrides.json` (chosen Commons files) + `credits.json`.
`fetch.py` pulls images from Wikimedia Commons, `svgs.py` draws diagram cards, `build.py` writes cards.json, `sheet.py` renders a review contact sheet. Run with `pipeline/.venv/bin/python -I`.
