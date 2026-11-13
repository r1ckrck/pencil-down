"""Build content/part-b/prompts-real.json and papers-real.json from the official CEED papers.

Usage: part_b_build_real.py <content_part_b_dir>

2020–2026: the five mandatory questions as printed (adapted: false), except the 2020 and 2021 Q2 box
  questions, whose booklet-only boxes and themes are replaced by a note (adapted: true).
2010–2019: each question adapted to the closest current slot as one 24-minute, 20-mark task (adapted: true).
Criteria rules:
- Printed criteria with printed marks keep their split, scaled to 20.
- Printed criteria without marks share 20 evenly (2020–2026 keep the printed count;
  2010–2019 are merged or filled to four, filling from the 2026 criteria for that slot).
Stimulus crops come from part_b_crop_images.py.
"""
import json
import pathlib
import sys


def even(*names: str) -> list[dict]:
    """Share 20 marks across criteria; any remainder goes to the first ones."""
    base, extra = divmod(20, len(names))
    return [{"name": n, "marks": base + (1 if i < extra else 0)} for i, n in enumerate(names)]


def marks(*pairs) -> list[dict]:
    """Printed split, scaled to 20 by largest remainder."""
    total = sum(m for _, m in pairs)
    raw = [m * 20 / total for _, m in pairs]
    out = [int(r) for r in raw]
    order = sorted(range(len(raw)), key=lambda i: raw[i] - out[i], reverse=True)
    for i in order[: 20 - sum(out)]:
        out[i] += 1
    return [{"name": n, "marks": out[i]} for i, (n, _) in enumerate(pairs)]


def img(pid: str, alt: str, n: int = 1) -> dict:
    return {"path": f"images/real/{pid}-{n}.png", "alt": alt}


PENCIL = ["Use only pencils", "Do not use any kind of colour", "Do not use drawing instruments (ruler, compass, set-square)"]

# Current slot shapes (2026 paper), used where a 2010–2019 long-form question is cut to one 24-minute task.
SKETCH = ["Use only black/HB-series pencils", "Do not use other colours", "Draw only in the given space"]
SKETCH_CRIT = even("Character and expressions", "Proportion and composition", "Quality of sketching", "Environment and props")
STORY_RULES = ["Four frames, numbered 1–4", "Give a title"]
STORY_CRIT = even("Originality", "Graphical narrative (story communication)", "Humour and surprise", "Clarity and neatness of sketches")
ICON_CRIT = even("Consistency of visual language", "Thematic appropriateness", "Effective communication", "Composition, clarity and neatness")
HMW_RULES = ["Problem statements start with \"How can we…\"", "Two solutions for one statement"]
HMW_CRIT = [{"name": "Variety and uniqueness of the problems", "marks": 4}, {"name": "Relevance of the problems", "marks": 4},
            {"name": "Practical feasibility of the design solutions", "marks": 6}, {"name": "Clarity in communication", "marks": 6}]


def hmw(context: str, imagine: str) -> str:
    """2026 problem-id shape: four How-can-we statements (8), then two solutions to one of them (12)."""
    return f"""
{context}

{imagine} Write the FOUR problem statements starting with the words "How can we…". (2 × 4 = 8 marks)

Select any ONE of the four statements. Draw TWO potential design solutions for it, and write a short title for each solution. (6 × 2 = 12 marks)
"""

P: list[dict] = []


def add(year, qno, section, slot, title, text, rules, criteria, tags, images=(), adapted=True, suffix="", session=""):
    pid = f"ceed-{year}{session}-b-q{qno}{suffix}"
    P.append({
        "id": pid,
        "source": "real",
        "origin": {"exam": "CEED", "year": year, "qno": qno, "originalSection": section, "adapted": adapted},
        "slot": slot,
        "title": title,
        "text": text.strip(),
        "rules": list(rules),
        "criteria": criteria,
        "images": [img(pid, alt, i + 1) for i, alt in enumerate(images)],
        "tags": {k: v for k, v in tags.items() if v},
    })


# =====================================================================
# 2020–2026: as printed
# =====================================================================

add(2020, 1, "Sketching", "sketching", "Gouri, the Versova fisherwoman", """
Gouri is a fisherwoman from Versova, Mumbai. She sells fish at the same spot every day on a dusty pavement along the main road. She gets upset and angry when someone takes her spot. She doesn't like it when customers bargain with her.

Given the character design of Gouri as above, sketch the following:

1. Gouri sitting at her spot and impatiently waiting for customers. She uses a towel to chase away the flies; she hates them sitting on the fish. (10 marks)
2. Gouri very angry at the customer (do not draw the customer). (10 marks)
""", ["Make a line drawing using only pencils. Do not use any kind of colour", "Do not draw the environments",
      "Do not use any drawing instrument or straight-edges such as a ruler, compass, set-square etc."],
    even("Ability to keep the character consistent", "Expression and body gesture of the character", "Final line quality and finish of the drawing"),
    {"user": "woman street vendor", "setting": "street market pavement", "object": "character poses", "twist": "given character in two emotions; no environment", "hook": "Indian occupation (Koli fisherwoman, Mumbai)"},
    ["Line-drawn character sheet of Gouri: a stout fisherwoman in a sari with a bindi and nose ring, frowning, holding a basket of fish on her hip."], adapted=False)

add(2020, 2, "Creativity", "creativity", "Ten boxes of marks", """
Using the visual elements given in the ten boxes create recognizable objects and give a title to each.

*The published paper shows only the first of the ten boxes (below); the other nine were printed in the answer booklet. Use this box's elements as the starting point for each of your ten images.*
""", ["Use only BLACK pencil/pen", "Draw only within the boundaries of the boxes"],
    even("Originality of ideas", "Diversity of ideas", "Clarity of sketches", "Neatness of sketches"),
    {"object": "titled images", "twist": "complete given abstract marks"},
    ["A square box containing three marks: a short diagonal line, a small circle, and a curved arc, with a title line below."])

add(2020, 3, "Visual Sensitivity", "visual", "Plant photos to icons", """
Create 2D graphic icons for each of the images given below. All icons should belong to the same design language/style.
""", ["Use only BLACK colour"],
    even("Consistency", "Composition", "2D form"),
    {"setting": "nature", "object": "icon set", "twist": "photo-to-icon abstraction"},
    ["Five photographs: a pink hibiscus flower, a palm tree, a pair of cactus stems, a white calla lily, and a cluster of tulips."], adapted=False)

add(2020, 4, "Form", "form", "Mixer-grinder body for a given jar", """
Visualize a form for a mixer-grinder body matching the design language of the given jar. Sketch and render the body with the jar. Use the same perspective as that of the given jar.
""", ["Use the same perspective as the given jar"],
    even("Originality in the form of the body and its proportion", "Consistency with the form of the jar", "Details like buttons, knobs and indicators", "Surface shading", "Quality of line/strokes"),
    {"user": "household", "setting": "kitchen", "object": "kitchen appliance", "pov": "same perspective as the given jar", "twist": "companion product to a given part", "hook": "Indian kitchen appliance"},
    ["Photo of a steel mixer-grinder jar with a clear domed lid and a curved blue handle, seen in three-quarter view."], adapted=False)

add(2020, 5, "Problem identification", "problem-id", "Toothbrush problems", """
Shown below is the picture of a toothbrush. According to you, what are the 6 most important problems that users might face while using such a toothbrush? Illustrate and annotate these problems in the space provided and describe each problem in one sentence. **Do not suggest solutions.**
""", ["Do not suggest solutions", "One sentence per problem"],
    even("Quality and diversity of your observation", "Analytical skills", "Communication"),
    {"user": "general", "setting": "bathroom", "object": "toothbrush", "twist": "no solutions allowed"},
    ["Photo of an ordinary toothbrush with white bristles and a blue-and-white handle, on a black background."], adapted=False)

add(2021, 1, "Sketching", "sketching", "Rohan after play", """
A comic book is to be illustrated that tells the story of Rohan. In the morning, when he goes to school, Rohan looks like the image given below, well dressed with combed hair and ironed clothes. But by the time he returns home, like any playful young boy, he has a dishevelled look with dirt and grime all over. In summer he loves to shoot mangoes out of the tree with his catapult and during monsoon he loves to play football despite the puddles.

Create separate illustrations of the character in the following two situations:

1. Rohan shooting the mango out of the tree. (10 marks)
2. Rohan kicking the football oblivious of the muddy ground after rains. (10 marks)
""", ["Make a line drawing using only pencils. Do not use any kind of colour",
      "Do not illustrate the surroundings, but only the boy and what he is physically interacting with. Do not draw the tree or the entire playground but only the catapult and immediate floor he is standing on if the composition requires it"],
    even("Ability to keep the character consistent", "Expression and body gesture of the character", "Line quality and finish of the drawing"),
    {"user": "child (boy)", "setting": "outdoor play", "object": "character poses", "twist": "given character, dishevelled after play; no surroundings", "hook": "Indian childhood seasons (summer mangoes, monsoon football)"},
    ["Line drawing of Rohan: a neat schoolboy with combed hair, tie, short-sleeved shirt, shorts, socks and laced shoes."], adapted=False)

add(2021, 2, "Creativity", "creativity", "Ten boxes, three themed", """
Building upon the visual elements given in the ten boxes, create recognizable images and give a title to each. Before you start, choose your own theme for each of the first three boxes and write it above that box; those three images must follow their themes.

*The published paper shows only the first of the ten boxes (below); the other boxes and the printed themes were in the answer booklet. Use this box's elements as the starting point for each of your ten images.*
""", ["Use only BLACK pencil/pen", "Draw only within the boundaries of the boxes", "Write your own theme above each of the first three boxes"],
    even("Originality of ideas", "Diversity of ideas", "Clarity of sketches", "Neatness of sketches"),
    {"object": "titled images", "twist": "complete given abstract marks; choose three themes"},
    ["A square box containing a V of two straight lines meeting at a vertical line near the top, a small arc in the middle, and a quarter circle in the bottom-right corner, with a title line below."])

add(2021, 3, "Visual Sensitivity", "visual", "Rural hospital ward icons", """
A rural hospital uses the following icon system to depict Male, Female, Cardiology, Casualty, Ophthalmology and Neurology.

The hospital then decides to expand, and opens four new wards which are as follows:

- COVID-19 Isolation Ward
- Cancer Ward
- Paediatric (Children) Ward
- Maternity Ward

Create icons for these four wards. All icons should follow the same visual language. Draw the icons in squares provided in the answer booklet.
""", ["Use only BLACK colour", "Draw the icons in squares"],
    even("Consistency with given examples", "Composition", "Clarity of communication"),
    {"user": "patients (women, children)", "setting": "rural hospital", "object": "icon set", "twist": "extend an existing icon system", "hook": "pandemic; rural healthcare"},
    ["Six bold black pictograms in rounded squares: a man, a woman in a sari, a torso with a heart (cardiology), a bandaged figure (casualty), a head with a large eye (ophthalmology), and a head showing the brain (neurology)."], adapted=False)

