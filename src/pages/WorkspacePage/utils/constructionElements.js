/**
 * Construction elements: snag / punch list, inspection checklist, concrete pour
 * card, measurement sheet, running bill tracker, permit to work. They are blocks
 * (the same `blockNode` as Basics), so this file holds the pure rules and the
 * panel list; the drawing is in components/nodes/constructionViews.jsx.
 *
 * These are working records, not compliance systems: the concrete targets are an
 * indicative check against the grade, the bill is a simplified commercial view,
 * and a permit here does not replace a statutory format.
 */
import { BLOCK_NODE_TYPE, parseDay, safeHttpUrl } from './blockElements';
import { newId, positiveNumber } from './printingElements';
import { toNum } from './foodElements';
import { decideApproval, reopenApproval, sanitizeApproval } from './interiorElements';
import { isSamePerson } from './fieldAccess';

export const CONSTRUCTION_KINDS = ['snag', 'siteinspect', 'pour', 'mbook', 'rabill', 'permit'];

export const CONSTRUCTION_LIMITS = { snags: 100, lines: 60, cubes: 24, rows: 80, billItems: 60, precautions: 30 };

const clean = (value, max = 200) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const round2 = (n) => Math.round(n * 100) / 100;
const round3 = (n) => Math.round(n * 1000) / 1000;
const DAY_MS = 86400000;
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// ---- Snag / punch list ---------------------------------------------------

export const SNAG_STATUSES = [
  { id: 'open', label: 'Open', tone: 'danger' },
  { id: 'fixed', label: 'Fixed', tone: 'info' },
  { id: 'verified', label: 'Verified', tone: 'success' },
];

export const getSnagStatus = (id) => SNAG_STATUSES.find((s) => s.id === id) || SNAG_STATUSES[0];

/**
 * Snags with a fixed number. The number is set when the snag is made and never changes or
 * repeats: delete snag 4 and the rest keep their numbers, so "see snag 7" stays true.
 */
export const sanitizeSnags = (list) => {
  const base = (Array.isArray(list) ? list : []).filter(Boolean).slice(0, CONSTRUCTION_LIMITS.snags);
  const isNumber = (n) => Number.isInteger(n) && n > 0;
  const used = new Set();
  let top = base.reduce((max, s) => (isNumber(Number(s.no)) ? Math.max(max, Number(s.no)) : max), 0);
  return base.map((s, i) => {
    let no = Number(s.no);
    if (!isNumber(no) || used.has(no)) { top += 1; no = top; }
    used.add(no);
    return {
      id: clean(s.id, 60) || `snag-${i}`,
      no,
      location: clean(s.location, 80),
      defect: clean(s.defect, 300),
      photoUrl: safeHttpUrl(s.photoUrl) || '',
      owner: clean(s.owner, 60),
      due: clean(s.due, 10),
      status: SNAG_STATUSES.some((x) => x.id === s.status) ? s.status : 'open',
      verifiedBy: clean(s.verifiedBy, 80),
      verifiedAt: s.verifiedAt || null,
    };
  });
};

/** @returns {{ items: Array, snagSeq: number } | null} null when the list is full */
export const addSnag = (items, seq = 0) => {
  const list = sanitizeSnags(items);
  if (list.length >= CONSTRUCTION_LIMITS.snags) return null;
  const no = Math.max(Number(seq) || 0, ...list.map((s) => s.no)) + 1;
  return {
    items: [...list, { id: newId('snag'), no, location: '', defect: '', photoUrl: '', owner: '', due: '', status: 'open', verifiedBy: '', verifiedAt: null }],
    snagSeq: no,
  };
};

/** Not verified, with a due date before today (calendar day). */
export const isSnagOverdue = (snag, now = new Date()) => {
  if (snag.status === 'verified') return false;
  const due = parseDay(snag.due);
  return !!due && due.getTime() < midnight(now).getTime();
};

export const snagSummary = (items, now = new Date()) => {
  const list = sanitizeSnags(items);
  const count = (status) => list.filter((s) => s.status === status).length;
  const verified = count('verified');
  return {
    total: list.length,
    open: count('open'),
    fixed: count('fixed'),
    verified,
    overdue: list.filter((s) => isSnagOverdue(s, now)).length,
    percent: list.length ? Math.round((verified / list.length) * 100) : 0,
  };
};

