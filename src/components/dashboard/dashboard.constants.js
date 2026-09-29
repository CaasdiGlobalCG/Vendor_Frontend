// ============================================================
// FILE: dashboard.constants.js
// PURPOSE: Single source of status semantics, tone maps and formatters for the
//          permanent dashboard component set.
// CONNECTS TO: every file in components/dashboard/**;
//              mirrors the status semantics of pages/VendorDashboard/VendorDashboard.jsx:349-365.
// ============================================================

// ──────────────────────────────────────
// STATUS SEMANTICS
// ──────────────────────────────────────

// The three buckets the real dashboard collapses its raw workspace statuses into.
export const STATUS = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'InProgress',
  PENDING: 'Pending',
};

export const STATUS_ORDER = [STATUS.PENDING, STATUS.IN_PROGRESS, STATUS.COMPLETED];

export const STATUS_LABEL = {
  [STATUS.COMPLETED]: 'Completed',
  [STATUS.IN_PROGRESS]: 'In progress',
  [STATUS.PENDING]: 'Pending',
};

// ──────────────────────────────────────
// TONE MAPS
// ──────────────────────────────────────

// Full literal class strings — never built dynamically, so Tailwind's scanner
// can always see them. Colour here means state, nothing else.
export const STATUS_TONE = {
  [STATUS.COMPLETED]: {
    pill: 'bg-success/10 text-success border-success/20',
    dot: 'bg-success',
    text: 'text-success',
    bar: 'bg-success',
    track: 'bg-success/10',
    rank: 2,
  },
  [STATUS.IN_PROGRESS]: {
    pill: 'bg-info/10 text-info border-info/20',
    dot: 'bg-info',
    text: 'text-info',
    bar: 'bg-info',
    track: 'bg-info/10',
    rank: 1,
  },
  [STATUS.PENDING]: {
    pill: 'bg-warning/10 text-warning border-warning/20',
    dot: 'bg-warning',
    text: 'text-warning',
    bar: 'bg-warning',
    track: 'bg-warning/10',
    rank: 0,
  },
};

// Fallback for a status the mapper did not recognise — neutral, never coloured.
export const NEUTRAL_TONE = {
  pill: 'bg-surface-hover text-dim border-line',
  dot: 'bg-dim',
  text: 'text-dim',
  bar: 'bg-dim',
  track: 'bg-surface-hover',
  rank: 0,
};

/** @returns {typeof NEUTRAL_TONE} tone record for a standardised status */
export function toneFor(status) {
  return STATUS_TONE[status] || NEUTRAL_TONE;
}

// ──────────────────────────────────────
// FORMATTERS
// ──────────────────────────────────────

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Compact INR for KPI tiles — ₹1.2 Cr / ₹4.5 L / ₹9,800.
 * Falls back to an em dash for missing values so a tile never shows a fake 0.
 * @param {number|string} value
 * @returns {string}
 */
export function formatCurrencyShort(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return inr.format(n);
}

/** Full INR with grouping, for detail rows. */
export function formatCurrency(value) {
  const n = Number(value);
  return Number.isFinite(n) ? inr.format(n) : '—';
}

/**
 * Date for display. Returns an em dash rather than "Invalid Date" or "N/A" noise.
 * @param {Date|string|number} value
 */
export function formatDate(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Whole days between a date and now — used instead of an invented progress %.
 * @returns {number|null} null when the date is missing/unparseable
 */
export function daysSince(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

/** "12 days" / "today" / "—" — plain language age, never a fabricated number. */
export function formatAge(value) {
  const days = daysSince(value);
  if (days === null) return '—';
  if (days === 0) return 'today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

// ──────────────────────────────────────
// STAGE BOARD
// ──────────────────────────────────────

// The three delivery columns used by the stage-board direction. Order is
// Pending → In progress → Completed, which is the real lifecycle order.
export const STAGES = [
  {
    id: STATUS.PENDING,
    label: 'Pending',
    hint: 'Awaiting first move',
    tone: STATUS_TONE[STATUS.PENDING],
  },
  {
    id: STATUS.IN_PROGRESS,
    label: 'In progress',
    hint: 'Work underway',
    tone: STATUS_TONE[STATUS.IN_PROGRESS],
  },
  {
    id: STATUS.COMPLETED,
    label: 'Completed',
    hint: 'Delivered',
    tone: STATUS_TONE[STATUS.COMPLETED],
  },
];

// ──────────────────────────────────────
// COPY
// ──────────────────────────────────────

export const COPY = {
  noProjects: 'No approved projects yet',
  noProjectsHint: 'Projects appear here once a project manager approves your lead and grants workspace access.',
  noTenders: 'No tenders published',
  noTendersHint: 'Open tenders matched to your vendor profile will be listed here.',
  noFinance: 'No finance data',
  noFinanceHint: 'Your revenue and expense summary appears once finance records exist.',
  loadFailed: 'Could not load',
  signedOut: 'Not signed in',
  signedOutHint: 'Open these variants from a signed-in vendor session to see real data.',
};
