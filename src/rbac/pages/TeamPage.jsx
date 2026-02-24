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

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useRBAC } from '../context/RBACContext';
import { VendorContext } from '../../context/VendorContext';
import { RoleBadge } from '../components/RoleBadge';
import { EditablePermissionMatrix } from '../components/EditablePermissionMatrix';
import { PermissionGate } from '../components/PermissionGate';
import { InviteModal } from '../components/InviteModal';
import RolesTab from '../components/RolesTab';
import {
  listMembers,
  inviteMember,
  changeMemberRole,
  removeMember,
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
  const { role, isFallback, permissions, isLoading, accessibleModules, refresh: refreshRBAC } = useRBAC();
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

  // ── Invite modal state ──
  const [showInviteModal, setShowInviteModal] = useState(false);

  // ── Role change state ──
  const [changingRoleFor, setChangingRoleFor] = useState(null);
  const [newRoleId, setNewRoleId] = useState('');

  // ── Remove confirmation state ──
  const [removingMember, setRemovingMember] = useState(null);

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
  const handleInvite = async ({ email, roleId, message, permissionOverrides }) => {
    try {
      await inviteMember({ email, roleId, message, permissionOverrides });
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

  // ── Handle member removal ──
  const handleRemove = async (userId) => {
    try {
      await removeMember(userId);
      showFeedback('Member removed');
      setRemovingMember(null);
      fetchMembers();
    } catch (err) {
      showFeedback(err.message, 'error');
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

  // Loading state — shown while RBAC context is fetching
  if (isLoading) {
    return <TeamPageLoading />;
  }

  const moduleCount = permissions.includes('*:*')
    ? 'All Modules'
    : `${accessibleModules.length} modules`;

  const assignableRoles = roles.filter((r) => r.canAssign);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 font-['Poppins']">
            Team & Permissions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your organization's team members and access controls
          </p>
        </div>
        <PermissionGate module="user_management" action="create">
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg
                       flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Invite Member
          </button>
        </PermissionGate>
      </div>

      {/* ── Feedback Toast ── */}
      {feedback && <FeedbackBanner message={feedback.msg} type={feedback.type} />}

      {/* ── Phase 1 Indicator ── */}
      {isFallback && <Phase1Banner />}

      {/* ── Your Access Card ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Your Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <InfoBlock label="Account" value={currentUser?.email || '—'} />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Role</p>
            <RoleBadge roleId={role?.roleId} roleName={role?.roleName} />
          </div>
          <InfoBlock label="Modules Accessible" value={moduleCount} />
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 px-1" aria-label="Team management tabs">
          {[
            { key: 'members', label: 'Members', count: members.length },
            { key: 'invitations', label: 'Invitations', count: invitations.length },
            { key: 'roles', label: 'Roles', count: roles.length },
            { key: 'matrix', label: 'My Permissions' },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === key
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {label}
              {count != null && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full
                  ${activeTab === key ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-500'}`}>
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
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
              <p className="text-xs text-gray-500 mt-1">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={fetchMembers} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
              Refresh
            </button>
          </div>

          {membersLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading members...</p>
            </div>
          ) : membersError ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600 mb-2">{membersError}</p>
              <button onClick={fetchMembers} className="text-xs text-teal-600 hover:underline">Try again</button>
            </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No members found. Invite someone to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Email</th>
                  <th className="px-6 py-3 text-left font-medium">Role</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">Joined</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((member) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    currentUserId={role?.userId || currentUser?.sub}
                    assignableRoles={assignableRoles}
                    changingRoleFor={changingRoleFor}
                    setChangingRoleFor={setChangingRoleFor}
                    newRoleId={newRoleId}
                    setNewRoleId={setNewRoleId}
                    onRoleChange={handleRoleChange}
                    removingMember={removingMember}
                    setRemovingMember={setRemovingMember}
                    onRemove={handleRemove}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <PermissionGate module="user_management" action="view">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
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
              <div className="overflow-x-auto">
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
            )}
          </div>
        </PermissionGate>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6">
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
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Permission Matrix</h2>
            <p className="text-xs text-gray-500 mt-1">
              Your current access levels across all modules
            </p>
          </div>
          <EditablePermissionMatrix permissions={permissions} editable={false} />
        </div>
      )}

      {/* ── Invite Modal ── */}
      {showInviteModal && (
        <InviteModal
          roles={roles}
          onSubmit={handleInvite}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────
// SUB-COMPONENTS
// ──────────────────────────────────────

/** Single member table row with inline role change + remove actions */
function MemberRow({
  member, currentUserId, assignableRoles,
  changingRoleFor, setChangingRoleFor, newRoleId, setNewRoleId, onRoleChange,
  removingMember, setRemovingMember, onRemove,
}) {
  const isSelf = member.userId === currentUserId;
  const isInvited = member.status === 'invited';

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-900">{member.email}</span>
          {isSelf && <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-medium">You</span>}
        </div>
      </td>
      <td className="px-6 py-3">
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
            <button onClick={() => onRoleChange(member.userId)} className="text-xs text-teal-600 hover:text-teal-700 font-medium">Save</button>
            <button onClick={() => setChangingRoleFor(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        ) : (
          <RoleBadge roleId={member.roleId} roleName={member.roleName} size="sm" />
        )}
      </td>
      <td className="px-6 py-3">
        <StatusBadge status={member.status} />
      </td>
      <td className="px-6 py-3 text-xs">
        {isInvited ? (
          <>
            <span className="text-amber-600">{timeAgo(member.joinedAt || member.createdAt)}</span>
            <span className="block text-gray-400 text-[10px]">Invited {formatDate(member.joinedAt || member.createdAt)}</span>
          </>
        ) : (
          <span className="text-gray-500">{formatDate(member.joinedAt)}</span>
        )}
      </td>
      <td className="px-6 py-3 text-right">
        {!isSelf && !isInvited && (
          <div className="flex items-center gap-2 justify-end">
            {removingMember === member.userId ? (
              <>
                <span className="text-xs text-red-600">Remove?</span>
                <button onClick={() => onRemove(member.userId)} className="text-xs text-red-600 font-medium hover:text-red-700">Yes</button>
                <button onClick={() => setRemovingMember(null)} className="text-xs text-gray-400 hover:text-gray-600">No</button>
              </>
            ) : (
              <>
                <PermissionGate module="user_management" action="edit">
                  <button
                    onClick={() => { setChangingRoleFor(member.userId); setNewRoleId(member.roleId); }}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Change Role
                  </button>
                </PermissionGate>
                <PermissionGate module="user_management" action="edit">
                  <button
                    onClick={() => setRemovingMember(member.userId)}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Remove
                  </button>
                </PermissionGate>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

/* InviteModal extracted to ../components/InviteModal.jsx */

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
