// ============================================================
// FILE: ProgressBar.jsx
// PURPOSE: Accessible 0-100 progress bar. Only ever rendered with a real value.
// CONNECTS TO: components/dashboard/dashboard.constants.js (tones via caller-supplied className).
// ============================================================

/**
 * @param {object} props
 * @param {number} props.percent 0-100, must be a real measurement
 * @param {string} [props.label] visible label on the left
 * @param {string} [props.barClass] fill colour class, defaults to the CTA ink
 * @param {string} [props.size='md'] 'sm' = 4px track, 'md' = 8px track
 */
export function ProgressBar({ percent, label, barClass = 'bg-cta', size = 'md' }) {
  const safe = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
  const height = size === 'sm' ? 'h-1' : 'h-2';

  return (
    <div>
      {label && (
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-medium text-dim">
          <span>{label}</span>
          <span className="tnum text-ink">{safe}%</span>
        </div>
      )}
      <div
        className={`w-full overflow-hidden rounded-full bg-surface-hover ${height}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safe}
        aria-label={label || 'Progress'}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-signal ${barClass}`}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}