add(2021, 4, "Form sensitivity", "form", "Lunch box to match a kid's bottle", """
Image of a kid's water bottle is shown below. Visualise a lunch box to pair with it. It should be matching in design language with relevant details. Sketch and render the bottle and the lunch box with required graphics.
""", [],
    even("Originality in the form of the lunch box, and its proportion", "Visual consistency with the form of the water bottle", "Relevant details for the lunch box", "Surface shading", "Quality of line/strokes"),
    {"user": "child", "setting": "school", "object": "lunch box", "twist": "companion product to a given product"},
    ["Photo of a child's water bottle: pink flip cap with a carry ring, translucent white body printed with pink bubble circles."], adapted=False)

add(2021, 5, "Problem identification", "problem-id", "School wash basin and infection", """
Shown below is a picture of a wash basin in a primary school.

In the space provided in the answer booklet, list down ten various problems related to the possibility of a viral infection like COVID-19 spreading in the school. (5 marks)

Identify three problems that you consider to be the most important and clearly illustrate them. (3 × 5 marks)
""", [],
    even("Quality and diversity of your observation", "Analytical skills", "Communication"),
    {"user": "children", "setting": "primary school", "object": "wash basin", "hook": "pandemic hygiene"},
    ["Photo of an outdoor concrete wash basin at a school, with a row of taps on a white tank, a bucket below, and trees behind."], adapted=False)

add(2022, 1, "Sketching", "sketching", "The swab test moment", """
A sample is being collected for an RT-PCR swab test for COVID-19. The man collecting the sample is standing in a PPE (protective) suit. The lady who is being tested is sitting on a chair in front of him. She shows uneasiness through her facial expression when a swab is inserted in her nose.

Draw a free-hand sketch of the moment described above. Drawing of surroundings is not necessary.
""", ["Free-hand sketch", "Surroundings are not necessary"],
    even("Quality of composition", "Observation and drawing skills", "Expression of the person being tested", "Scale and relative proportions", "Use of light and shade"),
    {"user": "woman; health worker", "setting": "clinic", "object": "two-figure scene", "twist": "render discomfort", "hook": "pandemic"},
    adapted=False)

add(2022, 3, "Visual Sensitivity", "visual", "Mela icons", """
Create visual icons in the boxes given, for the following in an Indian mela (fair/exhibition):

1. Information Desk
2. Craft zone
3. Children zone
4. Game zone
""", ["Draw the icons in the boxes given"],
    even("Aesthetics of 2D form", "Effectiveness to convey meaning", "Consistency of visual language (style)", "Composition"),
    {"user": "visitors, children", "setting": "mela (fair)", "object": "icon set", "hook": "Indian culture (mela, crafts)"},
    adapted=False)

add(2022, 4, "Form sensitivity", "form", "Electric iron from a building", """
Three views of a building are shown below. Visualise the form of an electric iron (for ironing clothes) based on the image(s) of the given building. It should match the design language with relevant details. Sketch and render the form of the electric iron.
""", [],
    even("Sensitivity towards form", "Consistency with the visual language of the form", "Relevant details of the iron", "Surface shading", "Quality of lines/strokes"),
    {"user": "household", "setting": "home", "object": "electric iron", "twist": "borrow design language from architecture", "hook": "unnamed design-history reference (flowing white building)"},
    ["Three photos of one flowing white building: smooth continuous curved shells rising into peaks and folding into a glazed opening, shown from three angles."], adapted=False)

add(2022, 5, "Problem identification", "problem-id", "General compartment boarding", """
Getting into the general compartment of a long-distance train is not a pleasant experience, especially for women, children, elderly and the disabled. The photo depicts one such scene.

In the space provided in the answer booklet, list TEN unique design problems or opportunities in this situation. Each problem or opportunity could be based on either what you can observe in the photo or your experiences as a passenger. Each problem or opportunity should have potential for a design solution. For example, large crowds or less availability of seats are not design problems. (10 marks)

Within the space provided clearly illustrate TWO design problems or opportunities that you consider to be the most important. (2 × 5 marks)

Focus on depicting problems and opportunities. **DO NOT provide solutions.**
""", ["Do not provide solutions", "Large crowds or fewer seats are not design problems"],
    even("Severity of the identified problems", "Diversity of observations", "Analytical skills", "Communication"),
    {"user": "women, children, elderly, disabled", "setting": "railway general compartment", "object": "boarding scene", "twist": "no solutions allowed", "hook": "Indian Railways; inclusive design"},
    ["Photo of a dense crowd of passengers with bags pushing to board the door of a blue general-class railway coach."], adapted=False)

add(2023, 1, "Sketching", "sketching", "Family selfie from the ceiling camera", """
Mr. Singh (5 feet 11 inches tall) is smiling and capturing a selfie of his entire family with his mobile phone held vertically. He is with his wife (5 feet tall), standing towards his left with her two mischievous kids. Pinky (girl) and Bablu (boy) are making funny expressions looking into the mobile. They all are standing facing a digital camera installed in the top corner of the room. The size of the room is 12 × 12 × 12 feet.

Draw the picture of the above description from the point of view of a digital camera capturing this moment.
""", ["Use only pencils", "Do not illustrate the surroundings. Only draw the family"],
    even("Imagination", "Overall composition of the picture", "Quality of lines", "Attention to details", "Anatomy and perspective"),
    {"user": "family with children", "setting": "home (room)", "object": "figure group", "pov": "camera in the top corner of the room", "twist": "high-angle camera view", "hook": "smartphone selfie"},
    adapted=False)

add(2023, 2, "Creativity", "creativity", "Boxes with a title's first word", """
Each of the boxes in the answer script shows some visual elements and the FIRST word for a title of the image. Draw recognizable images by interpreting the visual elements and give a title to the images using the given first word.
""", ["Use only BLACK pencil/pen", "Draw only within the boundaries of the boxes", "Each title must start with the given first word"],
    even("Uniqueness: ability to create unusual images", "Diversity: variation between the created images", "Clarity: effective use of the visual elements and title", "Fun: ability to use humour and surprise in the images and title"),
    {"object": "titled images", "twist": "title's first word is fixed"},
    ["Four rounded boxes, each with one small outline element and a title's first word: a narrow bottle-like shape (Walk), a keyhole-like loop (Pull), a small house outline (Cover), and a bell-shaped lamp (See)."], adapted=False)

add(2023, 3, "Visual Sensitivity", "visual", "IWHA identity", """
Create a new visual identity for Indian Women's Hockey Association. The identity has to be original and should have the abbreviation 'IWHA' as part of the visual design. DO NOT draw from any existing designs.
""", ["Include 'IWHA' in the design", "Do not draw from any existing designs"],
    even("Creative visual representation", "Effective communication of the concept", "Visual aesthetics", "Composition"),
    {"user": "women athletes", "setting": "sport", "object": "visual identity", "hook": "women's sport in India"},
    adapted=False)

add(2023, 4, "Form sensitivity", "form", "Children's cutlery from an abstract form", """
An abstract three-dimensional form is shown below. Visualise the form of a cutlery set (fork, bowl and glass) for 3–6 year old children based on the image of the given form. It should match the design language with relevant details. Sketch and render the form of the cutlery set.
""", [],
    even("Consistency with the visual language of the form", "Form should complement function", "Relevant details of the product", "Surface shading", "Quality of lines/strokes"),
    {"user": "children aged 3–6", "setting": "home dining", "object": "cutlery set", "twist": "derive product from an abstract sculpture"},
    ["Photo of a smooth white abstract sculpture made of swelling, bulbous lobes, on a wooden plinth against a black background."], adapted=False)

add(2023, 5, "Problem identification", "problem-id", "Bus stop at rush hour", """
Shown in the image is an example of a bus stop during the busy hours.

Draw and annotate FIVE distinct design problems in this context.
""", ["Use only one visual for each problem", "Answer in the given space only"],
    even("Severity of the identified problem", "Ability to make distinct observations", "Ability to communicate through visuals"),
    {"user": "commuters", "setting": "urban bus stop", "object": "bus stop scene", "hook": "urban India"},
    ["High-angle photo of a crowded city bus stop: a shelter with a few seats and an advertising panel, commuters spilling onto the road, a vendor cart behind."], adapted=False)

add(2024, 1, "Sketching", "sketching", "Chinnu's carton, four frames", """
7-year-old Chinnu has collected all her old toys in a carton. The carton weighs around 2 kg. Draw Chinnu lifting the box and keeping it in the top shelf of her cupboard in 4 frames.
""", ["Use only pencils", "Do not use colours", "Four frames"],
    even("Humour", "Expressions", "Body language", "Anticipation and exaggeration"),
    {"user": "child (girl)", "setting": "home bedroom", "object": "action sequence", "twist": "four-frame sequence with animation principles"},
    adapted=False)

add(2024, 2, "Creativity", "creativity", "Head as a cube", """
Imagine the human head as a cube. With this scenario, illustrate the following interactions inside the given boxes in this order:

1. Human–human
2. Human–animal
3. Human–environment
4. Human–object

Write the titles below the boxes, in the space provided.
""", ["Use only BLACK pencil/pen", "Draw only within the boundaries of the boxes", "Keep the given order"],
    even("Uniqueness: ability to create unusual images", "Diversity: variation between each created image", "Clarity: effective use of visual elements and titles", "Fun: ability to use humour and surprise in the images and titles"),
    {"object": "titled images", "twist": "premise transformation (head is a cube)"},
    adapted=False)

add(2024, 3, "Visual Sensitivity", "visual", "'Forest' in an ornamental font", """
Shown below are two letters A and B of an ornamental font. Using this font style create the word 'Forest' (the first letter in uppercase and the remaining in lowercase).
""", ["First letter uppercase, the rest lowercase"],
    even("Consistency in visual characteristics", "Font anatomy", "Proportion", "Rendering skills"),
    {"object": "lettering", "twist": "extrapolate a font from two letters", "hook": "type design"},
    ["Two ornamental capital letters, A and B, in outline with a drop shadow, scroll curls at the feet and a column of swirl ornaments inside the stems."], adapted=False)

add(2024, 4, "Form sensitivity", "form", "Living-room seat from a torus", """
Inspired from the given three-dimensional form, conceptualise, sketch, and render a single seater furniture for a living room.
""", [],
    even("Consistency with the visual language of the form", "Form should complement function", "Relevant details of the product", "Surface shading", "Quality of lines/strokes"),
    {"user": "general", "setting": "living room", "object": "single-seat furniture", "twist": "derive product from a primitive (torus)"},
    ["Grey shaded rendering of a torus (a ring doughnut shape) seen from slightly above."], adapted=False)

add(2024, 5, "Problem identification", "problem-id", "Rural kitchen", """
Shown below is the image of a rural kitchen. There are many challenges in using such a setup for cooking and related activities.

Draw and annotate FIVE distinct design problems in this context.
""", ["Use only one visual for each problem", "Answer in the given space only", "Adhere to no more than 5 problems"],
    even("Significance of the identified problems", "Ability to identify unique problems", "Ability to explain the problem through visuals"),
    {"user": "rural household", "setting": "rural kitchen", "object": "mud stove (chulha) setup", "hook": "rural India"},
    ["Photo of a rural mud stove at floor level with a wood fire burning, blackened pots on top, firewood and sacks scattered around."], adapted=False)

