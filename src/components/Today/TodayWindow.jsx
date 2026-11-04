import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, CalendarCheck, CalendarDays, CheckCircle2, ClipboardList, Clock, FileText, Loader2, RefreshCw, Sparkles, UserRound, Wallet, X } from 'lucide-react';
import config from '../../config/env';

/**
 * TodayWindow: a full-window "what needs me today" view for the vendor.
 * Tasks that are due or overdue, payments due, leads waiting, and a few suggested next steps.
 * Read-only; every row opens the thing it is about, or hands a ready-made question to the assistant.
 */

const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

const dueLabel = (daysLeft) => {
  if (daysLeft === 0) return 'Today';
  if (daysLeft === 1) return 'Tomorrow';
  if (daysLeft > 1) return `In ${daysLeft} days`;
  const n = Math.abs(daysLeft);
  return `${n} day${n === 1 ? '' : 's'} overdue`;
};

const authHeaders = () => {
  const token = localStorage.getItem('authToken') || '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const Tile = ({ icon: Icon, label, value, sub, tone = 'neutral' }) => (
  <div className={`rounded-2xl border bg-surface p-4 ${tone === 'danger' && value ? 'border-danger/40' : 'border-line'}`}>
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-dim"><Icon size={13} />{label}</div>
    <div className={`mt-2 text-[26px] font-semibold leading-none ${tone === 'danger' && value ? 'text-danger' : 'text-ink'}`}>{value}</div>
    {sub && <div className="mt-1.5 text-[11px] text-dim">{sub}</div>}
  </div>
);

const Section = ({ title, icon: Icon, count, children, empty }) => (
  <section className="rounded-2xl border border-line bg-surface">
    <header className="flex items-center gap-2 border-b border-line px-4 py-3">
      <Icon size={15} className="text-dim" />
      <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
      {count > 0 && <span className="ml-auto rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-semibold text-ink">{count}</span>}
    </header>
    <div className="p-2">{count === 0 ? <p className="px-3 py-5 text-center text-[12px] text-dim">{empty}</p> : children}</div>
  </section>
);

