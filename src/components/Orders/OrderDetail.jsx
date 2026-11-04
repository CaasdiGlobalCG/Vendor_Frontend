import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Download, FileText, Loader2, Receipt } from 'lucide-react';
import {
  ACTIONS, PHASES, TONE_CLASS, endState, formatWhen, nextStepText, phaseIndex, rupees, stageTone,
  timelineText, visibleActions, waitingText,
} from './orderUi';

/**
 * One order, in plain words: where it is, what is needed from the vendor, what
 * has been paid, and everything that has happened so far.
 */

const DOC_TITLE = { quotation: 'Quotation', invoice: 'Invoice', receipt: 'Receipt voucher', po: 'Purchase order' };
const DOC_STATUS = {
  awaiting_decision: 'Awaiting your decision', approved: 'Approved', changes_requested: 'Changes requested', rejected: 'Declined',
  payable: 'Payment due', paid: 'Paid', issued: 'Issued',
};

const ProgressBar = ({ order }) => {
  const end = endState(order.stage);
  const current = phaseIndex(order.phase);
  return (
    <ol className="flex items-center gap-1" aria-label="Order progress">
      {PHASES.map((p, i) => {
        const done = end === 'done' || i < current;
        const active = end === 'open' && i === current;
        return (
          <li key={p.id} className="flex flex-1 flex-col gap-1.5" aria-current={active ? 'step' : undefined}>
            <span className={`h-1.5 rounded-full ${done ? 'bg-success' : active ? 'bg-info' : 'bg-surface-hover'} ${end === 'stopped' && !done ? 'opacity-50' : ''}`} />
            <span className={`text-[10px] font-medium ${active ? 'text-ink' : 'text-dim'}`}>{p.label}</span>
          </li>
        );
      })}
    </ol>
  );
};

const Money = ({ label, value, strong }) => (
  <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-dim">{label}</p>
    <p className={`mt-1 ${strong ? 'text-[17px] font-semibold' : 'text-[15px] font-medium'} text-ink`}>{value == null ? 'To be confirmed' : rupees(value)}</p>
  </div>
);