add(2025, 1, "Sketching", "sketching", "Bear chase from the fox's view", """
Two kids, Kaa and Kii, are on an adventure trip in a forest. While exploring, suddenly a bear emerges and starts chasing them. The kids start running in panic through the forest. A fox is watching the whole scene. Sketch this scene from the fox's point of view. The sketch should be clear and visible.
""", ["Use only black/HB-series pencils", "Do not use other colours", "Draw only in the given space"],
    even("Character and expressions", "Proportion and composition", "Quality of sketching", "Environment and props"),
    {"user": "children; animals", "setting": "forest", "object": "scene", "pov": "a fox watching (low, hidden)", "twist": "animal point of view"},
    adapted=False)

add(2025, 2, "Creativity", "creativity", "Bulb, tap, mosquito panorama", """
Shown below is a canvas with four frames containing certain elements. Create a meaningful sequence of visuals using the elements in the frames. Ensure that continuity is maintained across the frames by using additional prop(s) and/or character(s) as needed. You may choose to create the sequence either from left to right or right to left, but indicate the direction using an arrow. Give an appropriate title in the space provided.
""", ["Mark the reading direction with an arrow", "Give a title"],
    even("Imagination and creative ideas", "Composition", "Drawing quality and clarity", "Continuity in the sequence"),
    {"setting": "home (implied)", "object": "four-frame sequence", "twist": "fixed elements; choose reading direction", "hook": "everyday hazards (mosquito, water)"},
    ["A curved panoramic canvas split into four frames by dotted lines: a hanging light bulb top-left in frame 1, a water tap on the line between frames 2 and 3, and a mosquito at the right edge of frame 4."], adapted=False)

add(2025, 3, "Visual Sensitivity", "visual", "Zoo enclosure icons", """
Shown below are new animals that have been acquired by an Indian zoo.

- A. Indian Grey Mongoose
- B. Honey Badger
- C. Indian Bison
- D. Indian Pangolin

The zoo wishes to create a signage to guide visitors around the enclosures of these animals. Create four icons to indicate the animal in the enclosure. All icons should be clear and visible, and have a consistent visual language. Draw the icons in the FOUR squares provided in the answer booklet.
""", ["Use only BLACK colour", "Draw the icons in the four squares"],
    even("Consistency in the visual language", "Representation of the animals", "Visual composition", "Clarity and neatness"),
    {"user": "zoo visitors", "setting": "zoo", "object": "icon set", "hook": "Indian wildlife"},
    ["Four labelled wildlife photos: A, an Indian grey mongoose; B, a honey badger; C, an Indian bison (gaur); D, an Indian pangolin."], adapted=False)

add(2025, 4, "Form sensitivity", "form", "Character tea flask", """
Shown on the left is a character-based design of a product. Inspired from this product, re-imagine, conceptualise, and render the tea flask given on the right. Make it clear and visible.
""", [],
    even("Characterization of the product", "Relevant details and usability", "Quality of sketching", "Surface shading/rendering"),
    {"user": "general", "setting": "home", "object": "tea flask", "twist": "anthropomorphic redesign", "hook": "unnamed design-history reference (character corkscrew)"},
    ["Left: a corkscrew designed as a smiling figure with a round chrome face, a black flared body and two lever arms. Right: a stainless-steel tea flask with a black lid and handle."], adapted=False)

add(2025, 5, "Problem identification", "problem-id", "Vegetable cart, buyer and seller", """
A typical vegetable cart, as seen in India, is shown below.

**A.** Identify and list FIVE distinct problems from a buyer's point of view and FIVE distinct problems from a seller's point of view in this context. List the problems only in the given space. (5 + 5 marks)

**B.** From the above-listed problems, draw and visually explain any ONE problem of the buyers, and any ONE problem of the sellers in the given boxes. (5 + 5 marks)
""", ["Do not limit yourself to the buyer and seller in the given image", "Write the identified problems only on the dotted lines",
      "Draw and visually explain the listed problems only in the given boxes"],
    even("Ability to identify unique and relevant problems in the given context", "Severity of the problems identified", "Ability to communicate problems through visuals", "Presentation, clarity and neatness"),
    {"user": "vendor and buyer", "setting": "street market", "object": "vegetable cart", "pov": "buyer and seller", "twist": "two stakeholder points of view", "hook": "Indian street commerce"},
    ["Photo of a wooden push-cart with bicycle wheels piled with vegetables and fruit; a vendor stands behind it and a child in red reaches up to it."], adapted=False)

add(2026, 1, "Sketching", "sketching", "Kitchen snack time from a chair", """
One afternoon, seven years old Chinu and her pet dog are enjoying snacks in their kitchen. Chinu's father suddenly enters the kitchen and sees this pleasant moment with a smile.

Sketch the whole scene from the point of view of a chair kept nearby.
""", ["Use only black/HB-series pencils", "Do not use other colours", "Draw only in the given space"],
    even("Character and expressions", "Proportion and composition", "Quality of sketching", "Environment and props"),
    {"user": "child, pet dog, parent", "setting": "home kitchen", "object": "scene", "pov": "a chair kept nearby", "twist": "inanimate-object point of view"},
    adapted=False)

add(2026, 2, "Creativity", "creativity", "Twelve symbols, four frames", """
In the given frames, sketch a story by incorporating the symbols shown below. Follow these instructions:

- Give an appropriate title to the story.
- Use ANY TWO symbols in each frame; use each symbol ONLY ONCE in the whole story.
- The symbols cannot be modified, but can be rotated, flipped or scaled proportionately.
- You are free to sketch additional elements (backgrounds, characters, props etc.) to make the story meaningful.
- Label the frames in the bottom left corners with the number 1, 2, 3 and 4 to indicate the sequence of your story.
""", ["Any two symbols per frame; each symbol once", "Symbols may be rotated, flipped or scaled, not modified", "Number the frames 1–4 in the bottom-left corners"],
    even("Originality", "Graphical narrative (story communication)", "Humour and surprise", "Clarity and neatness of sketches"),
    {"object": "four-frame story", "twist": "fixed symbol-use rules"},
    ["Twelve solid black symbols in two rows: ant, scissors, signal waves, megaphone, alarm clock, wrench; clapperboard, surprised face, magnifying glass, aeroplane, cactus, kick-scooter."], adapted=False)

add(2026, 3, "Visual sensitivity", "visual", "Museum of Science icons", """
A new museum with the theme "Indian Museum of Science" is being set up, which will cater primarily to Indian visitors. Create four icons based on the museum theme, to communicate the following sections to visitors:

- Robotics
- Energy Science
- Ocean Science
- Food Technology

All icons should be clear and visible, and have a consistent visual language. Draw the icons in the FOUR squares provided in the answer booklet.
""", ["Icons should only have visuals. DO NOT use text", "Only BLACK & WHITE colours"],
    even("Consistency of visual language", "Thematic appropriateness", "Effective communication", "Composition, clarity and neatness"),
    {"user": "Indian visitors", "setting": "science museum", "object": "icon set", "hook": "science and technology"},
    adapted=False)

add(2026, 4, "Form sensitivity", "form", "Living-room seat from a sphere", """
Conceptualise and render a usable single seat furniture that is inspired by a sphere, for a living room. The sphere may be modified by cutting, adding, subtracting, deforming and repeating. However, the essence of the sphere should be retained.
""", ["Keep the essence of the sphere"],
    even("Uniqueness of the form", "Form–function relevance and relationship", "Detailing", "Rendering quality"),
    {"user": "general", "setting": "living room", "object": "single-seat furniture", "twist": "primitive with allowed operations (cut, add, subtract, deform, repeat)"},
    adapted=False)

add(2026, 5, "Problem identification", "problem-id", "Srinagar to Chennai, elderly couple", """
An elderly couple from Srinagar is travelling to Chennai for medical treatment. They will travel by train for most of their journey and plan to take a bus and auto rickshaws for all local commutes.

Imagine their journey and identify FOUR distinct problems that they might face, which may need design solutions.

Write the FOUR problem statements starting with the words "How can we…" for the given context. (2 × 4 = 8 marks)

For your reference, an example of "How can we…" from another context: *How can we make science learning enjoyable for primary school children?*

Select any ONE of the four identified problem statements. Draw TWO potential design solutions for the selected problem statement. Write a short title for each solution. (6 × 2 = 12 marks)
""", ["Problem statements start with \"How can we…\""],
    # 8 marks for the statements, 12 for the solutions: the two problem criteria carry the 8.
    [{"name": "Variety and uniqueness of the problems", "marks": 4}, {"name": "Relevance of the problems", "marks": 4},
     {"name": "Practical feasibility of the design solutions", "marks": 6}, {"name": "Clarity in communication", "marks": 6}],
    {"user": "elderly couple", "setting": "long-distance train, bus and auto-rickshaw", "object": "journey", "twist": "How-can-we statements, then two solutions", "hook": "travel for medical care; India north to south"},
    adapted=False)

# =====================================================================
# 2010–2019: adapted to today's slots
# =====================================================================

# ---------- 2010 ----------
add(2010, 1, "Visual Perception and Design Sensitivity (1.5)", "visual", "Angry shoe, friendly shoe", """
Below is an image of a pair of shoes. Redraw the pair large on your sheet and colour the shoes to depict two expressions: **Angry** on the left shoe and **Friendly** on the right shoe.

Keep the basic form of each shoe as given. Use colour, pattern and surface graphics to carry each expression.
""", ["Keep the given shoe forms", "Colour allowed"],
    even("Thematic appropriateness of colour and graphics", "Effective communication of each expression", "Consistency with the given shoe form", "Composition, clarity and neatness"),
    {"object": "pair of shoes", "twist": "emotion through colour alone", "hook": "colour and emotion"},
    ["Line drawing of a pair of ankle boots with laces; the left one is labelled Angry and the right one Friendly."])

add(2010, 2, "Drawing Abilities and Skills", "sketching", "Rubber cup, glass saucer, wooden spoon", """
Illustrate in perspective a composition with a **cup**, a **saucer** and a **spoon** placed on a flat surface. The cup is made of rubber, the saucer is made of glass and the spoon is made of wood.
""", ["Freehand, black pencil only", "Do not use drawing instruments"],
    marks(("Composition and correctness of perspective", 5), ("Quality of surface representation through shading", 5), ("Quality of lines", 5), ("Correctness of relative proportions", 5)),
    {"setting": "tabletop", "object": "cup, saucer and spoon", "twist": "unexpected material for each object"})

add(2010, 3, "Creativity I", "creativity", "Five uses for discarded CDs", """
Imagine five distinct uses of discarded compact discs (CDs). The CDs can be cut, bent, pasted or used in multiples to execute your ideas.

Represent your ideas with five neat sketches, with a brief note for each if necessary.
""", ["Five sketches with brief notes"],
    even("Originality of ideas", "Diversity of ideas", "Humour and surprise", "Clarity and neatness of sketches"),
    {"object": "discarded CDs", "twist": "cut, bend, paste or multiply", "hook": "reuse"})

