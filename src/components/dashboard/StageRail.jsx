// ============================================================
// FILE: StageRail.jsx
// PURPOSE: Three-node delivery lifecycle rail for a single project.
// CONNECTS TO: components/dashboard/dashboard.constants.js (STAGES, toneFor).
//
// WHY NOT A PERCENTAGE: the shipped ProjectRow invents a 60% progress figure for
// in-progress projects (components/ProjectList/ProjectRow.jsx:112-134). There is no
// real progress field in the data, so these variants show which lifecycle stage a
// project has reached — derived from its real status — instead of a made-up number.
// ============================================================

import { STAGES, toneFor } from './dashboard.constants';

/**
 * @param {object} props
 * @param {string} props.status standardised status
 * @param {boolean} [props.compact=false] labels hidden, dots only
 */
export function StageRail({ status, compact = false }) {
  const currentIndex = Math.max(0, STAGES.findIndex((stage) => stage.id === status));
  const tone = toneFor(status);

  return (
    <div className="flex items-center gap-1.5" title={`Stage: ${STAGES[currentIndex]?.label || status}`}>
      {STAGES.map((stage, index) => {
        const reached = index <= currentIndex;
        return (
          <span key={stage.id} className="flex items-center gap-1.5">
            <span
              className={`h-1.5 rounded-full transition-all ${
                reached ? `${tone.bar} w-6` : 'w-3 bg-surface-hover'
              }`}
            />
            {!compact && index === currentIndex && (
              <span className={`text-[10px] font-medium uppercase tracking-[0.12em] ${tone.text}`}>
                {stage.label}
              </span>
            )}
          </span>
        );
      })}
      <span className="sr-only" role="status">
        {STAGES[currentIndex]?.label || status}
      </span>
    </div>
  );
}
