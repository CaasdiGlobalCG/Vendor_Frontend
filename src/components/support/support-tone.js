// ============================================================
// FILE: support-tone.js
// PURPOSE: Status/priority tone maps and the small date helpers the support kit needs.
// CONNECTS TO: SupportPills.jsx, SupportList.jsx, SupportFaqPanel.jsx, index.js,
//              pages/support/SupportPage.jsx, pages/support/SupportTicketDetail.jsx.
//
// Promoted from the winning "Refined" design variant. This REPLACES the two tone maps the
// live support page used to carry inline, which collapsed four statuses onto two colours
// (in_progress and resolved were both `text-ink`) and made `high` and `medium` identical.
//
// TOKENS — read from the app, not invented:
//   palette     tailwind.config.js:21-40 (canvas/surface/line/ink/dim/cta/success/danger/warning/info)
//   breakpoints xs 320 · sm 480 · md 768 · lg 1024 · xl 1280 (tailwind.config.js:220-227)
//
// COLOUR = MEANING. Status and priority are the only coloured things. `brand` (teal) is
// deliberately unused — the config reserves teal for nav (tailwind.config.js:43-44).
// ============================================================

/** Four visually distinct states. */
export const STATUS_TONE = {
  open:        { label: 'Open',        dot: 'bg-success', text: 'text-success', chip: 'border-success/25 bg-success/10 text-success' },
  in_progress: { label: 'In Progress', dot: 'bg-info',    text: 'text-info',    chip: 'border-info/25 bg-info/10 text-info' },
  resolved:    { label: 'Resolved',    dot: 'bg-ink',     text: 'text-ink',     chip: 'border-line bg-surface-hover text-ink' },
  closed:      { label: 'Closed',      dot: 'bg-dim',     text: 'text-dim',     chip: 'border-line bg-transparent text-dim' },
};

/** Four distinguishable priorities — hue carries the level, the label disambiguates. */
export const PRIORITY_TONE = {
  urgent: { label: 'Urgent', chip: 'border-danger/25 bg-danger/10 text-danger' },
  high:   { label: 'High',   chip: 'border-warning/25 bg-warning/10 text-warning' },
  medium: { label: 'Medium', chip: 'border-line bg-surface-hover text-ink' },
  low:    { label: 'Low',    chip: 'border-line bg-transparent text-dim' },
};

/** Filter chips for the ticket list. `resolved` folds closed tickets in. */
export const STATUS_FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'open',        label: 'Open' },
  { key: 'in_progress', label: 'Active' },
  { key: 'resolved',    label: 'Resolved' },
];

export const SUPPORT_HOURS = 'Mon – Fri · 9 AM – 6 PM';
export const SUPPORT_TEAM = 'Vendor Support Team';

export function statusTone(status) {
  return STATUS_TONE[status] || STATUS_TONE.open;
}

export function priorityTone(priority) {
  return PRIORITY_TONE[priority] || PRIORITY_TONE.medium;
}

/** Short absolute date — en-GB, matching the live support page's formatting. */
export function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

/** Relative "2h ago" style timestamp, falling back to a short date. */
export function fmtRelative(ts) {
  if (!ts) return '';
  const then = new Date(ts);
  const diff = Date.now() - then.getTime();
  if (Number.isNaN(diff)) return '';
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return fmtDate(ts);
}