/**
 * Move a snag Open → Fixed → Verified (or back to Open). Verifying needs the verifier's
 * name and a snag that has been marked Fixed first.
 * @returns {{ items: Array } | { error: string }}
 */
export const setSnagStatus = (items, id, status, { by = '' } = {}, now = new Date()) => {
  const list = sanitizeSnags(items);
  const target = list.find((s) => s.id === id);
  if (!target) return { error: 'That snag was not found' };
  if (!SNAG_STATUSES.some((s) => s.id === status)) return { error: 'Choose a status' };
  if (status === 'verified') {
    if (target.status !== 'fixed') return { error: 'Mark the snag Fixed before it is verified' };
    if (!clean(by, 80)) return { error: 'Type the verifier\'s name' };
  }
  return {
    items: list.map((s) =>
      s.id === id
        ? { ...s, status, verifiedBy: status === 'verified' ? clean(by, 80) : '', verifiedAt: status === 'verified' ? now.toISOString() : null }
        : s
    ),
  };
};

/** Filter ('all' | 'open' | 'overdue'), overdue first, then by number. */
export const visibleSnags = (items, filter = 'all', now = new Date()) => {
  const list = sanitizeSnags(items);
  const kept = list.filter((s) => {
    if (filter === 'open') return s.status !== 'verified';
    if (filter === 'overdue') return isSnagOverdue(s, now);
    return true;
  });
  return kept.sort((a, b) => Number(isSnagOverdue(b, now)) - Number(isSnagOverdue(a, now)) || a.no - b.no);
};

// ---- Inspection checklist ------------------------------------------------

export const INSPECT_RESULTS = [
  { id: 'pending', label: 'Pending', tone: 'neutral' },
  { id: 'pass', label: 'Pass', tone: 'success' },
  { id: 'fail', label: 'Fail', tone: 'danger' },
  { id: 'na', label: 'N/A', tone: 'neutral' },
];

/** Typical lines per stage. They are a starting point; every line can be edited or removed. */
export const STAGE_PRESETS = {
  'Pre-pour': ['Formwork cleaned and free of debris', 'Reinforcement checked against drawing', 'Cover blocks in place', 'Shuttering lines and levels checked', 'Embedded items and sleeves fixed', 'Concrete grade and quantity confirmed'],
  Reinforcement: ['Bar diameter and spacing as per drawing', 'Lap lengths as specified', 'Cover as specified', 'Bars tied and stable', 'Starter bars and anchors in position'],
  Shuttering: ['Props and supports stable', 'Joints sealed, no leakage', 'Shutter oil applied', 'Dimensions and levels checked', 'Camber as specified'],
  Waterproofing: ['Surface clean, dry and free of loose material', 'Primer applied', 'Membrane lapped and sealed at joints', 'Upturn at walls as specified', 'Water ponding test done'],
  Brickwork: ['Line, level and plumb checked', 'Joint thickness as specified', 'Mortar mix as specified', 'Bonding and lintel bearing checked', 'Curing started'],
  Plastering: ['Surface cleaned and wetted', 'Thickness as specified', 'Line and plumb checked', 'Corners and edges true', 'No hollow sound or cracks'],
  Conduit: ['Conduit routes as per drawing', 'Bends and joints secure', 'Box levels and positions correct', 'Pull wires in place', 'Chase closed and protected'],
  'Pressure test': ['Pipe sizes and material as specified', 'Joints and supports checked', 'Test pressure applied and held', 'No leaks or pressure drop', 'Test record signed'],
  Finishing: ['Surface free of stains and damage', 'Paint or finish uniform', 'Joints and edges neat', 'Fittings fixed and working', 'Area cleaned'],
};

export const sanitizeInspectLines = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, CONSTRUCTION_LIMITS.lines)
    .map((l, i) => ({
      id: clean(l.id, 60) || `line-${i}`,
      text: clean(l.text, 200),
      result: INSPECT_RESULTS.some((r) => r.id === l.result) ? l.result : 'pending',
      remark: clean(l.remark, 200),
    }));

