# CEED Exam Structure and Mechanics (CEED 2027 cycle)

Primary source: CEED 2027 Information Brochure v1.0 — [Brochure PDF](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf), [CEED 2027 site](https://www.ceed.iitb.ac.in/2027/). Past papers read directly from the official site (2023–2026 PDFs). Secondary numbers (cutoffs, candidates, toppers) come from aggregators; flagged where so.

## 1. Current pattern: Part A and Part B (durations, questions, marks, negative marking)

### Takeaway
3-hour paper on one morning: Part A = 1 hr computer-based, 44 objective questions, 150 marks (NAT/MSQ/MCQ with negative marking on MSQ/MCQ). Part B = 2 hrs, 5 mandatory pen-and-paper questions x 20 marks = 100 marks, questions shown on screen, answered in a physical booklet. Pattern unchanged 2024 → 2027.

### Cited Findings
**Timing**
- CEED 2027: Sunday 17 Jan 2027, 9:00–12:00. Part A 9:00–10:00, Part B 10:00–12:00. Both parts mandatory. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- Part B starts only after Part A ends; Part A cannot be revisited once Part B starts. — [CEED 2026 QP instructions](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf)

**Part A (150 marks, 1 hour, computer-based)**

| Section | Qs | Q. no. | Correct | Wrong | Unattempted | Total |
|---|---|---|---|---|---|---|
| NAT (Numerical Answer Type) | 8 | 1–8 | +4 | 0 | 0 | 32 |
| MSQ (Multiple Select) | 10 | 9–18 | +4 max, partial | −1 | 0 | 40 |
| MCQ (Multiple Choice, single answer) | 26 | 19–44 | +3 | −0.5 | 0 | 78 |
| **Total** | **44** | | | | | **150** |

— [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)

- NAT: answer is a number typed via an on-screen virtual keyboard; no options shown; no negative, no partial. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- MSQ: 4 options, one or more correct. Exact scoring rules (needed for an app scoring engine):
  - +4 if all correct options chosen and no incorrect one.
  - +3 if all four options are correct but only three chosen.
  - +2 if three or more options are correct but only two chosen, both correct, no incorrect.
  - +1 if two or more options are correct but only one chosen, it is correct, no incorrect.
  - 0 if unanswered.
  - −1 in all other cases (i.e. any incorrect option selected). — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- MCQ: 4 options, exactly one correct. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- Questions can contain **animated GIFs** (e.g. 2026 Q5 "how many spheres are rotating", Q16 orbiting planets, Q35 cam toy; 2025 bird-flight animation). — [CEED 2026 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf), [CEED 2025 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2025_Question_Paper.pdf)
- One scribble pad given for rough work; no calculators, watches of any type, or phones. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)

**Part B (100 marks, 2 hours, pen-and-paper)**

| Q | Section | Marks | Partial | Negative |
|---|---|---|---|---|
| 1 | Sketching | 20 | Yes | No |
| 2 | Creativity | 20 | Yes | No |
| 3 | Form Sensitivity | 20 | Yes | No |
| 4 | Visual Sensitivity | 20 | Yes | No |
| 5 | Problem Identification | 20 | Yes | No |

— [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf). Note: the 2027 brochure table lists Form Sensitivity as Q3 and Visual Sensitivity as Q4; actual 2024 and 2026 papers had Visual Sensitivity as Q3 and Form Sensitivity as Q4. — [CEED 2026 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf), [CEED 2024 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2024_Question_Paper.pdf)

- Questions displayed on computer; answers drawn/written in the invigilator-supplied booklet, on the page(s) designated per question. Candidate ticks an on-screen box to record having answered. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- Candidates bring own pens, pencils, sketch pens, colours, and a clean drawing board; no drawing sheets; **watercolours not allowed**. Colour pencils/crayons/sketch pens allowed unless the question restricts (e.g. sketching question limited to black/HB pencils). — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf), [CEED 2026 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf)
- Every Part B question states its own explicit **evaluation criteria** (typically 4 criteria). Evaluation is holistic, double-blind, no model solutions, no re-evaluation, booklets not shown to candidates. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- PwD scribes allowed for Part A only; Part B must be self-attempted. Compensatory time 20 min/hour for eligible PwD. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)

