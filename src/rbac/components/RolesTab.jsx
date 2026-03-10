// ============================================================
// FILE: rbac/components/RolesTab.jsx
// PURPOSE: Roles management tab — list, create, edit, delete roles.
//          Shows role table with CRUD modals for custom role management.
// CONNECTS TO: rbacApi (role CRUD), EditablePermissionMatrix,
//              RoleBadge, PermissionGate, TeamPage (parent)
// ============================================================

import React, { useState, useCallback } from 'react';
import { RoleBadge } from './RoleBadge';
import { PermissionGate } from './PermissionGate';
import { EditablePermissionMatrix } from './EditablePermissionMatrix';
import {
  getRoleDetails,
  createRole,
  updateRole,
  deleteRole,
} from '../api/rbacApi';

/**
 * HIERARCHY_LABELS — maps numeric level to human-readable label.
 * WHY: Backend stores level as integer; UI needs words.
 */
const HIERARCHY_LABELS = {
  0: 'Super Admin',
  1: 'Admin',
  2: 'Manager',
  3: 'Member',
  4: 'Viewer',
};

/**
 * ASSIGNABLE_LEVELS — levels a role can be created at (not 0 = Super Admin).
 * WHY: Super Admin level is immutable and cannot be used for custom roles.
 */
const ASSIGNABLE_LEVELS = [
  { value: 1, label: 'Admin (Level 1)' },
  { value: 2, label: 'Manager (Level 2)' },
  { value: 3, label: 'Member (Level 3)' },
  { value: 4, label: 'Viewer (Level 4)' },
];

/**
 * RolesTab — full role management UI.
 *
 * @param {Object} props
 * @param {Array} props.roles - Role list from parent state
 * @param {Object} props.meta - { customRoleCount, maxCustomRoles, canCreateMore, suggestions }
 * @param {Function} props.onRefresh - Callback to re-fetch roles from parent
 * @param {Function} props.showFeedback - (msg, type) feedback toast
 */
