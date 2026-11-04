import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Minus, PackageSearch, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import {
  addToCart, checkout, ensureBuyerProfile, fetchCart, fetchProducts, getBuyerProfile, isMarketplaceConfigured,
  registerOrder, removeFromCart, setCartQuantity,
} from './marketplaceApi';
import { rupees } from '../Orders/orderUi';

/**
 * The marketplace, inside the project. The vendor can browse, order directly, or
 * ask for a quote without leaving the canvas. Whatever they order is tied to
 * this project and shows up under Orders.
 */

const priceText = (p) => {
  if (p.minPrice == null) return 'Price on request';
  if (p.maxPrice != null && p.maxPrice !== p.minPrice) return `${rupees(p.minPrice)} – ${rupees(p.maxPrice)} / ${p.unit}`;
  return `${rupees(p.minPrice)} / ${p.unit}`;
};

const ProductCard = ({ product, busy, onAdd, onQuote }) => {
  const [qty, setQty] = useState(product.moq);
  const orderable = product.minPrice != null;
  return (
    <li className="flex gap-3 rounded-xl border border-line bg-surface p-3">
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-surface-hover">
        {product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{product.name}</p>
        <p className="truncate text-[11px] text-dim">{product.brand ? `${product.brand} · ` : ''}{product.category}</p>
        <p className="mt-1 text-[12px] font-medium text-ink">{priceText(product)}</p>
        <p className="text-[10px] text-dim">Minimum order {product.moq} {product.unit}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {orderable && (
            <>
              <div className="flex items-center rounded-lg border border-line">
                <button type="button" aria-label={`Fewer ${product.name}`} onClick={() => setQty((q) => Math.max(product.moq, q - 1))} className="flex h-7 w-7 items-center justify-center text-dim hover:bg-surface-hover"><Minus size={12} /></button>
                <input
                  aria-label={`Quantity of ${product.name}`}
                  value={qty}
                  onChange={(e) => setQty(Math.max(product.moq, Math.floor(Number(e.target.value) || product.moq)))}
                  inputMode="numeric"
                  className="h-7 w-12 border-x border-line bg-transparent text-center text-[12px] text-ink outline-none"
                />
                <button type="button" aria-label={`More ${product.name}`} onClick={() => setQty((q) => q + 1)} className="flex h-7 w-7 items-center justify-center text-dim hover:bg-surface-hover"><Plus size={12} /></button>
              </div>
              <button type="button" disabled={busy} onClick={() => onAdd(product, qty)} className="rounded-lg bg-cta px-3 py-1.5 text-[12px] font-semibold text-cta-foreground disabled:opacity-50">Add to order</button>
            </>
          )}
          <button type="button" onClick={() => onQuote(product, qty)} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-surface-hover">Request quote</button>
        </div>
      </div>
    </li>
  );
};

const MarketplaceDrawer = ({
  isOpen, onClose, workspaceId, workspaceTitle = '', taskId = null, subtaskId = null,
  onRequestQuote, onOpenOrders, onOpenFullMarketplace,
}) => {
  const configured = isMarketplaceConfigured();
  const [tab, setTab] = useState('browse');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [products, setProducts] = useState({ status: 'idle', list: [], error: '' });
  const [cart, setCart] = useState({ status: 'idle', items: [], subtotal: 0, error: '' });
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [address, setAddress] = useState('');
  const [placing, setPlacing] = useState('idle'); // idle | confirm | working | done | tagFailed
  const [result, setResult] = useState({ orderId: '', error: '' });
  const reqId = useRef(0);

  // ---- loading ---------------------------------------------------------
  const loadProducts = useCallback(async (q) => {
    const ticket = ++reqId.current;
    setProducts((s) => ({ ...s, status: 'loading', error: '' }));
    try {
      const list = await fetchProducts(q);
      if (ticket === reqId.current) setProducts({ status: 'ready', list, error: '' });
    } catch (err) {
      if (ticket === reqId.current) setProducts({ status: 'error', list: [], error: err.message || 'Could not load the marketplace.' });
    }
  }, []);

  const loadCart = useCallback(async () => {
    setCart((s) => ({ ...s, status: 'loading', error: '' }));
    try {
      const { items, subtotal } = await fetchCart();
      setCart({ status: 'ready', items, subtotal, error: '' });
    } catch (err) {
      // A vendor with no profile yet simply has an empty cart.
      if (err.status === 403) setCart({ status: 'ready', items: [], subtotal: 0, error: '' });
      else setCart((s) => ({ ...s, status: 'error', error: err.message || 'Could not load your order.' }));
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !configured) return;
    loadProducts('');
    getBuyerProfile().then(setProfile).catch(() => setProfile({ linked: false }));
    loadCart();
    setTab('browse');
    setPlacing('idle');
    setNotice('');
  }, [isOpen, configured, loadProducts, loadCart]);

  useEffect(() => {
    if (!isOpen || !configured) return undefined;
    const t = setTimeout(() => loadProducts(query), 300);
    return () => clearTimeout(t);
  }, [query, isOpen, configured, loadProducts]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // ---- derived ---------------------------------------------------------
  const categories = useMemo(() => {
    const counts = new Map();
    products.list.forEach((p) => counts.set(p.category, (counts.get(p.category) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [products.list]);

  const shown = useMemo(() => (category ? products.list.filter((p) => p.category === category) : products.list), [products.list, category]);
  const cartCount = cart.items.reduce((n, i) => n + i.quantity, 0);
  const hasOwnProfile = !!profile?.linked && profile.profileType !== 'vendor_buyer';

  // ---- actions ---------------------------------------------------------
  const add = async (product, qty) => {
    setBusy(true);
    setNotice('');
    try {
      // The marketplace only sells to buyer profiles; make the vendor's the first time.
      if (!profile?.linked) setProfile(await ensureBuyerProfile());
      await addToCart(product.id, qty);
      await loadCart();
      setNotice(`${product.name} added to your order.`);
    } catch (err) {
      setNotice(err.message || 'Could not add that item.');
    } finally {
      setBusy(false);
    }
  };

  const changeQty = async (item, next) => {
    setBusy(true);
    try {
      if (next <= 0) await removeFromCart(item.productId);
      else await setCartQuantity(item.productId, next);
      await loadCart();
    } catch (err) {
      setNotice(err.message || 'Could not change that item.');
    } finally {
      setBusy(false);
    }
  };

  const tie = async (marketplaceOrderId) => {
    await registerOrder({ marketplaceOrderId, workspaceId, taskId, subtaskId });
  };

  const place = async () => {
    setPlacing('working');
    setResult({ orderId: '', error: '' });
    let marketplaceOrderId = '';
    try {
      ({ marketplaceOrderId } = await checkout({ address: address.trim() }));
    } catch (err) {
      setPlacing('confirm');
      setResult({ orderId: '', error: err.message || 'The order could not be placed.' });
      return;
    }
    try {
      await tie(marketplaceOrderId);
      setPlacing('done');
      setResult({ orderId: marketplaceOrderId, error: '' });
      loadCart();
    } catch (err) {
      // Placed, but not yet tied to the project. Keep the id so it can be retried without ordering again.
      setPlacing('tagFailed');
      setResult({ orderId: marketplaceOrderId, error: err.message || 'It could not be added to this project.' });
    }
  };

  const retryTie = async () => {
    setPlacing('working');
    try {
      await tie(result.orderId);
      setPlacing('done');
      setResult((r) => ({ ...r, error: '' }));
    } catch (err) {
      setPlacing('tagFailed');
      setResult((r) => ({ ...r, error: err.message || 'It could not be added to this project.' }));
    }
  };

  if (!isOpen) return null;

  const addressOk = address.trim().length >= 10;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-[9998] flex w-full max-w-[520px] flex-col border-l border-line bg-surface shadow-2xl"
      role="dialog"
      aria-label="B2B Marketplace"
    >
      <header className="flex items-start gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold text-ink">B2B Marketplace</h2>
          <p className="truncate text-[11px] text-dim">Ordering for {workspaceTitle || 'this project'}</p>
        </div>
        {onOpenOrders && <button type="button" onClick={onOpenOrders} className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-surface-hover">My orders</button>}
        <button type="button" onClick={onClose} aria-label="Close marketplace" className="flex h-8 w-8 items-center justify-center rounded-lg text-dim hover:bg-surface-hover"><X size={16} /></button>
      </header>

      {!configured ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <AlertCircle size={22} className="text-warning" />
          <p className="text-[13px] font-medium text-ink">The marketplace is not connected to the workspace yet.</p>
          <p className="text-[12px] leading-relaxed text-dim">You can still ask procurement for a quote, or open the marketplace site.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => onRequestQuote?.({})} className="rounded-lg bg-cta px-3 py-1.5 text-[12px] font-semibold text-cta-foreground">Request a quote</button>
            {onOpenFullMarketplace && <button type="button" onClick={onOpenFullMarketplace} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink">Open marketplace site</button>}
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-1 border-b border-line px-4 pt-2" role="tablist">
            {[['browse', 'Browse'], ['cart', `Your order${cartCount ? ` (${cartCount})` : ''}`]].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => { setTab(id); if (id === 'cart') loadCart(); }}
                className={`-mb-px border-b-2 px-3 py-2 text-[12px] font-semibold ${tab === id ? 'border-ink text-ink' : 'border-transparent text-dim hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {notice && <p role="status" className="border-b border-line bg-surface-hover px-4 py-2 text-[12px] text-ink">{notice}</p>}

          {tab === 'browse' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="space-y-2 border-b border-line p-4">
                <label className="relative block">
                  <span className="sr-only">Search the marketplace</span>
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search materials, products, brands" className="w-full rounded-lg border border-line bg-surface py-2 pl-8 pr-3 text-[13px] text-ink outline-none focus:border-ink" />
                </label>
                {categories.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Categories">
                    <button type="button" aria-pressed={!category} onClick={() => setCategory('')} className={`flex-shrink-0 rounded-full px-3 py-1 text-[12px] font-medium ${!category ? 'bg-cta text-cta-foreground' : 'border border-line text-dim'}`}>All</button>
                    {categories.map(([name, n]) => (
                      <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)} className={`flex-shrink-0 rounded-full px-3 py-1 text-[12px] font-medium ${category === name ? 'bg-cta text-cta-foreground' : 'border border-line text-dim'}`}>{name} · {n}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {products.status === 'loading' && <p className="flex items-center justify-center gap-2 py-10 text-[13px] text-dim"><Loader2 size={14} className="animate-spin" />Loading products…</p>}
                {products.status === 'error' && (
                  <div role="alert" className="flex flex-col items-center gap-2 py-10 text-center">
                    <AlertCircle size={20} className="text-danger" />
                    <p className="text-[13px] text-ink">{products.error}</p>
                    <button type="button" onClick={() => loadProducts(query)} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink">Try again</button>
                  </div>
                )}
                {products.status === 'ready' && shown.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <PackageSearch size={26} className="text-dim" />
                    <p className="text-[13px] font-medium text-ink">Nothing matches</p>
                    <p className="max-w-[260px] text-[12px] text-dim">Can't find what you need? Procurement will source it for you.</p>
                    <button type="button" onClick={() => onRequestQuote?.({ productName: query.trim() })} className="rounded-lg bg-cta px-3 py-1.5 text-[12px] font-semibold text-cta-foreground">Request a quote{query.trim() ? ` for “${query.trim()}”` : ''}</button>
                  </div>
                )}
                <ul className="space-y-2">
                  {shown.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      busy={busy}
                      onAdd={add}
                      onQuote={(prod, qty) => onRequestQuote?.({ productName: prod.name, category: prod.category, quantity: qty, unit: prod.unit, brand: prod.brand, description: prod.description })}
                    />
                  ))}
                </ul>
              </div>
              {hasOwnProfile && onOpenFullMarketplace && (
                <footer className="border-t border-line px-4 py-2.5">
                  <button type="button" onClick={onOpenFullMarketplace} className="flex items-center gap-1.5 text-[12px] font-medium text-dim hover:text-ink"><ExternalLink size={13} />Open the full marketplace site</button>
                </footer>
              )}
            </div>
          )}

          {tab === 'cart' && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {placing === 'done' && (
                <div role="status" className="flex flex-col items-center gap-2 py-10 text-center">
                  <CheckCircle2 size={26} className="text-success" />
                  <p className="text-[14px] font-semibold text-ink">Order placed</p>
                  <p className="text-[12px] text-dim">Order {result.orderId} was added to {workspaceTitle || 'this project'}. Your project manager can see it.</p>
                  {onOpenOrders && <button type="button" onClick={onOpenOrders} className="mt-1 rounded-lg bg-cta px-3 py-1.5 text-[12px] font-semibold text-cta-foreground">See in Orders</button>}
                </div>
              )}

              {placing === 'tagFailed' && (
                <div role="alert" className="space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-4">
                  <p className="text-[13px] font-semibold text-ink">Your order was placed</p>
                  <p className="text-[12px] text-ink">Order {result.orderId} is with the marketplace, but it could not be added to this project yet: {result.error}</p>
                  <button type="button" onClick={retryTie} className="rounded-lg bg-cta px-3 py-1.5 text-[12px] font-semibold text-cta-foreground">Add to this project</button>
                </div>
              )}

              {['idle', 'confirm', 'working'].includes(placing) && (
                <>
                  {cart.status === 'loading' && cart.items.length === 0 && <p className="flex items-center justify-center gap-2 py-10 text-[13px] text-dim"><Loader2 size={14} className="animate-spin" />Loading…</p>}
                  {cart.status === 'error' && <p role="alert" className="py-6 text-center text-[13px] text-danger">{cart.error}</p>}
                  {cart.status === 'ready' && cart.items.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                      <ShoppingCart size={26} className="text-dim" />
                      <p className="text-[13px] font-medium text-ink">Nothing in your order yet</p>
                      <button type="button" onClick={() => setTab('browse')} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink">Browse products</button>
                    </div>
                  )}
                  {cart.items.length > 0 && (
                    <>
                      <ul className="space-y-2">
                        {cart.items.map((i) => (
                          <li key={i.productId} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-ink">{i.name}</p>
                              <p className="text-[11px] text-dim">{rupees(i.unitPrice)} each · {rupees(i.lineTotal)}</p>
                            </div>
                            <div className="flex items-center rounded-lg border border-line">
                              <button type="button" disabled={busy} aria-label={`Fewer ${i.name}`} onClick={() => changeQty(i, i.quantity - 1)} className="flex h-7 w-7 items-center justify-center text-dim hover:bg-surface-hover"><Minus size={12} /></button>
                              <span className="w-9 text-center text-[12px] text-ink">{i.quantity}</span>
                              <button type="button" disabled={busy} aria-label={`More ${i.name}`} onClick={() => changeQty(i, i.quantity + 1)} className="flex h-7 w-7 items-center justify-center text-dim hover:bg-surface-hover"><Plus size={12} /></button>
                            </div>
                            <button type="button" disabled={busy} aria-label={`Remove ${i.name}`} onClick={() => changeQty(i, 0)} className="flex h-7 w-7 items-center justify-center rounded-lg text-dim hover:bg-surface-hover"><Trash2 size={13} /></button>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-hover px-4 py-3">
                        <span className="text-[12px] text-dim">Items total</span>
                        <span className="text-[15px] font-semibold text-ink">{rupees(cart.subtotal)}</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-dim">Taxes, shipping and assurance fees are added by the marketplace when the order is placed.</p>

                      <label className="mt-4 block">
                        <span className="text-[12px] font-semibold text-ink">Where should it be delivered?</span>
                        <textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          rows={3}
                          maxLength={400}
                          placeholder="Site name, street, city, PIN code"
                          className="mt-1.5 w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-ink"
                        />
                      </label>

                      {result.error && placing !== 'tagFailed' && <p role="alert" className="mt-2 flex items-start gap-1.5 text-[12px] text-danger"><AlertCircle size={13} className="mt-0.5 flex-shrink-0" />{result.error}</p>}

                      {placing === 'confirm' || placing === 'working' ? (
                        <div className="mt-4 rounded-xl border border-line p-3">
                          <p className="text-[13px] text-ink">Place this order for {rupees(cart.subtotal)}? It will be added to {workspaceTitle || 'this project'} and your project manager will be able to see it.</p>
                          <div className="mt-3 flex justify-end gap-2">
                            <button type="button" disabled={placing === 'working'} onClick={() => setPlacing('idle')} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-dim hover:bg-surface-hover">Not yet</button>
                            <button type="button" disabled={placing === 'working'} onClick={place} className="flex items-center gap-1.5 rounded-lg bg-cta px-3.5 py-1.5 text-[12px] font-semibold text-cta-foreground disabled:opacity-60">
                              {placing === 'working' && <Loader2 size={12} className="animate-spin" />}Yes, place order
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" disabled={!addressOk || busy} onClick={() => setPlacing('confirm')} className="mt-4 w-full rounded-lg bg-cta py-2.5 text-[13px] font-semibold text-cta-foreground disabled:opacity-50">
                          Place order
                        </button>
                      )}
                      {!addressOk && address.length > 0 && <p className="mt-1.5 text-[11px] text-dim">Please give the full delivery address.</p>}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
};

export default MarketplaceDrawer;
