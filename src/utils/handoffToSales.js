import config from '../config/env';

/**
 * Redirect the user from Vendor app → Sales app using the one-time
 * handoff code flow.  Auth is based on the httpOnly vg_auth cookie
 * (credentials: 'include'). An explicit token can be passed via
 * options.token if the caller already has one, but we never fish
 * for stale JWTs from localStorage — that causes 401s when the JWT
 * has expired while the cookie session is still valid.
 *
 * @param {string} [targetPath='/'] - Sales-side route to land on
 * @param {Object} [options]
 * @param {string} [options.token] - Optional Cognito JWT to send as Bearer
 */
export async function redirectToSalesWithHandoff(targetPath = '/', options = {}) {
  const salesBase = config.SALES_URL || '';
  if (!salesBase) throw new Error('SALES_URL is not configured');

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
    body: JSON.stringify({ ...(token ? { token } : {}), targetPlatform: 'sales' }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`handoff failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const code = data?.code;
  if (!code) throw new Error('handoff did not return code');

  // Normalise: ensure targetPath starts with / and build clean URL
  const path = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  const separator = path.includes('?') ? '&' : '?';
  window.location.assign(`${salesBase}${path}${separator}handoff=${encodeURIComponent(code)}`);
}
