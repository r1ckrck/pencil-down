"""Draw principle diagrams as SVG (currentColor only). Usage: python -I svgs.py <repo>"""
import math, sys
from pathlib import Path

OUT = Path(sys.argv[1]) / "content/cards/images"
OUT.mkdir(parents=True, exist_ok=True)
F = 'font-family="sans-serif" fill="currentColor"'
S = {}


def svg(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" fill="none" stroke="none">'
            f'{body}</svg>\n')


def text(x, y, s, size=14, anchor="middle", extra=""):
    base = 'fill="currentColor"' if "font-family" in extra else F
    return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" {base} {extra}>{s}</text>'


def person(x, foot, h, arm_up=False, op=1):
    """Stick figure standing at x with feet at y=foot and height h."""
    head = h * 0.13
    neck = foot - h + 2 * head
    hip = foot - h * 0.48
    sh = neck + h * 0.05
    arms = (f'<path d="M{x},{sh} L{x + h*0.18},{sh - h*0.32}"/>' if arm_up
            else f'<path d="M{x},{sh} L{x - h*0.15},{hip}"/><path d="M{x},{sh} L{x + h*0.15},{hip}"/>')
    if arm_up:
        arms += f'<path d="M{x},{sh} L{x - h*0.15},{hip}"/>'
    return (f'<g stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="{op}">'
            f'<circle cx="{x}" cy="{foot - h + head}" r="{head}"/>'
            f'<path d="M{x},{neck} L{x},{hip}"/>{arms}'
            f'<path d="M{x},{hip} L{x - h*0.1},{foot}"/><path d="M{x},{hip} L{x + h*0.1},{foot}"/></g>')


# ---------- anthropometry ----------
def bell():
    pts = []
    for i in range(0, 301):
        x = -3 + i * 0.02
        y = math.exp(-x * x / 2)
        pts.append(f"{40 + (x + 3) * 60:.1f},{200 - y * 140:.1f}")
    body = f'<path d="M{" L".join(pts)}" stroke="currentColor" stroke-width="2.5"/>'
    body += '<path d="M40,200 L400,200" stroke="currentColor" stroke-width="1.5"/>'
    for z, lab in ((-1.645, "5th"), (0, "50th"), (1.645, "95th")):
        x = 40 + (z + 3) * 60
        y = 200 - math.exp(-z * z / 2) * 140
        body += f'<path d="M{x:.1f},200 L{x:.1f},{y:.1f}" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>'
        body += text(f"{x:.1f}", 222, lab, 15)
    body += text(220, 245, "body dimension →", 13)
    return svg(440, 260, body)


S["percentile-basics"] = bell()

S["rule-reach"] = svg(320, 260, person(130, 240, 150, arm_up=True)
                      + '<path d="M150,88 L290,88" stroke="currentColor" stroke-width="4"/>'
                      + '<rect x="200" y="62" width="22" height="26" stroke="currentColor" stroke-width="2"/>'
                      + '<path d="M20,240 L300,240" stroke="currentColor" stroke-width="2"/>')

S["rule-clearance"] = svg(320, 260, '<path d="M90,240 L90,40 L210,40 L210,240" stroke="currentColor" stroke-width="4"/>'
                          + person(150, 240, 185)
                          + '<path d="M150,44 L150,52" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/>'
                          + '<path d="M20,240 L300,240" stroke="currentColor" stroke-width="2"/>')

S["case-washbasin"] = svg(320, 260, person(110, 240, 140)
                          + '<path d="M150,160 L250,160 L240,185 L160,185 Z" stroke="currentColor" stroke-width="3"/>'
                          + '<path d="M200,185 L200,240" stroke="currentColor" stroke-width="5"/>'
                          + '<path d="M270,160 L270,240" stroke="currentColor" stroke-width="1.5"/>'
                          + '<path d="M264,160 L276,160 M264,240 L276,240" stroke="currentColor" stroke-width="1.5"/>'
                          + '<path d="M20,240 L300,240" stroke="currentColor" stroke-width="2"/>')

