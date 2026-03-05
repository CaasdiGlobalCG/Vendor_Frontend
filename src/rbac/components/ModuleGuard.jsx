// ============================================================
// FILE: rbac/components/ModuleGuard.jsx
// PURPOSE: Route-level guard that redirects to /unauthorized when a
//          team member lacks ANY permission for a given module.
//          Org owners (no RBAC membership) bypass the check.
// CONNECTS TO: usePermission (canAccessModule), RBACContext (hasRBAC),
//              /unauthorized route (redirect target)
// ============================================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';

/**
 * ModuleGuard — wraps a route element and blocks access when
 * the user has RBAC membership but lacks permissions for the module.
 *
 * Rules:
 *   1. RBAC loading       → render children (avoid flash)
 *   2. No RBAC membership → render children (org owner / legacy user)
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

  // Org owner / legacy user without RBAC membership → allow everything
  if (!hasRBAC) return children;

  // Super Admin → always allow
  if (isSuperAdmin) return children;

  // Team member with RBAC — check module access
  if (canAccessModule(module)) return children;

  // No permission for this module → redirect
  return <Navigate to="/unauthorized" replace />;
}
