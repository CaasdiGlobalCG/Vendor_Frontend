# Calculators & Estimators — Management Overview

**Purpose:** Inventory of every calculator/estimator across our products, how each works, and how accurate the outputs are. Intended for management review — not a developer doc.

**Scope:** 17 tools across 4 codebases (Vendor_Frontend, Client_Frontend, B2B-Frontend, Operon). All computation is done client-side; nothing is sent to a server.

**Accuracy scale used below:**

|Level|Meaning|
|---|---|
|**High**|Deterministic arithmetic on user inputs; result is exact for the model, typical real-world variance < ±5%|
|**Medium**|Correct formulas using industry-standard assumptions/factors; variance typically ±5–15%|
|**Low / Directional**|Rule-of-thumb model intended to size a problem, not produce a quote; variance can exceed ±15%|

---

## 1. Construction Cost Calculators — Vendor Portal (Vendor_Frontend)

**Location:** `Vendor_Frontend/src/pages/WorkspacePage/components/forms/` — launched from the **Cost Calculators modal** (`modals/CostCalculatorsModal.jsx`) on the vendor workspace canvas. Seven calculators are selectable in the modal; results can be aggregated with manual labour entries into a **Cost Calculation Summary** exportable to PDF/Excel.

### 1.1 Bricks Calculator

- **What it does:** Estimates number of bricks for a wall.
- **How it works:** `Wall area (mm²) ÷ (brick face length + mortar) × (brick face height + mortar)`, rounded up, then × (1 + wastage%). Presets: Indian Modular/Non-Modular, UK, US standard + custom dimensions. Only face area is used — depth is ignored (correct for single-wythe walls).
- **Inputs:** Brick type, wall length/height (m or ft), mortar joint (default 10 mm), wastage (default 10%).
- **Accuracy: High (for the model).** Geometry is exact; shows full step-by-step working. *Caveat:* no deduction for doors/windows/openings — user must subtract those areas manually or results overstate by the opening share.

### 1.2 Concrete Blocks Calculator

- **What it does:** Same method as Bricks, for CMU blocks (4″/6″/8″ presets or custom).
- **Accuracy: High** — same caveat on openings.

### 1.3 Concrete Calculator

- **What it does:** Wet volume → dry volume → cement bags, sand, aggregate, water, optional steel, truckloads, and a full cost breakdown.
- **How it works:** Volume for Slab / Pillar / Cylinder / Hollow Cylinder → ×1.54 dry-volume factor (standard IS convention) → split by mix grade (M10 1:3:6, M15 1:2:4, M20 1:1.5:3, M25 1:1:2, or custom ratio) → cement bags via 0.035 m³/bag, water via w/c ratio, steel via volume × 7850 kg/m³ × % (1% slab, 2% pillar, 0.8% cylinders), trucks in 6/8/10 m³. Editable cost rates.
- **Accuracy: Medium–High.** Volumes and material split are standard practice; the steel-by-fixed-percentage and the default ₹ rates are estimates — costs are only as good as the rates entered.

### 1.4 Flooring (Tile) Calculator

- **What it does:** Tile count, boxes required, plus mortar materials (cement bags + sand).
- **How it works:** `Room area ÷ tile area` × wastage → boxes via tiles/box; mortar = area × thickness (default 20 mm) × 1.33 dry factor, split 1:4 cement:sand.
- **Accuracy: Medium–High.** Simple and correct; real-world waste depends on layout/diagonal cuts — covered approximately by the wastage %.

### 1.5 Soil Excavation Calculator

- **What it does:** Excavation volume, loose (swelled) volume, soil weight, truck loads, and cost.
- **How it works:** Rectangular/trench/circular volume → safety margin & over-excavation multipliers → swell factor by soil type (loose 10%, medium 20%, hard 30%, rock 50%) → weight via soil density (1600–2400 kg/m³) → loads for tractor (3 m³), 6-wheeler (6 m³), 10-wheeler (10 m³).
- **Accuracy: Medium** for volumes (standard swell factors).
- **⚠ Known issue:** the transportation cost line multiplies the **sum of all three vehicle-type load counts** by the trip rate — i.e., it charges as if all three fleets ran. This roughly triples transport cost and should be fixed to use one selected vehicle type.

