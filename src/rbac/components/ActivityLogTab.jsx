// ============================================================
// FILE: rbac/components/ActivityLogTab.jsx (Vendor Frontend)
// PURPOSE: Activity / audit log viewer for the Team page.
//          - Super Admin sees ALL org activity
//          - Members see their own activity
//          - Members with user_management:view see lower-level logs
// CONNECTS TO: rbacApi.getAuditLogs, RBACContext
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { getAuditLogs } from '../api/rbacApi';
import { useRBAC } from '../context/RBACContext';

// ── Human-readable action labels ──
const ACTION_LABELS = {
  MEMBER_INVITED:  'Invited a member',
  ROLE_CHANGED:    'Changed a member\'s role',
  MEMBER_REMOVED:  'Removed a member',
  ROLE_CREATED:    'Created a new role',
  ROLE_UPDATED:    'Updated a role',
  ROLE_DELETED:    'Deleted a role',
  INVITE_ACCEPTED: 'Accepted an invitation',
};

// ── Action icon colors for visual distinction ──
const ACTION_COLORS = {
  MEMBER_INVITED:  'bg-blue-100 text-blue-600',
  ROLE_CHANGED:    'bg-amber-100 text-amber-600',
  MEMBER_REMOVED:  'bg-red-100 text-red-600',
  ROLE_CREATED:    'bg-green-100 text-green-600',
  ROLE_UPDATED:    'bg-indigo-100 text-indigo-600',
  ROLE_DELETED:    'bg-red-100 text-red-600',
  INVITE_ACCEPTED: 'bg-teal-100 text-teal-600',
};

const ACTION_OPTIONS = [
  'MEMBER_INVITED', 'ROLE_CHANGED', 'MEMBER_REMOVED',
  'ROLE_CREATED', 'ROLE_UPDATED', 'ROLE_DELETED', 'INVITE_ACCEPTED',
];

const PAGE_SIZE = 25;

/**
 * ActivityLogTab — self-contained audit log viewer.
 * Fetches logs from the backend with pagination and action-type filtering.
 *
 * @param {{ members: Array }} props — member list for user lookup
 */
