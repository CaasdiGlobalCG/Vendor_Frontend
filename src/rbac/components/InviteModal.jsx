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
import { usePermission } from '../hooks/usePermission';

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

  // ── Permission check: can this user create roles? ──
  const { can } = usePermission();
  const canCreateRoles = can('user_management', 'manage');

  // ── Common fields ──
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Platform access is auto-derived from permissions on the backend
  // — no manual platform selection needed

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
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-line bg-black">
          <div>
            <p className="text-[11px] font-semibold tracking-wide uppercase text-ink">Team Access</p>
            <h3 className="text-lg font-semibold text-ink">Invite Team Member</h3>
            <p className="text-sm text-dim mt-1">
              Assign an existing role or create a custom role in one flow.
            </p>
          </div>
          <button onClick={onClose} className="text-dim hover:text-dim text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">{error}</div>}

          <div className="rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-dim">
            Steps: add recipient email, choose how to assign a role, then optionally tune permissions before sending.
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Email Address *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-line" />
          </div>

          {/* ── Role Mode Toggle ── */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Role *</label>
            <div className="flex rounded-lg border border-line overflow-hidden mb-3">
              <button type="button" onClick={() => handleModeSwitch('select')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  roleMode === 'select' ? 'bg-cta text-cta-foreground' : 'bg-canvas text-dim hover:bg-surface-hover'
                }`}>Select Existing Role</button>
              {canCreateRoles && (
              <button type="button" onClick={() => handleModeSwitch('create')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  roleMode === 'create' ? 'bg-cta text-cta-foreground' : 'bg-canvas text-dim hover:bg-surface-hover'
                }`}>+ Create New Role</button>
              )}
            </div>

            {/* ====== EXISTING ROLE MODE ====== */}
            {roleMode === 'select' && (
              <>
                {assignableRoles.length === 0 && (
                  <div className="mb-3 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning">
                    You currently cannot assign any role. Contact a higher-level admin to grant assignment access.
                  </div>
                )}
                <select required value={roleId} onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-line">
                  <option value="">Select a role...</option>
                  {assignableRoles.map((r) => (
                    <option key={r.roleId} value={r.roleId}>{r.roleName}{r.description ? ` — ${r.description}` : ''}</option>
                  ))}
                </select>

                {/* Permission override (Phase 2.5B) */}
                {roleId && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-ink">
                        Permissions
                        {existingOverrides && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-warning/10 text-warning border border-warning/20">Customized</span>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        {existingOverrides && (
                          <button type="button" onClick={() => setCurrentPermissions([...rolePermissions])}
                            className="text-xs text-dim hover:text-ink">Reset to default</button>
                        )}
                        <button type="button" onClick={() => setShowPermissions(!showPermissions)}
                          className="text-xs text-ink hover:text-ink font-medium">
                          {showPermissions ? 'Hide' : 'Show & Customize'}
                        </button>
                      </div>
                    </div>
                    {loadingPerms ? (
                      <div className="p-4 text-center text-sm text-dim">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-line mx-auto mb-2" />Loading permissions...
                      </div>
                    ) : showPermissions && (
                      <div className="border border-line rounded-lg overflow-hidden">
                        <EditablePermissionMatrix permissions={currentPermissions} onChange={setCurrentPermissions}
                          editable={true} compact={true} disabled={submitting} />
                      </div>
                    )}
                    {!showPermissions && !loadingPerms && (
                      <p className="text-xs text-dim">
                        {rolePermissions.length} permissions from the selected role.{' '}
                        <button type="button" onClick={() => setShowPermissions(true)} className="text-ink hover:underline">Click to customize</button>
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ====== CREATE NEW ROLE MODE ====== */}
            {roleMode === 'create' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-line bg-surface-hover px-3 py-2 text-xs text-ink">
                  New roles are reusable for future invitations. Role level controls hierarchy and assignment authority.
                </div>

                {/* Name + Hierarchy row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-dim mb-1">Role Name *</label>
                    <input type="text" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="e.g., Sales Lead"
                      className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-line" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dim mb-1">Hierarchy Level *</label>
                    <select value={newRoleLevel} onChange={(e) => setNewRoleLevel(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-line">
                      {HIERARCHY_OPTIONS.map((h) => (
                        <option key={h.value} value={h.value}>{h.label} (Level {h.value})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-dim mb-1">Description</label>
                  <input type="text" value={newRoleDescription} onChange={(e) => setNewRoleDescription(e.target.value)}
                    placeholder="Brief description of this role"
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-line" />
                </div>

                {/* Copy permissions from */}
                <div>
                  <label className="block text-xs font-medium text-dim mb-1">Copy Permissions From</label>
                  <select value={copyFromRoleId} onChange={(e) => handleCopyFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-line">
                    <option value="">Start from scratch</option>
                    {roles.map((r) => (
                      <option key={r.roleId} value={r.roleId}>{r.roleName}{r.isSystem ? ' (system)' : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Role permission matrix */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-ink">Role Permissions</label>
                    {copyFromRoleId && (
                      <span className="text-xs text-dim">
                        Copied from {roles.find(r => r.roleId === copyFromRoleId)?.roleName || 'source'} — customize below
                      </span>
                    )}
                  </div>
                  {loadingCopy ? (
                    <div className="p-4 text-center text-sm text-dim">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-line mx-auto mb-2" />Loading permissions...
                    </div>
                  ) : (
                    <div className="border border-line rounded-lg overflow-hidden">
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
                  <div className="border-t border-line pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-ink">
                          Member-specific adjustments
                          {newRoleOverrides && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-warning/10 text-warning border border-warning/20">Customized</span>
                          )}
                        </p>
                        <p className="text-xs text-dim">Tweak permissions for this member only (won't change the saved role)</p>
                      </div>
                      <button type="button" onClick={() => {
                        const next = !showMemberOverride;
                        setShowMemberOverride(next);
                        if (next) setMemberPermissions([...newRolePermissions]);
                      }} className="text-xs text-ink hover:text-ink font-medium">
                        {showMemberOverride ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                    {showMemberOverride && (
                      <div className="mt-2 border border-warning/20 rounded-lg overflow-hidden bg-warning">
                        <div className="px-3 py-1.5 bg-warning/10 border-b border-warning/20 flex items-center justify-between">
                          <span className="text-xs font-medium text-warning">Member Override (differs from saved role)</span>
                          {newRoleOverrides && (
                            <button type="button" onClick={() => setMemberPermissions([...newRolePermissions])}
                              className="text-xs text-warning hover:text-warning">Reset</button>
                          )}
                        </div>
                        <EditablePermissionMatrix permissions={memberPermissions} onChange={setMemberPermissions}
                          editable={true} compact={true} disabled={submitting} />
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-surface-hover border border-line rounded-lg p-3">
                  <p className="text-xs text-ink">
                    <strong>Note:</strong> This role will be saved and available for future invitations in the Roles tab.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Platform Access Info ── */}
          <div className="bg-info/10 border border-info/20 rounded-lg px-4 py-3">
            <p className="text-xs text-info">
              <span className="font-medium">Platform access</span> is automatically determined by the
              permissions assigned to this member's role. No manual platform selection is needed.
            </p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Message (optional)</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Welcome to the team!"
              rows={2} className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:ring-2 focus:ring-ink focus:border-line resize-none" />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-line">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-dim hover:text-ink border border-line rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={isDisabled}
            className="px-4 py-2 bg-cta hover:bg-cta text-cta-foreground text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
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
