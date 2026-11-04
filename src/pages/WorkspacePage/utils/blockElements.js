/**
 * Canvas "block" elements: heading, divider, status badge, progress bar and
 * KPI card. One node type (`blockNode`) renders all five; `data.kind` says
 * which. Pure helpers here so the rules are testable without React.
 */

export const BLOCK_NODE_TYPE = 'blockNode';

export const BLOCK_KINDS = [
  'heading', 'divider', 'status', 'progress', 'kpi', 'shape', 'embed', 'link', 'comment', 'countdown',
  'signature', 'photos', 'location', 'rating', 'daterange', 'measure', 'code', 'callout',
];

/** Blocks a person fills in on the canvas: sign-off, photos, place, score, dates, a measurement, a code, a note. */
export const INPUT_KINDS = ['signature', 'photos', 'location', 'rating', 'daterange', 'measure', 'code', 'callout'];

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the wall clock). */
export const localDateString = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const SHAPES = ['rectangle', 'ellipse', 'diamond', 'arrow'];

/**
 * Blocks that only decorate or annotate the canvas: no connection handles.
 * (Rectangles, ellipses and diamonds do connect, so they work in flow diagrams.)
 */
export const isDecorativeBlock = (kind, data = {}) =>
  kind === 'heading' || kind === 'divider' || kind === 'comment' || (kind === 'shape' && data?.shape === 'arrow');

export const isBlockNode = (node) => !!node && node.type === BLOCK_NODE_TYPE;

export const isDecorativeBlockNode = (node) => isBlockNode(node) && isDecorativeBlock(node.data?.kind, node.data);

/** Blocks that are not worth a slide in Present mode (headings are: they open a section). */
export const isNonSlideBlockNode = (node) =>
  isBlockNode(node) &&
  (node.data?.kind === 'divider' || node.data?.kind === 'comment' || (node.data?.kind === 'shape' && node.data?.shape === 'arrow'));

/** Status options: label + design token the badge is drawn with. */
export const STATUS_OPTIONS = [
  { id: 'on-track', label: 'On track', tone: 'success' },
  { id: 'in-progress', label: 'In progress', tone: 'info' },
  { id: 'at-risk', label: 'At risk', tone: 'warning' },
  { id: 'delayed', label: 'Delayed', tone: 'danger' },
  { id: 'approved', label: 'Approved', tone: 'success' },
  { id: 'pending', label: 'Pending', tone: 'warning' },
  { id: 'on-hold', label: 'On hold', tone: 'neutral' },
  { id: 'done', label: 'Done', tone: 'neutral' },
];