export const inspectSummary = (lines) => {
  const list = sanitizeInspectLines(lines);
  const count = (id) => list.filter((l) => l.result === id).length;
  return { total: list.length, pass: count('pass'), fail: count('fail'), pending: count('pending'), na: count('na') };
};

/** The preset's lines as new checklist lines, but only when the checklist is still empty. */
export const applyStagePreset = (lines, stage) => {
  const existing = sanitizeInspectLines(lines);
  const preset = STAGE_PRESETS[stage];
  if (existing.length || !preset) return existing;
  return preset.map((text) => ({ id: newId('line'), text, result: 'pending', remark: '' }));
};

/**
 * Accept or reject the inspection. Accepting needs every line passed (or N/A), at least one
 * line, and the inspector's name; rejecting needs a reason.
 * @returns {{ approval: object } | { error: string }}
 */
export const decideInspection = (data, { status, by = '', note = '' }, now = new Date()) => {
  const s = inspectSummary(data?.lines);
  if (status === 'approved') {
    if (s.total === 0) return { error: 'Add at least one line before signing off' };
    if (s.pending) return { error: `${s.pending} ${s.pending === 1 ? 'line is' : 'lines are'} still pending` };
    if (s.fail) return { error: `${s.fail} ${s.fail === 1 ? 'line has' : 'lines have'} failed. Reject the inspection, or correct and re-check them.` };
  }
  return decideApproval(data?.signoff, { status, by, note }, now, s.total > 0);
};

export { reopenApproval as reopenInspection, sanitizeApproval as sanitizeSignoff };

// ---- Concrete pour card --------------------------------------------------

export const POUR_GRADES = ['M10', 'M15', 'M20', 'M25', 'M30', 'M35', 'M40', 'M45', 'M50', 'M55', 'M60'];

/** 25 from "M25" (any case, optional space), else null. */
export const gradeStrength = (grade) => {
  const m = /^M\s?(\d{2,3})$/i.exec(String(grade ?? '').trim());
  return m ? Number(m[1]) : null;
};

export const sanitizeCubes = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, CONSTRUCTION_LIMITS.cubes)
    .map((c, i) => ({
      id: clean(c.id, 60) || `cube-${i}`,
      mark: clean(c.mark, 20),
      age: Number(c.age) === 28 ? 28 : 7,
      strength: clean(c.strength, 10),
    }));

/** Add a set of cubes for an age (7 or 28); null when that would pass the limit. */
export const addCubeSet = (cubes, age, count = 3) => {
  const list = sanitizeCubes(cubes);
  if (list.length + count > CONSTRUCTION_LIMITS.cubes) return null;
  const a = Number(age) === 28 ? 28 : 7;
  const start = list.filter((c) => c.age === a).length;
  return [
    ...list,
    ...Array.from({ length: count }, (_, i) => ({ id: newId('cube'), mark: `${a}d-${start + i + 1}`, age: a, strength: '' })),
  ];
};

/**
 * 'meets' | 'below' | 'pending' | 'invalid' for one cube. 28-day results are compared with the
 * grade; 7-day results with `expect7Pct`% of it. Indicative only: final acceptance follows the
 * project specification.
 */
export const cubeJudgement = (cube, fck, expect7Pct = 65) => {
  const raw = String(cube?.strength ?? '').trim();
  if (raw === '') return 'pending';
  const v = toNum(raw);
  if (v === null || v <= 0) return 'invalid';
  if (fck === null || fck === undefined) return 'invalid';
  const target = cube.age === 28 ? fck : (fck * expect7Pct) / 100;
  return v >= target ? 'meets' : 'below';
};

export const cubeTarget = (age, fck, expect7Pct = 65) =>
  fck === null || fck === undefined ? null : round2(age === 28 ? fck : (fck * expect7Pct) / 100);

