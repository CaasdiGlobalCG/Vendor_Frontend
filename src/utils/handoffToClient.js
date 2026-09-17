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
    body: JSON.stringify({ ...(token ? { token } : {}), targetPlatform: 'client' }),
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

  const targetUrl = new URL(`${clientBase}/`);
  targetUrl.searchParams.set('handoff', code);
  // Marks an explicit role-selection pick so the client app sends the user to
  // onboarding instead of bouncing them back to /role-selection.
  if (options?.fromRoleSelection) targetUrl.searchParams.set('rolePick', '1');

  // Use assign() so the current vendor route is kept in browser history.
  // This makes the browser Back button return to the exact last vendor route.
  window.location.assign(targetUrl.toString());
}
