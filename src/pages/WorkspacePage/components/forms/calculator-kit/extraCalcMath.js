/**
 * Pure maths for the second wave of site calculators (tiling labour, false
 * ceiling, plumbing pipe, unit converter, labour productivity, GST & margin).
 *
 * Kept free of React so every formula is unit-tested on its own. Rates and
 * coverage figures are editable defaults in the UI — they are planning
 * assumptions, not quotations.
 */

const round2 = (n) => Math.round(n * 100) / 100;
// ceil that ignores float noise (60 × 25 × 1.08 = 1620.0000000000002 must give 1620)
const ceilSafe = (n) => Math.ceil(Math.round(n * 1e6) / 1e6);

// ── Tiling labour ───────────────────────────────────────────────────────
export function tilingLabour({
  area, outputPerMason, masons, helpersPerMason, masonWage, helperWage, skirtingLength = 0, skirtingRate = 0,
}) {
  const crewOutputPerDay = outputPerMason * masons;
  const days = area / crewOutputPerDay;
  const masonDays = days * masons;
  const helperDays = days * masons * helpersPerMason;
  const wageCost = masonDays * masonWage + helperDays * helperWage;
  const skirtingCost = skirtingLength * skirtingRate;
  return {
    days: round2(days),
    masonDays: round2(masonDays),
    helperDays: round2(helperDays),
    wageCost: round2(wageCost),
    skirtingCost: round2(skirtingCost),
    totalCost: round2(wageCost + skirtingCost),
    costPerM2: round2((wageCost + skirtingCost) / area),
  };
}

// ── False ceiling ───────────────────────────────────────────────────────
export const CEILING_TYPES = {
  gypsum: { label: 'Gypsum board', unitArea: 1.2 * 2.4, unit: 'boards (1.2 × 2.4 m)', channelPerM2: 2.2, screwsPerM2: 25, jointKgPerM2: 0.5, defaultRate: 950 },
  grid: { label: 'Grid / mineral-fibre tiles', unitArea: 0.6 * 0.6, unit: 'tiles (600 × 600 mm)', channelPerM2: 1.7, screwsPerM2: 0, jointKgPerM2: 0, defaultRate: 750 },
  pvc: { label: 'PVC panels', unitArea: 0.25 * 3, unit: 'panels (250 mm × 3 m)', channelPerM2: 1.4, screwsPerM2: 12, jointKgPerM2: 0, defaultRate: 600 },
};

export function falseCeiling({ area, type, wastagePercent, perimeter = 0, coveRate = 0, ratePerM2 }) {
  const spec = CEILING_TYPES[type] || CEILING_TYPES.gypsum;
  const waste = 1 + wastagePercent / 100;
  const sheets = ceilSafe((area / spec.unitArea) * waste);
  return {
    sheets,
    sheetUnit: spec.unit,
    channelMetres: round2(area * spec.channelPerM2 * waste),
    screws: ceilSafe(area * spec.screwsPerM2 * waste),
    jointingKg: round2(area * spec.jointKgPerM2 * waste),
    coveCost: round2(perimeter * coveRate),
    boardCost: round2(area * ratePerM2),
    totalCost: round2(area * ratePerM2 + perimeter * coveRate),
  };
}

// ── Plumbing pipe ───────────────────────────────────────────────────────
// Rate per metre by diameter (mm) for the baseline material, then a multiplier.
export const PIPE_DIAMETERS = [15, 20, 25, 32, 40, 50];
export const PIPE_BASE_RATE = { 15: 60, 20: 85, 25: 130, 32: 190, 40: 270, 50: 390 };
export const PIPE_MATERIALS = {
  cpvc: { label: 'CPVC (hot & cold)', factor: 1 },
  pvc: { label: 'uPVC (cold water / drain)', factor: 0.6 },
  ppr: { label: 'PPR', factor: 0.85 },
};
export const PIPE_LENGTH_M = 3;

export function plumbingPipe({ runLength, diameter, material, wastagePercent, metresPerFitting, fittingRate, ratePerM }) {
  const waste = 1 + wastagePercent / 100;
  const metres = runLength * waste;
  const pieces = ceilSafe(metres / PIPE_LENGTH_M);
  const fittings = ceilSafe(runLength / metresPerFitting);
  const pipeCost = pieces * PIPE_LENGTH_M * ratePerM;
  const fittingCost = fittings * fittingRate;
  return {
    metres: round2(metres),
    pieces,
    fittings,
    pipeCost: round2(pipeCost),
    fittingCost: round2(fittingCost),
    totalCost: round2(pipeCost + fittingCost),
    diameter,
    material,
  };
}

export function defaultPipeRate(diameter, material) {
  const base = PIPE_BASE_RATE[diameter] ?? PIPE_BASE_RATE[20];
  const factor = (PIPE_MATERIALS[material] || PIPE_MATERIALS.cpvc).factor;
  return Math.round(base * factor);
}