/** Results per age: counts, average of the numbers entered. */
export const pourSummary = (data) => {
  const fck = gradeStrength(data?.grade);
  const pct = positiveNumber(data?.expect7Pct) ?? 65;
  const cubes = sanitizeCubes(data?.cubes);
  const byAge = (age) => {
    const list = cubes.filter((c) => c.age === age);
    const judged = list.map((c) => cubeJudgement(c, fck, pct));
    const values = list.map((c) => toNum(c.strength)).filter((v) => v !== null && v > 0);
    return {
      age,
      count: list.length,
      tested: values.length,
      meets: judged.filter((j) => j === 'meets').length,
      below: judged.filter((j) => j === 'below').length,
      average: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null,
      target: cubeTarget(age, fck, pct),
    };
  };
  return { fck, expect7Pct: pct, d7: byAge(7), d28: byAge(28) };
};

/**
 * When a test falls due, counted from the pour date.
 * @returns {{ dueDate: string, daysUntil: number, state: 'upcoming'|'today'|'overdue' } | null}
 */
export const testDue = (pourDate, age, now = new Date()) => {
  const d = parseDay(pourDate);
  if (!d) return null;
  const due = new Date(d.getFullYear(), d.getMonth(), d.getDate() + age);
  const daysUntil = Math.round((due.getTime() - midnight(now).getTime()) / DAY_MS);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    dueDate: `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`,
    daysUntil,
    state: daysUntil < 0 ? 'overdue' : daysUntil === 0 ? 'today' : 'upcoming',
  };
};

// ---- Measurement sheet ---------------------------------------------------

export const MB_UNITS = [
  { value: 'm³', dims: 3 },
  { value: 'm²', dims: 2 },
  { value: 'm', dims: 1 },
  { value: 'nos', dims: 0 },
  { value: 'kg', dims: 0 },
];

export const sanitizeMbRows = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, CONSTRUCTION_LIMITS.rows)
    .map((r, i) => ({
      id: clean(r.id, 60) || `mb-${i}`,
      desc: clean(r.desc, 120),
      nos: clean(r.nos, 12),
      l: clean(r.l, 12),
      b: clean(r.b, 12),
      d: clean(r.d, 12),
      kind: r.kind === 'deduct' ? 'deduct' : 'add',
    }));

/**
 * Quantity of one row: the product of the numbers that are filled in (a blank dimension is
 * left out, as in a measurement book). `state` is 'ok', 'empty' (nothing filled in) or
 * 'invalid' (something is not a positive number).
 */
export const rowQuantity = (row) => {
  const fields = ['nos', 'l', 'b', 'd'];
  const filled = fields.filter((f) => String(row[f] ?? '').trim() !== '');
  if (filled.length === 0) return { qty: null, state: 'empty', dims: 0 };
  let product = 1;
  for (const f of filled) {
    const n = positiveNumber(row[f]);
    if (n === null) return { qty: null, state: 'invalid', dims: filled.filter((x) => x !== 'nos').length };
    product *= n;
  }
  return { qty: round3(product), state: 'ok', dims: filled.filter((x) => x !== 'nos').length };
};

export const mbTotals = (data) => {
  const rows = sanitizeMbRows(data?.rows);
  let add = 0;
  let deduct = 0;
  let counted = 0;
  let skipped = 0;
  let invalid = 0;
  rows.forEach((r) => {
    const q = rowQuantity(r);
    if (q.state === 'empty') { skipped += 1; return; }
    if (q.state === 'invalid') { invalid += 1; return; }
    counted += 1;
    if (r.kind === 'deduct') deduct += q.qty; else add += q.qty;
  });
  return {
    add: round3(add), deduct: round3(deduct), total: round3(add - deduct),
    counted, skipped, invalid, deductionExceeds: deduct > add,
  };
};

/** A gentle hint when the number of dimensions does not suit the unit (m³ needs L, B and D). */
export const unitHint = (row, unit) => {
  const q = rowQuantity(row);
  const expected = (MB_UNITS.find((u) => u.value === unit) || MB_UNITS[0]).dims;
  if (q.state !== 'ok' || unit === 'kg' || q.dims === expected) return '';
  return expected === 0 ? 'Length, breadth and depth are not used for this unit' : `${unit} usually needs ${expected} of L, B and D`;
};

// ---- Running bill --------------------------------------------------------