export const TONE_CLASSES = {
  success: { chip: 'bg-success/10 text-success border-success/20', dot: 'bg-success', bar: 'bg-success' },
  info: { chip: 'bg-info/10 text-info border-info/20', dot: 'bg-info', bar: 'bg-info' },
  warning: { chip: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning', bar: 'bg-warning' },
  danger: { chip: 'bg-danger/10 text-danger border-danger/20', dot: 'bg-danger', bar: 'bg-danger' },
  neutral: { chip: 'bg-surface-hover text-dim border-line', dot: 'bg-dim', bar: 'bg-dim' },
};

export const getStatusOption = (statusId) =>
  STATUS_OPTIONS.find((s) => s.id === statusId) || STATUS_OPTIONS[1];

export const HEADING_SIZES = {
  h1: { label: 'Large', className: 'text-4xl font-bold tracking-tight' },
  h2: { label: 'Medium', className: 'text-2xl font-semibold tracking-tight' },
  h3: { label: 'Small', className: 'text-lg font-semibold' },
};

export const DIVIDER_STYLES = ['solid', 'dashed', 'dotted'];

/** Default `data` for a new block of `kind`. */
export const defaultBlockData = (kind) => {
  switch (kind) {
    case 'heading':
      return { kind, text: 'Heading', level: 'h2', align: 'left' };
    case 'divider':
      return { kind, orientation: 'horizontal', lineStyle: 'solid', length: 360 };
    case 'status':
      return { kind, label: 'Status', status: 'in-progress', note: '' };
    case 'progress':
      return { kind, label: 'Progress', value: 40, target: 100, unit: '%', showPercent: true };
    case 'kpi':
      return { kind, label: 'Total invoiced', value: '4,20,000', prefix: '₹', suffix: '', delta: 12, deltaLabel: 'vs last month', trend: [] };
    case 'shape':
      return {
        kind,
        shape: 'rectangle',
        fill: 'neutral',
        text: '',
        width: 200,
        height: 120,
      };
    case 'embed':
      return { kind, url: '', title: '', embedType: 'video', width: 480, height: 300 };
    case 'link':
      return { kind, url: '', title: '', description: '' };
    case 'comment':
      return { kind, comments: [] };
    case 'countdown':
      return { kind, label: 'Deadline', target: new Date(Date.now() + 7 * 86400000).toISOString() };
    case 'signature':
      return { kind, label: 'Sign-off', signerName: '', role: '', strokes: [], signedAt: null };
    case 'photos':
      return { kind, label: 'Site photos', mode: 'grid', photos: [] };
    case 'location':
      return { kind, label: 'Site location', address: '', lat: '', lng: '' };
    case 'rating':
      return { kind, label: 'Rating', value: 0, max: 5 };
    case 'daterange':
      return { kind, label: 'Schedule', start: localDateString(), end: localDateString(new Date(Date.now() + 7 * 86400000)) };
    case 'measure':
      return { kind, label: 'Measurement', value: '', unit: 'm²' };
    case 'code':
      return { kind, label: 'Scan code', format: 'qr', value: '' };
    case 'callout':
      return { kind, tone: 'info', title: 'Note', text: 'Write something the team should not miss.' };
    default:
      return { kind: 'heading', text: 'Heading', level: 'h2', align: 'left' };
  }
};

// ---- Web addresses -------------------------------------------------------

/**
 * A clean http(s) address, or null. Adds https:// when the scheme is missing and
 * refuses everything else (javascript:, data:, file: ...), so a pasted link can
 * never become a script.
 */
export const safeHttpUrl = (input) => {
  const raw = String(input ?? '').trim();
  if (!raw || /\s/.test(raw)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
};

export const hostOf = (input) => {
  const safe = safeHttpUrl(input);
  return safe ? new URL(safe).hostname.replace(/^www\./, '') : '';
};

const hostIs = (host, domain) => host === domain || host.endsWith(`.${domain}`);

/**
 * Embeddable form of an address, from a short allow-list of providers.
 * Anything else returns null and is shown as a plain link instead of a frame.
 * @returns {{ provider: string, src: string } | null}
 */
export const embedSource = (input) => {
  const safe = safeHttpUrl(input);
  if (!safe) return null;
  const url = new URL(safe);
  const host = url.hostname.replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean);

  if (hostIs(host, 'youtu.be') && parts[0]) {
    return { provider: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(parts[0])}` };
  }
  if (hostIs(host, 'youtube.com')) {
    const id = url.searchParams.get('v') || (['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : null);
    if (id) return { provider: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` };
    return null;
  }
  if (hostIs(host, 'loom.com')) {
    const i = parts.findIndex((p) => p === 'share' || p === 'embed');
    if (i >= 0 && parts[i + 1]) return { provider: 'Loom', src: `https://www.loom.com/embed/${encodeURIComponent(parts[i + 1])}` };
    return null;
  }
  if (hostIs(host, 'vimeo.com')) {
    const id = parts.find((p) => /^\d+$/.test(p));
    if (id) return { provider: 'Vimeo', src: `https://player.vimeo.com/video/${id}` };
    return null;
  }
  if (hostIs(host, 'figma.com') && ['file', 'design', 'proto', 'board'].includes(parts[0])) {
    return { provider: 'Figma', src: `https://www.figma.com/embed?embed_host=workspace&url=${encodeURIComponent(safe)}` };
  }
  if (host === 'docs.google.com' && ['document', 'spreadsheets', 'presentation', 'forms'].includes(parts[0])) {
    const base = url.origin + url.pathname.replace(/\/(edit|view|pub|viewform)?\/?$/, '');
    return { provider: 'Google Docs', src: `${base}/${parts[0] === 'forms' ? 'viewform?embedded=true' : 'preview'}` };
  }
  return null;
};

// ---- Countdown -----------------------------------------------------------

/** Time left until `target`: whole days, hours and minutes (never negative), plus whether it has passed. */
export const timeRemaining = (target, now = Date.now()) => {
  const t = new Date(target).getTime();
  if (!Number.isFinite(t)) return { valid: false, expired: false, days: 0, hours: 0, minutes: 0, totalMs: 0 };
  const diff = t - now;
  if (diff <= 0) return { valid: true, expired: true, days: 0, hours: 0, minutes: 0, totalMs: 0 };
  const minutesTotal = Math.floor(diff / 60000);
  return {
    valid: true,
    expired: false,
    days: Math.floor(minutesTotal / 1440),
    hours: Math.floor((minutesTotal % 1440) / 60),
    minutes: minutesTotal % 60,
    totalMs: diff,
  };
};

