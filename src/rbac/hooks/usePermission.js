// ============================================================
// FILE: rbac/hooks/usePermission.js
// PURPOSE: Lightweight hook for checking permissions in components.
//          Wraps RBAC context with convenience methods.
// CONNECTS TO: RBACContext (reads permission state)
// ============================================================

import { useCallback } from 'react';
import { useRBAC } from '../context/RBACContext';

/**
 * Hook for permission checking in components.
 *
 * Usage:
 *   const { can, canAny, canAll, isSuperAdmin, role } = usePermission();
 *
 *   if (can('products', 'create')) { ... }
 *   if (canAny([['orders', 'view'], ['orders', 'edit']])) { ... }
 *
 * @returns {Object} Permission check methods
 */
export function usePermission() {
  const { permissions, role, isLoading, isFallback, hasRBAC } = useRBAC();

  // Build a Set once for O(1) lookups (memoized via the dependency)
  const permissionSet = new Set(permissions);

  /**
   * Check if user has a specific module:action permission.
   * Handles wildcards: '*:*' (super admin) and 'module:manage' (full module access).
   *
   * @param {string} module - Module code (e.g., 'products', 'orders')
   * @param {string} action - Action verb (e.g., 'view', 'create', 'edit', 'delete')
   * @returns {boolean}
   */
  const can = useCallback((module, action) => {
    if (permissionSet.has('*:*')) return true;
    if (permissionSet.has(`${module}:manage`)) return true;
    return permissionSet.has(`${module}:${action}`);
  }, [permissions]);

  /**
   * Check if user has ANY of the listed permissions.
   * @param {Array<[string, string]>} checks - Array of [module, action] tuples
   * @returns {boolean}
   */
  const canAny = useCallback((checks) => {
    return checks.some(([mod, act]) => can(mod, act));
  }, [can]);

  /**
   * Check if user has ALL of the listed permissions.
   * @param {Array<[string, string]>} checks - Array of [module, action] tuples
   * @returns {boolean}
   */
  const canAll = useCallback((checks) => {
    return checks.every(([mod, act]) => can(mod, act));
  }, [can]);

  /**
   * Check if user can access a module at all (any action).
   * @param {string} module - Module code
   * @returns {boolean}
   */
  const canAccessModule = useCallback((module) => {
    if (permissionSet.has('*:*')) return true;
    for (const perm of permissionSet) {
      if (perm.startsWith(`${module}:`)) return true;
    }
    return false;
  }, [permissions]);

  return {
    can,
    canAny,
    canAll,
    canAccessModule,
    isSuperAdmin: role?.isSuperAdmin ?? false,
    role,
    isLoading,
    isFallback,
    hasRBAC,
    permissions,
  };
}