export default function RolesTab({ roles = [], meta = {}, onRefresh, showFeedback }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);
  const [viewingRole, setViewingRole] = useState(null);

  // ── Open edit modal with full role details ──
  const handleEditClick = useCallback(async (role) => {
    try {
      const data = await getRoleDetails(role.roleId);
      setEditingRole(data.role || role);
    } catch (err) {
      showFeedback?.(err.message, 'error');
    }
  }, [showFeedback]);

  // ── Open view modal with full details ──
  const handleViewClick = useCallback(async (role) => {
    try {
      const data = await getRoleDetails(role.roleId);
      setViewingRole({ ...data.role, memberCount: data.memberCount });
    } catch (err) {
      showFeedback?.(err.message, 'error');
    }
  }, [showFeedback]);

  return (
    <div className="space-y-4">
      {/* ── Header with Create button ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {roles.length} role{roles.length !== 1 ? 's' : ''} total
            {meta.maxCustomRoles != null && (
              <span className="ml-2 text-xs text-gray-400">
                ({meta.customRoleCount || 0}/{meta.maxCustomRoles === 9999 ? '∞' : meta.maxCustomRoles} custom roles used)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
            Refresh
          </button>
          <PermissionGate module="user_management" action="manage">
            {meta.canCreateMore !== false && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg
                           flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Role
              </button>
            )}
          </PermissionGate>
        </div>
      </div>

      {/* ── System Roles ── */}
      <RoleSection
        title="System Roles"
        subtitle="Built-in roles that cannot be deleted"
        roles={roles.filter((r) => r.isSystem)}
        onViewClick={handleViewClick}
        onEditClick={handleEditClick}
        onDeleteClick={setDeletingRole}
      />

      {/* ── Custom Roles ── */}
      {roles.some((r) => !r.isSystem) && (
        <RoleSection
          title="Custom Roles"
          subtitle="Organization-specific roles created by your team"
          roles={roles.filter((r) => !r.isSystem)}
          onViewClick={handleViewClick}
          onEditClick={handleEditClick}
          onDeleteClick={setDeletingRole}
        />
      )}

      {/* ── Modals ── */}
      {showCreate && (
        <CreateRoleModal
          roles={roles}
          meta={meta}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); onRefresh?.(); showFeedback?.('Role created successfully'); }}
          onError={(msg) => showFeedback?.(msg, 'error')}
        />
      )}

      {editingRole && (
        <EditRoleModal
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onUpdated={() => { setEditingRole(null); onRefresh?.(); showFeedback?.('Role updated successfully'); }}
          onError={(msg) => showFeedback?.(msg, 'error')}
        />
      )}

      {deletingRole && (
        <DeleteRoleModal
          role={deletingRole}
          onClose={() => setDeletingRole(null)}
          onDeleted={() => { setDeletingRole(null); onRefresh?.(); showFeedback?.('Role deleted'); }}
          onError={(msg) => showFeedback?.(msg, 'error')}
        />
      )}

      {viewingRole && (
        <ViewRoleModal
          role={viewingRole}
          onClose={() => setViewingRole(null)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────
// CREATE ROLE MODAL
// ──────────────────────────────────────

/**
 * CreateRoleModal — form to create a new custom role.
 * Features: name input with suggestions, level picker, copy-from dropdown,
 * editable permission matrix.
 */
function CreateRoleModal({ roles, meta, onClose, onCreated, onError }) {
  const [roleName, setRoleName] = useState('');
  const [level, setLevel] = useState(3);
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [copyFrom, setCopyFrom] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = meta.suggestions || [];

  /** Copy permissions from an existing role into the form */
  const handleCopyFrom = useCallback(async (roleId) => {
    if (!roleId) { setPermissions([]); setCopyFrom(''); return; }
    try {
      setCopyFrom(roleId);
      const data = await getRoleDetails(roleId);
      const srcPerms = data.role?.permissions || [];
      setPermissions(srcPerms.filter(p => p !== '*:*'));
    } catch (err) {
      onError?.(`Failed to copy: ${err.message}`);
    }
  }, [onError]);

  /** Apply a name suggestion */
  const applySuggestion = (name) => {
    setRoleName(name);
    setShowSuggestions(false);
  };

  /** Submit create request */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) return;
    try {
      setSaving(true);
      await createRole({
        roleName: roleName.trim(),
        level,
        description: description.trim() || undefined,
        permissions,
        copyFrom: copyFrom || undefined,
      });
      onCreated?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Create Custom Role</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Body — scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Role Name with suggestions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={50}
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="e.g. Sales Manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {suggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => applySuggestion(name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                    >
                      {name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 border-t"
                  >
                    Close suggestions
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Level + Copy From row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hierarchy Level *</label>
              <select
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                {ASSIGNABLE_LEVELS.map(({ value: v, label: l }) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Copy From (optional)</label>
              <select
                value={copyFrom}
                onChange={(e) => handleCopyFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Start blank</option>
                {roles
                  .filter(r => !r.permissions?.includes('*:*'))
                  .map((r) => (
                    <option key={r.roleId} value={r.roleId}>{r.roleName}</option>
                  ))
                }
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this role is for"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Permission Matrix */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
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
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !roleName.trim()}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Creating...</>
            ) : 'Create Role'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ──────────────────────────────────────
// EDIT ROLE MODAL
// ──────────────────────────────────────

/**
 * EditRoleModal — edit permissions (and name for custom roles).
 * System roles: only permissions + description editable.
 * Custom roles: name + description + permissions editable.
 */
function EditRoleModal({ role, onClose, onUpdated, onError }) {
  const [roleName, setRoleName] = useState(role.roleName || '');
  const [description, setDescription] = useState(role.description || '');
  const [permissions, setPermissions] = useState(
    (role.permissions || []).filter(p => p !== '*:*')
  );
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = role.roleLevel === 0;
  const isSystem = role.isSystem;

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Edit Role: {role.roleName}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isSystem ? 'System role — name cannot be changed' : 'Custom role'}
              {' · '}{HIERARCHY_LABELS[role.roleLevel] || `Level ${role.roleLevel}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {isSuperAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              Super Admin permissions cannot be modified — this role always has full access.
            </div>
          )}

          {/* Role name (editable only for custom roles) */}
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

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          {!isSuperAdmin && (
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
    </ModalOverlay>
  );
}

// ──────────────────────────────────────
// DELETE ROLE MODAL
// ──────────────────────────────────────

/**
 * DeleteRoleModal — confirmation dialog for deleting custom roles.
 * Fetches member count to warn if role is assigned.
 */
function DeleteRoleModal({ role, onClose, onDeleted, onError }) {
  const [deleting, setDeleting] = useState(false);
  const [memberCount, setMemberCount] = useState(null);

  // Fetch member count on mount
  React.useEffect(() => {
    getRoleDetails(role.roleId)
      .then((data) => setMemberCount(data.memberCount ?? 0))
      .catch(() => setMemberCount(0));
  }, [role.roleId]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteRole(role.roleId);
      onDeleted?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Role</h3>
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete <strong>{role.roleName}</strong>?
        </p>
        {memberCount > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            This role is assigned to {memberCount} member{memberCount !== 1 ? 's' : ''}.
            You must reassign them before deleting.
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || memberCount > 0}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {deleting ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Deleting...</>
            ) : 'Delete Role'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ──────────────────────────────────────
// VIEW ROLE MODAL
// ──────────────────────────────────────

/**
 * ViewRoleModal — read-only permission matrix for any role.
 */
function ViewRoleModal({ role, onClose }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{role.roleName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {role.isSystem ? 'System' : 'Custom'} role · {HIERARCHY_LABELS[role.roleLevel] || `Level ${role.roleLevel}`}
              {role.memberCount != null && ` · ${role.memberCount} member${role.memberCount !== 1 ? 's' : ''}`}
            </p>
            {role.description && (
              <p className="text-sm text-gray-600 mt-1">{role.description}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Permission Matrix */}
        <div className="flex-1 overflow-y-auto">
          <EditablePermissionMatrix
            permissions={role.permissions || []}
            editable={false}
            compact={true}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">
            Close
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ──────────────────────────────────────
// SHARED: Modal Overlay
// ──────────────────────────────────────

/** Overlay backdrop — closes on backdrop click */
function ModalOverlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      {children}
    </div>
  );
}

/** Reusable role table section (System / Custom) */
function RoleSection({ title, subtitle, roles, onViewClick, onEditClick, onDeleteClick }) {
  if (!roles.length) return null;
  return (
    <div>
      <div className="mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Role Name</th>
              <th className="px-4 py-3 text-left font-medium">Level</th>
              <th className="px-4 py-3 text-center font-medium">Permissions</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {roles.map((role) => (
              <tr key={role.roleId} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <RoleBadge roleId={role.roleId} roleName={role.roleName} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {HIERARCHY_LABELS[role.roleLevel] || `Level ${role.roleLevel}`}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs text-gray-500">
                    {role.permissions?.includes('*:*') ? 'Full Access' : `${(role.permissions || []).length} perms`}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => onViewClick(role)} className="text-xs text-gray-500 hover:text-gray-700 font-medium">View</button>
                    {role.canEdit && (
                      <PermissionGate module="user_management" action="manage">
                        <button onClick={() => onEditClick(role)} className="text-xs text-teal-600 hover:text-teal-700 font-medium">Edit</button>
                      </PermissionGate>
                    )}
                    {!role.isSystem && (
                      <PermissionGate module="user_management" action="manage">
                        <button onClick={() => onDeleteClick(role)} className="text-xs text-red-500 hover:text-red-600 font-medium">Delete</button>
                      </PermissionGate>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