S["case-bus-seat"] = svg(420, 260,
                         # side view: seat height measured floor to seat, as in CEED 2026 Q39
                         '<path d="M20,230 L210,230 M240,230 L410,230" stroke="currentColor" stroke-width="2"/>'
                         '<path d="M60,150 L150,150 M150,150 L160,60 M65,150 L65,230 M145,150 L145,230" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'
                         '<g stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="132" cy="58" r="14"/>'
                         '<path d="M134,74 L138,142 L80,142 L78,230 L64,230"/></g>'
                         '<path d="M185,150 L185,230 M179,150 L191,150 M179,230 L191,230" stroke="currentColor" stroke-width="1.5"/>'
                         + text(120, 252, "sitting height", 13)
                         # front view: seat width
                         + '<path d="M265,150 L385,150 M290,150 L290,230 M360,150 L360,230" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'
                         '<g stroke="currentColor" stroke-width="3"><path d="M288,147 Q288,108 325,108 Q362,108 362,147"/></g>'
                         '<path d="M288,90 L362,90 M288,84 L288,96 M362,84 L362,96" stroke="currentColor" stroke-width="1.5"/>'
                         + text(325, 252, "hip breadth", 13))

# ---------- gestalt ----------
def dot(x, y, r=9, filled=True):
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="currentColor"/>' if filled
            else f'<circle cx="{x}" cy="{y}" r="{r}" stroke="currentColor" stroke-width="2.5"/>')


S["gestalt-proximity"] = svg(300, 200, "".join(dot(x, y) for x in (40, 70, 160, 190) for y in (40, 75, 110, 145))
                             + "".join(dot(x, y) for x in (250, 280) for y in (40, 75, 110, 145)))
S["gestalt-similarity"] = svg(300, 200, "".join(
    (dot(40 + c * 50, 30 + r * 35) if r % 2 == 0 else
     f'<rect x="{31 + c * 50}" y="{21 + r * 35}" width="18" height="18" stroke="currentColor" stroke-width="2.5"/>')
    for r in range(5) for c in range(5)))
S["gestalt-continuity"] = svg(300, 200,
                              '<path d="M20,160 C100,160 200,40 280,40" stroke="currentColor" stroke-width="4"/>'
                              '<path d="M20,40 C100,40 200,160 280,160" stroke="currentColor" stroke-width="4" opacity="0.5"/>')


def pac(cx, cy, r, ang):
    a1, a2 = math.radians(ang - 30), math.radians(ang + 30)
    x1, y1 = cx + r * math.cos(a1), cy + r * math.sin(a1)
    x2, y2 = cx + r * math.cos(a2), cy + r * math.sin(a2)
    return f'<path d="M{cx},{cy} L{x1:.1f},{y1:.1f} A{r},{r} 0 1 0 {x2:.1f},{y2:.1f} Z" fill="currentColor"/>'


S["gestalt-closure"] = svg(300, 220, pac(150, 40, 34, 90) + pac(60, 190, 34, -30) + pac(240, 190, 34, 210))


def arrow(x, y, up):
    d = -1 if up else 1
    return (f'<path d="M{x},{y - 22 * d} L{x},{y + 22 * d} M{x - 8},{y - 12 * d} L{x},{y - 22 * d} L{x + 8},{y - 12 * d}" '
            f'stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="{1 if up else 0.45}"/>')


S["gestalt-common-fate"] = svg(300, 200, "".join(arrow(30 + i * 30, 100, i in (1, 2, 5, 7)) for i in range(9)))
S["gestalt-symmetry"] = svg(360, 120, text(180, 76, "[ ]  { }  ( )", 40, extra='font-family="Courier New, monospace"'))
S["gestalt-common-region"] = svg(300, 200,
                                 '<rect x="15" y="60" width="130" height="80" rx="14" stroke="currentColor" stroke-width="2.5"/>'
                                 '<rect x="155" y="60" width="130" height="80" rx="14" stroke="currentColor" stroke-width="2.5"/>'
                                 + "".join(dot(x, 100) for x in (40, 120, 180, 260)))
S["gestalt-pragnanz"] = svg(320, 180, "".join(
    f'<circle cx="{cx}" cy="{cy}" r="44" stroke="currentColor" stroke-width="6"/>'
    for cx, cy in ((70, 70), (160, 70), (250, 70), (115, 115), (205, 115))))

# figure-ground: make vase a cut-out using even-odd instead of a background var
S["gestalt-figure-ground"] = svg(240, 240,
                                 '<path fill-rule="evenodd" fill="currentColor" d="M10,10 L230,10 L230,230 L10,230 Z '
                                 'M80,20 L160,20 C160,40 140,55 140,75 C140,95 165,110 165,130 C165,150 140,165 140,185 '
                                 'C140,200 160,210 160,220 L80,220 C80,210 100,200 100,185 C100,165 75,150 75,130 '
                                 'C75,110 100,95 100,75 C100,55 80,40 80,20 Z"/>')

# ---------- ui ----------
def radio(x, y, on, label):
    s = f'<circle cx="{x}" cy="{y}" r="11" stroke="currentColor" stroke-width="2.5"/>'
    if on:
        s += f'<circle cx="{x}" cy="{y}" r="5.5" fill="currentColor"/>'
    return s + text(x + 24, y + 5, label, 16, "start")


