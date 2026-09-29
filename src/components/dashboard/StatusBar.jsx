// ============================================================
// FILE: StatusBar.jsx
// PURPOSE: Segmented delivery-distribution bar — how the project portfolio splits
//          across Pending / In progress / Completed, with a readable legend.
// CONNECTS TO: components/dashboard/dashboard.constants.js (STAGES).
//
// All three counts come from real workspace statuses; nothing is estimated.
// ============================================================

import { STAGES } from './dashboard.constants';

/**
 * @param {object} props
 * @param {number} props.total portfolio size
 * @param {Record<string, number>} props.counts keyed by standardised status
 * @param {boolean} [props.showLegend=true]
 */
export function StatusBar({ total, counts, showLegend = true }) {
  if (!total) {
    return (
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover" aria-hidden="true" />
    );
  }

  return (
    <div>
      {/* gap-px on an ink background turns the gaps into hairlines — the brand's
          structural device, rather than borders around each segment. */}
      <div className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-line">
        {STAGES.map((stage) => {
          const value = counts?.[stage.id] || 0;
          if (!value) return null;
          return (
            <div
              key={stage.id}
              className={`h-full ${stage.tone.bar}`}
              style={{ width: `${(value / total) * 100}%` }}
              title={`${stage.label}: ${value} of ${total}`}
            />
          );
        })}
      </div>

      {showLegend && (
        <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {STAGES.map((stage) => (
            <li key={stage.id} className="flex items-center gap-2 text-xs text-dim">
              <span className={`h-2 w-2 rounded-full ${stage.tone.bar}`} aria-hidden="true" />
              <span>{stage.label}</span>
              <span className="tnum font-semibold text-ink">{counts?.[stage.id] || 0}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
