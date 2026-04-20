import React, { useState, useEffect, useContext } from "react";
import NotificationItem from "./NotificationItem";
import { ArrowPathIcon } from '@heroicons/react/24/solid'; // For loading indicator
import { NotificationContext } from "../../context/NotificationContext";

export default function NotificationList() {
  const {
    notifications,
    isLoading,
    error,
    deleteNotification,
    markAllAsRead,
    markAsRead,
    refreshNotifications
  } = useContext(NotificationContext);

  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');

  // Apply filter whenever notifications change
  useEffect(() => {
    applyFilter(activeFilter, notifications);
  }, [notifications, activeFilter]);

  // Filtering function
  const applyFilter = (filterType, notifList = notifications) => {
    setActiveFilter(filterType);
    
    let result = [];
    switch(filterType) {
      case 'unread':
        result = notifList.filter(notification => !notification.isRead);
        break;
      case 'important':
        result = notifList.filter(notification => notification.isImportant);
        break;
      case 'saved':
        result = notifList.filter(notification => notification.isSaved);
        break;
      case 'pending':
        result = notifList.filter(notification => notification.isPending);
        break;
      case 'client':
        result = notifList.filter(notification =>
          notification.badge && notification.badge.text.toLowerCase().includes('client')
        );
        break;
      case 'pm':
        result = notifList.filter(notification =>
          notification.badge && notification.badge.text.toLowerCase().includes('manager')
        );
        break;
      case 'lead':
        result = notifList.filter(notification =>
          notification.badge && notification.badge.text.toLowerCase().includes('lead')
        );
        break;
      case 'all':
      default:
        result = [...notifList];
    }
    setFilteredNotifications(result);
  };

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Filter labels mapping for display
  const filterLabels = {
    all: 'All notifications',
    unread: 'Unread',
    important: 'Important',
    pending: 'Pending Approval',
    lead: 'Leads',
    client: 'From Client',
    pm: 'From PM',
  };
  const currentFilterLabel = filterLabels[activeFilter] || 'Filter';
  const pendingCount = notifications.filter(n => n.isPending).length;

  // Render loading state
  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
        <ArrowPathIcon className="h-5 w-5 animate-spin"/> Loading notifications...
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-red-700">Error Loading Notifications</h3>
        <p className="mb-4 text-red-600">{error}</p>
        <button 
          onClick={refreshNotifications} 
          className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl overflow-visible rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-emerald-200/30 bg-gradient-to-r from-[#095B49] via-[#0D7A71] to-[#000000] px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-white">Notifications</h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/12 px-2.5 py-1 text-xs font-semibold text-white">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-emerald-50/80">
              {pendingCount > 0
                ? `${pendingCount} item${pendingCount === 1 ? '' : 's'} need attention.`
                : 'Everything is up to date.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {typeof markAllAsRead === 'function' && unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                Mark all as read
              </button>
            )}
            <div className="flex items-center gap-2 rounded-xl bg-white/10 p-1">
              <button 
                onClick={refreshNotifications}
                className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/15 hover:text-white"
                title="Refresh notifications"
              >
                <ArrowPathIcon className="mr-2 h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {Object.entries(filterLabels).map(([key, label]) => {
            const isActive = key === activeFilter;
            return (
              <button
                key={key}
                type="button"
                onClick={() => applyFilter(key)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${isActive ? 'border-white/20 bg-white text-[#095B49] shadow-sm' : 'border-white/15 bg-white/8 text-white/90 hover:bg-white/15 hover:text-white'}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {notifications.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-50/70">Total</p>
              <p className="mt-2 text-2xl font-semibold text-white">{notifications.length}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-50/70">Unread</p>
              <p className="mt-2 text-2xl font-semibold text-white">{unreadCount}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-50/70">Action Needed</p>
              <p className="mt-2 text-2xl font-semibold text-white">{pendingCount}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* List Container */}
      <div className="bg-slate-50/60 px-3 py-3 sm:px-4 sm:py-4">
        {filteredNotifications.length > 0 ? (
          <ul className="space-y-3">
            {/* Show a section for pending approval items first */}
            {activeFilter === 'all' && filteredNotifications.some(n => n.isPending) && (
              <li className="rounded-2xl border border-red-200 bg-red-50 p-3">
                <h3 className="px-2 text-sm font-semibold text-red-800">Leads Pending Approval</h3>
                {filteredNotifications.filter(n => n.isPending).map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                    onDelete={deleteNotification}
                    onMarkImportant={() => {}}
                    onSave={() => {}}
                    onMarkRead={markAsRead}
                  />
                ))}
              </li>
            )}
            
            {/* Display all other notifications */}
            {filteredNotifications
              .filter(n => activeFilter === 'pending' || activeFilter !== 'all' || !n.isPending)
              .map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                  onDelete={deleteNotification}
                  onMarkImportant={() => {}}
                  onSave={() => {}}
                  onMarkRead={markAsRead}
                />
            ))}
          </ul>
        ) : (
          // Empty State
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              {notifications.length > 0
                ? `No notifications match the "${currentFilterLabel.toLowerCase()}" filter.`
                : 'You have no notifications yet.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
