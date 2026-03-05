// ============================================================
// FILE: rbac/context/RBACContext.jsx
// PURPOSE: Provides RBAC context (role, permissions, module access)
//          to the entire Vendor Frontend. Fetches from GET /api/rbac/me
//          after VendorContext finishes hydrating the current user.
// CONNECTS TO: VendorContext (needs currentUser to be hydrated first),
//              GET /api/rbac/me (Vendor Backend RBAC endpoint),
//              usePermission hook, PermissionGate component (consumers)
// ============================================================

import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { VendorContext } from '../../context/VendorContext';
import config from '../../config/env';
import authFetch from '../../utils/authFetch';

export const RBACContext = createContext(null);

// ──────────────────────────────────────
// PROVIDER
// ──────────────────────────────────────

/**
 * RBACProvider — wraps the app (inside VendorProvider) to supply RBAC state.
 *
 * State shape exposed via context:
 *   role       — { roleId, roleName, roleLevel, isSuperAdmin }
 *   permissions — string[] (e.g. ['*:*'] or ['products:view', 'orders:manage'])
 *   permissionMap — { module: [actions] } for UI grid rendering
 *   accessibleModules — string[] of module codes the user can access
 *   allModules — string[] of every module code in the registry
 *   isLoading  — true while the /me call is in-flight
 *   isFallback — true if backend returned Phase 1 permissive fallback
 *   hasRBAC    — false if user has no RBAC membership at all
 *   error      — error message string or null
 *   refresh()  — manually re-fetch RBAC context
 */
export const RBACProvider = ({ children }) => {
  const { currentUser, isHydratingUser } = useContext(VendorContext);

  const [rbacState, setRbacState] = useState({
    role: null,
    permissions: [],
    permissionMap: {},
    accessibleModules: [],
    allModules: [],
    roleLevels: {},
    platformAccess: [],
    isLoading: true,
    isFallback: false,
    hasRBAC: false,
    error: null,
  });

  /**
   * Fetch RBAC context from the backend.
   * Uses cookie auth (credentials: 'include') + optional Bearer token fallback
   * to match VendorContext's dual-auth pattern.
   */
  const fetchRBAC = useCallback(async () => {
    try {
      setRbacState(prev => ({ ...prev, isLoading: true, error: null }));

      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('authToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Pass vendorId from VendorContext as a hint so the backend can skip
      // the duplicate EmailIndex lookup (VendorContext already resolved it).
      const vendorId = currentUser?.vendorId;
      const url = vendorId
        ? `${config.VENDOR_BACKEND_URL}/api/rbac/me?vendorId=${encodeURIComponent(vendorId)}`
        : `${config.VENDOR_BACKEND_URL}/api/rbac/me`;

      const res = await authFetch(url, {
        credentials: 'include',
        headers,
      });

      if (!res.ok) {
        // Non-200 — user may not have RBAC yet (Phase 1 is fine with this)
        console.warn('[RBAC] /api/rbac/me returned', res.status);
        setRbacState(prev => ({
          ...prev,
          isLoading: false,
          hasRBAC: false,
          // Phase 1 fallback: treat as Super Admin so UI stays fully accessible
          role: { roleId: 'super_admin', roleName: 'Super Admin', roleLevel: 0, isSuperAdmin: true },
          permissions: ['*:*'],
          permissionMap: { '*': ['*'] },
          accessibleModules: ['*'],
          platformAccess: ['vendor', 'client', 'sales'],
          isFallback: true,
        }));
        return;
      }

      const data = await res.json();

      // Backend may return 200 with hasRBAC: false when org can't be resolved.
      // In that case, apply Phase 1 Super Admin fallback so UI stays accessible.
      if (data.hasRBAC === false) {
        console.warn('[RBAC] Backend returned hasRBAC:false — applying Phase 1 fallback');
        setRbacState(prev => ({
          ...prev,
          isLoading: false,
          hasRBAC: false,
          role: { roleId: 'super_admin', roleName: 'Super Admin', roleLevel: 0, isSuperAdmin: true },
          permissions: ['*:*'],
          permissionMap: { '*': ['*'] },
          accessibleModules: ['*'],
          platformAccess: ['vendor', 'client', 'sales'],
          isFallback: true,
        }));
        return;
      }

      setRbacState({
        role: data.role || null,
        permissions: data.permissions || [],
        permissionMap: data.permissionMap || {},
        accessibleModules: data.accessibleModules || [],
        allModules: data.allModules || [],
        roleLevels: data.roleLevels || {},
        platformAccess: data.platformAccess || ['vendor'],
        isLoading: false,
        isFallback: data._fallback || false,
        hasRBAC: data.hasRBAC ?? true,
        error: null,
      });
    } catch (err) {
      console.error('[RBAC] Failed to fetch /api/rbac/me:', err);
      // Phase 1 fallback: don't break the app
      setRbacState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message,
        hasRBAC: false,
        role: { roleId: 'super_admin', roleName: 'Super Admin', roleLevel: 0, isSuperAdmin: true },
        permissions: ['*:*'],
        permissionMap: { '*': ['*'] },
        accessibleModules: ['*'],
        platformAccess: ['vendor', 'client', 'sales'],
        isFallback: true,
      }));
    }
  }, [currentUser?.vendorId]);

  // Fetch RBAC once VendorContext has finished hydrating and we have a user
  useEffect(() => {
    if (isHydratingUser) return;

    if (!currentUser) {
      // No user → clear RBAC state
      setRbacState({
        role: null,
        permissions: [],
        permissionMap: {},
        accessibleModules: [],
        allModules: [],
        roleLevels: {},
        platformAccess: [],
        isLoading: false,
        isFallback: false,
        hasRBAC: false,
        error: null,
      });
      return;
    }

    fetchRBAC();
  }, [currentUser, isHydratingUser, fetchRBAC]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    ...rbacState,
    refresh: fetchRBAC,
  }), [rbacState, fetchRBAC]);

  return (
    <RBACContext.Provider value={contextValue}>
      {children}
    </RBACContext.Provider>
  );
};

// ──────────────────────────────────────
// HOOK — useRBAC
// ──────────────────────────────────────

/**
 * Access the full RBAC context.
 * @returns {Object} RBAC state + refresh()
 */
export const useRBAC = () => {
  const ctx = useContext(RBACContext);
  if (!ctx) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return ctx;
};
