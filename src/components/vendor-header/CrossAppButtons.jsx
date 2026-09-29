// ============================================================
// FILE: CrossAppButtons.jsx
// PURPOSE: The cross-app destination controls (Graviyx / Sales / Tender) plus the
//          Prompt trigger, as one shared control with selectable treatments.
// CONNECTS TO: header.constants.js (COPY), lucide-react.
//
// WHY SHARED: this is functionality, not design language. The five variants stay
// visually independent by choosing their own `treatment` rather than each
// reimplementing the same gating logic five times.
//
// Behaviour preserved from components/Header/Header.jsx:940-1059:
//   - rendered only on the dashboard index (`isOnDashboard`)
//   - Sales and Tender are gated on `canAccessSales`; Graviyx is not gated
//   - Graviyx and Sales/Tender perform cross-app handoff redirects
// In this preview those three redirects are INERT — firing one would leave the
// comparison. Only Prompt acts, and it opens a local placeholder panel.
// ============================================================

import { FileText, ShoppingBag, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '../ui';
import { COPY } from './header.constants';

// Treatment map — full literal class strings so Tailwind's scanner always sees them.
const TREATMENTS = {
  outline: 'h-9 gap-2 rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-hover',
  solid: 'h-9 gap-2 rounded-md bg-cta px-3 text-[13px] font-medium text-cta-foreground hover:opacity-90',
  compact: 'h-8 gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs font-medium text-ink hover:bg-surface-hover',
  text: 'h-9 gap-1.5 px-1 text-sm font-medium text-ink hover:text-dim',
};

const BASE =
  'inline-flex shrink-0 items-center whitespace-nowrap transition-colors duration-150 ease-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink';

/**
 * @param {object} props
 * @param {boolean} props.show render at all (the live header's isOnDashboard gate)
 * @param {boolean} [props.canAccessSales] gates Sales + Tender only
 * @param {'outline'|'solid'|'compact'|'text'} [props.treatment='outline']
 * @param {() => void} [props.onGraviyx]
 * @param {() => void} [props.onSales]
 * @param {() => void} [props.onTender]
 * @param {() => void} [props.onPrompt] opens the AI prompt panel
 * @param {boolean} [props.iconOnly] hide labels below the given breakpoint
 * @param {boolean} [props.inert] preview mode — no handlers are wired at all
 */
export function CrossAppButtons({
  show,
  canAccessSales = false,
  treatment = 'outline',
  onGraviyx,
  onSales,
  onTender,
  onPrompt,
  iconOnly = false,
  inert = false,
  className,
}) {
  if (!show) return null;

  const tone = TREATMENTS[treatment] || TREATMENTS.outline;
  const labelClass = iconOnly ? 'hidden xl:inline' : 'inline';

  // In preview the cross-app redirects are inert — firing one would leave the
  // comparison. In the real header they call through to the handoff handlers.
  const crossApp = (label, Icon, onClick) => (
    <button
      key={label}
      type="button"
      onClick={inert ? undefined : onClick}
      aria-disabled={inert || undefined}
      title={inert ? `${label} — disabled in preview` : label}
      className={cn(BASE, tone, inert && 'cursor-default')}
    >
      <Icon size={treatment === 'compact' ? 13 : 15} aria-hidden="true" />
      <span className={labelClass}>{label}</span>
    </button>
  );

  return (
    <div className={cn('flex items-center gap-2', className)} aria-label={COPY.crossAppGroup}>
      {crossApp(COPY.graviyx, ShoppingBag, onGraviyx)}
      {canAccessSales && crossApp(COPY.sales, TrendingUp, onSales)}
      {canAccessSales && crossApp(COPY.tender, FileText, onTender)}

      <button
        type="button"
        onClick={onPrompt}
        title={COPY.prompt}
        className={cn(BASE, tone)}
      >
        <Sparkles size={treatment === 'compact' ? 13 : 15} aria-hidden="true" />
        <span className={labelClass}>{COPY.prompt}</span>
      </button>
    </div>
  );
}