export const sanitizeBillItems = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, CONSTRUCTION_LIMITS.billItems)
    .map((it, i) => ({
      id: clean(it.id, 60) || `bi-${i}`,
      desc: clean(it.desc, 120),
      unit: clean(it.unit, 10),
      boqQty: clean(it.boqQty, 14),
      rate: clean(it.rate, 14),
      prevQty: clean(it.prevQty, 14),
      thisQty: clean(it.thisQty, 14),
    }));

const billNumber = (v) => {
  const raw = String(v ?? '').trim();
  if (raw === '') return 0;
  const n = toNum(raw);
  return n !== null && n >= 0 ? n : null;
};

/** Quantities and money for one item. `valid` is false when a number is negative or not a number. */
export const billItemFigures = (item) => {
  const boq = billNumber(item.boqQty);
  const rate = billNumber(item.rate);
  const prev = billNumber(item.prevQty);
  const cur = billNumber(item.thisQty);
  if ([boq, rate, prev, cur].some((n) => n === null)) return { valid: false };
  const toDate = round3(prev + cur);
  return {
    valid: true,
    toDate,
    amountThis: round2(cur * rate),
    amountToDate: round2(toDate * rate),
    percent: boq > 0 ? Math.round((toDate / boq) * 100) : null,
    excess: boq > 0 && toDate > boq,
  };
};

const percentOf = (v, fallback) => {
  const n = toNum(v);
  return n !== null && n >= 0 && n <= 100 ? n : fallback;
};

/**
 * gross this bill = Σ this-bill amounts; GST and retention are a percentage of it;
 * net payable = gross + GST − retention − advance recovery.
 * Simplified: check against the contract terms.
 */
export const billTotals = (data) => {
  const items = sanitizeBillItems(data?.items);
  let grossThis = 0;
  let grossToDate = 0;
  let invalid = 0;
  let excess = 0;
  items.forEach((it) => {
    const f = billItemFigures(it);
    if (!f.valid) { invalid += 1; return; }
    grossThis += f.amountThis;
    grossToDate += f.amountToDate;
    if (f.excess) excess += 1;
  });
  const retentionPct = percentOf(data?.retentionPct, 5);
  const gstPct = percentOf(data?.gstPct, 18);
  const advance = billNumber(data?.advanceRecovery) ?? 0;
  const retention = round2((grossThis * retentionPct) / 100);
  const gst = round2((grossThis * gstPct) / 100);
  return {
    grossThis: round2(grossThis),
    grossToDate: round2(grossToDate),
    retentionPct, gstPct, retention, gst,
    advance: round2(advance),
    net: round2(grossThis + gst - retention - advance),
    invalid, excess,
  };
};

// ---- Permit to work ------------------------------------------------------

export const PERMIT_TYPES = {
  'Hot work': ['Combustible material removed or covered', 'Fire extinguisher at the work spot', 'Fire watch assigned', 'Gas cylinders secured and checked', 'Area below and around protected'],
  'Work at height': ['Safety harness worn and anchored', 'Scaffold or platform inspected and tagged', 'Edge protection or nets in place', 'Area below barricaded', 'Weather suitable for the work'],
  Excavation: ['Underground services checked and marked', 'Sides shored or sloped', 'Edge barricading and signs in place', 'Safe access and exit provided', 'Spoil kept away from the edge'],
  'Confined space': ['Space isolated and ventilated', 'Air tested and safe to enter', 'Standby person at the entry', 'Rescue arrangements ready', 'Entry log maintained'],
  'Electrical isolation': ['Circuit isolated and locked out', 'Tagged and tested dead', 'Earthing applied', 'Persons informed', 'Work area marked'],
  Lifting: ['Equipment inspected and certified', 'Load weight and radius checked', 'Slings and tackle inspected', 'Lifting area barricaded', 'Signaller and operator briefed'],
};

export const PERMIT_STATUSES = ['draft', 'requested', 'declined', 'issued', 'closed', 'cancelled'];

export const sanitizePrecautions = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, CONSTRUCTION_LIMITS.precautions)
    .map((p, i) => ({
      id: clean(p.id, 60) || `pre-${i}`,
      text: clean(p.text, 200),
      state: ['yes', 'no', 'na'].includes(p.state) ? p.state : '',
    }));

