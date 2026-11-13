"""Build content/part-b/prompts-real.json and papers-real.json from the official CEED papers.

Usage: part_b_build_real.py <content_part_b_dir>

2020–2026: the five mandatory questions as printed (adapted: false).
2010–2019: each question adapted to the closest current slot in the 24-minute, 20-mark shape (adapted: true).
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
    ["A square box containing three marks: a short diagonal line, a small circle, and a curved arc, with a title line below."], adapted=False)

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
Building upon the visual elements given in the ten boxes, create recognizable images and give a title to each. A theme for each of the first three boxes has been given as printed in the answer booklet.

*The published paper shows only the first of the ten boxes (below); the other boxes and the three themes were printed in the answer booklet. Use this box's elements as the starting point for each of your ten images.*
""", ["Use only BLACK pencil/pen", "Draw only within the boundaries of the boxes"],
    even("Originality of ideas", "Diversity of ideas", "Clarity of sketches", "Neatness of sketches"),
    {"object": "titled images", "twist": "complete given abstract marks"},
    ["A square box containing a V of two straight lines meeting at a vertical line near the top, a small arc in the middle, and a quarter circle in the bottom-right corner, with a title line below."], adapted=False)

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

add(2010, 4, "Problem Identification and Analysis (A)", "problem-id", "Pressure cooker problems", """
Below is an image of a pressure cooker commonly used in Indian households. Identify five unique problems from the point of view of the users.

- Write each problem briefly and justify it in one line.
- Choose the three most important problems and illustrate a solution for each with a sketch.
""", ["Problems from the users' point of view"],
    marks(("Identification of unique problems and proper justification", 10), ("Appropriateness of your solutions", 10)),
    {"user": "household cook", "setting": "home kitchen", "object": "pressure cooker", "pov": "users", "hook": "Indian kitchen"},
    ["Photo of an aluminium pressure cooker with a long black handle, a lid and a weighted whistle on top."], suffix="a")

add(2010, 4, "Problem Identification and Analysis (B)", "problem-id", "Railway platform communication", """
Below is an image of a typical railway platform in India. Identify five unique **communication design** problems from the point of view of the users.

- Write each problem briefly and justify it in one line.
- Choose the three most important problems and illustrate a solution for each with a sketch.
""", ["Communication design problems only", "Problems from the users' point of view"],
    marks(("Identification of unique problems and proper justification", 10), ("Appropriateness of your solutions", 10)),
    {"user": "rail commuters", "setting": "railway platform", "object": "signage and wayfinding", "pov": "users", "twist": "communication problems only", "hook": "Indian Railways"},
    ["Black-and-white photo of a long Indian railway platform under a steel roof, with hanging bilingual signboards, a book stall sign, waiting passengers and a train alongside."], suffix="b")

add(2010, 5, "Creativity II", "creativity", "Cone, three discs and a wire", """
You have at your disposal five objects: **1 cone, 3 discs and 1 flexible wire**, as shown below.

Imagine five interesting products made out of a combination of all five objects. You can scale the objects to any size or dimension. Represent your ideas with neat sketches, name each product and add a brief note if necessary.
""", ["Use all five objects in every product", "Name each product"],
    even("Originality of ideas", "Diversity of ideas", "Humour and surprise", "Clarity and neatness of sketches"),
    {"object": "products from primitives", "twist": "use all five objects every time"},
    ["Outline drawing of a cone, three discs of different orientations and a long curved flexible wire."])

add(2010, 6, "Design Problem Solving: Product Design / Interaction Design (A)", "problem-id", "Scissors for the blind", """
People who are fully blind need products that help them carry out day-to-day activities with ease. One such product is a pair of scissors, used for cutting liquid pouches, cloth, paper, etc. Design a new pair of scissors for the visually impaired. You can make use of new technologies if needed.

1. Identify five distinct factors essential for designing scissors for the blind.
2. Generate three quick concepts as pencil sketches based on these factors.
3. Develop one into a final concept showing the overall form, construction details and materials.
""", ["Pencil sketches"],
    marks(("Identification of distinct factors", 5), ("Novelty of your alternate concepts", 5), ("Appropriateness of your final solution", 10), ("Quality of your presentation", 5)),
    {"user": "blind people", "setting": "home", "object": "scissors", "twist": "user cannot see the tool", "hook": "accessibility"}, suffix="a")

add(2010, 6, "Design Problem Solving: Communication Design (B)", "visual", "Flu symbol and school poster", """
Influenza A (H1N1), also known as swine flu, is an influenza virus that is contagious and spreads rapidly.

Design a new symbol to capture the essence of this disease, using text, graphics or both.

1. List five distinct factors essential for representing the disease.
2. Sketch three quick symbol concepts and finalise one.
3. Design a poster that uses your final symbol to create awareness about the disease among school children.
""", ["Colours allowed if necessary", "The poster must use your final symbol"],
    marks(("Identification of distinct factors", 5), ("Novelty of your alternate concepts", 5), ("Appropriateness of your final symbol", 5), ("Clarity of your final poster design", 10)),
    {"user": "school children", "setting": "school", "object": "symbol and poster", "hook": "public health"}, suffix="b")

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