const ActionForm = ({ action, busy, onCancel, onSubmit }) => {
  const spec = ACTIONS[action];
  const [note, setNote] = useState('');
  const [poType, setPoType] = useState('system');
  const [poNumber, setPoNumber] = useState('');
  const [poUrl, setPoUrl] = useState('');

  useEffect(() => { setNote(''); setPoType('system'); setPoNumber(''); setPoUrl(''); }, [action]);
  if (!spec) return null;

  const disabled = busy
    || (spec.kind === 'note' && spec.required && !note.trim())
    || (spec.kind === 'po' && poType === 'own' && !poNumber.trim());

  const submit = (e) => {
    e.preventDefault();
    if (disabled) return;
    if (spec.kind === 'po') onSubmit({ type: action, data: { poType, poNumber: poNumber.trim(), poUrl: poUrl.trim() } });
    else onSubmit({ type: action, note: note.trim() });
  };

  return (
    <form onSubmit={submit} className="mt-3 rounded-xl border border-line bg-surface-hover/50 p-3" aria-label={spec.label}>
      {spec.kind === 'confirm' && <p className="text-[13px] text-ink">{spec.confirm}</p>}
      {spec.kind === 'note' && (
        <label className="block">
          <span className="text-[12px] font-semibold text-ink">{spec.title}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={spec.placeholder}
            className="mt-1.5 w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-ink"
          />
        </label>
      )}
      {spec.kind === 'po' && (
        <fieldset className="space-y-2">
          <legend className="text-[12px] font-semibold text-ink">Which purchase order will you use?</legend>
          <label className="flex items-start gap-2 text-[13px] text-ink">
            <input type="radio" name="po" checked={poType === 'system'} onChange={() => setPoType('system')} className="mt-0.5" />
            <span>Use the system purchase order<span className="block text-[11px] text-dim">We prepare it from the approved quotation.</span></span>
          </label>
          <label className="flex items-start gap-2 text-[13px] text-ink">
            <input type="radio" name="po" checked={poType === 'own'} onChange={() => setPoType('own')} className="mt-0.5" />
            <span>I have my own purchase order<span className="block text-[11px] text-dim">It must match the approved quotation.</span></span>
          </label>
          {poType === 'own' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input aria-label="PO number" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} maxLength={60} placeholder="PO number" className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-ink" />
              <input aria-label="Link to PO document" value={poUrl} onChange={(e) => setPoUrl(e.target.value)} maxLength={500} placeholder="Link to the PO document (optional)" className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-ink" />
            </div>
          )}
        </fieldset>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-dim hover:bg-surface-hover">Not now</button>
        <button
          type="submit"
          disabled={disabled}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12px] font-semibold disabled:opacity-50 ${spec.tone === 'danger' ? 'bg-danger text-white' : 'bg-cta text-cta-foreground'}`}
        >
          {busy && <Loader2 size={12} className="animate-spin" />}
          {spec.kind === 'confirm' ? 'Yes, continue' : spec.submit || 'Send'}
        </button>
      </div>
    </form>
  );
};

const OrderDetail = ({ order, loading, error, busy, actionError, onAction, onPay, payState = {}, onOpenDocument, onOpenWorkspace, onBack }) => {
  const [openAction, setOpenAction] = useState(null);
  useEffect(() => { setOpenAction(null); }, [order?.orderId, order?.stage]);

  if (loading && !order) {
    return <div className="flex h-full items-center justify-center gap-2 text-[13px] text-dim"><Loader2 size={15} className="animate-spin" />Loading order…</div>;
  }
  if (error && !order) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <AlertCircle size={20} className="text-danger" />
        <p className="text-[13px] text-ink">{error}</p>
      </div>
    );
  }
  if (!order) {
    return <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-dim">Choose an order on the left to see where it stands.</div>;
  }

  const actions = visibleActions(order);
  const tone = stageTone(order);
  const documents = order.documents || [];

  return (
    <article className="flex h-full flex-col overflow-y-auto" aria-label={`Order ${order.orderId}`}>
      <div className="space-y-5 p-5">
        {onBack && (
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[12px] font-medium text-dim hover:text-ink lg:hidden">
            <ArrowLeft size={14} />All orders
          </button>
        )}

        <header>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE_CLASS[tone]}`}>{order.stageLabel}</span>
            <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dim">{order.channel === 'rfq' ? 'Quote request' : 'Direct order'}</span>
            <span className="text-[11px] text-dim">{waitingText(order)}</span>
          </div>
          <h2 className="mt-2 text-[17px] font-semibold text-ink">{order.items?.length ? order.items.map((i) => i.name).slice(0, 2).join(', ') + (order.items.length > 2 ? ` and ${order.items.length - 2} more` : '') : 'Items to be confirmed'}</h2>
          <p className="mt-0.5 text-[11px] text-dim">
            {order.orderId}
            {order.workspaceTitle ? ` · ${order.workspaceTitle}` : ''}
            {order.createdAt ? ` · ${formatWhen(order.createdAt)}` : ''}
          </p>
        </header>

        <ProgressBar order={order} />

        {order.needsAction && (
          <div role="status" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
            <p className="text-[12px] font-semibold text-ink">Needs you</p>
            <p className="mt-0.5 text-[13px] text-ink">{nextStepText(order)}</p>
            {order.dueNow > 0 && onPay && (
              <button
                type="button"
                disabled={payState.busy}
                onClick={onPay}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-cta px-3.5 py-2 text-[13px] font-semibold text-cta-foreground disabled:opacity-60"
              >
                {payState.busy && <Loader2 size={13} className="animate-spin" />}
                Pay {rupees(order.dueNow)} now
              </button>
            )}
            {payState.error && <p role="alert" className="mt-2 flex items-start gap-1.5 text-[12px] text-danger"><AlertCircle size={13} className="mt-0.5 flex-shrink-0" />{payState.error}</p>}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Money label="Total" value={order.total} strong />
          <Money label="Paid" value={order.total == null && !order.paid ? null : order.paid} />
          <Money label="Balance" value={order.balance} />
        </div>
        {order.paymentTerms && <p className="-mt-3 text-[11px] text-dim">Payment terms: {order.paymentTerms}</p>}

        {actions.length > 0 && (
          <section aria-label="What you can do">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-dim">What you can do</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {actions.map((a) => {
                const spec = ACTIONS[a];
                const cls = spec.tone === 'primary' ? 'bg-cta text-cta-foreground' : spec.tone === 'danger' ? 'border border-danger/40 text-danger' : 'border border-line text-ink';
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setOpenAction(openAction === a ? null : a)}
                    aria-expanded={openAction === a}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${cls}`}
                  >
                    {spec.label}
                  </button>
                );
              })}
            </div>
            {openAction && (
              <ActionForm
                action={openAction}
                busy={busy}
                onCancel={() => setOpenAction(null)}
                onSubmit={async (payload) => { const ok = await onAction(payload); if (ok) setOpenAction(null); }}
              />
            )}
            {actionError && <p role="alert" className="mt-2 flex items-start gap-1.5 text-[12px] text-danger"><AlertCircle size={13} className="mt-0.5 flex-shrink-0" />{actionError}</p>}
          </section>
        )}

        {documents.length > 0 && (
          <section aria-label="Documents">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-dim">Documents</h3>
            <ul className="mt-2 space-y-2">
              {documents.map((d) => (
                <li key={`${d.kind}-${d.id}`} className="rounded-xl border border-line">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    {d.kind === 'receipt' ? <Receipt size={15} className="text-dim" /> : <FileText size={15} className="text-dim" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{DOC_TITLE[d.kind] || d.kind}{d.number ? ` · ${d.number}` : ''}</p>
                      <p className="text-[11px] text-dim">
                        {d.kind === 'receipt' ? rupees(d.amount) : d.total != null ? rupees(d.total) : ''}
                        {d.status ? ` · ${DOC_STATUS[d.status] || d.status}` : ''}
                        {d.at ? ` · ${formatWhen(d.at)}` : ''}
                      </p>
                    </div>
                    {(d.hasFile || d.kind === 'receipt') && onOpenDocument && (
                      <button type="button" onClick={() => onOpenDocument(d)} aria-label={`Open ${DOC_TITLE[d.kind] || d.kind} ${d.number || ''}`.trim()} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-surface-hover">
                        <Download size={12} />{d.kind === 'receipt' ? 'Download' : 'Open'}
                      </button>
                    )}
                  </div>
                  {d.items?.length > 0 && (
                    <table className="w-full border-t border-line text-[12px]">
                      <thead><tr className="text-left text-[10px] uppercase tracking-wide text-dim"><th className="px-3 py-1.5 font-semibold">Item</th><th className="px-2 py-1.5 text-right font-semibold">Qty</th><th className="px-3 py-1.5 text-right font-semibold">Amount</th></tr></thead>
                      <tbody>
                        {d.items.map((i, idx) => (
                          <tr key={`${i.name}-${idx}`} className="border-t border-line">
                            <td className="px-3 py-1.5 text-ink">{i.name}</td>
                            <td className="px-2 py-1.5 text-right text-dim">{i.quantity}{i.unit ? ` ${i.unit}` : ''}</td>
                            <td className="px-3 py-1.5 text-right text-ink">{i.amount == null ? '' : rupees(i.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {(order.grn || order.delivery) && (
          <section aria-label="Goods received">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-dim">Goods</h3>
            <div className="mt-2 rounded-xl border border-line px-3 py-2.5 text-[13px] text-ink">
              {order.grn && (
                <>
                  <p className="font-medium">Received and checked{order.grn.number ? ` · GRN ${order.grn.number}` : ''}</p>
                  {order.grn.items?.length > 0 && (
                    <ul className="mt-1 text-[12px] text-dim">
                      {order.grn.items.map((i, idx) => <li key={`${i.name}-${idx}`}>{i.name}: {i.quantity}{i.unit ? ` ${i.unit}` : ''}</li>)}
                    </ul>
                  )}
                  {order.grn.note && <p className="mt-1 text-[12px] text-dim">{order.grn.note}</p>}
                </>
              )}
              {order.delivery && (
                <p className={`${order.grn ? 'mt-2 ' : ''}text-[12px] text-dim`}>
                  Delivered {formatWhen(order.delivery.at)}{order.delivery.receivedBy ? ` · received by ${order.delivery.receivedBy}` : ''}
                </p>
              )}
            </div>
          </section>
        )}

        {order.payments?.length > 0 && (
          <section aria-label="Payments">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-dim">Payments</h3>
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {order.payments.map((p, i) => (
                <li key={`${p.at}-${i}`} className="flex items-center gap-2 px-3 py-2 text-[13px]">
                  <CheckCircle2 size={14} className="text-success" />
                  <span className="font-medium text-ink">{rupees(p.amount)}</span>
                  {p.reference && <span className="truncate text-[11px] text-dim">{p.reference}</span>}
                  <span className="ml-auto text-[11px] text-dim">{formatWhen(p.at)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {order.issues?.length > 0 && (
          <section aria-label="Problems reported">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-dim">Problems reported</h3>
            <ul className="mt-2 space-y-1.5">
              {order.issues.map((i) => (
                <li key={i.id} className="rounded-lg border border-line px-3 py-2 text-[13px] text-ink">
                  <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${i.status === 'open' ? TONE_CLASS.danger : TONE_CLASS.success}`}>{i.status === 'open' ? 'Open' : 'Resolved'}</span>
                  {i.note}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="History">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-dim">History</h3>
          <ol className="mt-3 space-y-0">
            {[...(order.timeline || [])].reverse().map((e, i, all) => (
              <li key={e.id} className="relative flex gap-3 pb-4">
                {i < all.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-line" aria-hidden="true" />}
                <span className="mt-1 h-[11px] w-[11px] flex-shrink-0 rounded-full border-2 border-surface bg-ink" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[13px] text-ink">{timelineText(e)}</p>
                  {e.note && <p className="mt-0.5 break-words text-[12px] text-dim">“{e.note}”</p>}
                  <p className="text-[11px] text-dim">{e.by?.name}{e.by?.name ? ' · ' : ''}{formatWhen(e.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
};

export default OrderDetail;