// ── Unit converter ──────────────────────────────────────────────────────
// Each factor is "base units per 1 of this unit". Bases: m², m³, m.
export const UNIT_CATEGORIES = {
  area: {
    label: 'Area',
    base: 'm²',
    units: {
      sqm: { label: 'sq m (m²)', factor: 1 },
      sqft: { label: 'sq ft', factor: 0.09290304 },
      sqyd: { label: 'sq yd', factor: 0.83612736 },
      sqin: { label: 'sq in', factor: 0.00064516 },
      acre: { label: 'acre', factor: 4046.8564224 },
      cent: { label: 'cent', factor: 40.468564224 },
      guntha: { label: 'guntha', factor: 101.17141056 },
    },
  },
  volume: {
    label: 'Volume',
    base: 'm³',
    units: {
      cum: { label: 'cu m (m³)', factor: 1 },
      cft: { label: 'cu ft', factor: 0.028316846592 },
      cuyd: { label: 'cu yd', factor: 0.764554857984 },
      litre: { label: 'litre', factor: 0.001 },
      gallon: { label: 'US gallon', factor: 0.003785411784 },
    },
  },
  length: {
    label: 'Length',
    base: 'm',
    units: {
      m: { label: 'metre', factor: 1 },
      ft: { label: 'feet', factor: 0.3048 },
      in: { label: 'inch', factor: 0.0254 },
      cm: { label: 'cm', factor: 0.01 },
      mm: { label: 'mm', factor: 0.001 },
      yd: { label: 'yard', factor: 0.9144 },
      km: { label: 'km', factor: 1000 },
    },
  },
  weight: {
    label: 'Weight',
    base: 'kg',
    units: {
      kg: { label: 'kg', factor: 1 },
      tonne: { label: 'tonne', factor: 1000 },
      quintal: { label: 'quintal', factor: 100 },
      lb: { label: 'pound', factor: 0.45359237 },
      g: { label: 'gram', factor: 0.001 },
    },
  },
};

export function convertUnit(category, value, from, to) {
  const cat = UNIT_CATEGORIES[category];
  if (!cat || !cat.units[from] || !cat.units[to]) return null;
  return (value * cat.units[from].factor) / cat.units[to].factor;
}

export function convertAll(category, value, from) {
  const cat = UNIT_CATEGORIES[category];
  if (!cat || !cat.units[from]) return [];
  return Object.entries(cat.units).map(([key, u]) => ({
    key,
    label: u.label,
    value: (value * cat.units[from].factor) / u.factor,
  }));
}

// ── Labour cost / productivity ──────────────────────────────────────────
export const WORK_TYPES = {
  brickwork: { label: 'Brickwork', unit: 'm³', output: 1 },
  plaster: { label: 'Plastering', unit: 'm²', output: 10 },
  tiling: { label: 'Tiling', unit: 'm²', output: 8 },
  painting: { label: 'Painting (per coat)', unit: 'm²', output: 15 },
  formwork: { label: 'Formwork / shuttering', unit: 'm²', output: 8 },
  bar_bending: { label: 'Bar bending & fixing', unit: 'kg', output: 150 },
  concreting: { label: 'Concrete placing', unit: 'm³', output: 6 },
  excavation: { label: 'Manual excavation', unit: 'm³', output: 3 },
  custom: { label: 'Custom work', unit: 'unit', output: 1 },
};

export function labourProductivity({ quantity, outputPerWorker, workers, helpers, workerWage, helperWage }) {
  const days = quantity / (outputPerWorker * workers);
  const workerDays = days * workers;
  const helperDays = days * helpers;
  const cost = workerDays * workerWage + helperDays * helperWage;
  return {
    days: round2(days),
    workerDays: round2(workerDays),
    helperDays: round2(helperDays),
    cost: round2(cost),
    costPerUnit: round2(cost / quantity),
  };
}

// ── GST & margin ────────────────────────────────────────────────────────
export const GST_RATES = [0, 5, 12, 18, 28];

function splitGst(taxable, rate, interState) {
  const gst = taxable * (rate / 100);
  return interState
    ? { cgst: 0, sgst: 0, igst: round2(gst), gst: round2(gst) }
    : { cgst: round2(gst / 2), sgst: round2(gst / 2), igst: 0, gst: round2(gst) };
}

/**
 * mode:
 *  - 'markup'  price = cost × (1 + p/100); GST added on top
 *  - 'margin'  price = cost / (1 − p/100); GST added on top
 *  - 'reverse' amount is GST-inclusive; split into taxable value + GST
 */
export function gstMargin({ mode, amount, percent = 0, gstRate, interState }) {
  if (mode === 'reverse') {
    const taxable = amount / (1 + gstRate / 100);
    return { mode, taxable: round2(taxable), ...splitGst(taxable, gstRate, interState), total: round2(amount) };
  }
  if (mode === 'margin' && percent >= 100) return null;
  const taxable = mode === 'margin' ? amount / (1 - percent / 100) : amount * (1 + percent / 100);
  const tax = splitGst(taxable, gstRate, interState);
  return {
    mode,
    cost: round2(amount),
    taxable: round2(taxable),
    profit: round2(taxable - amount),
    marginPercent: round2(((taxable - amount) / taxable) * 100),
    markupPercent: round2(((taxable - amount) / amount) * 100),
    ...tax,
    total: round2(taxable + tax.gst),
  };
}