/** Countdown urgency: red inside a day, amber inside three days. */
export const countdownTone = ({ expired, totalMs }) => {
  if (expired) return 'danger';
  if (totalMs < 86400000) return 'danger';
  if (totalMs < 3 * 86400000) return 'warning';
  return 'info';
};

// ---- Shapes --------------------------------------------------------------

export const SHAPE_FILLS = [
  { id: 'none', label: 'None' },
  { id: 'neutral', label: 'Grey' },
  { id: 'info', label: 'Blue' },
  { id: 'success', label: 'Green' },
  { id: 'warning', label: 'Amber' },
  { id: 'danger', label: 'Red' },
];

/** CSS colours (design tokens) for a shape's fill and outline. */
export const shapeColors = (fill) => {
  if (fill === 'none') return { fill: 'transparent', stroke: 'rgb(var(--text-muted))' };
  if (fill === 'neutral' || !SHAPE_FILLS.some((f) => f.id === fill)) {
    return { fill: 'rgb(var(--surface-hover))', stroke: 'rgb(var(--text-muted))' };
  }
  return { fill: `rgb(var(--status-${fill}) / 0.14)`, stroke: `rgb(var(--status-${fill}))` };
};

const toNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const n = Number(value.replace(/[,\s₹$€£%]/g, ''));
  return value.trim() !== '' && Number.isFinite(n) ? n : null;
};

/** Progress as a whole-number percentage clamped to 0..100. */
export const progressPercent = (value, target = 100) => {
  const v = toNumber(value);
  const t = toNumber(target);
  if (v === null || t === null || t <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((v / t) * 100)));
};

/** Bar tone from how far along it is (used when the user has not chosen one). */
export const progressTone = (percent) => {
  if (percent >= 100) return 'success';
  if (percent >= 60) return 'info';
  if (percent >= 30) return 'warning';
  return 'danger';
};

/** `{ sign: 'up'|'down'|'flat', text: '+12%' }` for a KPI delta. */
export const describeDelta = (delta) => {
  const n = toNumber(delta);
  if (n === null || n === 0) return { sign: 'flat', text: n === 0 ? '0%' : '' };
  const rounded = Math.round(Math.abs(n) * 10) / 10;
  return n > 0 ? { sign: 'up', text: `+${rounded}%` } : { sign: 'down', text: `-${rounded}%` };
};

/**
 * Points for a small sparkline. Accepts numbers or "1, 4, 2" text; returns an
 * SVG polyline `points` string inside a w x h box, or '' when there is nothing
 * to draw.
 */
export const sparklinePoints = (trend, w = 96, h = 28, pad = 2) => {
  const list = (Array.isArray(trend) ? trend : String(trend || '').split(/[\s,]+/))
    .map(toNumber)
    .filter((n) => n !== null);
  if (list.length < 2) return '';
  const min = Math.min(...list);
  const max = Math.max(...list);
  const span = max - min || 1;
  return list
    .map((n, i) => {
      const x = pad + (i / (list.length - 1)) * (w - pad * 2);
      const y = h - pad - ((n - min) / span) * (h - pad * 2);
      return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
    })
    .join(' ');
};

// ---- Rating --------------------------------------------------------------

export const RATING_MAX_CHOICES = [3, 5, 10];

/** Number of stars: whole number from 3 to 10, 5 when unset. */
export const ratingMax = (max) => Math.max(3, Math.min(10, Math.round(Number(max)) || 5));

/** Whole-number rating between 0 and `max` (max itself limited to 3..10). */
export const clampRating = (value, max = 5) => {
  const m = ratingMax(max);
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(m, n));
};

// ---- Date range ----------------------------------------------------------

/** A real calendar day from YYYY-MM-DD at local midnight, or null (rejects 2026-02-31 etc.). */
export const parseDay = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
};

const DAY_MS = 86400000;
const dayDiff = (a, b) => Math.round((b.getTime() - a.getTime()) / DAY_MS);

