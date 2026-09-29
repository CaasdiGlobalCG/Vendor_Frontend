// ============================================================
// FILE: SupportList.jsx
// PURPOSE: The support ticket list primitives — async states, one ticket row, and the status
//          filter chips.
// CONNECTS TO: support-tone.js, SupportPills.jsx, index.js, pages/support/SupportPage.jsx.
//
// Promoted from the winning "Refined" design variant. The row carries an optional `unread`
// flag because the live page tracks read receipts per ticket.
// ============================================================

import { AlertCircle, ChevronRight, LifeBuoy } from 'lucide-react';
import { EmptyState, Skeleton } from '../ui';
import { fmtRelative, statusTone } from './support-tone';
import { PriorityPill, StatusPill } from './SupportPills';

/**
 * Loading / error / empty for any list surface. Renders nothing when there is data.
 * @param {{ loading: boolean, error: string, empty: boolean, onRetry?: Function,
 *           emptyTitle?: string, emptyHint?: string, compact?: boolean }} props
 */
export function ListStates({ loading, error, empty, onRetry, emptyTitle, emptyHint, compact = false }) {
  if (loading) {
    return (
      <div className="space-y-2" role="status" aria-live="polite" aria-label="Loading tickets">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-4">
            <Skeleton className="mb-2 h-3 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm text-danger">
        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium">{error}</p>
          {onRetry ? (
            <button onClick={onRetry} className="mt-1 text-xs font-semibold underline underline-offset-2">
              Try again
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (empty) {
    return <EmptyState icon={LifeBuoy} compact={compact} title={emptyTitle} description={emptyHint} />;
  }

  return null;
}

/**
 * One ticket in a list. Presentational only — the parent owns selection.
 * @param {{ ticket: object, active?: boolean, unread?: boolean, onSelect: Function }} props
 */
export function TicketRow({ ticket, active = false, unread = false, onSelect }) {
  const s = statusTone(ticket.status);
  const date = ticket.updatedAt || ticket.createdAt;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(ticket.ticketId)}
      aria-current={active ? 'true' : undefined}
      className={`group flex w-full items-stretch gap-0 overflow-hidden rounded-xl border text-left transition-colors ${
        active ? 'border-ink/25 bg-surface-hover' : 'border-line bg-surface hover:border-ink/20 hover:bg-surface-hover'
      }`}
    >
      <span className={`w-1 shrink-0 ${s.dot}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 px-4 py-3">
        <span className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] text-dim">{ticket.ticketId}</span>
          {unread ? (
            <span className="h-2 w-2 shrink-0 rounded-full bg-success" title="New activity" aria-label="New activity" />
          ) : null}
          <StatusPill status={ticket.status} />
          <PriorityPill priority={ticket.priority} />
        </span>
        <span className="block truncate text-sm font-semibold text-ink">{ticket.subject}</span>
        <span className="mt-0.5 block text-[11px] text-dim">
          {[ticket.teamLabel || ticket.assignedTeam, date ? fmtRelative(date) : ''].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="flex items-center pr-3">
        <ChevronRight
          size={15}
          className={active ? 'text-ink' : 'text-dim transition-transform group-hover:translate-x-0.5'}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

/**
 * Filter chips for the list. Counts must come from real tickets only.
 * @param {{ filters: Array, value: string, counts: object, onChange: Function }} props
 */
export function StatusFilterChips({ filters, value, counts, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
      {filters.map((f) => {
        const active = value === f.key;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(f.key)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              active ? 'border-ink bg-cta text-cta-foreground' : 'border-line bg-surface text-dim hover:border-ink/25 hover:text-ink'
            }`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20' : 'bg-surface-hover'}`}>
              {counts?.[f.key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