add(2010, 4, "Problem Identification and Analysis (A)", "problem-id", "Pressure cooker problems", hmw(
    "Below is an image of a pressure cooker commonly used in Indian households.",
    "Imagine someone cooking a meal with it, from filling it to opening it and washing it. Identify FOUR distinct problems from the users' point of view that may need design solutions."),
    HMW_RULES, HMW_CRIT,
    {"user": "household cook", "setting": "home kitchen", "object": "pressure cooker", "pov": "users", "twist": "How-can-we statements, then two solutions", "hook": "Indian kitchen"},
    ["Photo of an aluminium pressure cooker with a long black handle, a lid and a weighted whistle on top."], suffix="a")

add(2010, 4, "Problem Identification and Analysis (B)", "problem-id", "Railway platform communication", hmw(
    "Below is an image of a typical railway platform in India.",
    "Imagine a passenger arriving to catch a train: finding the platform, the coach position, the train's status and the exit. Identify FOUR distinct **communication design** problems they might face."),
    ["Communication design problems only", *HMW_RULES], HMW_CRIT,
    {"user": "rail commuters", "setting": "railway platform", "object": "signage and wayfinding", "pov": "users", "twist": "communication problems only", "hook": "Indian Railways"},
    ["Black-and-white photo of a long Indian railway platform under a steel roof, with hanging bilingual signboards, a book stall sign, waiting passengers and a train alongside."], suffix="b")

add(2010, 5, "Creativity II", "creativity", "Cone, three discs and a wire", """
You have at your disposal five objects: **1 cone, 3 discs and 1 flexible wire**, as shown below.

Imagine five interesting products made out of a combination of all five objects. You can scale the objects to any size or dimension. Represent your ideas with neat sketches, name each product and add a brief note if necessary.
""", ["Use all five objects in every product", "Name each product"],
    even("Originality of ideas", "Diversity of ideas", "Humour and surprise", "Clarity and neatness of sketches"),
    {"object": "products from primitives", "twist": "use all five objects every time"},
    ["Outline drawing of a cone, three discs of different orientations and a long curved flexible wire."])

add(2010, 6, "Design Problem Solving: Product Design / Interaction Design (A)", "problem-id", "Scissors for the blind", hmw(
    "People who are fully blind use a pair of scissors every day: to cut milk and oil pouches, cloth, thread and paper.",
    "Imagine a blind person at home using an ordinary pair of scissors, from finding it to putting it away. Identify FOUR distinct problems they might face that may need design solutions."),
    HMW_RULES, HMW_CRIT,
    {"user": "blind people", "setting": "home", "object": "scissors", "twist": "user cannot see the tool", "hook": "accessibility"}, suffix="a")

add(2010, 6, "Design Problem Solving: Communication Design (B)", "visual", "Flu awareness poster for schools", """
Influenza A (H1N1), also known as swine flu, is contagious and spreads rapidly.

Design one poster for school children that makes them aware of the flu and of how to stop it spreading: covering a cough or sneeze, washing hands, staying home when ill. Build the poster around a symbol you design for the disease. Use as little text as possible.
""", ["Colours allowed if necessary", "Minimal text"],
    even("Effectiveness of the symbol", "Clarity of the message for children", "Thematic appropriateness", "Composition, clarity and neatness"),
    {"user": "school children", "setting": "school", "object": "awareness poster", "twist": "built around your own symbol", "hook": "public health"}, suffix="b")

# ---------- 2011 ----------
add(2011, 1, "Visual Perception and Design Sensitivity (1.4)", "creativity", "Four forms from one line", """
Below is a line. Visualise and illustrate **four different forms** by making use of the line. An example is shown next to it.

Draw each form in its own box and give it a title.
""", ["Use the given line in every form", "Title each form"],
    even("Originality of ideas", "Diversity of ideas", "Humour and surprise", "Clarity and neatness of sketches"),
    {"object": "titled images", "twist": "build from one given line"},
    ["A box showing a single smooth S-curved line on the left, labelled Line, and on the right the same curve turned into a looping spring-like garland, labelled Example."], suffix="a")

add(2011, 1, "Visual Perception and Design Sensitivity (1.7)", "visual", "Masculine car, feminine car", """
Below are two images of the same car. Redraw them large on your sheet and use a minimum of two colours on each car to depict two expressions: **Masculine** and **Feminine**.

Keep the car's form as given; carry each expression through colour, pattern and graphics.
""", ["At least two colours per car", "Keep the given car form"],
    even("Thematic appropriateness of colour and graphics", "Effective communication of each expression", "Consistency with the given car form", "Composition, clarity and neatness"),
    {"object": "car", "twist": "character through colour alone", "hook": "colour and gender coding"},
    ["Two identical outline drawings of a rounded vintage hatchback car, labelled Masculine and Feminine."], suffix="b")

add(2011, 2, "Drawing Abilities and Skills", "sketching", "Open book under a lit lamp", """
Illustrate in perspective a composition of an **open book** and a **table lamp, with the light switched on**, placed on a flat surface.
""", ["Freehand, black pencils only", "Do not use drawing instruments or colour pencils"],
    marks(("Composition and correctness of perspective", 5), ("Correctness of light and shadow", 5), ("Quality of lines", 5), ("Correctness of relative proportions", 5)),
    {"setting": "tabletop", "object": "book and table lamp", "twist": "the lamp is the light source"})

add(2011, 3, "Creativity", "creativity", "Eight primitives, five products", """
The following objects are available to you: **2 hemispheres, 2 cubes, 2 cylinders and 2 wires** (flexible rods), as shown below.

Imagine five interesting products made out of a combination of all 8 objects. You can scale the objects to any size or dimension. Represent your ideas with neat sketches, name each product and add a brief note if necessary.
""", ["Use all eight objects in every product", "Name each product"],
    even("Originality of ideas", "Diversity of ideas", "Humour and surprise", "Clarity and neatness of sketches"),
    {"object": "products from primitives", "twist": "use all eight objects every time"},
    ["Outline drawing in a box: two hemispheres, two cubes, two cylinders and two long wavy wires."])

add(2011, 4, "Problem Identification and Analysis", "problem-id", "Bus stop problems", hmw(
    "Below is an image of a typical bus stop in India.",
    "Imagine the people who wait here through a day: office-goers, a mother with a child, an elderly man, someone in the rain. Identify FOUR distinct problems from the users' point of view that may need design solutions."),
    HMW_RULES, HMW_CRIT,
    {"user": "commuters", "setting": "city bus stop", "object": "bus shelter", "pov": "users", "twist": "How-can-we statements, then two solutions", "hook": "urban India"},
    ["Black-and-white photo of a roadside bus shelter covered in large advertising hoardings, with people sitting and standing under it and one holding an umbrella."])

add(2011, 5, "Design Problem Solving: Product Design (A)", "problem-id", "Mobile phone for the elderly", hmw(
    "Mobile phones have great potential to address the special needs of the elderly, yet many older people struggle with them.",
    "Imagine a day in the life of a 75-year-old using an ordinary smartphone: calls, medicine reminders, payments, photos from family. Identify FOUR distinct problems they might face that may need design solutions."),
    HMW_RULES, HMW_CRIT,
    {"user": "elderly", "object": "mobile phone", "twist": "How-can-we statements, then two solutions", "hook": "accessibility; technology"}, suffix="a")

add(2011, 5, "Design Problem Solving: Communication Design (B)", "visual", "Organic vegetable drink label", """
A new business is launching a health drink made from organically grown vegetables. Name the brand yourself.

Design the front label of its one-litre pack. Letter the brand name as a logo, and make the drink's vegetable origin clear at a glance from a shop shelf.
""", ["Colours allowed if necessary", "Name the brand yourself"],
    even("Originality of the brand mark", "Appropriateness to the product and its buyers", "Effective communication on the shelf", "Composition, clarity and neatness"),
    {"user": "consumers", "setting": "market shelf", "object": "pack label with logo", "hook": "organic food"}, suffix="b")

add(2011, 5, "Design Problem Solving: Animation Design (C)", "creativity", "Tiger, sparrow and the poacher", """
The tiger and the sparrow are endangered species in our country, and their protection needs attention.

Create a comic strip in four frames involving a **tiger**, a **sparrow** and a **poacher** (a person who captures animals by laying a trap). Let the last frame turn the story. Give the strip a title and number the frames 1–4.
""", ["Tiger, sparrow and poacher all appear", *STORY_RULES],
    STORY_CRIT,
    {"user": "animals; poacher", "setting": "forest", "object": "four-frame comic", "twist": "three fixed characters", "hook": "wildlife conservation"}, suffix="c")

# ---------- 2012 ----------
add(2012, 1, "Drawing Ability (option 1)", "sketching", "Favourite car, three-quarter view", """
Draw your favourite car in proper perspective in **three-quarter view**. You may use shading to give a realistic three-dimensional feel.
""", PENCIL,
    even("Composition", "Perspective", "Light, shade and shadow", "Quality of lines"),
    {"object": "car", "pov": "three-quarter view"}, suffix="a")

add(2012, 1, "Drawing Ability (option 2)", "sketching", "Five-year-old on a chair", """
Draw a **5-year-old boy sitting on a chair**. You may use shading to give a realistic three-dimensional feel.
""", PENCIL,
    even("Composition", "Perspective", "Light, shade and shadow", "Quality of lines"),
    {"user": "child (boy)", "object": "figure on a chair"}, suffix="b")

add(2012, 2, "Design Problem Solving (A)", "problem-id", "Jar caps and the elderly", hmw(
    "Screw caps on glass jars of pickle and jam are often difficult for senior citizens to open.",
    "Imagine an elderly person at home taking out such a jar, opening it, serving from it and closing it again. Identify FOUR distinct problems they might face that may need design solutions."),
    HMW_RULES, HMW_CRIT,
    {"user": "elderly", "setting": "home kitchen", "object": "screw-cap jar", "twist": "How-can-we statements, then two solutions", "hook": "accessibility; Indian pickle jars"}, suffix="a")

add(2012, 2, "Design Problem Solving (B)", "visual", "Anti-corruption awareness poster", """
Bribes asked for everyday public services hurt common people. It is a social responsibility of a designer to create awareness of this issue through visual media.

Design one anti-corruption awareness poster, to hang in a public office waiting area, that captures the essence of the issue. Use graphics, text or both.
""", ["Colours allowed if necessary"],
    even("Originality of the visual idea", "Clarity of the message", "Appropriateness to the place and audience", "Composition, clarity and neatness"),
    {"user": "general public", "setting": "public office", "object": "awareness poster", "hook": "civic awareness"}, suffix="b")

