// ============================================================
// FILE: utils/b2bDismissedDocs.js
// PURPOSE: Marketplace order documents (quotation, PO, invoice, receipt
//          voucher) are placed on the canvas automatically. When anyone
//          deletes them or clears the canvas, that has to stick for
//          everybody, otherwise the next refresh puts them straight back.
//          The list lives on the workspace (server); a copy is kept here
//          so the document does not flicker back while the server call is
//          in flight. Storage can be unavailable, so access is guarded.
// ============================================================

import { dismissCanvasDocs } from '../../../utils/workspaceOrdersApi';

const keyFor = (workspaceId) => `b2bDismissedDocs:${workspaceId}`;
export const isOrderDocNodeId = (id) => String(id || '').startsWith('b2b-doc-');

export function readDismissedOrderDocs(workspaceId) {
  if (!workspaceId) return new Set();
  try {
    const raw = window.localStorage.getItem(keyFor(workspaceId));
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

/** Merge ids the server reports as dismissed into the local copy. */
export function rememberDismissedFromServer(workspaceId, ids = []) {
  if (!workspaceId || !Array.isArray(ids) || !ids.length) return;
  try {
    const set = readDismissedOrderDocs(workspaceId);
    ids.forEach((id) => set.add(id));
    window.localStorage.setItem(keyFor(workspaceId), JSON.stringify([...set]));
  } catch {
    // fine: the server list is the source of truth
  }
}

export function dismissOrderDocs(workspaceId, nodeIds = []) {
  const ids = (nodeIds || []).filter(isOrderDocNodeId);
  if (!workspaceId || !ids.length) return;
  rememberDismissedFromServer(workspaceId, ids);
  // Fire and forget: the canvas must never wait on this.
  dismissCanvasDocs(workspaceId, ids).catch((err) => {
    console.warn('Could not record dismissed order documents on the server:', err?.message);
  });
}
