/**
 * Food and FMCG elements: batch record, expiry and shelf-life tracker,
 * temperature log, licence tracker, recall trace sheet. They are blocks (the
 * same `blockNode` as Basics), so this file holds the pure rules and the panel
 * list; the drawing is in components/nodes/foodViews.jsx.
 */
import { BLOCK_NODE_TYPE, localDateString, parseDay } from './blockElements';
import { newId } from './printingElements';

export const FOOD_KINDS = ['batch', 'shelflife', 'templog', 'licence', 'recall'];

export const FOOD_LIMITS = { ingredients: 30, shelfItems: 50, readings: 200, licences: 20, traceRows: 40 };

const clean = (value, max = 200) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** A finite number from text ("-18", "4.5"), or null when empty or not a number. */
export const toNum = (value) => {
  const raw = String(value ?? '').trim();
  if (raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

export const positive = (value) => {
  const n = toNum(value);
  return n !== null && n > 0 ? n : null;
};

const round1 = (n) => Math.round(n * 10) / 10;

// ---- Expiry --------------------------------------------------------------

const DAY_MS = 86400000;
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Warning window in days: a whole number from 1 to 365. */
export const warnWindow = (value, fallback = 30) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 ? Math.min(365, n) : fallback;
};

/**
 * Where an expiry date stands today.
 * state: 'ok' | 'expiring' (inside the warning window, today included) | 'expired' | 'unknown'.
 * `daysLeft` is negative once expired.
 */
export const expiryInfo = (expiry, now = new Date(), warnDays = 30) => {
  const e = parseDay(expiry);
  if (!e) return { state: 'unknown', daysLeft: null };
  const daysLeft = Math.round((e.getTime() - midnight(now).getTime()) / DAY_MS);
  if (daysLeft < 0) return { state: 'expired', daysLeft };
  if (daysLeft <= warnWindow(warnDays)) return { state: 'expiring', daysLeft };
  return { state: 'ok', daysLeft };
};

/** Expiry state plus how much of the shelf life is used (0..100), when both dates are known. */
export const shelfLifeInfo = (mfg, expiry, now = new Date(), warnDays = 30) => {
  const info = expiryInfo(expiry, now, warnDays);
  const m = parseDay(mfg);
  const e = parseDay(expiry);
  let lifeUsed = null;
  if (m && e && e > m) {
    const used = (midnight(now).getTime() - m.getTime()) / (e.getTime() - m.getTime());
    lifeUsed = Math.max(0, Math.min(100, Math.round(used * 100)));
  }
  return { ...info, lifeUsed, datesReversed: !!(m && e && e <= m) };
};

/** Words for a day count: "12 days left", "Expires today", "Expired 3 days ago". */
export const describeDaysLeft = (daysLeft) => {
  if (daysLeft === null || daysLeft === undefined) return 'No date';
  if (daysLeft < 0) return `Expired ${-daysLeft} ${-daysLeft === 1 ? 'day' : 'days'} ago`;
  if (daysLeft === 0) return 'Expires today';
  if (daysLeft === 1) return '1 day left';
  return `${daysLeft} days left`;
};

export const EXPIRY_TONES = { ok: 'success', expiring: 'warning', expired: 'danger', unknown: 'neutral' };

/** Soonest expiry first; items with no readable date last. */
export const sortByExpiry = (items) =>
  [...items].sort((a, b) => {
    const da = parseDay(a.expiry);
    const db = parseDay(b.expiry);
    if (da && db) return da - db;
    if (da) return -1;
    if (db) return 1;
    return 0;
  });

export const sanitizeShelfItems = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, FOOD_LIMITS.shelfItems)
    .map((s, i) => ({
      id: clean(s.id, 60) || `sl-${i}`,
      item: clean(s.item, 80),
      batch: clean(s.batch, 40),
      mfg: clean(s.mfg, 10),
      expiry: clean(s.expiry, 10),
    }));

export const shelfSummary = (items, now = new Date(), warnDays = 30) => {
  const counts = { ok: 0, expiring: 0, expired: 0, unknown: 0 };
  sanitizeShelfItems(items).forEach((s) => { counts[expiryInfo(s.expiry, now, warnDays).state] += 1; });
  return counts;
};