### 1.6 Steel Estimation Calculator

- **What it does:** Total reinforcement steel in kg/tonnes + cost, three ways:
  - **Quick Area:** built-up area × factor (residential 38, commercial 48, industrial 65, heavy 60 kg/m²) × wastage × seismic zone factor (1.0–1.3).
  - **Element-wise:** proper bar take-off for slabs/beams/columns/footings (bars per spacing × length × d²/162 weight).
  - **BBS:** user-entered bar bending schedule; includes a First-Fit-Decreasing bin-packing optimizer that packs cuts into 12 m bars and reports scrap %.
- **Accuracy:**
  - Quick Area — **Low/Medium** (rule-of-thumb factors; fine for budgeting).
  - Element-wise — **Medium** (real take-off but omits laps, anchorage, hooks, cover deductions).
  - BBS — **High** relative to entered schedule; optimizer is a good heuristic, not guaranteed optimal.

### 1.7 Vinyl Flooring Calculator

- **What it does:** Sheet/plank/tile quantities + adhesive buckets, underlayment rolls, self-levelling compound, labour, and cost.
- **How it works:** Area × wastage × pattern factor (straight 1.0, staggered 1.05, herringbone 1.12) × traffic grade (1.0–1.15) → rolls/boxes; adhesives at 15–20 m²/bucket; underlayment 25 m²/roll with 5% overlap.
- **Accuracy: Medium–High.** Better calibrated than most (pattern/traffic factors); still dependent on the rate inputs.

### 1.8 Freight Cost Calculator

- **What it does:** `Distance × rate + fuel surcharge % + tolls + handling` → total. Copy-to-clipboard and save to canvas.
- **Accuracy: High** (pure arithmetic). Note: this one is **not** listed in the Cost Calculators modal dropdown — it only exists as a canvas node.

### 1.9 Electrical Wiring Estimator

- **What it does:** Wire length, 90 m coils, conduit pipes for a building.
- **How it works:** `Rooms × points/room × avg distance × 2 wires × 1.10 slack`; conduit = run × conduit% × slack ÷ 3 m pipes.
- **Accuracy: Low–Medium.** Depends entirely on the "average distance per point" guess — treat as a ballpark (±20–30%).

### 1.10 Painting Estimator

- **What it does:** Paintable area, litres of paint/primer, suggested can sizes (20/10/4/1 L).
- **How it works:** `Walls − doors (1.9 m²) − windows (1.35 m²) + optional ceiling → area × coats ÷ coverage (10 m²/L paint, 11 primer) × wastage`.
- **Accuracy: Medium–High.** Standard deductions and coverage; actual coverage varies with surface texture and paint brand.

### 1.11 BOQ Generator (`forms/BOQGenerator.jsx` + `boq-engine/`)

- **What it does:** Full Bill of Quantities: excavation, concrete, steel, masonry, plaster, flooring sections + overhead %, contingency %, GST %, grand total; CSV export.
- **How it works:** Six calculation engines feed a rate engine holding a **static built-in rate database** (₹ rates for cement, sand, steel, labour, etc.).
- **Accuracy: Medium.** Quantities are deterministic and standard; **cost accuracy depends on the hard-coded rates being current** — they are example rates and will drift from market. Recommend wiring to a live rate sheet before customer-facing use.

### 1.12 Supporting utilities

- `utils/rateCalculator.js` — quote consistency: converts rate↔rate-per-sqft against measured area, flags mismatches beyond 1 paisa. **High accuracy** (exact arithmetic).
- `CostCalculatorSummary.jsx` — aggregates selected calculators + manual labour entries; exports PDF (html2pdf) and Excel (xlsx).

---

## 2. Buyer-Facing Tools — Client & B2B

### 2.1 Financial Calculator (Client_Frontend — `home/tools/FinancialCalculator.jsx`)

