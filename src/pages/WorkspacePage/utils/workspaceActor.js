/**
 * FILE: utils/workspaceActor.js
 * PURPOSE: Resolves WHO is creating/managing documents in the shared
 *          workspace document tool. The tool is per-role: vendor, PM, CAS,
 *          finance and client each see/manage only THEIR OWN quotations,
 *          invoices, items, customers, subscriptions, credit notes and POs.
 *
 *          The backend scopes documents by the `vendorId` field, which
 *          doubles as the owner/partition key — a PM-created quote is stored
 *          under vendorId=<pmId>, a finance doc under vendorId=<FIN-id>, etc.
 *          Fetch endpoints accept `ownerId` (or `vendorId` for vendors).
 *
 * CONNECTS TO: invoice tool pages (QuotesPage, InvoicesPage, ...) and the
 *              Elements panel fetch in WorkspacePage.
 */

/**
 * @param {object|null} currentUser - VendorContext user (ambient session)
 * @returns {{ ownerId: string, role: string }}
 *   ownerId — the id whose documents this actor owns/manages
 *   role    — resolved workspace role ('vendor'|'pm'|'cas'|'finance'|'client')
 */
export const resolveWorkspaceActor = (currentUser) => {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('userRole');
    const urlUserId =
      params.get('userId') ||
      params.get('pmId') ||
      params.get('clientId') ||
      '';

    // FIN- prefixed ids are finance employees regardless of the link's role tag
    if (urlRole === 'finance' || urlUserId.startsWith('FIN-')) {
      return { ownerId: urlUserId, role: 'finance' };
    }
    if (urlRole && urlUserId && ['pm', 'cas', 'client'].includes(urlRole)) {
      return { ownerId: urlUserId, role: urlRole };
    }
    // Links that carry a bare pmId/clientId (no userRole tag) still mean that role
    if (!urlRole && params.get('pmId')) {
      return { ownerId: urlUserId, role: 'pm' };
    }
    if (!urlRole && params.get('clientId')) {
      return { ownerId: urlUserId, role: 'client' };
    }
    if (urlRole === 'vendor' && urlUserId) {
      return { ownerId: urlUserId, role: 'vendor' };
    }
  } catch (_) {
    /* non-browser environment — fall through to context user */
  }

  const ownerId =
    currentUser?.vendorId ||
    currentUser?.pmId ||
    currentUser?.id ||
    currentUser?.userId ||
    '';
  return { ownerId, role: currentUser?.role || 'vendor' };
};

/** Convenience helper — appends ownerId to an existing query string. */
export const withOwnerScope = (queryString, ownerId) =>
  ownerId ? `${queryString}&ownerId=${ownerId}` : queryString;

export default resolveWorkspaceActor;
