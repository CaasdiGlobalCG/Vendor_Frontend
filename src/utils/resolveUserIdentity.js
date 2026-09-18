/**
 * Resolve the authenticated user's identity (email + name) for KYC forms.
 *
 * Order:
 *   1. /api/vendor/me  — full vendor record (email + name) when it exists
 *   2. /api/auth/verify — session-derived payload; returns email even when the
 *      user has no vendor record yet (e.g. client→vendor switch where set-role
 *      was never called for 'vendor').
 *
 * Both use cookie auth; a legacy localStorage authToken is attached only when
 * present (handoff logins have no localStorage token).
 *
 * @returns {Promise<{email: string, name: string}>}
 */
export const resolveUserIdentity = async () => {
  const token = localStorage.getItem('authToken');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
  };

  let email = '';
  let name = '';

  try {
    const res = await fetch(`${window.location.origin}/api/vendor/me`, {
      headers,
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      const u = data?.data || data || {};
      email = u.email || u.vendorDetails?.primaryContactEmail || '';
      name = u.name || [u.vendorDetails?.firstName, u.vendorDetails?.lastName].filter(Boolean).join(' ');
    }
  } catch {}

  // Client→vendor handoff: the exchange stashes the registered email — the
  // vendor record may not exist yet (KYC not started), so /api/vendor/me 404s.
  if (!email) {
    email = sessionStorage.getItem('vendorHandoffEmail') || '';
  }

  if (!email) {
    try {
      const res = await fetch(`${window.location.origin}/api/auth/verify`, {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        email = data?.email || '';
      }
    } catch {}
  }

  return { email, name };
};

/** Convenience wrapper — email only. */
export const resolveUserEmail = async () => (await resolveUserIdentity()).email;
