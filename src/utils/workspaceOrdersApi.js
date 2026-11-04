// ============================================================
// FILE: utils/workspaceOrdersApi.js
// PURPOSE: Calls for a vendor's marketplace orders (direct orders and RFQs):
//          list them, open one, and answer it. The server decides who the
//          person is and what they may do; nothing here is trusted for that.
// CONNECTS TO: Vendor_Backend /api/workspace-orders,
//              components/Orders/*
// ============================================================

import authFetch from './authFetch';

const BASE = '/api/workspace-orders';

const readJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const request = async (path, options = {}) => {
  const res = await authFetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await readJson(res);
  if (!res.ok || body.success === false) {
    const err = new Error(body.message || `Something went wrong (${res.status})`);
    err.status = res.status;
    err.code = body.code || null;
    throw err;
  }
  return body;
};

const toQuery = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};

/** @returns {Promise<{ orders: object[], counts: { total: number, needsAction: number } }>} */
export const listOrders = (filters = {}) => request(toQuery(filters));

/** Tell the server these documents were taken off the canvas, so nobody gets them placed again. */
export const dismissCanvasDocs = (workspaceId, nodeIds) => request('/dismiss-docs', {
  method: 'POST',
  body: JSON.stringify({ workspaceId, nodeIds }),
});

/** @returns {Promise<{ order: object, viewerRole: string }>} */
export const getOrder = (orderId) => request(`/${encodeURIComponent(orderId)}`);

/**
 * Do something on an order: approve a quote, ask for changes, submit a PO, verify
 * delivery, raise an issue, cancel, or leave a note.
 */
export const postOrderEvent = (orderId, { type, note = '', data = {} }) => request(
  `/${encodeURIComponent(orderId)}/events`,
  { method: 'POST', body: JSON.stringify({ type, note, data }) },
);

/** Starts a payment for what is due. The amount is the server's, never ours. */
export const createOrderPayment = (orderId) => request(`/${encodeURIComponent(orderId)}/payment-order`, { method: 'POST', body: '{}' });

/** Confirms a payment with the signature the payment window returned. */
export const verifyOrderPayment = (orderId, gatewayResponse) => request(
  `/${encodeURIComponent(orderId)}/payment-verify`,
  { method: 'POST', body: JSON.stringify(gatewayResponse) },
);

/**
 * Opens a document. A receipt comes back as a PDF to download; the others as a
 * short-lived link to a private file.
 * @returns {Promise<{ kind: 'blob', blob: Blob, filename: string } | { kind: 'url', url: string }>}
 */
export const fetchDocumentFile = async (orderId, docId) => {
  const res = await authFetch(`${BASE}/${encodeURIComponent(orderId)}/documents/${encodeURIComponent(docId)}/file`, { credentials: 'include' });
  const type = res.headers?.get?.('content-type') || '';
  if (res.ok && type.includes('application/pdf')) {
    const disposition = res.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="?([^";]+)"?/);
    return { kind: 'blob', blob: await res.blob(), filename: match ? match[1] : `${docId}.pdf` };
  }
  const body = await readJson(res);
  if (!res.ok || !body.url) {
    const err = new Error(body.message || 'This document is not available yet.');
    err.status = res.status;
    throw err;
  }
  return { kind: 'url', url: body.url };
};
