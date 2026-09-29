// ============================================================
// FILE: Panel.jsx
// PURPOSE: Hairline panel shell — header row plus body, with built-in loading,
//          error and empty states so every async surface behaves the same way.
// CONNECTS TO: components/dashboard/dashboard.constants.js (COPY), components/ui/skeleton tokens.
//
// Structure comes from hairlines, not shadows or fills (BRAND.md §4).
// ============================================================

import { AlertCircle } from 'lucide-react';
import { COPY } from './dashboard.constants';

/**
 * @param {object} props
 * @param {string} props.title panel heading
 * @param {string} [props.meta] small right-aligned metadata
 * @param {React.ReactNode} [props.action] header action slot
 * @param {'loading'|'error'|'empty'|'ready'} [props.state='ready']
 * @param {string} [props.emptyTitle]
 * @param {string} [props.emptyHint]
 * @param {string} [props.errorHint]
 * @param {boolean} [props.bodyPadded=true]
 */
export function Panel({
  title,
  meta,
  action,
  state = 'ready',
  emptyTitle = 'Nothing here yet',
  emptyHint,
  errorHint = 'The request failed. Try again.',
  bodyPadded = true,
  className = '',
  children,
}) {
  // Anything that is not loading/error/ready is an absence of data — 'idle' and
  // 'no-session' both land on the empty state rather than rendering a blank box.
  const resolved =
    state === 'ready' || state === 'loading' || state === 'error' ? state : 'empty';

  return (
    <section className={`flex min-w-0 flex-col rounded-lg border border-line bg-surface ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <div className="flex min-w-0 items-baseline gap-3">
            <h2 className="truncate text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
            {meta && <p className="tnum shrink-0 text-xs text-dim">{meta}</p>}
          </div>
          {action}
        </header>
      )}

      {resolved === 'loading' && (
        <div className="space-y-3 p-5" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading</span>
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-11 animate-pulse rounded-md bg-surface-hover" />
          ))}
        </div>
      )}

      {resolved === 'error' && (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div>
            <AlertCircle className="mx-auto mb-3 text-danger" size={20} />
            <p className="text-sm font-medium text-danger">{COPY.loadFailed}</p>
            <p className="mt-1 text-xs text-dim">{errorHint}</p>
          </div>
        </div>
      )}

      {resolved === 'empty' && (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div>
            <p className="text-sm font-medium text-ink">{emptyTitle}</p>
            {emptyHint && <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-dim">{emptyHint}</p>}
          </div>
        </div>
      )}

      {resolved === 'ready' && children}
    </section>
  );
}