add(2012, 2, "Design Problem Solving (C)", "creativity", "Dengue mosquito comic", """
Dengue fever claiming human lives is becoming a concern. Create an imaginary **female mosquito character** who spreads dengue fever, and tell her story as a comic strip in four frames. You may add characters to complement the story.

Let the last frame turn the story. Give the strip a title and number the frames 1–4.
""", ["Colours allowed if necessary", *STORY_RULES],
    STORY_CRIT,
    {"user": "mosquito character; people", "object": "four-frame comic", "twist": "the villain is the hero of the strip", "hook": "public health"}, suffix="c")

# ---------- 2013 ----------
add(2013, 1, "Part B Mandatory", "sketching", "Apple and bananas on a plate", """
Create a freehand sketch of an **apple** and a **bunch of six bananas** placed on a dinner plate. You may use shading to create a realistic three-dimensional feel.
""", PENCIL,
    even("Perspective and three-dimensional quality", "Light, shade and shadow", "Quality of lines", "Composition"),
    {"setting": "tabletop", "object": "fruit on a plate"})

add(2013, 2, "Part B Mandatory", "creativity", "Invisibility spray", """
You are given a special magic liquid. You can make anything invisible by spraying this liquid on it. Describe five instances where you will use this liquid in your daily life.

Use a sketch and a brief note (less than 20 words) to describe each answer.
""", ["Notes under 20 words each"],
    even("Originality of ideas", "Ability to imagine", "Sense of humour", "Clarity and neatness of sketches"),
    {"object": "magic liquid", "twist": "anything sprayed turns invisible", "hook": "daily life"})

add(2013, 3, "Part B Mandatory", "problem-id", "College canteen problems", """
Below is an image of a college canteen in India. Identify five problems in this scenario.

- Describe each problem briefly (in less than 20 words).
- Illustrate the two problems you consider most important.

Do not suggest solutions.
""", ["Problem descriptions under 20 words each", "Do not suggest solutions"],
    even("Identification of unique problems", "Ability to understand the problems", "Design sensitivity", "Ability to communicate through visuals"),
    {"user": "students", "setting": "college canteen", "object": "canteen interior", "twist": "no solutions allowed", "hook": "Indian everyday"},
    ["Photo of a college canteen interior: a service counter, a red soft-drink cooler, food posters on the wall, plastic chairs and a few people at the counter."])

add(2013, 4, "Part B Optional (Product Design)", "problem-id", "Mopping into the corners", hmw(
    "Mopping floors is one of the tedious daily household chores. A normal mop cannot reach the crevices or the space under furniture.",
    "Imagine someone mopping a two-room home with an ordinary mop and bucket, from filling the bucket to drying the mop. Identify FOUR distinct problems they might face that may need design solutions."),
    ["Solutions must be manually operated", *HMW_RULES], HMW_CRIT,
    {"user": "homemaker", "setting": "home", "object": "floor mop", "twist": "How-can-we statements, then two solutions", "hook": "domestic chores"}, suffix="a")

add(2013, 4, "Part B Optional (Visual Communication)", "visual", "Text-free medicine instructions", """
The following instructions are to be printed on a medicine packet. Represent them visually **without using any text**:

1. One tablet before breakfast at 7:00 AM.
2. One tablet after lunch at 2:00 PM.
3. One and a half tablets after dinner at 9:00 PM.
4. Not to be taken by pregnant women.

The packet is 50 mm high, 200 mm wide and 50 mm deep. Your final artwork (all four visuals together) should fit within 40 mm × 160 mm. Draw it at twice that size, 80 mm × 320 mm.
""", ["No text in the visuals", "All four visuals in one 40 mm × 160 mm band, drawn at twice the size"],
    even("Ability to communicate clearly using visuals without text", "Consistency of visual language", "Quality of renderings", "Overall effectiveness of the final design solution"),
    {"user": "patients, pregnant women", "setting": "pharmacy pack", "object": "pictogram set", "twist": "no text, fixed size", "hook": "health literacy"}, suffix="b")

add(2013, 4, "Part B Optional (Animation Design)", "creativity", "Autobiography of a crow", """
The crow is the most common bird we get to see in India, and it carries many deep-rooted associations in Indian society.

Imagine that you are a crow. Tell your autobiography as a comic strip in four frames, keeping the crow's look the same in every frame. Let the last frame turn the story. Give the strip a title and number the frames 1–4.
""", ["Keep the crow consistent", *STORY_RULES],
    STORY_CRIT,
    {"user": "crow", "object": "four-frame story", "pov": "first person, as the crow", "twist": "you are the crow", "hook": "Indian culture"}, suffix="c")

# ---------- 2014 ----------
add(2014, 1, "Sketching (option 1)", "sketching", "Opening the fridge", """
Draw a freehand perspective drawing of **a person opening the refrigerator door in the kitchen**.
""", PENCIL,
    even("Abilities in perspective drawing", "Light, shade and shadow", "Quality of lines", "Sense of scale, proportion and composition"),
    {"setting": "home kitchen", "object": "figure with refrigerator"}, suffix="a")

add(2014, 1, "Sketching (option 2)", "sketching", "Person beside a parked scooter", """
Draw a freehand perspective drawing of **a person standing next to a scooter parked on the street**.
""", PENCIL,
    even("Abilities in perspective drawing", "Light, shade and shadow", "Quality of lines", "Sense of scale, proportion and composition"),
    {"setting": "street", "object": "figure with scooter", "hook": "Indian street"}, suffix="b")

add(2014, 2, "Creativity and Imagination", "creativity", "The club house incident", """
The illustration below is an artist's impression of an incident in a club house. Narrate the incident based on your creative imagination.

- Write the incident in less than 100 words.
- Sketch two frames: the moment just before this scene and the moment just after it.
""", ["Narrative in less than 100 words", "Two sketched frames"],
    even("Originality of the narrative", "Imagination and ideation", "Storytelling ability", "Clarity and neatness of sketches"),
    {"setting": "social interior", "object": "busy illustration", "twist": "invent what happened", "hook": "Indian social scene"},
    ["Busy black-and-white line illustration of a crowded room: an older man seated in an armchair surrounded by men and women in saris, people at the doorways, a wall clock, a cat, potted plants and large pots on the floor."])

add(2014, 3, "Creativity", "creativity", "Umbrella out of season", """
Umbrellas are used mainly during the rainy season and usually remain unused during the rest of the year.

Creatively generate **four** alternative uses of the umbrella other than protection from rain or sunshine. Illustrate each idea as a sketch with a short description.
""", ["Not for rain or sun protection"],
    even("Originality of the ideas", "Creativity and innovation", "Imagination and ideation", "Clarity and neatness of sketches"),
    {"object": "umbrella", "twist": "idle object, new use", "hook": "monsoon season"})

add(2014, 4, "Part B Optional (Visual Communication and Interaction)", "visual", "Navrang Chitrapat ticket booking", """
Design a mobile-phone interface for booking tickets at **'Navrang Chitrapat'**, a movie theatre complex with 3 theatres, each screening a different film, three shows per day.

Draw THREE key screens in sequence:

1. Choose the film, date and show.
2. Choose seats, showing availability and price.
3. Confirmation of booking.

All three screens should share one consistent visual language.
""", ["Three screens in sequence", "One consistent visual language"],
    even("Usability and flow of the screens", "Structure and clarity of information", "Consistency of visual language", "Composition, clarity and neatness"),
    {"user": "moviegoers", "setting": "cinema", "object": "booking screens", "hook": "technology; Indian naming"})

add(2014, 5, "Part B Optional (Animation Design)", "sketching", "Bag-snatch on the platform", """
A woman is walking on a crowded railway platform as a train pulls in. A man comes up behind her, snatches her bag and runs towards the stairs to the overhead bridge. She shouts for help. A policeman standing near a vendor's cart gives chase and throws his baton at the thief's legs. The thief stumbles and comes crashing down on the platform. Two women standing by try to console the shocked woman.

Sketch the moment the thief comes crashing down, as seen by the woman from where she stands with the two women beside her.
""", SKETCH,
    SKETCH_CRIT,
    {"user": "commuters; policeman", "setting": "railway platform", "object": "scene", "pov": "the woman whose bag was snatched", "twist": "the victim's point of view", "hook": "Indian Railways"})

add(2014, 6, "Part B Optional (Product Design)", "form", "Roadside segregation bins from a cylinder", """
Roadside waste containers are often dirty, stinking and spilling over. Conceptualise and render a set of roadside bins for a public place that keeps four kinds of waste apart: packaging, dry organic waste, food waste and everything else.

Base the set on a **cylinder**. The cylinder may be cut, added to, subtracted from, deformed and repeated, but its essence should be retained. The bins must be rugged and easy to move for emptying.

Render the set in one large three-quarter view with a person for scale, and label the materials.
""", ["Keep the essence of the cylinder", "Four kinds of waste kept apart"],
    even("Uniqueness of the form", "Form–function relevance (segregation, hygiene, moving for emptying)", "Detailing and materials", "Rendering quality"),
    {"user": "public", "setting": "street", "object": "waste bins", "twist": "four-way segregation from one primitive", "hook": "sustainability; Indian conditions"})

# ---------- 2015 ----------
add(2015, 1, "Part B (mandatory)", "sketching", "Cookery-show pressure cooker", """
Imagine a scene from a cookery show. The chef has just placed a **pressure cooker on a two-burner gas stove**. Draw a freehand perspective drawing of this setup.
""", PENCIL,
    even("Perspective", "Light, shade and shadow", "Quality of lines", "Scale and proportion in the composition"),
    {"user": "chef", "setting": "TV kitchen set", "object": "pressure cooker on a gas stove", "hook": "Indian kitchen"})

add(2015, 2, "Part B (mandatory)", "creativity", "Half-size for three hours", """
You are given a handheld magic device that can reduce the size of any object by 50%. The reduction lasts only three hours. To reduce the size, point the device towards an object and press the button.

Illustrate **four** creative applications of this device. Support each with a brief note of no more than 50 words if required.
""", ["Notes no more than 50 words each"],
    even("Variety", "Creativity", "Innovation", "Clarity and neatness of sketches"),
    {"object": "magic device", "twist": "50% smaller for only three hours"})

add(2015, 3, "Part B (mandatory)", "creativity", "Five primitives, any three", """
The following objects are available to you: **1 cone, 1 hemisphere, 1 cuboid, 1 cylinder and 1 disc**, as shown below.

Imagine **four** interesting products, each made out of a combination of at least 3 of these objects. You can scale the objects to any size and dimension. Represent your ideas with neat sketches and name each product.
""", ["At least three objects per product", "Name each product"],
    even("Variety", "Creativity", "Innovation", "Clarity and neatness of sketches"),
    {"object": "products from primitives", "twist": "at least three of five objects"},
    ["Outline drawing of five primitives: a cuboid, a cylinder, a hemisphere bowl, a cone and a flat disc."])

add(2015, 4, "Part B (mandatory)", "creativity", "Cobbler, football, footpath", """
Construct two different stories from a combination of these 3 words: **Cobbler, Football and Footpath**. Each story should be no longer than three sentences. (A cobbler is a person who repairs footwear, umbrellas, etc.)

One possible story: *A child cries. The cobbler on the footpath repairs the child's football. The child smiles.*

Then pick one of your stories and draw it as a three-frame strip, one frame per sentence, with a title.
""", ["Each story no longer than three sentences", "Three frames, one per sentence"],
    even("Variety of plots", "Creativity of plots", "Graphical narrative (story communication)", "Clarity and neatness of sketches"),
    {"user": "cobbler; child", "setting": "footpath", "object": "three-sentence stories", "twist": "three fixed words", "hook": "Indian street trade"})

