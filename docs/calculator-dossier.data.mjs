/**
 * Calculator Validation Dossier — data source.
 *
 * Every calculator with: its formula, the standards/sources that define it
 * (with links), the pinned test proof, and the trust status.
 * Regenerate the HTML/PDF after any calculator change:
 *   node docs/generate-calculator-dossier.mjs
 */

export const META = {
  title: 'Construction Calculators — Validation Dossier',
  subtitle: 'Formula sources, standards and test proof for every calculator in the workspace',
  generatedAt: new Date().toISOString().slice(0, 10),
  repos: 'Vendor Workspace (Vendor_Frontend)',
};

export const STANDARDS = [
  { name: 'IS 456:2000 (Table 9)', governs: 'Nominal concrete mixes — M20 = 1:1.5:3, M15 = 1:2:4, M10 = 1:3:6, M7.5 (PCC) = 1:4:8, M25 = 1:1:2', url: 'https://cracindia.in/admin/uploads/IS-456.pdf' },
  { name: 'IS 2212:1991', governs: 'Brickwork — 10 mm nominal mortar joint; 500 bricks per m³', url: 'https://www.cracindia.in/admin/uploads/IS-2212.pdf' },
  { name: 'IS 1077', governs: 'Modular brick size 190×90×90 mm', url: 'https://infralens.in/knowledge/brickwork-calculation-is-2212' },
  { name: 'IS 2185 Part 3:1984', governs: 'AAC block nominal sizes — 600/500/400 × 200/250/300 × 100–250 mm', url: 'https://www.bis.gov.in/wp-content/uploads/IS-2185-PART-3-Product-Manual.pdf' },
  { name: 'IS 2095 Part 1', governs: 'Gypsum plaster boards — dimensions; market standard board 2400×1200 mm (2.88 m²)', url: 'https://www.bis.gov.in/wp-content/uploads/2019/07/IS-2095-Part-1-Product-manual.pdf' },
  { name: 'IS 1661:1972', governs: 'Cement plaster application — mix table and thicknesses (10–15 mm)', url: 'https://law.resource.org/pub/in/bis/S03/is.1661.1972.pdf' },
  { name: 'IS 694', governs: 'House wire — 90 m coils are the standard market pack', url: 'https://www.bestofelectricals.com/kei-15mm-fr-house-wires-90m-retail-pack' },
];

/**
 * About the standards: what BIS/IS codes are, how to verify any of them,
 * and the official status of each code we cite (status checked 2026-10-01).
 */