/**
 * Describes a start..end range relative to `now`.
 * `days` counts both ends (1 Oct to 7 Oct is 7 days).
 * @returns {{ valid: boolean, reversed: boolean, days: number, state: 'upcoming'|'active'|'ended'|'invalid', daysUntil: number, daysLeft: number }}
 */
export const dateRangeInfo = (start, end, now = new Date()) => {
  const s = parseDay(start);
  const e = parseDay(end);
  const invalid = { valid: false, reversed: false, days: 0, state: 'invalid', daysUntil: 0, daysLeft: 0 };
  if (!s || !e) return invalid;
  if (e < s) return { ...invalid, reversed: true };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = dayDiff(s, e) + 1;
  if (today < s) return { valid: true, reversed: false, days, state: 'upcoming', daysUntil: dayDiff(today, s), daysLeft: days };
  if (today > e) return { valid: true, reversed: false, days, state: 'ended', daysUntil: 0, daysLeft: 0 };
  return { valid: true, reversed: false, days, state: 'active', daysUntil: 0, daysLeft: dayDiff(today, e) };
};

// ---- Measurement ---------------------------------------------------------

export const MEASURE_UNITS = ['m', 'm²', 'm³', 'ft', 'sq ft', 'cu ft', 'mm', 'kg', 'tonne', 'L', 'nos', '%', '₹'];

/** Number as typed, shown with Indian digit grouping when it is a plain number. */
export const formatMeasure = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const n = toNumber(raw);
  if (n === null) return raw;
  return n.toLocaleString('en-IN', { maximumFractionDigits: 4 });
};

// ---- Location ------------------------------------------------------------

