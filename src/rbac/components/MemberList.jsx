// ============================================================
// FILE: rbac/components/MemberList.jsx
// PURPOSE: Table component for displaying team members with roles.
//          Phase 2 ready — connects to listMembers API.
// CONNECTS TO: rbacApi.listMembers (Phase 2),
//              RoleBadge (role display)
// ============================================================

import React from 'react';
import { RoleBadge } from './RoleBadge';

/**
 * MemberList — renders org team members in a table.
 *
 * Phase 1: Receives members array (currently shows only current user).
 * Phase 2: Will receive full member list from backend API.
 *
 * @param {Object} props
 * @param {Array} props.members - Array of member objects
 * @param {boolean} [props.isLoading] - Show loading spinner
 * @param {Function} [props.onRoleChange] - Callback when role change is clicked
 * @param {Function} [props.onRemove] - Callback when remove is clicked
 */
export function MemberList({ members = [], isLoading = false, onRoleChange, onRemove }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-line" />
        <span className="ml-3 text-sm text-dim">Loading team members...</span>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-12 h-12 mx-auto mb-3 text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p className="text-sm text-dim">No team members found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-line">
        <thead className="bg-canvas">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-dim uppercase tracking-wider">
              Member
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-dim uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-dim uppercase tracking-wider">
              Joined
            </th>
            {(onRoleChange || onRemove) && (
              <th className="px-6 py-3 text-right text-xs font-medium text-dim uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-surface divide-y divide-line">
          {members.map(member => (
            <tr key={member.userId || member.email} className="hover:bg-canvas transition-colors">
              <td className="px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {member.name || member.email}
                  </p>
                  {member.name && (
                    <p className="text-xs text-dim">{member.email}</p>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <RoleBadge roleId={member.roleId} roleName={member.roleName} size="sm" />
              </td>
              <td className="px-6 py-4 text-sm text-dim">
                {member.joinedAt
                  ? new Date(member.joinedAt).toLocaleDateString()
                  : '—'}
              </td>
              {(onRoleChange || onRemove) && (
                <td className="px-6 py-4 text-right space-x-3">
                  {onRoleChange && (
                    <button
                      onClick={() => onRoleChange(member)}
                      className="text-sm text-ink hover:text-ink font-medium"
                    >
                      Change Role
                    </button>
                  )}
                  {onRemove && !member.isSuperAdmin && (
                    <button
                      onClick={() => onRemove(member)}
                      className="text-sm text-danger hover:text-danger font-medium"
                    >
                      Remove
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
