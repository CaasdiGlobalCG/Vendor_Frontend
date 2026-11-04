/**
 * Printing and signage elements: proof markup, artwork approval, signage
 * elevation, colour palette and material swatch board. They are blocks (same
 * `blockNode` as the Basics), so this file holds the pure rules and the panel
 * list; the drawing is in components/nodes/printingViews.jsx.
 */
import { BLOCK_NODE_TYPE, safeHttpUrl } from './blockElements';

export const PRINTING_KINDS = ['proof', 'artwork', 'elevation', 'palette', 'swatches'];

export const PRINTING_LIMITS = { pins: 50, versions: 20, swatches: 12, materials: 12 };

const clean = (value, max = 200) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export const newId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ---- Proof markup --------------------------------------------------------

export const PIN_STATUSES = [
  { id: 'open', label: 'Open', tone: 'warning' },
  { id: 'fixed', label: 'Fixed', tone: 'info' },
  { id: 'approved', label: 'Approved', tone: 'success' },
];

export const getPinStatus = (id) => PIN_STATUSES.find((s) => s.id === id) || PIN_STATUSES[0];

const unit = (n) => Math.max(0, Math.min(1, Number(n)));

/**
 * Pins with a position (0..1 across and down the artwork), a number, a comment and a status.
 * The number is fixed when the pin is made and never changes: deleting pin 2 leaves 1 and 3 as
 * they were, so a comment that says "see pin 3" stays true. Pins saved before numbers existed
 * are numbered once, in list order.
 */
export const sanitizePins = (pins) => {
  const base = (Array.isArray(pins) ? pins : [])
    .filter((p) => p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)))
    .slice(0, PRINTING_LIMITS.pins);
  const isNumber = (n) => Number.isInteger(n) && n > 0;
  const used = new Set();
  let top = base.reduce((max, p) => (isNumber(Number(p.n)) ? Math.max(max, Number(p.n)) : max), 0);
  return base.map((p, i) => {
    let n = Number(p.n);
    if (!isNumber(n) || used.has(n)) { top += 1; n = top; }
    used.add(n);
    return {
      id: clean(p.id, 60) || `pin-${i}`,
      n,
      x: Math.round(unit(p.x) * 1000) / 1000,
      y: Math.round(unit(p.y) * 1000) / 1000,
      text: clean(p.text, 300),
      status: PIN_STATUSES.some((s) => s.id === p.status) ? p.status : 'open',
    };
  });
};

/** The number the next pin gets: above every existing pin and every number ever handed out (`seq`). */
export const nextPinNumber = (pins, seq = 0) =>
  Math.max(Number(seq) || 0, ...sanitizePins(pins).map((p) => p.n)) + 1;

/**
 * A new open pin at the given spot.
 * @returns {{ pins: Array, pinSeq: number } | null} null when the board is full.
 *   Save `pinSeq` with the pins so a deleted number is never handed out again.
 */
export const addPin = (pins, x, y, seq = 0) => {
  const list = sanitizePins(pins);
  if (list.length >= PRINTING_LIMITS.pins) return null;
  const n = nextPinNumber(list, seq);
  return { pins: [...list, { id: newId('pin'), n, x: unit(x), y: unit(y), text: '', status: 'open' }], pinSeq: n };
};

/** The same pins with one moved to (x, y), kept inside the artwork. */
export const movePin = (pins, id, x, y) =>
  sanitizePins(pins).map((p) => (p.id === id ? { ...p, x: Math.round(unit(x) * 1000) / 1000, y: Math.round(unit(y) * 1000) / 1000 } : p));

/** Arrow-key step: 1% of the artwork, 5% with Shift. */
export const NUDGE = { small: 0.01, large: 0.05 };

export const pinCounts = (pins) => {
  const counts = { open: 0, fixed: 0, approved: 0 };
  sanitizePins(pins).forEach((p) => { counts[p.status] += 1; });
  return counts;
};

// ---- Artwork approval ----------------------------------------------------

export const VERSION_STATUSES = ['pending', 'approved', 'changes'];

export const sanitizeVersions = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((v) => v && Number.isFinite(Number(v.version)))
    .slice(0, PRINTING_LIMITS.versions)
    .map((v) => ({
      id: clean(v.id, 60) || newId('ver'),
      version: Math.max(1, Math.round(Number(v.version))),
      imageUrl: safeHttpUrl(v.imageUrl) || '',
      note: clean(v.note, 300),
      uploadedAt: v.uploadedAt || null,
      status: VERSION_STATUSES.includes(v.status) ? v.status : 'pending',
      decidedBy: clean(v.decidedBy, 80),
      decisionNote: clean(v.decisionNote, 400),
      decidedAt: v.decidedAt || null,
    }));