// ---- Licences ------------------------------------------------------------

export const LICENCE_TYPES = [
  'FSSAI licence', 'FSSAI registration', 'GST registration', 'Trade licence', 'Factory licence',
  'Fire NOC', 'Pollution control consent', 'Weights & measures', 'Import Export Code', 'Other',
];

export const sanitizeLicences = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, FOOD_LIMITS.licences)
    .map((l, i) => ({
      id: clean(l.id, 60) || `lic-${i}`,
      name: clean(l.name, 80),
      number: clean(l.number, 60),
      authority: clean(l.authority, 80),
      issued: clean(l.issued, 10),
      expiry: clean(l.expiry, 10),
    }));

/** "Renews in 20 days", "Valid", "Expired 5 days ago", and so on, for a licence. */
export const describeLicence = (expiry, now = new Date(), warnDays = 60) => {
  const info = expiryInfo(expiry, now, warnDays);
  if (info.state === 'unknown') return { ...info, text: 'No expiry date' };
  if (info.state === 'expired') return { ...info, text: describeDaysLeft(info.daysLeft) };
  if (info.state === 'expiring') {
    return { ...info, text: info.daysLeft === 0 ? 'Expires today' : `Renew in ${info.daysLeft} ${info.daysLeft === 1 ? 'day' : 'days'}` };
  }
  return { ...info, text: 'Valid' };
};

// ---- Temperature ---------------------------------------------------------

export const TEMP_UNITS = ['°C', '°F'];

export const tempRange = (min, max) => {
  const lo = toNum(min);
  const hi = toNum(max);
  if (lo === null || hi === null || lo > hi) return null;
  return { min: lo, max: hi };
};

/** 'ok' | 'low' | 'high' | 'invalid' (value not a number, or no valid range). */
export const tempStatus = (value, min, max) => {
  const v = toNum(value);
  const range = tempRange(min, max);
  if (v === null || !range) return 'invalid';
  if (v < range.min) return 'low';
  if (v > range.max) return 'high';
  return 'ok';
};

export const sanitizeReadings = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((r) => r && toNum(r.value) !== null && !Number.isNaN(new Date(r.at).getTime()))
    .slice(-FOOD_LIMITS.readings)
    .map((r, i) => ({
      id: clean(r.id, 60) || `rd-${i}`,
      at: new Date(r.at).toISOString(),
      value: toNum(r.value),
      note: clean(r.note, 200),
    }))
    .sort((a, b) => a.at.localeCompare(b.at));

/**
 * Add a reading (time defaults to now) and keep the log in time order.
 * A log is a record, so a full one is refused rather than quietly dropping the oldest.
 * @returns {{ readings: Array } | { error: string }}
 */
export const addReading = (readings, { value, at, note = '' }, now = new Date()) => {
  const v = toNum(value);
  if (v === null) return { error: 'Enter the temperature as a number' };
  const list = sanitizeReadings(readings);
  if (list.length >= FOOD_LIMITS.readings) return { error: `This log holds ${FOOD_LIMITS.readings} readings. Start a new log to continue.` };
  const when = at ? new Date(at) : now;
  if (Number.isNaN(when.getTime())) return { error: 'That time is not valid' };
  if (when.getTime() > now.getTime() + 5 * 60000) return { error: 'A reading cannot be in the future' };
  const next = [...list, { id: newId('rd'), at: when.toISOString(), value: v, note: clean(note, 200) }];
  return { readings: next.sort((a, b) => a.at.localeCompare(b.at)) };
};

export const tempSummary = (readings, min, max) => {
  const list = sanitizeReadings(readings);
  const out = list.filter((r) => ['low', 'high'].includes(tempStatus(r.value, min, max)));
  const values = list.map((r) => r.value);
  return {
    count: list.length,
    outOfRange: out.length,
    last: list.length ? list[list.length - 1] : null,
    lowest: values.length ? Math.min(...values) : null,
    highest: values.length ? Math.max(...values) : null,
  };
};

// ---- Batch record --------------------------------------------------------

