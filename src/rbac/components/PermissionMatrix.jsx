// ============================================================
// FILE: rbac/components/PermissionMatrix.jsx
// PURPOSE: Visual grid showing the current user's permission map
//          across all modules, grouped by category (Core / Sales / System).
// CONNECTS TO: RBACContext (permission data),
//              constants/modules.js (module labels, categories, actions)
// ============================================================

import React from 'react';
import { useRBAC } from '../context/RBACContext';
import { ACTION_LABELS, getModulesByCategory } from '../constants/modules';

/** Colour config for category header badges */
const CATEGORY_COLORS = {
  core:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  sales:  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  system: { bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200' },
};

/**
 * PermissionMatrix — renders a grouped table grid of modules × actions.
 *
 * Accepts an optional `moduleConfig` prop to override the default module
 * registry (useful when reusing this component in Client Frontend).
 *
 * Super Admins with '*:*' see all checkmarks.
 * Users with 'module:manage' see all actions for that module.
 */
export function PermissionMatrix({ moduleConfig } = {}) {
  const { permissionMap, permissions } = useRBAC();

  const isSuperAdmin = permissions.includes('*:*');
  const actions = Object.keys(ACTION_LABELS);
  const groups = getModulesByCategory(moduleConfig);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Module
            </th>
            {actions.map(action => (
              <th
                key={action}
                className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {ACTION_LABELS[action]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {groups.map(({ categoryKey, category, modules }) => (
            <React.Fragment key={categoryKey}>
              {/* ── Category Header Row ── */}
              <tr>
                <td colSpan={actions.length + 1} className="px-4 pt-5 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border
                        ${CATEGORY_COLORS[categoryKey]?.bg || 'bg-gray-50'}
                        ${CATEGORY_COLORS[categoryKey]?.text || 'text-gray-600'}
                        ${CATEGORY_COLORS[categoryKey]?.border || 'border-gray-200'}`}
                    >
                      {category.label}
                    </span>
                    <span className="text-xs text-gray-400">{category.description}</span>
                  </div>
                </td>
              </tr>

              {/* ── Module Rows ── */}
              {modules.map(({ code, config }) => {
                const modulePerms = permissionMap[code] || [];
                const hasManage = isSuperAdmin || modulePerms.includes('manage');

                return (
                  <tr key={code} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 pl-8">
                      {config.label}
                    </td>
                    {actions.map(action => {
                      const hasAccess = isSuperAdmin || hasManage || modulePerms.includes(action);
                      return (
                        <td key={action} className="px-3 py-2.5 text-center">
                          {hasAccess ? (
                            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-gray-100 text-gray-400 text-xs">
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
