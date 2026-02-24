// ============================================================
// FILE: rbac/components/RoleBadge.jsx
// PURPOSE: Visual badge component that displays a user's role
//          with color-coded styling. Used in TeamPage, MemberList.
// CONNECTS TO: VENDOR_DEFAULT_ROLES (role IDs from backend config)
// ============================================================

import React from 'react';

/**
 * Color mapping for each role ID.
 * Matches the 5 system roles defined in backend roles.js.
 */
const ROLE_COLORS = {
  super_admin: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  admin:       { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200' },
  sales_admin: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  manager:     { bg: 'bg-teal-100',   text: 'text-teal-800',   border: 'border-teal-200' },
  member:      { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-200' },
  viewer:      { bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-200' },
};

/**
 * RoleBadge — displays a color-coded role pill.
 *
 * @param {Object} props
 * @param {string} props.roleId - Role identifier (e.g., 'super_admin', 'admin')
 * @param {string} [props.roleName] - Display name (falls back to roleId)
 * @param {'sm'|'md'} [props.size='md'] - Badge size variant
 */
export function RoleBadge({ roleId, roleName, size = 'md' }) {
  const colors = ROLE_COLORS[roleId] || ROLE_COLORS.member;
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium
        ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses}`}
    >
      {roleName || roleId}
    </span>
  );
}
