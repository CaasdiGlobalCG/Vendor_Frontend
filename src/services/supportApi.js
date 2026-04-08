/**
 * Vendor Portal – Support API helpers
 *
 * Uses relative paths (VENDOR_BACKEND_URL = '' — proxied by Vite / nginx).
 * Auth is cookie-based (vg_auth httpOnly), so no Authorization header is needed
 * for most calls — but we attach Bearer if authToken is found in localStorage
 * for environments that use both.
 */

const BASE = '/api/support';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ── Create a new ticket (multipart, optional file attachments) ───────────────
export async function createTicket(fields, files = []) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  files.forEach(f => fd.append('files', f));

  const res = await fetch(BASE, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),        // no Content-Type — let browser set multipart boundary
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create ticket');
  return data;
}

// ── List tickets for the current vendor ──────────────────────────────────────
export async function listTickets() {
  const res = await fetch(BASE, {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load tickets');
  return data;
}

// ── List available linked records for a support module ──────────────────────
export async function listReferenceOptions(module, search = '', limit = 5) {
  const params = new URLSearchParams();
  if (module) params.set('module', module);
  if (search) params.set('search', search);
  if (limit) params.set('limit', String(limit));

  const res = await fetch(`${BASE}/reference-options?${params.toString()}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load linked records');
  return data;
}

// ── Get one ticket (with messages) ───────────────────────────────────────────
export async function getTicket(ticketId) {
  const res = await fetch(`${BASE}/${ticketId}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load ticket');
  return data;
}

// ── Get the resolved linked record for a ticket ─────────────────────────────
export async function getTicketReference(ticketId) {
  const res = await fetch(`${BASE}/${ticketId}/reference`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load linked record');
  return data;
}

// ── Reply to a ticket ─────────────────────────────────────────────────────────
export async function addMessage(ticketId, content, files = []) {
  const fd = new FormData();
  fd.append('content', content || '');
  files.forEach(f => fd.append('files', f));

  const res = await fetch(`${BASE}/${ticketId}/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to send message');
  return data;
}

// ── Rate a resolved / closed ticket ──────────────────────────────────────────
export async function rateTicket(ticketId, rating) {
  const res = await fetch(`${BASE}/${ticketId}/rate`, {
    method: 'PUT',
    credentials: 'include',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to save rating');
  return data;
}

// ── Reopen a resolved / closed ticket ────────────────────────────────────────
export async function reopenTicket(ticketId) {
  const res = await fetch(`${BASE}/${ticketId}/reopen`, {
    method: 'PUT',
    credentials: 'include',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reopen ticket');
  return data;
}