add(2011, 4, "Problem Identification and Analysis", "problem-id", "Bus stop problems", """
Below is an image of a typical bus stop in India. Identify five unique problems from the point of view of the users.

- Write each problem briefly.
- Choose the three most important problems and illustrate a solution for each with a sketch.
""", ["Problems from the users' point of view"],
    marks(("Identification of each unique problem", 10), ("Appropriateness of your solutions", 10)),
    {"user": "commuters", "setting": "city bus stop", "object": "bus shelter", "pov": "users", "hook": "urban India"},
    ["Black-and-white photo of a roadside bus shelter covered in large advertising hoardings, with people sitting and standing under it and one holding an umbrella."])

add(2011, 5, "Design Problem Solving: Product Design (A)", "problem-id", "Mobile phone for the elderly", """
Mobile phones have great potential to address the special needs of the elderly. Design a new mobile phone for elderly users.

1. Identify five distinct factors essential for designing a mobile phone for the elderly.
2. Generate three quick concepts as pencil sketches based on these factors.
3. Develop one into a final concept showing the overall form and the design of its interface.
""", ["Pencil sketches"],
    marks(("Identification of distinct factors", 5), ("Originality of your alternate concepts", 10), ("Appropriateness of your final solution", 10), ("Quality of your presentation", 5)),
    {"user": "elderly", "object": "mobile phone", "hook": "accessibility; technology"}, suffix="a")

add(2011, 5, "Design Problem Solving: Communication Design (B)", "visual", "Organic vegetable drink brand", """
A new business wants to introduce an original health drink made from organically grown vegetables. Name the brand yourself.

1. List five distinct factors essential for representing the brand.
2. Sketch three quick logo/symbol concepts using text, graphics or both, and finalise one.
3. Design the graphics for the label of a one-litre pack, using your final logo/symbol.
""", ["Colours allowed if necessary", "The label must use your final logo/symbol"],
    marks(("Identification of distinct factors", 5), ("Originality of your alternate concepts", 10), ("Appropriateness of your final logo/symbol", 5), ("Clarity of your final label design for packaging", 10)),
    {"user": "consumers", "setting": "market shelf", "object": "logo and pack label", "hook": "organic food"}, suffix="b")

add(2011, 5, "Design Problem Solving: Animation Design (C)", "creativity", "Tiger, sparrow and the poacher", """
The tiger and the sparrow are endangered species in our country, and their protection needs attention.

Create an interesting comic strip involving a **tiger**, a **sparrow** and a **poacher** (a person who captures animals by laying a trap), using text and images.

1. Write the abstract of the story in five lines.
2. Make two quick alternate sketches of each character.
3. Draw the story in four key frames, with a title.
""", ["Text and images", "Colours allowed if necessary"],
    marks(("Abstract of the story", 5), ("Appropriate portrayal of the characters", 10), ("Originality of your storyboard (text and images)", 10), ("Quality of your presentation", 5)),
    {"user": "animals; poacher", "setting": "forest", "object": "comic strip", "hook": "wildlife conservation"}, suffix="c")

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

add(2012, 2, "Design Problem Solving (A)", "problem-id", "Jar-cap opener for the elderly", """
Screw caps on glass bottles of pickle and jam are often difficult for senior citizens to open. Design an opener for screw-on bottle caps, to be used by the elderly.

1. Identify five distinct factors essential for designing a cap opener for the elderly.
2. Generate three quick concepts as pencil sketches based on these factors.
3. Develop one into a final concept showing the overall form and its features. Mention the materials and why you chose them.
""", ["Pencil sketches"],
    even("Identification of distinct factors", "Originality of your alternate concepts", "Appropriateness of your final solution and choice of materials", "Quality of your presentation"),
    {"user": "elderly", "setting": "home kitchen", "object": "jar-cap opener", "hook": "accessibility; Indian pickle jars"}, suffix="a")

add(2012, 2, "Design Problem Solving (B)", "visual", "Anti-corruption awareness poster", """
Corruption is a big concern and people are agitating over the issue. It is a social responsibility of a designer to create awareness of this issue amongst common people through visual media.

Design an anti-corruption awareness poster that captures the essence of the issue, using text, graphics or both.

1. List five distinct factors essential for representing the issue.
2. Sketch three quick poster concepts.
3. Develop one into the final poster.
""", ["Colours allowed if necessary"],
    even("Identification of distinct factors", "Originality of your alternate concepts", "Appropriateness of your final poster", "Clarity of your poster in representing the issue"),
    {"user": "general public", "object": "awareness poster", "hook": "civic awareness"}, suffix="b")

add(2012, 2, "Design Problem Solving (C)", "creativity", "Dengue mosquito comic", """
Dengue fever claiming human lives is becoming a concern. Create an imaginary **female mosquito character** spreading dengue fever, and draw an interesting comic strip involving her. You may add characters to complement the story.

1. Write an abstract of the story in five lines.
2. Make two quick alternative sketches of each character.
3. Draw the story in four frames, with a title.
""", ["Colours allowed if necessary"],
    even("Abstract of the story", "Appropriateness of the characters", "Originality of the storyboard", "Quality of presentation"),
    {"user": "mosquito character; people", "object": "comic strip", "twist": "the villain is the hero of the strip", "hook": "public health"}, suffix="c")

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

