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

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 px-3 py-5 sm:px-5 sm:py-6 lg:px-8 xl:px-10">
      {/* ── Page Header ── */}
      <div className="rounded-2xl border border-emerald-200/20 bg-gradient-to-r from-[#095B49] via-[#0A5F4B] to-[#000000] px-4 py-5 shadow-[0_16px_40px_rgba(6,95,70,0.22)] sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/90">Administration</p>
            <h1 className="mt-1 text-xl font-semibold text-white font-['Poppins'] sm:text-2xl">Team & Permissions</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/95">
              Control who can access what, assign the right roles, and keep governance clear as your SaaS team scales.
            </p>
          </div>
          <PermissionGate module="user_management" action="create">
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/20 bg-black/30 px-4 py-2 text-sm font-medium text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:bg-black/40 sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Invite Member
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* ── Feedback Toast ── */}
      {feedback && <FeedbackBanner message={feedback.msg} type={feedback.type} />}

      {/* ── Phase 1 Indicator ── */}
      {isFallback && <Phase1Banner />}

      {/* ── Team Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total Members" value={memberStats.total} tone="teal" />
        <StatTile label="Active" value={memberStats.active} tone="green" />
        <StatTile label="Invited" value={memberStats.invited} tone="amber" />
        <StatTile label="Suspended" value={memberStats.suspended} tone="red" />
      </div>

      {/* ── Your Access Card ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium text-gray-900">Your Access</h2>
          <span className="inline-flex w-fit items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
            Authority Level {role?.roleLevel ?? '—'}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          <InfoBlock label="Account" value={currentUser?.email || '—'} />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Role</p>
            <RoleBadge roleId={role?.roleId} roleName={role?.roleName} />
          </div>
          <InfoBlock label="Modules Accessible" value={moduleCount} />
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        <nav className="flex w-max min-w-full gap-2" aria-label="Team management tabs">
          {[
            { key: 'members', label: 'Members', count: members.length },
            { key: 'invitations', label: 'Invitations', count: invitations.length },
            { key: 'roles', label: 'Roles', count: roles.length },
            { key: 'matrix', label: 'My Permissions' },
            { key: 'activity', label: 'Activity Log' },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors
                ${activeTab === key
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm'
                  : 'border-transparent text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                }`}
            >
              {label}
              {count != null && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs
                  ${activeTab === key ? 'bg-white text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab Content ── */}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-4 sm:px-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
              <p className="text-xs text-gray-500 mt-1">
                {filteredMembers.length} of {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <div className="relative">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search by email or role"
                  className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:min-w-[220px] sm:rounded-lg sm:h-9"
                />
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.85-5.65a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
                </svg>
              </div>

              <select
                value={memberStatusFilter}
                onChange={(e) => setMemberStatusFilter(e.target.value)}
                className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:h-9 sm:rounded-lg"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="suspended">Suspended</option>
              </select>

              <button
                onClick={fetchMembers}
                className="h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold uppercase tracking-wide text-emerald-700 transition-colors hover:bg-emerald-100 sm:h-9 sm:rounded-lg"
              >
                Refresh
              </button>
            </div>
          </div>

          {membersLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading members...</p>
            </div>
          ) : membersError ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600 mb-2">{membersError}</p>
              <button onClick={fetchMembers} className="text-xs text-emerald-700 hover:underline">Try again</button>
            </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No members found. Invite someone to get started.
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-gray-700">No members match your current filters.</p>
            <button
              onClick={() => {
                setMemberSearch('');
                setMemberStatusFilter('all');
              }}
              className="mt-2 text-xs font-medium text-emerald-700 hover:text-emerald-800"
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          <>
          <div className="space-y-3 p-4 sm:p-6 md:hidden">
            {filteredMembers.map((member) => (
              <MemberCard
                key={member.userId}
                member={member}
                currentUserId={userId || currentUser?.sub}
                assignableRoles={assignableRoles}
                changingRoleFor={changingRoleFor}
                setChangingRoleFor={setChangingRoleFor}
                newRoleId={newRoleId}
                setNewRoleId={setNewRoleId}
                onRoleChange={handleRoleChange}
                onSuspend={(uid, email) => setSuspensionTarget({ userId: uid, email, mode: 'suspend' })}
                onUnsuspend={(uid, email) => setSuspensionTarget({ userId: uid, email, mode: 'unsuspend' })}
                onStartRemove={(uid, email) => setRemovingMember({ userId: uid, email })}
                onEditRole={setEditingRoleId}
                onEditScopes={openScopeEditor}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 text-[11px] uppercase">
                <tr>
                  <th className="w-[30%] px-4 py-3 text-left font-medium lg:px-5">Member</th>
                  <th className="w-[15%] px-4 py-3 text-left font-medium lg:px-5">Role</th>
                  <th className="w-[20%] px-4 py-3 text-left font-medium lg:px-5">Access Scope</th>
                  <th className="w-[12%] px-4 py-3 text-left font-medium lg:px-5">Status</th>
                  <th className="w-[13%] px-4 py-3 text-left font-medium lg:px-5">Joined</th>
                  <th className="w-[10%] px-4 py-3 text-right font-medium lg:px-5">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMembers.map((member, index) => (
                  <MemberRow
                    key={member.userId}
                    rowIndex={index}
                    member={member}
                    currentUserId={userId || currentUser?.sub}
                    assignableRoles={assignableRoles}
                    changingRoleFor={changingRoleFor}
                    setChangingRoleFor={setChangingRoleFor}
                    newRoleId={newRoleId}
                    setNewRoleId={setNewRoleId}
                    onRoleChange={handleRoleChange}
                    onSuspend={(uid, email) => setSuspensionTarget({ userId: uid, email, mode: 'suspend' })}
                    onUnsuspend={(uid, email) => setSuspensionTarget({ userId: uid, email, mode: 'unsuspend' })}
                    onStartRemove={(uid, email) => setRemovingMember({ userId: uid, email })}
                    onEditRole={setEditingRoleId}
                    onEditScopes={openScopeEditor}
                  />
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <PermissionGate module="user_management" action="view">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Pending Invitations</h2>
              <p className="text-xs text-gray-500 mt-1">
                {invitations.length} pending
              </p>
            </div>
            {invitationsLoading ? (
              <div className="p-6 text-center text-sm text-gray-500">Loading...</div>
            ) : invitations.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No pending invitations</div>
            ) : (
              <>
              <div className="space-y-3 p-4 sm:p-6 md:hidden">
                {invitations.map((inv) => (
                  <InvitationCard
                    key={inv.inviteId}
                    invitation={inv}
                    onCancel={handleCancelInvitation}
                  />
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">Email</th>
                      <th className="px-6 py-3 text-left font-medium">Role</th>
                      <th className="px-6 py-3 text-left font-medium">Sent</th>
                      <th className="px-6 py-3 text-left font-medium">Status</th>
                      <th className="px-6 py-3 text-left font-medium">Expires</th>
                      <th className="px-6 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invitations.map((inv) => (
                      <tr key={inv.inviteId} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-900">{inv.email}</td>
                        <td className="px-6 py-3"><RoleBadge roleId={inv.roleId} roleName={inv.roleName} size="sm" /></td>
                        <td className="px-6 py-3">
                          <span className="text-gray-900 text-xs">{timeAgo(inv.createdAt)}</span>
                          <span className="block text-gray-400 text-[10px]">{formatDate(inv.createdAt)}</span>
                        </td>
                        <td className="px-6 py-3">
                          {inv.isExpired ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200">Expired</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-500 text-xs">{formatDate(inv.expiresAt)}</td>
                        <td className="px-6 py-3 text-right">
                          <PermissionGate module="user_management" action="edit">
                            <button
                              onClick={() => handleCancelInvitation(inv.inviteId)}
                              className="text-xs text-red-600 hover:text-red-700 hover:underline font-medium"
                            >
                              Cancel
                            </button>
                          </PermissionGate>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </PermissionGate>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <RolesTab
            roles={roles}
            meta={rolesMeta}
            onRefresh={fetchRoles}
            showFeedback={showFeedback}
          />
        </div>
      )}

      {/* My Permissions Tab */}
      {activeTab === 'matrix' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Permission Matrix</h2>
            <p className="text-xs text-gray-500 mt-1">
              Your current access levels across all modules
            </p>
          </div>
          <EditablePermissionMatrix permissions={permissions} editable={false} />
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <ActivityLogTab members={members} />
      )}

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
    </div>
  );
}

// ──────────────────────────────────────
// SUB-COMPONENTS
// ──────────────────────────────────────

/** Single member table row with compact contextual actions */
function MemberRow({
  rowIndex,
  member, currentUserId, assignableRoles,
  changingRoleFor, setChangingRoleFor, newRoleId, setNewRoleId, onRoleChange,
  onSuspend, onUnsuspend, onStartRemove, onEditRole, onEditScopes,
}) {
  const isSelf = member.userId === currentUserId;
  const isInvited = member.status === 'invited';
  const memberInitial = String(member?.email || '?').charAt(0).toUpperCase();
  const isMutedRow = rowIndex % 2 === 1;

  return (
    <tr className={`hover:bg-gray-50/90 transition-colors ${isMutedRow ? 'bg-gray-50/35' : ''}`}>
      <td className="px-4 py-3 lg:px-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-xs font-semibold text-teal-700">
            {memberInitial}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900">{member.email}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {isSelf && <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-medium">You</span>}
              {isInvited && <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium">Pending acceptance</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 lg:px-5">
        {changingRoleFor === member.userId ? (
          <div className="flex items-center gap-2">
            <select
              value={newRoleId}
              onChange={(e) => setNewRoleId(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Select role...</option>
              {assignableRoles.map((r) => (
                <option key={r.roleId} value={r.roleId}>{r.roleName}</option>
              ))}
            </select>
            <button
              onClick={() => onRoleChange(member.userId)}
              className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100"
            >
              Save
            </button>
            <button
              onClick={() => setChangingRoleFor(null)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <RoleBadge roleId={member.roleId} roleName={member.roleName} size="sm" />
        )}
      </td>
      <td className="px-4 py-3 lg:px-5">
        <ScopeSummary
          projectAccess={member.projectAccess}
          workspaceAccess={member.workspaceAccess}
        />
      </td>
      <td className="px-4 py-3 lg:px-5">
        <StatusBadge status={member.status} />
      </td>
      <td className="px-4 py-3 text-xs lg:px-5">
        {isInvited ? (
          <>
            <span className="text-amber-600">{timeAgo(member.joinedAt || member.createdAt)}</span>
            <span className="block text-gray-400 text-[10px]">Invited {formatDate(member.joinedAt || member.createdAt)}</span>
          </>
        ) : (
          <>
            <span className="text-gray-600">{timeAgo(member.joinedAt)}</span>
            <span className="block text-gray-400 text-[10px]">{formatDate(member.joinedAt)}</span>
          </>
        )}
      </td>
      <td className="px-4 py-3 text-right lg:px-5">
        {!isSelf && !isInvited ? (
          <MemberActionsMenu
            member={member}
            changingRoleFor={changingRoleFor}
            setChangingRoleFor={setChangingRoleFor}
            setNewRoleId={setNewRoleId}
            onSuspend={onSuspend}
            onUnsuspend={onUnsuspend}
            onStartRemove={onStartRemove}
            onEditRole={onEditRole}
            onEditScopes={onEditScopes}
          />
        ) : (
          <span className="text-[11px] text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}

function MemberCard({
  member,
  currentUserId,
  assignableRoles,
  changingRoleFor,
  setChangingRoleFor,
  newRoleId,
  setNewRoleId,
  onRoleChange,
  onSuspend,
  onUnsuspend,
  onStartRemove,
  onEditRole,
  onEditScopes,
}) {
  const isSelf = member.userId === currentUserId;
  const isInvited = member.status === 'invited';
  const memberInitial = String(member?.email || '?').charAt(0).toUpperCase();

  return (
    <article className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-white to-gray-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-sm font-semibold text-teal-700">
            {memberInitial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{member.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {isSelf && <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">You</span>}
              {isInvited && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Pending acceptance</span>}
              <StatusBadge status={member.status} />
            </div>
          </div>
        </div>

        {!isSelf && !isInvited ? (
          <MemberActionsMenu
            member={member}
            changingRoleFor={changingRoleFor}
            setChangingRoleFor={setChangingRoleFor}
            setNewRoleId={setNewRoleId}
            onSuspend={onSuspend}
            onUnsuspend={onUnsuspend}
            onStartRemove={onStartRemove}
            onEditRole={onEditRole}
            onEditScopes={onEditScopes}
          />
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Role</p>
          <div className="mt-2">
            {changingRoleFor === member.userId ? (
              <div className="space-y-2">
                <select
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Select role...</option>
                  {assignableRoles.map((role) => (
                    <option key={role.roleId} value={role.roleId}>{role.roleName}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onRoleChange(member.userId)}
                    className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setChangingRoleFor(null)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <RoleBadge roleId={member.roleId} roleName={member.roleName} size="sm" />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Joined</p>
          <div className="mt-2 text-sm">
            {isInvited ? (
              <>
                <span className="font-medium text-amber-600">{timeAgo(member.joinedAt || member.createdAt)}</span>
                <span className="mt-1 block text-[11px] text-gray-400">Invited {formatDate(member.joinedAt || member.createdAt)}</span>
              </>
            ) : (
              <>
                <span className="font-medium text-gray-700">{timeAgo(member.joinedAt)}</span>
                <span className="mt-1 block text-[11px] text-gray-400">{formatDate(member.joinedAt)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-gray-100 bg-white p-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Access scope</p>
        <div className="mt-2">
          <ScopeSummary
            projectAccess={member.projectAccess}
            workspaceAccess={member.workspaceAccess}
          />
        </div>
      </div>
    </article>
  );
}

function InvitationCard({ invitation, onCancel }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-white to-gray-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{invitation.email}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <RoleBadge roleId={invitation.roleId} roleName={invitation.roleName} size="sm" />
            <StatusBadge status="invited" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => onCancel(invitation.inviteId)}
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
        >
          Cancel
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Sent</p>
          <p className="mt-2 text-sm font-medium text-gray-700">{timeAgo(invitation.createdAt)}</p>
          <p className="mt-1 text-[11px] text-gray-400">{formatDate(invitation.createdAt)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Expires</p>
          <p className="mt-2 text-sm font-medium text-gray-700">{formatDate(invitation.expiresAt)}</p>
        </div>
      </div>
    </article>
  );
}

/** Compact row actions menu to avoid rendering all action buttons at once */
function MemberActionsMenu({
  member,
  changingRoleFor,
  setChangingRoleFor,
  setNewRoleId,
  onSuspend,
  onUnsuspend,
  onStartRemove,
  onEditRole,
  onEditScopes,
}) {
  const { can } = usePermission();
  const canEditMembers = can('user_management', 'edit');
  const canManageMembers = can('user_management', 'manage');

  if (!canEditMembers && !canManageMembers) {
    return <span className="text-[11px] text-gray-400">No actions</span>;
  }

  const closeMenu = (event) => {
    const details = event.currentTarget.closest('details');
    if (details) details.removeAttribute('open');
  };

  const runAction = (event, callback) => {
    callback();
    closeMenu(event);
  };

  const actionClass = 'block w-full rounded-md px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50';

  return (
    <details className="relative inline-block text-left">
      <summary className="list-none rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 cursor-pointer [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1">
          Manage
          <svg className="h-3.5 w-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </summary>

      <div className="absolute right-0 z-20 mt-1.5 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-xl">
        {canEditMembers && (
          <button
            type="button"
            onClick={(event) => runAction(event, () => {
              setChangingRoleFor(member.userId);
              setNewRoleId(member.roleId);
            })}
            className={actionClass}
          >
            {changingRoleFor === member.userId ? 'Role editor open' : 'Change role'}
          </button>
        )}

        {canManageMembers && (
          <button
            type="button"
            onClick={(event) => runAction(event, () => onEditRole?.(member.roleId))}
            className={actionClass}
          >
            Edit role template
          </button>
        )}

        {canEditMembers && (
          <button
            type="button"
            onClick={(event) => runAction(event, () => onEditScopes(member))}
            className={actionClass}
          >
            Edit access scope
          </button>
        )}

        {canEditMembers && (member.status === 'suspended' ? (
          <button
            type="button"
            onClick={(event) => runAction(event, () => onUnsuspend(member.userId, member.email))}
            className={actionClass}
          >
            Unsuspend member
          </button>
        ) : (
          <button
            type="button"
            onClick={(event) => runAction(event, () => onSuspend(member.userId, member.email))}
            className={actionClass}
          >
            Suspend member
          </button>
        ))}

        {canEditMembers && (
          <button
            type="button"
            onClick={(event) => runAction(event, () => onStartRemove(member.userId, member.email))}
            className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
          >
            Remove member
          </button>
        )}
      </div>
    </details>
  );
}

function ScopeSummary({ projectAccess, workspaceAccess }) {
  const projects = Array.isArray(projectAccess) ? projectAccess : [];
  const workspaces = Array.isArray(workspaceAccess) ? workspaceAccess : [];

  const projectLabel = projects.includes('*')
    ? 'All projects'
    : projects.length > 0
      ? `${projects.length} project${projects.length > 1 ? 's' : ''}`
      : 'No projects';

  const workspaceLabel = workspaces.includes('*')
    ? 'All workspaces'
    : workspaces.length > 0
      ? `${workspaces.length} workspace${workspaces.length > 1 ? 's' : ''}`
      : 'No workspaces';

  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border bg-blue-50 text-blue-700 border-blue-200 w-fit">
        {projectLabel}
      </span>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border bg-indigo-50 text-indigo-700 border-indigo-200 w-fit">
        {workspaceLabel}
      </span>
    </div>
  );
}

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
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit Access Scope</h3>
          <p className="text-xs text-gray-500 mt-1">{member.email}</p>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Projects</h4>
              <button
                className={`text-xs px-2 py-1 rounded border ${isAllProjects ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                onClick={() => toggleValue(selectedProjectIds, '*', setSelectedProjectIds)}
                type="button"
              >
                All Projects
              </button>
            </div>

            <div className="space-y-2 border border-gray-200 rounded-lg p-3">
              {isLoading ? (
                <p className="text-xs text-gray-500">Loading projects...</p>
              ) : projects.length === 0 ? (
                <p className="text-xs text-gray-500">No projects found.</p>
              ) : (
                projects.map((project) => {
                  const id = project.projectId || project.id;
                  return (
                    <label key={id} className="flex items-start gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        disabled={isAllProjects}
                        checked={!isAllProjects && selectedProjectIds.includes(id)}
                        onChange={() => toggleValue(selectedProjectIds, id, setSelectedProjectIds)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium text-gray-900">{project.name || project.projectName || id}</span>
                        <span className="block text-[11px] text-gray-500">{id}</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Workspaces</h4>
              <button
                className={`text-xs px-2 py-1 rounded border ${isAllWorkspaces ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                onClick={() => toggleValue(selectedWorkspaceIds, '*', setSelectedWorkspaceIds)}
                type="button"
              >
                All Workspaces
              </button>
            </div>

            <div className="space-y-2 border border-gray-200 rounded-lg p-3">
              {isLoading ? (
                <p className="text-xs text-gray-500">Loading workspaces...</p>
              ) : workspaces.length === 0 ? (
                <p className="text-xs text-gray-500">No workspaces found.</p>
              ) : (
                workspaces.map((workspace) => {
                  const id = workspace.workspaceId || workspace.id;
                  return (
                    <label key={id} className="flex items-start gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        disabled={isAllWorkspaces}
                        checked={!isAllWorkspaces && selectedWorkspaceIds.includes(id)}
                        onChange={() => toggleValue(selectedWorkspaceIds, id, setSelectedWorkspaceIds)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium text-gray-900">{workspace.title || workspace.name || id}</span>
                        <span className="block text-[11px] text-gray-500">{id}</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700"
          >
            Save Scope
          </button>
        </div>
      </div>
    </div>
  );
}

/* InviteModal extracted to ../components/InviteModal.jsx */

function StatTile({ label, value, tone = 'teal' }) {
  const tones = {
    teal: 'border-teal-200 bg-teal-50 text-teal-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  };

  return (
    <div className={`rounded-xl border px-4 py-3 shadow-sm ${tones[tone] || tones.teal}`}>
      <p className="text-[11px] uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-semibold leading-none">{value}</p>
    </div>
  );
}

/** Simple label + value block for the access card */
function InfoBlock({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

/** Member status badge */
function StatusBadge({ status }) {
  const styles = {
    active:    'bg-green-50 text-green-700 border-green-200',
    invited:   'bg-amber-50 text-amber-700 border-amber-200',
    suspended: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.active}`}>
      {status || 'active'}
    </span>
  );
}

/** Phase 1 indicator banner */
function Phase1Banner() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
      <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p className="text-sm font-medium text-amber-800">Phase 1 Mode</p>
        <p className="text-xs text-amber-700 mt-0.5">
          RBAC is running with permissive defaults. All users currently have Super Admin access.
          Role restrictions will activate when enforcement is enabled.
        </p>
      </div>
    </div>
  );
}

/** Feedback toast banner */
function FeedbackBanner({ message, type }) {
  const bg = type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700';
  return (
    <div className={`border rounded-lg p-3 text-sm font-medium ${bg}`}>
      {message}
    </div>
  );
}

/** Format ISO date to readable short format */
function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

/** Convert ISO timestamp to human-readable relative time (e.g. "2 hours ago") */
function timeAgo(iso) {
  if (!iso) return '—';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  } catch {
    return '—';
  }
}

/** Loading skeleton for the page */
function TeamPageLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500 mx-auto mb-4" />
        <p className="text-sm text-gray-500">Loading permissions...</p>
      </div>
    </div>
  );
}
