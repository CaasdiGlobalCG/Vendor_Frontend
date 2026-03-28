// ============================================================
// FILE: rbac/components/ModuleGuard.jsx
// PURPOSE: Route-level guard that redirects to /unauthorized when a
//          user lacks RBAC membership or module permissions.
// CONNECTS TO: usePermission (canAccessModule), RBACContext (hasRBAC),
//              /unauthorized route (redirect target)
// ============================================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';

/**
 * ModuleGuard — wraps a route element and blocks access when
 * the user lacks RBAC membership or lacks permissions for the module.
 *
 * Rules:
 *   1. RBAC loading       → render children (avoid flash)
 *   2. No RBAC membership → redirect to /unauthorized
 *   3. Has RBAC + access  → render children
 *   4. Has RBAC + denied  → redirect to /unauthorized
 *
 * Usage in App.jsx:
 *   <Route path="projects" element={
 *     <ModuleGuard module="projects"><ProjectsPage /></ModuleGuard>
 *   } />
 *
 * @param {Object}  props
 * @param {string}  props.module   - RBAC module code (e.g. 'projects', 'leads')
 * @param {React.ReactNode} props.children - Page component to render
 */
export function ModuleGuard({ module, children }) {
  const { canAccessModule, isLoading, hasRBAC, isSuperAdmin } = usePermission();

  // While loading RBAC → show children (prevents content flash)
  if (isLoading) return children;

  // No RBAC membership
  if (!hasRBAC) return <Navigate to="/unauthorized" replace />;

  // Super Admin → always allow
  if (isSuperAdmin) return children;

  // Team member with RBAC — check module access
  if (canAccessModule(module)) return children;

  // No permission for this module → redirect
  return <Navigate to="/unauthorized" replace />;
}
