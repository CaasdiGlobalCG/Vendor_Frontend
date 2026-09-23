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
  core:        { bg: 'bg-info/10',   text: 'text-info',   border: 'border-info/20' },
  sales:       { bg: 'bg-surface-hover', text: 'text-ink', border: 'border-line' },
  procurement: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/20' },
  logistics:   { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  system:      { bg: 'bg-canvas',   text: 'text-dim',   border: 'border-line' },
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
   * Toggle ALL permissions for every module in a category.
   * WHY: Category-level "Select all" convenience control.
   * @param {{ code: string }[]} modules - Modules within the category
   */
  const toggleAllForCategory = useCallback((modules) => {
    if (!onChange) return;
    // Build full list of individual action perms + manage perms for every module in category
    const allPerms = [];
    const allPermSet = new Set();
    modules.forEach(({ code }) => {
      actions.forEach(a => {
        const p = `${code}:${a}`;
        allPerms.push(p);
        allPermSet.add(p);
      });
      allPermSet.add(`${code}:manage`);
    });

    // Check if every module in the category is fully checked
    const allSelected = modules.every(({ code }) => {
      if (permSet.has(`${code}:manage`)) return true;
      return actions.every(a => permSet.has(`${code}:${a}`));
    });

    if (allSelected) {
      // Deselect everything in this category
      onChange(permissions.filter(p => !allPermSet.has(p)));
    } else {
      // Set manage for every module (Full Access) — cleaner than individual actions
      const managePerms = modules.map(({ code }) => `${code}:manage`);
      const cleaned = permissions.filter(p => !allPermSet.has(p));
      onChange([...cleaned, ...managePerms]);
    }
  }, [permissions, onChange, actions, permSet]);

  // Padding classes for compact vs regular
  const cellPx = compact ? 'px-2 py-1.5' : 'px-4 py-2.5';
  const headerPx = compact ? 'px-2 py-2' : 'px-3 py-3';

  return (
    <div className="overflow-x-auto bg-surface">
      <div className="border-b border-line bg-canvas px-4 py-2 text-[11px] text-dim">
        {editable
          ? 'Tip: use category select-all for fast setup, then fine-tune module permissions as needed.'
          : 'This matrix reflects your current effective permissions and module access.'}
      </div>
      <table className="min-w-full divide-y divide-line">
        {/* ── Header Row ── */}
        <thead className="bg-canvas sticky top-0 z-10">
          <tr>
            <th className={`${headerPx} text-left text-xs font-medium text-dim uppercase tracking-wider`}>
              Module
            </th>
            {actions.map(action => (
              <th
                key={action}
                className={`${headerPx} text-center text-xs font-medium text-dim uppercase tracking-wider`}
              >
                {ACTION_LABELS[action]}
              </th>
            ))}
            <th className={`${headerPx} text-center text-xs font-medium text-dim uppercase tracking-wider`}>
              {ACTION_LABELS.manage}
            </th>
          </tr>
        </thead>

        {/* ── Body: Category groups → Module rows ── */}
        <tbody className="bg-surface divide-y divide-line">
          {groups.map(({ categoryKey, category, modules }) => {
            // Check if every module in this category is fully checked
            const isCategoryAllChecked = !permSet.has('*:*') && modules.every(({ code }) => {
              if (permSet.has(`${code}:manage`)) return true;
              return actions.every(a => permSet.has(`${code}:${a}`));
            });
            // For *:* super admin, show as checked but disabled
            const isCategoryChecked = permSet.has('*:*') || isCategoryAllChecked;

            return (
            <React.Fragment key={categoryKey}>
              {/* ── Category Header ── */}
              <tr>
                <td colSpan={actions.length + 1} className={`${cellPx} pt-4 pb-1`}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border
                        ${CATEGORY_COLORS[categoryKey]?.bg || 'bg-canvas'}
                        ${CATEGORY_COLORS[categoryKey]?.text || 'text-dim'}
                        ${CATEGORY_COLORS[categoryKey]?.border || 'border-line'}`}
                    >
                      {category.label}
                    </span>
                    <span className="text-xs text-dim">{category.description}</span>
                  </div>
                </td>
                {/* Select-all checkbox above the Full Access column */}
                <td className={`${cellPx} pt-4 pb-1 text-center`}>
                  {editable && (
                    <label className="inline-flex flex-col items-center gap-0.5 cursor-pointer" title={`Select / deselect all ${category.label} modules`}>
                      <input
                        type="checkbox"
                        checked={isCategoryChecked}
                        onChange={() => toggleAllForCategory(modules)}
                        disabled={disabled || permSet.has('*:*')}
                        className="h-4 w-4 rounded border-line text-ink focus:ring-ink"
                      />
                      <span className="text-[10px] text-dim select-none leading-tight">Select all</span>
                    </label>
                  )}
                </td>
              </tr>

              {/* ── Module Rows ── */}
              {modules.map(({ code, config }) => {
                const hasManage = permSet.has('*:*') || permSet.has(`${code}:manage`);
                const checkedCount = countModuleActions(permSet, code, actions);
                const allChecked = hasManage || checkedCount === actions.length;

                return (
                  <tr key={code} className="hover:bg-canvas transition-colors">
                    {/* Module name cell */}
                    <td className={`${cellPx} text-sm font-medium text-ink pl-6`}>
                      <div className="flex items-center gap-2">
                        <span>{config.label}</span>
                        {/* Show count badge in editable mode */}
                        {editable && checkedCount > 0 && !hasManage && (
                          <span className="text-[10px] bg-surface-hover text-ink px-1.5 py-0.5 rounded-full font-medium">
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
                              className="h-4 w-4 rounded border-line text-ink focus:ring-ink
                                         disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          ) : (
                            isChecked ? (
                              <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-surface-hover text-ink text-xs font-bold">
                                ✓
                              </span>
                            ) : (
                              <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-surface-hover text-dim text-xs">
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
                          className="h-4 w-4 rounded border-line text-ink focus:ring-ink
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      ) : (
                        hasManage ? (
                          <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-surface-hover text-ink text-xs font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-surface-hover text-dim text-xs">
                            —
                          </span>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* ── Legend (read-only mode) ── */}
      {!editable && (
        <div className="px-4 py-3 bg-canvas border-t border-line flex items-center gap-4 text-xs text-dim">
          <div className="flex items-center gap-1">
            <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-surface-hover text-ink text-[10px] font-bold">✓</span>
            <span>Access granted</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-surface-hover text-dim text-[10px]">—</span>
            <span>No access</span>
          </div>
        </div>
      )}

      {/* ── Selection summary (editable mode) ── */}
      {editable && (
        <div className="px-4 py-2 bg-canvas border-t border-line text-xs text-dim">
          {permissions.length === 0 ? (
            <span className="text-warning">No permissions selected — role will have no access</span>
          ) : (
            <span>{permissions.length} permission{permissions.length !== 1 ? 's' : ''} selected</span>
          )}
        </div>
      )}
    </div>
  );
}
