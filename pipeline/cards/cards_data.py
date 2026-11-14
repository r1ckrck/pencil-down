# Card source data. img: None (text-only), "svg" (diagram drawn in svgs.py), or a Commons search query / "File:..." title.
CARDS = []


def C(id, cat, pri, front, back, img=None, reveals=None):
    CARDS.append(dict(id="card-" + id, cat=cat, pri=pri, front=front, back=back.strip(), img=img, reveals=reveals))


MV = "Name the movement: dates, traits, key names."
# ---------------- art-movement ----------------
A = "art-movement"
C("renaissance", A, "P1", MV, """
**Renaissance**, c.14th–16th c., Italy
Linear perspective, balance, idealised classical figures
Leonardo, Michelangelo, Raphael · *Mona Lisa*, *Vitruvian Man*
""", "File:Mona Lisa, by Leonardo da Vinci, from C2RMF retouched.jpg")
C("baroque", A, "P1", MV, """
**Baroque**, c.1600–1750
Drama, chiaroscuro (strong light–dark), movement, rich darks
Caravaggio, Rembrandt, Vermeer, Bernini · CEED 2026 showed Vermeer's *Girl with a Pearl Earring*
""", "File:1665 Girl with a Pearl Earring.jpg")
C("realism", A, "P1", MV, """
**Realism**, c.1840s–1880s, France
Ordinary working life, unidealised, earthy palette
Courbet, Millet · *The Gleaners* (Millet, 1857)
""", "Millet Gleaners Google Art Project")
C("arts-and-crafts", A, "P1", MV, """
**Arts & Crafts**, c.1860–1910, Britain
Handcraft over machine, honest materials, nature patterns
William Morris, John Ruskin · *Strawberry Thief* textile (1883)
""", "Strawberry Thief Morris textile")
C("impressionism", A, "P1", MV, """
**Impressionism**, 1860s–1880s, France
Visible brushstrokes, light and its change, outdoor scenes, modern life
Monet, Renoir, Degas; Manet as forerunner · name from Monet's *Impression, Sunrise* (1872)
""", "Claude Monet, Impression, soleil levant")
C("post-impressionism", A, "P2", MV, """
**Post-Impressionism**, 1880s–1900s
Bold non-natural colour, expressive or structured form
Van Gogh, Gauguin, Cézanne, Seurat (pointillism) · *The Starry Night* (1889)
""", "Van Gogh Starry Night Google Art Project")
C("art-nouveau", A, "P1", MV, """
**Art Nouveau** (Jugendstil in Germany), c.1890–1910
Whiplash curves, plant forms, flat decorative women, ornament on everyday objects
Mucha, Gaudí, Horta, Guimard (Paris Métro), Mackintosh · CEED 2026 showed a *Jugend* magazine cover
""", "Alfons Mucha Job cigarette paper poster 1896")
C("vienna-secession", A, "P1", MV, """
**Vienna Secession**, 1897–, Austrian branch of Art Nouveau
Gold leaf, flat mosaic patterns, sensual figures
Gustav Klimt (*The Kiss*, 1907–08), Koloman Moser, Otto Wagner · Klimt paintings asked 2016
""", "The Kiss Gustav Klimt Google Cultural Institute")
C("cubism", A, "P1", MV, """
**Cubism**, 1907–1920s, Paris
Object broken into flat planes, several viewpoints at once, muted palette (analytic phase)
Picasso, Braque, Juan Gris · *Les Demoiselles d'Avignon* (Picasso, 1907)
""", "Juan Gris Portrait of Pablo Picasso")
C("futurism", A, "P2", MV, """
**Futurism**, 1909–1940s, Italy
Speed, machines, motion lines, dynamism
Marinetti (manifesto 1909), Boccioni, Balla · *Unique Forms of Continuity in Space* (1913)
""", "Boccioni Unique Forms of Continuity in Space")
C("dada", A, "P2", MV, """
**Dada**, 1916–1920s, Zurich then Berlin, Paris, New York
Anti-art, absurdity, chance, readymades, photomontage
Duchamp (*Fountain*, 1917, a signed urinal), Hannah Höch, Tzara
""", "Marcel Duchamp Fountain Stieglitz photograph")
C("surrealism", A, "P2", "Name the movement: melting clocks, dream imagery.", """
**Surrealism**, 1924– (Breton's manifesto), Paris
Dream logic, the unconscious, unexpected juxtapositions
Dalí (*The Persistence of Memory*, 1931), Magritte (*The Treachery of Images*), Ernst
""")
C("de-stijl", A, "P1", MV, """
**De Stijl**, 1917–1931, Netherlands
Black grid, primary colours plus white, only horizontals and verticals
Mondrian, van Doesburg, Rietveld (Red and Blue Chair, Schröder House) · asked 2026
""", "File:Piet Mondriaan, 1930 - Mondrian Composition II in Red, Blue, and Yellow.jpg")
C("constructivism", A, "P2", MV, """
**Constructivism**, c.1915–1930s, Russia
Diagonals, red and black, geometric blocks, photomontage, propaganda
Rodchenko, El Lissitzky (*Beat the Whites with the Red Wedge*, 1919), Tatlin
""", "Beat the Whites with the Red Wedge Lissitzky")
C("bauhaus", A, "P2", MV, """
**Bauhaus**, 1919–1933: Weimar → Dessau (building 1926) → Berlin
Form follows function, primary shapes, tubular steel, geometric sans, no ornament
Gropius (founder), Breuer, Mies, Kandinsky, Klee, Albers · Dessau centenary 2026
""", "Bauhaus Dessau building Gropius")
C("art-deco", A, "P1", MV, """
**Art Deco**, 1920s–30s (Paris Expo 1925)
Geometric luxury: zigzags, sunbursts, chrome, stepped forms, streamlining
Cassandre, Erté, Lalique · Chrysler Building (1930) · asked 2018 ordering
""", "Chrysler Building spire Art Deco")
C("modernisme", A, "P2", MV, """
**Catalan Modernisme** (Spanish Art Nouveau), c.1888–1911
Organic, bone-like and wave forms, broken-tile mosaic (trencadís)
Antoni Gaudí (d. 1926): Casa Batlló, Sagrada Família (still being completed)
""", "Casa Batlló facade Barcelona")
C("mid-century-modern", A, "P2", MV, """
**Mid-century Modern**, 1945–1970
Moulded plywood, fibreglass, organic shells, tapered legs
Charles & Ray Eames, Saarinen, Arne Jacobsen, Bertoia · Eames Lounge Chair (1956)
""", "Eames Lounge Chair and Ottoman")
C("swiss-style", A, "P2", "Name the movement: grid, sans-serif, asymmetric posters.", """
**Swiss Style** (International Typographic Style), 1950s–
Strict grid, asymmetric layout, sans-serif (Helvetica, Univers), objective photos, flush-left text
Josef Müller-Brockmann, Armin Hofmann, Emil Ruder
""")
C("pop-art", A, "P1", "Name the movement: comic panels, Ben-Day dots, soup cans.", """
**Pop Art**, 1950s–60s, UK and USA
Mass media and ads, comic Ben-Day dots, repetition, flat bright colour
Warhol (*Campbell's Soup Cans*, 1962), Lichtenstein (*Drowning Girl*, asked 2026), Richard Hamilton
""")
C("op-art", A, "P2", "Name the movement: black-and-white patterns that seem to move.", """
**Op Art**, 1960s
Optical illusion: patterns that vibrate, bulge or flicker
Bridget Riley (*Movement in Squares*, 1961), Victor Vasarely
""")
C("minimalism-braun", A, "P2", "Name the design approach: \"less, but better\".", """
**German functionalism / minimalism**, 1950s–
Restraint, grid, neutral colours, only what the function needs
Dieter Rams at Braun (SK4 radio-phono 1956, T3 radio); his 10 principles of good design
""", "Braun SK 4 Rams Gugelot")
C("memphis", A, "P2", "Name the movement: clashing colours, laminate squiggles, totem bookcase.", """
**Memphis Group**, 1981–1987, Milan
Clashing colour, plastic laminates, squiggle and terrazzo patterns, playful anti-function
Ettore Sottsass (Carlton room divider, 1981), Michele De Lucchi
""")
C("postmodernism", A, "P2", MV, """
**Postmodernism**, 1970s–90s
Irony, historical quotation, colour and ornament return
Venturi ("Less is a bore"), Michael Graves, Mendini, Starck (Juicy Salif, Alessi, 1990)
""", "Juicy Salif Starck")
C("order-2015", A, "P1", "Put in time order: Cubism, Renaissance, Realism, Baroque.", """
**Renaissance → Baroque → Realism → Cubism**
14th–16th c. → 1600–1750 → 1840s–80s → 1907–
Asked 2015 Q19
""")
C("order-2018", A, "P1", "Put in time order: Art Deco, Baroque, Arts & Crafts, Renaissance.", """
**Renaissance → Baroque → Arts & Crafts → Art Deco**
14th–16th c. → 1600–1750 → 1860–1910 → 1920s–30s
Asked 2018 Q23
""")
C("order-modern", A, "P2", "Put in time order: Bauhaus, Art Nouveau, Pop Art, Impressionism, Memphis.", """
**Impressionism (1860s) → Art Nouveau (1890) → Bauhaus (1919) → Pop Art (1950s) → Memphis (1981)**
""")
C("rembrandt", A, "P1", "Whose painting? Name the painter and movement.", """
**Rembrandt van Rijn** (1606–1669), Dutch **Baroque**
Deep shadows, warm browns, many self-portraits
*The Night Watch* (1642) · asked 2016
""", "Rembrandt Night Watch Rijksmuseum")
C("van-gogh", A, "P1", "Whose painting? Name the painter and movement.", """
**Vincent van Gogh** (1853–1890), **Post-Impressionism**
Thick swirling impasto strokes, intense yellows and blues
*Sunflowers*, *The Starry Night*, self-portraits · asked 2017
""", "Van Gogh Sunflowers National Gallery London")
C("gauguin", A, "P1", "Whose painting? Name the painter and movement.", """
**Paul Gauguin** (1848–1903), **Post-Impressionism**
Flat areas of bold colour, outlined forms, Tahiti subjects
*Where Do We Come From? What Are We? Where Are We Going?* (1897) · asked 2017
""", "Paul Gauguin Where Do We Come From Boston")
C("picasso", A, "P1", "Picasso: name his periods and signature works.", """
**Pablo Picasso** (1881–1973), Spanish, worked in France
Blue Period (1901–04) → Rose Period (1904–06) → **Cubism** with Braque (from 1907)
*Les Demoiselles d'Avignon* (1907), *Guernica* (1937) · CEED 2023 called the Blue Period palette analogous
""")