### Inferences
- An app's Part A mock needs three distinct input types (numeric keypad, multi-checkbox, single-radio), a 60-min hard timer with lock-out before Part B, support for animated GIF stimuli, and the exact MSQ partial-credit logic above.
- Part B practice should mirror the 5 fixed question slots with 20-mark rubrics built from the stated evaluation criteria (4 criteria x 5 marks is the common split).
- MSQ −1 penalty is harsh relative to +1 for one correct pick: strategy coaching (when to pick only the surest option) is a real feature opportunity.

### Gaps
- Per-section time split inside Part A is not prescribed (candidates manage the hour freely) — confirmed by absence in brochure, not by an explicit statement.

## 2. Part A screening and final score weighting

### Takeaway
Part A is a gate: only candidates above a statistically-defined cutoff get Part B evaluated. Final score = 0.25 x Part A (out of 150) + 0.75 x Part B (out of 100).

### Cited Findings
- GEN cutoff δ = μ + σ/2, where μ and σ are the mean and standard deviation of Part A marks of ALL candidates (rounded to 2 decimals). OBC-NCL/EWS cutoff = 0.9δ; SC/ST/PwD = 0.5δ. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- Part B booklets evaluated ONLY for shortlisted candidates. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- Final score = 0.25 x Part A marks + 0.75 x Part B marks. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- Part A marks shown to all candidates; Part B marks and rank shown only to shortlisted candidates; all shortlisted candidates get a rank. Merit list prepared per category. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- Score valid one year. Qualifying does not guarantee admission; institutes run their own processes (tests/interviews/document checks). — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)

### Inferences
- Max final score = 0.25x150 + 0.75x100 = 37.5 + 75 = 112.5 on paper. Yet reported topper scores (e.g. 82.38 in 2025) are described "out of 100" by Careers360 — likely a mislabel; the true max is 112.5 under the formula. Treat aggregator "out of 100" phrasing as unreliable.
- Part A carries 37.5 of 112.5 weighted points (~33%), but its real role is the gate. Part B dominates rank. App should frame Part A as "clear the cutoff with margin," Part B as "where rank is made."
- Because the cutoff is relative (μ + σ/2), an app can estimate "likely qualifying" only from historical μ/σ (see section 5), not a fixed number.

### Gaps
- No official statement of how Part B is internally weighted across criteria beyond the per-question marks.

## 3. Official syllabus and actual question types

### Takeaway
Part A syllabus has 9 topic areas, dominated in practice by visual/spatial reasoning (folding, rotation, views, sections, patterns), with a minority of mechanics/everyday science, art/design history, ergonomics, materials/processes, and Indian culture questions. Part B tests drawing, creativity, communication, and problem identification through 5 fixed question types.

### Cited Findings
**Part A official topics (2027)** — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
1. Visualization and spatial reasoning — transform 2D shapes/3D objects, spatial relationships.
2. Practical and scientific knowledge — scientific principles, everyday objects.
3. Observation and design sensitivity — detect concealed properties, attention to detail, classification, analysis, inference, prediction.
4. Environment and society — environmental, social, cultural connections with design.
5. Analytical and logical reasoning — qualitative and quantitative information.
6. Language — reading/comprehending Standard English.
7. Creativity — verbal and non-verbal analogies, metaphors, signs, symbols.
8. Art and Design knowledge — art/artefacts/products, artists/designers, art/design history, trends.
9. Design methods and practices — media, materials, production processes, ergonomics.