/** The latest version: the one the client is being asked about. */
export const currentVersion = (versions) => {
  const list = sanitizeVersions(versions);
  return list.length ? list[list.length - 1] : null;
};

/**
 * Add the next version (v1, v2 ...). A new version always starts as pending, so
 * an earlier approval can never carry over to changed artwork.
 * @returns {Array|null} null when the list is full or there is no picture
 */
export const addVersion = (versions, { imageUrl, note = '' }, now = new Date()) => {
  const list = sanitizeVersions(versions);
  const url = safeHttpUrl(imageUrl);
  if (!url || list.length >= PRINTING_LIMITS.versions) return null;
  const next = list.reduce((max, v) => Math.max(max, v.version), 0) + 1;
  return [
    ...list,
    {
      id: newId('ver'), version: next, imageUrl: url, note: clean(note, 300), uploadedAt: now.toISOString(),
      status: 'pending', decidedBy: '', decisionNote: '', decidedAt: null,
    },
  ];
};

/**
 * Approve or ask for changes on a pending version.
 * Approving needs the approver's name; asking for changes needs a reason.
 * @returns {{ versions: Array } | { error: string }}
 */
export const decideVersion = (versions, id, { status, by = '', note = '' }, now = new Date()) => {
  const list = sanitizeVersions(versions);
  const target = list.find((v) => v.id === id);
  if (!target) return { error: 'That version was not found' };
  if (target.status !== 'pending') return { error: 'This version already has a decision. Upload a new version to continue.' };
  if (status !== 'approved' && status !== 'changes') return { error: 'Choose approve or request changes' };
  if (!target.imageUrl) return { error: 'Upload the artwork before it can be decided' };
  const by_ = clean(by, 80);
  const note_ = clean(note, 400);
  if (status === 'approved' && !by_) return { error: 'Type the approver\'s name to sign off' };
  if (status === 'changes' && !note_) return { error: 'Say what needs to change' };
  return {
    versions: list.map((v) =>
      v.id === id ? { ...v, status, decidedBy: by_, decisionNote: note_, decidedAt: now.toISOString() } : v
    ),
  };
};

// ---- Signage elevation ---------------------------------------------------

export const ELEVATION_UNITS = [
  { value: 'ft', label: 'ft', area: 'sq ft' },
  { value: 'in', label: 'in', area: 'sq in' },
  { value: 'mm', label: 'mm', area: 'mm²' },
  { value: 'cm', label: 'cm', area: 'cm²' },
  { value: 'm', label: 'm', area: 'm²' },
];

export const elevationUnit = (value) => ELEVATION_UNITS.find((u) => u.value === value) || ELEVATION_UNITS[0];