def check(x, y, on, label):
    s = f'<rect x="{x - 11}" y="{y - 11}" width="22" height="22" rx="4" stroke="currentColor" stroke-width="2.5"/>'
    if on:
        s += f'<path d="M{x - 6},{y} L{x - 1},{y + 6} L{x + 7},{y - 6}" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    return s + text(x + 24, y + 5, label, 16, "start")


S["ui-radio"] = svg(260, 150, text(30, 28, "Pay with", 14, "start", 'opacity="0.6"')
                    + radio(42, 58, False, "UPI") + radio(42, 92, True, "Card") + radio(42, 126, False, "Cash"))
S["ui-checkbox"] = svg(260, 150, text(30, 28, "Toppings", 14, "start", 'opacity="0.6"')
                       + check(42, 58, True, "Onion") + check(42, 92, False, "Tomato") + check(42, 126, True, "Cheese"))
S["ui-dropdown"] = svg(260, 200,
                       '<rect x="30" y="20" width="200" height="38" rx="6" stroke="currentColor" stroke-width="2.5"/>'
                       + text(44, 45, "Select state", 15, "start")
                       + '<path d="M200,34 L208,43 L216,34" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
                       + '<rect x="30" y="64" width="200" height="120" rx="6" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>'
                       + "".join(text(44, 88 + i * 26, s, 14, "start", 'opacity="0.7"')
                                 for i, s in enumerate(["Assam", "Bihar", "Goa", "Gujarat …"])))
S["ui-toggle"] = svg(260, 120, text(30, 66, "Wi-Fi", 18, "start")
                     + '<path fill-rule="evenodd" fill="currentColor" d="M169,40 L203,40 A19,19 0 0 1 203,78 L169,78 A19,19 0 0 1 169,40 Z '
                       'M189,59 A14,14 0 1 0 217,59 A14,14 0 1 0 189,59 Z"/>')
S["ui-stepper"] = svg(260, 120,
                      '<rect x="40" y="35" width="180" height="48" rx="8" stroke="currentColor" stroke-width="2.5"/>'
                      '<path d="M100,35 L100,83 M160,35 L160,83" stroke="currentColor" stroke-width="2"/>'
                      '<path d="M60,59 L80,59 M180,59 L200,59 M190,49 L190,69" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'
                      + text(130, 66, "2", 20))
S["ui-slider"] = svg(260, 120,
                     '<path d="M30,60 L230,60" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity="0.35"/>'
                     '<path d="M30,60 L150,60" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'
                     '<circle cx="150" cy="60" r="13" fill="currentColor"/>'
                     + text(30, 95, "0", 13) + text(230, 95, "100", 13))
S["ui-segmented"] = svg(300, 120,
                        '<rect x="20" y="38" width="260" height="42" rx="8" stroke="currentColor" stroke-width="2.5"/>'
                        '<rect x="107" y="38" width="86" height="42" fill="currentColor" opacity="0.25"/>'
                        '<path d="M107,38 L107,80 M193,38 L193,80" stroke="currentColor" stroke-width="2"/>'
                        + text(63, 65, "Day", 15) + text(150, 65, "Week", 15, extra='font-weight="bold"') + text(237, 65, "Month", 15))
S["ui-tabs"] = svg(300, 160,
                   text(60, 40, "Overview", 15) + text(150, 40, "Specs", 15, extra='opacity="0.55"')
                   + text(240, 40, "Reviews", 15, extra='opacity="0.55"')
                   + '<path d="M10,56 L290,56" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>'
                   + '<path d="M22,56 L98,56" stroke="currentColor" stroke-width="4"/>'
                   + "".join(f'<path d="M20,{86 + i * 22} L{260 - i * 40},{86 + i * 22}" stroke="currentColor" stroke-width="6" stroke-linecap="round" opacity="0.2"/>'
                             for i in range(3)))