**Part B official topics (2027)** — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- Drawing: products, people, scenes with line quality, composition, proportion, perspective, shading.
- Creativity: out-of-the-box, unique and diverse solutions.
- Communication: concepts via text and visuals.
- Problem identification: understand user and context; material properties and appropriate use.
- Brochure: aptitude test, no textbook recommended; practise drawing, rendering, visualization; past papers on official site. Topics are "indicative"; not all will appear.

**CEED 2026 Part A — actual questions** — [CEED 2026 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf)
- NAT: path length across stacked blocks; mass of ice-cream cone (cone + hemisphere volume x density, π=3.14); area cut out after folding a 10 cm square and cutting circles; count unique patterns in an image; count rotating spheres (animated GIF); max complete letters from 9 font tiles in 3x3; volume of inner part when 8 plane-sliced cubes form a larger cube; minimum dice throws on a ladder board game with a 3-faced dice.
- MSQ: rotated views of a folded octahedron; parts NOT in an image; which symmetric objects leave exact negative impression in wax; folded transparent strip patterns; unfolded net of a cardboard table; pruner spring/stud mechanism; parts completing a grooved solid; planetary orbit ratios (GIF); same 3D object from two views; shapes made from tangram-like cut pieces.
- MCQ: minimum cubes from three views; rubber roller impression; overlaying transparent patterns; matching font; spanner fitting most nuts; correct perspective from viewing direction; locus of point on taut strings; pattern completion ("replace the ?", x2); uniformly distorted grid; toys–furniture feature matching; **art movements identification** (De Stijl, Impressionism, Pop Art, Art Nouveau, Baroque); image + fragment forms English word; mirrored/unfolded printed text "OPEN HEART"; magnet bar end faces; gear pair to spin fan; cam mechanism for reciprocating toy (GIF); **Indian monuments ordered north→south**; **UI screen that misuses standard interface components**; wooden artefact making operations (drilling, chiselling…); **ergonomics — percentile choice for bus seat** (5th/50th/95th); visible surfaces of intersecting hollow cylinders; heat conduction in a copper solid; light inside a hollow cylinder at 45°; construction toy set attributes; **Gestalt principles** sequence (closure, proximity, continuity, similarity).

**CEED 2025 Part A — sample** — [CEED 2025 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2025_Question_Paper.pdf)
- Handedness of tools (right/left-handed, spring-loaded); tiles forming options; dispenser mechanisms (valves, hinges, levers, pressure); matching font; simple rotation vs mirror; wooden artefact processes (turning, lacquering — Channapatna-type); sequential 3-axis rotation of an object; correct profile; mirror image of a sentence; **Indian dance forms sequence** (Kathakali, Manipuri, Chhau, Bharatanatyam…); fold of transparent sheet; missing frame from bird animation (GIF); equation-set pattern; fold-and-cut paper unfold; square pyramid passing through notched cut-outs (resultant side view); rod rolling around circle (locus/tracing); which four parts form a disc.

**Part B — actual questions by year**

| Q | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|
| 1 Sketching | Family selfie from a ceiling camera's POV (12x12x12 ft room, heights given) | Chinnu lifting 2 kg carton to top shelf in 4 frames (pencil only; humour, body language, anticipation) | Two kids chased by a bear in a forest, from a fox's POV (black/HB pencil) | Child + pet dog in kitchen, father enters, from a chair's POV (black/HB pencil) |
| 2 Creativity | Interpret given visual elements in 4 boxes into recognizable images + titles from given first word | Human head as a cube: 4 interactions (human–human/animal/environment/object) | (text in image; criteria: imagination, composition, drawing quality, sequence continuity — i.e. a storyboard) | 4-frame story using given symbols (2 per frame, each once), with title; criteria incl. humour and surprise |
| 3 Visual sensitivity | Visual identity for Indian Women's Hockey Association with "IWHA" | Extend an ornamental font (A, B given) to write "Forest" | 4 black-only icons for zoo animals (mongoose, honey badger, bison, pangolin) | 4 B&W icons for "Indian Museum of Science" sections (robotics, energy, ocean, food tech), no text |
| 4 Form sensitivity | Cutlery set (fork, bowl, glass) for 3–6 yr olds from an abstract 3D form | Single-seater living-room furniture from a given 3D form | (text in image) | Single-seat living-room furniture inspired by a sphere; render |
| 5 Problem identification | Draw + annotate 5 problems at a busy bus stop | Draw + annotate 5 problems in a rural kitchen | 5 buyer + 5 seller problems at a vegetable cart; visualise 1 of each | Elderly couple Srinagar→Chennai trip: 4 "How can we…" statements (8 marks) + 2 drawn solutions for one (12 marks) |