# ---------------- indian-painting ----------------
P = "indian-painting"
PF = "Name the painting style, its state and materials."
C("warli", P, "P1", PF, """
**Warli**, Maharashtra (Thane–Palghar), Warli tribe
White rice paste on red-brown mud wall; circles, triangles, lines only
Tarpa dance circle, harvest scenes · asked 2020; 2025 drew dancers in Warli style
""", "Warli painting tarpa dance")
C("madhubani", P, "P1", PF, """
**Madhubani (Mithila)**, Bihar
Double-line outlines, every gap filled with pattern, no empty space
Natural dyes, painted by women; fish, deities, *kohbar* (wedding-chamber motif) · asked 2020
""", "Madhubani painting Mithila")
C("kalamkari", P, "P1", PF, """
**Kalamkari**, Andhra Pradesh: Srikalahasti (freehand with a bamboo *kalam* pen), Machilipatnam (block-printed)
Cotton cloth, natural dyes, myrobalan and alum mordants
Earthy reds, indigo, black; temple epics · asked 2020
""", "Srikalahasti Kalamkari")
C("mysore", P, "P1", PF, """
**Mysore painting**, Karnataka (Wodeyar patronage)
Thin gesso relief with gold foil, subtle colours, delicate lines
Deities; lower relief and quieter than Tanjore · asked 2020
""", "Mysore painting traditional")
C("tanjore", P, "P2", PF, """
**Tanjore (Thanjavur)**, Tamil Nadu
Raised gesso relief, heavy gold foil, glass and gem inlay, wooden plank base
Rich reds and greens, round-faced Krishna · heavier than Mysore
""", "Tanjore painting Krishna")
C("pattachitra", P, "P1", PF, """
**Pattachitra**, Odisha (Raghurajpur) and West Bengal
Cloth (*patta*) coated with chalk + tamarind-seed gum; natural pigments (conch-shell white, lamp black)
Jagannath and epic scenes, ornate borders · asked 2024 (materials)
""", "Pattachitra Raghurajpur")
C("gond", P, "P2", "Name the painting style and where it is from.", """
**Gond**, Madhya Pradesh, Gond tribe
Animals and trees filled with dots, dashes and fine lines; bright flat colour
Jangarh Singh Shyam brought it to canvas (1980s)
""", "Gond painting tree")
C("kalighat", P, "P2", PF, """
**Kalighat**, Kolkata, 19th c., near Kalighat temple
Watercolour on mill paper, bold sweeping outlines, plain background
Deities and satire of the *babu*
""", "Kalighat painting")
C("pichwai", P, "P2", PF, """
**Pichwai**, Nathdwara, Rajasthan
Large cloth hangings behind the Shrinathji (Krishna) idol
Lotus ponds, cows, festival scenes, dark backgrounds
""", "Pichwai Nathdwara Shrinathji")
C("phad", P, "P2", PF, """
**Phad**, Rajasthan (Bhilwara, Shahpura)
Long horizontal cloth scroll, epics of Pabuji and Devnarayan
Sung and performed by Bhopa priests; Joshi family painters
""", "Phad painting Pabuji")
C("cheriyal", P, "P3", "Name the painting style and where it is from.", """
**Cheriyal scroll**, Telangana
Bold red backgrounds, narrative panels in long scrolls
Used by storytellers; Nakash family painters
""", "Cheriyal scroll painting")
C("mughal-miniature", P, "P2", "Name the painting style and where it is from.", """
**Mughal miniature**, 16th–18th c., Akbar's and Jahangir's ateliers
Persian + Indian: court scenes, portraits, naturalistic animals and birds
Fine brush, gold borders · Mansur (animal studies), *Akbarnama*
""", "Mughal miniature Akbarnama")
C("rajput-miniature", P, "P2", "Name the painting style and where it is from.", """
**Rajput miniature**, Rajasthan: Mewar, Bundi, Kishangarh
Flat bright colour, stylised faces; Kishangarh's *Bani Thani* has elongated eyes
Krishna legends, ragamala, court life
""", "Bani Thani Kishangarh painting")
C("pahari-kangra", P, "P2", "Name the painting style and where it is from.", """
**Pahari / Kangra**, Himachal Pradesh (Kangra, Basohli, Guler)
Lyrical, soft greens, delicate figures; Radha–Krishna romance
Basohli is bolder; Nainsukh of Guler is the best-known painter
""", "Kangra painting Radha Krishna")
C("ravi-varma", P, "P1", "Whose painting? Name the painter and subject.", """
**Raja Ravi Varma** (1848–1906), Kerala
Oil, European academic realism applied to Indian myths
This one: *Shakuntala* · also *Damayanti*, *Lakshmi*, *Saraswati*; oleograph press 1894 · asked 2018
""", "Raja Ravi Varma Shakuntala")
C("sher-gil", P, "P2", "Whose painting? Name the painter.", """
**Amrita Sher-Gil** (1913–1941)
Modern Indian oil painter; flat, muted, melancholic Indian women
*Three Girls* (1935)
""", "Amrita Sher-Gil Three Girls")
C("bengal-school", P, "P2", "Name the painter and the art movement.", """
**Bengal School**, early 20th c.: Abanindranath Tagore, *Bharat Mata* (1905)
Soft Japanese-style wash, Indian and Mughal sources, against Ravi Varma's European style
Nandalal Bose (Santiniketan)
""", "Abanindranath Tagore Bharat Mata")
C("progressive-artists", P, "P3", "Progressive Artists' Group: when, where, who?", """
**Bombay, 1947**, founded by F.N. Souza
S.H. Raza (the *Bindu*), M.F. Husain (horses), K.H. Ara, S.K. Bakre, H.A. Gade
Indian modernism after Independence
""")

