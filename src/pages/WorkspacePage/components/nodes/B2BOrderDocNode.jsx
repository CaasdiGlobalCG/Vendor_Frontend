import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Download, FileText, Loader2, PackageCheck, Receipt } from 'lucide-react';
import NodeHandles from './NodeHandles';
import { fetchDocumentFile, getOrder } from '../../../../utils/workspaceOrdersApi';
import useOrderPayment from '../../../../components/Orders/useOrderPayment';
import { formatWhen, rupees } from '../../../../components/Orders/orderUi';

/**
 * A document from a vendor's marketplace order (quotation, receipt voucher, PO or
 * invoice), shown on the canvas beside the others in its chain. Only the order id
 * and document id are stored on the canvas; what is shown is read from the order,
 * so it is always current, and only the buyer and the PM can read it.
 */

const KIND = {
  quotation: { title: 'Quotation', Icon: FileText },
  invoice: { title: 'Invoice', Icon: FileText },
  receipt: { title: 'Receipt voucher', Icon: Receipt },
  po: { title: 'Purchase order', Icon: FileText },
};
const STATUS = {
  awaiting_decision: ['Awaiting decision', 'bg-warning/10 text-warning'],
  approved: ['Approved', 'bg-success/10 text-success'],
  changes_requested: ['Changes requested', 'bg-warning/10 text-warning'],
  rejected: ['Declined', 'bg-surface-hover text-dim'],
  payable: ['Payment due', 'bg-warning/10 text-warning'],
  paid: ['Paid', 'bg-success/10 text-success'],
  issued: ['Issued', 'bg-surface-hover text-dim'],
};

const POLL_MS = 60000;

const B2BOrderDocNode = ({ data, isConnectable = true }) => {
  const { orderId, docId, kind: storedKind } = data || {};
  const [state, setState] = useState({ status: 'loading', order: null, error: '' });
  const [fileError, setFileError] = useState('');

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const body = await getOrder(orderId);
      setState({ status: 'ready', order: body.order, error: '' });
    } catch (err) {
      setState((s) => ({ status: s.order ? 'ready' : 'error', order: s.order, error: err.status === 404 ? 'private' : err.message }));
    }
  }, [orderId]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const { pay, busy, error: payError } = useOrderPayment(useCallback((order) => setState({ status: 'ready', order, error: '' }), []));

  const { order } = state;
  const doc = order?.documents?.find((d) => d.id === docId);
  const kind = doc?.kind || storedKind || 'quotation';
  const meta = KIND[kind] || KIND.quotation;
  const Icon = meta.Icon;

  const open = async () => {
    setFileError('');
    try {
      const file = await fetchDocumentFile(orderId, docId);
      if (file.kind === 'url') {
        window.open(file.url, '_blank', 'noopener');
      } else {
        const href = URL.createObjectURL(file.blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 10000);
      }
    } catch (err) {
      setFileError(err.message || 'Could not open this document.');
    }
  };

  // Payment belongs on the document it is for: the quotation until the invoice exists, then the invoice.
  const payable = order?.dueNow > 0 && ((kind === 'quotation' && order.stage === 'payment_due') || (kind === 'invoice' && order.stage === 'balance_due'));
  const status = doc?.status ? STATUS[doc.status] : null;

  return (
    <div className="w-[340px] rounded-xl border border-line bg-surface p-4 shadow-sm" data-b2b-doc={kind}>
      <NodeHandles isConnectable={isConnectable} />
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-ink"><Icon size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{meta.title}{doc?.number ? ` · ${doc.number}` : ''}</p>
          <p className="text-[10px] uppercase tracking-wide text-dim">Marketplace order</p>
        </div>
        {status && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status[1]}`}>{status[0]}</span>}
      </div>

      {state.status === 'loading' && <p className="mt-3 flex items-center gap-2 text-[12px] text-dim"><Loader2 size={13} className="animate-spin" />Loading…</p>}
      {state.status === 'error' && (
        <p className="mt-3 flex items-start gap-2 text-[12px] text-dim">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          {state.error === 'private' ? 'This document is shared with the buyer and the project manager only.' : state.error || 'Could not load this document.'}
        </p>
      )}

      {order && doc && (
        <>
          <p className="mt-3 text-[20px] font-semibold text-ink">{rupees(kind === 'receipt' ? doc.amount : doc.total)}</p>
          <p className="text-[11px] text-dim">{doc.at ? formatWhen(doc.at) : ''}{doc.reference ? ` · ${doc.reference}` : ''}</p>
          {doc.items?.length > 0 && (
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line text-[12px]">
              {doc.items.slice(0, 3).map((i, idx) => (
                <li key={`${i.name}-${idx}`} className="flex justify-between gap-2 px-2.5 py-1.5">
                  <span className="truncate text-ink">{i.name}</span>
                  <span className="flex-shrink-0 text-dim">{i.quantity}{i.unit ? ` ${i.unit}` : ''}</span>
                </li>
              ))}
              {doc.items.length > 3 && <li className="px-2.5 py-1.5 text-dim">+ {doc.items.length - 3} more</li>}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {payable && (
              <button type="button" disabled={busy} onClick={() => pay(orderId, doc.number || orderId)} className="flex items-center gap-1.5 rounded-lg bg-cta px-3 py-1.5 text-[12px] font-semibold text-cta-foreground disabled:opacity-60">
                {busy && <Loader2 size={12} className="animate-spin" />}Pay {rupees(order.dueNow)}
              </button>
            )}
            {(doc.hasFile || kind === 'receipt') && (
              <button type="button" onClick={open} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-surface-hover">
                <Download size={12} />{kind === 'receipt' ? 'Download' : 'Open'}
              </button>
            )}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('b2b-orders:open', { detail: { orderId } }))}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-dim hover:bg-surface-hover"
            >
              <PackageCheck size={12} />Order details
            </button>
          </div>
          {(payError || fileError) && <p role="alert" className="mt-2 text-[11px] text-danger">{payError || fileError}</p>}
        </>
      )}

      {order && !doc && state.status === 'ready' && <p className="mt-3 text-[12px] text-dim">This document is no longer part of the order.</p>}
    </div>
  );
};

export default B2BOrderDocNode;