— [2023 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2023_Question_Paper.pdf), [2024 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2024_Question_Paper.pdf), [2025 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2025_Question_Paper.pdf), [2026 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf)

- Recurring evaluation criteria (2026): Sketching — character & expressions, proportion & composition, sketch quality, environment & props. Creativity — originality, graphical narrative, humour & surprise, clarity/neatness. Visual sensitivity — consistency of visual language, thematic appropriateness, communication, composition/clarity. Form — uniqueness, form–function, detailing, rendering. Problem ID — variety/uniqueness, relevance, feasibility, clarity. — [2026 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf)

### Inferences
- Part A is overwhelmingly visual; text-only "language" questions were essentially absent in 2025–2026 papers read. An app should weight practice toward folding/unfolding, rotation, orthographic↔isometric views, sections/intersections, counting, mechanisms (gears, cams, levers), patterns, and a smaller GK bank (Indian art/craft/dance/monuments, art movements, Gestalt, ergonomics percentiles, manufacturing processes, UI conventions).
- Part B has very stable templates: unusual-POV scene sketch; constrained creative narrative/storyboard; icon set or typographic/identity task with consistent visual language; form inspired by a given primitive/abstract form (furniture recurs 2024 & 2026); problem identification in an Indian everyday context with annotated visuals and (2026) "How can we…" framing. These map cleanly to timed drill types with rubric-based self/peer review.
- Time budget implied: 2 hrs / 5 questions ≈ 24 min per question.

### Gaps
- 2025 Q2 and Q4 prompts are embedded as images in the PDF and could not be extracted as text.
- No official topic-wise question distribution; any percentages would be inference from paper counting.

## 4. Changes 2023–2027 and timeline

### Takeaway
The big change came in CEED 2024: Part A went from 100 marks/41 Qs to 150 marks/44 Qs with MSQ partial marking. Part B has had the same 5 mandatory, 20-mark categories since at least 2023. No pattern change announced for 2027; IIITDM Kancheepuram appears among 2027 participating institutes.