add(2015, 5, "Optional (Product Design) 5a", "problem-id", "Carrying four water pots", hmw(
    "Women in rural India often walk a long distance over uneven terrain carrying three to four earthen pots of drinking water home, which causes a lot of physical strain.",
    "Imagine one such trip, from filling the pots at the well to setting them down at home. Identify FOUR distinct problems she might face that may need design solutions."),
    HMW_RULES, HMW_CRIT,
    {"user": "rural women", "setting": "rural village paths", "object": "carrying water pots", "twist": "How-can-we statements, then two solutions", "hook": "rural India; water"}, suffix="a")

add(2015, 5, "Optional (Interaction Design) 5b", "visual", "Interactive pencil box screens", """
An organisation wants an interactive pencil box for students of standards 7–10 (about 12–15 years old): the box that carries pens, pencils and an eraser has a small screen on its lid and acts as a learning aid inside and outside the classroom.

Design THREE screens in sequence, shown on the lid, that help a student learn one topic from the history of India. Do not use features of present-day smart devices (calculator, dictionary, e-book reader etc.). The screens should share one visual language that appeals to this age group.
""", ["Three screens in sequence", "No features from present-day smart devices"],
    even("Logic and flow of the screens", "Appeal to the age group", "Originality of the learning idea", "Composition, clarity and neatness"),
    {"user": "students aged 12–15", "setting": "school", "object": "pencil-box screens", "twist": "no existing smart-device features", "hook": "education; Indian history"}, suffix="b")

add(2015, 5, "Optional (Animation Design) 5c", "sketching", "Kid, puppy and the eagle", """
An animation film for 5 to 12 year old children is about a 10-year-old kid (girl or boy) and their puppy. In one sequence, the two are playing with a ball in a field when a huge eagle swoops down, grabs the puppy in its talons and flies off. The kid throws the ball at the eagle; it hits, and the eagle drops the puppy.

Sketch the moment the ball hits the eagle, from the point of view of the puppy hanging from its talons.
""", SKETCH,
    SKETCH_CRIT,
    {"user": "child; puppy; eagle", "setting": "open field", "object": "scene", "pov": "the puppy, held in the air", "twist": "animal point of view from mid-air"}, suffix="c")

add(2015, 5, "Optional (Visual Communication) 5d", "visual", "Suraksha gas-cylinder page", """
The government is starting a home-safety campaign called **'Suraksha'** (safety) to make citizens aware of safety with household appliances. It needs a page for its information booklet on gas cylinders.

Lay out one 6 × 6 inch page that shows how to change a domestic gas cylinder safely, in FOUR steps. Use visuals only; step numbers are the only text allowed.
""", ["Page 6 × 6 inches", "Four steps", "No text except step numbers"],
    even("Appropriate selection of views of objects and actions", "Clarity in the structure and sequencing of information", "Effectiveness of presentation in minimal space", "Quality of visual renderings"),
    {"user": "households", "setting": "home kitchen", "object": "booklet page", "twist": "no text", "hook": "LPG safety campaign"}, suffix="d")

# ---------- 2016 session 1 ----------
add(2016, 1, "Part B (mandatory)", "sketching", "Patient and doctor at the clinic", """
A patient is sitting on a chair in front of a doctor at a clinic. A stethoscope, bottles of medicine, a glass of water, a thermometer, a mobile phone, a landline phone and a torch are kept on the table in front of the doctor.

Draw a freehand perspective drawing of this setup, showing all the elements listed above, **from any point of view**.
""", PENCIL + ["Show every listed element"],
    even("Overall composition and drawing", "Perspective", "Light, shade and shadow", "Scale and proportion"),
    {"user": "patient; doctor", "setting": "clinic", "object": "figures with listed props", "pov": "any point of view", "twist": "every listed object must appear"}, session="-s1")

add(2016, 2, "Part B (mandatory)", "creativity", "Mind-to-text device", """
You are given a magic computer device that can read the human mind and translate the data into text. This data can be stored in various digital media.

Create five sketches with brief notes to illustrate five creative uses of this device.
""", ["Five sketches with brief notes"],
    even("Imagination and creativity", "Diversity of ideas", "Originality of ideas", "Clarity of visual presentation"),
    {"object": "magic device", "twist": "thoughts become text", "hook": "technology"}, session="-s1")

add(2016, 3, "Part B (mandatory)", "creativity", "Thief, wallet, school", """
Construct two different stories from a combination of these 3 words: **Thief, Wallet and School**. Each story should not be longer than three sentences.

Then pick one of your stories and draw it as a three-frame strip, one frame per sentence, with a title.
""", ["Each story no longer than three sentences", "Three frames, one per sentence"],
    even("Variety of plots", "Creativity of plots", "Graphical narrative (story communication)", "Clarity and neatness of sketches"),
    {"setting": "school", "object": "three-sentence stories", "twist": "three fixed words"}, session="-s1")

add(2016, 4, "Optional (Product Design)", "form", "Solar cooker that packs into a box", """
Construction workers migrate frequently and are economically challenged; they could benefit from cooking with solar energy. Conceptualise and render a solar cooker that cooks for 20 people at a site and packs into a box no larger than 2 ft × 3 ft × 2 ft.

Let the **box** be the form: it may be unfolded, hinged, cut and repeated, but packed, it must close back into the box.

Render the cooker open and in use in one large three-quarter view, with a small sketch of it packed.
""", ["Packed size within 2 ft × 3 ft × 2 ft", "Packs back into the box"],
    even("Uniqueness of the form", "Form–function relevance (cooking, packing, carrying)", "Detailing and materials", "Rendering quality"),
    {"user": "migrant construction workers", "setting": "construction site", "object": "solar cooker", "twist": "unfolds from a box of fixed size", "hook": "solar energy; migrant labour"}, session="-s1")

add(2016, 5, "Optional (Interaction Design)", "visual", "Soil tester results screen", """
A smartphone manufacturer is developing a portable soil tester for farmers in India. Its three probes go into the soil and it reports three readings: water content (very low to very high), pH level (acidic to alkaline) and fertiliser content (very low to very high). Many of its users read little.

Design the results screen that shows all three readings at once. Give each reading an icon and a scale a farmer can read at a glance in the field. Draw the screen large, showing one sample result.
""", ["Three readings on one screen", "Minimal text"],
    even("Consistency of visual language", "Appropriateness to farmers in the field", "Effective communication of the readings", "Composition, clarity and neatness"),
    {"user": "farmers", "setting": "farm field", "object": "results screen", "twist": "readable without reading", "hook": "agriculture; technology"}, session="-s1")

add(2016, 6, "Optional (Animation)", "sketching", "The Potter and the Wagher", """
A Gujarati folktale (from *Folktales of India*, 1987) is to be made into an animation film:

> A strong, tall potter and a very thin Wagher (a warrior) were neighbours, and their wives were friends. The potter's wife kept mocking the Wagher's wife: how could such a thin man ever face a foe? One day the drums thundered as outlaws entered the village. The potter hid on his verandah, while the Wagher took his sword and went out to drive the outlaws away.

Sketch the moment the drums thunder: the Wagher striding out with his sword while the potter hides, as seen by the potter's wife from her doorway.
""", SKETCH,
    SKETCH_CRIT,
    {"user": "villagers", "setting": "village", "object": "scene", "pov": "the potter's wife at her doorway", "twist": "one moment from a folktale", "hook": "Indian folktale"}, session="-s1")

add(2016, 7, "Optional (Visual Communication)", "visual", "IIT Goa symbol and logo", """
A new Indian Institute of Technology is starting in Goa. Design its **symbol** (a visual representation of the ideas associated with the institute) combined with its **logo** (the institute's name in letterforms).

They should reflect: technology, world-class education, research and development, India and Goa, and work in black and white at every size.

Draw the final symbol and logo large, then once more at 2 cm height to show it still reads.
""", ["Black and white only", "Show it large and at 2 cm height"],
    even("Originality of the symbol", "Reflection of the brief's keywords", "Legibility at small size", "Composition, clarity and neatness"),
    {"user": "institution", "setting": "education", "object": "symbol and logo", "twist": "must read at 2 cm", "hook": "new Indian institution; Goa"}, session="-s1")

# ---------- 2016 session 2 ----------
add(2016, 1, "Part B (mandatory)", "sketching", "Kirana counter", """
A shop owner is standing at the shop's billing counter, taking money from a customer. The shop has shelves, different kinds of food products, groceries and a weighing scale.

Draw a freehand perspective drawing of this setup, showing all the elements listed above.
""", PENCIL + ["Show every listed element"],
    even("Drawing and overall composition", "Perspective", "Light, shade and shadow", "Scale and proportion"),
    {"user": "shopkeeper; customer", "setting": "kirana shop", "object": "figures with listed props", "twist": "every listed object must appear", "hook": "Indian corner shop"}, session="-s2")

add(2016, 2, "Part B (mandatory)", "creativity", "Animal-thought translator", """
You are given a handheld device that can understand animal behaviour and translate their needs and thoughts into images that humans can understand. This data can be stored in various digital media.

Create five sketches with brief notes to illustrate creative uses of this device.
""", ["Five sketches with brief notes"],
    even("Imagination and creativity", "Diversity of ideas", "Originality of ideas", "Clarity of visual presentation"),
    {"user": "animals and people", "object": "magic device", "twist": "animal thoughts become images", "hook": "technology"}, session="-s2")

add(2016, 3, "Part B (mandatory)", "creativity", "Farmer, gold, tree", """
Construct two different stories from a combination of these 3 words: **Farmer, Gold and Tree**. Each story should not be longer than three sentences.

Then pick one of your stories and draw it as a three-frame strip, one frame per sentence, with a title.
""", ["Each story no longer than three sentences", "Three frames, one per sentence"],
    even("Variety of plots", "Creativity of plots", "Graphical narrative (story communication)", "Clarity and neatness of sketches"),
    {"user": "farmer", "setting": "rural", "object": "three-sentence stories", "twist": "three fixed words"}, session="-s2")

add(2016, 4, "Optional (Product Design)", "form", "Toy stall on a bicycle", """
Cities have many vendors who move around selling goods because they lack dedicated space. A toy vendor sells **toys for kids** from an **existing bicycle**.

Visualise a set of attachments that turns the bicycle into a toy stall when parked and packs up so the vendor can ride away. The attachments should match the bicycle's design language: its tubes, wheels and joints. Sketch and render the bicycle parked with the stall open, as a child would see it, and label the materials.
""", ["Works with an existing bicycle", "Packs up for riding"],
    even("Consistency with the bicycle's design language", "Form–function relevance (display, packing, riding)", "Detailing and materials", "Rendering quality"),
    {"user": "itinerant vendor; child buyers", "setting": "city street", "object": "bicycle stall attachments", "twist": "companion product to a given product", "hook": "informal economy"}, session="-s2")

