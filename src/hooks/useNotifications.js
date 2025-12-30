import { useContext } from 'react';
import { VendorContext } from '../context/VendorContext';
import useWebSocketNotifications from './useWebSocketNotifications';

/**
 * Custom hook to manage notifications for the current user
 * Wraps useWebSocketNotifications and provides a clean interface
 */
export const useNotifications = () => {
  const { currentUser } = useContext(VendorContext);
  
  const {
    notifications,
    unreadCount,
    isConnected,
    markNotificationAsRead,
    markAllAsRead,
    fetchNotifications
  } = useWebSocketNotifications(currentUser?.vendorId, 'vendor');

  const markAsRead = (notificationId) => {
    if (notificationId) {
      markNotificationAsRead(notificationId);
    }
  };

  return {
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
    isConnected,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  };
};

export default useNotifications;
