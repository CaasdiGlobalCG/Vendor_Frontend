// ============================================================
// FILE: utils/postLoginPlatformResolver.js
// PURPOSE: Centralized post-login platform routing decision logic.
// CONNECTS TO: components/Login.jsx handoff routing flow
// ============================================================

const VALID_PLATFORMS = new Set(['vendor', 'client', 'sales']);

function normalizePlatform(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_PLATFORMS.has(normalized) ? normalized : null;
}

/**
 * Decides which platform should handle post-login navigation.
 *
 * Rules:
 * 1) Explicit vendor intent always stays in vendor app.
 * 2) Single-platform users always route to that single platform.
 * 3) Multi-platform users honor lastSelectedRole first.
 * 4) If lastSelectedRole is missing/invalid, fallback to role/orgType when valid.
 * 5) Final default is vendor.
 *
 * @param {Object} input
 * @param {boolean} input.explicitVendor
 * @param {string|null|undefined} input.lastSelectedRole
 * @param {string|null|undefined} input.role
 * @param {string|null|undefined} input.orgType
 * @param {string[]|null|undefined} input.platformAccess
 * @returns {{ platform: 'vendor'|'client'|'sales', reason: string }}
 */
export function resolvePostLoginPlatform(input = {}) {
  const explicitVendor = input.explicitVendor === true;
  const lastSelectedRole = normalizePlatform(input.lastSelectedRole);
  const role = normalizePlatform(input.role);
  const orgType = normalizePlatform(input.orgType);
  const platformAccess = Array.isArray(input.platformAccess)
    ? [...new Set(input.platformAccess.map(normalizePlatform).filter(Boolean))]
    : [];

  if (explicitVendor) {
    return { platform: 'vendor', reason: 'explicit-vendor-intent' };
  }

  // User preference/session continuity: honor lastSelectedRole first.
  // This is the primary selector requested for cross-app login continuity.
  if (lastSelectedRole) {
    return { platform: lastSelectedRole, reason: 'last-selected-role-priority' };
  }

  if (platformAccess.length === 1) {
    return { platform: platformAccess[0], reason: 'single-platform-access' };
  }

  if (platformAccess.length > 1) {
    if (role && platformAccess.includes(role)) {
      return { platform: role, reason: 'verify-role-fallback' };
    }
    if (orgType && platformAccess.includes(orgType)) {
      return { platform: orgType, reason: 'verify-orgtype-fallback' };
    }
    if (platformAccess.includes('vendor')) {
      return { platform: 'vendor', reason: 'multi-platform-default-vendor' };
    }
    return { platform: platformAccess[0], reason: 'multi-platform-first-available' };
  }

  if (role) {
    return { platform: role, reason: 'verify-role-no-platform-list' };
  }
  if (orgType) {
    return { platform: orgType, reason: 'verify-orgtype-no-platform-list' };
  }

  return { platform: 'vendor', reason: 'default-vendor' };
}

/**
 * Persists the user's selected platform in backend users.lastSelectedRole.
 * Non-blocking helper intended for post-login/session stickiness.
 *
 * @param {'vendor'|'client'|'sales'} platform
 * @param {string} [token]
 * @returns {Promise<boolean>}
 */
export async function persistLastSelectedPlatform(platform, token) {
  const normalized = normalizePlatform(platform);
  if (!normalized) return false;

  try {
    const response = await fetch('/api/auth/set-role', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ role: normalized }),
    });
    return response.ok;
  } catch (error) {
    console.warn('[postLoginPlatformResolver] persistLastSelectedPlatform failed:', error?.message);
    return false;
  }
}