- **What it does:** Break-even units, payback period, 3-year ROI chart, revenue/cost/profit projections; editable inputs (fixed costs, variable cost, price, overhead, investment).
- **How it works:** `Break-even units = fixed costs ÷ (price − variable cost)`; payback = investment ÷ monthly contribution. Charts and ROI figures come from `data` props (AI-generated projections), not computed locally.
- **Accuracy: Medium.** The break-even formula is standard; the projections/ROI displayed are only as good as the upstream data feeding them.

### 2.2 Quantity Calculator (B2B-Frontend — RFQBuilder `ProductClarificationPanel.jsx`)

- **What it does:** Helps buyers size an RFQ quantity. Two modes: *Units per Assembly* (assemblies × units) and *Area Coverage* (area × consumption/sq.unit), then × wastage; outputs a recommended **min–max range** (base×0.9 → ×1.15) and pack counts.
- **Accuracy: High for arithmetic** — deliberately returns a range rather than a false-precision number.

---

## 3. Marketing-Site Calculators — Operon

### 3.1 Fragmentation Tax Calculator (`Operon/src/components/Calculators.jsx`)

- **What it does:** Estimates annual cost of coordinating vendors across disconnected tools.
- **How it works:** `Coordinators (FTE) × monthly cost × 12` + `(tools − 1) × 8% × labour` + `delay% × sites × ₹7.5 L default incident cost`. Displayed as a **±15% range**.
- **Accuracy: Directional by design.** The code itself says *"a directional model, not an audited cost — use it to size the problem."* Suitable for marketing, not for customer quotes.

### 3.2 Chasing Cost Calculator

- **What it does:** Cost of unwon quotes + late-paying clients.
- **How it works:** `Unwon quotes/yr × hrs/quote × ₹/hr` + `outstanding × borrow rate (14% default) × days/365`. Also shown as a ±15% range with full "how we calculated this" disclosure.
- **Accuracy: Directional** — transparent assumptions, range-based output.

---

## 4. Consolidated Accuracy Summary

|Calculator|Repo|Accuracy|Key caveat|
|---|---|---|---|
|Bricks|Vendor|High*|No openings deduction|
|Concrete Blocks|Vendor|High*|No openings deduction|
|Concrete|Vendor|Medium–High|Steel % and rates are estimates|
|Flooring (tiles)|Vendor|Medium–High|Layout waste approximated|
|Soil Excavation|Vendor|Medium|**Transport cost bug (3× overestimate)**|
|Steel — Quick Area|Vendor|Low–Medium|Rule-of-thumb kg/m²|
|Steel — Element/BBS|Vendor|Medium–High|No laps/anchorage allowances|
|Vinyl Flooring|Vendor|Medium–High|—|
|Freight|Vendor|High|Not in modal dropdown|
|Electrical Wiring|Vendor|Low–Medium|Ballpark only|
|Painting|Vendor|Medium–High|—|
|BOQ Generator|Vendor|Medium|Static rate database|
|Rate utilities|Vendor|High|—|
|Financial Calculator|Client|Medium|Depends on upstream projections|
|Quantity Calculator|B2B|High (range)|—|
|Fragmentation Tax|Operon|Directional|Marketing estimate|
|Chasing Cost|Operon|Directional|Marketing estimate|

## 5. Recommendations for Management

1. **Fix the Soil Excavation transport bug** — transportation cost currently sums loads across all three vehicle classes; pick one vehicle type. Likely ~3× overstatement on that line.
2. **Add openings deduction** to Bricks/Concrete Blocks calculators (doors/windows), or rename wall input to "net wall area" — biggest source of user-facing overestimate.
3. **Refresh BOQ rate database** — hard-coded ₹ rates will drift; connect to a rate sheet or clearly label as indicative.
4. **Positioning:** treat Operon + Steel Quick-Area + Electrical Wiring as *estimates*; the rest are safe to present as *calculator-grade* outputs, with costs always dependent on user-entered rates.
5. **Consistency:** FreightCostCalculator, Electrical Wiring, and Painting estimators exist as canvas nodes but are missing from the Cost Calculators modal dropdown — likely an oversight; consider adding them.

*Prepared from source-code review — formulas cited from implementation, not vendor documentation.*
