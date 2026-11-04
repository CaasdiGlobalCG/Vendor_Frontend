// ============================================================
// FILE: components/Marketplace/marketplaceApi.js
// PURPOSE: Everything the in-workspace marketplace drawer asks of the
//          marketplace itself (browse, cart, checkout) and of our own server
//          (the buyer profile, and tying an order to a project).
//          The marketplace is called with the vendor's own login, so it acts
//          exactly as it would on the marketplace site.
// CONNECTS TO: config/env.js (B2B_API_URL), MarketplaceDrawer.jsx,
//              Vendor_Backend /api/workspace-orders
// ============================================================

import { Auth } from 'aws-amplify';
import config from '../../config/env';
import authFetch from '../../utils/authFetch';
import { getActiveCanvasScope } from '../../pages/WorkspacePage/utils/nodePersistence';

const MAX_PRODUCTS = 400;

export const isMarketplaceConfigured = () => !!config.B2B_API_URL;

const idToken = async () => {
  try {
    const session = await Auth.currentSession();
    const token = session?.getIdToken?.()?.getJwtToken?.();
    if (token) return token;
  } catch {
    // fall through to a stored token
  }
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
};

const parse = async (res) => {
  try { return await res.json(); } catch { return {}; }
};

const market = async (path, { method = 'GET', body, auth = true } = {}) => {
  if (!config.B2B_API_URL) throw Object.assign(new Error('The marketplace is not connected to this workspace yet.'), { code: 'NOT_CONFIGURED' });
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await idToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${config.B2B_API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await parse(res);
  if (!res.ok) {
    const err = new Error(data.message || `The marketplace could not do that (${res.status}).`);
    err.status = res.status;
    err.code = data.code || null;
    throw err;
  }
  return data;
};

/** A product as the drawer shows it, from whatever the marketplace returns. */
export const toProduct = (p) => {
  if (!p?.productId) return null;
  const min = Number(p.minPricePerUnit);
  const max = Number(p.maxPricePerUnit);
  const moq = Number(p.minOrderQuantity);
  return {
    id: String(p.productId),
    name: String(p.productName || p.name || 'Product'),
    brand: p.brand || '',
    category: p.productCategory || p.category || 'Other',
    description: p.shortDescription || '',
    image: Array.isArray(p.images) && p.images[0] ? p.images[0] : null,
    minPrice: Number.isFinite(min) && min > 0 ? min : null,
    maxPrice: Number.isFinite(max) && max > 0 ? max : null,
    unit: p.supplyUnit || 'units',
    moq: Number.isFinite(moq) && moq > 0 ? moq : 1,
  };
};

/** Approved products, optionally narrowed by a search word. */
export const fetchProducts = async (query = '') => {
  const q = String(query || '').trim();
  const data = await market(q ? `/api/products/search?q=${encodeURIComponent(q)}` : '/api/products', { auth: false });
  const list = Array.isArray(data) ? data : data.products || [];
  return list.slice(0, MAX_PRODUCTS).map(toProduct).filter(Boolean);
};

/** The vendor's marketplace cart: one line per product, and the subtotal the marketplace works out. */
export const fetchCart = async () => {
  const data = await market('/api/cart');
  const items = (Array.isArray(data?.items) ? data.items : [])
    .filter((i) => i?.productId)
    .map((i) => ({
      productId: String(i.productId),
      name: i.title || 'Item',
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
      lineTotal: Number(i.lineTotal) || (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
      image: i.image || null,
    }));
  const subtotal = Number(data?.summary?.subtotal);
  return { items, subtotal: Number.isFinite(subtotal) ? subtotal : items.reduce((s, i) => s + i.lineTotal, 0) };
};

export const addToCart = (productId, quantity) => market('/api/cart/items', { method: 'POST', body: { productId, quantity } });
export const setCartQuantity = (productId, quantity) => market(`/api/cart/items/${encodeURIComponent(productId)}`, { method: 'PATCH', body: { quantity } });
export const removeFromCart = (productId) => market(`/api/cart/items/${encodeURIComponent(productId)}`, { method: 'DELETE' });

/**
 * Places the order for everything in the cart. `address` is plain text the vendor typed.
 * @returns {Promise<{ marketplaceOrderId: string }>}
 */
export const checkout = async ({ address, method = 'Combined Shipping' }) => {
  const data = await market('/api/checkout', {
    method: 'POST',
    body: {
      shippingDetails: { method, cost: 0, address, deliveryTime: null },
      paymentDetails: { method: 'Trade Assurance', paymentMethodType: 'card' },
    },
  });
  if (!data.buyerOrderId) throw new Error('The marketplace did not return an order number. Please check your orders before trying again.');
  return { marketplaceOrderId: String(data.buyerOrderId) };
};

// ---- our own server ------------------------------------------------------

const ours = async (path, options = {}) => {
  const res = await authFetch(`/api/workspace-orders${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await parse(res);
  if (!res.ok || data.success === false) {
    const err = new Error(data.message || `Something went wrong (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
};

/** { linked, clientId, profileType } */
export const getBuyerProfile = () => ours('/buyer-profile');
export const ensureBuyerProfile = () => ours('/buyer-profile', { method: 'POST' });

/** Ties a placed marketplace order to this project. */
export const registerOrder = ({ marketplaceOrderId, workspaceId, taskId = null, subtaskId = null }) => {
  // Without an explicit canvas, use the one the vendor has open.
  const scope = getActiveCanvasScope();
  return ours('/direct', {
    method: 'POST',
    body: JSON.stringify({ marketplaceOrderId, workspaceId, taskId: taskId || scope.taskId || null, subtaskId: subtaskId || scope.subtaskId || null }),
  });
};
