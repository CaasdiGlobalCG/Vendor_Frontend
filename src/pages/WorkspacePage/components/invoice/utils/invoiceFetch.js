// ============================================================
// FILE: invoice/utils/invoiceFetch.js
// PURPOSE: Fetch wrapper for invoice-module API calls.
//          Attaches a Cognito id-token as `Authorization: Bearer`
//          (backend authenticateUser only accepts verified RS256
//          JWTs — the x-user-info header fallback was removed),
//          sends cookies for dual-auth, and retries once after a
//          401 by refreshing the session (via utils/authFetch).
// CONNECTS TO: utils/authFetch.js (401 refresh/retry),
//              Vendor_Backend middleware/authMiddleware.js
// ============================================================

import { Auth } from 'aws-amplify';
import authFetch from '../../../../../utils/authFetch';

/**
 * Resolve the best available Cognito id token.
 * Prefers a live Amplify session (auto-refreshes expired tokens via
 * the Cognito refresh token), then falls back to handoff/legacy
 * tokens placed in storage by handoff flows.
 * @returns {Promise<string|null>} JWT string or null
 */
export async function getIdToken() {
  try {
    const session = await Auth.currentSession();
    const token = session?.getIdToken?.()?.getJwtToken?.();
    if (token) return token;
  } catch {
    // No active Amplify session — fall through to stored tokens
  }
  return (
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    null
  );
}

/**
 * Drop-in replacement for fetch() for invoice-module requests.
 * Merges caller-supplied headers and sets Authorization to a verified
 * Cognito id token when one can be resolved; otherwise the caller's
 * Authorization header (if any) is passed through unchanged.
 *
 * @param {string|Request} url - Fetch URL or Request object
 * @param {RequestInit} [options={}] - Standard fetch options
 * @returns {Promise<Response>} The fetch Response
 */
export default async function invoiceFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = await getIdToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return authFetch(url, { ...options, headers });
}
