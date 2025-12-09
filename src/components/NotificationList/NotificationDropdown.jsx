import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import NotificationItem from './NotificationItem';

const NotificationDropdown = () => {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error, 
    showNotificationDropdown, 
    closeNotificationDropdown,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();
  
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeNotificationDropdown();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeNotificationDropdown]);
  
  // Handle notification item actions
  const handleMarkAsRead = (id) => {
    markAsRead(id);
  };
  
  const handleDelete = (id) => {
    deleteNotification(id);
  };
  
  // Dummy functions for now
  const handleMarkImportant = (id) => {
    console.log('Mark as important:', id);
  };
  
  const handleSave = (id) => {
    console.log('Save notification:', id);
  };
  
  // Log state for debugging
  console.log("NotificationDropdown - State:", { 
    showNotificationDropdown, 
    notificationsCount: notifications.length, 
    unreadCount, 
    isLoading, 
    error 
  });
  
  if (!showNotificationDropdown) {
    return null;
  }
  
  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg overflow-hidden z-50"
      style={{ maxHeight: '80vh', overflowY: 'auto' }}
    >
      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-700">Notifications</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{unreadCount} unread</span>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <svg className="animate-spin h-5 w-5 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading notifications...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            Error loading notifications: {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No notifications to display
          </div>
        ) : (
          // Always show available notifications
          [...notifications.filter(n => !n.isRead), ...notifications.filter(n => n.isRead)]
            .slice(0, 5)
            .map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onDelete={handleDelete}
                onMarkImportant={handleMarkImportant}
                onSave={handleSave}
                onMarkRead={handleMarkAsRead}
              />
            ))
        )}
      </div>
      
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
        <Link 
          to="/notifications" 
          className="text-sm text-blue-600 hover:text-blue-800"
          onClick={closeNotificationDropdown}
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
};

export default NotificationDropdown;