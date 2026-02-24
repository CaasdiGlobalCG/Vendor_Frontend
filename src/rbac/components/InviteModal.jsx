// ============================================================
// FILE: rbac/components/InviteModal.jsx
// PURPOSE: Modal for inviting team members. Supports selecting an
//          existing role OR creating a new custom role inline.
//          Both modes support per-member permission overrides.
// CONNECTS TO: rbacApi (getRoleDetails, createRole),
//              EditablePermissionMatrix (permission grid)
// ============================================================

import React, { useState } from 'react';
import { getRoleDetails, createRole } from '../api/rbacApi';
import { EditablePermissionMatrix } from './EditablePermissionMatrix';

/** Hierarchy level options (excludes Super Admin = 0) */
const HIERARCHY_OPTIONS = [
  { value: 1, label: 'Admin' },
  { value: 2, label: 'Manager' },
  { value: 3, label: 'Member' },
  { value: 4, label: 'Viewer' },
];

/**
 * InviteModal — invite a team member with existing or newly-created role.
 * @param {Object}   props
 * @param {Array}    props.roles    — full role list (from listRoles)
 * @param {Function} props.onSubmit — callback({ email, roleId, message, permissionOverrides })
 * @param {Function} props.onClose  — close the modal
 */
export function InviteModal({ roles, onSubmit, onClose }) {
  // ── Common fields ──
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // ── Role mode toggle: 'select' | 'create' ──
  const [roleMode, setRoleMode] = useState('select');

  // ── Existing-role mode state ──
  const [roleId, setRoleId] = useState('');
  const [rolePermissions, setRolePermissions] = useState([]);
  const [currentPermissions, setCurrentPermissions] = useState([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  // ── Create-role mode state ──
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState(3);
  const [copyFromRoleId, setCopyFromRoleId] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState([]);
  const [loadingCopy, setLoadingCopy] = useState(false);

  // ── Per-member override for create mode ──
  const [showMemberOverride, setShowMemberOverride] = useState(false);
  const [memberPermissions, setMemberPermissions] = useState([]);

  const assignableRoles = roles.filter((r) => r.canAssign);

  // ── Existing role: load permissions on selection ──
  const handleRoleChange = async (newRoleId) => {
    setRoleId(newRoleId);
    setShowPermissions(false);
    if (!newRoleId) { setRolePermissions([]); setCurrentPermissions([]); return; }
    setLoadingPerms(true);
    try {
      const data = await getRoleDetails(newRoleId);
      const perms = (data.role?.permissions || []).filter(p => p !== '*:*');
      setRolePermissions(perms);
      setCurrentPermissions([...perms]);
    } catch (err) {
      console.error('[InviteModal] Failed to load role permissions:', err);
      setRolePermissions([]); setCurrentPermissions([]);
    } finally { setLoadingPerms(false); }
  };

  // ── Create: copy permissions from an existing role ──
  const handleCopyFrom = async (sourceRoleId) => {
    setCopyFromRoleId(sourceRoleId);
    setShowMemberOverride(false);
    if (!sourceRoleId) {
      setNewRolePermissions([]); setMemberPermissions([]); return;
    }
    setLoadingCopy(true);
    try {
      const data = await getRoleDetails(sourceRoleId);
      const role = data.role || {};
      const perms = (role.permissions || []).filter(p => p !== '*:*');
      setNewRolePermissions([...perms]);
      setMemberPermissions([...perms]);
      // Auto-set hierarchy from source
      if (role.roleLevel >= 1 && role.roleLevel <= 4) setNewRoleLevel(role.roleLevel);
    } catch (err) {
      console.error('[InviteModal] Failed to copy role permissions:', err);
    } finally { setLoadingCopy(false); }
  };

  // ── Override helpers ──
  const computeOverrides = (base, current) => {
    const origSet = new Set(base);
    const currSet = new Set(current);
    const added = current.filter(p => !origSet.has(p));
    const removed = base.filter(p => !currSet.has(p));
    return (added.length || removed.length) ? { added, removed } : null;
  };

  // ── Mode switch (reset the other side) ──
  const handleModeSwitch = (mode) => {
    setRoleMode(mode);
    setError(null);
    if (mode === 'select') {
      setNewRoleName(''); setNewRoleDescription(''); setNewRoleLevel(3);
      setCopyFromRoleId(''); setNewRolePermissions([]);
      setShowMemberOverride(false); setMemberPermissions([]);
    } else {
      setRoleId(''); setRolePermissions([]); setCurrentPermissions([]);
      setShowPermissions(false);
    }
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    if (roleMode === 'select' && !roleId) return;
    if (roleMode === 'create' && !newRoleName.trim()) return;
    setSubmitting(true); setError(null);
    try {
      let finalRoleId = roleId;
      let finalOverrides = null;

      if (roleMode === 'create') {
        const result = await createRole({
          roleName: newRoleName.trim(),
          description: newRoleDescription.trim() || undefined,
          roleLevel: newRoleLevel,
          permissions: newRolePermissions,
        });
        finalRoleId = result.role?.roleId;
        if (!finalRoleId) throw new Error('Failed to create role');
        if (showMemberOverride) {
          finalOverrides = computeOverrides(newRolePermissions, memberPermissions);
        }
      } else {
        finalOverrides = computeOverrides(rolePermissions, currentPermissions);
      }

      await onSubmit({ email, roleId: finalRoleId, message, permissionOverrides: finalOverrides });
    } catch (err) {
      setError(err.message);
    } finally { setSubmitting(false); }
  };

  // ── Computed display flags ──
  const existingOverrides = roleMode === 'select' ? computeOverrides(rolePermissions, currentPermissions) : null;
  const newRoleOverrides = roleMode === 'create' && showMemberOverride
    ? computeOverrides(newRolePermissions, memberPermissions) : null;

  const isDisabled = submitting || !email
    || (roleMode === 'select' && !roleId)
    || (roleMode === 'create' && !newRoleName.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Invite Team Member</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
          </div>

          {/* ── Role Mode Toggle ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-3">
              <button type="button" onClick={() => handleModeSwitch('select')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  roleMode === 'select' ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}>Select Existing Role</button>
              <button type="button" onClick={() => handleModeSwitch('create')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  roleMode === 'create' ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}>+ Create New Role</button>
            </div>

            {/* ====== EXISTING ROLE MODE ====== */}
            {roleMode === 'select' && (
              <>
                <select required value={roleId} onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                  <option value="">Select a role...</option>
                  {assignableRoles.map((r) => (
                    <option key={r.roleId} value={r.roleId}>{r.roleName}{r.description ? ` — ${r.description}` : ''}</option>
                  ))}
                </select>

                {/* Permission override (Phase 2.5B) */}
                {roleId && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Permissions
                        {existingOverrides && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">Customized</span>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        {existingOverrides && (
                          <button type="button" onClick={() => setCurrentPermissions([...rolePermissions])}
                            className="text-xs text-gray-500 hover:text-gray-700">Reset to default</button>
                        )}
                        <button type="button" onClick={() => setShowPermissions(!showPermissions)}
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                          {showPermissions ? 'Hide' : 'Show & Customize'}
                        </button>
                      </div>
                    </div>
                    {loadingPerms ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600 mx-auto mb-2" />Loading permissions...
                      </div>
                    ) : showPermissions && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <EditablePermissionMatrix permissions={currentPermissions} onChange={setCurrentPermissions}
                          editable={true} compact={true} disabled={submitting} />
                      </div>
                    )}
                    {!showPermissions && !loadingPerms && (
                      <p className="text-xs text-gray-500">
                        {rolePermissions.length} permissions from the selected role.{' '}
                        <button type="button" onClick={() => setShowPermissions(true)} className="text-teal-600 hover:underline">Click to customize</button>
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ====== CREATE NEW ROLE MODE ====== */}
            {roleMode === 'create' && (
              <div className="space-y-3">
                {/* Name + Hierarchy row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Role Name *</label>
                    <input type="text" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="e.g., Sales Lead"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Hierarchy Level *</label>
                    <select value={newRoleLevel} onChange={(e) => setNewRoleLevel(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                      {HIERARCHY_OPTIONS.map((h) => (
                        <option key={h.value} value={h.value}>{h.label} (Level {h.value})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input type="text" value={newRoleDescription} onChange={(e) => setNewRoleDescription(e.target.value)}
                    placeholder="Brief description of this role"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                </div>

                {/* Copy permissions from */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Copy Permissions From</label>
                  <select value={copyFromRoleId} onChange={(e) => handleCopyFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                    <option value="">Start from scratch</option>
                    {roles.map((r) => (
                      <option key={r.roleId} value={r.roleId}>{r.roleName}{r.isSystem ? ' (system)' : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Role permission matrix */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Role Permissions</label>
                    {copyFromRoleId && (
                      <span className="text-xs text-gray-500">
                        Copied from {roles.find(r => r.roleId === copyFromRoleId)?.roleName || 'source'} — customize below
                      </span>
                    )}
                  </div>
                  {loadingCopy ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600 mx-auto mb-2" />Loading permissions...
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <EditablePermissionMatrix permissions={newRolePermissions}
                        onChange={(perms) => {
                          setNewRolePermissions(perms);
                          if (showMemberOverride) setMemberPermissions([...perms]);
                        }}
                        editable={true} compact={true} disabled={submitting} />
                    </div>
                  )}
                </div>

                {/* Per-member override toggle */}
                {newRolePermissions.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Member-specific adjustments
                          {newRoleOverrides && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">Customized</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">Tweak permissions for this member only (won't change the saved role)</p>
                      </div>
                      <button type="button" onClick={() => {
                        const next = !showMemberOverride;
                        setShowMemberOverride(next);
                        if (next) setMemberPermissions([...newRolePermissions]);
                      }} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                        {showMemberOverride ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                    {showMemberOverride && (
                      <div className="mt-2 border border-amber-200 rounded-lg overflow-hidden bg-amber-50/30">
                        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                          <span className="text-xs font-medium text-amber-700">Member Override (differs from saved role)</span>
                          {newRoleOverrides && (
                            <button type="button" onClick={() => setMemberPermissions([...newRolePermissions])}
                              className="text-xs text-amber-600 hover:text-amber-800">Reset</button>
                          )}
                        </div>
                        <EditablePermissionMatrix permissions={memberPermissions} onChange={setMemberPermissions}
                          editable={true} compact={true} disabled={submitting} />
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <p className="text-xs text-teal-700">
                    <strong>Note:</strong> This role will be saved and available for future invitations in the Roles tab.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Welcome to the team!"
              rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none" />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={handleSubmit} disabled={isDisabled}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {submitting ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {roleMode === 'create' ? 'Creating Role & Sending...' : 'Sending...'}</>
            ) : roleMode === 'create' ? 'Create Role & Send Invitation' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}