add(2013, 4, "Part B Optional (Product Design)", "problem-id", "Floor mop that reaches everywhere", """
Mopping floors is one of the tedious daily household chores. A normal mop cannot reach all the crevices and under the furniture. Design a manually operated floor mop for domestic use.

1. Identify five distinct factors essential for designing such a mop.
2. Generate three quick concepts as pencil sketches, each with a note of no more than 15 words.
3. Develop one into a final concept showing the overall form and its features. Indicate the materials for the various parts.
""", ["Concept notes no more than 15 words", "Manually operated"],
    even("Identification of distinct factors", "Originality of your alternate concepts", "Appropriateness of your final solution and choice of materials", "Quality of presentation"),
    {"user": "homemaker", "setting": "home", "object": "floor mop", "hook": "domestic chores"}, suffix="a")

add(2013, 4, "Part B Optional (Visual Communication)", "visual", "Text-free medicine instructions", """
The following instructions are to be printed on a medicine packet. Represent them visually **without using any text**:

1. One tablet before breakfast at 7:00 AM.
2. One tablet after lunch at 2:00 PM.
3. One and a half tablets after dinner at 9:00 PM.
4. Not to be taken by pregnant women.

The packet is 50 mm high, 200 mm wide and 50 mm deep. Your final artwork (all four visuals together) should fit within 40 mm × 160 mm. Explain your design solution in not more than 20 words.
""", ["No text in the visuals", "All four visuals fit within 40 mm × 160 mm", "Explanation in not more than 20 words"],
    even("Ability to communicate clearly using visuals without text", "Clarity of visuals", "Quality of renderings", "Overall effectiveness of the final design solution"),
    {"user": "patients, pregnant women", "setting": "pharmacy pack", "object": "pictogram set", "twist": "no text, fixed size", "hook": "health literacy"}, suffix="b")

add(2013, 4, "Part B Optional (Animation Design)", "creativity", "Autobiography of a crow", """
The crow is the most common bird we get to see in India, and it carries many deep-rooted associations in Indian society.

Imagine that you are a crow and narrate your autobiography.

1. Write your story in 5 sentences.
2. Make 3 quick sketches of the crow in your story in various poses, moods or expressions.
3. Tell your story in 4 frames, with a title.
""", ["Story in 5 sentences"],
    even("Ability to design an interesting character and story", "Originality of the story", "Graphical narrative (story communication)", "Quality and finish of drawings"),
    {"user": "crow", "object": "character and story", "pov": "first person, as the crow", "twist": "you are the crow", "hook": "Indian culture"}, suffix="c")

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
Design a graphical user interface for the website of a movie theatre complex named **'Navrang Chitrapat'** for booking movie tickets online. The complex has 3 theatres, each screening a different film, three shows per day.

Draw **four** key screens in sequence that take the user through the booking. Between them, the screens should present: basic information about the complex, name of film, date, time, availability of tickets, price, payment options and confirmation of booking. Add a brief note on your design decisions.
""", ["Four screens in sequence"],
    even("Usability of the interface", "Structure and clarity of information", "Visual quality of icons and overall screens", "Logic of design decisions"),
    {"user": "moviegoers", "setting": "cinema", "object": "booking website", "hook": "technology; Indian naming"})

add(2014, 5, "Part B Optional (Animation Design)", "sketching", "Bag-snatch on the platform", """
A woman is walking on a crowded railway platform. A train pulls in and people alight. A man suddenly comes up behind the woman, snatches her bag and runs away. The woman shouts for help. A policeman standing near a vendor's cart looks up and immediately gives chase. Two women standing by try to console the shocked woman. The thief runs towards the stairs to the overhead bridge. The policeman throws his baton at the thief's legs. The thief stumbles and comes crashing down on the platform. A group of men catch him and retrieve the bag as the policeman reaches. A loud cheer goes up amongst the watching public.

Assume you are one of the characters: **the woman, the thief, the policeman or a bystander**. Illustrate the story as you see it unfolding in front of you, in **six frames**.
""", ["Choose one character's point of view and keep it", "Six frames"],
    even("Visual narrative structure", "Point of view", "Quality of illustrations", "Character and environment development"),
    {"user": "commuters; policeman", "setting": "railway platform", "object": "storyboard", "pov": "one character of your choice", "twist": "first-person character view", "hook": "Indian Railways"})

add(2014, 6, "Part B Optional (Product Design)", "form", "Roadside segregation bins", """
Roadside waste containers are often dirty, stinking and spilling over. Design roadside waste bin(s) for public places that segregate:

- different types of packaging
- wet and dry organic waste
- organic food waste
- all other kinds of leftover

The containers should be rugged and movable so that the waste can be transported for periodic disposal.

Present a neat freehand sketch showing the form, an exploded view, the materials and processes, and a brief note on your design decisions.
""", ["Include an exploded view"],
    even("User-centric design for hygiene, portability and Indian conditions", "Sustainability (recycle, reduce, regenerate, refuse)", "Originality of ideas and design insight", "Appropriateness of materials and manufacturing"),
    {"user": "public", "setting": "street", "object": "waste bins", "twist": "four-way segregation", "hook": "sustainability; Indian conditions"})

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

add(2015, 5, "Optional (Product Design) 5a", "problem-id", "Carrying four water pots", """
Women in rural India often walk a long distance carrying three to four pots of drinking water home, which causes a lot of physical strain. Design a device to help women carry **four earthen pots** of drinking water over uneven terrain.