# ---------- colour wheels ----------
def wheel(selected, mono=False, poly=True, labels=True):
    cx, cy, R, r = 130, 130, 110, 50
    body = ""
    for i in range(12):
        a0 = math.radians(i * 30 - 105)
        a1 = math.radians(i * 30 - 75)
        p = [(cx + R * math.cos(a0), cy + R * math.sin(a0)), (cx + R * math.cos(a1), cy + R * math.sin(a1)),
             (cx + r * math.cos(a1), cy + r * math.sin(a1)), (cx + r * math.cos(a0), cy + r * math.sin(a0))]
        d = (f"M{p[0][0]:.1f},{p[0][1]:.1f} A{R},{R} 0 0 1 {p[1][0]:.1f},{p[1][1]:.1f} "
             f"L{p[2][0]:.1f},{p[2][1]:.1f} A{r},{r} 0 0 0 {p[3][0]:.1f},{p[3][1]:.1f} Z")
        if mono and i == 0:
            # three rings of one hue: tint, pure, shade
            for k, op in enumerate((0.35, 0.7, 1.0)):
                rr0, rr1 = r + k * (R - r) / 3, r + (k + 1) * (R - r) / 3
                q = [(cx + rr1 * math.cos(a0), cy + rr1 * math.sin(a0)), (cx + rr1 * math.cos(a1), cy + rr1 * math.sin(a1)),
                     (cx + rr0 * math.cos(a1), cy + rr0 * math.sin(a1)), (cx + rr0 * math.cos(a0), cy + rr0 * math.sin(a0))]
                dd = (f"M{q[0][0]:.1f},{q[0][1]:.1f} A{rr1},{rr1} 0 0 1 {q[1][0]:.1f},{q[1][1]:.1f} "
                      f"L{q[2][0]:.1f},{q[2][1]:.1f} A{rr0},{rr0} 0 0 0 {q[3][0]:.1f},{q[3][1]:.1f} Z")
                body += f'<path d="{dd}" fill="currentColor" opacity="{op}"/>'
            body += f'<path d="{d}" stroke="currentColor" stroke-width="1.5"/>'
        elif i in selected:
            body += f'<path d="{d}" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>'
        else:
            body += f'<path d="{d}" stroke="currentColor" stroke-width="1.5" opacity="0.45"/>'
    # labels for primaries (RYB at 0, 4, 8)
    for i, lab in ((0, "Y"), (4, "R"), (8, "B")) if labels else ():
        a = math.radians(i * 30 - 90)
        body += text(f"{cx + (R + 14) * math.cos(a):.1f}", f"{cy + (R + 14) * math.sin(a) + 5:.1f}", lab, 13)
    if poly and selected and len(selected) > 1 and not mono:
        pts = [(cx + (r - 6) * math.cos(math.radians(i * 30 - 90)), cy + (r - 6) * math.sin(math.radians(i * 30 - 90)))
               for i in sorted(selected)]
        body += ('<path d="M' + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + ' Z" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/>')
    return svg(260, 260, body)


S["monochromatic"] = wheel(set(), mono=True)
S["analogous"] = wheel({7, 8, 9}, poly=False)
S["complementary"] = wheel({2, 8})
S["split-complementary"] = wheel({2, 7, 9})
S["triadic"] = wheel({0, 4, 8})
S["tetradic"] = wheel({1, 4, 7, 10})
S["colour-wheel"] = wheel({0, 4, 8}, poly=False, labels=False)  # the card asks for the primaries

# ---------- type ----------
S["serif-sans"] = svg(440, 160,
                      text(60, 90, "Ag", 64, extra='font-family="Georgia, serif"')
                      + text(165, 90, "Ag", 64, extra='font-family="Helvetica, Arial, sans-serif"')
                      + text(270, 90, "Ag", 64, extra='font-family="Rockwell, Courier New, serif" font-weight="bold"')
                      + text(380, 90, "Ag", 64, extra='font-family="Courier New, monospace"'))
lines = [(71, "1"), (92, "2"), (140, "3"), (162, "4")]  # numbered: the card asks for the names
S["type-anatomy"] = svg(480, 190,
                        "".join(f'<path d="M20,{y} L350,{y}" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>'
                                + text(360, y + 4, lab, 13, "start") for y, lab in lines)
                        + text(30, 140, "Hxbgp", 100, "start", 'font-family="Georgia, serif"'))
S["kern-track-lead"] = svg(400, 220,
                           text(80, 60, "A V", 40, extra='font-family="Georgia, serif"') + text(80, 85, "1", 12)
                           + text(220, 60, "AV", 40, extra='font-family="Georgia, serif" letter-spacing="-6"') + text(220, 85, "1", 12)
                           + text(80, 140, "T R A C K", 22, extra='letter-spacing="4"') + text(80, 165, "2", 12)
                           + '<path d="M270,115 L370,115 M270,150 L370,150" stroke="currentColor" stroke-width="6" opacity="0.3"/>'
                           + '<path d="M260,115 L260,150 M255,115 L265,115 M255,150 L265,150" stroke="currentColor" stroke-width="1.5"/>'
                           + text(320, 175, "3", 12))

for k, v in S.items():
    (OUT / f"card-{k}.svg").write_text(v)
print(len(S), "svgs")
