// ============================================================
// FILE: NotificationList.jsx
// PURPOSE: Vendor notifications page body, in the shared "Console" format — hero,
//          stat strip, accessible filter tablist, and a dense list panel with all
//          four async states.
// CONNECTS TO: context/NotificationContext (data + mutations),
//              components/console/ConsoleShell (shell + Tabs + Stats),
//              components/dashboard (Panel), components/ui, ./NotificationItem.
//
// Fixes carried from the previous version:
//   - the header band was `bg-black` with `text-ink` labels — black text on black in
//     light mode (old NotificationList.jsx:119,168,172,176)
//   - the active filter used `text-success` — colour as navigation state (:157)
//   - `client` / `pm` filters matched on badge TEXT and could never match any type in
//     TYPE_META; `saved` was unreachable because nothing can set `isSaved` (:37-56).
//     Those three are gone; `lead` now matches on the real `type` field, not a label.
//   - `unreadCount` was recomputed locally instead of using the context value (:66)
// ============================================================

import { useContext, useMemo, useState } from 'react';
import { BellOff, RefreshCw } from 'lucide-react';
import { NotificationContext } from '../../context/NotificationContext';
import { ConsoleShell } from '../console/ConsoleShell';
import { Panel } from '../dashboard';
import { EmptyState, SkeletonTableRow } from '../ui';
import NotificationItem from './NotificationItem';

// Only filters that can actually match real data. `isImportant` can be true (the
// context derives it from `priority === 'high'`), so it stays.
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'pending', label: 'Action needed' },
  { id: 'important', label: 'Important' },
  { id: 'lead', label: 'Leads' },
];

const COPY = {
  eyebrow: 'Inbox',
  title: 'Notifications',
  description: 'Everything that needs your attention, and everything that has already happened.',
  empty: 'No notifications yet',
  emptyHint: 'Lead updates, decisions and workspace activity appear here.',
  noMatch: 'Nothing matches this filter',
  noMatchHint: 'Try a different filter.',
  loadFailed: 'Could not load notifications',
  loadFailedHint: 'The request failed. Try refreshing.',
  retry: 'Retry',
  refresh: 'Refresh',
  markAll: 'Mark all as read',
};

/** @returns {boolean} does this notification belong to the given filter? */
function matches(notification, filterId) {
  switch (filterId) {
    case 'unread':
      return !notification.isRead;
    case 'pending':
      return notification.isPending;
    case 'important':
      return notification.isImportant;
    case 'lead':
      // Match the real `type`, not a human-readable badge label.
      return String(notification.type || '').includes('lead');
    default:
      return true;
  }
}

export default function NotificationList() {
  const {
    notifications = [],
    unreadCount = 0,
    isLoading,
    error,
    deleteNotification,
    markAllAsRead,
    markAsRead,
    refreshNotifications,
  } = useContext(NotificationContext);

  const [activeFilter, setActiveFilter] = useState('all');

  const visible = useMemo(
    () => notifications.filter((notification) => matches(notification, activeFilter)),
    [notifications, activeFilter]
  );

  const pendingCount = useMemo(
    () => notifications.filter((notification) => notification.isPending).length,
    [notifications]
  );

  const counts = useMemo(
    () => ({
      all: notifications.length,
      unread: unreadCount,
      pending: pendingCount,
    }),
    [notifications.length, unreadCount, pendingCount]
  );

  const stats = [
    { label: 'Total', value: notifications.length, tone: 'text-ink' },
    { label: 'Unread', value: unreadCount, tone: 'text-warning' },
    { label: 'Action needed', value: pendingCount, tone: 'text-danger' },
    { label: 'Read', value: Math.max(0, notifications.length - unreadCount), tone: 'text-ink' },
  ];

  // Action-needed items lead the "All" view; other filters show a flat list.
  const pending = activeFilter === 'all' ? visible.filter((n) => n.isPending) : [];
  const rest = activeFilter === 'all' ? visible.filter((n) => !n.isPending) : visible;

  const state = error ? 'error' : isLoading && notifications.length === 0 ? 'loading' : 'ready';

  return (
    <ConsoleShell
      eyebrow={COPY.eyebrow}
      title={COPY.title}
      description={COPY.description}
      stats={stats}
      tabs={FILTERS}
      activeTab={activeFilter}
      onTabChange={setActiveFilter}
      counts={counts}
      actions={
        <>
          {typeof markAllAsRead === 'function' && unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              {COPY.markAll}
            </button>
          )}
          <button
            type="button"
            onClick={refreshNotifications}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <RefreshCw size={14} aria-hidden="true" />
            {COPY.refresh}
          </button>
        </>
      }
    >
      <Panel
        title="Inbox"
        meta={visible.length ? `${visible.length}/${notifications.length}` : null}
        state={state}
        emptyTitle={COPY.empty}
        emptyHint={COPY.emptyHint}
        errorHint={error || COPY.loadFailedHint}
        bodyPadded={false}
      >
        {state === 'loading' ? (
          <table className="w-full">
            <tbody>
              <SkeletonTableRow cols={3} />
              <SkeletonTableRow cols={3} />
              <SkeletonTableRow cols={3} />
            </tbody>
          </table>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={notifications.length > 0 ? COPY.noMatch : COPY.empty}
            description={notifications.length > 0 ? COPY.noMatchHint : COPY.emptyHint}
          />
        ) : (
          <>
            {/* Action-needed group. A <section> with its own <ul> — the previous
                version nested <li> inside <li>, which is invalid HTML. */}
            {pending.length > 0 && (
              <section aria-label="Leads pending approval" className="border-b border-line">
                <h2 className="flex items-center gap-2 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger">
                  <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-hidden="true" />
                  Leads pending approval
                  <span className="tnum font-normal">({pending.length})</span>
                </h2>
                <ul>
                  {pending.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onDelete={deleteNotification}
                      onMarkRead={markAsRead}
                    />
                  ))}
                </ul>
              </section>
            )}

            {rest.length > 0 && (
              <ul>
                {rest.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onDelete={deleteNotification}
                    onMarkRead={markAsRead}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </Panel>
    </ConsoleShell>
  );
}
