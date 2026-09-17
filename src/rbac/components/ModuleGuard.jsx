// ============================================================
// FILE: rbac/components/ModuleGuard.jsx
// PURPOSE: Route-level guard that shows a permission-denied page when
//          a user lacks RBAC membership or module permissions.
//          The wrapped page component NEVER mounts (no data fetch).
// CONNECTS TO: usePermission (canAccessModule), RBACContext (hasRBAC),
//              PermissionDenied (inline denied page)
// ============================================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import { PermissionDenied } from './PermissionDenied';

/**
 * ModuleGuard — wraps a route element and blocks access when
 * the user lacks RBAC membership or lacks permissions for the module.
 *
 * Rules:
 *   1. RBAC loading       → render children (avoid flash)
 *   2. No RBAC membership → redirect to /unauthorized
 *   3. Super Admin → always allow
 *   4. Has RBAC + access  → render children
 *   5. Has RBAC + denied  → render PermissionDenied inline (NO data fetch)
 *
 * WHY inline instead of redirect for case 5: shows the user which module
 *      they were denied access to, in context. No route change, no page flash.
 *      Case 2 still redirects because no RBAC membership means the user
 *      shouldn't be on any protected route at all.
 *
 * @param {Object}  props
 * @param {string}  props.module   - RBAC module code (e.g. 'projects', 'leads')
 * @param {string}  [props.moduleName] - Human-readable name for the denied page
 * @param {React.ReactNode} props.children - Page component to render
 */
export function ModuleGuard({ module, moduleName, children }) {
  const { canAccessModule, isLoading, hasRBAC, isSuperAdmin } = usePermission();

  // While loading RBAC → show children (prevents content flash)
  if (isLoading) return children;

  // No RBAC membership
  if (!hasRBAC) return <Navigate to="/unauthorized" replace />;

  // Super Admin → always allow
  if (isSuperAdmin) return children;

  // Team member with RBAC — check module access
  if (canAccessModule(module)) return children;

  // No permission for this module → show PermissionDenied inline (children never mount, no data fetch)
  return <PermissionDenied module={module} moduleName={moduleName || module} />;
}