/** A latitude / longitude within range, or null. */
export const parseCoordinate = (value, axis) => {
  const raw = String(value ?? '').trim();
  if (raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const limit = axis === 'lat' ? 90 : 180;
  return Math.abs(n) <= limit ? n : null;
};

/** Embeddable OpenStreetMap view centred on a point, or null without valid coordinates. */
export const mapEmbedUrl = (lat, lng) => {
  const la = parseCoordinate(lat, 'lat');
  const lo = parseCoordinate(lng, 'lng');
  if (la === null || lo === null) return null;
  const d = 0.004;
  const box = [lo - d, la - d, lo + d, la + d].map((n) => n.toFixed(6)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(box)}&layer=mapnik&marker=${la.toFixed(6)}%2C${lo.toFixed(6)}`;
};

/** Link that opens the place in Google Maps: by coordinates, else by address, else ''. */
export const mapsUrl = (lat, lng, address = '') => {
  const la = parseCoordinate(lat, 'lat');
  const lo = parseCoordinate(lng, 'lng');
  const query = la !== null && lo !== null ? `${la},${lo}` : String(address || '').trim();
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '';
};

// ---- Callout -------------------------------------------------------------

export const CALLOUT_TONES = [
  { id: 'info', label: 'Info', title: 'Note' },
  { id: 'warning', label: 'Warning', title: 'Heads up' },
  { id: 'success', label: 'Success', title: 'All good' },
  { id: 'danger', label: 'Critical', title: 'Critical' },
];

export const getCalloutTone = (id) => CALLOUT_TONES.find((t) => t.id === id) || CALLOUT_TONES[0];

// ---- Signature -----------------------------------------------------------

export const SIGNATURE_BOX = { w: 320, h: 140 };
const SIG_LIMITS = { strokes: 40, pointsPerStroke: 400, totalPoints: 3000 };

/**
 * Strokes are lists of [x, y] points in the signature box. Anything that is not
 * a finite pair is dropped and the size is capped, so a stored value can never
 * balloon the canvas data or break the drawing.
 */
export const sanitizeStrokes = (strokes) => {
  if (!Array.isArray(strokes)) return [];
  const out = [];
  let total = 0;
  for (const stroke of strokes) {
    if (out.length >= SIG_LIMITS.strokes || total >= SIG_LIMITS.totalPoints) break;
    if (!Array.isArray(stroke)) continue;
    const points = [];
    for (const p of stroke) {
      if (points.length >= SIG_LIMITS.pointsPerStroke || total + points.length >= SIG_LIMITS.totalPoints) break;
      if (!Array.isArray(p)) continue;
      const x = Number(p[0]);
      const y = Number(p[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      points.push([
        Math.round(Math.max(0, Math.min(SIGNATURE_BOX.w, x)) * 10) / 10,
        Math.round(Math.max(0, Math.min(SIGNATURE_BOX.h, y)) * 10) / 10,
      ]);
    }
    if (points.length) {
      total += points.length;
      out.push(points);
    }
  }
  return out;
};

/** SVG path for the strokes. A single tap becomes a dot (a zero-length line). */
export const strokesToPath = (strokes) =>
  sanitizeStrokes(strokes)
    .map((pts) => {
      const [first, ...rest] = pts;
      const segs = rest.length ? rest.map(([x, y]) => `L${x} ${y}`).join(' ') : `L${first[0] + 0.1} ${first[1]}`;
      return `M${first[0]} ${first[1]} ${segs}`;
    })
    .join(' ');

// ---- Photos --------------------------------------------------------------

export const PHOTO_LIMITS = { grid: 6, beforeafter: 2 };
export const PHOTO_MODES = [
  { value: 'grid', label: 'Grid' },
  { value: 'beforeafter', label: 'Before / After' },
];

/** Photos that can be drawn: http(s) addresses only (uploads come back as https). */
export const visiblePhotos = (photos, mode = 'grid') => {
  const limit = PHOTO_LIMITS[mode] || PHOTO_LIMITS.grid;
  return (Array.isArray(photos) ? photos : [])
    .filter((p) => p && safeHttpUrl(p.url))
    .slice(0, limit)
    .map((p) => ({ url: safeHttpUrl(p.url), caption: String(p.caption || '') }));
};

// ---- Barcode (Code 128, set B) -------------------------------------------

// Bar / space widths for symbols 0..105 (six digits each); 106 is the 7-element stop.
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232',
];
const CODE128_STOP = '2331112';
const CODE128_START_B = 104;

/** Printable ASCII only (32..126) is available in set B. */
export const isBarcodeText = (text) => /^[\x20-\x7e]+$/.test(String(text ?? ''));

/** Symbol values (start, data, checksum, stop) for `text`, or null when it cannot be encoded. */
export const code128Symbols = (text) => {
  const value = String(text ?? '');
  if (!value || value.length > 40 || !isBarcodeText(value)) return null;
  const data = [...value].map((c) => c.charCodeAt(0) - 32);
  const sum = data.reduce((acc, v, i) => acc + v * (i + 1), CODE128_START_B);
  return [CODE128_START_B, ...data, sum % 103, 106];
};

/**
 * Bars for `text` as `{ x, w }` rectangles in module units, plus the total width
 * (including the 10-module quiet zone either side). null when it cannot be encoded.
 */
export const code128Bars = (text) => {
  const symbols = code128Symbols(text);
  if (!symbols) return null;
  const quiet = 10;
  const bars = [];
  let x = quiet;
  symbols.forEach((sym) => {
    const pattern = sym === 106 ? CODE128_STOP : CODE128_PATTERNS[sym];
    [...pattern].forEach((digit, i) => {
      const w = Number(digit);
      if (i % 2 === 0) bars.push({ x, w });
      x += w;
    });
  });
  return { bars, width: x + quiet };
};

/** Elements shown in the panel and the quick-add menu (blocks only; see BASICS_ELEMENTS for the full Basics list). */
export const BLOCK_CATALOG = [
  { kind: 'heading', name: 'Heading', hint: 'Large title for a section of the canvas' },
  { kind: 'divider', name: 'Divider', hint: 'Line that separates areas' },
  { kind: 'status', name: 'Status Badge', hint: 'On track, delayed, approved...' },
  { kind: 'progress', name: 'Progress Bar', hint: 'How far along something is' },
  { kind: 'kpi', name: 'KPI Card', hint: 'Big number with change and trend' },
];

/** Canvas element descriptor (same shape other elements use) for a block kind. */
export const blockElementFor = (kind, overrides = {}, meta = {}) => {
  const entry = BLOCK_CATALOG.find((b) => b.kind === kind) || {};
  const name = meta.name || entry.name || kind;
  return {
    id: meta.id || `block-${kind}`,
    name,
    type: `block-${kind}`,
    preview: meta.hint || entry.hint || name,
    nodeType: BLOCK_NODE_TYPE,
    data: { ...defaultBlockData(kind), ...overrides },
  };
};

const shapeEntry = (shape, name, hint, extra = {}) =>
  blockElementFor('shape', { shape, ...extra }, { id: `block-shape-${shape}`, name, hint });

/**
 * Everything in the Basics category, in panel order. Most are blocks; Text,
 * Section / Frame and Image reuse the elements the canvas already has.
 */
export const getBasicsElements = () => [
  {
    id: 'basics-text',
    name: 'Text',
    type: 'text',
    preview: 'Free text anywhere on the canvas',
    content: '',
    fontSize: '14',
    fontFamily: 'Arial',
    color: '#111827',
    backgroundColor: 'transparent',
    formats: [],
    caption: true,
  },
  blockElementFor('heading'),
  shapeEntry('rectangle', 'Rectangle', 'Box for grouping or labelling'),
  shapeEntry('ellipse', 'Ellipse', 'Oval, start / end of a flow', { height: 120 }),
  shapeEntry('diamond', 'Diamond', 'Decision point in a flow', { height: 140 }),
  shapeEntry('arrow', 'Arrow', 'Points at something', { width: 200, height: 48, fill: 'neutral' }),
  blockElementFor('divider'),
  { id: 'frame', name: 'Section / Frame', type: 'frame', preview: 'Named area that holds other elements', width: 300, height: 200 },
  {
    id: 'image-block-basic',
    name: 'Image',
    type: 'image-block',
    preview: 'Upload a picture with a caption',
    imageBlockData: { imageUrl: '', caption: '', timestamp: '', geotag: '', annotations: [], width: 80 },
  },
  blockElementFor('embed', { embedType: 'video' }, { id: 'block-embed-video', name: 'Video Embed', hint: 'YouTube, Loom or Vimeo link' }),
  blockElementFor('embed', { embedType: 'web', width: 560, height: 360 }, { id: 'block-embed-web', name: 'Web Embed', hint: 'Figma or Google Docs / Sheets / Slides' }),
  blockElementFor('link', {}, { name: 'Link Card', hint: 'A web address as a tidy card' }),
  blockElementFor('comment', {}, { name: 'Comment Pin', hint: 'Leave a note for the team' }),
  blockElementFor('status'),
  blockElementFor('progress'),
  blockElementFor('kpi'),
  blockElementFor('countdown', {}, { name: 'Countdown', hint: 'Days left until a date' }),
  blockElementFor('signature', {}, { name: 'Signature Pad', hint: 'Client or site sign-off, drawn by hand' }),
  blockElementFor('photos', {}, { id: 'block-photos-grid', name: 'Photo Grid', hint: 'Up to six site photos with captions' }),
  blockElementFor('photos', { mode: 'beforeafter', label: 'Before / After' }, { id: 'block-photos-beforeafter', name: 'Before / After', hint: 'Two photos side by side' }),
  blockElementFor('location', {}, { name: 'Location Pin', hint: 'A place on the map with an address' }),
  blockElementFor('rating', {}, { name: 'Rating', hint: 'Stars for quality or satisfaction' }),
  blockElementFor('daterange', {}, { name: 'Date Range', hint: 'Start and end date with the days between' }),
  blockElementFor('measure', {}, { name: 'Number with Unit', hint: 'A quantity such as 120 m²' }),
  blockElementFor('code', { format: 'qr' }, { id: 'block-code-qr', name: 'QR Code', hint: 'Scannable link or text' }),
  blockElementFor('code', { format: 'barcode', label: 'Barcode' }, { id: 'block-code-barcode', name: 'Barcode', hint: 'Code 128 barcode for a reference' }),
  blockElementFor('callout', {}, { name: 'Callout', hint: 'Info, warning or critical note' }),
];

/** Estimated rendered sizes, used to place a block before it has been measured. */
export const BLOCK_SIZES = {
  'block-heading': { w: 420, h: 48 },
  'block-divider': { w: 360, h: 24 },
  'block-status': { w: 240, h: 104 },
  'block-progress': { w: 300, h: 84 },
  'block-kpi': { w: 280, h: 168 },
  'block-shape': { w: 200, h: 120 },
  'block-embed': { w: 480, h: 300 },
  'block-link': { w: 320, h: 112 },
  'block-comment': { w: 44, h: 44 },
  'block-countdown': { w: 260, h: 132 },
  'block-signature': { w: 340, h: 240 },
  'block-photos': { w: 380, h: 300 },
  'block-location': { w: 340, h: 300 },
  'block-rating': { w: 260, h: 96 },
  'block-daterange': { w: 280, h: 120 },
  'block-measure': { w: 240, h: 100 },
  'block-code': { w: 220, h: 260 },
  'block-callout': { w: 360, h: 96 },
  text: { w: 200, h: 48 },
};
