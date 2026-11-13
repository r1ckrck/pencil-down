# Build a Part B coach, not a quiz app

**The answer:** the app should be built around one loop that no existing product closes for a self-studying aspirant: **timed Part B prompt → paper sketch → phone photo → feedback against the question's official criteria → journal → re-attempt.** Second comes a lean Part A loop: **timed past paper → exact CEED scoring → error log → targeted re-practice**, aimed at clearing the qualifying cutoff with margin rather than maximising Part A. The reasons are structural. Part B carries **75% of the final score** but is only evaluated if she clears a relative Part A cutoff ([CEED 2027 Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf)). Part A mocks are a cheap commodity. Part B feedback exists only as human review inside paid coaching batches ([PW](https://www.pw.live/design-architecture/design/batches)). With CEED 2027 on **17 Jan 2027, about 9 weeks out**, every week spent building is a week she isn't using the tool. So for 2027 the v1 must ship in **5–7 days**, lean on paper and official PDFs, and use the exam-to-results gap (17 Jan to 3 Mar) to build the post-result module for the **March–May institute rounds** (studio tests, interviews, portfolio). For a CEED 2028 target, the same core grows into a 14-month system with a faithful computer-based test (CBT) simulator, generated spatial drills, spaced-repetition design knowledge, and a portfolio built alongside prep. The partner's own design background is an asset no commercial product offers: they can calibrate the AI critic and act as the human reviewer of record.

---

## The exam is a gate followed by a drawing test

CEED is one 3-hour sitting. The format has been stable since 2024, so the app can encode it exactly rather than approximately.

| | Part A | Part B |
|---|---|---|
| Format | 1 hr, **CBT** (computer-based test), 44 questions | 2 hrs, 5 questions shown on screen, answered **on paper** in a booklet |
| Marks | 150: 8 **NAT** (numerical answer typed in, +4, no negative), 10 **MSQ** (multiple-select, +4 with partial credit, **−1** for any wrong option), 26 **MCQ** (single answer, +3 / −0.5) | 100: Sketching, Creativity, Visual Sensitivity, Form Sensitivity, Problem Identification, 20 each, no negative |
| Role | **Gate.** General cutoff δ = μ + σ/2 of all candidates' Part A marks; Part B is evaluated only above it | **Rank.** Final = 0.25 × A + 0.75 × B |
| Feedback available | Draft key + own responses released 19 Jan 2027 | None. No model answers, no re-evaluation, booklets never shown |

