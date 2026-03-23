// ============================================================
// FILE: rbac/api/rbacApi.js
// PURPOSE: API service layer for all RBAC backend calls.
//          Uses cookie auth (credentials: 'include') + Bearer fallback.
// CONNECTS TO: GET /api/rbac/me (Phase 1),
//              Phase 2 endpoints: /members, /roles, /invitations
// ============================================================

import config from '../../config/env';
import authFetch from '../../utils/authFetch';

/** @constant {string} Base URL for all RBAC API calls */
const BASE_URL = `${config.VENDOR_BACKEND_URL}/api/rbac`;

/**
 * Build standard headers with optional Bearer token fallback.
 * Matches VendorContext's dual-auth pattern.
 * @returns {Object} Headers object
 */
function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('authToken');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Generic fetch wrapper for RBAC endpoints.
 * Handles cookie auth, error parsing, and consistent error format.
 *
 * @param {string} path — Relative path after /api/rbac (e.g., '/me')
 * @param {Object} [options] — Additional fetch options (method, body, etc.)
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} With backend error message
 */
async function rbacFetch(path, options = {}) {
  const res = await authFetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: getHeaders(),
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `RBAC API error: ${res.status}`);
  }

  return res.json();
}

// ──────────────────────────────────────
// Phase 1 — Available NOW
// ──────────────────────────────────────

/**
 * Fetch current user's RBAC context (role, permissions, modules).
 * @returns {Promise<Object>} { role, permissions, permissionMap, accessibleModules, allModules, roleLevels, _fallback }
 */
export async function fetchMyRBAC() {
  return rbacFetch('/me');
}

// ──────────────────────────────────────
// Phase 2 — Member Management (stubs)
// Backend endpoints will be built in Phase 2.
// These functions are structurally ready and will
// work once the backend routes are implemented.
// ──────────────────────────────────────

/**
 * List all members in the current org.
 * @param {Object} [params] — Query params (limit, lastKey, search)
 * @returns {Promise<Object>} { members, lastKey, hasMore }
 */
export async function listMembers(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return rbacFetch(`/members${qs ? `?${qs}` : ''}`);
}

/**
 * Invite a new member to the org.
 * @param {Object} data — { email, roleId, message?, permissionOverrides? }
 * @returns {Promise<Object>} { invitation }
 */
export async function inviteMember(data) {
  return rbacFetch('/members/invite', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Change a member's role.
 * @param {string} memberId — Target user's ID
 * @param {string} roleId — New role ID
 * @returns {Promise<Object>} { member }
 */
export async function changeMemberRole(memberId, roleId) {
  return rbacFetch(`/members/${memberId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ roleId }),
  });
}

/**
 * Remove a member from the org.
 * @param {string} memberId — Target user's ID
 * @param {string} reason — Reason for removal (required)
 * @returns {Promise<Object>} { success }
 */
export async function removeMember(memberId, reason) {
  return rbacFetch(`/members/${memberId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

/**
 * Suspend a member from the org.
 * @param {string} memberId
 * @param {{ reason: string, suspendedUntil?: string|null }} payload
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function suspendMember(memberId, payload) {
  return rbacFetch(`/members/${encodeURIComponent(memberId)}/suspend`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Unsuspend a member and restore active status.
 * @param {string} memberId
 * @param {string} [reason]
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function unsuspendMember(memberId, reason) {
  return rbacFetch(`/members/${encodeURIComponent(memberId)}/unsuspend`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

/**
 * List all available roles for the org.
 * @returns {Promise<Object>} { roles, meta }
 */
export async function listRoles() {
  return rbacFetch('/roles');
}

// ──────────────────────────────────────
// Phase 2.5 — Role CRUD
// ──────────────────────────────────────

/**
 * Get single role details including permissions and member count.
 * @param {string} roleId — Target role ID
 * @returns {Promise<Object>} { role, memberCount }
 */
export async function getRoleDetails(roleId) {
  return rbacFetch(`/roles/${encodeURIComponent(roleId)}`);
}

/**
 * Create a new custom role in the org.
 * @param {Object} data — { roleName, level, permissions, description?, copyFrom? }
 * @returns {Promise<Object>} { role, message }
 */
export async function createRole(data) {
  return rbacFetch('/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing role (permissions, description; name only for custom roles).
 * @param {string} roleId — Target role ID
 * @param {Object} data — { roleName?, permissions?, description? }
 * @returns {Promise<Object>} { role, message }
 */
export async function updateRole(roleId, data) {
  return rbacFetch(`/roles/${encodeURIComponent(roleId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a custom role (system roles cannot be deleted).
 * @param {string} roleId — Target role ID
 * @returns {Promise<Object>} { success, message }
 */
export async function deleteRole(roleId) {
  return rbacFetch(`/roles/${encodeURIComponent(roleId)}`, {
    method: 'DELETE',
  });
}

/**
 * List pending invitations.
 * @param {Object} [params] — Query params (status, limit)
 * @returns {Promise<Object>} { invitations }
 */
export async function listInvitations(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return rbacFetch(`/invitations${qs ? `?${qs}` : ''}`);
}

/**
 * Cancel a pending invitation.
 * @param {string} inviteId — The invitation to cancel
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function cancelInvitation(inviteId) {
  return rbacFetch(`/invitations/${encodeURIComponent(inviteId)}`, {
    method: 'DELETE',
  });
}

// ──────────────────────────────────────
// Activity / Audit Logs
// ──────────────────────────────────────

/**
 * Fetch audit / activity logs.
 * @param {{ userId?: string, action?: string, limit?: number, lastKey?: string }} params
 * @returns {Promise<{ logs: Array, total: number, lastKey?: string, hasMore: boolean }>}
 */
export async function getAuditLogs(params = {}) {
  const qs = new URLSearchParams();
  if (params.userId) qs.set('userId', params.userId);
  if (params.action) qs.set('action', params.action);
  if (params.limit)  qs.set('limit', String(params.limit));
  if (params.lastKey) qs.set('lastKey', params.lastKey);
  const query = qs.toString();
  return rbacFetch(`/audit-logs${query ? `?${query}` : ''}`);
}
