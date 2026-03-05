// ============================================================
// FILE: rbac/components/PermissionGate.jsx
// PURPOSE: Declarative component for conditional rendering based on
//          RBAC permissions. Hides UI elements the user can't access.
// CONNECTS TO: usePermission hook (permission checks),
//              RBACContext (RBAC state)
// ============================================================

import React from 'react';
import { usePermission } from '../hooks/usePermission';

/**
 * PermissionGate — renders children only if user has the required permission.
 *
 * Usage:
 *   <PermissionGate module="products" action="create">
 *     <button>Add Product</button>
 *   </PermissionGate>
 *
 *   // With fallback (shows alternative when denied)
 *   <PermissionGate module="orders" action="delete" fallback={<span>No access</span>}>
 *     <button>Delete Order</button>
 *   </PermissionGate>
 *
 *   // Multiple permissions (any)
 *   <PermissionGate anyOf={[['orders', 'edit'], ['orders', 'manage']]}>
 *     <EditOrderButton />
 *   </PermissionGate>
 *
 *   // Multiple permissions (all required)
 *   <PermissionGate allOf={[['orders', 'view'], ['billing', 'view']]}>
 *     <OrderBillingReport />
 *   </PermissionGate>
 *
 *   // Super admin only
 *   <PermissionGate superAdminOnly>
 *     <DangerousSettingsPanel />
 *   </PermissionGate>
 *
 * @param {Object} props
 * @param {string} [props.module] - Module code for single permission check
 * @param {string} [props.action] - Action verb for single permission check
 * @param {Array<[string, string]>} [props.anyOf] - Pass if ANY of these permissions exist
 * @param {Array<[string, string]>} [props.allOf] - Pass if ALL of these permissions exist
 * @param {boolean} [props.superAdminOnly] - Only show for Super Admins
 * @param {React.ReactNode} [props.fallback] - What to render when denied (default: null)
 * @param {React.ReactNode} props.children - Content to show when permitted
 */
export function PermissionGate({
  module,
  action,
  anyOf,
  allOf,
  superAdminOnly = false,
  fallback = null,
  children,
}) {
  const { can, canAny, canAll, isSuperAdmin, isLoading, hasRBAC } = usePermission();

  // Org owner / legacy user without RBAC membership → always show (they are Super Admin).
  // Team members (hasRBAC=true) → check permissions below.
  if (isLoading || !hasRBAC) return children;

  // Super admin only gate
  if (superAdminOnly) {
    return isSuperAdmin ? children : fallback;
  }

  // Multiple permissions — any match
  if (anyOf) {
    return canAny(anyOf) ? children : fallback;
  }

  // Multiple permissions — all required
  if (allOf) {
    return canAll(allOf) ? children : fallback;
  }

  // Single module:action check
  if (module && action) {
    return can(module, action) ? children : fallback;
  }

  // No permission props specified — always render (developer convenience)
  return children;
}

/**
 * PermissionText — shows text only if user has permission.
 * Useful for inline labels, badges, tooltips.
 *
 * @param {Object} props - Same as PermissionGate
 * @param {string} props.text - Text to display
 */
export function PermissionText({ text, ...gateProps }) {
  return (
    <PermissionGate {...gateProps}>
      <span>{text}</span>
    </PermissionGate>
  );
}