export default function ActivityLogTab({ members = [] }) {
  const { role } = useRBAC();
  const isSuperAdmin = role?.isSuperAdmin;

  // ── Data state ──
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastKey, setLastKey] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Filter state ──
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  // ── Build email lookup map ──
  const emailMap = {};
  for (const m of members) {
    if (m.userId && m.email) emailMap[m.userId] = m.email;
  }

  /**
   * Fetch first page of logs.
   */
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit: PAGE_SIZE };
      if (actionFilter) params.action = actionFilter;
      if (userFilter) params.userId = userFilter;

      const data = await getAuditLogs(params);
      setLogs(data.logs || []);
      setLastKey(data.lastKey || null);
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('[ActivityLog] fetch error:', err);
      setError(err.message || 'Failed to load activity logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, userFilter]);

  /**
   * Load next page (append).
   */
  const loadMore = async () => {
    if (!lastKey || loadingMore) return;
    try {
      setLoadingMore(true);
      const params = { limit: PAGE_SIZE, lastKey };
      if (actionFilter) params.action = actionFilter;
      if (userFilter) params.userId = userFilter;

      const data = await getAuditLogs(params);
      setLogs((prev) => [...prev, ...(data.logs || [])]);
      setLastKey(data.lastKey || null);
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('[ActivityLog] loadMore error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Render ──
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header + Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Activity Log</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isSuperAdmin
                ? 'All activity across your organisation'
                : 'Your recent activity'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Action type filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
            >
              <option value="">All actions</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
              ))}
            </select>

            {/* User filter — only for Super Admin / those who can see others */}
            {isSuperAdmin && members.length > 0 && (
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white max-w-[200px]"
              >
                <option value="">All members</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.email || m.userId}
                  </option>
                ))}
              </select>
            )}

            {/* Date filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-[11px] border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
            />

            {/* Refresh */}
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="text-[11px] text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content — Table */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500" />
          <span className="ml-3 text-sm text-gray-500">Loading activity...</span>
        </div>
      )}

      {error && (
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={fetchLogs} className="mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="px-6 py-12 text-center">
          <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-gray-500">No activity logs found</p>
          <p className="text-xs text-gray-400 mt-1">Activity will appear here when team actions occur</p>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (() => {
        // Client-side date filter
        const filtered = dateFilter
          ? logs.filter((l) => l.timestamp?.startsWith(dateFilter))
          : logs;

        return filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-[40px]">#</th>
                  <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Initiated By</th>
                  <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((log, idx) => (
                  <LogRow
                    key={log.eventId}
                    log={log}
                    index={idx + 1}
                    emailMap={emailMap}
                    isSelected={selectedLog?.eventId === log.eventId}
                    onSelect={() => setSelectedLog(selectedLog?.eventId === log.eventId ? null : log)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <p className="text-xs text-gray-500">No logs match the selected date</p>
          </div>
        );
      })()}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="px-6 py-3 border-t border-gray-200 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────
// SUB-COMPONENTS
// ──────────────────────────────────────

/** Single audit log table row — compact professional style */
function LogRow({ log, index, emailMap, isSelected, onSelect }) {
  const label = ACTION_LABELS[log.action] || log.action;
  const colorClass = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600';
  // Prefer backend-enriched email, fallback to emailMap, then raw userId
  const actorEmail = log.actorEmail || emailMap[log.userId] || log.userId;
  const actorName = log.actorName || null;
  const details = log.details || {};

  /** Build human-readable detail parts */
  const detailParts = [];
  if (details.email || details.targetEmail) detailParts.push(details.email || details.targetEmail);
  if (details.roleName) detailParts.push(`Role: ${details.roleName}`);
  if (details.oldRoleName && details.newRoleName) detailParts.push(`${details.oldRoleName} → ${details.newRoleName}`);
  if (details.reason) detailParts.push(details.reason);

  return (
    <>
      <tr
        className={`hover:bg-gray-50/60 transition-colors cursor-pointer ${isSelected ? 'bg-teal-50/40' : ''}`}
        onClick={onSelect}
      >
        <td className="px-3 py-1.5 text-[10px] text-gray-400 font-mono">{index}</td>

        {/* Initiated By */}
        <td className="px-3 py-1.5">
          <span className="text-[11px] text-gray-800 font-medium truncate block max-w-[180px]" title={actorEmail}>
            {actorEmail}
          </span>
        </td>

        {/* Action */}
        <td className="px-3 py-1.5">
          <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colorClass}`}>
            {label}
          </span>
        </td>

        {/* Details */}
        <td className="px-3 py-1.5">
          {detailParts.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {detailParts.map((part, i) => (
                <span key={i} className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                  {part}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-gray-400">—</span>
          )}
        </td>

        {/* Timestamp */}
        <td className="px-3 py-1.5 text-right whitespace-nowrap">
          <p className="text-[10px] text-gray-600">{formatTimestamp(log.timestamp)}</p>
          <p className="text-[9px] text-gray-400">{timeAgo(log.timestamp)}</p>
        </td>
      </tr>

      {/* ── Expandable detail panel ── */}
      {isSelected && (
        <tr className="bg-gray-50/80">
          <td colSpan={5} className="px-4 py-3">
            <LogDetailPanel log={log} actorEmail={actorEmail} actorName={actorName} label={label} />
          </td>
        </tr>
      )}
    </>
  );
}

/** Expanded detail panel shown when a row is clicked */
function LogDetailPanel({ log, actorEmail, actorName, label }) {
  const details = log.details || {};

  /** Build a human-readable event description */
  const description = buildEventDescription(log.action, actorEmail, details);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
      {/* Left — Actor info */}
      <div className="space-y-1.5">
        <p className="font-semibold text-gray-700">Event Initiated By</p>
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 space-y-1">
          <p className="text-gray-800"><span className="text-gray-500">Email:</span> {actorEmail}</p>
          {actorName && <p className="text-gray-800"><span className="text-gray-500">Name:</span> {actorName}</p>}
          <p className="text-gray-800"><span className="text-gray-500">User ID:</span> <span className="font-mono text-[10px]">{log.userId}</span></p>
        </div>
      </div>

      {/* Right — Event details */}
      <div className="space-y-1.5">
        <p className="font-semibold text-gray-700">Event Details</p>
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 space-y-1">
          <p className="text-gray-800"><span className="text-gray-500">Action:</span> {label}</p>
          <p className="text-gray-800"><span className="text-gray-500">When:</span> {formatTimestamp(log.timestamp)}</p>
          {details.targetEmail && <p className="text-gray-800"><span className="text-gray-500">Target member:</span> {details.targetEmail}</p>}
          {details.email && !details.targetEmail && <p className="text-gray-800"><span className="text-gray-500">Member:</span> {details.email}</p>}
          {details.roleName && <p className="text-gray-800"><span className="text-gray-500">Role:</span> {details.roleName}</p>}
          {details.oldRoleName && details.newRoleName && (
            <p className="text-gray-800"><span className="text-gray-500">Role change:</span> {details.oldRoleName} → {details.newRoleName}</p>
          )}
          {details.reason && <p className="text-gray-800"><span className="text-gray-500">Reason:</span> {details.reason}</p>}
          {details.displayName && <p className="text-gray-800"><span className="text-gray-500">Display name:</span> {details.displayName}</p>}
        </div>
      </div>

      {/* Full-width description */}
      <div className="sm:col-span-2">
        <p className="text-gray-600 bg-white border border-gray-200 rounded-lg p-2.5 italic">
          {description}
        </p>
      </div>
    </div>
  );
}

/**
 * Build a plain-English description of what happened.
 * @param {string} action - The audit action type
 * @param {string} actorEmail - The actor's email
 * @param {object} details - The event details object
 * @returns {string}
 */
function buildEventDescription(action, actorEmail, details) {
  const target = details.targetEmail || details.email || 'a member';
  const role = details.roleName || details.newRoleName || '';

  switch (action) {
    case 'MEMBER_INVITED':
      return `${actorEmail} invited ${target}${role ? ` with the role "${role}"` : ''} to join the organisation.`;
    case 'ROLE_CHANGED':
      return details.oldRoleName && details.newRoleName
        ? `${actorEmail} changed ${target || 'a member'}'s role from "${details.oldRoleName}" to "${details.newRoleName}".`
        : `${actorEmail} changed a member's role.`;
    case 'MEMBER_REMOVED':
      return `${actorEmail} removed ${target} from the organisation.`;
    case 'ROLE_CREATED':
      return `${actorEmail} created a new role${role ? ` called "${role}"` : ''}.`;
    case 'ROLE_UPDATED':
      return `${actorEmail} updated the role${role ? ` "${role}"` : ''}.`;
    case 'ROLE_DELETED':
      return `${actorEmail} deleted the role${role ? ` "${role}"` : ''}.`;
    case 'INVITE_ACCEPTED':
    case 'INVITATION_ACCEPTED':
      return `${target} accepted the invitation and joined the organisation${role ? ` as "${role}"` : ''}.`;
    default:
      return `${actorEmail} performed action: ${action}.`;
  }
}

/** Format ISO timestamp to readable date + time */
function formatTimestamp(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/** Convert ISO timestamp to relative time */
function timeAgo(iso) {
  if (!iso) return '';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  } catch {
    return '';
  }
}
