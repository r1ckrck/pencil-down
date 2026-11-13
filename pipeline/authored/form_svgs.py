import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from scenes import S, ALT, CAM
from render3d import render, Camera
import form_prompts as FP
import pid_prompts as PP

ROOT = '/Users/r1ckrck/Documents/Projects/pencil-down/content/part-b'
IMG = os.path.join(ROOT, 'images', 'authored')
os.makedirs(IMG, exist_ok=True)
NO_SVG = '--no-svg' in sys.argv

out = []
AZ = [-35, -28, -42, -22, -48, -32, -38]
EL = [24, 22, 27, 25, 20, 26]

for n, (keys, noun, style, title, text, extra, tags) in enumerate(FP.FORM, 1):
    pid = f"pb-form-{n:04d}"
    rules = []
    if style == 'A':
        rules.append(FP.OPS)
        if not any(r.startswith('Retain the essence') for r in extra):
            rules.append(f"Retain the essence of the {noun}")
    elif style in ('B', 'D'):
        rules.append(FP.LANG)
    elif style == 'C':
        rules.append(FP.CHAR)
    rules += extra
    images = []
    for i, k in enumerate(keys, 1):
        path = f"images/authored/{pid}-{i}.svg"
        alt = ALT[k]
        if not NO_SVG:
            az0, el0 = CAM.get(k, (-35, 24))
            az = az0 + (AZ[n % len(AZ)] + 35) * 0.5 if k not in CAM else az0
            el = el0 + (EL[n % len(EL)] - 24) * 0.5 if k not in CAM else el0
            svg = render(S(k), cam=Camera(az, el), title=alt.rstrip('.'))
            with open(os.path.join(ROOT, path), 'w') as f:
                f.write(svg)
        images.append({'path': path, 'alt': alt})
    t = dict(tags)
    t.setdefault('pov', None)
    out.append({
        'id': pid, 'source': 'authored', 'origin': None, 'slot': 'form', 'title': title,
        'text': text, 'rules': rules,
        'criteria': [{'name': a, 'marks': b} for a, b in FP.CRIT[style]],
        'images': images,
        'tags': {k: v for k, v in tags.items() if v},
    })

for n, (typ, title, scen, extra, tags, kw) in enumerate(PP.PID, 1):
    pid = f"pb-problem-id-{n:04d}"
    if typ == 'HJ':
        body = scen + "\n\n" + PP.HMW_TAIL_J.format(**kw); crit = 'H'; rules = list(PP.R_H)
    elif typ == 'HD':
        body = scen + "\n\n" + PP.HMW_TAIL_D.format(**kw); crit = 'H'; rules = list(PP.R_H)
    elif typ == 'S5':
        body = scen + "\n\n" + PP.S5_TAIL; crit = 'S5'; rules = list(PP.R_S5)
    elif typ == 'L10':
        body = scen + "\n\n" + PP.L10_TAIL; crit = 'L10'; rules = list(PP.R_L10)
    elif typ == 'T2':
        body = (scen + f"\n\nList FIVE problems faced by {kw['a']} and FIVE problems faced by {kw['b']}. (5 + 5 marks)\n\n"
                f"Draw and explain ONE problem from each list. (5 + 5 marks)\n\nDo not limit yourself to what happens at this one moment.")
        crit = 'T2'; rules = list(PP.R_T2)
    elif typ == 'P6':
        body = scen + "\n\n" + PP.P6_TAIL.format(**kw); crit = 'P6'; rules = list(PP.R_P6)
    for r in extra:
        body += "\n\n" + r + "."
    rules += extra
    out.append({
        'id': pid, 'source': 'authored', 'origin': None, 'slot': 'problem-id', 'title': title,
        'text': body, 'rules': rules,
        'criteria': [{'name': a, 'marks': b} for a, b in PP.CRIT[crit]],
        'images': [],
        'tags': {k: v for k, v in tags.items() if v},
    })

with open(os.path.join(ROOT, 'prompts-authored-b.json'), 'w') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write('\n')
print(len(out), 'prompts')
