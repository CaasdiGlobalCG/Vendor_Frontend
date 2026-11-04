import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, PackageSearch, RefreshCw, Search } from 'lucide-react';
import { fetchDocumentFile, getOrder, listOrders, postOrderEvent } from '../../utils/workspaceOrdersApi';
import useOrderPayment from './useOrderPayment';
import OrderDetail from './OrderDetail';
import { TONE_CLASS, formatWhen, rupees, stageTone, waitingText } from './orderUi';

/**
 * The vendor's marketplace orders: a list on the left, the chosen order on the right.
 * With `workspaceId` it shows only that project's orders (the project tab);
 * without it, every order across projects (the dashboard Orders window).
 */

const VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'action', label: 'Needs you' },
  { id: 'rfq', label: 'Quote requests' },
  { id: 'direct', label: 'Direct orders' },
];

const POLL_MS = 30000;

const OrderRow = ({ order, selected, onSelect }) => {
  const tone = stageTone(order);
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(order.orderId)}
        aria-current={selected ? 'true' : undefined}
        className={`w-full rounded-xl border px-3.5 py-3 text-left transition-colors ${selected ? 'border-ink bg-surface-hover' : 'border-line bg-surface hover:bg-surface-hover'}`}
      >
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{order.itemsSummary}</p>
          {order.needsAction && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-warning" aria-label="Needs your attention" />}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-dim">
          {order.channel === 'rfq' ? 'Quote request' : 'Direct order'}
          {order.workspaceTitle ? ` · ${order.workspaceTitle}` : ''}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASS[tone]}`}>{order.stageLabel}</span>
          <span className="truncate text-[11px] text-dim">{waitingText(order)}</span>
          <span className="ml-auto flex-shrink-0 text-[12px] font-medium text-ink">{order.total == null ? '' : rupees(order.total)}</span>
        </div>
        <p className="mt-1 text-[10px] text-dim">Updated {formatWhen(order.updatedAt)}</p>
      </button>
    </li>
  );
};

const OrdersPanel = ({ workspaceId = null, onOpenWorkspace, focusOrderId = null, className = '' }) => {
  const [state, setState] = useState({ status: 'loading', orders: [], counts: { total: 0, needsAction: 0 }, error: '' });
  const [view, setView] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(focusOrderId);
  const [detail, setDetail] = useState({ order: null, loading: false, error: '' });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const requested = useRef(0);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, status: 'loading', error: '' }));
    try {
      const body = await listOrders({ workspaceId });
      setState({ status: 'ready', orders: body.orders || [], counts: body.counts || { total: 0, needsAction: 0 }, error: '' });
    } catch (err) {
      setState((s) => (silent ? s : { ...s, status: 'error', error: err.message || 'Could not load your orders.' }));
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => load({ silent: true }), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const openDetail = useCallback(async (orderId, { keepActionError = false } = {}) => {
    if (!orderId) { setDetail({ order: null, loading: false, error: '' }); return; }
    const ticket = ++requested.current;
    setDetail((d) => ({ order: d.order?.orderId === orderId ? d.order : null, loading: true, error: '' }));
    if (!keepActionError) setActionError('');
    try {
      const body = await getOrder(orderId);
      if (ticket !== requested.current) return;
      const fromList = state.orders.find((o) => o.orderId === orderId);
      setDetail({ order: { ...body.order, workspaceTitle: body.order.workspaceTitle || fromList?.workspaceTitle }, loading: false, error: '' });
    } catch (err) {
      if (ticket !== requested.current) return;
      setDetail({ order: null, loading: false, error: err.message || 'Could not open this order.' });
    }
  }, [state.orders]);

  useEffect(() => { openDetail(selectedId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selectedId]);

  const handleAction = useCallback(async ({ type, note, data }) => {
    if (!detail.order) return false;
    setBusy(true);
    setActionError('');
    try {
      const body = await postOrderEvent(detail.order.orderId, { type, note, data });
      setDetail({ order: { ...body.order, workspaceTitle: detail.order.workspaceTitle }, loading: false, error: '' });
      load({ silent: true });
      return true;
    } catch (err) {
      setActionError(err.code === 'STALE' ? 'This order was just updated. It has been refreshed, please try again.' : (err.message || 'That did not go through.'));
      if (err.code === 'STALE') openDetail(detail.order.orderId, { keepActionError: true });
      return false;
    } finally {
      setBusy(false);
    }
  }, [detail.order, load, openDetail]);

  // ---- paying and opening documents ---------------------------------
  const { pay: payOrder, busy: payBusy, error: payError } = useOrderPayment(
    useCallback((updated) => {
      setDetail((d) => ({ order: { ...updated, workspaceTitle: d.order?.workspaceTitle }, loading: false, error: '' }));
      load({ silent: true });
    }, [load]),
  );
  const payState = { busy: payBusy, error: payError };
  const pay = useCallback(() => payOrder(detail.order?.orderId, detail.order?.orderId), [payOrder, detail.order]);

  const openDocument = useCallback(async (doc) => {
    if (!detail.order) return;
    try {
      const file = await fetchDocumentFile(detail.order.orderId, doc.id);
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
      setActionError('');
    } catch (err) {
      setActionError(err.message || 'Could not open that document.');
    }
  }, [detail.order]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.orders.filter((o) => {
      if (view === 'action' && !o.needsAction) return false;
      if (view === 'rfq' && o.channel !== 'rfq') return false;
      if (view === 'direct' && o.channel !== 'direct') return false;
      if (!q) return true;
      return `${o.itemsSummary} ${o.orderId} ${o.workspaceTitle || ''}`.toLowerCase().includes(q);
    });
  }, [state.orders, view, query]);

  const hasDetail = !!selectedId;

  return (
    <div className={`grid h-full min-h-0 grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] ${className}`}>
      {/* List */}
      <section className={`${hasDetail ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col border-r border-line`} aria-label="Orders">
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex items-center gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Search orders</span>
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search orders"
                className="w-full rounded-lg border border-line bg-surface py-2 pl-8 pr-3 text-[13px] text-ink outline-none focus:border-ink"
              />
            </label>
            <button type="button" onClick={() => load()} aria-label="Refresh orders" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-dim hover:bg-surface-hover">
              <RefreshCw size={14} className={state.status === 'loading' ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter orders">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                onClick={() => setView(v.id)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium ${view === v.id ? 'bg-cta text-cta-foreground' : 'border border-line text-dim hover:bg-surface-hover'}`}
              >
                {v.label}
                {v.id === 'action' && state.counts.needsAction > 0 && <span className="ml-1.5 rounded-full bg-warning px-1.5 text-[10px] font-semibold text-white">{state.counts.needsAction}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {state.status === 'loading' && state.orders.length === 0 && (
            <p className="flex items-center justify-center gap-2 py-10 text-[13px] text-dim"><Loader2 size={14} className="animate-spin" />Loading your orders…</p>
          )}
          {state.status === 'error' && (
            <div role="alert" className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <AlertCircle size={20} className="text-danger" />
              <p className="text-[13px] text-ink">{state.error}</p>
              <button type="button" onClick={() => load()} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-surface-hover">Try again</button>
            </div>
          )}
          {state.status === 'ready' && state.orders.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <PackageSearch size={26} className="text-dim" />
              <p className="text-[13px] font-medium text-ink">No orders yet</p>
              <p className="max-w-[260px] text-[12px] leading-relaxed text-dim">
                Order from the marketplace, or ask for a quote from a project. Everything you order will appear here with where it stands.
              </p>
            </div>
          )}
          {state.status === 'ready' && state.orders.length > 0 && shown.length === 0 && (
            <p className="px-4 py-10 text-center text-[13px] text-dim">No orders match this view.</p>
          )}
          <ul className="space-y-2">
            {shown.map((o) => (
              <OrderRow key={o.orderId} order={o} selected={o.orderId === selectedId} onSelect={setSelectedId} />
            ))}
          </ul>
        </div>
      </section>

      {/* Detail */}
      <section className={`${hasDetail ? 'block' : 'hidden lg:block'} min-h-0 bg-canvas`} aria-label="Order details">
        <OrderDetail
          order={detail.order}
          loading={detail.loading}
          error={detail.error}
          busy={busy}
          actionError={actionError}
          onAction={handleAction}
          onPay={pay}
          payState={payState}
          onOpenDocument={openDocument}
          onOpenWorkspace={onOpenWorkspace}
          onBack={() => setSelectedId(null)}
        />
      </section>
    </div>
  );
};

export default OrdersPanel;