export const BATCH_UNITS = ['kg', 'g', 'L', 'mL', 'nos', 'tonne'];

export const sanitizeIngredients = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, FOOD_LIMITS.ingredients)
    .map((x, i) => ({
      id: clean(x.id, 60) || `ing-${i}`,
      name: clean(x.name, 80),
      lot: clean(x.lot, 40),
      qty: clean(x.qty, 20),
      unit: BATCH_UNITS.includes(x.unit) ? x.unit : 'kg',
    }));

/** Actual output as a percentage of planned (one decimal), or null when either is missing. */
export const yieldPercent = (actual, planned) => {
  const a = toNum(actual);
  const p = positive(planned);
  if (a === null || a < 0 || p === null) return null;
  return round1((a / p) * 100);
};

/** Green at or above the target, amber within 5 points under it, red below that. */
export const yieldTone = (percent, target = 95) => {
  if (percent === null) return 'neutral';
  if (percent >= target) return 'success';
  if (percent >= target - 5) return 'warning';
  return 'danger';
};

export const QC_STATUSES = ['pending', 'passed', 'failed'];

export const sanitizeQc = (qc) => {
  const q = qc && typeof qc === 'object' ? qc : {};
  return {
    status: QC_STATUSES.includes(q.status) ? q.status : 'pending',
    by: clean(q.by, 80),
    note: clean(q.note, 400),
    at: q.at || null,
    history: (Array.isArray(q.history) ? q.history : []).slice(-10).map((h) => ({
      status: QC_STATUSES.includes(h?.status) ? h.status : 'pending',
      by: clean(h?.by, 80),
      note: clean(h?.note, 400),
      at: h?.at || null,
      reopenedAt: h?.reopenedAt || null,
    })),
  };
};

/**
 * QC sign-off for a batch. Passing needs the QC person's name and a batch number;
 * failing needs a reason. A decided batch cannot be decided again until it is reopened.
 * @returns {{ qc: object } | { error: string }}
 */
export const decideBatchQc = (data, { status, by = '', note = '' }, now = new Date()) => {
  const qc = sanitizeQc(data?.qc);
  if (qc.status !== 'pending') return { error: 'This batch is already signed off. Reopen the record to change it.' };
  if (status !== 'passed' && status !== 'failed') return { error: 'Choose pass or fail' };
  if (!clean(data?.batchNo, 40)) return { error: 'Add the batch number before signing off' };
  if (status === 'passed' && !clean(by, 80)) return { error: 'Type the QC person\'s name to sign off' };
  if (status === 'failed' && !clean(note, 400)) return { error: 'Say why the batch failed' };
  return { qc: { ...qc, status, by: clean(by, 80), note: clean(note, 400), at: now.toISOString() } };
};

/** Reopen a signed-off batch for correction; the earlier decision is kept in the history. */
export const reopenBatchQc = (qc, now = new Date()) => {
  const q = sanitizeQc(qc);
  if (q.status === 'pending') return q;
  const entry = { status: q.status, by: q.by, note: q.note, at: q.at, reopenedAt: now.toISOString() };
  return { status: 'pending', by: '', note: '', at: null, history: [...q.history, entry].slice(-10) };
};

// ---- Recall trace --------------------------------------------------------

export const sanitizeTraceInputs = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, FOOD_LIMITS.traceRows)
    .map((x, i) => ({
      id: clean(x.id, 60) || `in-${i}`,
      material: clean(x.material, 80),
      supplier: clean(x.supplier, 80),
      lot: clean(x.lot, 40),
      qty: clean(x.qty, 20),
      unit: BATCH_UNITS.includes(x.unit) ? x.unit : 'kg',
    }));

export const sanitizeDispatches = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, FOOD_LIMITS.traceRows)
    .map((x, i) => ({
      id: clean(x.id, 60) || `dp-${i}`,
      customer: clean(x.customer, 80),
      location: clean(x.location, 80),
      date: clean(x.date, 10),
      invoice: clean(x.invoice, 40),
      qty: clean(x.qty, 20),
      unit: BATCH_UNITS.includes(x.unit) ? x.unit : 'kg',
    }));