/** The type's precautions as new, unanswered lines, only when there are none yet. */
export const applyPermitPreset = (precautions, type) => {
  const existing = sanitizePrecautions(precautions);
  const preset = PERMIT_TYPES[type];
  if (existing.length || !preset) return existing;
  return preset.map((text) => ({ id: newId('pre'), text, state: '' }));
};

const parseDateTime = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** `{ valid, hours, tooLong }` for a validity window given as date-time text. */
export const permitWindow = (from, to) => {
  const a = parseDateTime(from);
  const b = parseDateTime(to);
  if (!a || !b || b <= a) return { valid: false, hours: 0, tooLong: false };
  const hours = Math.round(((b - a) / 3600000) * 10) / 10;
  return { valid: true, hours, tooLong: hours > 24 };
};

export const permitClosure = (c) => {
  const x = c && typeof c === 'object' ? c : {};
  return { by: clean(x.by, 80), at: x.at || null, note: clean(x.note, 300), areaSafe: x.areaSafe === true };
};

// ---- who the permit goes to ----------------------------------------------

const ROLE_ORDER = { pm: 0, client: 1, vendor: 2, cas: 3 };
export const PERSON_ROLE_LABEL = { pm: 'Project manager', client: 'Client', vendor: 'Vendor', cas: 'CAS' };

const collaboratorRole = (c) => (c?.isPM ? 'pm' : c?.isClient ? 'client' : c?.isCAS ? 'cas' : 'vendor');

/** The identity stored on the permit for a collaborator. */
export const permitPerson = (c) => ({
  vendorId: c?.vendorId || c?.userId || null,
  userId: c?.userId || null,
  name: clean(c?.name || c?.email, 80) || 'Unknown',
  email: c?.email && c.email !== 'N/A' ? clean(c.email, 120) : null,
  role: collaboratorRole(c),
});

/**
 * The people a permit can be sent to: the workspace's collaborators (project manager, client,
 * vendors, CAS), without the viewer and without entries that cannot be identified.
 * @returns {Array<{ key: string, person: object, label: string }>}
 */
export const permitPeople = (collaborators, viewer) => {
  const seen = new Set();
  return (Array.isArray(collaborators) ? collaborators : [])
    .filter((c) => c && (c.vendorId || c.userId) && c.name && c.name !== 'Unknown User')
    .filter((c) => !isSamePerson(permitPerson(c), viewer))
    .map((c) => ({ key: String(c.vendorId || c.userId), person: permitPerson(c), detail: clean(c.specialization, 40) }))
    .filter((o) => (seen.has(o.key) ? false : (seen.add(o.key), true)))
    .sort((a, b) => (ROLE_ORDER[a.person.role] - ROLE_ORDER[b.person.role]) || a.person.name.localeCompare(b.person.name))
    .map((o) => ({
      key: o.key,
      person: o.person,
      label: `${o.person.name} · ${PERSON_ROLE_LABEL[o.person.role]}${o.detail && o.person.role === 'vendor' ? `, ${o.detail}` : ''}`,
    }));
};

/** Who the viewer is on this permit. */
export const permitRoles = (data, viewer) => ({
  isApprover: !!data?.issuedToPerson && isSamePerson(data.issuedToPerson, viewer),
  isRequester: !!data?.requestedBy && isSamePerson(data.requestedBy, viewer),
});

/** The name on "Issued by": whoever dropped the element, else the person sending it. */
export const permitIssuer = (data, viewer) => ({
  name: clean(data?.addedBy, 80) || clean(viewer?.name, 80),
  role: data?.addedByRole || viewer?.role || null,
  email: data?.addedByEmail || viewer?.email || null,
});

const viewerPerson = (viewer) => ({
  vendorId: viewer?.ids?.[0] || null,
  name: clean(viewer?.name, 80) || 'Unknown',
  email: viewer?.email || null,
  role: viewer?.role || null,
});

