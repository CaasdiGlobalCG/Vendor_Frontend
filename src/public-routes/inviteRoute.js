// ============================================================
// FILE: public-routes/inviteRoute.js
// PURPOSE: Centralized route matcher for public invite acceptance flow.
// CONNECTS TO: App.jsx, context/VendorContext.jsx
// ============================================================

/**
 * Returns true when the current location represents the public invite page.
 * Supports prefixed paths and hash routers.
 *
 * @param {{ pathname?: string, hash?: string }} locationLike
 * @returns {boolean}
 */
export function isInviteAcceptRoute(locationLike = {}) {
  const pathname = String(locationLike.pathname || '').toLowerCase().replace(/\/+$/, '');
  const hash = String(locationLike.hash || '').toLowerCase();

  return pathname.includes('/invite/accept') || hash.includes('/invite/accept');
}
