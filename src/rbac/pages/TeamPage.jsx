// ============================================================
// FILE: rbac/pages/TeamPage.jsx
// PURPOSE: Team & Permissions management page for the Vendor Dashboard.
//          Phase 2: Live member list, invite modal, role editing, removal.
//          Phase 2.5: Roles tab with custom role CRUD + editable permissions.
// CONNECTS TO: RBACContext (role/permission data),
//              VendorContext (current user info),
//              rbacApi (listMembers, inviteMember, changeMemberRole, etc.)
//              PermissionMatrix, EditablePermissionMatrix,
//              RoleBadge, PermissionGate, RolesTab
// ============================================================

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useRBAC } from '../context/RBACContext';
import { usePermission } from '../hooks/usePermission';
import { VendorContext } from '../../context/VendorContext';
import config from '../../config/env';
import { RoleBadge } from '../components/RoleBadge';
import { EditablePermissionMatrix } from '../components/EditablePermissionMatrix';
import { PermissionGate } from '../components/PermissionGate';
import { InviteModal } from '../components/InviteModal';
import { EditRoleModal } from '../components/EditRoleModal';
import ActivityLogTab from '../components/ActivityLogTab';
import RolesTab from '../components/RolesTab';
import { Plus } from 'lucide-react';
// Adopted design (variant 1, "Console") — permanent Team-page component set.
import { TeamShell, MemberTable, InvitationsTab, PermissionsTab } from '../../components/team';
import { PageHero, heroActionClass, Reveal, RevealFlat } from '../../components/ui';
import { motion } from 'framer-motion';
import { RemovalReasonModal } from '../components/RemovalReasonModal';
import { SuspensionModal } from '../components/SuspensionModal';
import {
  listMembers,
  inviteMember,
  changeMemberRole,
  removeMember,
  suspendMember,
  unsuspendMember,
  updateMemberAccessScopes,
  listRoles,
  listInvitations,
  cancelInvitation,
} from '../api/rbacApi';

/**
 * TeamPage — main team management page under /VendorDashboard/team.
 * Sections:
 *   1. Your Access card (role, email, module count)
 *   2. Team Members (live from API)
 *   3. Pending Invitations
 *   4. Permission Matrix
 */