/** The checks that must hold before a permit is sent for approval (and again when it is approved). */
const permitReadiness = (data, now) => {
  if (!clean(data?.type, 40)) return 'Choose the type of permit';
  if (!clean(data?.location, 80)) return 'Say where the work is';
  const w = permitWindow(data?.validFrom, data?.validTo);
  if (!w.valid) return 'Set a start and an end time, with the end after the start';
  if (new Date(data.validTo) <= now) return 'The end time has already passed';
  const pre = sanitizePrecautions(data?.precautions);
  if (!pre.length) return 'Add the precautions that apply';
  const unanswered = pre.filter((p) => p.state === '').length;
  if (unanswered) return `${unanswered} ${unanswered === 1 ? 'precaution is' : 'precautions are'} not answered yet`;
  const no = pre.filter((p) => p.state === 'no').length;
  if (no) return `${no} ${no === 1 ? 'precaution is' : 'precautions are'} marked No. Put them right first, or mark N/A if they do not apply.`;
  return null;
};

/**
 * Send the permit to the chosen person for approval. Needs everything a permit needs, a person
 * who is not the sender, and a name for "Issued by" (the person who dropped the element).
 * @returns {{ patch: object } | { error: string }}
 */
export const requestPermitApproval = (data, viewer, now = new Date()) => {
  const status = data?.status || 'draft';
  if (status !== 'draft' && status !== 'declined') return { error: 'This permit has already been sent' };
  const person = data?.issuedToPerson;
  if (!person || !(person.vendorId || person.userId)) return { error: 'Choose who the permit is issued to' };
  if (isSamePerson(person, viewer)) return { error: 'A permit cannot be approved by the person who sends it' };
  const issuer = permitIssuer(data, viewer);
  if (!issuer.name) return { error: 'Could not tell who is issuing this permit' };
  const problem = permitReadiness(data, now);
  if (problem) return { error: problem };
  return {
    patch: {
      status: 'requested',
      issuedBy: issuer.name,
      issuedByRole: issuer.role,
      issuedTo: person.name,
      requestedAt: now.toISOString(),
      requestedBy: viewerPerson(viewer),
      declinedAt: null,
      declinedBy: null,
      declineReason: '',
    },
  };
};

/** Take the request back while it is waiting for a decision. */
export const withdrawPermitRequest = (data) =>
  data?.status === 'requested'
    ? { patch: { status: 'draft', requestedAt: null, requestedBy: null } }
    : { error: 'There is no request waiting to withdraw' };

/**
 * The chosen person approves. Only they can; they cannot approve their own request; and the
 * window must not have ended. Records who approved and when.
 * @returns {{ patch: object } | { error: string }}
 */
export const approvePermit = (data, viewer, now = new Date()) => {
  if (data?.status !== 'requested') return { error: 'There is no request waiting for approval' };
  const { isApprover, isRequester } = permitRoles(data, viewer);
  if (!isApprover) return { error: `Only ${data?.issuedToPerson?.name || 'the person it was sent to'} can approve this permit` };
  if (isRequester) return { error: 'A permit cannot be approved by the person who sent it' };
  const end = parseDateTime(data?.validTo);
  if (!end || end <= now) return { error: 'The end time has passed. Ask for a new request with a new time.' };
  return {
    patch: {
      status: 'issued',
      issuedAt: now.toISOString(),
      approvedAt: now.toISOString(),
      approvedBy: viewerPerson(viewer),
    },
  };
};

/** The chosen person declines, with a reason. The sender can fix things and send again. */
export const declinePermit = (data, viewer, { note = '' } = {}, now = new Date()) => {
  if (data?.status !== 'requested') return { error: 'There is no request waiting for approval' };
  if (!permitRoles(data, viewer).isApprover) return { error: `Only ${data?.issuedToPerson?.name || 'the person it was sent to'} can decline this permit` };
  if (!clean(note, 300)) return { error: 'Say why the permit is declined' };
  return {
    patch: { status: 'declined', declinedAt: now.toISOString(), declinedBy: viewerPerson(viewer), declineReason: clean(note, 300) },
  };
};

