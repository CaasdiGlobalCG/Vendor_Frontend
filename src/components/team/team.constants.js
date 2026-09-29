// ============================================================
// FILE: team.constants.js
// PURPOSE: Single source of tabs, status→tone maps, role treatments, copy and
//          formatters for the permanent Team-page component set.
// CONNECTS TO: every file in components/team/**;
//              mirrors the status vocabulary of rbac/pages/TeamPage.jsx:1292-1297 and
//              the role names of rbac/components/RoleBadge.jsx:15-19.
// ============================================================

// ──────────────────────────────────────
// TABS
// ──────────────────────────────────────

// Mirrors the tab definitions at rbac/pages/TeamPage.jsx:388-393.
export const TABS = [
  { id: 'members', label: 'Members' },
  { id: 'invitations', label: 'Invitations' },
  { id: 'roles', label: 'Roles' },
  { id: 'matrix', label: 'My Permissions' },
  { id: 'activity', label: 'Activity Log' },
];

// ──────────────────────────────────────
// STATUS → TONE
// ──────────────────────────────────────

// Member status vocabulary (TeamPage.jsx:1292-1297).
export const MEMBER_STATUS = { ACTIVE: 'active', INVITED: 'invited', SUSPENDED: 'suspended' };

export const MEMBER_STATUS_TONE = {
  active: { label: 'Active', pill: 'bg-success/10 text-success', dot: 'bg-success' },
  invited: { label: 'Invited', pill: 'bg-warning/10 text-warning', dot: 'bg-warning' },
  suspended: { label: 'Suspended', pill: 'bg-danger/10 text-danger', dot: 'bg-danger' },
  removed: { label: 'Removed', pill: 'bg-surface-hover text-dim', dot: 'bg-dim' },
};

// Invitation status. `isExpired` comes from the API (TeamPage.jsx:603).
export const INVITATION_TONE = {
  pending: { label: 'Pending', pill: 'bg-warning/10 text-warning', dot: 'bg-warning' },
  expired: { label: 'Expired', pill: 'bg-danger/10 text-danger', dot: 'bg-danger' },
  accepted: { label: 'Accepted', pill: 'bg-success/10 text-success', dot: 'bg-success' },
};

/** @returns {object} tone record; falls back to a neutral, never-coloured record */
export function memberTone(status) {
  return MEMBER_STATUS_TONE[status] || { label: status || 'Unknown', pill: 'bg-surface-hover text-dim', dot: 'bg-dim' };
}

/**
 * Invitation tone. Expiry wins over the stored status, matching the live page's
 * precedence (TeamPage.jsx:603 renders `isExpired` as the danger case).
 */
export function invitationTone(invitation) {
  if (invitation?.isExpired) return INVITATION_TONE.expired;
  return INVITATION_TONE[invitation?.status] || INVITATION_TONE.pending;
}

// ──────────────────────────────────────
// ROLE TREATMENTS
// ──────────────────────────────────────

// The live RoleBadge maps super_admin, sales_admin, manager and member to the SAME
// grey (RoleBadge.jsx:15-19), so four distinct roles are visually identical. These
// treatments separate them using opacity steps, weight and a marker — no new hues,
// because colour here must not imply status.
export const ROLE_TREATMENT = {
  // NOTE: `text-canvas`, not `text-paper` — `paper` has no Tailwind token (only
  // `op-paper` exists, tailwind.config.js:92), so `text-paper` is a no-op and would
  // leave black text on `bg-ink`. `canvas` inverts correctly against `ink`.
  super_admin: { label: 'Super Admin', className: 'bg-ink text-canvas border-ink', marker: '◆' },
  admin: { label: 'Admin', className: 'bg-ink/85 text-canvas border-ink/85', marker: '◆' },
  sales_admin: { label: 'Sales Admin', className: 'bg-surface-hover text-ink border-line', marker: '●' },
  manager: { label: 'Manager', className: 'bg-surface-hover text-ink border-line', marker: '○' },
  member: { label: 'Member', className: 'bg-canvas text-dim border-line', marker: '·' },
  viewer: { label: 'Viewer', className: 'bg-canvas text-dim border-line', marker: '·' },
};

/** @returns {object} role treatment; unknown roles fall back to a neutral chip */
export function roleTreatment(roleName) {
  const key = String(roleName || '').trim().toLowerCase().replace(/\s+/g, '_');
  return ROLE_TREATMENT[key] || { label: roleName || 'Role', className: 'bg-canvas text-dim border-line', marker: '·' };
}

// ──────────────────────────────────────
// FORMATTERS
// ──────────────────────────────────────

/**
 * Date for display. Returns an em dash rather than "Invalid Date".
 * @param {Date|string|number} value
 */
export function formatDate(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Relative time. Mirrors TeamPage.jsx:1345-1361 — and fixes the divergence with
 * ActivityLogTab.jsx:477-492, which returns '' where TeamPage returns '—'.
 * @param {Date|string|number} value
 */
export function timeAgo(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/**
 * Initials for an avatar, at most two characters. Same behaviour as
 * components/vendor-header/header.constants.js `initialsOf`.
 * @param {string} [name]
 */
export function initialsOf(name) {
  const value = String(name || '').trim();
  if (!value) return '?';
  const parts = value.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

// ──────────────────────────────────────
// COPY
// ──────────────────────────────────────

export const COPY = {
  eyebrow: 'Team & Permissions',
  title: 'Team',
  description: 'Manage who can access your organisation, what they can do, and what has changed.',
  invite: 'Invite member',
  refresh: 'Refresh',
  searchMembers: 'Search by name or email',
  filterStatus: 'Status',
  allStatuses: 'All statuses',
  clearFilters: 'Clear filters',
  noMembers: 'No team members yet',
  noMembersHint: 'Invite a colleague to give them access to your organisation.',
  noMembersMatch: 'No members match these filters',
  noMembersMatchHint: 'Try a different search term or status.',
  noInvitations: 'No pending invitations',
  noInvitationsHint: 'Invitations you send appear here until they are accepted.',
  noRoles: 'No roles defined',
  noActivity: 'No activity recorded',
  noActivityHint: 'Role and member changes are logged here as they happen.',
  loadFailed: 'Could not load',
  loadFailedHint: 'The request failed. Try refreshing.',
  retry: 'Retry',
  loading: 'Loading',
  member: 'Member',
  role: 'Role',
  status: 'Status',
  joined: 'Joined',
  access: 'Access',
  actions: 'Actions',
  email: 'Email',
  invited: 'Invited',
  expires: 'Expires',
  cancelInvitation: 'Cancel',
  permissions: 'Permissions',
  level: 'Level',
  members: 'members',
  // Panel titles
  membersTitle: 'Team members',
  invitations: 'Invitations',
  roles: 'Roles',
  permissionsTitle: 'Permissions',
  activityTitle: 'Activity',
  action: 'Action',
  actor: 'Actor',
  when: 'When',
  detail: 'Detail',
  previewDisabled: 'Disabled in preview',
  previewNotice: 'Read-only preview — actions are disabled so real team data is not changed.',
};