export default function TeamPage() {
  const { role, userId, isFallback, permissions, isLoading, accessibleModules, refresh: refreshRBAC } = useRBAC();
  const { currentUser } = useContext(VendorContext);

  // ── Member state ──
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState(null);

  // ── Roles state ──
  const [roles, setRoles] = useState([]);
  const [rolesMeta, setRolesMeta] = useState({});

  // ── Invitations state ──
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState('members');

  // ── Local UX filters (client-side only) ──
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('all');

  // ── Invite modal state ──
  const [showInviteModal, setShowInviteModal] = useState(false);

  // ── Role change state ──
  const [changingRoleFor, setChangingRoleFor] = useState(null);
  const [newRoleId, setNewRoleId] = useState('');

  // ── Remove confirmation state ──
  const [removingMember, setRemovingMember] = useState(null); // { userId, email }

  // ── Suspension modal state ──
  const [suspensionTarget, setSuspensionTarget] = useState(null); // { userId, email, mode }

  // ── Edit role modal state ──
  const [editingRoleId, setEditingRoleId] = useState(null);

  // ── Access scope editor state ──
  const [scopeEditorMember, setScopeEditorMember] = useState(null);
  const [scopeProjects, setScopeProjects] = useState([]);
  const [scopeWorkspaces, setScopeWorkspaces] = useState([]);
  const [scopeProjectIds, setScopeProjectIds] = useState([]);
  const [scopeWorkspaceIds, setScopeWorkspaceIds] = useState([]);
  const [scopeLoading, setScopeLoading] = useState(false);

  // ── Feedback ──
  const [feedback, setFeedback] = useState(null);

  // ── Fetch members ──
  const fetchMembers = useCallback(async () => {
    try {
      setMembersLoading(true);
      setMembersError(null);
      const data = await listMembers();
      setMembers(data.members || []);
    } catch (err) {
      setMembersError(err.message);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // ── Fetch roles (enhanced: roles + meta from Phase 2.5 backend) ──
  const fetchRoles = useCallback(async () => {
    try {
      const data = await listRoles();
      setRoles(data.roles || []);
      setRolesMeta(data.meta || {});
    } catch (err) {
      console.error('[TeamPage] Failed to fetch roles:', err);
    }
  }, []);

  // ── Fetch invitations ──
  const fetchInvitations = useCallback(async () => {
    try {
      setInvitationsLoading(true);
      const data = await listInvitations({ status: 'pending' });
      setInvitations(data.invitations || []);
    } catch (err) {
      console.error('[TeamPage] Failed to fetch invitations:', err);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  // ── Load all data on mount ──
  useEffect(() => {
    if (!isLoading) {
      fetchMembers();
      fetchRoles();
      fetchInvitations();
    }
  }, [isLoading, fetchMembers, fetchRoles, fetchInvitations]);

  // ── Show temporary feedback ──
  const showFeedback = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // ── Handle invite submit (called by InviteModal) ──
  const handleInvite = async ({ email, roleId, message, permissionOverrides, platformAccess }) => {
    try {
      await inviteMember({ email, roleId, message, permissionOverrides, platformAccess });
      showFeedback(`Invitation sent to ${email}`);
      setShowInviteModal(false);
      fetchMembers();
      fetchInvitations();
      fetchRoles();
    } catch (err) {
      throw err; // Let InviteModal handle the error display
    }
  };

  // ── Handle role change ──
  const handleRoleChange = async (userId) => {
    if (!newRoleId) return;
    try {
      await changeMemberRole(userId, newRoleId);
      showFeedback('Role updated successfully');
      setChangingRoleFor(null);
      setNewRoleId('');
      fetchMembers();
    } catch (err) {
      showFeedback(err.message, 'error');
    }
  };

  // ── Handle member removal (called from RemovalReasonModal) ──
  const handleRemove = async (userId, reason) => {
    try {
      await removeMember(userId, reason);
      showFeedback('Member removed');
      setRemovingMember(null);
      fetchMembers();
    } catch (err) {
      throw err; // Let RemovalReasonModal handle error display
    }
  };

  const handleSuspend = async ({ userId: targetUserId, reason, durationDays }) => {
    try {
      let suspendedUntil;
      if (durationDays) {
        suspendedUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      }

      await suspendMember(targetUserId, { reason, suspendedUntil });
      showFeedback('Member suspended');
      setSuspensionTarget(null);
      fetchMembers();
    } catch (err) {
      throw err;
    }
  };

  const handleUnsuspend = async ({ userId: targetUserId, reason }) => {
    try {
      await unsuspendMember(targetUserId, reason || undefined);
      showFeedback('Member unsuspended');
      setSuspensionTarget(null);
      fetchMembers();
    } catch (err) {
      throw err;
    }
  };

  // ── Handle invitation cancellation ──
  const handleCancelInvitation = async (inviteId) => {
    if (!window.confirm('Cancel this invitation? The invite link will no longer work.')) return;
    try {
      await cancelInvitation(inviteId);
      showFeedback('Invitation cancelled');
      fetchInvitations();
      fetchMembers(); // Refresh to remove the pending member row
    } catch (err) {
      showFeedback(err.message || 'Failed to cancel invitation', 'error');
    }
  };

  // ── Load project/workspace options for scope editor ──
  const loadScopeCatalog = useCallback(async () => {
    if (!currentUser?.vendorId && !currentUser?.id) return;

    const vendorId = currentUser.vendorId || currentUser.id;
    const token = localStorage.getItem('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    setScopeLoading(true);
    try {
      const [projectsRes, workspacesRes] = await Promise.all([
        fetch(`${config.VENDOR_BACKEND_URL}/api/projects/vendor/${vendorId}`, {
          credentials: 'include',
          headers,
        }),
        fetch(`${config.VENDOR_BACKEND_URL}/api/workspaces/vendor/${vendorId}`, {
          credentials: 'include',
          headers,
        }),
      ]);

      const projectsData = projectsRes.ok ? await projectsRes.json() : [];
      const workspacesData = workspacesRes.ok ? await workspacesRes.json() : [];

      setScopeProjects(Array.isArray(projectsData) ? projectsData : []);
      setScopeWorkspaces(Array.isArray(workspacesData) ? workspacesData : []);
    } catch (err) {
      console.error('[TeamPage] Failed to load scope catalog:', err);
      setScopeProjects([]);
      setScopeWorkspaces([]);
    } finally {
      setScopeLoading(false);
    }
  }, [currentUser?.vendorId, currentUser?.id]);

  const openScopeEditor = async (member) => {
    setScopeEditorMember(member);
    setScopeProjectIds(Array.isArray(member.projectAccess) ? member.projectAccess : []);
    setScopeWorkspaceIds(Array.isArray(member.workspaceAccess) ? member.workspaceAccess : []);
    await loadScopeCatalog();
  };

  const closeScopeEditor = () => {
    setScopeEditorMember(null);
    setScopeProjectIds([]);
    setScopeWorkspaceIds([]);
  };

  const handleScopeSave = async () => {
    if (!scopeEditorMember?.userId) return;
    try {
      await updateMemberAccessScopes(scopeEditorMember.userId, {
        projectIds: scopeProjectIds,
        workspaceIds: scopeWorkspaceIds,
      });
      showFeedback('Member access scopes updated');
      closeScopeEditor();
      fetchMembers();
      refreshRBAC();
    } catch (err) {
      showFeedback(err.message || 'Failed to update access scopes', 'error');
    }
  };

  // Loading state — shown while RBAC context is fetching
  if (isLoading) {
    return <TeamPageLoading />;
  }

  const moduleCount = permissions.includes('*:*')
    ? 'All Modules'
    : `${accessibleModules.length} modules`;

  const assignableRoles = roles.filter((r) => r.canAssign);

  // Local-only summary cards for quicker scanning in admin flows.
  const memberStats = useMemo(() => {
    const base = { total: members.length, active: 0, invited: 0, suspended: 0 };
    for (const member of members) {
      const status = member?.status || 'active';
      if (status === 'invited') base.invited += 1;
      else if (status === 'suspended') base.suspended += 1;
      else base.active += 1;
    }
    return base;
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return members.filter((member) => {
      const status = (member?.status || 'active').toLowerCase();
      const statusMatch = memberStatusFilter === 'all' || status === memberStatusFilter;
      const searchMatch = !q
        || String(member?.email || '').toLowerCase().includes(q)
        || String(member?.roleName || '').toLowerCase().includes(q);
      return statusMatch && searchMatch;
    });
  }, [members, memberSearch, memberStatusFilter]);

  // Adapter — the promoted shell expects this shape. Pure reshaping of values the page
  // already computes: no new data, no changed behaviour.
  const shellData = useMemo(() => ({
    members,
    roles,
    rolesMeta,
    invitations,
    permissions,
    role,
    moduleCount,
    filteredMembers,
    memberStats: {
      total: memberStats.total,
      active: memberStats.active,
      suspended: memberStats.suspended,
      pendingInvites: invitations.length,
    },
    // Per-slice async state for the promoted tab bodies (Panel expects
    // 'loading' | 'error' | 'empty' | 'ready').
    slices: {
      members: membersLoading ? 'loading' : membersError ? 'error' : members.length === 0 ? 'empty' : 'ready',
      invitations: invitationsLoading ? 'loading' : invitations.length === 0 ? 'empty' : 'ready',
      roles: roles.length === 0 ? 'empty' : 'ready',
      activity: 'ready',
    },
    // Local member filters — owned by the page, read by the table's filter rail.
    memberSearch,
    setMemberSearch,
    memberStatusFilter,
    setMemberStatusFilter,
    activeTab,
    setActiveTab,
    refresh: () => {
      fetchMembers();
      fetchRoles();
      fetchInvitations();
    },
    feedback,
    clearFeedback: () => setFeedback(null),
  }), [
    members, roles, rolesMeta, invitations, permissions, role, moduleCount,
    filteredMembers, memberStats, membersLoading, membersError, invitationsLoading,
    memberSearch, memberStatusFilter, activeTab, feedback,
    fetchMembers, fetchRoles, fetchInvitations,
  ]);

  // Real handlers for the promoted members table — it renders its actions inert unless
  // these are supplied.
  const memberHandlers = {
    onChangeRole: (member) => {
      setChangingRoleFor(member.userId);
      setNewRoleId(member.roleId || '');
    },
    onEditScope: (member) => openScopeEditor(member),
    onSuspend: (member) => setSuspensionTarget({ userId: member.userId, email: member.email, mode: 'suspend' }),
    onUnsuspend: (member) => setSuspensionTarget({ userId: member.userId, email: member.email, mode: 'unsuspend' }),
    onRemove: (member) => setRemovingMember({ userId: member.userId, email: member.email }),
  };

  // Roles and Activity keep the live implementations: they carry real role CRUD and
  // their own paginated audit fetch, which the preview versions deliberately lacked.
  const tabBody = {
    members: <MemberTable data={shellData} handlers={memberHandlers} />,
    invitations: (
      <InvitationsTab
        data={shellData}
        onCancelInvitation={(invitation) => handleCancelInvitation(invitation.inviteId)}
      />
    ),
    roles: <RolesTab roles={roles} meta={rolesMeta} onRefresh={fetchRoles} showFeedback={showFeedback} />,
    matrix: <PermissionsTab data={shellData} />,
    activity: <ActivityLogTab members={members} />,
  }[activeTab];

  return (
    <>
      <TeamShell
        data={shellData}
        actions={
          <>
            <span className="hidden items-center gap-2 text-xs text-dim sm:inline-flex">
              <span className="font-medium text-ink">{role?.roleName || '—'}</span>
              <span className="h-3 w-px bg-line" aria-hidden="true" />
              <span className="tnum">{moduleCount}</span>
            </span>
            <PermissionGate module="user_management" action="create">
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-cta px-3 py-2 text-xs font-semibold text-cta-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <Plus size={14} aria-hidden="true" />
                Invite member
              </button>
            </PermissionGate>
          </>
        }
      >
        {isFallback && <Phase1Banner />}
        {tabBody}
      </TeamShell>

      {/* ── Invite Modal ── */}
      {showInviteModal && (
        <InviteModal
          roles={roles}
          onSubmit={handleInvite}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* ── Edit Role Modal ── */}
      {editingRoleId && (
        <EditRoleModal
          roleId={editingRoleId}
          onClose={() => setEditingRoleId(null)}
          onUpdated={() => {
            setEditingRoleId(null);
            fetchRoles();
            fetchMembers();
            showFeedback('Role updated successfully');
          }}
          onError={(msg) => showFeedback(msg, 'error')}
        />
      )}

      {/* ── Removal Reason Modal ── */}
      {removingMember && (
        <RemovalReasonModal
          memberEmail={removingMember.email}
          onConfirm={(reason) => handleRemove(removingMember.userId, reason)}
          onClose={() => setRemovingMember(null)}
        />
      )}

      {/* ── Suspension Modal ── */}
      {suspensionTarget && (
        <SuspensionModal
          mode={suspensionTarget.mode}
          memberEmail={suspensionTarget.email}
          onConfirm={({ reason, durationDays }) => {
            if (suspensionTarget.mode === 'suspend') {
              return handleSuspend({ userId: suspensionTarget.userId, reason, durationDays });
            }
            return handleUnsuspend({ userId: suspensionTarget.userId, reason });
          }}
          onClose={() => setSuspensionTarget(null)}
        />
      )}

      {/* ── Access Scope Modal ── */}
      {scopeEditorMember && (
        <AccessScopeModal
          member={scopeEditorMember}
          projects={scopeProjects}
          workspaces={scopeWorkspaces}
          selectedProjectIds={scopeProjectIds}
          selectedWorkspaceIds={scopeWorkspaceIds}
          setSelectedProjectIds={setScopeProjectIds}
          setSelectedWorkspaceIds={setScopeWorkspaceIds}
          isLoading={scopeLoading}
          onSave={handleScopeSave}
          onClose={closeScopeEditor}
        />
      )}
    </>
  );
}

// ──────────────────────────────────────
// SUB-COMPONENTS
// ──────────────────────────────────────

/** Single member table row with compact contextual actions */
function AccessScopeModal({
  member,
  projects,
  workspaces,
  selectedProjectIds,
  selectedWorkspaceIds,
  setSelectedProjectIds,
  setSelectedWorkspaceIds,
  isLoading,
  onSave,
  onClose,
}) {
  const toggleValue = (current, value, setter) => {
    if (value === '*') {
      setter(current.includes('*') ? [] : ['*']);
      return;
    }
    const withoutWildcard = current.filter((item) => item !== '*');
    if (withoutWildcard.includes(value)) {
      setter(withoutWildcard.filter((item) => item !== value));
    } else {
      setter([...withoutWildcard, value]);
    }
  };

  const isAllProjects = selectedProjectIds.includes('*');
  const isAllWorkspaces = selectedWorkspaceIds.includes('*');

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-surface rounded-md w-full max-w-3xl shadow-xl border border-line">
        <div className="px-6 py-4 border-b border-line">
          <h3 className="text-lg font-semibold text-ink">Edit Access Scope</h3>
          <p className="text-xs text-dim mt-1">{member.email}</p>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-ink">Projects</h4>
              <button
                className={`text-xs px-2 py-1 rounded border ${isAllProjects ? 'bg-info/10 text-info border-info/20' : 'bg-canvas text-dim border-line'}`}
                onClick={() => toggleValue(selectedProjectIds, '*', setSelectedProjectIds)}
                type="button"
              >
                All Projects
              </button>
            </div>

            <div className="space-y-2 border border-line rounded-lg p-3">
              {isLoading ? (
                <p className="text-xs text-dim">Loading projects...</p>
              ) : projects.length === 0 ? (
                <p className="text-xs text-dim">No projects found.</p>
              ) : (
                projects.map((project) => {
                  const id = project.projectId || project.id;
                  return (
                    <label key={id} className="flex items-start gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        disabled={isAllProjects}
                        checked={!isAllProjects && selectedProjectIds.includes(id)}
                        onChange={() => toggleValue(selectedProjectIds, id, setSelectedProjectIds)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium text-ink">{project.name || project.projectName || id}</span>
                        <span className="block text-[11px] text-dim">{id}</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-ink">Workspaces</h4>
              <button
                className={`text-xs px-2 py-1 rounded border ${isAllWorkspaces ? 'bg-info/10 text-info border-info/20' : 'bg-canvas text-dim border-line'}`}
                onClick={() => toggleValue(selectedWorkspaceIds, '*', setSelectedWorkspaceIds)}
                type="button"
              >
                All Workspaces
              </button>
            </div>

            <div className="space-y-2 border border-line rounded-lg p-3">
              {isLoading ? (
                <p className="text-xs text-dim">Loading workspaces...</p>
              ) : workspaces.length === 0 ? (
                <p className="text-xs text-dim">No workspaces found.</p>
              ) : (
                workspaces.map((workspace) => {
                  const id = workspace.workspaceId || workspace.id;
                  return (
                    <label key={id} className="flex items-start gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        disabled={isAllWorkspaces}
                        checked={!isAllWorkspaces && selectedWorkspaceIds.includes(id)}
                        onChange={() => toggleValue(selectedWorkspaceIds, id, setSelectedWorkspaceIds)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium text-ink">{workspace.title || workspace.name || id}</span>
                        <span className="block text-[11px] text-dim">{id}</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-line flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-line text-sm text-dim hover:bg-canvas"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 rounded-lg bg-cta text-cta-foreground text-sm hover:bg-cta"
          >
            Save Scope
          </button>
        </div>
      </div>
    </div>
  );
}

/* InviteModal extracted to ../components/InviteModal.jsx */

function Phase1Banner() {
  return (
    <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex items-start gap-3">
      <svg className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p className="text-sm font-medium text-warning">Phase 1 Mode</p>
        <p className="text-xs text-warning mt-0.5">
          RBAC is running with permissive defaults. All users currently have Super Admin access.
          Role restrictions will activate when enforcement is enabled.
        </p>
      </div>
    </div>
  );
}

/** Feedback toast banner */
function TeamPageLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-line mx-auto mb-4" />
        <p className="text-sm text-dim">Loading permissions...</p>
      </div>
    </div>
  );
}
