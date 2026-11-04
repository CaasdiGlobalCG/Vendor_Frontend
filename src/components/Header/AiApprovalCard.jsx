import React, { useEffect, useState } from 'react';
import { Mail, ListTodo, CalendarClock, Trash2, Check, X, Loader2, AlertTriangle, Clock } from 'lucide-react';

/**
 * AiApprovalCard
 *
 * The assistant never sends, creates or deletes anything on its own. It
 * prepares a draft and this card asks the vendor to approve it.
 *
 * approval: { id, kind, summary, details, expiresAt, state, error }
 *   state: 'pending' | 'working' | 'done' | 'failed' | 'discarded' | 'expired'
 */
const KIND = {
  email: { icon: Mail, approve: 'Approve & send' },
  task: { icon: ListTodo, approve: 'Approve & create' },
  subtask: { icon: ListTodo, approve: 'Approve & add' },
  schedule: { icon: CalendarClock, approve: 'Approve & create' },
  'schedule-delete': { icon: Trash2, approve: 'Approve & delete' },
};

const minutesLeft = (expiresAt, now) => Math.max(0, Math.ceil(((expiresAt || 0) - now) / 60000));

const AiApprovalCard = ({ approval, onApprove, onDiscard }) => {
  const [now, setNow] = useState(() => Date.now());
  const state = approval.state || 'pending';

  useEffect(() => {
    if (state !== 'pending') return undefined;
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [state]);

  const meta = KIND[approval.kind] || KIND.task;
  const Icon = meta.icon;
  const expired = state === 'pending' && approval.expiresAt && approval.expiresAt <= now;
  const effective = expired ? 'expired' : state;
  const entries = Object.entries(approval.details || {});

  const tone = {
    done: 'border-success bg-success/5',
    failed: 'border-danger bg-danger/5',
    discarded: 'border-line bg-surface-hover',
    expired: 'border-line bg-surface-hover',
  }[effective] || 'border-line bg-surface';

  return (
    <div role="group" aria-label={`Draft awaiting approval: ${approval.summary}`} className={`mt-3 rounded-2xl border ${tone} overflow-hidden`}>
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-hover text-ink"><Icon size={14} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{approval.summary}</p>
          <p className="text-[10px] text-dim">
            {effective === 'pending' || effective === 'working'
              ? <span className="inline-flex items-center gap-1"><Clock size={10} />Waiting for your approval · expires in {minutesLeft(approval.expiresAt, now)} min</span>
              : effective === 'loading' ? 'Checking status…'
              : effective === 'done' ? 'Approved and done'
              : effective === 'failed' ? 'Approved, but it did not complete'
              : effective === 'discarded' ? 'Discarded. Nothing was changed'
              : 'Expired. Ask the assistant to prepare it again'}
          </p>
        </div>
      </div>

      {entries.length > 0 && (
        <dl className="space-y-1.5 px-4 py-3 text-[12px]">
          {entries.map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-20 flex-shrink-0 text-dim">{k}</dt>
              <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words text-ink max-h-40 overflow-y-auto">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}

      {effective === 'failed' && approval.error && (
        <p className="flex items-start gap-1.5 px-4 pb-3 text-[11px] text-danger"><AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />{approval.error}</p>
      )}

      {(effective === 'pending' || effective === 'working') && (
        <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-2.5">
          <button
            type="button"
            onClick={() => onDiscard(approval)}
            disabled={effective === 'working'}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-dim transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-40"
          >
            <X size={12} />Discard
          </button>
          <button
            type="button"
            onClick={() => onApprove(approval)}
            disabled={effective === 'working'}
            className="flex items-center gap-1.5 rounded-lg bg-cta px-3.5 py-1.5 text-[11px] font-semibold text-cta-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {effective === 'working' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {effective === 'working' ? 'Working…' : meta.approve}
          </button>
        </div>
      )}
    </div>
  );
};

export default AiApprovalCard;
