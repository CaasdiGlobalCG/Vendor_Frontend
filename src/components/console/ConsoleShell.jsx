// ============================================================
// FILE: ConsoleShell.jsx
// PURPOSE: Generic "Console" page shell — hero, read-only notice, a tone-driven stat
//          strip, an accessible tablist and a tab panel. Shared by the Team page and
//          the Notifications page so both read as one system.
// CONNECTS TO: components/ui (cn), lucide-react.
//
// Extracted from components/team/TeamShell.jsx, which now delegates here.
// Colour rule: a stat's tone tints ONLY the figure — never the label or the cell.
// ============================================================

import { useRef } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../ui';

/**
 * Accessible tablist. Arrow keys move between tabs (orientation-aware), Home/End jump
 * to the ends, and focus follows selection (roving tabindex).
 *
 * @param {object} props
 * @param {{id: string, label: string}[]} props.tabs
 * @param {string} props.active
 * @param {(id: string) => void} props.onChange
 * @param {Record<string, number>} [props.counts]
 * @param {boolean} [props.vertical=false]
 * @param {string} [props.ariaLabel='Sections']
 */
export function Tabs({ tabs = [], active, onChange, counts = {}, vertical = false, ariaLabel = 'Sections' }) {
  const listRef = useRef(null);
  if (tabs.length === 0) return null;

  const handleKeyDown = (event) => {
    const index = tabs.findIndex((tab) => tab.id === active);
    if (index === -1) return;

    const forward = vertical ? 'ArrowDown' : 'ArrowRight';
    const back = vertical ? 'ArrowUp' : 'ArrowLeft';
    let next = null;
    if (event.key === forward) next = (index + 1) % tabs.length;
    else if (event.key === back) next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next === null) return;

    event.preventDefault();
    const target = tabs[next];
    onChange(target.id);
    listRef.current?.querySelector(`[data-tab="${target.id}"]`)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      onKeyDown={handleKeyDown}
      className={cn('flex gap-1 overflow-x-auto border-line', vertical ? 'flex-col border-0' : 'items-center border-b')}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        const count = counts[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-tab={tab.id}
            id={`console-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`console-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative shrink-0 whitespace-nowrap text-sm transition-colors duration-150 ease-signal',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink',
              vertical ? 'flex items-center justify-between rounded-md px-3 py-2 text-left' : 'px-3 py-2.5',
              !vertical && 'after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:bg-ink after:content-[""]',
              vertical && selected && 'bg-surface-hover',
              selected ? 'font-medium text-ink' : 'text-dim hover:text-ink',
              !vertical && (selected ? 'after:opacity-100' : 'after:opacity-0')
            )}
          >
            <span>{tab.label}</span>
            {typeof count === 'number' && count > 0 && (
              <span className={cn('tnum text-xs', vertical ? 'ml-auto pl-3' : 'ml-2', selected ? 'text-ink' : 'text-dim')}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Stat strip. `tone` tints only the figure — a neutral count stays ink.
 * @param {{label: string, value: number|string, tone?: string}[]} stats
 */
export function Stats({ stats = [] }) {
  if (stats.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
      {stats.map((cell) => (
        <div key={cell.label} className="min-w-0 bg-surface px-4 py-3">
          <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-dim">{cell.label}</dt>
          <dd className={cn('tnum mt-1.5 text-2xl font-semibold tracking-tight', cell.tone || 'text-ink')}>
            {cell.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Transient status message. `role="status"` so it is announced. */
export function FeedbackRegion({ feedback, onDismiss }) {
  if (!feedback) return null;
  const isError = feedback.type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        isError ? 'border-danger/20 bg-danger/10' : 'border-success/20 bg-success/10'
      )}
    >
      <Icon size={16} className={cn('mt-0.5 shrink-0', isError ? 'text-danger' : 'text-success')} />
      <p className={cn('min-w-0 flex-1 text-sm', isError ? 'text-danger' : 'text-success')}>{feedback.msg}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-medium text-dim underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.eyebrow]
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.actions] hero action slot
 * @param {React.ReactNode} [props.notice] optional notice line
 * @param {Array} [props.stats]
 * @param {Array} [props.tabs]
 * @param {string} [props.activeTab]
 * @param {(id: string) => void} [props.onTabChange]
 * @param {Record<string, number>} [props.counts]
 * @param {React.ReactNode} [props.aside] optional persistent rail
 * @param {React.ReactNode} props.children the active panel
 */
export function ConsoleShell({
  title,
  eyebrow,
  description,
  actions,
  notice,
  stats = [],
  tabs = [],
  activeTab,
  onTabChange,
  counts,
  aside,
  children,
}) {
  return (
    <div className="min-h-screen bg-canvas pb-28">
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 pt-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-dim">{eyebrow}</p>
            )}
            <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
            {description && (
              <p className="mt-2 max-w-measure text-sm leading-6 text-dim">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </header>

        {notice}

        <Stats stats={stats} />

        <div className={cn('grid grid-cols-1 gap-6', aside && 'lg:grid-cols-[16rem_1fr]')}>
          {aside && (
            <div className="min-w-0 space-y-4">
              <Tabs tabs={tabs} active={activeTab} onChange={onTabChange} counts={counts} vertical />
              {aside}
            </div>
          )}

          <div className="min-w-0 space-y-4">
            {!aside && <Tabs tabs={tabs} active={activeTab} onChange={onTabChange} counts={counts} />}
            <div
              role="tabpanel"
              id={`console-panel-${activeTab}`}
              aria-labelledby={`console-tab-${activeTab}`}
              className="min-w-0"
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
