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
  // Carry the workspace actor identity for external viewers — external
  // FIN-/CAS/PM links have no own token, so the ambient session's role differs
  // from the actor's. The backend uses these to stamp creatorRole/creatorUserId
  // and for FIN- gated actions (x-actor-id).
  try {
    const params = new URLSearchParams(window.location.search);
    const pmId = params.get('pmId');
    const clientId = params.get('clientId');
    const actorId = params.get('userId') || pmId || clientId;
    // Role from userRole param, else inferred from which id param carried
    // the actor (pm links use pmId=, client links clientId=, FIN-* = finance)
    const actorRole = params.get('userRole')
      || (params.get('userId')?.startsWith('FIN-') || actorId?.startsWith('FIN-') ? 'finance' : null)
      || (pmId ? 'pm' : null)
      || (clientId ? 'client' : null);
    if (actorId && !headers['x-actor-id']) headers['x-actor-id'] = actorId;
    if (actorRole && !headers['x-actor-role']) headers['x-actor-role'] = actorRole;
  } catch {
    // non-browser env — skip
  }
  return authFetch(url, { ...options, headers });
}
