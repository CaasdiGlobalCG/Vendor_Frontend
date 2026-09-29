// ============================================================
// FILE: MetricTile.jsx
// PURPOSE: One KPI. Label, value, optional trend sparkline and optional footnote.
//          Deliberately quiet: no chip, no icon block, no invented "Healthy" status.
// CONNECTS TO: components/dashboard/Sparkline.jsx, components/dashboard/dashboard.constants.js.
//
// Replaces ui/StatCard for these variants because StatCard renders five competing
// elements per tile and defaults its status label to a fabricated 'Healthy'
// (components/ui/stat-card.jsx:60,88).
// ============================================================

import { Sparkline } from './Sparkline';
import { toneFor } from './dashboard.constants';

/**
 * @param {object} props
 * @param {string} props.label small uppercase label
 * @param {string|number} props.value headline figure (already formatted, or '—')
 * @param {string} [props.hint] supporting line under the value
 * @param {string} [props.status] standardised status — tints the value, nothing else
 * @param {number[]} [props.trend] series for the sparkline
 * @param {boolean} [props.loading=false] renders a skeleton instead of a value
 */
export function MetricTile({ label, value, hint, status, trend, loading = false }) {
  const tone = status ? toneFor(status) : null;

  return (
    <div className="flex h-full flex-col justify-between gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:bg-surface-hover">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-dim">{label}</p>

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          <div className="h-7 w-16 animate-pulse rounded bg-surface-hover" />
          <div className="h-3 w-24 animate-pulse rounded bg-surface-hover" />
        </div>
      ) : (
        <p className={`tnum text-2xl font-semibold tracking-tight ${tone ? tone.text : 'text-ink'}`}>
          {value ?? '—'}
        </p>
      )}

      <div className="flex items-end justify-between gap-3">
        {hint ? <p className="text-[11px] leading-4 text-dim">{hint}</p> : <span />}
        {trend && trend.length > 1 && (
          <Sparkline values={trend} strokeClass={tone ? tone.text : 'text-dim'} />
        )}
      </div>
    </div>
  );
}