Sources: [Brochure](https://www.ceed.iitb.ac.in/2027/downloads/CEED2027_Brochure.pdf), [CEED 2026 paper](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf).

Three details in that table shape the product directly.

- **The cutoff is relative but predictable.** The general cutoff was **50.26 in 2024, about 54 in 2025, and about 47.8 in 2026** out of 150 ([Careers360](https://design.careers360.com/articles/ceed-cutoff), [Collegedunia](https://collegedunia.com/exams/ceed/cutoff)). A target of **about 60/150** in mocks gives a safe margin. Beyond that, extra Part A marks are worth only 0.25 each.
- **MSQ scoring punishes greed.** Picking one correct option earns +1. Picking any wrong one costs −1. Toppers describe answering only the questions they are sure of and never guessing ([DQ Edge](https://edge.dqlabs.in/articles/ceed-topper-interview), [TEAcup](https://teacupblog.blogspot.com/2021/08/apoorv-ixd-at-idc-iitb.html)). The app should train that discipline explicitly by tagging each answer *sure / unsure / skip* and showing what each tag earned.
- **Part B uses fixed templates and states its marking criteria.** Each question prints about 4 evaluation criteria. In 2026 the Sketching criteria were character and expressions, proportion and composition, sketch quality, and environment and props ([2026 paper](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf)). The templates repeat year to year:

| Slot | Recurring template (2023–2026) |
|---|---|
| Sketching | Scene from an unusual point of view (ceiling camera, a fox, a chair), often pencil-only |
| Creativity | 4-frame story or interpretation built from given symbols or elements |
| Visual sensitivity | Icon set or identity with a consistent visual language (zoo animals, museum sections, an "IWHA" logo) |
| Form sensitivity | Furniture or a product derived from a given primitive or abstract form (furniture in both 2024 and 2026) |
| Problem identification | Annotated problems in an Indian everyday setting (bus stop, rural kitchen, vegetable cart); 2026 added "How can we…" statements |

Sources: [2023](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2023_Question_Paper.pdf), [2024](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2024_Question_Paper.pdf), [2025](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2025_Question_Paper.pdf), [2026](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf) papers.

This stability makes a prompt bank seeded from real past questions viable. The criteria printed on each paper can serve directly as the scoring rubric, so nothing has to be invented.

Part A is overwhelmingly visual: folding and unfolding, rotation, orthographic and isometric views, sections, counting, and mechanisms such as gears and cams. Around these sits a small general-knowledge (GK) layer: art movements, Indian dance and monuments, Gestalt principles, ergonomics percentiles, making processes, and UI conventions ([2026 paper](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2026_Question_Paper.pdf), [2025 paper](https://www.ceed.iitb.ac.in/2027/downloads/CEED_2025_Question_Paper.pdf)). Some questions use **animated GIFs**, which the PDFs show only as stills. That matters if the app ever renders questions itself.

Calibrate expectations too. Topper final scores were **68.85 (2023) and 82.38 (2025)** ([Careers360](https://design.careers360.com/articles/ceed-toppers)), and the formula's true maximum is 112.5. Nobody aces Part B. Progress should show as trends, not perfection.

The competition is also tighter than "qualifying" suggests. In 2025, **4,371 candidates appeared and 1,848 qualified** ([Careers360](https://news.careers360.com/ceed-2025-result-rohit-ravindra-waghmare-grabs-air-1-1848-candidates-qualify)), for roughly **300–360 M.Des seats** across 11 institutes ([Free Press Journal](https://www.freepressjournal.in/education/iit-bombay-mdes-2026-registration-begins-for-78-seats-at-acadiitbacin-check-eligibility-and-dates)). Admission is decided by Part B and then by the institute rounds, which is why the app shouldn't stop on exam day.

## Toppers run two loops, and self-learners lack feedback on one of them

Accounts from toppers converge on two practice loops.

1. **Mocks plus error review** for Part A. The 2021 AIR 4 (all-India rank) took about **12 online mocks** and treated each past-year question (PYQ) as a topic to write notes on ([TEAcup](https://teacupblog.blogspot.com/2021/08/apoorv-ixd-at-idc-iitb.html)).
2. **Daily sketching plus critique** for Part B. The same candidate followed a progression: warm-ups → basic shapes → 3D forms → products → figures → vehicles. He had peers critique his work every day, and kept a time budget of **about 18 minutes per question with the last 30 minutes kept for finishing** ([TEAcup](https://teacupblog.blogspot.com/2021/08/apoorv-ixd-at-idc-iitb.html)).

Crash plans share the arc **diagnose → build → simulate → revise**, with about a **60/40 split of time between Part B and Part A**, an error log, and a "sketch bank" of 2–3 concept sketches a day ([Toprankers 30-day plan](https://www.toprankers.com/ceed-30-day-plan)).

Several pain points recur across these accounts:

- **No reliable feedback on drawings.** Self-learners "repeat the same mistakes unknowingly" ([learningeducations](https://learningeducations.com/understanding-the-ceed-exam-and-the-mindset-it-demands/)) and lean on WhatsApp or Instagram peers.
- **Speed.** Speed was the main constraint for the 2014 AIR 10 ([DesignEx](https://www.designexstudio.com/post/ashishceed-iit-bombay)).
- **Split attention** with GATE or a job ([TEAcup](https://teacupblog.blogspot.com/2021/08/apoorv-ixd-at-idc-iitb.html)).
- **Wrong answer keys** in coaching mocks ([TEAcup](https://teacupblog.blogspot.com/2021/08/apoorv-ixd-at-idc-iitb.html)).
- **Over-indexing on rendering.** CEED is "more of ideas rather than sketching", and preparing for only one design stream is "the worst practice" ([Stuff You Look](https://stuffyoulook.blogspot.com/p/ceed-mdes.html)).
- **Low confidence** among engineering graduates. Engineers are nonetheless the core audience, and civil and mechanical graduates have reached the top 10.

Each pain point implies a design choice:

- **Answer keys:** use only official papers and official keys (2020–2026 keys are published).
- **Speed:** every Part B drill is timed. Budget about 24 minutes per question in the exam-shaped mode.
- **Ideas over polish:** the rubric weights ideas, annotation and problem framing, not just line quality.
- **Confidence:** a visible sketch timeline is the cheapest available evidence of progress.

**Coverage caveat:** Reddit and most 2023–2026 topper interviews were not accessible to this research. The pain points come from blogs and coaching guides, many of them pre-2023, so treat their prevalence as unquantified.

## Part A tools are a commodity, and Part B feedback is the gap

| Need | What exists | Gap |
|---|---|---|
| Part A mocks | Free to about Rs 1,000 from many aggregators ([HenceProve](https://henceprove.pages.dev/mock-test/ceed), [Silica](https://silica.co.in/?p=4284), [Toppersexam](https://toppersexam.com/STATE-LEVEL-EXAMS/CEED/free-test_7192.html)); BRDS sells 6 mocks for Rs 999 ([BRDS](https://rathoredesign.com/study-material/ceed-mdes/)) | Quality is uneven. HenceProve's "2027" mock is 40 questions in 180 minutes, which is the wrong format. Silica withholds solutions until you upload an admit card |
| Interface-faithful CBT | Only IIT Bombay's official mock ([Careers360](https://design.careers360.com/articles/ceed-mock-test)) | Built for familiarisation, not repeated practice |
| Part B feedback | Human faculty review inside paid batches ([PW](https://www.pw.live/design-architecture/design/batches)). Historically, BRDS papers were couriered for marking ([BRDS](https://rathoredesign.com/ceed-study-material-pdf/)) | Slow, batch-bound, no stated rubric. Nothing found offers fast or rubric-based feedback |
| Spatial drills | Generic Brilliant.org is the usual recommendation ([ShapeVerse](https://shapeverse.in/blog/free-resources-design-exam-prep/)) | Nothing design-specific or adaptive |
| Design GK | Scattered reading lists | No spaced repetition built for CEED |
| Progress over time | None found | No sketch journal and no error-type analytics |

What this means for a single-user build: **don't rebuild what is free and adequate.** Part A question content already exists as official PDFs with official keys. The value lies in the layers around that content: exact scoring, the error log and confidence discipline. On the Part B side the field is empty, which is where the app earns its keep.

**Licensing:** reusing official papers commercially is unverified. For a private, single-user tool the risk is low, but keep it private.

## Evidence supports retrieval, spacing and spatial training, and AI critique only as a coach

| Technique | Evidence | App implication |
|---|---|---|
| **Retrieval practice** (testing yourself rather than rereading) and **spaced practice** (reviews spread over time) | The only two techniques rated "high utility" of the 10 reviewed by Dunlosky et al. (2013); rereading and highlighting were rated low ([APS](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html)) | Missed Part A question types come back on a schedule. GK goes into flashcards, not notes |
| **Spatial training** | A meta-analysis of 217 studies found a **moderate effect, g = 0.47**, durable and transferable ([Uttal et al. 2013](https://pubmed.ncbi.nlm.nih.gov/22663761/)). Hedges' g is a standardised effect size: 0.2 small, 0.5 medium, 0.8 large | A short daily rotation, folding and section dose is worth building. It is the trainable core of Part A |
| **Interleaving** (mixing problem types within a session) | Overall g = 0.42; **largest for paintings and visual material (g = 0.67)**; not useful for word lists ([Brunmair & Richter 2019](https://pubmed.ncbi.nlm.nih.gov/31556629/)) | Use mixed timed Part A sets and image-based GK cards ("which movement is this chair?") |
| **FSRS** (Free Spaced Repetition Scheduler, which models how well each card is remembered to pick the next review date) | Needs fewer reviews than Anki's older algorithm for the same retention ([Anki FAQ](https://faqs.ankiweb.net/what-spaced-repetition-algorithm)) | Embed an open-source FSRS library, or export the deck to Anki |
| **AI sketch critique**, using a VLM (vision-language model, an AI that reads images and text) | With **few-shot calibration** (showing the model rated example sketches first), the best reasoning VLMs approached expert agreement on drawing quality, uniqueness and creativity ([Edwards et al., JMD 2026](https://decode.mit.edu/assets/papers/2026_Edwards_judges_jmd.pdf)). They still trail humans badly at spotting errors in hand-drawn diagrams ([SketchJudge](https://arxiv.org/abs/2601.06944v1)), and zero-shot models rate hand-drawn sketches more harshly ([listing, unverified](https://www.emergentmind.com/papers/2603.28363)) | Feasible as a **rubric-bound coach**: ask for the "top 2 fixes" against the question's own criteria, track trends, and don't treat its scores as a grade |

Two parts of this evidence are thin:

- **No study found shows that VLM feedback actually improves a learner's drawing over time.** The evidence covers rating accuracy only.
- **Applying deliberate practice to drawing is inference, not sourced.** Deliberate practice means one sub-skill per session, immediate feedback, and repetition at the edge of ability.

So the AI critic is a reasonable bet, not a proven intervention. The mitigation is cheap: the partner rates 5–10 sketches once to serve as calibration examples, and they spot-check the AI weekly.

Generated spatial puzzles have the same split. **Procedurally generated puzzles** (cube nets, folds, Shepard–Metzler block rotations rendered in code, e.g. three.js) are correct by construction. **LLM-written puzzles** risk wrong answer keys, which is exactly the coaching failure aspirants already complain about.

## Feature recommendation: what to build, in what order

### Scenario A: sitting CEED 2027 (9 weeks out)

**Build budget:** about 5–7 days for v1, so she gets at least 7 weeks of use. She should start the analogue routine today (daily sketching, official PYQs on paper) and not wait for the app. The app adds structure and feedback on top of that routine.

| Priority | Feature | What it helps her do | Why it earns its place |
|---|---|---|---|
| **Must** | **Part B timed drill + photo journal.** Prompt bank seeded from 2023–2026 Part B questions plus template variants. Per-slot timer (~24 min) and full 2-hour 5-question mode. Phone-photo capture. Self-score against the question's printed criteria (4 × 5 marks) | Practise the exact five templates under exam timing, and see her own progress | Part B is 75% of the score and is where rank is made. The journal answers the confidence problem. This is the core loop |
| **Must** | **Rubric-bound AI critique.** VLM call with the question's criteria plus 5–10 partner-rated example sketches. Output: top 2 fixes, one strength, criterion notes; scores logged as a trend | Get same-day feedback without a coaching batch | Closes the biggest gap in the market. Few-shot calibration is the setup that worked in research. Partner spot-checks weekly |
| **Must** | **Part A answer-sheet scorer.** She sits an official PDF paper on a strict 60-min timer, then enters answers into a 44-item grid (numeric field / checkboxes / radio). The app applies exact CEED scoring, including MSQ partial credit, and records a *sure / unsure / skip* tag per answer | Know her real score under the real rules, and learn when guessing costs her | Official papers and keys exist, so there's no content to build. Exact MSQ logic is what aggregators get wrong. Confidence tags train the "don't guess" habit toppers describe |
| **Must** | **Error log with typed tags** (fold, rotation, views, mechanism, count, GK-art, GK-India, ergonomics…). Shows weakest types; re-queues them | Turn each mock into a targeted to-do list | Every topper kept one, and it is a direct form of retrieval practice |
| **Must** | **Countdown plan + cutoff target.** Weeks mapped to diagnose → build → simulate → revise; 60/40 Part B/A; mock scores plotted against the 48–54 cutoff band with a 60 target | Know what to do today, and whether Part A is safe | Turns the exam date into daily units; keeps Part A in its place as a gate |
| Nice | GK flashcards (FSRS, image-interleaved) | Retain art movements, Indian crafts, monuments, Gestalt, ergonomics | Small share of Part A. Exporting to Anki costs nearly nothing |
| Nice | Same-prompt re-draw comparison (side by side, weeks apart) | See improvement concretely | Cheap once the journal exists |
| Nice | Post-exam Part A estimator: response sheet vs draft key (19 Jan), compared with a cutoff estimate from past μ/σ | Know by late January whether to start institute prep | About an hour's work, and it removes two weeks of anxiety before the 4 Feb cutoff |
| **Must (builds during the result wait, 17 Jan – 3 Mar)** | **Institute-round module.** Portfolio checklist (3–5 projects, each explainable in 2–3 min, showing process; print ≤30 pages; PDF under 10 MB) ([ShapeVerse](https://shapeverse.in/blog/ceed-portfolio-preparation-guide/)); an interview question bank on why design, why this discipline, background and the "why" behind each project; timed studio-exercise prompts, e.g. the 2024 IDC paper prototype of a bench for elderly users ([Medium snippet](https://gore-des.medium.com/navigating-ceed-mdes-admissions-at-idc-iit-bombay-5d50ff8bb2bc), unverified); per-institute notes (IDC stresses making and materials, IISc CPDM probes engineering fundamentals) ([DesignEx](https://www.designexstudio.com/post/ashishceed-iit-bombay)) | Be ready when shortlists drop. The 2021 IDC timeline ran applications 1–8 Apr → shortlist 26 Apr → portfolio 8–14 May → interview 18 May ([TEAcup](https://teacupblog.blogspot.com/2021/08/apoorv-ixd-at-idc-iitb.html)) | Admission is decided here, not on rank alone. The 6-week result wait is free build time. She should start portfolio work then too, since toppers advise starting it early |
| **Skip for 2027** | Full CBT simulator, procedural spatial drills, AI prompt generator | — | High build cost. The official mock covers the interface, and the payoff arrives after the exam |

### Scenario B: targeting CEED 2028 (about 14 months)

The same core applies, with a longer horizon. These features become worth building:

| Priority | Feature | Reasoning |
|---|---|---|
| **Must** | Everything in the Scenario A must-have list | Same loops; more time to use them |
| **Must** | **Sketch progression curriculum.** The warm-ups → shapes → forms → products → figures → vehicles → scenes ladder ([TEAcup](https://teacupblog.blogspot.com/2021/08/apoorv-ixd-at-idc-iitb.html)), each stage with sub-skill drills and a gate to move up | A long runway rewards fundamentals over exam templates |
| **Must** | **Procedural spatial drills.** Generated nets, folds, rotations and sections; correct by construction; track accuracy and response time | The best-evidenced trainable skill in Part A (g = 0.47) and the heart of the paper |
| **Must** | **FSRS GK deck** with image-interleaved cards | Spacing compounds over months. The interleaving effect is strongest on visual material |
| Nice | **CBT simulator** that mirrors the official interface: palette, mark-for-review, NAT keypad, GIF stimuli, hard 60-min lock before Part B | Builds interface fluency. Payoff is modest once the official mock has been taken a few times |
| Nice | **Prompt generator** (object × viewpoint × constraint × user, seeded from PYQ themes) | Keeps 300+ days of drills fresh. A combinatorial list is safer than open-ended LLM generation |
| Nice | **Portfolio-in-progress tracker**: one self-initiated or handmade project per quarter | The 2017 rank 15 credits a handmade product shown at interview as "a key factor" ([DQ Edge](https://edge.dqlabs.in/articles/ceed-topper-interview)) |
| Nice | Calibration loop: the partner re-rates a monthly sample, and the AI's few-shot examples are refreshed | Keeps the critic from drifting as her level rises |

### Trade-offs to accept knowingly

| Decision | Recommended | Cost accepted |
|---|---|---|
| Part A content: digitise questions vs enter answers from PDF | **Enter answers from PDF** (2027); digitise later (2028) | Less exam-like practice: paper and screen differ, and GIF questions appear as stills. In return, about a week of build time goes into Part B instead |
| AI critique: score vs advice | **Advice ("top 2 fixes"), scores logged only as a trend** | Less satisfying than a number, but avoids false precision. VLMs are harsher on hand-drawn work and weak at geometric correctness |
| AI vs human reviewer | **AI daily, partner weekly** | Partner time. They aren't a CEED examiner, but their ratings anchor the critic and catch its blind spots |
| Breadth vs depth for 2027 | **Five must-haves, nothing else before the exam** | GK and spatial drills go unbuilt. She covers them with the official PYQs and an off-the-shelf Anki deck |
| Building time vs practice time | **Ship v1 in under a week; she starts on paper on day 1** | A rougher app. The alternative is a polished app arriving in week 5 |

## Conclusion

The research reframes the brief. A "CEED prep app" sounds like question banks and mock tests, but those already exist, mostly free, and matter only up to a cutoff of about 50/150. The real leverage is narrower: one person, practising five fixed drawing templates against criteria printed on the paper itself, with feedback the same day. That loop is small enough to build in a week and covers the 75% of the score where no tool exists.

The partner relationship is the hidden advantage. A design engineer who can rate her sketches once, calibrate an AI critic with those ratings, and check its output weekly is the mentor coaching centres charge for. The exam calendar also gives a natural build schedule: exam prep through 17 January, then the six-week wait for results to build the portfolio and interview module, because admission is decided in March–May, not in January. If she targets 2028 instead, the evidence favours investing early in spatial training and spaced GK, where the gains compound over a long runway. The AI critic stays the open bet: research shows it can rate sketches roughly like experts, but no study yet shows its feedback makes anyone draw better.