add(2016, 5, "Optional (Interaction Design)", "visual", "Science museum guide icons", """
A science museum that admits only children aged 10–14 hands each child a digital guide at entry, to help them understand the exhibits and their underlying concepts, alone or in groups.

Create four icons for the guide's main functions:

- Explore an exhibit
- Try an experiment
- Play as a group
- Find your way

All icons should be clear and have a consistent visual language. Draw them in four squares.
""", ["Icons should only have visuals. Do not use text", "Draw the icons in four squares"],
    ICON_CRIT,
    {"user": "children aged 10–14", "setting": "science museum", "object": "icon set", "hook": "education; technology"}, session="-s2")

add(2016, 6, "Optional (Animation)", "sketching", "Dhanna Bhagat's gourds", """
A Rajasthani folktale is to be made into an animation film:

> Dhanna Singh, a young farmer, was so generous that his father thought him good for nothing. Sent to market to sell the farm's produce and buy seeds, Dhanna gave everything away on the road, and an old woman gave him a few seeds in return. He planted them. Weeks later his father found only wild gourds that goats eat. In anger he dashed one to the ground; it burst open, full of diamonds and emeralds.

Sketch the moment the gourd bursts open at the father's feet, from the point of view of a goat grazing among the gourds.
""", SKETCH,
    SKETCH_CRIT,
    {"user": "farmer and father; goat", "setting": "rural Rajasthan field", "object": "scene", "pov": "a grazing goat", "twist": "one moment from a folktale, animal point of view", "hook": "Indian folktale"}, session="-s2")

add(2016, 7, "Optional (Visual Communication)", "visual", "AMRC Karnataka symbol and logo", """
A new Ayurvedic Medical Research Centre (AMRC) is being set up in Karnataka. Design its **symbol** (a visual representation of the ideas associated with the centre) combined with its **logo** (the centre's name in letterforms). The logo must show "AMRC Karnataka" in English.

They should reflect: Ayurveda, India, research and development, and work in black and white at every size.

Draw the final symbol and logo large, then once more at 2 cm height to show it still reads.
""", ["Logo shows \"AMRC Karnataka\" in English", "Black and white only", "Show it large and at 2 cm height"],
    even("Originality of the symbol", "Reflection of the brief's keywords", "Legibility at small size", "Composition, clarity and neatness"),
    {"user": "institution", "setting": "health research", "object": "symbol and logo", "twist": "must read at 2 cm", "hook": "Ayurveda; Indian tradition"}, session="-s2")

# ---------- 2017 ----------
add(2017, 1, "Industrial Design", "form", "Hospital product on a motorised chassis", """
You are given a base (chassis) of 100 cm × 75 cm, as shown below. It has an inbuilt motor and battery-charger system, carries a maximum load of 200 kg (apart from its own weight) and moves at up to 5 km/h.

Conceptualise and render ONE product for a **hospital** built on this chassis. You may add parts and accessories, but the chassis should stay recognisable. Render it in use in a hospital corridor with a person for scale, and label its key features and materials.
""", ["Use the given chassis"],
    even("Relevance of the use to patients and hospital staff", "Form–function relevance and relationship", "Detailing and materials", "Rendering quality"),
    {"user": "patients and hospital staff", "setting": "hospital", "object": "motorised platform product", "twist": "given platform, find the use", "hook": "technology"},
    ["Outline drawing of a flat rectangular motorised chassis on four wheels with a battery box mounted at one end."])

add(2017, 2, "Communication Design", "visual", "Malaria poster for Shaaradapur", """
Shaaradapur is an Indian village with a multilingual, low-literate population, and it has an outbreak of malaria. Malaria is spread by mosquitoes; its symptoms are fever, headache, vomiting and fatigue, and untreated it can be life-threatening. Treatment by a trained practitioner at the village government hospital is important. It is prevented by draining stagnant water and spraying insecticide; mosquito nets and repellents stop bites.

Design one poster for a public place in the village that communicates (a) the seriousness, (b) the symptoms, (c) the action to take and (d) the prevention of malaria. Carry the message in pictures, since many villagers cannot read.
""", ["Readers are multilingual and low-literate", "Minimal text"],
    even("Clarity for low-literate readers", "Coverage of the four messages", "Originality of the visual idea", "Composition, clarity and neatness"),
    {"user": "low-literate villagers", "setting": "village public place", "object": "health poster", "twist": "pictures carry the message", "hook": "public health; multilingual India"})

add(2017, 3, "Animation Design", "sketching", "Priya, the cat and the bird", """
An animation film for 5 to 12 year old children is about 10-year-old Priya and her cat. In one sequence, the cat creeps along a branch towards a singing bird; the branch breaks, the bird flies away, and Priya runs to catch the falling cat but trips and falls. Terrified, she looks up to see the cat land safely on its feet.

Sketch that moment, from the point of view of the bird on a higher branch.
""", SKETCH,
    SKETCH_CRIT,
    {"user": "child (girl); cat; bird", "setting": "garden", "object": "scene", "pov": "the bird, from a higher branch", "twist": "high-angle animal point of view"})

add(2017, 4, "Interaction Design", "problem-id", "Licence day at the RTO", hmw(
    "About 500 people, mostly 18–20 years old and some who cannot read, visit a city Regional Transport Office (RTO) every day for a driving licence. The office is short-staffed. For a learner's licence, an applicant fills a form, takes an objective test, and submits copies of age and address proof, a phone number, fingerprints and a photograph.",
    "Imagine an applicant who cannot read going through this visit, from the entrance to leaving with the learner's licence. Identify FOUR distinct problems they might face that may need design solutions."),
    HMW_RULES, HMW_CRIT,
    {"user": "licence applicants, some who cannot read", "setting": "RTO office", "object": "licence process", "twist": "user cannot read", "hook": "public services"})

add(2017, 5, "Mobility and Vehicle Design", "form", "Banaras e-taxi from a ghat boat", """
A company plans to introduce an **electric two-wheeler taxi** in Banaras (Varanasi) for local commuters and pilgrims.

Visualise its form based on the wooden rowing boats on the city's ghats. It should borrow the boat's design language (its hull curves, ribs and painted bands) with relevant details for a rider, a passenger and a small bag. Sketch and render the taxi in three-quarter view.
""", ["Three-quarter view"],
    even("Consistency with the visual language of the boat", "Form–function relevance for rider, passenger and luggage", "Relevant details of the vehicle", "Rendering quality"),
    {"user": "commuters and pilgrims", "setting": "Varanasi streets", "object": "electric two-wheeler taxi", "twist": "borrow design language from a river boat", "hook": "electric mobility; Indian city"})

add(2017, 6, "Sketching (option A)", "sketching", "Mixed-material still life", """
Illustrate in perspective a still-life composition with a **plastic water bottle**, a **transparent half-empty glass of water with a metal spoon inside it**, and a **kitchen knife** placed next to a **half-eaten apple** on a **grey ceramic plate**.
""", PENCIL,
    even("Realistic drawing and proportions", "Quality of surface texture", "Shading", "Perspective and composition"),
    {"setting": "tabletop", "object": "still life", "twist": "plastic, glass, metal and ceramic together"}, suffix="a")

add(2017, 6, "Sketching (option B)", "sketching", "Dog chases the banana seller", """
Illustrate this scene: **a dog chases a fruit seller carrying a basket full of bananas. A kid on a tricycle watches.**

Figures may be realistic or stylised.
""", PENCIL,
    even("Drawing", "Perspective", "Proportions", "Composition"),
    {"user": "vendor; child; dog", "setting": "street", "object": "action scene", "hook": "Indian street"}, suffix="b")

add(2017, 7, "Creativity", "creativity", "Five lives of a helmet", """
A helmet is used to prevent head injury in risky situations, in many sports and while riding a bike.

Describe five DIFFERENT creative ways you can use a helmet other than as headgear. Sketch each idea and write a one-line note to describe it.
""", ["Not as headgear", "One-line note per idea"],
    even("Originality", "Imagination", "Diversity of ideas", "Presentation"),
    {"object": "helmet", "twist": "never on a head"})

add(2017, 8, "Stories", "creativity", "Orphan, mango, cycle shop", """
Construct two different stories using these three terms: **Orphan, Mango, Cycle shop**. Each story should not be longer than three sentences.

Then pick one of your stories and draw it as a three-frame strip, one frame per sentence, with a title.
""", ["Each story no longer than three sentences", "Three frames, one per sentence"],
    even("Originality of plots", "Creativity of plots", "Ability to tell the story in only three sentences", "Graphical narrative (story communication)"),
    {"user": "child; shopkeeper", "setting": "cycle shop", "object": "three-sentence stories", "twist": "three fixed words"})

# ---------- 2018 ----------
add(2018, 1, "Industrial Design", "problem-id", "One hand, one milk pouch", hmw(
    "Mr. Chatterjee, a right-handed person, recently lost his right hand in an accident. He lives alone. Every morning a standard 500 ml milk pouch is delivered to his home, and with only his left hand he must lift it, cut it open, pour the milk into a utensil to heat it, and discard the empty pouch.",
    "Imagine his morning with the pouch, from the doorstep to the stove. Identify FOUR distinct problems he faces that may need design solutions."),
    ["Solutions must work with the left hand only", *HMW_RULES], HMW_CRIT,
    {"user": "amputee living alone", "setting": "home kitchen", "object": "milk pouch", "twist": "only the non-dominant hand", "hook": "accessibility; Indian milk pouch"})

add(2018, 2, "Communication Design", "visual", "The Art of Optical Illusion cover", """
An optical illusion uses colour, light and patterns to create images that deceive our brains. Akihito Yujumari, an established artist and author, is releasing his 25th book, documenting the greatest optical illusions of the world.

Design its **front cover**, with the title *The Art of Optical Illusion* and the author's name. The cover itself should play with perception. The book is 22.9 cm wide and 25.4 cm tall; keep that proportion.
""", ["Keep the cover's proportion (22.9 × 25.4 cm)", "Title and author's name on the cover"],
    even("Originality of the visual idea", "Thematic appropriateness (perception)", "Hierarchy of title and author", "Composition, clarity and neatness"),
    {"user": "general readers", "object": "book front cover", "twist": "the cover itself should play with perception", "hook": "perception science"})

add(2018, 3, "Animation Design", "sketching", "The crow and the biscuits", """
An animation film for children is based on the relationship between a crow and a man. In one scene, the man sits down to breakfast in the garden: a cup of tea and a plate of biscuits on the table. A crow on a nearby tree caws insistently; the man feels sorry for it and throws a biscuit in the air, and the crow catches it midair.

Sketch the moment of the catch, from the point of view of the plate of biscuits on the table.
""", SKETCH,
    SKETCH_CRIT,
    {"user": "man; crow", "setting": "garden", "object": "scene", "pov": "the plate on the table", "twist": "inanimate-object point of view"})

