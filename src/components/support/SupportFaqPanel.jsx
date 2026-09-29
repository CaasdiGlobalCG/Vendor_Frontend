// ============================================================
// FILE: SupportFaqPanel.jsx
// PURPOSE: The support landing FAQ panel — the empty state of the conversation column.
// CONNECTS TO: support-tone.js, index.js, components/ui (Button), pages/support/SupportPage.jsx.
//
// Promoted from the winning "Refined" design variant. FAQ content is passed in by the page so
// this component stays free of product copy.
//
// Note: the page's FAQ entries still carry `iconBg` / `iconColor` keys from the previous design.
// They are deliberately ignored here — the icon chip is neutral because colour is reserved for
// status and priority. The keys are left in place rather than edited, since that data is not
// part of this change.
// ============================================================

import { LifeBuoy } from 'lucide-react';
import { Button } from '../ui';
import { SUPPORT_HOURS, SUPPORT_TEAM } from './support-tone';

/**
 * @param {{ faqItems: Array<{ icon: Function, q: string, a: string }>, onNewTicket?: Function,
 *           newTicketDisabled?: boolean, className?: string }} props
 */
export function SupportFaqPanel({ faqItems, onNewTicket, newTicketDisabled = false, className = '' }) {
  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface ${className}`}>
      <div className="border-b border-line px-6 pb-5 pt-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-hover">
            <LifeBuoy size={18} className="text-ink" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-medium text-dim">Need help?</p>
            <p className="text-sm font-bold text-ink">Browse common questions below</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-dim">
          Can&apos;t find what you need? Our support team is available on business days and typically
          responds within a few hours.
        </p>
        <Button
          variant="primary"
          className="mt-4 w-full"
          disabled={newTicketDisabled}
          onClick={onNewTicket}
        >
          Open a Support Ticket
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-widest text-dim">
          Frequently Asked Questions
        </p>
        {faqItems.map((item, i) => (
          <details key={i} className="group rounded-xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover">
                <item.icon size={14} className="text-ink" aria-hidden="true" />
              </span>
              <span className="flex-1 text-sm font-semibold leading-snug text-ink">{item.q}</span>
              <ChevronGlyph />
            </summary>
            <p className="px-4 pb-4 pl-[52px] text-xs leading-relaxed text-dim">{item.a}</p>
          </details>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-line px-5 py-3">
        <span className="text-[11px] text-dim">{SUPPORT_HOURS}</span>
        <span className="text-[11px] font-medium text-ink">{SUPPORT_TEAM}</span>
      </div>
    </div>
  );
}

/** Disclosure chevron — rotates via the parent <details> group-open state. */
function ChevronGlyph() {
  return (
    <span className="shrink-0 text-dim transition-transform group-open:rotate-90" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </span>
  );
}