/** 'draft' | 'requested' | 'declined' | 'closed' | 'cancelled' | 'valid' | 'expiring' (inside the last hour) | 'expired'. */
export const permitState = (data, now = new Date()) => {
  if (data?.status !== 'issued') return PERMIT_STATUSES.includes(data?.status) ? data.status : 'draft';
  const end = parseDateTime(data?.validTo);
  if (!end) return 'expired';
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return 'expired';
  return ms <= 3600000 ? 'expiring' : 'valid';
};

/**
 * Close an issued permit: needs the closer's name and the area made safe.
 * @returns {{ patch: object } | { error: string }}
 */
export const closePermit = (data, { by = '', areaSafe = false, note = '' } = {}, now = new Date()) => {
  if (data?.status !== 'issued') return { error: 'Only an issued permit can be closed' };
  if (!clean(by, 80)) return { error: 'Type the name of the person closing the permit' };
  if (areaSafe !== true) return { error: 'Confirm the area has been made safe' };
  return { patch: { status: 'closed', closure: { by: clean(by, 80), at: now.toISOString(), note: clean(note, 300), areaSafe: true } } };
};

/** Cancel a permit that is not finished yet. A reason is required. */
export const cancelPermit = (data, { by = '', note = '' } = {}, now = new Date()) => {
  if (!['draft', 'requested', 'declined', 'issued'].includes(data?.status || 'draft')) return { error: 'This permit is already finished' };
  if (!clean(note, 300)) return { error: 'Say why the permit is being cancelled' };
  return { patch: { status: 'cancelled', closure: { by: clean(by, 80), at: now.toISOString(), note: clean(note, 300), areaSafe: false } } };
};

// ---- Panel entries -------------------------------------------------------

export const CONSTRUCTION_BLOCK_SIZES = {
  'block-snag': { w: 520, h: 460 },
  'block-siteinspect': { w: 480, h: 480 },
  'block-pour': { w: 460, h: 480 },
  'block-mbook': { w: 560, h: 440 },
  'block-rabill': { w: 640, h: 500 },
  'block-permit': { w: 460, h: 560 },
};

const constructionElement = (kind, id, name, hint, data) => ({
  id,
  name,
  type: `block-${kind}`,
  preview: hint,
  nodeType: BLOCK_NODE_TYPE,
  data: { kind, ...data },
});

/** Everything in the "Construction" category, in panel order. */
export const getConstructionElements = () => [
  constructionElement('snag', 'construction-snag', 'Snag / Punch List', 'Defects with photo, owner and due date, closed once verified', {
    label: 'Snag list', snagSeq: 0, items: [],
  }),
  constructionElement('siteinspect', 'construction-inspection', 'Inspection Checklist', 'Pass / fail per line for a stage, then accept or reject', {
    label: 'Inspection checklist', stage: '', location: '', date: '', lines: [],
    signoff: { status: 'pending', by: '', note: '', at: null, history: [] },
  }),
  constructionElement('pour', 'construction-pour', 'Concrete Pour Card', 'Pour details and 7- and 28-day cube results against the grade', {
    label: 'Concrete pour', location: '', member: '', grade: 'M25', volume: '', date: '', slump: '', expect7Pct: 65, cubes: [],
  }),
  constructionElement('mbook', 'construction-measurement', 'Measurement Sheet', 'Nos × L × B × D rows with deductions', {
    label: 'Measurement sheet', work: '', unit: 'm³', rows: [],
  }),
  constructionElement('rabill', 'construction-rabill', 'Running Bill Tracker', 'Quantities to date, retention, GST and net payable', {
    label: 'Running bill', project: '', billNo: '', date: '', retentionPct: 5, gstPct: 18, advanceRecovery: '', items: [],
  }),
  constructionElement('permit', 'construction-permit', 'Permit to Work', 'Precautions, validity window, issue and close-out', {
    label: 'Permit to work', type: 'Work at height', location: '', work: '', validFrom: '', validTo: '',
    precautions: [], issuedTo: '', issuedToPerson: null, issuedBy: '', status: 'draft', issuedAt: null,
    requestedAt: null, requestedBy: null, approvedAt: null, approvedBy: null,
    declinedAt: null, declinedBy: null, declineReason: '',
    closure: { by: '', at: null, note: '', areaSafe: false },
  }),
];
