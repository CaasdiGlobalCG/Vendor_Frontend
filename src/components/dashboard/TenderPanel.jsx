// ============================================================
// FILE: TenderPanel.jsx
// PURPOSE: Scannable list of open tenders, soonest deadline first.
// CONNECTS TO: components/dashboard/Panel, components/dashboard/dashboard.constants.js.
//
// Replaces TenderCarousel for these variants. The carousel auto-advanced every 3s
// with no pause control (WCAG 2.2.2) and hid five of six tenders behind dots
// (components/TenderCard/TenderCarousel.jsx:12-20) — a poor dashboard primitive.
// ============================================================

import { useMemo } from 'react';
import { CalendarClock, FileText } from 'lucide-react';
import { Panel } from './Panel';
import { COPY, daysSince } from './dashboard.constants';

/** Soonest closing date first; entries without a date sort last. */
function byDeadline(a, b) {
  const da = a.closingDate ? new Date(a.closingDate).getTime() : Number.POSITIVE_INFINITY;
  const db = b.closingDate ? new Date(b.closingDate).getTime() : Number.POSITIVE_INFINITY;
  return da - db;
}

/**
 * @param {object} props
 * @param {Array} props.tenders
 * @param {'loading'|'error'|'empty'|'ready'} props.state
 * @param {number} [props.limit] cap the visible rows
 */
export function TenderPanel({ tenders, state, limit }) {
  const rows = useMemo(() => {
    const sorted = [...tenders].sort(byDeadline);
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  }, [tenders, limit]);

  const resolvedState = state === 'ready' && rows.length === 0 ? 'empty' : state;

  return (
    <Panel
      title="Open tenders"
      meta={rows.length ? `${rows.length}` : null}
      state={resolvedState}
      emptyTitle={COPY.noTenders}
      emptyHint={COPY.noTendersHint}
      bodyPadded={false}
    >
      <ul className="divide-y divide-line">
        {rows.map((tender, index) => {
          const remaining = daysSince(tender.closingDate);
          // Only surface urgency when the date is real and in the future.
          const closingSoon = remaining !== null && remaining >= 0 && remaining <= 14;

          return (
            <li key={`${tender.title}-${index}`} className="px-5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{tender.title}</p>
                  {tender.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-dim">{tender.description}</p>
                  )}
                </div>
                {tender.amount && (
                  <p className="tnum shrink-0 text-sm font-semibold text-ink">{tender.amount}</p>
                )}
              </div>

              {tender.deadlineText && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-dim">
                  <CalendarClock size={12} className={closingSoon ? 'text-warning' : ''} />
                  <span className={closingSoon ? 'text-warning' : ''}>Closes {tender.deadlineText}</span>
                  {closingSoon && <span className="text-warning">· {remaining}d left</span>}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {typeof limit === 'number' && tenders.length > limit && (
        <p className="flex items-center gap-1.5 border-t border-line px-5 py-3 text-[11px] text-dim">
          <FileText size={12} />
          {tenders.length - limit} more not shown
        </p>
      )}
    </Panel>
  );
}