# ---------------- indian-dance ----------------
D = "indian-dance"
DF = "Name the dance and its state."
C("bharatanatyam", D, "P1", DF, """
**Bharatanatyam**, Tamil Nadu
Half-sitting *aramandi*, fan-pleated costume, crisp geometric lines
Solo · CEED 2025 showed it drawn as a Warli-style figure
""", "Bharatanatyam dancer aramandi")
C("kathakali", D, "P1", DF, """
**Kathakali**, Kerala
Dance-drama: green face (*pacha*), huge headdress, full skirt, traditionally men
Asked 2025
""", "Kathakali performer pacha")
C("manipuri", D, "P1", DF, """
**Manipuri**, Manipur
*Ras Lila*: stiff cylindrical mirror-work skirt (*potloi*), veil, soft flowing moves
CEED 2025 showed it drawn as a Warli-style figure
""", "Manipuri dance Ras Lila potloi")
C("chhau", D, "P1", DF, """
**Chhau**, semi-classical, martial: Purulia (West Bengal, masks), Seraikela (Jharkhand, masks), Mayurbhanj (Odisha, no masks)
Big painted masks, leaps, epic themes · asked 2025
""", "Purulia Chhau dance mask")
C("odissi", D, "P1", DF, """
**Odissi**, Odisha
*Tribhangi* (three-bend) pose, silver jewellery, temple-tower headdress
Asked 2015
""", "Odissi dancer tribhanga")
C("kuchipudi", D, "P1", DF, """
**Kuchipudi**, Andhra Pradesh
Dance-drama; signature: dancing on the rim of a brass plate (*tarangam*)
Asked 2015 (as an option)
""", "Kuchipudi dancer")
C("kathak", D, "P2", DF, """
**Kathak**, North India (Lucknow, Jaipur, Banaras gharanas)
Fast spins (*chakkar*), footwork with heavy ankle bells, Mughal-style *angarkha*
Only classical form from the north
""", "Kathak dancer chakkar")
C("mohiniyattam", D, "P2", DF, """
**Mohiniyattam**, Kerala
White and gold *kasavu* sari, side bun with jasmine, swaying gentle moves
Solo, traditionally women
""", "Mohiniyattam dancer")
C("sattriya", D, "P2", DF, """
**Sattriya**, Assam
From Vaishnava monasteries (*sattras*) founded by Sankaradeva
Recognised as classical in 2000
""", "Sattriya dance Assam")
C("classical-list", D, "P1", "List India's classical dances with their states.", """
Bharatanatyam (TN) · Kathak (North) · Kathakali, Mohiniyattam (Kerala) · Kuchipudi (AP)
Odissi (Odisha) · Manipuri (Manipur) · Sattriya (Assam)
Chhau is often added as semi-classical (WB, Jharkhand, Odisha)
""")
C("order-2025", D, "P1", "Four dancers drawn as Warli stick figures: stiff cylinder skirt · big mask · fan-pleated costume · huge headdress. Name each dance.", """
**Manipuri** (cylinder skirt) · **Chhau** (mask) · **Bharatanatyam** (fan pleats) · **Kathakali** (headdress)
In stick figures, read the costume outline (CEED 2025)
""")