add(2018, 4, "Interaction Design", "visual", "ASHA app icons", """
ASHA workers are local women trained as village health educators and monitors. One key task is keeping the health records of pregnant women, until now in paper booklets. The health ministry is moving these records to a smartphone app that every ASHA worker will use on home visits: she retrieves a woman's record, measures her weight, blood sugar and blood pressure, enters them, and the app flags any risk.

Create four icons for this app:

- Age of the foetus
- Weight
- Blood sugar
- Blood pressure

All icons should be clear and have a consistent visual language. Draw each icon in a 5 cm × 5 cm square.
""", ["Each icon in a 5 cm × 5 cm square", "Do not use text"],
    even("Consistency of visual language", "Appropriateness to the users and context", "Effective communication", "Composition, clarity and neatness"),
    {"user": "village health workers; pregnant women", "setting": "rural home visits", "object": "app icon set", "hook": "rural public health; digitisation"})

add(2018, 5, "Mobility and Vehicle Design", "form", "Bookseller's kiosk two-wheeler", """
A roadside bookseller wants a new two-wheeler that is a book kiosk in a crowded market during the day, and takes his family out on trips at weekends.

Base the kiosk on an **open hardbound book**: its covers, spine and pages may hinge, fold, cut and repeat, but the essence of the book should be retained. Render the two-wheeler parked with the kiosk open and 100 books on display, with a small sketch of it folded and locked for riding.
""", ["Keep the essence of the book", "Displays 100 books; folds away securely"],
    even("Uniqueness of the form", "Form–function relevance (display, security, family use)", "Detailing and materials", "Rendering quality"),
    {"user": "bookseller and his family", "setting": "street market", "object": "two-wheeler kiosk", "twist": "the vehicle opens like a book", "hook": "informal economy"})

add(2018, 6, "Sketching", "sketching", "After the axe", """
A room 10 ft × 10 ft has a 5 ft × 4 ft table in the centre. On the table are a matchbox, a watermelon cut into two halves and a glass of water. A person with an axe enters the room and switches on the light. With a harsh blow of the axe he breaks the table into two and leaves the room with his axe, leaving the light on.

Choose a point of view and draw a freehand perspective drawing of this scene **after the person has left**.
""", ["Any medium of your choice", "Draw the scene after he leaves"],
    even("Perspective", "Light, shade and shadow", "Textures and quality of lines", "Scale and proportion in the composition"),
    {"setting": "room", "object": "aftermath scene", "pov": "your choice", "twist": "draw the result, not the action"})

add(2018, 7, "Creativity", "creativity", "Tyre, bottle, bat, bucket", """
Imagine you are provided with a **tyre, a plastic bottle, a cricket bat and a bucket**. Illustrate five DIFFERENT creative ideas that use these objects in combination, at your home or in a public place.

Use all the objects in each idea. You may use an object more than once and change its scale and proportions.
""", ["All four objects in every idea"],
    even("Originality of ideas", "Diversity of ideas", "Humour and surprise", "Clarity of sketches"),
    {"setting": "home or public place", "object": "object combinations", "twist": "all four objects every time", "hook": "cricket; reuse"})

add(2018, 8, "Visualization", "visual", "Lowercase d for 'Flows'", """
The image below shows a word written in a particular font. Visualise and draw the lower-case letter **"d"** from the same font. The letter should be **15 cm** tall.
""", ["Letter height 15 cm"],
    even("Consistency with the existing letters", "Font anatomy", "Proportion", "Quality of rendering"),
    {"object": "letterform", "twist": "extrapolate a font from one word", "hook": "type design"},
    ["The word Flows set in a heavy, high-contrast serif typeface with thick vertical strokes and thin hairline serifs."])

# ---------- 2019 ----------
add(2019, 1, "Industrial Design", "form", "Monsoon drying attachment for a fan", """
During the monsoon, washed clothes take a long time to dry, and people spread them over chairs under a fan. A fan manufacturer wants a clothes-drying attachment for its ordinary pedestal fan (a round guard on a single stem and a round base) that fits on during the rains and comes off so the fan works normally in other seasons.

Visualise the attachment matching the fan's design language: its rings, round base and single stem. Sketch and render the fan with the attachment and clothes in use, with a small sketch of the attachment folded for storage.
""", ["The fan works normally without it", "Folds compact"],
    even("Consistency with the fan's design language", "Form–function relevance (drying, fitting, folding)", "Relevant details", "Rendering quality"),
    {"user": "household", "setting": "home in monsoon", "object": "fan attachment for drying clothes", "twist": "companion product to a given product", "hook": "monsoon"})

add(2019, 2, "Communication Design", "visual", "World Cup hoarding for team India", """
Cricket is a popular sport in India, and the next Cricket World Cup is coming. India has been champion twice; to win again, the team needs the support and wishes of a billion Indians.

Design one **30 ft × 20 ft hoarding**, for prominent locations in cities and towns, that gathers support for the Indian team. Include a slogan in English or any Indian language (name the language).
""", ["Hoarding 30 ft × 20 ft (keep the proportion)", "Slogan in English or any Indian language"],
    even("Originality of the idea", "Clarity and creativity of the slogan", "Readability at a distance", "Composition and detailing"),
    {"user": "general public", "setting": "cities and towns", "object": "campaign hoarding", "twist": "slogan in any Indian language", "hook": "cricket"})

add(2019, 3, "Animation Design", "sketching", "Tommy saves the baby", """
An animation film for children is about the bond between a baby and a dog. In one scene, a hungry baby crawls to a table, grabs a corner of the tablecloth and pulls; the milk bottle and everything else slide towards the edge. The dog leaps forward, grabs the end of the baby's diaper and pulls the baby away just as everything topples onto him.

Sketch that moment, from the point of view of the mother at the doorway.
""", SKETCH,
    SKETCH_CRIT,
    {"user": "baby; dog; mother", "setting": "home", "object": "scene", "pov": "the mother at the doorway", "twist": "the hero looks guilty", "hook": "humour and irony"})

add(2019, 4, "Interaction Design", "visual", "Bicycle navigator for 12-year-olds", """
A bicycle company has developed a navigation device: a colour display (not a touch screen), 7 physical buttons, a speaker, a microphone, GPS and wireless internet. It is waterproof, readable in bright sunlight, and charged by pedalling. A version mounted on the handlebar is for **12-year-old children**.

Design the screen a child sees while riding to a place they have never been. Draw the device face large with that screen and its 7 buttons, and label what each button does.
""", ["Not a touch screen: 7 physical buttons", "One screen, shown on the device"],
    even("Clarity of the screen at a glance while riding", "Integration of buttons and screen", "Appropriateness for a 12-year-old", "Composition, clarity and neatness"),
    {"user": "children aged 12", "setting": "cycling on city streets", "object": "navigation screen", "twist": "buttons only, no touch", "hook": "GPS technology"})

add(2019, 5, "Mobility and Vehicle Design", "form", "Hill four-wheeler from terraced fields", """
Local improvised vehicles in rural India carry people, small machines, farm equipment and even cattle and goats. They are neither safe nor comfortable, but often the only transport available.

Visualise a four-wheeler for hilly regions based on the stepped form of terraced hillside fields: borrow their stepped levels and contour lines as its design language. It carries 6 people including the driver, its rear converts to carry a goat, milk cans or fuel drums, and it shades its passengers from sun and rain. Sketch and render it in three-quarter view on a hill road.
""", ["Three-quarter view", "Six people including the driver"],
    even("Consistency with the language of terraced fields", "Form–function relevance (people, goods, weather)", "Relevant details of the vehicle", "Rendering quality"),
    {"user": "rural hill communities", "setting": "hilly rural roads", "object": "utility four-wheeler", "twist": "borrow design language from a landscape", "hook": "rural India; improvised vehicles"})

add(2019, 6, "Sketching", "sketching", "Kitchen at 5½ feet", """
Draw a perspective view of a kitchen interior with a stove, kitchen utensils (such as a pressure cooker, cooking pans, sauce pans), dining utensils (such as ceramic plates, cups, glasses), a wash basin, storage racks with stored cooking ingredients (such as spices in small plastic bottles), fresh cut vegetables kept beside the stove and at least two kitchen gadgets.

Make a freehand perspective drawing of this setup, showing all the elements listed above, as seen from the point of view of a **5½ feet tall person**.
""", PENCIL + ["Show every listed element"],
    even("Quality of composition and sense of perspective", "Observation and drawing skills", "Scale and relative proportions", "Use of light, shade and surface finish"),
    {"setting": "home kitchen", "object": "interior scene", "pov": "standing person, 5½ ft eye level", "twist": "every listed object must appear", "hook": "Indian kitchen"})

add(2019, 7, "Creativity", "creativity", "Four frames and a fifth", """
Imagination is the power of the mind: some visual elements can come together to create a bigger picture. Observe the visual elements in the boxes below.

Complete the visual elements based on your imagination; each may become a character, a product, a landscape, etc. Use the given elements to complete the first four frames. Then choose **any three elements** from the first four frames and complete the fifth frame.
""", ["Sketch only within the boundaries of the boxes", "Fifth frame uses any three elements from frames 1–4"],
    even("Originality of ideas", "Diversity of ideas", "Clarity of sketches", "Neatness of sketches"),
    {"object": "completed frames", "twist": "fifth frame combines three earlier elements"},
    ["Five square frames: frame 1 has a short diagonal line and a wavy line; frame 2 a wavy line, a vertical line and a solid blue dot; frame 3 a wavy line, a blue ring and a diagonal line; frame 4 a wavy line, a diagonal line and a blue triangle at its edge; frame 5 is empty."])

add(2019, 8, "Visualization", "visual", "Complete the S-shaped motif", """
Shown below is part of an **S-shaped motif**. The dotted lines mark the incomplete part. Visualise the remaining motif and draw the complete motif at a height of **15 cm**. Do not draw the dotted lines.
""", ["Motif height 15 cm", "Do not draw the dotted lines"],
    marks(("Faithful reproduction of the given part of the motif in the required size", 5), ("Consistency with the existing visual language, harmony and balance in the imagined part", 10), ("Rendering quality of the final form", 5)),
    {"object": "ornamental motif", "twist": "complete a hidden half"},
    ["Bold black ornamental motif: the top half of an S-shape curling into a round spiral, with its middle hidden by a dotted rectangle and only a black curved edge visible below it."])


PAPERS = [
    {"id": f"ceed-{y}-b", "year": y, "label": f"CEED {y} Part B", "durationMin": 120,
     "promptIds": [f"ceed-{y}-b-q{n}" for n in range(1, 6)]}
    for y in (2020, 2021, 2023, 2024, 2025, 2026)
]


def main() -> None:
    out = pathlib.Path(sys.argv[1])
    (out / "prompts-real.json").write_text(json.dumps(P, indent=2, ensure_ascii=False) + "\n")
    (out / "papers-real.json").write_text(json.dumps(PAPERS, indent=2, ensure_ascii=False) + "\n")
    print(f"{len(P)} prompts, {len(PAPERS)} papers")


if __name__ == "__main__":
    main()
