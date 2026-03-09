import React, { createContext, useState, useEffect, useContext } from 'react';
import { VendorContext } from './VendorContext';
import config from '../config/env';

// Create the notification context
export const NotificationContext = createContext();


// Provider component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [socket, setSocket] = useState(null);
  
  // Get current user from VendorContext
  const { currentUser } = useContext(VendorContext);
  
  // Request notification permission when the component mounts
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      console.log("NotificationContext - Requesting notification permission");
      Notification.requestPermission().then(permission => {
        console.log(`NotificationContext - Notification permission: ${permission}`);
      });
    }
  }, []);
  
  // Setup WebSocket connection for real-time notifications
  useEffect(() => {
    if (!currentUser) return;
    
    const userId = currentUser.vendorId || currentUser.id;
    if (!userId) {
      console.log("NotificationContext - No valid user ID for WebSocket connection");
      return;
    }
    
    // Close any existing socket
    if (socket) {
      console.log("NotificationContext - Closing existing WebSocket connection");
      socket.close();
    }
    
    // Determine WebSocket protocol (ws or wss)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // Use the same host and port as the current page (Vite will proxy to backend)
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}://${wsHost}/api/notifications/ws/${userId}?userType=vendor`;
    
    console.log(`NotificationContext - Opening WebSocket connection to: ${wsUrl}`);
    
    try {
      const newSocket = new WebSocket(wsUrl);
      
      newSocket.onopen = () => {
        console.log('NotificationContext - WebSocket connection established');
      };
      
      newSocket.onmessage = (event) => {
        try {
          console.log('NotificationContext - WebSocket message received:', event.data);
          const data = JSON.parse(event.data);
          
          if (data.type === 'notification') {
            console.log('NotificationContext - Processing notification from WebSocket:', data.notification);
            // Add notification to state
            handleNewNotification(data.notification);
          } else if (data.type === 'lead') {
            console.log('NotificationContext - Processing lead from WebSocket:', data.lead);
            // Format lead as notification and add to state
            const leadData = data.lead || {};
            const isPending = leadData.status === 'pending' || leadData.requiresAction === true;
            
            // Format the lead as a notification
            const notification = formatNotification(leadData);
            
            // Show browser notification for pending leads
            if (isPending) {
              showBrowserNotification({
                title: `ACTION REQUIRED: New lead needs approval`,
                body: `Lead from client ${leadData.clientId || 'N/A'} requires your immediate attention.`
              });
            } else {
              // Regular notification for non-pending leads
              showBrowserNotification({
                title: notification.title,
                body: notification.message
              });
            }
            
            // Add notification to state
            addNotification(notification);
          }
        } catch (err) {
          console.error('NotificationContext - Error processing WebSocket message:', err);
        }
      };
      
      newSocket.onerror = (error) => {
        console.error('NotificationContext - WebSocket error:', error);
        console.error('NotificationContext - WebSocket readyState:', newSocket.readyState);
        console.error('NotificationContext - Error details:', {
          type: error.type,
          message: error.message,
          toString: error.toString()
        });
      };
      
      // newSocket.onclose = (event) => {
      //   console.log(`NotificationContext - WebSocket connection closed: ${event.code} ${event.reason}`);
      //   // Attempt to reconnect after a delay if the connection was closed unexpectedly
      //   if (event.code !== 1000) { // 1000 is normal closure
      //     console.log('NotificationContext - WebSocket closed unexpectedly, will attempt to reconnect in 5 seconds');
      //     setTimeout(() => {
      //       if (currentUser) {
      //         // Trigger a reconnect by updating the socket state to null
      //         setSocket(null);
      //       }
      //     }, 5000);
      //   }
      // };
      
      setSocket(newSocket);
      
      // Cleanup function
      return () => {
        console.log('NotificationContext - Cleaning up WebSocket connection');
        newSocket.close();
      };
    } catch (err) {
      console.error('NotificationContext - Failed to establish WebSocket connection:', err);
    }
  }, [currentUser, socket === null]); // Reconnect if socket is null or user changes
  
  // Helper function to handle new notifications from WebSocket
  const handleNewNotification = (notification) => {
    if (!notification) return;
    
    console.log('NotificationContext - Adding new notification:', notification);
    
    // Check if this is a call invitation or other pre-formatted notification type
    // If so, use it as-is; otherwise format it as a lead
    let formattedNotification;
    if (notification.type === 'call_invitation' || notification.type === 'call_ended' || notification.type === 'call_declined') {
      // Call notifications come pre-formatted from the backend
      console.log('NotificationContext - Using pre-formatted call notification');
      formattedNotification = {
        ...notification,
        time: notification.timestamp ? new Date(notification.timestamp).toLocaleTimeString() : 'Just now',
        isRead: false,
        isImportant: notification.priority === 'high',
        isSaved: false
      };
    } else {
      // Format as lead notification
      console.log('NotificationContext - Formatting as lead notification');
      formattedNotification = formatNotification(notification);
    }
    
    // Add to state
    addNotification(formattedNotification);
    
    // Show browser notification
    showBrowserNotification({
      title: formattedNotification.title,
      body: formattedNotification.message
    });
  };
  
  // Helper function to add a notification to state
  const addNotification = (notification) => {
    if (!notification || !notification.id) return;
    setNotifications(prev => {
      // Check if notification already exists to avoid duplicates
      const exists = prev.some(n => n && n.id === notification.id);
      if (exists) {
        console.log('NotificationContext - Notification already exists, not adding duplicate:', notification.id);
        return prev;
      }
      
      console.log('NotificationContext - Adding new notification to state:', notification);
      return [notification, ...prev];
    });
    
    // If notification is not read, increase unread count
    if (!notification.isRead) {
      setUnreadCount(count => count + 1);
    }
  };
  
  // Fetch notifications when user changes and set up polling
  useEffect(() => {
    console.log("NotificationContext - Current User:", currentUser);
    
    // Function to fetch notifications based on current user
    const fetchUserNotifications = (includeRead = true) => {
      if (currentUser?.vendorId) {
        console.log("NotificationContext - Fetching notifications for vendor ID:", currentUser.vendorId, "includeRead:", includeRead);
        fetchNotifications(currentUser.vendorId, includeRead);
      } else if (currentUser?.id) {
        // Try using id if vendorId is not available
        console.log("NotificationContext - Fetching notifications using id instead of vendorId:", currentUser.id, "includeRead:", includeRead);
        fetchNotifications(currentUser.id, includeRead);
      } else {
        console.log("NotificationContext - No vendorId or id available in currentUser");
      }
    };
    
    // Initial fetch - include read notifications to show all notifications
    if (currentUser) {
      fetchUserNotifications(true);
      
      // Set up polling for notifications every 30 seconds
      // For polling, we only need to check for new unread notifications
      const pollingInterval = setInterval(() => {
        console.log("NotificationContext - Polling for new notifications");
        fetchUserNotifications(true);
      }, 30000); // 30 seconds
      
      // Clean up interval on unmount
      return () => {
        console.log("NotificationContext - Cleaning up notification polling");
        clearInterval(pollingInterval);
      };
    }
    
    return () => {};
  }, [currentUser]); // fetchNotifications is intentionally omitted to avoid dependency issues
  
  // Format a lead data object into notification structure
  const formatNotification = (lead) => {
    if (!lead) {
      console.log("NotificationContext - Invalid lead data for formatting:", lead);
      return null;
    }
    
    // Ensure we have an ID by checking all possible ID fields
    const notificationId = lead.notificationId || lead.leadId || lead.id || null;
    if (!notificationId) {
      console.log("NotificationContext - Missing ID in lead data:", lead);
      return null;
    }
    
    // Check if the lead is pending for approval/rejection
    // Various conditions that might indicate a lead needs action
    const isPending = 
      lead.status === 'pending' || 
      lead.status === 'new' || 
      lead.requiresAction === true || 
      (lead.statusChange && lead.statusChange.newStatus === 'pending');
    
    const leadName = lead.name || 'New Lead';
    const clientId = lead.clientId || 'N/A';
    
    return {
      id: notificationId,
      title: isPending ? `Action Required: ${leadName}` : `New Lead: ${leadName}`,
      message: isPending 
        ? `New lead requires your approval or rejection. Client: ${clientId}.`
        : lead.description || `New lead from client: ${clientId}. ${lead.status ? `Status: ${lead.status}` : ''}`,
      time: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'Recently',
      sender: `Client ID: ${clientId}`,
      avatar: 'https://via.placeholder.com/40/CBD5E0/4A5568?text=N',
      icon: 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-04-25/h0Lwu0EJrH.png',
      badge: { 
        text: isPending ? "Action Required" : "New Lead", 
        color: isPending ? "#fed7d7" : "#fefcbf",
        textColor: isPending ? "#822727" : "#744210"
      },
      isImportant: isPending ? true : lead.isImportant || false,
      isSaved: lead.isSaved || false,
      isRead: lead.isRead || (lead.status && lead.status !== 'new' && lead.status !== 'pending') || false,
      isPending: isPending,
      link: isPending ? `/VendorDashboard/leads/${notificationId}` : '/VendorDashboard/leads', // Link directly to the specific lead when approval is needed
    };
  };

  // Fetch notifications from the API
  const fetchNotifications = async (userId, includeRead = false) => {
    if (!userId) {
      console.log(`NotificationContext - No userId provided, skipping notification fetch`);
      return;
    }
    
    console.log(`NotificationContext - Fetching notifications for userId: ${userId}, includeRead: ${includeRead}`);
    
    // Only show loading indicator on initial load, not during polling
    if (notifications.length === 0) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const url = `${config.VENDOR_BACKEND_URL}/api/notifications/${userId}?userType=vendor&includeRead=${includeRead}`;
      
      console.log(`NotificationContext - Fetching notifications from URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`NotificationContext - Failed to fetch notifications: ${response.status}`);
        console.error(`NotificationContext - Response text:`, await response.text());
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`NotificationContext - Received notifications data:`, data);
      
      // Always update notifications to ensure we have the latest data
      // This ensures we don't miss any notifications that might have been created recently
      const currentIds = new Set(notifications.filter(n => n).map(n => n.id));
      
      // Check if data.notifications exists and is an array before filtering
      const newNotifications = (data.notifications && Array.isArray(data.notifications)) 
        ? data.notifications.filter(n => !currentIds.has(n.notificationId || n.id))
        : [];
      
      // Always update notifications, even if the array is empty
      console.log(`NotificationContext - Processing notifications data with ${data.notifications ? data.notifications.length : 0} notifications`);
      
      // Check if we have notifications data
      if (data.notifications && Array.isArray(data.notifications)) {
        if (newNotifications.length > 0) {
          console.log(`NotificationContext - Found ${newNotifications.length} new notifications`);
          
          // Show browser notifications for new notifications
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              // Show notifications for each new notification
              newNotifications.forEach(notification => {
                const formattedNotification = formatNotification(notification);
                new Notification(formattedNotification.title, {
                  body: formattedNotification.message,
                  icon: '/favicon.ico'
                });
              });
            } else if (Notification.permission !== 'denied') {
              // Request permission
              Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                  // Show notifications after permission is granted
                  newNotifications.forEach(notification => {
                    const formattedNotification = formatNotification(notification);
                    new Notification(formattedNotification.title, {
                      body: formattedNotification.message,
                      icon: '/favicon.ico'
                    });
                  });
                }
              });
            }
          }
        }
        
        // Format notifications for display
        const formattedNotifications = data.notifications.map(formatNotification);
        console.log(`NotificationContext - Formatted ${formattedNotifications.length} notifications for display`);
        
        // Filter out invalid notifications (might happen if formatting fails)
        const validNotifications = formattedNotifications.filter(n => n && n.id);
        
        // Merge with existing WebSocket notifications (call invitations, etc.) to avoid overwriting them
        setNotifications(prev => {
          // Keep WebSocket-only notifications (call invitations, call_ended, call_declined)
          const wsOnlyNotifications = prev.filter(n => 
            n && (n.type === 'call_invitation' || 
            n.type === 'call_ended' || 
            n.type === 'call_declined')
          );
          
          // Merge WebSocket notifications with fetched notifications, removing duplicates
          const merged = [...wsOnlyNotifications];
          validNotifications.forEach(notif => {
            if (!merged.some(existing => existing.id === notif.id)) {
              merged.push(notif);
            }
          });
          
          console.log(`NotificationContext - Merged notifications: ${wsOnlyNotifications.length} WebSocket + ${validNotifications.length} fetched = ${merged.length} total`);
          return merged;
        });
        
        // Update the unread count based on all notifications (including WebSocket ones)
        setNotifications(allNotifs => {
          const validUnreadCount = allNotifs.filter(n => n && !n.isRead).length;
          setUnreadCount(validUnreadCount);
          return allNotifs; // Don't modify, just read
        });
        
        console.log(`NotificationContext - Updated state with notifications`);
        
      } else {
        console.log(`NotificationContext - No notifications data found or invalid format`);
        // Set empty array if no notifications data
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    if (!notificationId) {
      console.error('NotificationContext - Cannot mark notification as read: No notificationId provided');
      return;
    }
    
    console.log(`NotificationContext - Marking notification as read: ${notificationId}`);
    
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`NotificationContext - Failed to mark notification as read: ${response.status}`);
        console.error(`NotificationContext - Response text:`, await response.text());
        throw new Error(`Failed to mark notification as read: ${response.status}`);
      }
      
      const updatedNotification = await response.json();
      console.log(`NotificationContext - Successfully marked notification as read:`, updatedNotification);
      
      // Update local state
      setNotifications(prevNotifications => {
        const updatedNotifications = prevNotifications.map(notification => {
          if (notification.id === notificationId) {
            console.log(`NotificationContext - Updating notification in state:`, notification);
            return { 
              ...notification, 
              isRead: true,
              // If the API returned leadData with updated status, use it
              leadData: updatedNotification.leadData || notification.leadData
            };
          }
          return notification;
        });
        
        console.log(`NotificationContext - Updated notifications state:`, updatedNotifications);
        return updatedNotifications;
      });
      
      // Update unread count
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!currentUser?.vendorId) return;
    
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/notifications/${currentUser.vendorId}/read-all?userType=vendor`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to mark all notifications as read: ${response.status}`);
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, isRead: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  // Delete a notification
  const deleteNotification = async (notificationId) => {
    if (!notificationId) return;
    
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete notification: ${response.status}`);
      }
      
      // Update local state
      const updatedNotifications = notifications.filter(notification => notification.id !== notificationId);
      setNotifications(updatedNotifications);
      
      // Update unread count if needed
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };
  
  // Toggle notification dropdown
  const toggleNotificationDropdown = () => {
    const newState = !showNotificationDropdown;
    setShowNotificationDropdown(newState);
    
    // If opening the dropdown, refresh notifications to ensure we have the latest
    if (newState && currentUser) {
      console.log("NotificationContext - Opening dropdown, refreshing notifications");
      if (currentUser.vendorId) {
        fetchNotifications(currentUser.vendorId, true); // Include read notifications
      } else if (currentUser.id) {
        fetchNotifications(currentUser.id, true); // Include read notifications
      }
    }
  };
  
  // Close notification dropdown
  const closeNotificationDropdown = () => {
    setShowNotificationDropdown(false);
    
    // Don't clear notifications when closing the dropdown
    // This ensures they're still available when reopening
  };
  
  // Helper function to get icon for notification type
  const getIconForNotificationType = (type) => {
    switch (type) {
      case 'new_lead':
        return 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-04-25/h0Lwu0EJrH.png';
      case 'project_update':
        return 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-04-25/h0Lwu0EJrH.png';
      case 'lead_status_change':
        return 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-04-25/h0Lwu0EJrH.png';
      case 'project_status_change':
        return 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-04-25/h0Lwu0EJrH.png';
      default:
        return 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-04-25/h0Lwu0EJrH.png';
    }
  };
  
  // Helper function to get label for notification type
  const getNotificationTypeLabel = (type) => {
    switch (type) {
      case 'new_lead':
        return 'New Lead';
      case 'project_update':
        return 'Project Update';
      case 'lead_status_change':
        return 'Lead Status';
      case 'project_status_change':
        return 'Project Status';
      default:
        return 'Notification';
    }
  };
  
  // Helper function to get color for notification type
  const getColorForNotificationType = (type) => {
    switch (type) {
      case 'new_lead':
        return '#fefcbf'; // Yellow
      case 'project_update':
        return '#e6fffa'; // Teal
      case 'lead_status_change':
        return '#ebf4ff'; // Blue
      case 'project_status_change':
        return '#ebf4ff'; // Blue
      default:
        return '#f0f0f0'; // Gray
    }
  };
  
  // Helper function to get link for notification
  const getLinkForNotification = (notification) => {
    // If it's a lead notification (which is now the primary case)
    if (notification.relatedType === 'lead' || notification.type === 'new_lead' || notification.leadData) {
      const leadId = notification.relatedId || notification.leadId || (notification.leadData && notification.leadData.leadId);
      if (leadId) {
        return `/VendorDashboard/leads/${leadId}`;
      }
    }
    
    // Fallback to the original logic
    switch (notification.relatedType) {
      case 'lead':
        return `/VendorDashboard/leads/${notification.relatedId}`;
      case 'project':
        return `/VendorDashboard/projects/${notification.relatedId}`;
      default:
        return null;
    }
  };
  
  // Function to manually check for new notifications
  const checkForNewNotifications = () => {
    console.log("NotificationContext - Manually checking for new notifications");
    if (currentUser?.vendorId) {
      fetchNotifications(currentUser.vendorId);
    } else if (currentUser?.id) {
      fetchNotifications(currentUser.id);
    }
  };
  
  // Show browser notification if permitted
  const showBrowserNotification = (notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title || 'New Lead Alert', {
        body: notification.body || notification.message || 'You have a new notification',
        icon: '/favicon.ico'
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(notification.title || 'New Lead Alert', {
            body: notification.body || notification.message || 'You have a new notification',
            icon: '/favicon.ico'
          });
        }
      });
    }
  };

  // Create notifications for quote, PO, and invoice events
  const triggerDocumentNotification = (documentType, status, documentNumber, details = {}) => {
    const notificationMap = {
      // Quote notifications
      'quote:approved_by_pm': {
        title: `Quote Approved by PM`,
        message: `Quote ${documentNumber} has been approved by the Project Manager.`,
        icon: '✓',
        color: 'green'
      },
      'quote:sent_to_finance': {
        title: `Quote Sent to Finance`,
        message: `Quote ${documentNumber} has been sent to Finance for approval.`,
        icon: '📤',
        color: 'blue'
      },
      'quote:approved_by_finance': {
        title: `Quote Approved by Finance`,
        message: `Quote ${documentNumber} has been approved by Finance.`,
        icon: '✓',
        color: 'green'
      },
      'quote:sent_to_client': {
        title: `Quote Sent to Client`,
        message: `Quote ${documentNumber} has been sent to the client for review.`,
        icon: '📧',
        color: 'blue'
      },
      'quote:approved_by_client': {
        title: `Quote Approved by Client`,
        message: `Client has approved quote ${documentNumber}.`,
        icon: '✓',
        color: 'green'
      },
      'quote:po_requested': {
        title: `PO Requested`,
        message: `Purchase Order has been requested for quote ${documentNumber}.`,
        icon: '📋',
        color: 'purple'
      },
      // PO notifications
      'po:approved_by_pm': {
        title: `PO Approved by PM`,
        message: `Purchase Order ${documentNumber} has been approved by the Project Manager.`,
        icon: '✓',
        color: 'green'
      },
      'po:sent_to_finance': {
        title: `PO Sent to Finance`,
        message: `Purchase Order ${documentNumber} has been sent to Finance for approval.`,
        icon: '📤',
        color: 'blue'
      },
      'po:approved_by_finance': {
        title: `PO Approved by Finance`,
        message: `Purchase Order ${documentNumber} has been approved by Finance.`,
        icon: '✓',
        color: 'green'
      },
      'po:sent_to_client': {
        title: `PO Sent to Client`,
        message: `Purchase Order ${documentNumber} has been sent to the client.`,
        icon: '📧',
        color: 'blue'
      },
      'po:approved_by_client': {
        title: `PO Approved by Client`,
        message: `Client has approved Purchase Order ${documentNumber}.`,
        icon: '✓',
        color: 'green'
      },
      // Invoice notifications
      'invoice:approved_by_pm': {
        title: `Invoice Approved by PM`,
        message: `Invoice ${documentNumber} has been approved by the Project Manager.`,
        icon: '✓',
        color: 'green'
      },
      'invoice:sent_to_finance': {
        title: `Invoice Sent to Finance`,
        message: `Invoice ${documentNumber} has been sent to Finance for approval.`,
        icon: '📤',
        color: 'blue'
      },
      'invoice:approved_by_finance': {
        title: `Invoice Approved by Finance`,
        message: `Invoice ${documentNumber} has been approved by Finance.`,
        icon: '✓',
        color: 'green'
      },
      'invoice:sent_to_client': {
        title: `Invoice Sent to Client`,
        message: `Invoice ${documentNumber} has been sent to the client.`,
        icon: '📧',
        color: 'blue'
      },
      'invoice:approved_by_client': {
        title: `Invoice Approved by Client`,
        message: `Client has approved Invoice ${documentNumber}.`,
        icon: '✓',
        color: 'green'
      },
      'invoice:payment_received': {
        title: `Payment Received`,
        message: `Payment has been received for Invoice ${documentNumber}.`,
        icon: '💰',
        color: 'green'
      }
    };

    const key = `${documentType}:${status}`;
    const notificationData = notificationMap[key];

    if (!notificationData) {
      console.warn(`NotificationContext - Unknown notification type: ${key}`);
      return;
    }

    // Create notification object
    const notification = {
      id: `${documentType}-${documentNumber}-${Date.now()}`,
      title: notificationData.title,
      message: notificationData.message,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      icon: notificationData.icon,
      color: notificationData.color,
      isRead: false,
      documentType: documentType,
      documentNumber: documentNumber,
      status: status,
      link: `/VendorDashboard/${documentType}s/${details.id || documentNumber}`,
      ...details
    };

    // Add to notifications
    addNotification(notification);

    // Show browser notification
    showBrowserNotification({
      title: notificationData.title,
      body: notificationData.message
    });

    console.log(`NotificationContext - Triggered ${key} notification`, notification);
  };
  
  // Context value
  const contextValue = {
    notifications,
    unreadCount,
    isLoading,
    error,
    showNotificationDropdown,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    toggleNotificationDropdown,
    closeNotificationDropdown,
    checkForNewNotifications,
    triggerDocumentNotification,
    refreshNotifications: () => {
      console.log("NotificationContext - Manually refreshing notifications");
      if (currentUser?.vendorId) {
        fetchNotifications(currentUser.vendorId, true);
      } else if (currentUser?.id) {
        fetchNotifications(currentUser.id, true);
      }
    }
  };
  
  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};