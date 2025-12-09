import React, { useState, useRef, useEffect, useContext } from "react";
import { Link } from 'react-router-dom'; // Import Link
import NotificationItem from "./NotificationItem";
import { ArrowPathIcon } from '@heroicons/react/24/solid'; // For loading indicator
import { NotificationContext } from "../../context/NotificationContext";
import config from '../../config/env';
// --- Define API Base URL ---
// Define base URL for API calls
const API_BASE_URL = '${config.VENDOR_BACKEND_URL}';

export default function NotificationList() {
  const {
    notifications,
    loading,
    error,
    deleteNotification,
    toggleImportance,
    toggleSaveNotification,
    markAsRead,
    clearAllNotifications,
    refreshNotifications
  } = useContext(NotificationContext);

  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null); // Ref for the filter dropdown container

  // Apply filter whenever notifications change
  useEffect(() => {
    applyFilter(activeFilter, notifications);
  }, [notifications, activeFilter]);

  // Effect to close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      const toggleButton = filterRef.current?.querySelector('button');
      if (filterRef.current && !filterRef.current.contains(event.target) && toggleButton && !toggleButton.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterRef]);

  // Filtering function
  const applyFilter = (filterType, notifList = notifications) => {
    setActiveFilter(filterType);
    setShowFilterDropdown(false); // Close dropdown after selection
    
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
    saved: 'Saved',
    pending: 'Pending Approval',
    lead: 'Leads',
    client: 'From Client',
    pm: 'From PM',
  };
  const currentFilterLabel = filterLabels[activeFilter] || 'Filter';

  // Render loading state
  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500 flex items-center justify-center gap-2">
        <ArrowPathIcon className="h-5 w-5 animate-spin"/> Loading notifications...
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Notifications</h3>
        <p className="text-red-600 mb-4">{error}</p>
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
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-w-3xl mx-auto">
      <div className="border-b border-gray-200">
        <div className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h2 className="font-['Poppins'] text-xl font-semibold text-gray-800">Notifications</h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none bg-red-100 text-red-800 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={refreshNotifications}
                className="p-2 text-gray-400 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 rounded-full"
                title="Refresh notifications"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="relative" ref={filterRef}>
              <button 
                className="flex items-center bg-[#eff2f2] rounded px-3 py-1.5 text-sm hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                aria-haspopup="true"
                aria-expanded={showFilterDropdown}
              >
                {/* Filter Icon */}
                <div className="w-5 h-5 bg-[url(https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-04-25/YP70cvFxNj.png)] bg-cover bg-no-repeat mr-2"></div>
                <span className="font-['Poppins'] text-sm font-medium text-gray-800">
                  {currentFilterLabel}
                </span>
                {/* Chevron Icon */}
                <div className="w-5 h-5 bg-[url(https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-04-25/qJNGM92kR3.png)] bg-cover bg-no-repeat ml-2"></div>
              </button>
              
              {/* Filter Dropdown Panel */}
              {showFilterDropdown && (
                <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    {Object.entries(filterLabels).map(([key, label]) => (
                      <button
                        key={key}
                        className={`
                          block px-4 py-2 text-left w-full hover:bg-gray-100 font-['Poppins'] text-sm
                          ${key === activeFilter ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'}
                        `}
                        onClick={() => applyFilter(key)}
                        role="menuitem"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Clear All Button */}
            {notifications.length > 0 && (
              <button 
                className="flex items-center bg-[#eff2f2] rounded px-3 py-1.5 text-sm hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 disabled:opacity-50"
                onClick={clearAllNotifications}
                disabled={notifications.length === 0}
                title="Clear all notifications"
              >
                {/* Clear Icon */}
                <div className="w-5 h-5 bg-[url(https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-04-25/W0XSBhnidu.png)] bg-cover bg-no-repeat mr-2"></div>
                <span className="font-['Poppins'] text-sm font-medium text-gray-800">clear all</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* List Container */}
      <div className="notification-list-container">
        {filteredNotifications.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {/* Show a section for pending approval items first */}
            {activeFilter === 'all' && filteredNotifications.some(n => n.isPending) && (
              <div className="bg-red-50 p-2 mb-2">
                <h3 className="text-sm font-semibold text-red-800 px-3">Leads Pending Approval</h3>
                {filteredNotifications.filter(n => n.isPending).map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                    onDelete={deleteNotification}
                    onMarkImportant={toggleImportance}
                    onSave={toggleSaveNotification}
                    onMarkRead={markAsRead}
                  />
                ))}
              </div>
            )}
            
            {/* Display all other notifications */}
            {filteredNotifications
              .filter(n => activeFilter === 'pending' || activeFilter !== 'all' || !n.isPending)
              .map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                  onDelete={deleteNotification}
                  onMarkImportant={toggleImportance}
                  onSave={toggleSaveNotification}
                  onMarkRead={markAsRead}
                />
            ))}
          </ul>
        ) : (
          // Empty State
          <div className="py-12 px-6 text-center">
            <p className="font-['Poppins'] text-sm text-gray-500">
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
