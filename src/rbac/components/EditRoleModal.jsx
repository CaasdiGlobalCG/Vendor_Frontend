// ============================================================
// FILE: rbac/components/EditRoleModal.jsx
// PURPOSE: Shared modal to edit a role's name, description, and permissions.
//          Used from TeamPage member actions (Edit Role button).
// CONNECTS TO: rbacApi (getRoleDetails, updateRole),
//              EditablePermissionMatrix (permission grid),
//              TeamPage.jsx (consumer)
// ============================================================

import React, { useState, useEffect } from 'react';
import { EditablePermissionMatrix } from './EditablePermissionMatrix';
import { getRoleDetails, updateRole } from '../api/rbacApi';

/** Maps numeric level to human-readable label */
const HIERARCHY_LABELS = {
  0: 'Super Admin',
  1: 'Admin',
  2: 'Manager',
  3: 'Member',
  4: 'Viewer',
};

/**
 * EditRoleModal — edit a role's permissions, name, and description.
 * Fetches role details by roleId, then shows editable form.
 * System roles: only permissions + description editable.
 * Custom roles: name + description + permissions editable.
 * Super Admin: read-only, cannot be modified.
 *
 * @param {Object} props
 * @param {string} props.roleId - Role ID to fetch and edit
 * @param {Function} props.onClose - Close callback
 * @param {Function} [props.onUpdated] - Called after successful save
 * @param {Function} [props.onError] - Called with error message on failure
 */
export function EditRoleModal({ roleId, onClose, onUpdated, onError }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [saving, setSaving] = useState(false);

  // ── Fetch full role details on mount ──
  useEffect(() => {
    if (!roleId) return;
    let cancelled = false;

    const fetchRole = async () => {
      try {
        setLoading(true);
        const data = await getRoleDetails(roleId);
        if (cancelled) return;
        const r = data.role;
        setRole(r);
        setRoleName(r.roleName || '');
        setDescription(r.description || '');
        setPermissions((r.permissions || []).filter(p => p !== '*:*'));
      } catch (err) {
        if (!cancelled) {
          onError?.(err.message || 'Failed to load role details');
          onClose?.();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRole();
    return () => { cancelled = true; };
  }, [roleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSuperAdmin = role?.level === 0;
  const isSystem = role?.isSystem;

  /** Submit updated role to backend */
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (isSuperAdmin) return;
    try {
      setSaving(true);
      const body = { permissions, description: description.trim() || undefined };
      if (!isSystem) body.roleName = roleName.trim();
      await updateRole(role.roleId, body);
      onUpdated?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {loading ? 'Loading Role...' : `Edit Role: ${role?.roleName}`}
            </h3>
            {role && (
              <p className="text-xs text-gray-500 mt-0.5">
                {isSystem ? 'System role — name cannot be changed' : 'Custom role'}
                {' · '}Level {role.level} ({HIERARCHY_LABELS[role.level] || 'Custom'})
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading role details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {isSuperAdmin && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                Super Admin permissions cannot be modified — this role always has full access.
              </div>
            )}

            {/* Role Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={isSystem}
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                           disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSuperAdmin}
                maxLength={200}
                placeholder="Brief role description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                           disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            {/* Permission Matrix */}
            {!isSuperAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <EditablePermissionMatrix
                    permissions={permissions}
                    onChange={setPermissions}
                    editable={true}
                    compact={true}
                    disabled={saving}
                  />
                </div>
              </div>
            )}
          </form>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          {!loading && !isSuperAdmin && (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving...</>
              ) : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
