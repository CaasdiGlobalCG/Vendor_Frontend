// ============================================================
// FILE: SupportPills.jsx
// PURPOSE: The support status and priority pills — the single source of tone for the whole
//          support surface.
// CONNECTS TO: support-tone.js, index.js, pages/support/SupportPage.jsx,
//              pages/support/SupportTicketDetail.jsx.
//
// Promoted from the winning "Refined" design variant. Replaces the two hand-rolled pill spans
// the live detail page carried, which could not distinguish in_progress from resolved.
// ============================================================

import { priorityTone, statusTone } from './support-tone';

/**
 * Status pill: coloured dot + label on a tinted hairline chip.
 * @param {{ status: string, className?: string }} props
 */
export function StatusPill({ status, className = '' }) {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.chip} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
      {tone.label}
    </span>
  );
}

/**
 * Priority pill: hue carries the level, the label disambiguates.
 * @param {{ priority: string, className?: string }} props
 */
export function PriorityPill({ priority, className = '' }) {
  const tone = priorityTone(priority);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.chip} ${className}`}
    >
      {tone.label}
    </span>
  );
}