# ---------------- indian-monument ----------------
M = "indian-monument"
MF = "Name the monument, its city and its style."
C("golden-temple", M, "P2", MF, """
**Harmandir Sahib (Golden Temple)**, Amritsar, Punjab · ~31.6° N
Gilded upper storeys in a sacred pool; Sikh architecture
Northernmost of the monuments usually asked in north → south questions
""", "Golden Temple Amritsar")
C("qutub-minar", M, "P2", MF, """
**Qutub Minar**, Delhi · ~28.5° N
73 m fluted red sandstone tower, begun c.1199 by Qutb-ud-din Aibak
Delhi Sultanate, UNESCO
""", "Qutub Minar Delhi")
C("humayuns-tomb", M, "P1", MF, """
**Humayun's Tomb**, Delhi · ~28.6° N
1570, Mughal; first garden tomb (charbagh), red sandstone with white marble, double dome
Prototype for the Taj · northernmost in CEED 2026's north → south question
""", "Humayun's Tomb Delhi")
C("taj-mahal", M, "P2", MF, """
**Taj Mahal**, Agra · ~27.2° N
Shah Jahan, 1632–1653; white Makrana marble, pietra dura inlay, four minarets
Mughal, UNESCO
""", "Taj Mahal Agra")
C("fatehpur-sikri", M, "P3", MF, """
**Fatehpur Sikri / Buland Darwaza**, near Agra · ~27.1° N
Akbar's red sandstone capital (1570s); Buland Darwaza gate
Mughal
""", "Buland Darwaza Fatehpur Sikri")
C("hawa-mahal", M, "P1", MF, """
**Hawa Mahal**, Jaipur · ~26.9° N
1799, pink sandstone screen of 953 small windows (*jharokhas*) for air and seeing out unseen
Rajput style · 2nd of 6 in CEED 2026's north → south question
""", "Hawa Mahal Jaipur")
C("khajuraho", M, "P2", MF, """
**Khajuraho temples**, Madhya Pradesh · ~24.9° N
Chandela dynasty, c.950–1050; **Nagara** style, rising shikharas, dense sculpture
UNESCO
""", "Kandariya Mahadeva Temple Khajuraho")
C("sanchi", M, "P2", MF, """
**Great Stupa, Sanchi**, Madhya Pradesh · ~23.5° N
Begun by Ashoka, 3rd c. BCE; hemispherical dome, four carved gateways (*toranas*)
Buddhist, UNESCO
""", "Sanchi Stupa gateway")
C("modhera", M, "P1", MF, """
**Modhera Sun Temple**, Gujarat · ~23.6° N
1026, Solanki dynasty; **Maru-Gurjara** style; stepped tank (*kund*) in front
Style asked 2016
""", "Modhera Sun Temple")
C("victoria-memorial", M, "P2", MF, """
**Victoria Memorial**, Kolkata · ~22.5° N
1921, William Emerson; white Makrana marble; **Indo-Saracenic** with classical dome
""", "Victoria Memorial Kolkata")
C("konark", M, "P1", MF, """
**Konark Sun Temple**, Odisha · ~19.9° N
13th c., Narasimhadeva I; temple as the Sun's chariot, 24 carved stone wheels, 7 horses
**Kalinga** style (asked 2016), UNESCO
""", "Konark Sun Temple wheel")
C("lingaraj", M, "P2", MF, """
**Lingaraj Temple**, Bhubaneswar · ~20.2° N
11th c.; **Kalinga** style: curved tower (*rekha deula*) + stepped-roof hall (*pidha deula*)
""", "Lingaraja Temple Bhubaneswar")
C("ajanta", M, "P1", MF, """
**Ajanta Caves**, Maharashtra · ~20.5° N
Buddhist rock-cut caves, 2nd c. BCE–5th c. CE; famous murals (Padmapani)
Rock-cut chaitya type asked 2026
""", "Ajanta Caves panorama")
C("ellora-kailasa", M, "P1", MF, """
**Kailasa temple (Ellora Cave 16)**, Maharashtra · ~20.0° N
8th c., Rashtrakuta (Krishna I); one monolith carved top-down from the cliff
Buddhist, Hindu and Jain caves at Ellora
""", "Kailasa temple Ellora")
C("karla-chaitya", M, "P1", "Name the rock-cut hall type and a famous example.", """
**Chaitya hall**: Buddhist rock-cut prayer hall, apsidal plan, stupa at the end, horseshoe window
Karla (Maharashtra, ~18.8° N, largest), Ajanta Caves 19 and 26 · 3rd of 6 in CEED 2026's north → south question
""", "Karla Caves chaitya interior")
C("gateway-of-india", M, "P3", MF, """
**Gateway of India**, Mumbai · ~18.9° N
1924, George Wittet; basalt arch; **Indo-Saracenic**
""", "Gateway of India Mumbai")
C("charminar", M, "P2", MF, """
**Charminar**, Hyderabad · ~17.4° N
1591, Muhammad Quli Qutb Shah; square arch with four minarets
Qutb Shahi
""", "Charminar Hyderabad")
C("gol-gumbaz", M, "P2", MF, """
**Gol Gumbaz**, Vijayapura (Bijapur), Karnataka · ~16.8° N
1656, tomb of Mohammed Adil Shah; huge dome, whispering gallery
Deccan Sultanate
""", "Gol Gumbaz Bijapur")
C("pattadakal", M, "P1", MF, """
**Pattadakal**, Karnataka · ~15.9° N
7th–8th c., **Chalukya** (asked 2016); Nagara and Dravida temples side by side
Badami and Aihole nearby · UNESCO
""", "Pattadakal temples")
C("hampi-chariot", M, "P1", MF, """
**Stone chariot, Vittala temple, Hampi**, Karnataka · ~15.3° N
16th c., Vijayanagara empire; shrine carved as a chariot (on the ₹50 note)
4th of 6 in CEED 2026's north → south question
""", "Hampi stone chariot Vittala")
C("hoysala", M, "P3", MF, """
**Chennakeshava temple, Belur** (and Halebidu), Karnataka · ~13.2° N
12th c., **Hoysala**: star-shaped plan, soft soapstone, lathe-turned pillars, dense carving
""", "Chennakeshava Temple Belur")
C("mysore-palace", M, "P1", MF, """
**Mysore Palace**, Karnataka · ~12.3° N
1912, Henry Irwin; **Indo-Saracenic**: domes, arches, chhatris
5th of 6 in CEED 2026's north → south question
""", "Mysore Palace")
C("shore-temple", M, "P2", MF, """
**Shore Temple, Mahabalipuram**, Tamil Nadu · ~12.6° N
8th c., Pallava (Narasimhavarman II); early structural **Dravida** temple
UNESCO
""", "Shore Temple Mahabalipuram")
C("brihadeeswarar", M, "P1", MF, """
**Brihadeeswarar Temple**, Thanjavur, Tamil Nadu · ~10.8° N
1010, Rajaraja Chola I; **Chola**, ~66 m pyramidal vimana
Southernmost in CEED 2026's north → south question
""", "Brihadeeswarar Temple Thanjavur vimana")
C("meenakshi", M, "P2", MF, """
**Meenakshi Temple**, Madurai, Tamil Nadu · ~9.9° N
Nayak period; towering painted gateway towers (*gopurams*)
**Dravida**
""", "Meenakshi Amman Temple gopuram")
C("order-2026", M, "P1", "Order north → south: Mysore Palace, Hawa Mahal, Brihadeeswarar Temple, Hampi stone chariot, Humayun's Tomb, a Maharashtra chaitya hall.", """
**Humayun's Tomb (Delhi) → Hawa Mahal (Jaipur) → chaitya hall (Maharashtra) → Hampi stone chariot → Mysore Palace → Brihadeeswarar (Thanjavur)**
Anchor latitudes (°N): Delhi 28.6 · Jaipur 26.9 · Mumbai/Karla ~19 · Hampi 15.3 · Mysore 12.3 · Thanjavur 10.8
""")
C("temple-styles", M, "P1", "Nagara vs Dravida vs Vesara: tell them apart.", """
**Nagara** (north): curved beehive tower (*shikhara*), no big enclosure walls
**Dravida** (south): stepped pyramid tower (*vimana*), walled compound, gateway *gopurams*
**Vesara** (Deccan): hybrid · Chalukya, Hoysala
""")
C("maru-gurjara", M, "P1", "Maru-Gurjara style: where and what?", """
Rajasthan and Gujarat, 11th–13th c. (Solanki)
Lace-like marble or sandstone carving, ornate ceilings
Dilwara temples (Mount Abu), Modhera Sun Temple · asked 2016
""", "Dilwara temple ceiling Mount Abu")
C("indo-saracenic", M, "P2", "Indo-Saracenic: what and examples?", """
Late 19th–early 20th c. British-era revival mixing Mughal/Indian domes, chhatris, arches with Gothic and classical
Mysore Palace, Victoria Memorial, Gateway of India, Madras High Court
""")
C("maurya", M, "P1", "Name the sculpture style and period.", """
**Maurya**, 3rd c. BCE
Highly polished Chunar sandstone, animal capitals on pillars
Ashoka's Lion Capital, Sarnath (national emblem); Didarganj Yakshi · asked 2016
""", "Lion Capital of Ashoka Sarnath museum")
C("gandhara", M, "P1", "Name the sculpture style and period.", """
**Gandhara**, 1st–5th c. CE, north-west (Peshawar, Taxila)
Greco-Buddhist: grey schist, wavy hair, toga-like heavy folds, realistic face
Asked 2016
""", "Gandhara Buddha Tokyo National Museum")
C("kushana-mathura", M, "P1", "Name the sculpture style and period.", """
**Mathura school (Kushana)**, 1st–3rd c. CE
Spotted red sandstone, smiling fleshy figures, thin clinging drapery
Headless statue of Kanishka · asked 2016
""", "Mathura Buddha red sandstone Kushan")
C("pala", M, "P1", "Name the sculpture style and period.", """
**Pala**, 8th–12th c., Bihar and Bengal (Nalanda)
Black basalt and bronze, ornate, crisp detail, Buddhist and Hindu deities
Asked 2016
""", "Pala sculpture black stone Bihar")
C("chola-bronze", M, "P2", "Name the object, period and making process.", """
**Chola bronze Nataraja**, Tamil Nadu, 10th–12th c.
Shiva dancing in a ring of fire; solid **lost-wax** casting
""", "Nataraja Chola bronze museum")