1. Identify five distinct factors that make this device relevant for rural India.
2. Draw a neat freehand sketch of the overall form and its features.
3. Sketch the usage scenario, and indicate the materials and processes.
""", ["Four earthen pots", "Uneven terrain"],
    even("User-centric design considerations", "Feasibility and overall effectiveness of the design solution", "Appropriateness of materials and processes", "Originality of concepts and quality of presentation"),
    {"user": "rural women", "setting": "rural village paths", "object": "carrying aid", "hook": "rural India; water"}, suffix="a")

add(2015, 5, "Optional (Interaction Design) 5b", "problem-id", "Interactive pencil box", """
An organisation wants to develop an interactive pencil box (the box students carry pens, pencils, eraser, ruler etc. in) for students of standards 7–10 (about 12–15 years old), to act as a learning aid both inside and outside the classroom.

1. Sketch the 3D form of the device with its graphical interface, designed to appeal to this age group.
2. State three original features that would help students study. **Do not** describe features already in present-day smart devices (calculator, dictionary, e-book reader etc.).
3. Show, in a short screen sequence, how the device helps a student learn a topic from the history of India.
""", ["No features from present-day smart devices"],
    even("Logic and flow in the interface", "Usability and appropriateness of information", "Originality of concepts", "Overall effectiveness and quality of presentation"),
    {"user": "students aged 12–15", "setting": "school", "object": "interactive pencil box", "twist": "no existing smart-device features", "hook": "education; Indian history"}, suffix="b")

add(2015, 5, "Optional (Animation Design) 5c", "sketching", "Kid, puppy and the eagle", """
An animation film for 5 to 12 year old children is in pre-production. It is based on the relationship between a kid (girl or boy) and their puppy. Here is a shot breakdown of one sequence:

1. A 10-year-old kid and the puppy are playing with a ball in a field.
2. Suddenly the kid notices a huge eagle swooping down on the puppy.
3. The eagle reaches out with its talons, grabs the puppy and flies off.
4. The kid sees the puppy carried away.
5. The kid picks up the ball and throws it at the eagle.
6. The ball hits the eagle, and it drops the puppy.
7. The kid is reunited with the puppy and hugs it.

Create a storyboard of these seven shots as a series of picture frames.
""", ["One frame per shot", "Line drawing is sufficient"],
    even("Communication of the narrative through sequential pictures", "Shot composition", "Character and expressions", "Quality of sketching"),
    {"user": "child; puppy; eagle", "setting": "open field", "object": "storyboard", "twist": "peril and rescue in seven shots"}, suffix="c")

add(2015, 5, "Optional (Visual Communication) 5d", "visual", "Suraksha gas-cylinder booklet", """
The government is starting a home-safety campaign called **'Suraksha'** (safety) to make citizens aware of safety with household appliances. Support it with a section of an information booklet on gas cylinders.

1. Design a logo for the campaign title 'Suraksha'.
2. Identify four problems users face while changing a domestic gas cylinder.
3. Lay out one 6 × 6 inch booklet page that illustrates those four problems as a clear, safe sequence, using text minimally or not at all.
""", ["Booklet page 6 × 6 inches", "Minimal or no text"],
    even("Quality of visual renderings", "Appropriate selection of views of objects and actions", "Effectiveness of presentation in minimal space", "Clarity in the structure and sequencing of information"),
    {"user": "households", "setting": "home kitchen", "object": "logo and booklet page", "twist": "minimal or no text", "hook": "LPG safety campaign"}, suffix="d")

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

add(2016, 4, "Optional (Product Design)", "form", "Packable solar cooker for site workers", """
Construction workers migrate frequently and are economically challenged; they could benefit from cooking with solar energy. Design a solar cooking unit for construction workers.

- It should be easy to assemble, store and transport.
- It should cook food for at least 20 people at a time.
- Packed, it should not exceed 2 ft × 3 ft × 2 ft.

Present quick sketches of two alternatives, then a neat freehand sketch of the final form, an exploded view, and the materials and processes.
""", ["Packed size within 2 ft × 3 ft × 2 ft", "Include an exploded view"],
    even("Originality of ideas", "Ability to understand the strengths and weaknesses of the user", "Appropriateness of materials and processes, and sustainability", "Ability to articulate design decisions and effectiveness of presentation"),
    {"user": "migrant construction workers", "setting": "construction site", "object": "solar cooker", "twist": "packed-size limit", "hook": "solar energy; migrant labour"}, session="-s1")

add(2016, 5, "Optional (Interaction Design)", "problem-id", "Soil tester for farmers", """
A smartphone manufacturer wants to develop a portable soil tester for farmers in India. It measures water content (very low to very high), pH level (alkaline to acidic) and fertiliser content (very low to very high). It has three probes that are inserted into the soil to take readings, and it can use components from smartphones.

1. Sketch the 3D form of the device.
2. Detail its graphical interface.
3. Illustrate one typical scenario of use, showing the interface and information flow with brief notes.
""", ["Three probes", "Smartphone components allowed"],
    even("Originality of ideas", "Ability to understand the strengths and weaknesses of the user", "Logic and flow in the interface, usability and appropriateness of information", "Ability to articulate design decisions and effectiveness of presentation"),
    {"user": "farmers", "setting": "farm field", "object": "soil tester", "hook": "agriculture; technology"}, session="-s1")

add(2016, 6, "Optional (Animation)", "sketching", "The Potter and the Wagher", """
A Gujarati folktale (from *Folktales of India*, 1987) is to be made into an animation film:

