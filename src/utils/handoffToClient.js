import config from '../config/env';

export async function redirectToClientWithHandoff(options = {}) {
  const clientBase = config.CLIENT_URL || '';
  if (!clientBase) throw new Error('CLIENT_URL is not configured');

  // Record the exact vendor URL before switching apps.
  // This enables smoother UX (and can be used for explicit "Back to Vendor" links later).
  try {
    sessionStorage.setItem(
      'vendor:lastRoute',
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
  } catch {}

  const token = options?.token;
  const res = await fetch('/api/auth/handoff', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(token ? { token } : {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`handoff failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const code = data?.code;
  if (!code) throw new Error('handoff did not return code');

  try {
    localStorage.removeItem('clientId');
    sessionStorage.removeItem('bootRouted');
  } catch {}

  // Use assign() so the current vendor route is kept in browser history.
  // This makes the browser Back button return to the exact last vendor route.
  window.location.assign(`${clientBase}/?handoff=${encodeURIComponent(code)}`);
}