# ---------------- craft-process ----------------
K = "craft-process"
KF = "Name the craft, its state and how it is made."
C("channapatna", K, "P1", KF, """
**Channapatna toys**, Karnataka (GI tag)
Ivory wood (*aale mara*), lathe-turned, coloured with lac stick pressed on while spinning
Rounded forms, glossy natural colours
""", "Channapatna toys")
C("channapatna-process", K, "P1", "Lacquered turned wooden rattle: which operations make it?", """
**Sizing → Turning → Drilling → Lacquering** (CEED 2025)
Lac is pressed on while the piece spins on the lathe; the heat of friction melts it into a glossy coat
Milling, punching and powder coating are factory metal processes, so they don't fit
""")
C("wood-process-rule", K, "P1", "Making a traditional wooden artefact by hand: which operations belong?", """
**Cut to size → turn or chisel → drill → sand → finish (polish or lacquer)**
Hand and lathe work only; factory processes (milling, moulding, casting) don't fit
CEED 2026 answer: finishing, sanding, drilling, chiselling · 2019: drilling, chiselling, cutting, finishing
""")
C("craft-distractors", K, "P1", "A question asks which steps make a traditional craft object. Which options can you rule out?", """
Any option with a **factory step** (milling, punching, casting, powder coating) or a **made-up word** for a step
Keep the steps a village workshop does by hand or on a lathe: cutting, turning, carving, drilling, sanding, lacquering
""")
C("kondapalli", K, "P2", KF, """
**Kondapalli toys**, Andhra Pradesh (near Vijayawada), GI tag
Soft light *tella poniki* wood, carved in parts, joined, painted bright
Village life, animals, Dasavatara
""", "Kondapalli toys")
C("etikoppaka", K, "P2", KF, """
**Etikoppaka toys**, Andhra Pradesh (Visakhapatnam), GI tag
Lathe-turned soft wood with **lac and natural dyes**, like Channapatna
""", "Etikoppaka toys")
C("dhokra", K, "P1", KF, """
**Dhokra**, tribal brass (copper + zinc), Bastar (Chhattisgarh), Odisha, West Bengal, Jharkhand
**Lost-wax casting**: one-off mould, so every piece is unique
Wax threads leave a linear, thread-wrapped texture · 2021 Q11
""", "Dhokra brass figure")
C("lost-wax-steps", K, "P1", "Lost-wax (Dhokra) casting: the steps.", """
1 Clay core, then model the form in wax (beeswax + resin), adding wax threads for detail
2 Coat in clay and heat: the wax melts out, leaving a hollow mould
3 Pour in molten metal, break the mould, finish
One mould per piece, so every Dhokra piece is unique
""")
C("bidri", K, "P2", KF, """
**Bidriware**, Bidar, Karnataka (Bahmani sultans, 14th c.)
Zinc–copper alloy cast, engraved, **inlaid with silver**
Blackened with soil from Bidar fort + ammonium chloride: silver shines on matte black
""", "Bidriware vase silver inlay")
C("blue-pottery", K, "P2", KF, """
**Blue pottery**, Jaipur, Rajasthan (Persian–Turkic roots)
Not clay: quartz powder, glass, Multani mitti, borax, gum; low firing
Cobalt blue and turquoise on white
""", "Jaipur blue pottery")
C("block-printing", K, "P2", KF, """
**Hand block printing**, Rajasthan (Bagru, Sanganer), Gujarat (Ajrakh)
Carved wooden blocks: outline block first, then fill blocks; natural dyes
Bagru *dabu* = mud resist; Ajrakh = indigo and madder, both sides
""", "Block printing Bagru wooden blocks")
C("ikat", K, "P2", KF, """
**Ikat**: yarn is tied and dyed **before** weaving, so motifs have blurred edges
Double ikat (warp + weft): Patola, Patan, Gujarat
Pochampally (Telangana), Sambalpuri (Odisha)
""", "Pochampally ikat saree")
C("bandhani", K, "P2", KF, """
**Bandhani**, Gujarat and Rajasthan: cloth pinched and tied in tiny knots, then dyed → dot patterns
*Leheriya* (Rajasthan): rolled and tied diagonally → waves
Resist on cloth (ikat resists the yarn)
""", "Bandhani tie dye fabric")
C("kashmir-papier-mache", K, "P3", KF, """
**Papier-mâché**, Kashmir
Paper pulp moulded (*sakhtsazi*), then painted in fine floral patterns (*naqashi*)
""", "Kashmir papier mache box")
C("chikankari", K, "P3", KF, """
**Chikankari**, Lucknow, Uttar Pradesh
White thread embroidery on fine muslin or cotton; shadow work from the back
""", "Chikankari embroidery Lucknow")
C("phulkari", K, "P3", KF, """
**Phulkari**, Punjab: "flower work"
Floss silk darning stitch worked from the back of hand-spun khaddar
""", "Phulkari embroidery Punjab")
C("bankura-horse", K, "P2", KF, """
**Bankura horse**, Panchmura, West Bengal
Terracotta, long stylised neck and ears, wheel-thrown parts joined
""", "Bankura horse terracotta")
C("cane-bamboo", K, "P2", "Cane and bamboo craft: where and how?", """
North-east: Assam, Tripura, Manipur
Split, shave, soak, then weave or bend over heat
Wicker baskets, furniture, mats (wicker asked 2019 Q35)
""", "Bamboo basket weaving Assam")
C("weave-backside", K, "P1", "Two-colour woven mat: what does the back look like?", """
In a plain weave, wherever a strand passes over on the front, it passes under at the back
If warp and weft are different colours, the back shows the **colours swapped**, mirrored left to right when you flip it (CEED 2022)
""")
C("shrink-fit", K, "P1", "Bullock-cart wheel rim: how is the iron tyre fixed?", """
**Shrink fit**: heat the iron ring → it expands → slip over the wooden wheel → cool → it contracts tight
2021 Q29
""")
C("plastic-processes", K, "P1", "How is each made: carry bag, tiffin box, jerry can, large water tank?", """
Carry bag → **blown-film extrusion** · Tiffin box, bucket → **injection moulding**
Bottle, jerry can → **blow moulding** · Large water tank → **rotational moulding**
Asked 2015, 2016
""")
C("metal-processes", K, "P1", "How is each made: steel spoon, small boat hull, Tetra Pak carton?", """
Steel spoon → cut from sheet, then **pressed** to shape (CEED 2020)
Small boat hull → **FRP** (fibre-reinforced plastic, i.e. fibreglass) laid up by hand in a mould
Tetra Pak → layers of paperboard, polyethylene and aluminium foil (CEED 2015)
""")
C("brass-metal-crafts", K, "P3", "Moradabad brassware: what technique?", """
**Moradabad**, Uttar Pradesh, "Brass City"
Brass sheet and cast ware, engraved; also *meenakari* enamel colouring
""")

