import config from '../config/env';

function getLegacyAuthToken() {
  try {
    const raw = localStorage.getItem('authToken');
    if (!raw) return null;
    const token = String(raw).trim();
    if (!token) return null;
    const lowered = token.toLowerCase();
    if (lowered === 'null' || lowered === 'undefined') return null;
    return token;
  } catch {
    return null;
  }
}

export async function redirectToSalesWithHandoff() {
  const salesBase = config.SALES_URL || '';
  if (!salesBase) throw new Error('SALES_URL is not configured');

  try {
    sessionStorage.setItem(
      'vendor:lastRoute',
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
  } catch {}

  const legacyToken = getLegacyAuthToken();
  const res = await fetch('/api/auth/handoff', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(legacyToken ? { Authorization: `Bearer ${legacyToken}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(legacyToken ? { token: legacyToken } : {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`handoff failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const code = data?.code;
  if (!code) throw new Error('handoff did not return code');

  window.location.assign(`${salesBase}/?handoff=${encodeURIComponent(code)}`);
}
