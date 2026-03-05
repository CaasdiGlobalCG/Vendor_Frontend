// ============================================================
// FILE: utils/authFetch.js
// PURPOSE: Fetch wrapper with automatic 401 retry via Cognito token refresh.
//          When any API call returns 401, silently refreshes the Cognito session
//          (using the refresh token), re-establishes the httpOnly cookie session,
//          and retries the original request — user never sees a login redirect.
// CONNECTS TO: aws-amplify Auth (Cognito refresh), config/env.js (backend URL),
//              VendorContext.jsx, RBACContext.jsx, rbacApi.js
// ============================================================

import { Auth } from 'aws-amplify';
import config from '../config/env';

/** Max retries per request to avoid infinite loops */
const MAX_RETRIES = 1;

/** Track whether a refresh is already in progress (dedup concurrent calls) */
let refreshPromise = null;

/**
 * Attempt to refresh the Cognito session and re-establish the backend cookie.
 * Uses a singleton promise so concurrent 401s only trigger one refresh.
 * @returns {Promise<boolean>} true if refresh succeeded, false otherwise
 */
async function refreshSession() {
  // Dedup: if a refresh is already running, piggyback on it
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      // Auth.currentSession() automatically uses the Cognito refresh token
      // if the ID token is expired. This is built into Amplify v5.
      const session = await Auth.currentSession();
      const freshIdToken = session.getIdToken().getJwtToken();

      if (!freshIdToken) {
        console.warn('[authFetch] Cognito refresh returned no ID token');
        return false;
      }

      // Re-establish the httpOnly cookie session with the fresh token
      const sessionRes = await fetch(`${config.VENDOR_BACKEND_URL}/api/auth/session`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${freshIdToken}` },
      });

      if (!sessionRes.ok) {
        console.warn('[authFetch] Failed to re-establish cookie session:', sessionRes.status);
        return false;
      }

      return true;
    } catch (err) {
      // If the refresh token itself is expired, Amplify throws "No current user"
      console.warn('[authFetch] Token refresh failed:', err?.message || err);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Drop-in replacement for window.fetch() with automatic 401 retry.
 * On 401: refreshes Cognito session → re-establishes cookie → retries request.
 *
 * @param {string|Request} url - Fetch URL or Request object
 * @param {RequestInit} [options={}] - Standard fetch options
 * @returns {Promise<Response>} The fetch Response
 *
 * @example
 * const res = await authFetch('/api/rbac/me', { credentials: 'include' });
 * const data = await res.json();
 */
export default async function authFetch(url, options = {}) {
  // Always include credentials for cookie-based auth
  const fetchOptions = { credentials: 'include', ...options };

  let response = await fetch(url, fetchOptions);

  // If 401 and we haven't retried yet, try to refresh
  if (response.status === 401) {
    const refreshed = await refreshSession();

    if (refreshed) {
      // Retry the original request — the new cookie session is now active
      response = await fetch(url, fetchOptions);
    }
  }

  return response;
}

/**
 * Convenience: authFetch that also parses JSON and throws on non-2xx.
 * @param {string} url - Fetch URL
 * @param {RequestInit} [options={}] - Standard fetch options
 * @returns {Promise<Object>} Parsed JSON body
 * @throws {Error} With backend error message on non-2xx
 */
export async function authFetchJSON(url, options = {}) {
  const res = await authFetch(url, options);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}
