// ============================================================
// FILE: StatusPill.jsx
// PURPOSE: Status indicator for a project/workspace. Dot + label, colour meaning
//          only. The single place a status becomes a colour in these variants.
// CONNECTS TO: components/dashboard/dashboard.constants.js (toneFor, STATUS_LABEL).
// ============================================================

import { STATUS_LABEL, toneFor } from './dashboard.constants';

/**
 * @param {object} props
 * @param {string} props.status standardised status (Completed | InProgress | Pending)
 * @param {'sm'|'md'} [props.size='sm']
 */
export function StatusPill({ status, size = 'sm' }) {
  const tone = toneFor(status);
  const label = STATUS_LABEL[status] || status;

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
        size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]',
        tone.pill,
      ].join(' ')}
    >
      {/* The dot carries the state; the pill tint is supporting only. */}
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