# ---------------- anthropometry ----------------
N = "anthropometry"
C("percentile-basics", N, "P1", "What does \"5th percentile stature\" mean?", """
5% of the population are **shorter** than this value; 95% are taller
50th = median; 95th = only 5% are larger
""", "svg")
C("rule-reach", N, "P1", "Reach or height-limited dimension: design for which percentile?", """
**5th percentile**, often 5th female: if the small user can reach, everyone can
Shelf height, control reach, washbasin rim, seat depth
""", "svg")
C("rule-clearance", N, "P1", "Clearance dimension: design for which percentile?", """
**95th percentile**, often 95th male: if the large user fits, everyone fits
Door height, seat width (hip breadth), legroom, gaps to pass through
""", "svg")
C("rule-average", N, "P1", "When do you design for the 50th percentile?", """
When the dimension is **not adjustable** and neither extreme is critical
e.g. backrest height from sitting height, public counter height
""")
C("rule-adjustable", N, "P2", "Adjustable product: what range?", """
**5th-percentile female to 95th-percentile male**: fits about 95% of a mixed group of men and women
Office chair height, car seat travel
""")
C("case-washbasin", N, "P1", "CEED 2022: washbasin height designed for…?", """
**The shortest 5% of adult Indian women** (5th-percentile female)
Rim height is limited by reach: if the smallest user can use it comfortably, everyone can
""", "svg")
C("case-bus-seat", N, "P1", "CEED 2026: a public bus seat for adult Indians. Which percentile for seat height (floor to seat) and for seat width (hip breadth)?", """
**Seat height: 50th percentile** of sitting height, a middle value for a mixed public on a fixed seat
**Seat width: 95th percentile** of hip breadth: width is a clearance, so it must fit the largest users
""", "svg")
C("work-heights", N, "P1", "Kitchen: washing, rolling dough, chopping. Should they share one counter height?", """
**No: each task needs its own height** (CEED 2023)
Set each surface where the hands work: rolling dough (pressing down) sits lower; washing happens down inside the basin, so the sink rim sits higher
""", None)
C("seat-height", N, "P2", "Chair seat height: rule of thumb and percentile?", """
≈ **40–45 cm** for adults
Set from **5th percentile popliteal height** (back of knee to floor) so short users' feet reach the floor
""")
C("no-percentile-sum", N, "P3", "Can you add percentiles across body parts?", """
**No.** A 95th-percentile stature person is not 95th in every dimension
Use the right percentile for each dimension separately
""")

# ---------------- gestalt ----------------
G = "gestalt"
GF = "Which Gestalt principle?"
C("gestalt-proximity", G, "P1", GF, """
**Proximity**: things close together are seen as a group
Spacing alone makes rows or columns
""", "svg")
C("gestalt-similarity", G, "P1", GF, """
**Similarity**: things that look alike (shape, colour, size) group together
Even when evenly spaced
""", "svg")
C("gestalt-continuity", G, "P1", GF, """
**Continuity**: the eye follows the smoothest line or curve
Two crossing curves read as two lines, not four pieces
""", "svg")
C("gestalt-closure", G, "P1", GF, """
**Closure**: the mind fills gaps to see a complete shape
Broken circle still reads as a circle (WWF panda logo)
""", "svg")
C("gestalt-figure-ground", G, "P2", GF, """
**Figure–ground**: we split a scene into object and background; it can flip
Rubin's vase: vase or two faces
""", "svg")
C("gestalt-common-fate", G, "P2", GF, """
**Common fate**: elements moving in the same direction group together
Arrows pointing the same way, a flock of birds
""", "svg")
C("gestalt-symmetry", G, "P2", GF, """
**Symmetry**: symmetrical elements are seen as one unit
Brackets [ ] { } pair up across a gap
""", "svg")
C("gestalt-common-region", G, "P2", GF, """
**Common region**: elements inside a shared boundary group together
Cards and boxes in UI
""", "svg")
C("gestalt-pragnanz", G, "P3", GF, """
**Prägnanz** (law of simplicity): we read complex figures in the simplest way
Olympic rings = five circles, not a tangle of curves
""", "svg")
C("gestalt-order-2026", G, "P1", "CEED 2026 showed four Gestalt images. Which four principles, and how do you spot each?", """
**Similarity, Continuity, Proximity, Closure**
Spot by what does the grouping: look-alike shapes · one smooth line · spacing · a gap the eye fills
""")

# ---------------- ui-component ----------------
U = "ui-component"
UF = "Name the control and when to use it."
C("ui-radio", U, "P1", UF, """
**Radio buttons**: pick exactly **one** of a few (2–6) visible options
Options are mutually exclusive, e.g. payment method, gender
""", "svg")
C("ui-checkbox", U, "P1", UF, """
**Checkboxes**: pick **any number**, each independent
Also a single on/off that applies on submit ("I agree")
""", "svg")
C("ui-dropdown", U, "P1", UF, """
**Dropdown (select)**: pick one from a **long** list (country, state, year)
Saves space; wrong for 2–3 options, which should be radios
""", "svg")
C("ui-toggle", U, "P1", UF, """
**Toggle switch**: binary setting with **immediate** effect (Wi-Fi on/off)
No Save button needed; a checkbox waits for submit
""", "svg")
C("ui-stepper", U, "P1", UF, """
**Stepper**: small whole-number changes with − / + (quantity, guests)
Good for 1–10; use a text field for large numbers
""", "svg")
C("ui-slider", U, "P2", UF, """
**Slider**: approximate value in a continuous range (volume, price range)
Poor for exact values
""", "svg")
C("ui-segmented", U, "P2", UF, """
**Segmented control**: 2–5 mutually exclusive options as one joined bar
Switches a mode or view (Day / Week / Month)
""", "svg")
C("ui-tabs", U, "P2", UF, """
**Tabs**: switch between sibling content views on one screen
Navigation, not a form input
""", "svg")
C("ui-misuse-2026", U, "P1", "How do you spot a screen that misuses UI controls?", """
Look for: **checkboxes for an either-or choice** · **radio buttons for picking several** · **a dropdown for yes/no** · **a toggle that still needs Save**
Asked in CEED 2026
""")
C("fitts-law", U, "P3", "Fitts's law?", """
Time to hit a target rises with **distance** and falls with **size**
Make frequent buttons big and close; screen edges and corners are easy targets
""")
C("hicks-law", U, "P3", "Hick's law?", """
Decision time grows with the **number of choices** (logarithmically)
Fewer, grouped options → faster choice
""")
C("nielsen-1", U, "P3", "Nielsen's usability heuristics 1–5?", """
1 Visibility of system status · 2 Match with the real world · 3 User control and freedom
4 Consistency and standards · 5 Error prevention
""")
C("nielsen-2", U, "P3", "Nielsen's usability heuristics 6–10?", """
6 Recognition over recall · 7 Flexibility and efficiency · 8 Aesthetic, minimalist design
9 Help users recover from errors · 10 Help and documentation
""")
C("affordance", U, "P3", "Affordance vs signifier (Don Norman)?", """
**Affordance**: what an object lets you do (a handle affords pulling)
**Signifier**: the cue that shows how ("Push" plate) · a "Norman door" sends the wrong signal
""")
C("ux-stakeholders", U, "P1", "Food-delivery app research: whose views count?", """
**All of them**: customers, delivery riders, restaurant staff and support staff (CEED 2023: every option was correct)
""")