export const positiveNumber = (value) => {
  const raw = String(value ?? '').trim();
  if (raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** "12 ft", "4.5 ft": no trailing zeros. */
export const formatDimension = (value, unitValue) => {
  const n = positiveNumber(value);
  if (n === null) return '';
  return `${Number(n.toFixed(2))} ${elevationUnit(unitValue).label}`;
};

export const ELEVATION_VIEW = { w: 380, h: 280, left: 64, right: 24, top: 40, bottom: 34 };

/**
 * Where to draw the board. Everything is scaled together so the proportions
 * are true: width, height and the mounting height above the ground.
 * @returns {null | { scale, board: {x,y,w,h}, groundY: number|null, mountingY: number|null }}
 */
export const elevationLayout = ({ width, height, mountingHeight }, view = ELEVATION_VIEW) => {
  const w = positiveNumber(width);
  const h = positiveNumber(height);
  if (w === null || h === null) return null;
  const mount = positiveNumber(mountingHeight);
  const availW = view.w - view.left - view.right;
  const availH = view.h - view.top - view.bottom;
  const totalH = h + (mount || 0);
  const scale = Math.min(availW / w, availH / totalH);
  const bw = w * scale;
  const bh = h * scale;
  const x = view.left + (availW - bw) / 2;
  const groundY = view.h - view.bottom;
  const bottomY = mount ? groundY - mount * scale : groundY - (availH - bh) / 2;
  return {
    scale,
    board: { x, y: bottomY - bh, w: bw, h: bh },
    groundY: mount ? groundY : null,
    mountingY: mount ? bottomY : null,
  };
};

export const elevationArea = (width, height, unitValue) => {
  const w = positiveNumber(width);
  const h = positiveNumber(height);
  if (w === null || h === null) return '';
  return `${Number((w * h).toFixed(2))} ${elevationUnit(unitValue).area}`;
};

// ---- Colour palette ------------------------------------------------------

/** '#RRGGBB' from "#f00", "ff0000" or "#FF0000", else null. */
export const normalizeHex = (value) => {
  const raw = String(value ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) return `#${[...raw].map((c) => c + c).join('').toUpperCase()}`;
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
};

/** CMYK percentages from "0 100 100 0", "0,100,100,0" or "C0 M100 Y100 K0"; null when not four values within 0..100. */
export const parseCmyk = (value) => {
  const nums = String(value ?? '').match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length !== 4) return null;
  const [c, m, y, k] = nums.map(Number);
  if ([c, m, y, k].some((n) => n < 0 || n > 100)) return null;
  return { c, m, y, k };
};

/** Screen approximation of a CMYK colour. Print will differ; it is only for the swatch on the canvas. */
export const cmykToHex = ({ c, m, y, k }) => {
  const channel = (v) => Math.round(255 * (1 - v / 100) * (1 - k / 100));
  return `#${[channel(c), channel(m), channel(y)].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

/** Black or white, whichever reads better on `hex`. */
export const readableOn = (hex) => {
  const h = normalizeHex(hex);
  if (!h) return '#111827';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? '#111827' : '#FFFFFF';
};

export const swatchColor = (swatch) => {
  const hex = normalizeHex(swatch?.hex);
  if (hex) return hex;
  const cmyk = parseCmyk(swatch?.cmyk);
  return cmyk ? cmykToHex(cmyk) : null;
};

export const sanitizeSwatches = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, PRINTING_LIMITS.swatches)
    .map((s, i) => ({
      id: clean(s.id, 60) || `sw-${i}`,
      name: clean(s.name, 60),
      hex: clean(s.hex, 9),
      cmyk: clean(s.cmyk, 30),
      pantone: clean(s.pantone, 40),
      matched: s.matched === true,
    }));

export const matchedCount = (swatches) => {
  const list = sanitizeSwatches(swatches);
  return { matched: list.filter((s) => s.matched).length, total: list.length };
};

// ---- Material swatch board -----------------------------------------------

export const MATERIAL_TYPES = ['Vinyl', 'Flex', 'ACP', 'Acrylic', 'Paper', 'Board', 'Metal', 'Other'];

export const sanitizeMaterials = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .slice(0, PRINTING_LIMITS.materials)
    .map((m, i) => ({
      id: clean(m.id, 60) || `mat-${i}`,
      name: clean(m.name, 80),
      type: MATERIAL_TYPES.includes(m.type) ? m.type : 'Other',
      imageUrl: safeHttpUrl(m.imageUrl) || '',
      finish: clean(m.finish, 60),
      thickness: clean(m.thickness, 30),
      supplier: clean(m.supplier, 80),
    }));

// ---- Panel entries -------------------------------------------------------

export const PRINTING_BLOCK_SIZES = {
  'block-proof': { w: 440, h: 420 },
  'block-artwork': { w: 380, h: 420 },
  'block-elevation': { w: 400, h: 400 },
  'block-palette': { w: 440, h: 280 },
  'block-swatches': { w: 440, h: 320 },
};

const printingElement = (kind, id, name, hint, data) => ({
  id,
  name,
  type: `block-${kind}`,
  preview: hint,
  nodeType: BLOCK_NODE_TYPE,
  data: { kind, ...data },
});

/** Everything in the "Printing and signage" category, in panel order. */
export const getPrintingElements = () => [
  printingElement('proof', 'print-proof', 'Proof Markup', 'Artwork with numbered pins, comments and a status for each', {
    label: 'Proof markup', imageUrl: '', pins: [], pinSeq: 0,
  }),
  printingElement('artwork', 'print-artwork', 'Artwork Approval Card', 'Versions, client sign-off and change requests', {
    label: 'Artwork approval', client: '', job: '', versions: [],
  }),
  printingElement('elevation', 'print-elevation', 'Signage Elevation', 'Board drawn to scale with dimensions and mounting height', {
    label: 'Signage elevation', width: '12', height: '4', unit: 'ft', mountingHeight: '10',
    material: '', frame: '', lighting: '', finish: '',
  }),
  printingElement('palette', 'print-palette', 'Colour Palette', 'Swatches with CMYK, HEX and Pantone, ticked when matched', {
    label: 'Colour palette',
    swatches: [
      { id: 'sw-1', name: 'Brand red', hex: '#D62828', cmyk: '0 90 90 10', pantone: '', matched: false },
      { id: 'sw-2', name: 'Charcoal', hex: '#2B2D42', cmyk: '70 60 40 60', pantone: '', matched: false },
    ],
  }),
  printingElement('swatches', 'print-swatches', 'Material Swatch Board', 'Materials with photo, finish, thickness and supplier', {
    label: 'Material swatches', items: [],
  }),
];
