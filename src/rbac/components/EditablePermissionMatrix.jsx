// ============================================================
// FILE: rbac/components/EditablePermissionMatrix.jsx
// PURPOSE: Permission grid with toggle checkboxes for role CRUD.
//          Supports read-only mode (displays ✓/—) and editable mode
//          (checkboxes that toggle module:action permissions).
// CONNECTS TO: constants/modules.js (module labels, categories, actions),
//              RolesTab / CreateRoleModal / EditRoleModal (consumers)
// ============================================================

import React, { useMemo, useCallback } from 'react';
import { ACTION_LABELS, getModulesByCategory } from '../constants/modules';

/** Colour config for category header badges */
const CATEGORY_COLORS = {
  core:        { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  sales:       { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  procurement: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  logistics:   { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  system:      { bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200' },
};

/**
 * Build a quick-lookup Set from permissions array for O(1) checks.
 * @param {string[]} permissions - Array of 'module:action' strings
 * @returns {Set<string>}
 */
function buildPermSet(permissions) {
  return new Set(permissions || []);
}

/**
 * Check if a specific module:action is granted.
 * Handles wildcard (*:*) and module:manage expansions.
 *
 * @param {Set<string>} permSet - Permission lookup set
 * @param {string} moduleCode - e.g. 'orders'
 * @param {string} action - e.g. 'view'
 * @returns {boolean}
 */
function hasPermission(permSet, moduleCode, action) {
  if (permSet.has('*:*')) return true;
  if (permSet.has(`${moduleCode}:manage`)) return true;
  return permSet.has(`${moduleCode}:${action}`);
}

/**
 * Count how many individual actions are checked for a module.
 * Excludes 'manage' from the count.
 *
 * @param {Set<string>} permSet - Permission set
 * @param {string} moduleCode - Module code
 * @param {string[]} actions - Available action keys
 * @returns {number}
 */
function countModuleActions(permSet, moduleCode, actions) {
  if (permSet.has('*:*') || permSet.has(`${moduleCode}:manage`)) return actions.length;
  return actions.filter(a => a !== 'manage' && permSet.has(`${moduleCode}:${a}`)).length;
}

/**
 * EditablePermissionMatrix — grouped table of modules × actions.
 *
 * @param {Object} props
 * @param {string[]} props.permissions - Array of 'module:action' strings
 * @param {Function} [props.onChange] - Called with updated permissions array (editable mode only)
 * @param {Object} [props.moduleConfig] - Override default module registry
 * @param {boolean} [props.editable=false] - Enable checkbox editing
 * @param {boolean} [props.disabled=false] - Disable all checkboxes (saving state)
 * @param {boolean} [props.compact=false] - Compact padding for modals
 */
export function EditablePermissionMatrix({
  permissions = [],
  onChange,
  moduleConfig,
  editable = false,
  disabled = false,
  compact = false,
}) {
  const permSet = useMemo(() => buildPermSet(permissions), [permissions]);
  const actions = useMemo(() => Object.keys(ACTION_LABELS).filter(a => a !== 'manage'), []);
  const groups = useMemo(() => getModulesByCategory(moduleConfig), [moduleConfig]);

  /**
   * Toggle a single module:action permission.
   * WHY: Called on checkbox change; rebuilds the permissions array.
   */
  const togglePermission = useCallback((moduleCode, action) => {
    if (!onChange) return;
    const perm = `${moduleCode}:${action}`;
    const next = permissions.includes(perm)
      ? permissions.filter(p => p !== perm)
      : [...permissions, perm];
    onChange(next);
  }, [permissions, onChange]);

  /**
   * Toggle "Full Access" (manage) for a module.
   * WHY: When manage is toggled ON, we add module:manage and remove individual actions.
   *      When toggled OFF, we remove module:manage only — user can toggle actions back individually.
   */
  const toggleManage = useCallback((moduleCode) => {
    if (!onChange) return;
    const managePerm = `${moduleCode}:manage`;
    const hasManage = permissions.includes(managePerm);

    if (hasManage) {
      // Remove manage — keep no individual actions (clean slate)
      onChange(permissions.filter(p => p !== managePerm));
    } else {
      // Add manage and remove individual action perms for this module (manage covers them)
      const modulePerms = new Set(actions.map(a => `${moduleCode}:${a}`));
      const cleaned = permissions.filter(p => !modulePerms.has(p));
      onChange([...cleaned, managePerm]);
    }
  }, [permissions, onChange, actions]);

  /**
   * Toggle ALL permissions for a module row (select all / deselect all).
   * WHY: Convenience control — clicks the module label checkbox.
   */
  const toggleAllForModule = useCallback((moduleCode) => {
    if (!onChange) return;
    const moduleActions = actions.map(a => `${moduleCode}:${a}`);
    const managePerm = `${moduleCode}:manage`;
    const allChecked = permSet.has(managePerm) ||
      moduleActions.every(p => permSet.has(p));

    if (allChecked) {
      // Remove all permissions for this module
      const modulePermSet = new Set([...moduleActions, managePerm]);
      onChange(permissions.filter(p => !modulePermSet.has(p)));
    } else {
      // Add manage (which covers all)
      const modulePermSet = new Set(moduleActions);
      const cleaned = permissions.filter(p => !modulePermSet.has(p) && p !== managePerm);
      onChange([...cleaned, managePerm]);
    }
  }, [permissions, onChange, actions, permSet]);

  // Padding classes for compact vs regular
  const cellPx = compact ? 'px-2 py-1.5' : 'px-4 py-2.5';
  const headerPx = compact ? 'px-2 py-2' : 'px-3 py-3';

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        {/* ── Header Row ── */}
        <thead className="bg-gray-50">
          <tr>
            <th className={`${headerPx} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
              Module
            </th>
            {actions.map(action => (
              <th
                key={action}
                className={`${headerPx} text-center text-xs font-medium text-gray-500 uppercase tracking-wider`}
              >
                {ACTION_LABELS[action]}
              </th>
            ))}
            <th className={`${headerPx} text-center text-xs font-medium text-gray-500 uppercase tracking-wider`}>
              {ACTION_LABELS.manage}
            </th>
          </tr>
        </thead>

        {/* ── Body: Category groups → Module rows ── */}
        <tbody className="bg-white divide-y divide-gray-100">
          {groups.map(({ categoryKey, category, modules }) => (
            <React.Fragment key={categoryKey}>
              {/* ── Category Header ── */}
              <tr>
                <td colSpan={actions.length + 2} className={`${cellPx} pt-4 pb-1`}>
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
                const hasManage = permSet.has('*:*') || permSet.has(`${code}:manage`);
                const checkedCount = countModuleActions(permSet, code, actions);
                const allChecked = hasManage || checkedCount === actions.length;

                return (
                  <tr key={code} className="hover:bg-gray-50 transition-colors">
                    {/* Module name cell with optional select-all checkbox */}
                    <td className={`${cellPx} text-sm font-medium text-gray-900 pl-6`}>
                      <div className="flex items-center gap-2">
                        {editable && (
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={() => toggleAllForModule(code)}
                            disabled={disabled || permSet.has('*:*')}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            title="Select all / deselect all"
                          />
                        )}
                        <span>{config.label}</span>
                        {/* Show count badge in editable mode */}
                        {editable && checkedCount > 0 && !hasManage && (
                          <span className="text-[10px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-full font-medium">
                            {checkedCount}/{actions.length}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Individual action cells */}
                    {actions.map(action => {
                      const isChecked = hasPermission(permSet, code, action);
                      return (
                        <td key={action} className={`${cellPx} text-center`}>
                          {editable ? (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(code, action)}
                              disabled={disabled || hasManage || permSet.has('*:*')}
                              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500
                                         disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          ) : (
                            isChecked ? (
                              <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">
                                ✓
                              </span>
                            ) : (
                              <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-gray-100 text-gray-400 text-xs">
                                —
                              </span>
                            )
                          )}
                        </td>
                      );
                    })}

                    {/* Full Access (manage) cell */}
                    <td className={`${cellPx} text-center`}>
                      {editable ? (
                        <input
                          type="checkbox"
                          checked={hasManage}
                          onChange={() => toggleManage(code)}
                          disabled={disabled || permSet.has('*:*')}
                          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      ) : (
                        hasManage ? (
                          <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-gray-100 text-gray-400 text-xs">
                            —
                          </span>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* ── Legend (read-only mode) ── */}
      {!editable && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold">✓</span>
            <span>Access granted</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-gray-100 text-gray-400 text-[10px]">—</span>
            <span>No access</span>
          </div>
        </div>
      )}

      {/* ── Selection summary (editable mode) ── */}
      {editable && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          {permissions.length === 0 ? (
            <span className="text-amber-600">No permissions selected — role will have no access</span>
          ) : (
            <span>{permissions.length} permission{permissions.length !== 1 ? 's' : ''} selected</span>
          )}
        </div>
      )}
    </div>
  );
}