# ---------------- design-icon ----------------
I = "design-icon"
IF = "Name the object, its designer and year."
C("barcelona-chair", I, "P1", IF, """
**Barcelona chair**, Mies van der Rohe (with Lilly Reich), 1929
X-shaped flat steel legs, tufted leather cushions · asked 2018
""", "Barcelona chair Mies van der Rohe")
C("wassily-chair", I, "P2", IF, """
**Wassily chair (B3)**, Marcel Breuer, 1925–26, Bauhaus
Bent tubular steel + leather or canvas straps; inspired by bicycle handlebars
""", "Wassily Chair Breuer")
C("red-blue-chair", I, "P2", IF, """
**Red and Blue Chair**, Gerrit Rietveld, c.1917–23, De Stijl
Flat planes on a frame of sticks; primary colours, black frame, yellow ends
""", "Red and Blue Chair Rietveld")
C("eames-lounge", I, "P2", IF, """
**Eames Lounge Chair & Ottoman**, Charles & Ray Eames, 1956
Moulded plywood shells + leather cushions on a swivel base
""", "Eames Lounge Chair 670")
C("eames-lcw", I, "P2", IF, """
**LCW (Lounge Chair Wood)**, Charles & Ray Eames, 1945
Moulded plywood seat and back on plywood legs, rubber shock mounts
""", "Eames LCW plywood chair")
C("thonet-14", I, "P3", IF, """
**Thonet No. 14 (café chair)**, Michael Thonet, 1859
Steam-bent beechwood, six parts, flat-packed; best-selling chair ever
""", "Thonet chair No. 14")
C("tulip-chair", I, "P3", IF, """
**Tulip chair**, Eero Saarinen, 1956
Single pedestal base, moulded fibreglass shell: no "slum of legs"
""", "Tulip chair Saarinen")
C("egg-chair", I, "P3", IF, """
**Egg chair**, Arne Jacobsen, 1958, for the SAS Royal Hotel, Copenhagen
Enclosing upholstered shell on a swivel base
""", "Egg chair Arne Jacobsen")
C("panton-chair", I, "P3", IF, """
**Panton chair**, Verner Panton, 1967
First single-piece moulded plastic cantilever chair
""", "Panton chair")
C("blow-chair", I, "P2", "Name the 1960s inflatable chair and its designers.", """
**Blow chair**, De Pas, D'Urbino, Lomazzi and Scolari for Zanotta, 1967
Inflatable PVC tubes: pop, cheap, temporary · CEED 2026 paired it with an inflatable toy
""")
C("cardboard-chair", I, "P2", "Corrugated-cardboard furniture icon?", """
**Wiggle Side Chair**, Frank Gehry, *Easy Edges* series, 1972
Layers of corrugated cardboard glued together: cheap, strong, sculptural
""")
C("spun-chair", I, "P2", "Spinning-top chair: name the icon.", """
**Spun chair**, Thomas Heatherwick, 2007–10
Rotationally symmetric: you rock and spin in it, like a spinning top
""")
C("toy-furniture-2026", I, "P1", "Pair each toy with furniture that shares its principle: inflatable toy, nesting doll, Lego, spinning top.", """
Inflatable toy ↔ inflatable chair · nesting doll ↔ nesting cardboard chairs
Lego ↔ modular kids' table · spinning top ↔ Spun chair
Match the shared principle (material, nesting, module, rotation), not the look (CEED 2026)
""")
C("juicy-salif", I, "P2", IF, """
**Juicy Salif**, Philippe Starck for Alessi, 1990
Cast aluminium spider-legged lemon squeezer; postmodern icon
""", "Juicy Salif lemon squeezer")
C("anna-g", I, "P1", "Character corkscrew shaped like a smiling woman. Name it and designer.", """
**Anna G corkscrew**, Alessandro Mendini for Alessi, 1994
Arms rise as the screw goes in; postmodern character product
CEED 2025 Part B reference: redesign a tea flask in the same playful style
""", None, ["ceed-2025-b-q4"])
C("heydar-aliyev", I, "P1", "Flowing white building with no corners. Name it and architect.", """
**Heydar Aliyev Center**, Baku, **Zaha Hadid**, 2012
Continuous curved white surfaces, ground folding into roof; parametric
CEED 2022 Part B reference: design an electric iron in the same flowing style
""", "Heydar Aliyev Center Baku", ["ceed-2022-b-q4"])
C("sagrada-familia", I, "P2", "Name the building and architect.", """
**Sagrada Família**, Barcelona, Antoni Gaudí, 1882–
Organic, bone-like towers; Tower of Jesus Christ finished 2026 (Gaudí centenary)
""", "Sagrada Familia Barcelona")
C("valentine", I, "P3", IF, """
**Valentine typewriter**, Ettore Sottsass for Olivetti, 1969
Red plastic portable with matching case
""", "Olivetti Valentine typewriter")
C("braun-sk4", I, "P2", "Dieter Rams: signature product and principle?", """
**Braun SK4** radio-phonograph ("Snow White's Coffin"), Rams + Gugelot, 1956
"Less, but better"; 10 principles of good design; Braun inspired Apple's look
""")
C("tube-map", I, "P2", "Who made the first schematic metro map?", """
**Harry Beck**, London Underground diagram, 1933
Lines only at 90° and 45°, even station spacing: topology over geography
Vignelli's NYC subway diagram (1972) followed the idea
""")
C("i-love-ny", I, "P1", "Who designed the I♥NY logo?", """
**Milton Glaser**, 1977
Heart as rebus, American Typewriter font · asked 2016 (vs Paul Rand, Saul Bass)
""")
C("paul-rand", I, "P2", "Paul Rand: known for?", """
Playful modernist corporate logos: **IBM** (striped), ABC, UPS, Westinghouse, NeXT
""")
C("saul-bass", I, "P2", "Saul Bass: known for?", """
Cut-paper **film title** sequences and posters: *Vertigo*, *Psycho*, *Anatomy of a Murder*
Logos: AT&T, Kleenex
""")
C("otl-aicher", I, "P2", "Who drew the Munich 1972 Olympic pictograms?", """
**Otl Aicher**, 1972
Modular stick figures on a strict grid, only 90° and 45° angles
Model for icon sets with a consistent visual language
""")
C("logos-tech", I, "P1", "Recall exactly: the Google, Chrome, Apple and Tesla logos.", """
**Google**: blue G, red o, yellow o, blue g, green l, red e (asked 2016)
**Chrome**: red, yellow, green ring around a blue centre (asked 2020) · **Apple**: bitten apple + leaf, Rob Janoff, 1977 (asked 2018)
**Tesla**: stylised T, a slice of an electric motor (asked 2016)
""")