const Row = ({ title, meta, badge, badgeTone = 'neutral', onClick, action }) => {
  const Tag = onClick ? 'button' : 'div';
  const tones = { danger: 'bg-danger/10 text-danger', warning: 'bg-warning/10 text-warning', neutral: 'bg-surface-hover text-dim' };
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${onClick ? 'transition-colors hover:bg-surface-hover' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{title}</p>
        {meta && <p className="truncate text-[11px] text-dim">{meta}</p>}
      </div>
      {badge && <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tones[badgeTone]}`}>{badge}</span>}
      {action}
    </Tag>
  );
};

const TodayWindow = ({ isOpen, onClose, onAsk }) => {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: '' }));
    try {
      const res = await fetch(`${config.VENDOR_BACKEND_URL}/api/ai/today?date=${todayString()}`, { credentials: 'include', headers: authHeaders() });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.message || `Could not load your day (error ${res.status}).`);
      setState({ status: 'ready', data: body.data, error: '' });
    } catch (err) {
      setState((s) => ({ status: 'error', data: s.data, error: err.message || 'Could not load your day.' }));
    }
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const go = (href) => {
    onClose();
    navigate(href);
  };

  const { data } = state;
  const clear = useMemo(() => {
    if (!data) return false;
    const s = data.summary;
    return s.overdueTasks + s.tasksToday + s.tasksUpcoming + s.overduePayments + s.paymentsSoon + s.leadsWaitingOnYou + s.leadsWaitingOnPm === 0;
  }, [data]);

  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-canvas text-ink"
          role="dialog"
          aria-modal="true"
          aria-label="Today"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-line bg-surface px-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cta text-cta-foreground"><CalendarCheck size={16} /></span>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold text-ink">Today</h1>
              <p className="text-[11px] text-dim">{dateLabel}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={load} disabled={state.status === 'loading'} className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-dim transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-50" aria-label="Refresh">
                <RefreshCw size={13} className={state.status === 'loading' ? 'animate-spin' : ''} />Refresh
              </button>
              <button type="button" onClick={onClose} className="flex h-8 items-center gap-2 rounded-lg border border-line px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-hover" aria-label="Close Today">
                <X size={14} />Close<kbd className="rounded border border-line bg-surface-hover px-1.5 py-0.5 text-[9px] font-semibold text-dim">Esc</kbd>
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-6">
              {state.status === 'loading' && !data && (
                <div className="space-y-4" aria-hidden="true">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-hover" />)}</div>
                  <div className="h-40 animate-pulse rounded-2xl bg-surface-hover" />
                </div>
              )}

              {state.status === 'error' && (
                <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger/5 p-4">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-danger" />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-ink">Couldn't load your day</p>
                    <p className="text-[12px] text-dim">{state.error}</p>
                  </div>
                  <button type="button" onClick={load} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-surface-hover">Try again</button>
                </div>
              )}

              {data && (
                <>
                  {data.partial?.length > 0 && (
                    <p role="status" className="flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-2.5 text-[12px] text-ink">
                      <AlertCircle size={14} className="flex-shrink-0 text-warning" />
                      Couldn't load: {data.partial.join(', ')}. What is shown for those may be incomplete.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Tile icon={ClipboardList} label="Overdue tasks" value={data.summary.overdueTasks} sub={`${data.summary.tasksToday} due today`} tone="danger" />
                    <Tile icon={Clock} label="Due this week" value={data.summary.tasksToday + data.summary.tasksUpcoming} sub="tasks, including today" />
                    <Tile icon={Wallet} label="Payments overdue" value={data.summary.overduePayments} sub={data.summary.overduePayments ? rupees(data.summary.overdueAmount) : `${data.summary.paymentsSoon} due this week`} tone="danger" />
                    <Tile icon={UserRound} label="Waiting on you" value={data.summary.leadsWaitingOnYou} sub={`${data.summary.leadsWaitingOnPm} waiting on the PM`} />
                  </div>

                  {clear && (
                    <div className="flex flex-col items-center rounded-3xl border border-line bg-surface px-6 py-12 text-center">
                      <CheckCircle2 size={34} className="mb-3 text-success" />
                      <p className="text-[16px] font-semibold text-ink">You're all caught up</p>
                      <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-dim">No tasks are due, no payments are late, and no leads are waiting. Nice.</p>
                    </div>
                  )}

                  {data.suggestions.length > 0 && (
                    <section aria-label="Suggested next actions" className="rounded-2xl border border-line bg-surface">
                      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
                        <Sparkles size={15} className="text-warning" />
                        <h3 className="text-[13px] font-semibold text-ink">Suggested next actions</h3>
                      </header>
                      <ul className="divide-y divide-line">
                        {data.suggestions.map((s) => (
                          <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-ink">{s.title}</p>
                              <p className="text-[12px] text-dim">{s.detail}</p>
                            </div>
                            {s.href && <button type="button" onClick={() => go(s.href)} className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-cta px-3 py-1.5 text-[12px] font-semibold text-cta-foreground hover:opacity-90">Open<ArrowRight size={12} /></button>}
                            {s.prompt && <button type="button" onClick={() => onAsk?.(s.prompt)} className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-surface-hover"><Sparkles size={12} />Ask assistant</button>}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Section title="Tasks" icon={ClipboardList} count={data.tasks.overdue.length + data.tasks.today.length + data.tasks.upcoming.length} empty="No tasks are due this week.">
                      {[['overdue', 'danger'], ['today', 'warning'], ['upcoming', 'neutral']].flatMap(([key, tone]) => data.tasks[key].map((t) => (
                        <Row key={`${key}-${t.workspaceId}-${t.taskId || t.name}`} title={t.name} meta={t.workspaceTitle} badge={dueLabel(t.daysLeft)} badgeTone={tone} onClick={() => go(`/VendorDashboard/workspace/${t.workspaceId}`)} />
                      )))}
                    </Section>

                    <div className="space-y-4">
                      <Section title="Payments" icon={Wallet} count={data.payments.overdue.length + data.payments.dueSoon.length} empty="No payments are due this week.">
                        {[['overdue', 'danger'], ['dueSoon', 'warning']].flatMap(([key, tone]) => data.payments[key].map((p) => (
                          <Row
                            key={`${key}-${p.invoiceId}`}
                            title={`${p.number} · ${rupees(p.total)}`}
                            meta={p.customer}
                            badge={dueLabel(p.daysLeft)}
                            badgeTone={tone}
                            onClick={p.workspaceId ? () => go(`/VendorDashboard/workspace/${p.workspaceId}/invoices`) : undefined}
                            action={onAsk ? (
                              <button type="button" onClick={(e) => { e.stopPropagation(); onAsk(`Draft a polite payment reminder for invoice ${p.number} to ${p.customer} (${rupees(p.total)}, due ${p.dueDate}).`); }} className="flex-shrink-0 rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-surface-hover">Remind</button>
                            ) : null}
                          />
                        )))}
                      </Section>

                      <Section title="Leads" icon={FileText} count={data.waiting.onYou.length + data.waiting.onPm.length} empty="No leads are waiting.">
                        {data.waiting.onYou.map((l) => (
                          <Row key={`you-${l.leadId}`} title={l.title} meta="Waiting for your answer" badge={l.waitingDays ? `${l.waitingDays}d` : 'New'} badgeTone="warning" onClick={() => go(`/leads/${l.leadId}`)} />
                        ))}
                        {data.waiting.onPm.map((l) => (
                          <Row key={`pm-${l.leadId}`} title={l.title} meta="Waiting for the PM's decision" badge={l.waitingDays ? `${l.waitingDays}d` : null} onClick={() => go(`/leads/${l.leadId}`)} />
                        ))}
                      </Section>

                      <section className="rounded-2xl border border-dashed border-line px-4 py-4">
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink"><CalendarDays size={15} className="text-dim" />Meetings</div>
                        <p className="mt-1 text-[12px] leading-relaxed text-dim">No calendar is connected yet, so meetings can't be shown here.</p>
                      </section>
                    </div>
                  </div>
                </>
              )}

              {state.status === 'loading' && data && (
                <p className="flex items-center justify-center gap-2 text-[11px] text-dim"><Loader2 size={12} className="animate-spin" />Updating…</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TodayWindow;