> A strong, tall potter and a very thin Wagher (a warrior) were neighbours, and their wives were friends. The potter's wife kept mocking the Wagher's wife: how could such a thin man ever face a foe? One day the drums thundered as outlaws entered the village. The potter hid on his verandah. The Wagher took his sword, walked into the potter's house, picked up a crowbar and, telling the potter's wife to watch whether he was brave, bent it into a collar around her neck. Then he went out and drove the outlaws from the village. Ashamed, the potter's wife finally asked the Wagher's wife to have the collar removed. "My husband gets such strength only when the drums thunder and danger is near," she replied. "When that time returns, you will be set free."

Create a storyboard of this story in **six frames** that include all the major events.
""", ["Six frames", "Include all the major events"],
    even("Clarity, continuity and plot structure", "Visual continuity", "Point of view", "Character design"),
    {"user": "villagers", "setting": "village", "object": "storyboard", "twist": "compress a folktale into six frames", "hook": "Indian folktale"}, session="-s1")

add(2016, 7, "Optional (Visual Communication)", "visual", "IIT Goa symbol and logo", """
A new Indian Institute of Technology is starting in Goa. Design a **symbol** (a visual representation of the ideas associated with the institute) and a **logo** (the way the institute's name is depicted).

They must work in black & white and in colour, at all sizes, on stationery, vehicles, websites and buildings. They should reflect: technology, world-class education, research and development, India and Goa.

1. Sketch three quick alternatives.
2. Present the final symbol and logo neatly.
3. Show them applied on a letterhead.
""", ["Must work in black & white and colour", "Must work at all sizes"],
    even("Originality of ideas", "Ability to understand and reflect the keywords of the brief", "Clarity of thought and effectiveness of presentation", "Ability to create an identity that works across media"),
    {"user": "institution", "setting": "education", "object": "symbol and logo", "hook": "new Indian institution; Goa"}, session="-s1")

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

add(2016, 4, "Optional (Product Design)", "problem-id", "Bicycle toy-vendor kit", """
Cities have many vendors who move around selling goods, using hand carts and other accessories because they lack dedicated space. Design a system or set of accessories to be used with an **existing bicycle**, so that a vendor can move around and sell **toys for kids**.

The vendor should be able to display and sell when parked, and pack up and move. Consider ease of assembly, materials and manufacturing, ease of use, a child-friendly display, and ease of opening and packing up.

Present quick sketches of two alternatives, then the final concept with all details, its materials and processes, and a brief note on your decisions.
""", ["Works with an existing bicycle"],
    even("Originality and innovative use of material in constrained situations", "Ability to understand the needs of the seller and buyers", "Appropriateness of materials, processes, assembly, deployment and transport", "Ability to articulate design decisions and effectiveness of presentation"),
    {"user": "itinerant vendor; child buyers", "setting": "city street", "object": "bicycle accessory kit", "twist": "sell when parked, pack up to move", "hook": "informal economy"}, session="-s2")

add(2016, 5, "Optional (Interaction Design)", "problem-id", "Science museum guide for children", """
A science museum that admits only children aged 10–14 wants a digital handheld guide, handed out at entry, that helps children understand the exhibits and their underlying concepts. It should work for a single child and for children in groups.

1. Sketch the 3D form of the device and give it a name.
2. Detail its graphical interface.
3. Illustrate one typical scenario of use, showing the interface and information flow with brief notes.
""", ["Must work for one child and for groups"],
    even("Originality of ideas", "Ability to understand the strengths and weaknesses of the user", "Logic and flow in the interface, usability and appropriateness of information", "Ability to articulate design decisions and effectiveness of presentation"),
    {"user": "children aged 10–14", "setting": "science museum", "object": "handheld guide", "hook": "education; technology"}, session="-s2")

add(2016, 6, "Optional (Animation)", "sketching", "Dhanna Bhagat's gourds", """
A Rajasthani folktale is to be made into an animation film:

> Dhanna Singh, a young farmer, was so generous that his father thought him good for nothing. One day his father sent him to the weekly market to sell the farm's produce and buy seeds for the new crop. On the way Dhanna gave a ride to four priests and gifted them half the produce; then he gave the rest to an old woman crying by the road, thrown out of her house by her son. She gave him a few seeds in return. Dhanna planted them and told his father the seeds were sown. Weeks later his father found only wild gourds that goats eat. In anger he dashed one to the ground; it burst open, full of diamonds and emeralds. From then on he called his son Dhanna Bhagat and never scolded him for his generosity.

Create a storyboard of this story in **six frames** that include all the major events.
""", ["Six frames", "Include all the major events"],
    even("Clarity, continuity and plot structure", "Visual continuity", "Point of view", "Character design"),
    {"user": "farmer and father", "setting": "rural Rajasthan", "object": "storyboard", "twist": "compress a folktale into six frames", "hook": "Indian folktale"}, session="-s2")

add(2016, 7, "Optional (Visual Communication)", "visual", "AMRC Karnataka symbol and logo", """
A new Ayurvedic Medical Research Centre (AMRC) is being set up in Karnataka to research fields related to Ayurveda. Design a **symbol** (a visual representation of the ideas associated with the centre) and a **logo** (the centre's name in letterforms). The logo must show "AMRC Karnataka" in English.

They must work in black & white and in colour, at all sizes, on stationery, vehicles, websites and buildings. They should reflect: Ayurveda, India, research and development.

1. Sketch three quick alternatives.
2. Present the final symbol and logo neatly.
3. Show them applied on a letterhead.
""", ["Logo shows \"AMRC Karnataka\" in English", "Must work in black & white and colour, at all sizes"],
    even("Originality of ideas", "Ability to understand and reflect the keywords of the brief", "Clarity of thought and effectiveness of presentation", "Ability to create an identity that works across media"),
    {"user": "institution", "setting": "health research", "object": "symbol and logo", "hook": "Ayurveda; Indian tradition"}, session="-s2")

# ---------- 2017 ----------
add(2017, 1, "Industrial Design", "problem-id", "Motorised chassis in a hospital", """
You are given a base (chassis) of 100 cm × 75 cm, as shown below. It has:

- an inbuilt motor and battery-charger system
- capacity to carry a maximum load of 200 kg (apart from its own weight)
- a maximum speed of 5 km/h

You are free to add other parts and accessories to make it a complete, stable product.

1. Using this platform, sketch 3 quick ideas for its use in a **hospital**.
2. Pick one and list 5 critical factors you will consider.
3. Sketch the concept with its functional details, features, usage and materials.
""", ["Use the given chassis"],
    even("Critical thinking, identification of user needs and understanding of the context", "Problem solving and appropriateness of the solution", "Ability to explain details and features through sketching", "Knowledge of materials and processes"),
    {"user": "patients and hospital staff", "setting": "hospital", "object": "motorised platform", "twist": "given platform, find the use", "hook": "technology"},
    ["Outline drawing of a flat rectangular motorised chassis on four wheels with a battery box mounted at one end."])

add(2017, 2, "Communication Design", "visual", "Malaria poster for Shaaradapur", """
Shaaradapur is an Indian village with a multilingual, low-literate population. A lack of awareness about health and hygiene has led to an outbreak of malaria. Malaria is a mosquito-borne disease; its symptoms include fever, headache, vomiting and fatigue, and if left untreated it can be life-threatening. Timely diagnosis and treatment by a trained practitioner at the village government hospital is important. It can be prevented by draining stagnant water and spraying insecticides; bites can be avoided with mosquito nets and repellents.

Design a poster for the villagers, to be displayed prominently in a public place, that communicates (a) the seriousness, (b) the symptoms, (c) the actions to be taken and (d) the prevention of malaria.

Then sketch the poster in the location you choose, and write 3 sentences justifying the location, size and way it is displayed.
""", ["Readers are multilingual and low-literate"],
    even("Ability to understand the design brief", "Clarity of thought and articulation", "Creativity", "Presentation"),
    {"user": "low-literate villagers", "setting": "village public place", "object": "health poster", "twist": "choose where it hangs", "hook": "public health; multilingual India"})

add(2017, 3, "Animation Design", "sketching", "Priya, the cat and the bird", """
An animation film for 5 to 12 year old children is in pre-production. It is about 10-year-old Priya and her cat. Here is the shot breakdown of one sequence:

1. On a bright day, Priya plays with her cat in the garden.
2. The cat's attention is diverted by a little bird singing on a tree.
3. The cat climbs the tree and creeps along the branch where the bird is perched.
4. Priya watches anxiously from below.
5. As the cat approaches, the branch breaks and the bird flies away.
6. Shocked, Priya runs to catch the falling cat.
7. Priya trips and falls.
8. Terrified, she looks up to see the cat land safely on its feet.
9. Priya picks up the cat and scolds her.
10. Then she gives the cat a warm hug; the cat meows back with a big smile.

Storyboard this sequence in **eight frames** (combine shots where needed).
""", ["Eight frames"],
    even("Communication of the narrative through sequential pictures", "Shot composition and perspective", "Character attitudes and expressions", "Quality of sketching"),
    {"user": "child (girl); cat; bird", "setting": "garden", "object": "storyboard", "twist": "ten shots into eight frames"})

add(2017, 4, "Interaction Design", "problem-id", "RTO licence kiosk", """
About 500 people visit the city Regional Transport Office (RTO) every day for a driving licence; some cannot read. The RTO is short-staffed. To get a learner's licence, a user fills a form, takes an objective test, and submits copies of age proof, address proof, a phone number, fingerprints and a photograph. After a month with a learner's licence, the user may apply for a permanent licence, choose a date for a driving test, and is then issued the licence.

The RTO will put an interactive public information system in its lobby for learner's and permanent licence applicants (typically 18–20 years old).

1. Write, in about 20 words, the needs of the different users and the information the system should provide. State your assumptions about technology.
2. Sketch the lobby showing where the system sits and how people use it.
3. Show one scenario (submitting an application) as a short screen sequence that solves a specific problem the user faces.
""", ["User needs in about 20 words"],
    even("Ability to understand the needs of users", "Originality", "Logic and flow in the interface, usability and appropriateness of information", "Presentation"),
    {"user": "licence applicants, some who cannot read", "setting": "RTO lobby", "object": "public kiosk", "twist": "design for users who cannot read", "hook": "public services"})

add(2017, 5, "Mobility and Vehicle Design", "form", "Electric two-wheeler taxi for Banaras", """
A company plans to introduce an **electric two-wheeler taxi** in Banaras (Varanasi) for local commuters and pilgrims. Design it so that it is relevant to the city in function and aesthetics.

1. Identify five distinct factors essential for this vehicle.
2. Draw a neat side elevation of the vehicle.
3. Draw a neat freehand perspective sketch showing the overall form and its features, and indicate materials for the body.
""", ["Side elevation and perspective view"],
    even("User-centric design considerations", "Form and originality", "Feasibility and effectiveness of the design solution", "Quality of sketch and appropriateness of materials"),
    {"user": "commuters and pilgrims", "setting": "Varanasi streets", "object": "electric two-wheeler taxi", "pov": "side elevation and perspective", "hook": "electric mobility; Indian city"})

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
add(2018, 1, "Industrial Design", "problem-id", "One-handed milk-pouch aid", """
Mr. Chatterjee, a right-handed person, recently lost his right hand in an accident. He lives alone and finds everyday activities difficult. Every morning a standard 500 ml milk pouch is delivered to his home, and he struggles to cut it open and pour the milk into a utensil to heat it.

Design a product that helps him, with one hand, to:

- lift and support the pouch
- cut the pouch
- pour the milk without spilling
- discard the empty pouch

Present neat freehand sketches of the form and its features, sketches of the usage scenario, the materials and processes, and a note on your decisions (max 50 words).
""", ["One-handed use (left hand)", "Note max 50 words"],
    even("User-centric design considerations", "Feasibility and overall effectiveness of the solution", "Appropriateness of materials and processes", "Originality, attention to detail and quality of presentation"),
    {"user": "amputee living alone", "setting": "home kitchen", "object": "milk-pouch aid", "twist": "only the non-dominant hand", "hook": "accessibility; Indian milk pouch"})

add(2018, 2, "Communication Design", "visual", "The Art of Optical Illusion cover", """
An optical illusion uses colour, light and patterns to create images that deceive our brains. Akihito Yujumari, an established artist and author, is releasing his 25th book, documenting the greatest optical illusions of the world. He has commissioned you to design its cover.

- Title: *The Art of Optical Illusion*
- Author: Akihito Yujumari
- Publisher: Square Book Publishers
- ISBN-13: 93-34567898765 (with barcode)
- Book dimensions: 22.9 × 2.2 × 25.4 cm

Design:

1. The **front cover**, with the author's name and the title.
2. The **spine**, with the title, the author's name and the publisher's logo and name.
3. The **back cover**, with the ISBN and barcode and this paragraph: "This intriguing collection contains more than 275 optical illusions that appear to change before your eyes. Akihito Yujumari has carefully selected every type of optical illusion, which intrigues the mind and delights the eye, along with notes about the science behind each illusion."
""", ["Keep the given dimensions in proportion"],
    even("Ability to understand the design brief", "Originality and creativity of ideas", "Design sensitivity and attention to details", "Neatness and effectiveness of presentation"),
    {"user": "general readers", "object": "book cover, spine and back", "twist": "the cover itself should play with perception", "hook": "perception science"})

add(2018, 3, "Animation Design", "sketching", "The crow and the biscuits", """
An animation film for children is based on the relationship between a crow and a man. One scene:

> The man is about to have breakfast in the garden: a cup of tea and a plate of biscuits on the table. A crow on a nearby tree eyes the biscuits. The man gets a phone call and walks back and forth talking. The crow swoops down onto the table. The man notices and shoos it away. He finishes his call and sits down. The crow caws insistently; the man feels sorry for it and throws a biscuit in the air. The crow catches it midair. The crow and the man are happy!

Storyboard this scene in **six frames**, using a variety of shots (long shot, close-up, top angle, low angle etc.).
""", ["Six frames", "Vary the shots"],
    even("Communication of the narrative through sequential pictures", "Shot composition (long shot, close-up, top and low angles)", "Perspective", "Attitude and expressions of the characters"),
    {"user": "man; crow", "setting": "garden", "object": "storyboard", "twist": "shot variety is scored"})

add(2018, 4, "Interaction Design", "visual", "ASHA app icons", """
ASHA workers are local women trained as village health educators and monitors. One key task is keeping the health records of pregnant women, until now in paper booklets. The health ministry is moving these records to a smartphone app that every ASHA worker will use on home visits: she retrieves a woman's record, measures her weight, blood sugar and blood pressure, enters them, and the app flags any risk.

Design a consistent set of icons for this app:

1. the app itself
2. age of the foetus
3. weight
4. blood sugar
5. blood pressure

Draw each icon in a 5 cm × 5 cm square.
""", ["Each icon in a 5 cm × 5 cm square", "One consistent visual language"],
    even("Consistency of visual language", "Appropriateness to the users and context", "Effective communication", "Composition, clarity and neatness"),
    {"user": "village health workers; pregnant women", "setting": "rural home visits", "object": "app icon set", "hook": "rural public health; digitisation"})

add(2018, 5, "Mobility and Vehicle Design", "form", "Bookseller's kiosk two-wheeler", """
A roadside bookseller wants a new two-wheeler that also serves as a book display kiosk. He uses it as a kiosk during the day, and in the evenings or at weekends he wants to take his family out on trips. It must let him:

- travel from home to a crowded market
- set up the kiosk to sell 100 books
- store the books and fold the kiosk away safely and securely
- go out with his family at weekends

Present: a few quick sketches of the key factors, a neat side elevation, and a perspective sketch of the final concept with its detailing and materials.
""", ["Side elevation and perspective view"],
    even("Design insights leading to novel ideas", "Concept exploration through good quality sketches", "Presentation of the final concept through rendering", "Detailing and appropriate materials"),
    {"user": "bookseller and his family", "setting": "street market", "object": "two-wheeler kiosk", "pov": "side elevation and perspective", "twist": "shop by day, family vehicle at weekends", "hook": "informal economy"})

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
add(2019, 1, "Industrial Design", "form", "Monsoon clothes-drying fan", """
During the monsoon, washed clothes take a long time to dry and the house is damp. People often spread wet clothes on a chair or other furniture under a ceiling fan. A leading fan manufacturer wants a clothes-drying product, sold with a fan, that:

- uses the fan to dry clothes
- has the fan integrated during the rainy season, and usable as a normal fan in other seasons
- folds compact for storage

1. Present three ideas as rough sketches. (5 marks)
2. List five critical factors (key words only). (5 marks)
3. Develop one idea into a final product: a neat sketch showing all its parts, materials and features. (10 marks)
""", ["Must work as a normal fan off-season", "Folds compact"],
    marks(("Quality of creative ideas and neatness of sketches", 10), ("Understanding of the situation and product use", 10), ("Sketching quality, details, product features and usability", 20)),
    {"user": "household", "setting": "home in monsoon", "object": "fan-integrated clothes dryer", "twist": "two products in one, by season", "hook": "monsoon"})

add(2019, 2, "Communication Design", "visual", "World Cup hoarding for team India", """
Cricket is a popular sport in India. The 12th Cricket World Cup is to be held in England and Wales in 2019. India has already been champion twice; to win a third time, the team needs the support and wishes of a billion Indians.

Design a visual campaign to gather support for the Indian team, centred on a **30 ft × 20 ft hoarding** placed at prominent locations in cities and towns.

1. Sketch three completely different concepts. (5 marks)
2. Write three slogans in English or any Indian language (name the language). (5 marks)
3. Make a detailed design of one hoarding with a slogan. (10 marks)
""", ["Hoarding 30 ft × 20 ft (keep the proportion)", "Slogans in English or any Indian language"],
    marks(("Originality and diversity of ideas, creativity, understanding of scale and proportion", 10), ("Clarity of message and literary creativity", 10), ("Visualisation, quality of lines, composition, colour and detailing", 20)),
    {"user": "general public", "setting": "cities and towns", "object": "campaign hoarding and slogans", "twist": "slogans in any Indian language", "hook": "cricket"})

add(2019, 3, "Animation Design", "sketching", "Tommy saves the baby", """
An animation film for children is about the bond between a baby and a dog, as the baby grows up and the dog grows old. One scene:

> A dog watches a hungry, crying baby. The baby suddenly sees something and stops: its milk bottle (and other things) on a table. The baby crawls to the table, followed by the curious dog, grabs a corner of the tablecloth and starts pulling. The dog's expression turns to alarm as the things slide towards the edge. He leaps forward, grabs the end of the baby's diaper and pulls the baby away just as everything topples. The baby is safe, but everything falls on the poor dog. The mother's scream is heard: "Tommy!! BAD DOG!!" The dog peeps out sheepishly from under the tablecloth, surrounded by the mess.

Storyboard this scene in **six frames**, using a variety of shots (long shot, close-up, top angle, low angle etc.).
""", ["Six frames", "Vary the shots"],
    even("Communication of the narrative through sequential pictures", "Shot composition (long shot, close-up, top and low angles)", "Perspective", "Attitude and expressions of the characters"),
    {"user": "baby; dog; mother", "setting": "home", "object": "storyboard", "twist": "the hero gets blamed", "hook": "humour and irony"})

add(2019, 4, "Interaction Design", "visual", "Bicycle navigator for 12-year-olds", """
A bicycle company has developed a navigation device: a colour display (not a touch screen), 7 physical buttons, a speaker, a microphone, GPS and wireless internet. It is waterproof, readable in bright sunlight, and charged by pedalling.

Design a version of this device, mounted on the bicycle, for **12-year-old children**.

1. Create a 5-step storyboard of the interface that lets the child set a new destination they have never been to. (10 marks)
2. Present one detailed screen showing the information that helps the child navigate while riding. (10 marks)
""", ["Not a touch screen: 7 physical buttons", "Five steps for the storyboard"],
    marks(("Appropriateness of the user interface and integration of hardware and software", 10), ("Originality and appropriateness of the information design", 10)),
    {"user": "children aged 12", "setting": "cycling on city streets", "object": "navigation interface", "twist": "buttons only, no touch", "hook": "GPS technology"})

add(2019, 5, "Mobility and Vehicle Design", "form", "Hill-region utility four-wheeler", """
Local improvised vehicles in rural India carry many people, small machines, farm equipment and even cattle and goats. They are neither safe nor comfortable, but they are indispensable and often the only transport available.

Design a context-sensitive, safe, workable and pleasing **four-wheeler for hilly regions** that:

- carries at least 6 passengers including the driver
- has a convertible space for at least 1 cattle, a small machine, milk cans or fuel drums, plus a tool kit (used by passengers when no goods are carried)
- protects against the weather (sunshades etc.)
- is easy to maintain

1. Explore the concept in two quick sketches that each show a distinct design insight. (10 marks)
2. Draw a neat freehand perspective sketch of the final vehicle showing its overall form and features. (10 marks)
""", ["Perspective view of the final vehicle"],
    marks(("Context-sensitivity, design insight and exploratory concepts", 10), ("Ability to sketch the vehicle in perspective and detail the final concept", 10)),
    {"user": "rural hill communities", "setting": "hilly rural roads", "object": "utility four-wheeler", "twist": "people one day, cattle the next", "hook": "rural India; improvised vehicles"})

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