export const STANDARDS_GUIDE = {
  intro: [
    'IS codes ("Indian Standards") are published by the Bureau of Indian Standards (BIS) — the National Standards Body of India, a statutory body established under the BIS Act 2016 (successor to the Indian Standards Institution, 1947). Each standard is drafted by a technical committee of industry and academic experts (for example CED 2 for concrete, CED 53 for cement-matrix products), opened for public consultation, then published and maintained through a formal lifecycle: revisions (e.g. IS 456 Fourth Revision), amendments between revisions, and periodic reaffirmation.',
    'Indian Standards are voluntary by default, but compliance to many is made mandatory by the Central Government through Quality Control Orders (e.g. cement, TMT steel, electrical wires must carry the BIS/ISI mark). Codes of practice such as IS 456 are mandatory in effect: the National Building Code of India and municipal building bye-laws reference them, and structural designs in India are submitted and approved against them.',
    'There are different kinds of standards, and our calculators use each kind correctly: Product specifications say what a product must BE (IS 1077 bricks, IS 2185 Part 3 AAC blocks, IS 2095 gypsum boards, IS 694 wires). Codes of practice say HOW to design and build (IS 456 concrete, IS 2212 brickwork, IS 1661 plaster application).',
  ],
  recipe: [
    { step: 'Find the standard on the BIS "Know Your Standards" portal (bis.gov.in → Know Your Standard, also in the BIS Care app). Searching an IS number shows the IS document, its amendments, gazette notifications, and even the list of licensed manufacturers.', url: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/Indian_standards/isdetails/ODcxNQ==' },
    { step: 'Check the official status in the BIS e-Sale store: search the IS number to see Status (Active), Reaffirmed Year, and No. of Amendments. Indigenous standards can be downloaded free of cost after registering.', url: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS%2B456&id=0' },
    { step: 'Browse by committee or aspect in the BIS Standards Locator (product specification, code of practice, method of test, dimensions) to confirm what kind of standard you are looking at.', url: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/Group_wise_standards_list?GId=NA%3D%3D' },
    { step: 'Cross-check the exact clause used by a calculator: e.g. IS 456 Table 9 (nominal mixes — M20 = 1:1.5:3), IS 2212 clause 6.4 (10 mm nominal mortar joint), IS 2185 Part 3 clause 3.2 (nominal block sizes). Public copies of many IS codes are mirrored at law.resource.org and archive.org; the BIS store is the authoritative source.', url: 'https://law.resource.org/pub/in/bis/S03/' },
    { step: 'Check currency before quoting: confirm the edition is not superseded and note its amendments (IS 456:2000 has 6 amendments; none change Table 9 — the table our calculators use).', url: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+2185&id=0' },
  ],
  status: [
    { code: 'IS 456:2000', full: 'Plain and Reinforced Concrete — Code of Practice (Fourth Revision)', committee: 'CED 2', status: 'Active · Reaffirmed 2021 · 6 amendments (latest Amd 6:2024)', official: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS%2B456&id=0' },
    { code: 'IS 2212:1991', full: 'Code of Practice for Brickwork', committee: 'CED 30', status: 'Active (10 mm nominal joint; bed joints ≤ 12 mm)', official: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/Group_wise_standards_list?GId=NA%3D%3D' },
    { code: 'IS 1077:1991', full: 'Common Burnt Clay Building Bricks — Specification', committee: 'CED 30', status: 'Active (modular 190×90×90 mm)', official: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/Group_wise_standards_list?GId=NA%3D%3D' },
    { code: 'IS 2185 (Part 3):1984', full: 'Concrete Masonry Units — Part 3: Autoclaved Cellular (Aerated) Concrete Blocks (First Revision)', committee: 'CED 53', status: 'Active · Reaffirmed 2020 · 1 amendment · supersedes IS 5482:1969', official: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/Indian_standards/isdetails/ODcxNQ==' },
    { code: 'IS 2095 (Part 1)', full: 'Gypsum Plaster Boards — Specification, Part 1: Plain Gypsum Plaster Boards', committee: 'CED 4', status: 'Active (dimensions table for wallboards)', official: 'https://www.bis.gov.in/wp-content/uploads/2019/07/IS-2095-Part-1-Product-manual.pdf' },
    { code: 'IS 1661:1972', full: 'Code of Practice for Application of Cement and Cement-Lime Plaster Finishes', committee: 'CED 4', status: 'Active (mix table; 10–15 mm thicknesses)', official: 'https://law.resource.org/pub/in/bis/S03/is.1661.1972.pdf' },
    { code: 'IS 694', full: 'PVC Insulated Cables/Wires up to 1100 V — Specification', committee: 'ETD 1', status: 'Active · mandatory BIS certification (ISI mark) for house wires', official: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/Group_wise_standards_list?GId=NA%3D%3D' },
  ],
  trust: [
    'Statutory body: BIS is established by an Act of Parliament (BIS Act 2016); standards are developed by technical committees with public consultation and a formal revision/amendment/reaffirmation lifecycle.',
    'Legal force where it matters: many construction products must carry the ISI mark under Quality Control Orders; codes of practice like IS 456 are referenced by the National Building Code and building bye-laws — "as per IS 456" is the standard professional defence.',
    'Our evidence chain has four links: STANDARD → CLAUSE/TABLE → CONSTANT IN CODE → PINNED TEST. Every calculator row in this dossier names the clause it follows and the test that proves the implementation.',
    'Honest limits: BIS copies are authoritative but paid (free downloads after registration); free mirrors (law.resource.org, archive.org) may lag the latest amendments — verify currency on the BIS portal; manufacturer datasheets can be imprecise (one AAC supplier cites "IS 2185 Part 3:2015", while BIS lists the 1984 edition as Active/Reaffirmed 2020).',
    'Estimating-grade: the codes define design and measurement conventions; the calculators apply those conventions for estimation. They are not structural designs and do not replace the project engineer\'s approved design or the local Schedule of Rates.',
  ],
};

export const FORMULA_SOURCES = [
  { formula: 'Concrete dry-volume factor 1.54', note: 'Voids ~35% when dry (1 ÷ 0.65 ≈ 1.538 → 1.54)', url: 'https://calculateconstruction.com/calculators/material/cement-sand-aggregate-calculator.html' },
  { formula: 'Plaster dry-volume factor 1.33', note: 'Mortar-only factor (no coarse aggregate)', url: 'https://civiljungle.org/cement-plastering/' },
  { formula: 'Steel unit weight d²/162 kg/m', note: 'Full derivation from steel density 7850 kg/m³', url: 'https://dailycivil.com/formula-d%C2%B2l162-calculating-weight-steel-bars-fully-derived/' },
  { formula: 'Cement density 1440 kg/m³ · 50 kg bag = 0.0347 m³', note: 'Used for all cement-bag conversions', url: 'https://calculateconstruction.com/calculators/material/cement-sand-aggregate-calculator.html' },
  { formula: 'Steel per m³ of RCC (element thumb rules)', note: 'Slab 80 · Beam 110–125 · Column 100–160 · Footing 40–80 kg/m³', url: 'https://steeloncall.com/blog/thumb-rule-for-steel' },
  { formula: 'Steel per m² of built-up area', note: 'Residential 3.5–4 kg/sqft (≈38 kg/m²)', url: 'https://civilsitevisit.com/how-much-steel-required-for-house-construction-thumb-rule/' },
  { formula: 'Soil swell/bulking factors', note: 'Common earth ~25% · clay ~30% · sand & gravel ~12% · blasted rock ~50%', url: 'https://www.spikevm.com/calculators/excavation/bulking-swell-factors.php' },
  { formula: 'Sand / aggregate bulk density', note: 'Dry sand ≈1600 · coarse aggregate ≈1500 kg/m³ (ranges 1450–1750)', url: 'https://www.civillead.com/density-of-cement-sand-and-aggregate/' },
  { formula: 'Paint coverage (emulsion)', note: 'Asian Paints PIS: 140–170 sqft/L (≈13–16 m²/L); tool default 10 m²/L is conservative', url: 'https://5.imimg.com/data5/SELLER/Doc/2025/9/547207957/AI/IY/PJ/49853115/asian-paints-royale-luxury-emulsion-paint.pdf' },
  { formula: 'Waterproofing spreading rate', note: 'Dr. Fixit TDS: 3.7–4.2 m²/L per coat; tool default 1.5 m²/L is conservative', url: 'https://www.drfixit.co.in/resources/library/technical-data/large-projects/dr-fixit-raincoat-classic' },
  { formula: 'Formwork plywood sheet + waste', note: '8×4 ft = 2.98 m² per sheet; +10% waste; sheets = area ÷ 2.98 × 1.10', url: 'https://picotoolx.com/shuttering-area-calculator.html' },
  { formula: 'Studs = ceil(length ÷ spacing) + 1', note: 'Standard framing count formula (walls & partitions)', url: 'https://codingace.net/construction/formwork_material.html' },
  { formula: 'Gypsum board 2.88 m² · studs @400 mm · ~36 screws/board', note: 'British Gypsum 300 mm field centres; UK 2400×1200 board', url: 'https://tradecalculator.co.uk/carpentry/stud-wall-calculator/' },
  { formula: 'Roofing sheet count via effective cover width', note: 'sheets = ceil(width ÷ effective cover width) after side lap', url: 'https://knowsteel.com/guide/corrugated-steel-sheet/' },
  { formula: 'AAC thin-bed adhesive 2.7–3.4 kg/m²', note: '40 kg bag covers 160–170 sqft at 3 mm joint', url: 'https://media.myklaticrete.com/mykl/2024/08/AAC-BLOCK-ADHESIVE_TDS.pdf' },
  { formula: 'Wall putty coverage', note: 'Birla White: 1 kg ≈ 1.86–2.04 m² (≈0.5 kg/m²/coat); tool default 0.75 is conservative', url: 'https://www.birlawhite.com/en/blogs/how-to-estimate-your-wall-putty-needs' },
  { formula: 'Vinyl flooring waste 5–10% (straight lay)', note: 'Tool default 8% is mid-range', url: 'https://www.floorchemdepot.com/how-much-waste-vinyl-plank-flooring/' },
  { formula: 'Tile count + waste + whole boxes', note: 'area ÷ tile area + waste %, round up to boxes', url: 'https://www.calculate.co.nz/tile-count-calculator.php' },
  { formula: 'Board foot = T(in) × W(in) × L(ft) ÷ 12', note: 'Standard lumber volume unit', url: 'https://www.omnicalculator.com/construction/board-foot' },
  { formula: 'Decking: boards + fasteners take-off', note: 'Rows × board runs with 5–10% waste (Omni decking calculator)', url: 'https://www.omnicalculator.com/construction/decking' },
];

export const CALCULATORS = [
  // ── Concrete & Cement ────────────────────────────────────────────────
  {
    group: 'Concrete & Cement', name: 'Concrete Calculator', id: 'concrete-calculator', status: 'Cited — constants verified',
    formula: 'Volume by shape (slab L×W×D, column, cylinder, hollow cylinder) → materials via grade ratio with dry-volume factor. Verified constants: dry factor 1.54 · M10 1:3:6 · M15 1:2:4 · M20 1:1.5:3 · M25 1:1:2 (IS 456 Table 9 — exact match) · w/c 0.6/0.55/0.5/0.45 (at or below IS-456 maxima) · 50 kg bag = 0.035 m³.',
    sources: ['IS 456:2000 Table 9 (mixes — exact match verified in code)', 'Dry-volume factor 1.54', 'Cement bag 0.0347–0.035 m³'],
    proof: 'Test pins Volume 125 m³ for a 5×5×5 m slab; materials flow-verified (cement bags shown).',
  },
  {
    group: 'Concrete & Cement', name: 'PCC Calculator', id: 'calc-pcc', status: 'Cited',
    formula: 'Volume = L × W × T; dry volume × 1.54; split by mix (1:4:8, 1:3:6, 1:2:4); cement × 1440 kg/m³ ÷ 50 kg.',
    sources: ['IS 456 Table 9 (M7.5 = 1:4:8, M10 = 1:3:6)', 'Dry-volume factor 1.54'],
    proof: '2.5 m³ @ 1:4:8 → 8.96 bags, 1.244 m³ sand, 2.488 m³ aggregate, ₹8,558.',
  },
  {
    group: 'Concrete & Cement', name: 'Concrete Column Calculator', id: 'calc-column', status: 'Cited',
    formula: 'Volume = L × B × H × count; materials from grade mix table; steel = volume × density (default 120 kg/m³, editable).',
    sources: ['IS 456 Table 9 (grades M10–M25)', 'Steel thumb rule: column 100–160 kg/m³'],
    proof: '4 columns 230×230 mm × 5 m → 9.95 bags, 133.3 kg steel, ₹15,424.',
  },
  {
    group: 'Concrete & Cement', name: 'Concrete Footing Calculator', id: 'calc-footing', status: 'Cited',
    formula: 'Volume = L × W × T × count; grade mix table; steel default 60 kg/m³ (editable).',
    sources: ['IS 456 Table 9', 'Steel thumb rule: footing 40–80 kg/m³'],
    proof: '4 footings 5×5×0.5 m → 470.40 bags, 3,150 kg steel, ₹5,24,160.',
  },
  {
    group: 'Concrete & Cement', name: 'Concrete Stairs Calculator', id: 'calc-stairs', status: 'Cited',
    formula: 'Stepped prisms (riser × tread ÷ 2 × width × steps) + waist slab (incline length = √((n·tread)² + (n·riser)²)); grade mix table; steel default 80 kg/m³.',
    sources: ['IS 456 Table 9', 'Standard stair geometry'],
    proof: '5 steps 150/300 mm, 1 m wide → 0.364 m³, 1.68 m incline, 3.43 bags, ₹4,313.',
  },
  {
    group: 'Concrete & Cement', name: 'RCC Formwork Calculator', id: 'calc-formwork', status: 'Cited',
    formula: 'Ply sheets = area × 1.10 ÷ 2.97 m² (8×4 ft sheet); battens = area × 2.5 m; props = ceil(area ÷ 1.5); nails = area × 0.1 kg.',
    sources: ['Sheet 2.98 m² + 10% waste (picotoolx)', '8×4 ft standard sheet (pinmy.co)'],
    proof: '5 m² → 2 sheets, 12.5 m battens, 4 props, ₹2,675.',
  },
  // ── Masonry ─────────────────────────────────────────────────────────
  {
    group: 'Masonry', name: 'Bricks Calculator', id: 'bricks-calculator', status: 'Cited — constants verified',
    formula: 'Wall area ÷ brick face area including mortar joint (L + joint) × (H + joint); + wastage %, round up. Verified: mortar joint default 10 mm — exactly the IS 2212 nominal joint.',
    sources: ['IS 2212 (10 mm nominal joint — matches code default)', 'IS 1077 (190×90×90 modular brick)', 'infralens brickwork method'],
    proof: '5×3 m wall, Indian Modular 190×90, 10 mm joint, 10% wastage → 826 bricks (float-ceil quirk documented in test).',
  },
  {
    group: 'Masonry', name: 'Concrete Blocks Calculator', id: 'concrete-blocks-calculator', status: 'Cited — constants verified',
    formula: 'Wall area ÷ block face area (default 406.4×203.2 mm = 16″×8″ standard CMU) with mortar joint. Verified: mortar joint default 10 mm (IS 2212 nominal); + wastage.',
    sources: ['IS 2185 Part 3 (block nominal sizes)', 'IS 2572 (concrete masonry units)', '10 mm joint per IS 2212'],
    proof: 'Flow verified: default block, 5×5 m wall → “Blocks Required” result renders.',
  },
  {
    group: 'Masonry', name: 'AAC Blocks Calculator', id: 'calc-aac', status: 'Cited',
    formula: 'Blocks = ceil(area × (1+waste) ÷ face area); thin-bed adhesive = area × 3 kg/m² × (1+waste).',
    sources: ['IS 2185 Part 3 (600×200 nominal)', 'Adhesive TDS: 40 kg / 160–170 sqft @ 3 mm = 2.7–3.4 kg/m²'],
    proof: '5 m² → 44 blocks, 15.8 kg adhesive, ₹2,609.',
  },
  // ── Steel & Rebar ───────────────────────────────────────────────────
  {
    group: 'Steel & Rebar', name: 'Steel Estimation Calculator', id: 'steel-cost-calculator', status: 'Cited — constants verified',
    formula: 'Quick-area: built-up area × coefficient + wastage × seismic factor. Verified coefficients: residential 38 · commercial 48 · industrial 65 · heavy 60 kg/m² (cited thumb rules: 3.5–6 kg/sqft ≈ 38–65 kg/m²). Element-wise: slab 80 · beam 120 · column 100 · footing 60 kg/m³ (cited ranges: slab 80–100, beam 110–125, column 100–160, footing 40–80). Plus BBS generator mode.',
    sources: ['Thumb rules: 3.5–6 kg/sqft by building type', 'Element ranges: slab 80–100, beam 110–125, column 100–160, footing 40–80'],
    proof: 'Quick-area 125 m² residential × 38 × 1.05 = 4,987.5 kg — exact-value test.',
  },
  {
    group: 'Steel & Rebar', name: 'Rebar / BBS Calculator', id: 'calc-rebar', status: 'Cited',
    formula: 'Unit weight = d² ÷ 162 kg/m; per-row weight = unit × cutting length × bars; multi-row totals + wastage.',
    sources: ['d²/162 derivation (from 7850 kg/m³)', 'Bar bending schedule practice'],
    proof: '12 mm × 5 m × 5 bars → 0.889 kg/m, 25.0 m, 23.3 kg, ₹1,517.',
  },
  // ── Earthwork & Aggregates ──────────────────────────────────────────
  {
    group: 'Earthwork & Aggregates', name: 'Soil Excavation Calculator', id: 'soil-excavation-calculator', status: 'Cited — constants verified',
    formula: 'Volume = L × W × D (or circular); loose volume = volume × swell factor. Verified: swell loose 10 / medium 20 / hard 30 / rock 50 % (cited ranges: sand & gravel 12 · common earth 25 · clay 30 · blasted rock 50). Densities verified: 1600 / 1800 / 2000 / 2400 kg/m³ (typical soil/rock bulk densities). Vehicle loads by capacity.',
    sources: ['Swell factor tables (Alaska DOT data)', 'Swell formula: loose = bank × (1 + swell% ÷ 100)'],
    proof: 'Flow verified: rectangular 5×5×5 → “Excavation Volume 125 m³” + earthwork cost.',
  },
  {
    group: 'Earthwork & Aggregates', name: 'Sand & Aggregate Calculator', id: 'calc-sand-aggregate', status: 'Cited',
    formula: 'Weight = volume × density (sand 1600 · aggregate 1500 kg/m³); deliveries = ceil(volume ÷ truck capacity); cost = volume × rate.',
    sources: ['Dry sand ≈1602 kg/m³ (civillead)', 'Coarse aggregate avg ≈1500 kg/m³ (civilsir)'],
    proof: '5 m³ sand → 8.4 tonnes (8,400 kg), 1 truck, ₹6,300.',
  },
  // ── Finishes ────────────────────────────────────────────────────────
  {
    group: 'Finishes', name: 'Plaster Calculator', id: 'calc-plaster', status: 'Cited',
    formula: 'Wet = area × thickness; dry = wet × 1.33; cement = dry × 1 ÷ (1+sand) × 1440 kg/m³; sand proportional; water = 0.5 × cement.',
    sources: ['IS 1661 (mixes & thicknesses)', 'Dry-volume factor 1.33 (mortar)', 'Cement 1440 kg/m³'],
    proof: '5 m² @ 12 mm, 1:6 → 0.34 bags (17.2 kg), 0.072 m³ sand, 8.6 L water, ₹224.',
  },
  {
    group: 'Finishes', name: 'Putty & Primer Calculator', id: 'calc-putty', status: 'Cited (conservative)',
    formula: 'Putty = area × coats × 0.75 kg/m²/coat; primer = area ÷ 10 m²/L; wastage on both.',
    sources: ['Birla White: 1 kg ≈ 1.86–2.04 m² (≈0.5 kg/m²/coat) — tool default 0.75 is a conservative upper bound'],
    proof: '5 m² × 2 coats → 7.88 kg (0.39 bags), 0.53 L primer, ₹449.',
  },
  {
    group: 'Finishes', name: 'Painting Estimator', id: 'calc-paint', status: 'Cited — constants verified (conservative)',
    formula: 'Paint = paintable area ÷ coverage + wastage; primer with its own coverage; coats configurable. Verified constants: paint 10 m²/L · primer 11 m²/L — conservative vs Asian Paints datasheet (140–170 sqft/L ≈ 13–16 m²/L).',
    sources: ['Asian Paints PIS: 140–170 sqft/L (≈13–16 m²/L) — tool default 10 is conservative'],
    proof: 'Flow verified: wall + ceiling input → “Paint Required” result renders.',
  },
  {
    group: 'Finishes', name: 'Tiles Calculator', id: 'calc-tiles', status: 'Cited',
    formula: 'Tiles = ceil(area ÷ tile area); + waste % (default 10); boxes = ceil(tiles ÷ per-box).',
    sources: ['calculate.co.nz tile method (area ÷ tile + waste, round to boxes)'],
    proof: '5×5 m, 600×600 mm, 10% waste → 77 tiles, 20 boxes, ₹9,240.',
  },
  {
    group: 'Finishes', name: 'Flooring Calculator', id: 'flooring-calculator', status: 'Cited — constants verified',
    formula: 'Floor area → tiles by size, boxes, cement & sand for bedding. Verified constants: bedding mortar 20 mm · dry-volume factor 1.33 (mortar) · mix 1:4 (standard tile bedding) · 0.035 m³ per 50 kg bag · 10 tiles/box default.',
    sources: ['Tile coverage method (calculate.co.nz)', 'Dry-volume factor 1.33 (mortar)', '1:4 bedding mix (standard practice)'],
    proof: 'Flow verified: 5×5 m → “Total Area”, “Tiles Required”, “Cement Bags” render.',
  },
  {
    group: 'Finishes', name: 'Vinyl Flooring Calculator', id: 'vinyl-calculator', status: 'Cited — constants verified',
    formula: 'Area + 8% wastage → planks/rolls/tiles, adhesive buckets, underlayment. Verified: wastage default 8% (cited range 5–10% straight lay) · adhesive bucket covers 18 m² (tiles) · underlayment roll 25 m².',
    sources: ['Vinyl waste 5–10% straight lay (floorchemdepot) — tool default 8% mid-range'],
    proof: 'Flow verified: 5×5 m → “Total Area to Cover 27 m² (with 8% wastage)” + rolls.',
  },
  // ── Waterproofing & Envelope ────────────────────────────────────────
  {
    group: 'Waterproofing & Envelope', name: 'Waterproofing Calculator', id: 'calc-waterproofing', status: 'Cited (conservative)',
    formula: 'Litres = area × coats ÷ coverage (default 1.5 m²/L/coat); buckets = ceil(litres ÷ 20 L).',
    sources: ['Dr. Fixit Raincoat TDS: 3.7–4.2 m²/L per coat — tool default 1.5 is conservative'],
    proof: '5 m² × 2 coats → 7.0 L, 1 bucket, ₹1,750.',
  },
  {
    group: 'Waterproofing & Envelope', name: 'Roofing Calculator', id: 'calc-roofing', status: 'Cited',
    formula: 'Slope area = plan ÷ cos(atan(slope%)); sheets = ceil(slope area × (1+waste) ÷ sheet area); fasteners = ceil(area × screws/m² × (1+waste)).',
    sources: ['Sheet count via effective cover width (knowsteel)', 'Corrugated sheet layout calculator (codingace)'],
    proof: '5×5 m @ 20% slope, 3×1.05 m sheets → 25.50 m², 9 sheets, 215 screws, ₹8,295.',
  },
  {
    group: 'Waterproofing & Envelope', name: 'Retaining Wall Calculator', id: 'calc-retaining-wall', status: 'Cited',
    formula: 'Stem volume (L×H×thickness) + base volume (L×W×T); grade mix table; steel default 80 kg/m³ (editable).',
    sources: ['IS 456 Table 9', 'Steel thumb rules (footing/RCC ranges 40–80 kg/m³)'],
    proof: '5 m × 5 m, 200 mm stem → 68.21 bags, 609 kg steel, ₹85,899.',
  },
  // ── Partitions & Ceilings ───────────────────────────────────────────
  {
    group: 'Partitions & Ceilings', name: 'Drywall / Partition Calculator', id: 'calc-drywall', status: 'Cited',
    formula: 'Boards = ceil(area × (1+waste) ÷ 2.88 m²); studs = ceil(length ÷ spacing) + 1; screws = area × 12/m²; joint compound = area × 0.5 kg/m².',
    sources: ['Board 2400×1200 = 2.88 m² · studs @400 mm · ~36 screws/board (British Gypsum)', 'IS 2095 (board dimensions)'],
    proof: '5×5 m @ 400 mm → 10 boards, 14 studs, 315 screws, 13.1 kg compound, ₹10,398.',
  },
  // ── Timber & Framing ────────────────────────────────────────────────
  {
    group: 'Timber & Framing', name: 'Decking Calculator', id: 'calc-decking', status: 'Cited',
    formula: 'Rows = ceil(width ÷ (board width + gap)); boards/row = ceil(length ÷ board length); boards with waste; screws = area × 25/m² × (1+waste).',
    sources: ['Decking take-off method (Omni decking calculator)', 'Waste 5–10% (flooring waste guides)'],
    proof: '5×5 m, 140 mm boards + 5 mm gap, 3 m lengths → 74 boards, 657 screws, ₹35,271.',
  },
  {
    group: 'Timber & Framing', name: 'Framing Calculator', id: 'calc-framing', status: 'Cited',
    formula: 'Studs = ceil(length ÷ spacing) + 1; stud timber = studs × height; plates = 2 × length; stock lengths = ceil(linear ÷ 3 m).',
    sources: ['Stud count formula: ceil(L ÷ spacing) + 1 (codingace)', '400 mm standard stud spacing'],
    proof: '5 m × 5 m @ 400 mm → 14 studs, 73.5 m + 10.5 m timber, 29 stock lengths, ₹5,220.',
  },
  {
    group: 'Timber & Framing', name: 'Lumber Calculator', id: 'calc-lumber', status: 'Cited',
    formula: 'Board feet = T(in) × W(in) × L(ft) × pieces ÷ 12; CFT = BF ÷ 12; cost = CFT × rate.',
    sources: ['Board foot standard definition (Omni board foot calculator)'],
    proof: '5 pieces 1×6 in × 8 ft → 20.00 BF, 1.67 cft, ₹4,167.',
  },
  {
    group: 'Timber & Framing', name: 'Roof Truss Calculator', id: 'calc-truss', status: 'Cited (estimate)',
    formula: 'Trusses = ceil(length ÷ spacing) + 1; rise = span × pitch% ÷ 2; rafter = √((span/2)² + rise²); timber per truss = 2 × rafter + span + 0.4 × span (web estimate); + wastage.',
    sources: ['Truss take-off & timber tools (BuildingClub Pro timber suite)', 'Standard gable geometry'],
    proof: '5 m span, 5 m length @ 30% pitch, 1.2 m spacing → 6 trusses, 12.22 m per truss, 77.0 m timber, ₹13,858.',
  },
  // ── MEP ─────────────────────────────────────────────────────────────
  {
    group: 'MEP', name: 'Electrical Wiring Estimator', id: 'calc-electrical', status: 'Cited — constants verified',
    formula: 'Wire per point = distance × 2 conductors (live + neutral) × 1.10 slack; coils = ceil(total ÷ 90 m); conduit = run × 80% × 1.10 ÷ 3 m pipes; load points by type. Verified: 10% slack, 90 m coil, 80% conduit share, 3 m pipe.',
    sources: ['90 m coil standard pack (KEI/Polycab, IS 694)', 'Conduit 3 m pipe standard'],
    proof: 'Flow verified: 5 points → “Total Points”, “Wire Required 145.2 m (2 coils)”, conduit.',
  },
  // ── Cost & Logistics ────────────────────────────────────────────────
  {
    group: 'Cost & Logistics', name: 'Freight Cost Calculator', id: 'calc-freight', status: 'Verified',
    formula: 'Cost = distance × rate + fuel surcharge% + tolls + handling fee.',
    sources: ['Arithmetic (no standard required)'],
    proof: '100 km × ₹10 + 10% fuel + ₹50 toll + ₹25 handling = ₹1,175.00 — exact-value test.',
  },
];