/**
 * How much of the batch has gone out. Only dispatches in the same unit as the produced
 * quantity are added, and `otherUnits` says how many rows were left out.
 */
export const dispatchedVsProduced = (dispatches, produced, unit) => {
  const rows = sanitizeDispatches(dispatches);
  const same = rows.filter((r) => r.unit === unit && toNum(r.qty) !== null && toNum(r.qty) >= 0);
  const dispatched = same.reduce((sum, r) => sum + toNum(r.qty), 0);
  const total = positive(produced);
  return {
    dispatched: Math.round(dispatched * 1000) / 1000,
    produced: total,
    percent: total ? round1((dispatched / total) * 100) : null,
    otherUnits: rows.filter((r) => r.unit !== unit && toNum(r.qty) !== null).length,
    customers: new Set(rows.map((r) => r.customer.toLowerCase()).filter(Boolean)).size,
  };
};

/** Plain-text trace for an email to a regulator, a customer or a recall team. */
export const traceReport = (data) => {
  const inputs = sanitizeTraceInputs(data.inputs);
  const out = sanitizeDispatches(data.dispatches);
  const lines = [
    `RECALL TRACE: ${clean(data.product, 80) || 'Product'}${data.batchNo ? `, batch ${clean(data.batchNo, 40)}` : ''}`,
    '',
    'Raw materials used:',
    ...(inputs.length
      ? inputs.map((x) => `- ${x.material || 'Unnamed'}${x.lot ? `, lot ${x.lot}` : ''}${x.supplier ? `, supplier ${x.supplier}` : ''}${x.qty ? `, ${x.qty} ${x.unit}` : ''}`)
      : ['- none listed']),
    '',
    'Dispatched to:',
    ...(out.length
      ? out.map((x) => `- ${x.customer || 'Unnamed'}${x.location ? `, ${x.location}` : ''}${x.date ? `, ${x.date}` : ''}${x.invoice ? `, invoice ${x.invoice}` : ''}${x.qty ? `, ${x.qty} ${x.unit}` : ''}`)
      : ['- none listed']),
  ];
  return lines.join('\n');
};

// ---- Panel entries -------------------------------------------------------

export const FOOD_BLOCK_SIZES = {
  'block-batch': { w: 460, h: 520 },
  'block-shelflife': { w: 460, h: 360 },
  'block-templog': { w: 440, h: 460 },
  'block-licence': { w: 460, h: 360 },
  'block-recall': { w: 480, h: 520 },
};

const foodElement = (kind, id, name, hint, data) => ({
  id,
  name,
  type: `block-${kind}`,
  preview: hint,
  nodeType: BLOCK_NODE_TYPE,
  data: { kind, ...data },
});

/** Everything in the "Food and FMCG" category, in panel order. */
export const getFoodElements = () => [
  foodElement('batch', 'food-batch', 'Batch Record', 'Batch, ingredients with lots, yield and QC sign-off', {
    label: 'Batch record', product: '', batchNo: '', date: localDateString(), plannedQty: '', actualQty: '',
    unit: 'kg', yieldTarget: 95, ingredients: [], qc: { status: 'pending', by: '', note: '', at: null, history: [] },
  }),
  foodElement('shelflife', 'food-shelflife', 'Expiry & Shelf-Life Tracker', 'Items by expiry, green, amber or red', {
    label: 'Expiry tracker', warnDays: 30, items: [],
  }),
  foodElement('templog', 'food-templog', 'Temperature Log', 'Readings against the allowed range, with out-of-range flags', {
    label: 'Temperature log', location: '', min: '2', max: '8', unit: '°C', readings: [],
  }),
  foodElement('licence', 'food-licence', 'FSSAI / Licence Tracker', 'Licence numbers, authority and renewal warnings', {
    label: 'Licences', warnDays: 60,
    items: [{ id: 'lic-1', name: 'FSSAI licence', number: '', authority: '', issued: '', expiry: '' }],
  }),
  foodElement('recall', 'food-recall', 'Recall Trace Sheet', 'A batch\'s raw materials and where it was dispatched', {
    label: 'Recall trace', product: '', batchNo: '', producedQty: '', unit: 'kg', inputs: [], dispatches: [],
  }),
];
