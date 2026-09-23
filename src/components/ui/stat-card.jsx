/**
 * FILE: stat-card.jsx
 * PURPOSE: Shared KPI stat card — title chip, big value, icon, metric pill,
 *          status label, and progress bar. Used on dashboards/summary grids.
 * CONNECTS TO: components/ui design tokens; consumed by page components.
 *
 * Tone drives icon tint, metric pill, border accent and bar color —
 * pages pass `tone="neutral|success|warning|info|danger"`, never class strings.
 */

import { cn } from './cn';

// Semantic tone map — matches Badge tones so cards and pills read consistently.
const TONES = {
  neutral: {
    icon: 'bg-surface-hover text-ink',
    accent: 'border-line bg-surface',
    bar: 'bg-cta',
    pill: 'text-ink bg-surface-hover border-line',
  },
  success: {
    icon: 'bg-success/10 text-success',
    accent: 'border-success/10 bg-surface',
    bar: 'bg-success',
    pill: 'text-success bg-success/10 border-success/10',
  },
  warning: {
    icon: 'bg-warning/10 text-warning',
    accent: 'border-warning/10 bg-surface',
    bar: 'bg-warning',
    pill: 'text-warning bg-warning/10 border-warning/10',
  },
  info: {
    icon: 'bg-info/10 text-info',
    accent: 'border-info/10 bg-surface',
    bar: 'bg-info',
    pill: 'text-info bg-info/10 border-info/10',
  },
  danger: {
    icon: 'bg-danger/10 text-danger',
    accent: 'border-danger/10 bg-surface',
    bar: 'bg-danger',
    pill: 'text-danger bg-danger/10 border-danger/10',
  },
};

/**
 * KPI stat card.
 * @param {object} props
 * @param {string} props.title      - small uppercase chip label
 * @param {string|number} props.value   - headline figure
 * @param {string} [props.subtitle] - supporting line under the value
 * @param {string} [props.metric]   - right-aligned pill (e.g. "42%")
 * @param {number} [props.progress] - 0-100 bar value; omit to hide the bar
 * @param {import('lucide-react').LucideIcon} props.icon - icon component
 * @param {keyof typeof TONES} [props.tone] - semantic color tone
 * @param {string} [props.statusLabel] - bottom-right status text
 * @param {string} [props.className] - extra classes on the card
 */
export function StatCard({ title, value, subtitle, metric, progress, icon: Icon, tone = 'neutral', statusLabel = 'Healthy', className }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <div className={cn('overflow-hidden rounded-lg border p-5 transition', t.accent, className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex rounded-full border border-line px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-dim">
            {title}
          </div>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-ink">{value}</p>
        </div>
        {Icon && (
          <div className={cn('rounded-md p-3', t.icon)}>
            <Icon size={18} />
          </div>
        )}
      </div>

      {subtitle && <p className="max-w-[16rem] text-xs leading-5 text-dim">{subtitle}</p>}

      <div className="mt-5 flex items-center justify-between gap-3">
        {metric && (
          <div className={cn('inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold', t.pill)}>
            {metric}
          </div>
        )}
        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-dim">Status</p>
          <p className="mt-1 text-sm font-semibold text-ink">{statusLabel}</p>
        </div>
      </div>

      {typeof progress === 'number' && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-medium text-dim">
            <span>Overview</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
            <div className={cn('h-full rounded-full', t.bar)} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