# ---------------- indian-design-history ----------------
H = "indian-design-history"
C("eames-india-report", H, "P3", "What was the India Report?", """
Charles & Ray Eames, presented **7 April 1958** to the Government of India (Ford Foundation)
Recommended a national design institute → NID
Used the *lota* as the model of well-designed everyday object
""")
C("nid", H, "P3", "NID: when and how founded?", """
**National Institute of Design, Ahmedabad, 1961**, first as National Institute of Industrial Design
Set up after the India Report with Ford Foundation support; Gira and Gautam Sarabhai
""", "National Institute of Design Ahmedabad campus")
C("idc", H, "P3", "IDC, IIT Bombay: when?", """
**Industrial Design Centre, 1969**, now IDC School of Design
Postgraduate industrial design at IIT Bombay; IIT Bombay runs CEED
""")
C("rupee-symbol", H, "P3", "Who designed ₹ and how is it built?", """
**D. Udaya Kumar** (IIT Bombay alumnus), chosen 15 July 2010 from 3,000+ entries
Devanagari *ra* + Latin R; two lines suggest the tricolour and "equals"
Unicode U+20B9
""", "File:Indian Rupee symbol.svg")
C("amul-girl", H, "P3", "Who created the Amul girl and when?", """
**1966**, Sylvester daCunha (ASP agency), drawn by Eustace Fernandes
Topical hoardings; "Utterly Butterly Delicious"
""")
C("air-india-maharaja", H, "P3", "Air India's Maharaja mascot: who and when?", """
**1946**, conceived by Bobby Kooka, drawn by Umesh Rao (J. Walter Thompson)
Moustached, turbaned host
""")
C("doordarshan-logo", H, "P3", "Who designed the Doordarshan logo?", """
**Devashis Bhattacharyya**, NID student, early 1970s; chosen by Indira Gandhi
Two swirling curves forming an eye; animated by R.L. Mistry
DD News recoloured it saffron in 2024
""")
C("satyajit-ray-type", H, "P1", "Satyajit Ray as type designer: name his typefaces.", """
**Ray Roman, Ray Bizarre, Daphnis, Holiday Script**
Also designed book covers and his film posters · asked 2016
""")
C("parle-g", H, "P1", "Parle-G pack: colours, wordmark, illustration, and who drew the girl?", """
Yellow-and-white wax-paper pack, red Parle-G wordmark, the Parle-G girl illustration (Maganlal Daiya, 1960s)
"G" = glucose · pack font asked 2019
""")
C("make-in-india", H, "P1", "Government initiative symbols: Make in India, Swachh Bharat.", """
**Make in India** (2014): a lion made of cogs, by Wieden+Kennedy
**Swachh Bharat**: Gandhi's round spectacles · asked 2016
""")
C("chandigarh", H, "P3", "Who planned Chandigarh and its Capitol Complex?", """
**Le Corbusier**, 1950s, with Pierre Jeanneret; raw concrete (*béton brut*), Open Hand monument
Jeanneret's teak-and-cane chairs became design icons
""", "Palace of Assembly Chandigarh")
C("bv-doshi", H, "P3", "B.V. Doshi: known for?", """
First Indian **Pritzker Prize** (2018); born 1927 (centenary 2027)
IIM Bangalore, Aranya low-cost housing (Indore), Sangath studio (Ahmedabad)
""")
C("charles-correa", H, "P3", "Charles Correa: known for?", """
Architect: Gandhi Smarak Sangrahalaya (Ahmedabad), Jawahar Kala Kendra (Jaipur), Kanchanjunga apartments (Mumbai)
Climate-led modernism, open-to-sky spaces
""")
C("ambassador", H, "P3", "Name the object, its maker and years.", """
**Hindustan Ambassador**, Hindustan Motors, 1958–2014, Uttarpara, West Bengal
Based on the Morris Oxford Series III; India's official and taxi car
""", "Hindustan Ambassador car")
C("bajaj-chetak", H, "P3", "Name the object, its maker and year.", """
**Bajaj Chetak** scooter, Bajaj Auto, 1972
Based on the Vespa Sprint; "Hamara Bajaj" family scooter
""", "Bajaj Chetak scooter")
C("tata-nano", H, "P3", "Tata Nano: when and why notable?", """
Unveiled **2008** as the ₹1 lakh "people's car"
Rear engine, compact; frugal design case study
""")

# ---------------- colour-and-type ----------------
T = "colour-and-type"
C("colour-wheel", T, "P2", "Painter's colour wheel: primaries, secondaries, tertiaries.", """
Primaries **red, yellow, blue** → secondaries orange, green, violet
Tertiaries mix a primary + neighbouring secondary (red-orange…) → 12 hues
""", "svg")
C("monochromatic", T, "P2", "Which colour scheme?", """
**Monochromatic**: one hue in its tints, shades and tones
""", "svg")
C("analogous", T, "P1", "Which colour scheme?", """
**Analogous**: 2–4 neighbouring hues on the colour wheel
Picasso's Blue Period (blues, blue-greens, violets) is the textbook example (CEED 2023)
""", "svg")
C("complementary", T, "P1", "Which colour scheme?", """
**Complementary**: two opposite hues (red–green, blue–orange, yellow–violet)
Maximum contrast
""", "svg")
C("split-complementary", T, "P2", "Which colour scheme?", """
**Split-complementary**: one hue + the two hues either side of its complement
Contrast with less tension
""", "svg")
C("triadic", T, "P2", "Which colour scheme?", """
**Triadic**: three hues equally spaced (120° apart), e.g. red, yellow, blue
""", "svg")
C("tetradic", T, "P2", "Which colour scheme?", """
**Tetradic / double-complementary**: two complementary pairs (rectangle or square on the wheel)
""", "svg")
C("tint-shade-tone", T, "P2", "Tint, shade, tone?", """
**Tint** = hue + white · **Shade** = hue + black · **Tone** = hue + grey
Hue (colour family), saturation (purity), value (lightness)
""")
C("warm-cool", T, "P3", "Warm vs cool colours?", """
**Warm** (red, orange, yellow) feel near and active; **cool** (blue, green, violet) recede and calm
""")
C("rgb-cmyk", T, "P1", "RGB vs CMYK. What is C0 M100 Y100 K0?", """
**RGB** additive (light, screens): R+G+B = white · **CMYK** subtractive (ink, print)
M + Y = **red** · C + Y = green · C + M = blue · K adds true black
C0 M100 Y100 K0 → red (2015 Q20)
""")
C("screen-angles", T, "P1", "CMYK halftone screen angles?", """
**K 45°** (most visible ink at the least visible angle), M 75°, C 15°, Y 0°
Avoids moiré · asked 2016
""")
C("serif-sans", T, "P2", "Name each style, left to right, and what defines it.", """
**Serif**: small feet on strokes (Times, Garamond) · **Sans**: none (Helvetica, Futura)
**Slab**: thick block serifs (Rockwell) · **Monospace**: every glyph the same width (Courier; 2025 NAT)
""", "svg")
C("font-weights", T, "P1", "Name the standard font weights, thinnest to heaviest.", """
Hairline/Thin, Extra Light, Light, Regular, Medium, Semibold, Bold, Extra Bold, Black (100–900)
CEED 2015 asked which were real: **Hairline** and **Bold** are; Feather and Grey are not
""")
C("point-pica", T, "P1", "Point and pica?", """
1 point = 1/72 inch · **12 points = 1 pica** · 6 picas = 1 inch
"Pica" is a typography unit (2015 Q46)
""")
C("type-anatomy", T, "P1", "Font anatomy: name the lines 1–4.", """
**1 cap height · 2 x-height · 3 baseline · 4 descender** (ascender: the part of b or d rising above the x-height)
Also: counter (enclosed space), bowl, stem, serif, terminal · "font anatomy" was a CEED 2024 Part B criterion
""", "svg")
C("kern-track-lead", T, "P2", "Name each kind of spacing, 1–3, and define it.", """
**1 Kerning**: space between one letter pair (AV) · **2 Tracking**: even spacing across a word or line
**3 Leading**: space between lines (from strips of lead)
""", "svg")
C("type-classes", T, "P3", "Old-style vs transitional vs Didone?", """
**Old-style** (Garamond): low thick–thin contrast, slanted stress
**Transitional** (Baskerville, Times): more contrast, near-vertical stress
**Didone** (Bodoni, Didot): extreme thick–thin, vertical stress, hairline serifs · *Fat face*: extra-heavy Didone for posters
""")
C("helvetica", T, "P2", "Helvetica: who and when?", """
**Max Miedinger & Eduard Hoffmann**, Haas foundry, **1957** (first named Neue Haas Grotesk)
Neutral neo-grotesque sans; Swiss Style workhorse
""")
C("futura", T, "P2", "Futura: who and when?", """
**Paul Renner**, **1927**, geometric sans built on circle, square, triangle
Bauhaus-era; centenary 2027
""")
C("sans-families", T, "P3", "Geometric vs grotesque vs humanist sans?", """
**Geometric** (Futura): circles and straight lines · **Neo-grotesque** (Helvetica, Akzidenz): uniform, closed
**Humanist** (Gill Sans, Frutiger): calligraphic, open counters, best for signage
""")
C("writing-systems", T, "P1", "Kanji, Hiragana, Katakana, Jiaguwen are…?", """
**Writing systems**: Kanji, Hiragana, Katakana (Japanese); Jiaguwen = Chinese oracle-bone script
Asked 2018 Q39
""")
C("devanagari", T, "P2", "Devanagari: key type terms?", """
**Shirorekha**: the headline joining letters · **Matra**: vowel sign attached to a consonant
**Conjunct**: joined consonants · matra keyboard layout asked 2017
""")