### Cited Findings
- **CEED 2023 Part A**: 100 marks — NAT 8 x 3 (no negative) = 24; MSQ 10 x 3, −0.2 for wrong, no partial = 30; MCQ 23 x 2, −0.5 = 46. — [2023 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2023_Question_Paper.pdf)
- **CEED 2024 onward**: 150 marks — NAT 8 x 4; MSQ 10 x 4 with partial, −1; MCQ 26 x 3, −0.5. Identical in 2024, 2026, 2027. — [2024 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2024_Question_Paper.pdf), [2026 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf), [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- Part B 2023–2026: 5 mandatory questions (Sketching, Creativity, Visual Sensitivity, Form Sensitivity, Problem Identification), 20 marks each. — past QPs above
- Exam dates: CEED 2026 on 18 Jan 2026, results 4 Mar 2026 — [Pahal Design](https://pahaldesign.com/?p=20280), [Careers360](https://design.careers360.com/articles/ceed-cutoff)

**CEED 2027 timeline (official)** — [CEED 2027 site](https://www.ceed.iitb.ac.in/2027/), [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)

| Event | Date |
|---|---|
| Registration opens (regular fee) | 1 Oct 2026, 1 pm |
| Regular-fee deadline | 31 Oct 2026 in brochure; site shows extended to 5 Nov 2026 |
| Late-fee deadline | Brochure: 6 Nov 2026 5 pm; site: 10 Nov 2026 5 pm, "no further extension" |
| Admit card | 1 Jan 2027, 1 pm |
| Exam | Sun 17 Jan 2027, 9:00–12:00 |
| Draft Part A key + responses | 19 Jan 2027 |
| Key challenges due | 21 Jan 2027, 5 pm |
| Final Part A key | 26 Jan 2027, 5 pm |
| Part A cutoff announced | 4 Feb 2027 |
| Results | 3 Mar 2027 |
| Scorecard download | 10 Mar – 31 Jul 2027 |

- Registration is closed as of the current date (Nov 12 2026).
- Eligibility: 3-year degree/diploma/PG after 10+2 (or final year by July 2027), or 5-year GD Art after Class 10. No age limit stated. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- 30 exam cities (Ahmedabad … Visakhapatnam). — [CEED 2027 site](https://www.ceed.iitb.ac.in/2027/)

### Inferences
- Pre-2024 papers (2010–2023) remain useful for question style but must be re-scored with the current marking scheme in any app; old answer keys pair with old marks.

### Gaps
- Registration fee amounts not captured in this pass.
- No confirmation of any CEED 2027-specific pattern changes beyond institute list; brochure v1.0 shows none.

## 5. Cutoffs, candidates, seats, institutes, topper scores

### Takeaway
~4,400–4,900 candidates sit CEED annually and ~40% qualify Part A. Part A GEN cutoff sits around 48–55 / 150 in the 150-mark era. Toppers' final weighted scores are ~67–82. Roughly 300–360 M.Des seats across 11 institutes, so admission is far more selective than qualifying.

### Cited Findings
**Part A μ, σ, cutoffs (aggregator data)**

| Year | Part A max | μ | σ | GEN δ | OBC/EWS | SC/ST/PwD |
|---|---|---|---|---|---|---|
| 2026 | 150 | 39.35 | 16.89 | ~47.80 | ~43.02 | ~23.90 |
| 2025 | 150 | 45.48 | 16.98 | ~53.97 (computed) | ~48.57 (computed) | ~26.98 (computed) |
| 2024 | 150 | 41.90 | 16.72 | 50.26 | 45.23 | 25.13 |
| 2023 | 100 | 22.59 | 11.82 | ~28.50 (computed) | — | — |
| 2022 | 100 | 18.62 | 11.93 | 24.58 | 22.12 | 12.29 |

— 2026: [Collegedunia](https://collegedunia.com/exams/ceed/cutoff), [Pahal Design](https://pahaldesign.com/?p=20280); 2022–2025 μ/σ: [Careers360](https://design.careers360.com/articles/ceed-cutoff). Note Careers360's 2024 GEN cutoff 50.26 equals μ+σ/2 = 41.90+8.36 = 50.26, consistent. Another source gives 2025 μ as 45.68 (Silica) — minor conflict. Computed values use the official formula.

**Candidates**
- CEED 2025: 5,090 registered, 4,371 appeared, 1,848 qualified (898 female). Open (non-PwD): 3,094 reg / 2,609 app / 919 qual; OBC-NCL: 1,112/1,000/376; EWS: 141/125/33; SC: 566/483/401; ST: 153/132/104. — [Careers360 toppers/stats](https://design.careers360.com/articles/ceed-toppers), [Careers360 news](https://news.careers360.com/ceed-2025-result-rohit-ravindra-waghmare-grabs-air-1-1848-candidates-qualify)
- CEED 2023: 4,910 appeared, 1,886 qualified. — [Careers360 (search snippet)](https://design.careers360.com/articles/how-many-students-appeared-for-ceed)

**Toppers (final weighted score)**
- 2025 AIR 1 Rohit Ravindra Waghmare — 82.38. — [Careers360](https://news.careers360.com/ceed-2025-result-rohit-ravindra-waghmare-grabs-air-1-1848-candidates-qualify)
- 2023 AIR 1 Khyati Rathore — 68.85; AIR 2 — 66.63. — [Careers360](https://design.careers360.com/articles/ceed-toppers)
- 2022 top — 67.725. — [Careers360](https://design.careers360.com/articles/ceed-toppers)

**Participating institutes (CEED 2027, M.Des)** — [CEED 2027 site](https://www.ceed.iitb.ac.in/2027/)
IIT Bombay (IDC School of Design), IIT Delhi, IIT Gandhinagar, IIT Guwahati, IIT Hyderabad, IIT Jodhpur, IIT Kanpur, IIT Roorkee, IISc Bangalore (CPDM), IIITDM Jabalpur, IIITDM Kancheepuram. Also used for PhD admissions at several IITs/design schools. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- Result-sharing (non-participating) institutes using CEED scores (2026 list): Mahindra Univ., Jain Univ., GLS Univ., MIT ID Indore/Avantika, VIT School of Design, DTU, DJ Academy of Design, JS Institute of Design, RV Univ., DPU, Tezpur Univ., NIT Jamshedpur, GGSIPU USDI, MIT-WPU. — [CEED 2027 site](https://www.ceed.iitb.ac.in/2027/)

**Seats**
- IIT Bombay M.Des 2026: 78 seats; IISc: 18; total across participating institutes 357 (FPJ). — [Free Press Journal](https://www.freepressjournal.in/education/iit-bombay-mdes-2026-registration-begins-for-78-seats-at-acadiitbacin-check-eligibility-and-dates); conflicting total of 302 seats across 8 institutes — [CollegeDekho](https://www.collegedekho.com/exam/ceed/participating-colleges)
- No centralised counselling; each institute applies its own process and cutoff (often further tests/interviews/portfolio). — [Careers360](https://design.careers360.com/articles/ceed-counselling), [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)

### Inferences
- ~4,400 appear, ~1,850 qualify, ~300–360 M.Des seats: roughly 1 seat per 12–15 appearing candidates. Part B performance plus institute-stage (portfolio/interview) decide outcomes.
- A realistic app "target" for Part A is ~60+/150 to clear GEN cutoff with margin (cutoff band 48–54 in 2024–2026).

### Gaps
- Official 2026 registered/appeared/qualified counts and 2026 AIR 1 score not found (only an unofficial AIR 4 name).
- 2024 candidate numbers and topper score not found.
- Institute-wise closing ranks not reliably published.

## 6. Official past papers, answer keys, mock tests

### Takeaway
Official site hosts every question paper 2010–2026 and answer keys 2020–2026, plus a sample online exam interface (TCS iON/digialm). No official full mock test with scoring.

### Cited Findings
- Question papers: 2010–2026 (2016 has two regional versions). Answer keys: 2020–2026 (2021 "final"). — [CEED 2027 site, Downloads](https://www.ceed.iitb.ac.in/2027/)
- Sample exam interface: [digialm sample](https://www.digialm.com/OnlineAssessment/index.html?584@@M90) — linked from [CEED 2027 site](https://www.ceed.iitb.ac.in/2027/)
- Part A candidate responses + draft key released post-exam (19 Jan 2027), downloadable only until results. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- No model solutions for Part B ever published. — [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)
- PDFs contain static images; animated-GIF questions appear as stills with a "[This question contains an animated GIF image.]" note. — [2026 QP](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf)

### Inferences
- An app mirroring the CBT should copy the digialm interface conventions (question palette, mark-for-review, section navigation) since candidates meet that UI on exam day.
- The lack of Part B model answers is the key gap an app could fill (rubric-annotated exemplar answers, peer/mentor review).
- Licensing/reuse of official paper content in a commercial app is unverified.

### Gaps
- Did not inspect the digialm sample interface's specific features (palette states, timer behaviour).
- Copyright terms for reusing official papers not checked.
