# Everyday India, not headlines, writes CEED

**The answer:** CEED Part B content is driven first by **ordinary Indian life**: kitchens, trains, bus stops, carts, children, animals and elderly travellers. It is driven second by a **fixed set of five slot mechanics that the setters mutate by one rule each year**. Design history and current events are minor. Design history appears in Part B only as **unnamed visual stimuli**: a Hadid-like building in 2022, a Mendini/Alessi-like character corkscrew in 2025, display fonts in 2018 and 2024. News appears only when it became a **lived scene**. COVID-19 is the one clear case since 2020 (three questions in 2021–22). Earlier news hooks (H1N1, dengue, anti-corruption, IIT Goa) all sat inside the 50-mark discipline electives, which were dropped in 2020. The evidence base is strong: a question-by-question audit of every official paper from 2010 to 2026 (114 coded items, from IIT Bombay's own PDFs). Two other claims are weak. That **IDC faculty set the paper** is inference, since no official source names the setters. Topical and anniversary hooks have **no documented link** to question choice at all. For Pencil Down, the generator should therefore vary **rules and users more than topics**. It should render any trend as **user + setting + moment** and never name it. Design-history stimuli should be shown, not named; reveal their identity in the debrief as a bridge to Part A. The rest of this report gives the evidence, one reconciled prompt grammar for the five current slots, and the prioritised content banks. Full tables live in the notes folder `docs/research/3-part-b-prompt-themes/`.

**Terms used throughout.** *Slot*: one of the five fixed Part B questions (Sketching, Creativity, Visual sensitivity, Form sensitivity, Problem identification). *POV*: point of view. *HMW*: "How can we…" problem statement, the framing CEED 2026 used. *Stimulus*: the image or object a question gives you to work from. *Twist*: a new rule bolted onto a familiar slot. *Hook*: the real-world context a prompt leans on. *Seen / added*: a value that appeared in a real paper versus one extrapolated in the same register. *P1/P2/P3*: Part A content priority (asked before / next to something asked / core canon, never asked).

---

## Seven drivers, ranked by how hard the evidence is

| Rank | Driver | Evidence | Strength | Generator implication |
|---|---|---|---|---|
| 1 | **Indian everyday life** (domestic, street, transport, rural) | 31 of 63 items in 2010–17 carry an explicit Indian context. In 2018–26, every Problem ID question since 2021 is an Indian public or domestic scene, and ~14 of 41 mandatory questions carry an Indian everyday hook | **Strong**, from official papers | Default hook. Every Sketching and Problem ID prompt gets an Indian anchor |
| 2 | **Fixed slots, one mutated rule per year** | 2020–26 keep five 20-mark slots in the same order. From 2023, at least one slot each year adds a new mechanic: title first word given (2023), 4-frame animation sequence (2024), reading-direction choice and buyer/seller split (2025), symbol-use rules and HMW (2026) | **Strong** | Build a twist layer. Train for the unfamiliar rule, not the topic |
| 3 | **Recurring users**: children, animals, elderly, women, vendors | Children 10/63 (2010–17) and 8/41 (2018–26), animals 7/63 and 4/41, the most frequent named users in both eras | **Strong** | Weight the user list toward these |
| 4 | **Humour and emotion as scored criteria** | Humour or surprise was an explicit criterion every year 2022–26 (5 questions), against once in 2010–17 (2013 Q2) | **Strong**, and rising | Creativity and Sketching criteria must name humour or emotion |
| 5 | **IDC disciplinary lens** | The 2010–19 elective labels (Industrial/Product, Communication, Animation, Interaction, Mobility) and the five 2020+ slots map onto IDC faculty clusters. No official page names the setters | **Medium**: structural fit, unproven authorship | Use only for weighting themes (pictograms, care, craft, furniture) |
| 6 | **Design history** | Part B uses it as unnamed stimuli only (2010–11 artefact timelines; 2018, 2022, 2024, 2025). Part A names it, about 5 items per paper | **Medium** for Part A, **weak** for Part B | Show forms, never names. Reveal identity in debrief |
| 7 | **Current events and anniversaries** | Named news appears in 5 items in 2010–17 (all electives) and 1 optional brief in 2019. COVID was rendered as scenes in 2021–22. No link to anniversaries was found | **Weak** | Hooks act as flavour inside a scene. Anniversaries break ties in Part A bank ordering only |

Sources: the coded audits of all official papers, [2010](https://www.ceed.iitb.ac.in/2027/downloads/CEED2010qp.pdf) through [2026](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf), indexed on the [CEED 2027 site](https://www.ceed.iitb.ac.in/2027/).

---

## Part B shrank from discipline briefs to five 20-mark slots

### Format evolution 2010→2026

| Era | Part B shape | What it means for practice |
|---|---|---|
| **2010–11** | One paper booklet, 5–6 themed sections: Visual Perception (puzzles, artefact timelines, colour-emotion), Drawing, Creativity, Problem ID **with solutions**, and a 25–30-mark Design Problem Solving elective ([2010](https://www.ceed.iitb.ac.in/2027/downloads/CEED2010qp.pdf), [2011](https://www.ceed.iitb.ac.in/2027/downloads/CEED2011qp.pdf)) | Ancestor of Visual and Form sensitivity |
| **2012** | Part A objective split. Part B = Drawing 20 + elective 30 ([2012](https://www.ceed.iitb.ac.in/2027/downloads/CEED2012qp.pdf)) | — |
| **2013–17** | Mandatory sketch + creativity sub-questions (magic premise, primitives, 3-word stories; Problem ID only in 2013) + **one 50-mark discipline elective**. 2017 adds Mobility & Vehicle Design ([2013](https://www.ceed.iitb.ac.in/2027/downloads/CEED2013qp.pdf), [2017](https://www.ceed.iitb.ac.in/2027/downloads/CEED2017qp.pdf)) | Half of Part B was a mini design brief |
| **2018–19** | Choose 1 of 5 specialisation briefs (50/40) + mandatory Sketching, Creativity, Visualization ([2018](https://www.ceed.iitb.ac.in/2027/downloads/CEED2018qp.pdf), [2019](https://www.ceed.iitb.ac.in/2027/downloads/CEED2019qp.pdf)) | "Visualization" = lettering and motif, which became Visual sensitivity |
| **2020–26** | **5 mandatory × 20**: Sketching, Creativity, Visual sensitivity, Form sensitivity, Problem identification. 2 hours. Criteria settle at 4 per question by 2025–26 ([2020](https://www.ceed.iitb.ac.in/2027/downloads/CEED2020qp.pdf), [2026](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf)) | The only format to drill for 2027 |

**The 2020 cut matters for content.** Every named current event in 2010–17 lived in an elective: H1N1 symbol and poster (2010), drought comic with Farmer, Politician and God (2010), anti-corruption poster (2012), dengue mosquito comic (2012), IIT Goa identity (2016). Once the electives went, named news lost its home. The mandatory slots absorb trends only as scenes ([2010](https://www.ceed.iitb.ac.in/2027/downloads/CEED2010qp.pdf), [2012](https://www.ceed.iitb.ac.in/2027/downloads/CEED2012qp.pdf), [2016a](https://www.ceed.iitb.ac.in/2027/downloads/CEED2016qp1.pdf)).

### How each slot drifted

| Slot | Drift (years) | 2027 best predictor |
|---|---|---|
| Sketching | Still life with mixed materials (2010, 2011, 2013, 2017) → figure at Indian workplace with listed props (2014–17) → room perspective (2018–19) → given character, no environment (2020–22) → odd-POV figure group (2023) → 4-frame sequence scored on animation principles (2024) → **full scene, environment scored, non-human POV** (fox 2025, chair 2026) | Narrated scene + non-human POV + environment & props |
| Creativity | Alternate uses, primitive combinations, magic premise, 3-word stories (2010–17) → object recombination (2018) → complete abstract marks + title (2019–23) → premise transformation "head as cube" (2024) → **story from fixed symbols** (2025–26) | Symbol-set narrative with use rules |
| Visual sensitivity | Perception puzzles (2010–11) → lettering/motif (2018–19) → **icon sets** (2020, 2021, 2022, 2025, 2026), lettering (2024), identity (2023) | 4-icon set, black only, no text |
| Form sensitivity | Products from primitives (2010, 2011, 2015, inside Creativity) → companion product to a given part (2020–21) → language borrowed from building/sculpture/character object (2022, 2023, 2025) → **primitive → furniture with stated operations** (torus 2024, sphere 2026) | Primitive → product, operations listed |
| Problem ID | Problems + solutions (2010–11) → problems only (2013, 2020, 2022 explicit) → list + illustrate (2021–25) → two stakeholders (2025) → **imagined journey → 4 HMW → 2 drawn solutions** (2026, 12 of 20 marks on solutions) | HMW + solutions, or two-stakeholder scene |

Problem ID has come full circle: solutions were required in 2010–11, banned in 2013–22, and required again in 2026 ([2011](https://www.ceed.iitb.ac.in/2027/downloads/CEED2011qp.pdf), [2022](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2022_Qestion_Paper.pdf), [2026](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf)). Practice both modes.

---

## Kitchens, trains and children recur; news and design history arrive in disguise

### Recurring themes with frequencies

The two eras were coded with slightly different schemes (2010–17: all 63 items; 2018–26: 41 mandatory, plus 10 optional briefs in 2018–19), so compare directions, not decimals.

| Theme | 2010–17 (n=63) | 2018–26 (n=41 mandatory) | Note |
|---|---|---|---|
| Child as user or protagonist | 10 | 8 | Top named user in both eras |
| Animal as character | 7 | 4 (+2 optional) | Crow, dog, cat, fox, bear, mosquito, pangolin |
| Women | 3 | 4 | Fisherwoman, swab patient, hockey identity, compartment boarders |
| Vendor / worker | 6 | 3 | Fruit seller, kirana owner, cobbler, fisherwoman, cart seller |
| Elderly | 2 | 2 | Jar opener (2012), phone (2011); compartment (2022), Srinagar→Chennai (2026) |
| Disabled | 1 (+1 low-literacy pair) | 1 (+1 optional) | Blind scissors (2010); amputee aid (2018 optional) |
| Home / kitchen / tabletop setting | 14 | 10 | Dominant setting |
| Street / transport | 10 | 5 | Platform, bus stop, carts, trains |
| Rural | 7 | 2 | Shrinks in the mandatory era |
| Public institution (school, museum, zoo, hospital, mela) | 9 | 4 | All four 2020+ cases are Visual sensitivity icon sets |
| Humour as a scored criterion | 1 | 5 | Every year since 2022 |
| Pencil-only, no colour (drawing items) | 10/10 | 7/9 | Near-universal |
| Named current event | 5 (all electives) | 3 mandatory (COVID) + 1 optional (2019 Cricket World Cup) | See below |
| Design-history reference | 2 (timelines) | 2–3 (unnamed stimuli) | See below |

Sources: [2010](https://www.ceed.iitb.ac.in/2027/downloads/CEED2010qp.pdf)–[2017](https://www.ceed.iitb.ac.in/2027/downloads/CEED2017qp.pdf), [2018](https://www.ceed.iitb.ac.in/2027/downloads/CEED2018qp.pdf)–[2026](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf).

**Repeat objects and places** make the strongest seeds. The **pressure cooker** appears three times: Problem ID 2010, sketch 2015, kitchen inventory 2019. **Railways** appear four times: platform Problem ID 2010, bag-snatch storyboard 2014, general compartment 2022, Srinagar→Chennai trip 2026. The **bus stop** appears in 2011 and 2023, **kitchens** in nearly every era, and **mosquito-borne disease** three times: dengue 2012, malaria 2017, the mosquito symbol in 2025. **Child + animal + peril** recurs too: kid, puppy and eagle in 2015; Priya, cat and bird in 2017; Kaa, Kii, bear and fox in 2025; Chinu and her dog in 2026 ([2015](https://www.ceed.iitb.ac.in/2027/downloads/CEED2015qp.pdf), [2017](https://www.ceed.iitb.ac.in/2027/downloads/CEED2017qp.pdf), [2025](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2025_Question_Paper.pdf)).

The Indian context is **mundane, not monumental**. Festivals, monuments and classical crafts dominate Part A general knowledge but are almost absent from Part B 2018–26. The 2022 mela icon set is the closest ([2022](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2022_Qestion_Paper.pdf)). The users lean ordinary and lower-income: a Versova fisherwoman, a vegetable-cart seller, a rural kitchen, general-compartment passengers.

### How current events actually show up

| Mode | Examples | Era |
|---|---|---|
| **Named in the brief** | "a new influenza virus" (H1N1) symbol; drought comic; "people are agitating" (corruption) poster; dengue "becoming a concern"; new IIT Goa logo; 2019 Cricket World Cup hoarding campaign | 2010–16 electives; 2019 optional |
| **Turned into a lived scene** | COVID isolation-ward icon (2021 Q3); viral spread at a school wash basin (2021 Q5); RT-PCR swab moment (2022 Q1) | 2021–22 mandatory |
| **Trend, unnamed** (inference) | Elderly couple's medical journey (2026) fits India's ageing curve. The 2023 IWHA hockey identity may echo hockey news; unverified | 2023–26 |

Sources: [2010](https://www.ceed.iitb.ac.in/2027/downloads/CEED2010qp.pdf), [2012](https://www.ceed.iitb.ac.in/2027/downloads/CEED2012qp.pdf), [2019](https://www.ceed.iitb.ac.in/2027/downloads/CEED2019qp.pdf), [2021](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2021_Question_Paper.pdf), [2022](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2022_Qestion_Paper.pdf). A full-text read of all 2018–26 papers found **no** mention of elections, G20, Chandrayaan or the Olympics.

**Rule:** a topic enters only if it changed daily life for most candidates (a pandemic) or holds mass national interest (cricket). Politics, religion as conflict, and recent tragedies stay out. The single 2010 exception, the Farmer–Politician–God comic, came from the satirical animation elective that no longer exists.

### How design history actually shows up

| Where | Form | Examples |
|---|---|---|
| Part B Form sensitivity | **Unnamed photo stimulus**; task = extract the design language | Flowing white building in 3 photos → electric iron (2022; visually Zaha Hadid's Heydar Aliyev Center). Character corkscrew → tea flask (2025; visually Mendini's Alessi "Anna G"). Both identifications are the auditor's; the papers credit no designer ([2022](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2022_Qestion_Paper.pdf), [2025](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2025_Question_Paper.pdf)) |
| Part B Visual sensitivity | **Given letterforms to extrapolate**; "font anatomy" scored | Fat-face serif "Flows" → draw "d" (2018). Ornamental "A", "B" → write "Forest" (2024) ([2018](https://www.ceed.iitb.ac.in/2027/downloads/CEED2018qp.pdf), [2024](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2024_Question_Paper.pdf)) |
| Part B 2010–11 perception | Artefact timelines | Order phones (2010), TVs and cars (2011); spot non-Times New Roman letters ([2011](https://www.ceed.iitb.ac.in/2027/downloads/CEED2011qp.pdf)) |
| Part A | **Named, image-first**: identify or order | Movement ID (De Stijl, Impressionism, Pop Art, Baroque, Art Nouveau, 2026 Q29); Barcelona chair (2018); I♥NY → Glaser (2016) ([2026](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf)) |

The setters reach for **the single most famous exemplar** of each movement (Vermeer's *Girl with a Pearl Earring* for Baroque, a Mondrian grid for De Stijl). Design-history literacy helps Part B, but the task is never "name the designer".

---

## IDC's faculty map onto the slots, and UCEED shares the POV template

### IDC discipline ↔ slot mapping (medium evidence)

IIT Bombay runs CEED through a "UCEED-CEED Office" headed by a Chairperson. The exam has never rotated between IITs, and no official page says who writes the questions ([CEED 2027 site](https://www.ceed.iitb.ac.in/2027/)). IDC authorship is therefore an inference. It rests on a structural fit.

| Slot | IDC faculty cluster (from [IDC Faculty](https://www.idc.iitb.ac.in/idc-people/faculty/)) | Supporting IDC signal | Old elective label |
|---|---|---|---|
| Sketching | Animation, narrative, illustration, film form | Animela 2025, First Films Festival ([IDC home](https://www.idc.iitb.ac.in/)) | Animation (2010–19) |
| Creativity | Basic design, visual narratives, game design | Game Design Studio | Animation / Communication |
| Visual sensitivity | Typography, type design, information design, branding | TypoDay 2025; student project "medication guides through pictograms" | Communication / Visual Communication |
| Form sensitivity | Product form, semantics, furniture, lighting, bamboo, automotive surfacing | Furniture-from-primitive briefs 2024, 2026 | Industrial / Product; Mobility |
| Problem identification | HCI, usability, contextual design, design for care, digital health | India HCI 2024; "portable hand wash station" student project | Interaction |

**Themes to over-weight** (inference, medium): pictograms for public and health information; everyday Indian appliances and personal-care items; furniture and lighting; children and education; craft and bamboo; health and care; public spaces; reuse. One correction to coaching sources: a Careers360 analysis dates the toothbrush and mixer-grinder questions to 2023, but the official paper places both in **2020** ([2020](https://www.ceed.iitb.ac.in/2027/downloads/CEED2020qp.pdf); [Careers360](https://design.careers360.com/articles/ceed-exam-analysis)).

### Sister-exam overlaps

| Exam | Reported prompts | Overlap with CEED | Reliability |
|---|---|---|---|
| **UCEED** (same IIT Bombay office) | Odd-POV narrated scenes almost every year: Prof. Shastri's desk "from her usual POV" (2020), drawing room in morning light (2021), rat in a canteen from the owner's POV (2022), cat chaos "from the floor" (2023), boy walking his dog "from the dog's POV" (2026). Portable products: child's first-day lunch box (2024), pocket seat for museum or zoo (2025), hostel/train toiletry kit (2026) ([Careers360](https://design.careers360.com/articles/uceed-drawing-questions)) | UCEED's non-human POV (2022–23) precedes CEED's (2023 camera, 2025 fox, 2026 chair). The lunch box matches CEED 2021 Q4 | Coaching paraphrase of official papers; the UCEED PDFs are official but were not opened |
| **NID DAT** | Orange-juice poster "from a crow's perspective"; slow-fashion posture drawing (2025) ([Careers360](https://design.careers360.com/articles/nid-dat-exam-analysis)) | Creature POV; sustainability | Memory-based, unverified |
| **NIFT Situation Test** | 3D model from given materials, "futuristic" theme (2025) ([Careers360](https://design.careers360.com/articles/nift-situation-test-2025-analysis)) | Weak | Memory-based |

**Use:** UCEED prompts are a legitimate extra seed pool for Sketching (POV scenes) and Form (portable product for a named Indian user). NID and NIFT add little.

---

## One grammar generates all five current slots

This merges the two audits' draft grammars into one model. Every generated prompt is assembled the same way:

```
prompt = slot template
       + value fill    (≈70% seen values, ≈30% added; weight 2025–26 mechanics highest)
       + medium rule   (slot default)
       + twist         (0 or 1)
       + hook          (0 or 1, rendered as user + setting + moment)
       + 4 criteria    (fixed per slot, 2025–26 wording)
       + marks split   (20 total; 4×5, 10+10, 5+3×5, 2×4+6×2 all seen)
```

**Global rules**

- **Value provenance.** Seen values carry their year (`'26`). Added values are prefixed `+`. Store the flag in the data so the debrief can say "real paper precedent: 2025".
- **Twist rate.** Single drills: about 1 in 3 carries a twist. Full 2-hour mock: twist exactly 1–2 slots, never all five. Basis: each year from 2023 changed at least one slot's mechanic, never all.
- **Hook rate.** Indian everyday anchor on every Sketching and Problem ID prompt. At most **one lived current-event hook per mock paper**, placed in Sketching, Visual or Problem ID. Design-history stimuli go **only in Form** (and lettering in Visual), unnamed.
- **Stimulus type.** Tag each subtype **T** (text-only, generable now) or **A** (needs a curated image or asset library). The real exam leans on images for Visual, Form and Problem ID. Text-only versions train the decision but not the observation (see trade-offs).
- **Banned.** Named politicians, parties or elections; religion as conflict; recent disasters by name; funerals.

### Slot 1 Sketching

```
[CHARACTERS] [ACTIVITY] in [SETTING] at [MOMENT]. [INCITING EVENT].
Sketch the scene from the point of view of [POV]. [MEDIUM]. [ENV RULE].
Criteria: character & expressions · proportion & composition · quality of sketching · environment & props
```

| Subtype | Seen | Stimulus |
|---|---|---|
| S1 Narrated scene from a specified POV (**default**) | '18, '19, '23, '25, '26 | T |
| S2 Given character in 2 actions or emotions | '20, '21 | A (character sheet) |
| S3 Single dramatic moment, 2 figures | '22 | T |
| S4 4-frame action sequence, scored on anticipation & exaggeration | '24 | T |
| S5 Warm-up: still life with a material per object; figure at a workplace with a prop list | '10, '11, '13, '17; '14, '16, '17 | T |

| Variable | Values |
|---|---|
| CHARACTERS | child + pet '26; two kids '25; family of 4 with stated heights '23; fisherwoman '20; schoolboy '21; health worker + patient '22; shopkeeper + customer '16; doctor + patient '16; fruit seller + dog + kid on tricycle '17; + grandparent and grandchild; + delivery rider and security guard; + chaiwala and commuters; + ASHA worker and new mother |
| SETTING | kitchen '15 '19 '26; room with dimensions '18 '23; forest '25; clinic '16 '22; kirana counter '16; street '14 '17; post-monsoon ground '21; + sleeper coach at night; + village bus stop in May heat; + terrace on Uttarayan kite day; + ghat at dawn; + tin-roof classroom |
| INCITING EVENT | parent enters '26; animal chases '17 '25; selfie '23; table split by axe '18; swab inserted '22; lifting a heavy carton '24; + power cut; + monkey snatches food; + sudden downpour; + train lurches |
| POV | candidate's choice '16 '18; 5½-ft standing adult '19; ceiling-corner camera '23; fox '25; chair '26; dog, floor, canteen owner (UCEED '22–'26); + ceiling fan; + CCTV above a gate; + upper berth; + cat on a shelf |
| EMOTION | panic '25; anger and impatience '20; discomfort '22; warmth '26; mischief '23; strain '24; + embarrassment; + relief |
| MEDIUM | black/HB pencil only, no colour '19–'26; no instruments '19 '20; given space '25 '26 |
| ENV RULE | environment & props drawn '25–'26 (**default**); figures only '20–'23 |
| TWIST | non-human POV '23–'26; draw the aftermath, not the event '18; heights given in numbers '23; "don't draw the customer" '20; 4 frames with animation principles '24; + a POV that moves (a ball mid-air); + same moment, 2 POVs split-frame |

**Examples**
1. *(S1, heat hook)* On a May afternoon, 9-year-old Meenu and her grandfather wait at a village bus stop under a tin shelter. A goat has claimed the only bench and refuses to move. The bus appears in the distance. **Sketch the scene from the goat's point of view.** Black/HB pencils only, no colour, in the given space.
2. *(S4)* Ravi, 8, stands on a wobbly stool and uses a broom to free a kite tangled on the ceiling fan. **Draw the action in 4 frames.** Show anticipation and exaggeration. Pencils only.
3. *(S1, gig-work hook, twist: CCTV POV)* A delivery rider waits at an apartment gate in heavy rain while the security guard checks a register. A stray dog shelters under the scooter. **Sketch the scene from the CCTV camera above the gate.**

### Slot 2 Creativity

```
C1  Using the marks in [N] boxes [+ CONSTRAINT], create recognisable images; title each.
C2  Imagine [THING] as [ALTERED STATE]. Illustrate [N] situations in order: [LIST]. Title each.
C3  Using [SYMBOL SET] under [USE RULE], create a [N]-frame story with a title.
C4  Using [3–5 OBJECTS / SOLIDS], show [N] different ideas/products, all used together.
Criteria: originality/uniqueness · diversity or graphical narrative · humour & surprise · clarity & neatness
```

| Subtype | Seen | Stimulus |
|---|---|---|
| C3 Story from fixed symbols (**default**) | '25, '26 | A (pictogram library) |
| C2 Premise transformation; magic device or substance | '24; '13 '15 '16 '16 | T |
| C1 Abstract marks → titled images | '19–'23 | A, but marks are generable as simple SVG lines, arcs and dots |
| C4 Object recombination; alternate uses; primitive combination | '18; '10 '14 '17; '10 '11 '15 | T |
| C5 Warm-up: 3-word, 3-sentence stories | '15 '16 '16 '17 | T |

| Variable | Values |
|---|---|
| SYMBOL SET | bulb, tap, mosquito on a 4-frame panorama '25; ant, scissors, signal, megaphone, alarm clock, wrench, clapperboard, surprised face, magnifier, aeroplane, cactus, kick-scooter '26; + pressure cooker, kite, padlock, footprint, umbrella, fish, key, chappal |
| USE RULE | 2 per frame, each once, rotate/flip/scale but don't modify '26; continuity across frames + choose reading direction with an arrow '25; + last frame must echo frame 1 |
| PREMISE | human head → cube, with human–human, –animal, –environment, –object interactions '24; invisibility liquid '13; 50% shrink ray for 3 h '15; mind-to-text device '16; animal-thought translator '16; + shadows detach at noon; + every object announces its price aloud |
| C1 CONSTRAINT | none '20 '22; themes printed on the first k boxes '21; first word of each title given '23; last box combines 3 earlier marks '19 |
| OBJECTS | tyre, plastic bottle, cricket bat, bucket '18; discarded CDs '10; umbrella '14; helmet '17; cone + 3 discs + wire '10; + milk pouch; + pressure-cooker gasket; + steel tiffin; + charpai |
| WORD TRIPLE | Cobbler/Football/Footpath '15; Thief/Wallet/School '16; Farmer/Gold/Tree '16; Orphan/Mango/Cycle shop '17; + Dabbawala/Rain/Lift |
| MEDIUM | black only, inside boxes '20–'24 |
| TWIST | any USE RULE or C1 CONSTRAINT above, plus fixed interaction order '24; + no human figures allowed |

**Examples**
1. *(C3)* Symbols: pressure cooker, kite, padlock, footprint, umbrella, alarm clock, fish, smartphone. **Create a 4-frame story** using 2 symbols per frame, each once. You may rotate, flip or scale them but not modify them. Add characters and backgrounds. Number the frames and give a title.
2. *(C2)* Imagine that at noon every shadow in a town detaches and refuses to follow its owner. **Illustrate 4 situations in order:** human–human, human–animal, human–environment, human–object. Title each. Black only.
3. *(C1, twist: first word given)* Five boxes each hold a mark (zigzag; two dots and an arc; a spiral; a broken line; a triangle on a stick). Titles must begin "Monday's…", "The angry…", "Lost…", "Grandma's…", "Too many…". **Complete each into a recognisable image and finish its title.**

### Slot 3 Visual sensitivity

```
V1  [INSTITUTION] for [AUDIENCE] needs icons for [4 SECTIONS]. [COLOUR RULE]; [TEXT RULE]; one visual language.
V2  Given icons for [SYSTEM], add icons for [4 NEW ITEMS] in the same language.
V3  Turn the [N] photos shown into 2D icons in one design language.
V4  Given letters [X, Y] of a [STYLE] font, write [WORD] / draw [LETTER].
V5  Visual identity for [ORGANISATION] incorporating [ABBREVIATION]. Original.
Criteria: consistency of visual language · thematic fit/representation · communication · composition, clarity & neatness
```

| Subtype | Seen | Stimulus |
|---|---|---|
| V1 Icon set from a word list (**default**) | '22, '25, '26 | T |
| V5 Identity / logo with letters | '23 (plus electives '15, '16, '16) | T |
| V4 Lettering extrapolation | '18, '24 | A (render specimens from open fonts) |
| V2 Extend a given icon system | '21 | A |
| V3 Photo → icon | '20 | A |
| Warm-up: motif completion; colour an object "Angry" vs "Friendly"; text-free dosage pictograms | '19; '10 '11; '13 | A / T / T |

| Variable | Values |
|---|---|
| INSTITUTION + SECTIONS | mela: info desk, craft, children, games '22; zoo: grey mongoose, honey badger, Indian bison, pangolin '25; Indian Museum of Science: robotics, energy, ocean science, food technology '26; rural hospital: COVID isolation, cancer, paediatric, maternity '21; + flood relief camp: water, medical, women's area, lost & found; + railway junction; + heritage walk; + crafts museum: weaving, pottery, metal casting, toy turning; + multisport venue pictograms |
| COLOUR / TEXT | black only '20 '21 '25; B&W '26; no text '26 |
| STYLE (V4) | heavy fat-face serif '18; ornamental scroll '24; + geometric sans; + stencil; + hand-painted truck lettering |
| WORD (V4) | "d" '18; "Forest" '24; + "Monsoon"; + "River" |
| ORGANISATION (V5) | Indian Women's Hockey Association / IWHA '23; IIT Goa '16; AMRC Karnataka '16; + Indian Girls' Cricket Academy; + state kabaddi league |
| TWIST | no text '26; extend, don't create '21; + icons must still read at 1 cm; + bilingual Devanagari + Latin wordmark |

**Examples**
1. *(V1, flood hook)* A school in Bihar is now a flood relief camp. **Design signage icons for:** Drinking water, Medical help, Women's area, Lost & found. Black only, no text, one consistent visual language.
2. *(V5, women's-sport hook)* **Create a visual identity for the Indian Girls' Cricket Academy, Nashik**, incorporating "IGCA". It must be original and must not copy existing marks.
3. *(V1, craft theme)* A crafts museum in Bhopal needs gallery icons for Weaving, Pottery, Metal casting and Toy turning. Black only, no text.

### Slot 4 Form sensitivity

```
F3  Inspired by a [PRIMITIVE], design a usable [PRODUCT] for [USER/PLACE].
    You may [OPERATIONS] but keep the [PRIMITIVE]'s essence. Sketch and render.
F2  [REFERENCE FORM] is shown. Design a [PRODUCT] in the same design language.
F1  [GIVEN PART] is shown. Design the [COMPANION PRODUCT] in the same language and perspective.
Criteria: uniqueness / consistency with source · form–function · relevant details · surface shading & rendering
```

| Subtype | Seen | Stimulus |
|---|---|---|
| F3 Primitive → product with listed operations (**default**) | '24, '26 | T |
| F2 External reference form (building, sculpture, character object) | '22, '23, '25 | A, or a text description of form properties with no name |
| F1 Companion to a given product part | '20, '21 | A |
| Warm-up: combine 3–8 solids into named products | '10, '11, '15 | T |

| Variable | Values |
|---|---|
| PRIMITIVE / SOURCE | torus '24; sphere '26; organic white sculpture '23; flowing building in 3 views '22; character product '25; mixer jar '20; kid's bottle '21; + cone; + cylinder; + Möbius strip; + seed pod; + spinning top; + Channapatna turned toy |
| PRODUCT | single-seat living-room furniture '24 '26; electric iron '22; mixer-grinder body '20; tea flask '25; kid's lunch box '21; cutlery set for 3–6-year-olds '23; + table lamp; + pressure cooker; + desk fan; + bus-stop seat; + matka stand |
| USER | children 3–6 '23; kids '21; household '20 '22 '25; + elderly; + street vendor |
| OPERATIONS | cut, add, subtract, deform, repeat, keep the essence '26; same perspective as the given part '20; "characterise" '25 |
| TWIST | + must fold or stack flat; + one material only; + user is 3–6 or 70+ |

**Examples**
1. *(F3)* **Inspired by a cone, design a usable table lamp for a shared hostel room.** You may cut, add, subtract, deform or repeat, but keep the cone's essence. Sketch, render and show the light source.
2. *(F3, twist: stackable + vendor)* **Inspired by a cylinder, design a stool for a chaiwala's customers** that stacks for carrying on a cycle. Keep the cylinder's essence. Render.
3. *(F2, unnamed design-history stimulus)* Shown: three photos of a building with continuous, flowing white surfaces and no visible corners. **Design a ceiling fan in the same design language.** Sketch and render. (Debrief reveals: Heydar Aliyev Center, Zaha Hadid; CEED 2022 used it for an iron.)

### Slot 5 Problem identification

```
P3  [USER] travels [ORIGIN → DESTINATION] for [PURPOSE] by [MODES]. Imagine the journey.
    Write [4] "How can we…" statements; pick one; draw [2] titled solutions.
P1  Shown: [CONTEXT]. List [N] design problems [for STAKEHOLDERS]; draw & annotate [k]. [SOLUTION RULE].
P2  Shown: [PRODUCT]. Identify [N] user problems; illustrate + one sentence each. No solutions.
Criteria: severity/relevance · variety/uniqueness · feasibility (when solutions asked) · visual communication
```

| Subtype | Seen | Stimulus |
|---|---|---|
| P3 Imagined journey → HMW → 2 solutions (**default for 2027**) | '26 | T |
| P1 Scene → list + illustrate, optionally 2 stakeholders | '21–'25 (plus '10, '11, '13) | A, or a text-described scene |
| P2 Single product | '20 (plus '10) | A, or a named object |

| Variable | Values |
|---|---|
| CONTEXT | school wash basin '21; general-compartment boarding '22; busy bus stop '11 '23; rural kitchen '24; vegetable cart '25; railway platform '10; college canteen '13; + hospital OPD; + temple darshan queue; + kirana with QR payments at closing time; + flood relief camp; + construction site |
| JOURNEY (P3) | elderly couple, Srinagar → Chennai, medical treatment, train + bus + auto '26; + migrant worker family with infant, Patna → Surat, unreserved train; + wheelchair user, district bus stand → city hospital; + first-time flyer from a village |
| PRODUCT (P2) | toothbrush '20; pressure cooker '10; + stacked steel tiffin; + LPG cylinder; + school bag |
| STAKEHOLDERS | single '20–'24; buyer + seller '25; women, children, elderly, disabled named '22 |
| N / k | 6/6 '20; 10/3 '21; 10/2 '22; 5/5 '23 '24; 5+5/1+1 '25; 4 HMW/2 solutions '26 |
| SOLUTION RULE | solutions required '10 '11 '26; no solutions '13 '20 '22 |
| GUARDRAIL | "large crowds / fewer seats are not design problems" '22. Problems must be designable |
| TWIST | two-stakeholder split '25; HMW phrasing '26; + problems must span 4 journey stages |

**Examples**
1. *(P3, migrant-work hook)* A construction worker, his wife and their 8-month-old travel from Patna to Surat for a new job: unreserved train, then a shared auto to the site. **Write 4 "How can we…" statements**, pick one, and **draw 2 titled design solutions**.
2. *(P1, two stakeholders, UPI hook)* A kirana store in a tier-2 town at 7 pm, festival week. **List 5 problems for the shopkeeper and 5 for customers**; draw and explain one of each. Don't limit yourself to the people visible.
3. *(P2)* A stacked steel tiffin, four tiers, side clamps. **Identify 6 user problems**; illustrate each with one sentence. No solutions.

### Context-hook layer: how a trend becomes a prompt

Convert a trend into **user + setting + moment** and never state the trend. Ageing becomes "an elderly couple on a long train journey"; COVID became "a swab entering a nose". The table rates 2025–26 hooks by fit with that pattern: everyday, drawable, non-partisan. The ratings are judgement, not evidence.

| Hook | Grounding | Best slots | Likelihood |
|---|---|---|---|
| Heatwave | 47.6 °C in Banda, schools moved to early shifts, April 2026 ([Business Today](https://www.businesstoday.in/india/story/acs-on-full-blast-schools-on-early-shift-as-heatwave-redraws-daily-life-in-india-527663-2026-04-27)) | P, S, F | High |
| Rail: Vande Bharat Sleeper | First sleeper service flagged off 17 Jan 2026 ([Indian Infrastructure](https://indianinfrastructure.com/2026/01/19/indias-first-vande-bharat-sleeper-train-launched-on-howrah-guwahati-route-in-west-bengal-and-assam/)) | S, P | High |
| Gig / delivery workers | Social-security code recognising platform workers in force 21 Nov 2025 ([YourStory](https://yourstory.com/2025/11/govt-enforces-four-labour-codes-extends-social-security-gig-workers)) | P, S | High |
| Women's sport | First Women's ODI World Cup title, 2 Nov 2025 ([Scroll](https://scroll.in/latest/1088242/india-wins-womens-cricket-world-cup-for-the-first-time)); Divya Deshmukh, FIDE Women's World Cup ([Chess.com](https://www.chess.com/news/view/divya-wins-2025-fide-womens-world-cup-final-tiebreaks)) | V (identity) | High for V |
| Ageing / eldercare | 60+ share rises from 10.5% (2022) to 20.8% by 2050 ([UNFPA India](https://india.unfpa.org/en/news/india-ageing-elderly-make-20-population-2050-unfpa-report)) | P, F, S | High, but 2026 just used it; pair it with a twist (elderly + technology) |
| Floods / cloudbursts | Dharali flash flood, Aug 2025 ([Outlook Business](https://www.outlookbusiness.com/news/uttarakhand-dharali-flash-floods-2025)) | V, P | Medium-high |
| UPI / digital Census | First digital census, self-enumeration in 16 languages ([Governance Now](https://www.governancenow.com/news/regular-story/worlds-largest-census-exercise-gets-under-way-from-april-1)) | P, V | Medium-high |
| Mass gatherings | Maha Kumbh 2025 crowd crush ([Wikipedia](https://en.wikipedia.org/wiki/2025_Prayag_Maha_Kumbh_Mela_crowd_crush)) | P, V (wayfinding, lost & found) | Medium-high, as crowd safety, never named |
| ASHA / rural health | ~9–11 lakh ASHAs ([YourStory](https://ts.yourstory.com/socialstory/2025/03/asha-workers-backbone-of-indias-rural-healthcare-strike)); ASHA app brief already in 2018 | P, F (kit bag) | Medium-high, as "an ASHA's day", not a strike |
| Accessibility | Supreme Court orders mandatory accessibility rules, Nov 2024 ([LiveLaw](https://livelaw.in/top-stories/supreme-court-directs-union-to-frame-mandatory-rules-under-rights-of-persons-with-disabilities-act-for-accessibility-of-public-spaces-274704)) | P, F, V | Medium-high |
| Air pollution | Delhi AQI 400+, Nov 2025 ([Business Today](https://www.businesstoday.in/amp/india/story/delhi-air-quality-hits-severe-as-aqi-tops-400-in-parts-of-national-capital-grap-3-still-not-enforced-501371-2025-11-09)) | V (AQI scale), C | Medium |
| Space | Shubhanshu Shukla on the ISS, Jun–Jul 2025 ([ISRO](https://www.isro.gov.in/Axiom04_mission_successfully_concluded_return_ISRO_Gaganyatri_ShubhanshuShukla.html)) | V, C | Medium (science-museum icons exist) |
| AI in daily life | India–AI Impact Summit, Feb 2026 ([AIR News](https://newsonair.gov.in/india-ai-impact-summit-2026-begins-in-new-delhi-five-day-global-ai-summit-to-be-hosted-in-global-south/)) | C | Medium |
| Transport disasters | Air India AI171, Jun 2025 ([Al Jazeera](https://www.aljazeera.com/news/2025/6/12/air-india-plane-crashes-shortly-after-take-off-in-ahmedabad)) | — | Low; exclude |

Slot key: S Sketching, C Creativity, V Visual, F Form, P Problem ID.

---

## Content banks, in priority order

### Part A design-history and design-knowledge items

History and GK load has shrunk since 2020 to about **5 of 44 Part A items**, all image-based, in five shapes: identify or order images, craft-process sequence, ergonomic percentile, design principle, Indian culture ordering ([2026](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf), [2026 key](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Answer_Key.pdf)). Build image-first cards and **multi-item ordering drills**. Store a state and latitude on every monument, dance and craft so the app can generate "order north→south" questions (2026 Q36 format).

| Priority | Cluster | Items |
|---|---|---|
| **P1** (asked) | Movements | Renaissance, Baroque, Realism, Cubism (ordered 2015); Arts & Crafts, Art Deco (ordered 2018); De Stijl, Impressionism, Pop Art, Art Nouveau (identified 2026) |
| P1 | Painters / works | Picasso (2015, 2017), Rembrandt, Klimt (2016), Van Gogh, Gauguin (2017), Raja Ravi Varma (2018) |
| P1 | Objects, logos | Barcelona chair (2018); I♥NY → Glaser (2016); Apple, Google, Chrome, Tesla logos; Parle-G font (2019); Satyajit Ray's typefaces (2016) |
| P1 | Indian culture | Painting: Mysore, Warli, Madhubani, Kalamkari, Pattachitra. Dance: Manipuri, Chhau, Bharatanatyam, Kathakali, Odissi, Kuchipudi. Monuments N→S set (2026). Sculpture and architecture styles: Maurya, Gandhara, Pala, Kushana; Kalinga, Chola, Chalukya, Maru-Gurjara (2016) |
| P1 | Craft process | Wood: size → turn/chisel → drill → sand → finish/lacquer (2019, 2025, 2026); lost-wax metal (2021). Distractors are always industrial (milling, punching, powder coating) |
| P1 | Principles | Percentiles: clearance → 95th, reach → 5th (often female), non-adjustable average → 50th (2022, 2026). Task heights (2023). Analogous scheme (2023). Gestalt (2026). Radio vs checkbox vs dropdown (2026). Materials and processes: extrusion, injection, blow, roto moulding |
| **P2** (adjacent) | Design movements | **Bauhaus** (never asked, though De Stijl was; Dessau centenary 2026), Swiss Style, Memphis, Postmodernism, Futurism, Constructivism, Dada/Surrealism, Op Art, Rams/Braun |
| P2 | Objects | Wassily chair, Red and Blue chair, Eames Lounge, Juicy Salif, Aicher's 1972 pictograms, Beck's Tube map, Helvetica, Futura; inflatable, cardboard and Spun-type chairs (2026 Q28 toy↔furniture logic) |
| P2 | Indian extras | Tanjore, Gond, Kalighat, Pichwai, Phad, miniatures; Amrita Sher-Gil, Husain, Raza, Bengal School; extra monuments; crafts by state (Channapatna, Kondapalli, Dhokra, Bidri, Blue Pottery) |
| **P3** (canon, never asked) | Indian design history | Eames India Report (7 Apr 1958) → NID (1961) → IDC (1969); rupee sign ₹ (D. Udaya Kumar, 2010); Doordarshan logo; Amul girl (1966); Air India Maharaja (1946) ([NID history](https://nid.edu/about/history-of-nid); [Know India](https://knowindia.india.gov.in/national-identity-elements/currency-symbol.php)) |
| P3 | Principles | Nielsen's 10 heuristics; figure–ground, common region; Fitts's law |

Full table with question numbers and keys: `design-history.md`, Q1–Q4.

**Anniversaries are tie-breakers only.** No evidence links CEED question choice to anniversaries. Use them to order P2 cards and as Part B poster seeds: Bauhaus Dessau 100 (2026), Gaudí's death 100 (2026), Futura 100 (2027), Helvetica 70 (2027), I♥NY 50 (2027), Amul girl 60 (2026), NID 65 (2026) ([Bauhaus Dessau](https://bauhaus-dessau.de/en/events/opening-of-the-centennial-exhibitions/), [Bauer Types](https://bauertypes.com/?p=34462)).

### Indian everyday library: highlights

The full library is a **setting × user × object × moment** matrix with region tags, in `current-context-and-india-library.md`, Part B (B1–B7). What to pull first:

- **Settings past papers favour:** railway platform, general and sleeper coach, bus stop, vegetable cart, kirana, rural kitchen, school. Next: hospital OPD, temple queue, ghat, government office (RTO, ration), weekly haat, construction site, flood relief camp.
- **Users:** children, elderly (urban alone or rural with family), vendors (thelawala, chaiwala, fisherwoman), delivery riders, ASHA and anganwadi workers, coolies, domestic workers, migrant workers, persons with disability, pilgrims.
- **Objects with built-in design tension:** pressure cooker (whistle as timer), stacked tiffin (leaks), matka (fragile cooling), charpai, LPG cylinder (weight, leaks), bucket-and-mug, QR standee, shared smartphone, tarpaulin, dupatta/gamcha.
- **Pain-point seeds** per setting (B6) feed Problem ID directly. Bus stop example: no shade or seating, no route info, unsafe at night, crowd surge on arrival.
- **Rotation rule:** vary region (hill, desert, coast, flood plain, NE), climate moment (May heat, July monsoon, December smog), settlement scale and class. Avoid defaulting to middle-class metro life. Past papers lean ordinary and lower-income.
- **Festivals:** use as everyday backdrop (kite day, pandal crowd), never as the subject. The library entries are general knowledge, not individually sourced. Verify any craft fact before it enters Part A.

---

## Trade-offs and caveats

| Caveat | Effect | What to do |
|---|---|---|
| **Single coder per era**, two slightly different schemes, no inter-rater check | Frequencies are directional; ±1–2 per cell | Use rankings, not exact ratios |
| **Booklet-only stimuli missing**: Creativity marks for 2019, 2021–23 (including the 2021 themes and 2023 first words) and the 2024 frame layout were printed only in answer booklets | C1 seen values are incomplete | Generate C1 marks procedurally; flag them as added |
| **Image-dependent slots** (V2–V4, F1–F2, P1–P2) | Text-only versions train the decision, not visual observation, which Problem ID and Form score | v1: text-generable subtypes (S1, S4, C2, C4, V1, V5, F3, P3). Later: a licensed image library for the rest |
| **Stimulus identifications are the auditor's** (Hadid 2022, Mendini/Alessi 2025, toy-furniture designers 2026) | The papers name no one | Keep them as debrief trivia, not facts asserted in prompts |
| **Setter claim is inference** | IDC authorship is unproven, so theme weighting from faculty interests is soft | Treat as medium; never override paper frequencies |
| **Current-context sources vary in quality** (one heat stat from an aggregator; some figures from Wikipedia mirrors; Gaganyaan G1 launch unconfirmed) | Hooks are flavour, not facts | Never put a news number into a prompt |
| **Anniversary hooks** | No evidence of use | Tie-breaker for card order only |
| **Sister-exam data** is a coaching paraphrase (UCEED) or memory-based (NID, NIFT); UCEED's own structure is reported inconsistently | Seed quality uneven | Use UCEED for Sketching and Form seeds; skip NIFT |
| **Unrecorded items**: 2010–14 Part B durations; 2015–19 Part A keys (answers inferred) | Minor | Mark inferred keys in the Part A bank |
| **Added values are unvalidated** | About 30% of generated content has no ground truth for being "in register" | Review the added lists once against the seen ones, or by a mentor; log which prompts feel off in the debrief |

---

## Conclusion

The exam is **conservative in content and restless in mechanics**. Across 17 years the cast barely changes: a child, an animal, an elderly traveller, a vendor, a kitchen, a train. What changes each year is the rule: whose eyes you draw through, how symbols may be used, whether solutions are banned or worth 60% of the marks. Predicting topics is therefore low-value. Being unrattled by a new rule is high-value, and that is exactly what a timed commit loop can train. Spend the generator's variety budget on the twist layer and the user list, not on news.

The 2020 removal of the electives quietly settled the design-history and current-events question for Part B. Named references now live only in Part A. Part B gets the *form* of history (a building, a corkscrew, a font) and the *lived residue* of news (a swab, a crowded compartment), never the name. The bridge between your two app halves follows from this: an unnamed Part B stimulus becomes a named Part A card at debrief. One asset then trains both "extract the language" and "identify the movement".
