import React, { createContext, useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import { VendorContext } from './VendorContext';
import config from '../config/env';

// Create the notification context
export const NotificationContext = createContext();

const TYPE_META = {
  new_lead: {
    iconSymbol: 'L',
    iconBackgroundClass: 'bg-warning/10',
    iconTextClass: 'text-warning',
    badge: { text: 'Lead', color: 'rgb(var(--warning) / 0.1)', textColor: 'rgb(var(--warning))' },
  },
  pm_decision: {
    iconSymbol: 'PM',
    iconBackgroundClass: 'bg-surface-hover',
    iconTextClass: 'text-ink',
    badge: { text: 'PM Decision', color: 'rgb(var(--surface-hover))', textColor: 'rgb(var(--text-ink))' },
  },
  updated_lead: {
    iconSymbol: 'UP',
    iconBackgroundClass: 'bg-warning/10',
    iconTextClass: 'text-warning',
    badge: { text: 'Lead Update', color: 'rgb(var(--warning) / 0.1)', textColor: 'rgb(var(--warning))' },
  },
  workspace_access: {
    iconSymbol: 'WS',
    iconBackgroundClass: 'bg-info/10',
    iconTextClass: 'text-info',
    badge: { text: 'Workspace', color: 'rgb(var(--info) / 0.1)', textColor: 'rgb(var(--info))' },
  },
  comment_mention: {
    iconSymbol: '@',
    iconBackgroundClass: 'bg-info/10',
    iconTextClass: 'text-info',
    badge: { text: 'Mention', color: 'rgb(var(--info) / 0.1)', textColor: 'rgb(var(--info))' },
  },
  lead_status_update: {
    iconSymbol: 'LS',
    iconBackgroundClass: 'bg-info/10',
    iconTextClass: 'text-info',
    badge: { text: 'Status', color: 'rgb(var(--info) / 0.1)', textColor: 'rgb(var(--info))' },
  },
  call_invitation: {
    iconSymbol: 'C',
    iconBackgroundClass: 'bg-danger/10',
    iconTextClass: 'text-danger',
    badge: { text: 'Call', color: 'rgb(var(--danger) / 0.1)', textColor: 'rgb(var(--danger))' },
  },
  call_ended: {
    iconSymbol: 'C',
    iconBackgroundClass: 'bg-surface-hover',
    iconTextClass: 'text-ink',
    badge: { text: 'Call Ended', color: 'rgb(var(--surface-hover))', textColor: 'rgb(var(--text-ink))' },
  },
  call_declined: {
    iconSymbol: 'C',
    iconBackgroundClass: 'bg-danger/10',
    iconTextClass: 'text-danger',
    badge: { text: 'Call Declined', color: 'rgb(var(--danger) / 0.1)', textColor: 'rgb(var(--danger))' },
  },
  call_cancelled: {
    iconSymbol: 'C',
    iconBackgroundClass: 'bg-danger/10',
    iconTextClass: 'text-danger',
    badge: { text: 'Call Cancelled', color: 'rgb(var(--danger) / 0.1)', textColor: 'rgb(var(--danger))' },
  },
  call_participant_joined: {
    iconSymbol: 'IN',
    iconBackgroundClass: 'bg-success/10',
    iconTextClass: 'text-success',
    badge: { text: 'Call Update', color: 'rgb(var(--success) / 0.1)', textColor: 'rgb(var(--success))' },
  },
  call_participant_left: {
    iconSymbol: 'OUT',
    iconBackgroundClass: 'bg-warning/10',
    iconTextClass: 'text-warning',
    badge: { text: 'Call Update', color: 'rgb(var(--warning) / 0.1)', textColor: 'rgb(var(--warning))' },
  },
  default: {
    iconSymbol: 'N',
    iconBackgroundClass: 'bg-surface-hover',
    iconTextClass: 'text-ink',
    badge: { text: 'Notification', color: 'rgb(var(--surface-hover))', textColor: 'rgb(var(--text-ink))' },
  },
};

const formatNotificationTime = (timestamp) => {
  if (!timestamp) return 'Recently';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

const normalizeVendorRoute = (rawUrl, notification) => {
  const url = rawUrl || '';

  if (url) {
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/VendorDashboard')) return url;
    if (url.startsWith('/workspace')) {
      return `/VendorDashboard${url}`;
    }
    if (url.startsWith('/leads') || url.startsWith('/projects') || url.startsWith('/notifications')) {
      return `/VendorDashboard${url}`;
    }
    return url;
  }

  const workspaceId = notification?.data?.workspaceId || notification?.relatedId;
  const leadId = notification?.data?.leadId || notification?.relatedId;

  switch (notification?.type) {
    case 'call_invitation': {
      const meetingId = notification?.data?.meetingId;
      return workspaceId
        ? `/VendorDashboard/workspace/${workspaceId}${meetingId ? `?call=${meetingId}` : ''}`
        : '/VendorDashboard/workspace';
    }
    case 'comment_mention':
    case 'workspace_access':
    case 'call_ended':
    case 'call_declined':
    case 'call_cancelled':
    case 'call_participant_joined':
    case 'call_participant_left':
      return workspaceId ? `/VendorDashboard/workspace/${workspaceId}` : '/VendorDashboard/workspace';
    case 'new_lead':
    case 'updated_lead':
    case 'pm_decision':
    case 'lead_status_update':
      return leadId ? `/leads/${leadId}` : '/VendorDashboard/leads';
    default:
      return null;
  }
};

const buildNotificationPresentation = (notification) => {
  if (!notification) return null;

  const notificationId = notification.notificationId || notification.leadId || notification.id || null;
  if (!notificationId) return null;

  const type = notification.type || 'new_lead';
  const meta = TYPE_META[type] || TYPE_META.default;
  const timestamp = notification.timestamp || notification.createdAt || notification.updatedAt;
  const primaryAction = Array.isArray(notification.actions) && notification.actions.length > 0
    ? notification.actions[0]
    : null;

  const derivedPending = (
    type === 'new_lead'
    || type === 'updated_lead'
    || type === 'call_invitation'
  );
  const isPending = Boolean(
    notification.isPending !== undefined && notification.isPending !== null
      ? notification.isPending
      : notification.actionRequired !== undefined && notification.actionRequired !== null
        ? notification.actionRequired
        : derivedPending
  );

  let title = notification.title;
  let message = notification.message;

  if (type === 'new_lead' && !title) {
    const leadName = notification.name || notification.leadData?.name || notification.data?.leadTitle || 'New Lead';
    title = isPending ? `Action Required: ${leadName}` : `New Lead: ${leadName}`;
  }

  if (type === 'new_lead' && !message) {
    const clientId = notification.clientId || notification.data?.clientId || 'N/A';
    message = isPending
      ? `New lead requires your review. Client: ${clientId}.`
      : notification.description || `New lead from client ${clientId}.`;
  }

  const sender = notification.sender
    || notification.data?.pmName
    || notification.data?.initiatorName
    || notification.authorName
    || 'System';

  return {
    ...notification,
    id: notificationId,
    notificationId,
    type,
    title: title || 'Notification',
    message: message || 'No details available',
    time: formatNotificationTime(timestamp),
    sender,
    isRead: Boolean(notification.isRead),
    isPending,
    isImportant: Boolean(
      notification.isImportant !== undefined && notification.isImportant !== null
        ? notification.isImportant
        : notification.priority === 'high'
    ),
    isSaved: Boolean(notification.isSaved),
    badge: notification.badge || meta.badge,
    link: normalizeVendorRoute(primaryAction?.url || notification.link, notification),
    primaryActionLabel: primaryAction?.label || (isPending ? 'Open' : null),
    iconSymbol: notification.iconSymbol || meta.iconSymbol,
    iconBackgroundClass: notification.iconBackgroundClass || meta.iconBackgroundClass,
    iconTextClass: notification.iconTextClass || meta.iconTextClass,
  };
};


// Provider component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Latest notifications, readable from identity-stable callbacks without
  // forcing those callbacks to depend on (and be recreated by) `notifications`.
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  // Get current user from VendorContext
  const { currentUser } = useContext(VendorContext);
  
  // Request notification permission when the component mounts
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
      });
    }
  }, []);
  
  // Setup WebSocket connection for real-time notifications, with auto-reconnect.
  //
  // WHY: notifications are push-only now (no polling), so the socket must survive
  // transient drops (server restart, laptop sleep, proxy hiccup). A dropped socket
  // with no reconnect would silently stop delivering leads until a full page reload.
  useEffect(() => {
    if (!currentUser) return undefined;

    const userId = currentUser.vendorId || currentUser.id;
    if (!userId) {
      return undefined;
    }

    // Determine WebSocket protocol (ws or wss)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // Use the same host and port as the current page (Vite will proxy to backend)
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}://${wsHost}/api/notifications/ws/${userId}?userType=vendor`;

    let socket = null;
    let reconnectTimer = null;
    let attempt = 0;
    let unmounted = false;

    // Exponential backoff (1s, 2s, 4s … capped at 30s) + jitter, so a server
    // restart doesn't make every client reconnect in lockstep.
    const scheduleReconnect = () => {
      if (unmounted) return;
      const delay = Math.min(30000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 1000);
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      if (unmounted) return;

      try {
        socket = new WebSocket(wsUrl);
      } catch (err) {
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        attempt = 0; // Reset backoff once a connection succeeds
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'notification') {
            // Add notification to state
            handleNewNotification(data.notification);
          } else if (data.type === 'lead') {
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
          console.error('NotificationContext - Failed to handle WebSocket message:', err);
        }
      };
      
      socket.onerror = (error) => {
        console.error('NotificationContext - Error details:', {
          type: error.type,
          message: error.message,
          toString: error.toString()
        });
      };

      socket.onclose = (event) => {
        // 1000 = normal closure (our own cleanup / page unload) — do not reconnect.
        if (unmounted || event.code === 1000) return;
        scheduleReconnect();
      };
    };

    connect();

    // Cleanup: stop reconnecting and close the socket.
    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.close();
      }
    };
  }, [currentUser]);
  
  // Helper function to handle new notifications from WebSocket
  const handleNewNotification = (notification) => {
    if (!notification) return;
    
    const formattedNotification = formatNotification(notification);
    if (!formattedNotification) return;
    
    // Add to state
    addNotification(formattedNotification);
    
    // Show browser notification
    showBrowserNotification({
      title: formattedNotification.title,
      body: formattedNotification.message
    });
  };
  
  // Helper function to add a notification to state
  const addNotification = useCallback((notification) => {
    if (!notification || !notification.id) return;
    setNotifications(prev => {
      // Check if notification already exists to avoid duplicates
      const exists = prev.some(n => n && n.id === notification.id);
      if (exists) {
        return prev;
      }
      
      return [notification, ...prev];
    });
    
    // If notification is not read, increase unread count
    if (!notification.isRead) {
      setUnreadCount(count => count + 1);
    }
  }, []);
  
  // Fetch notifications when the user changes, then refresh on tab focus.
  //
  // WHY there is no setInterval poll here:
  //   New leads are pushed in real time over the WebSocket (/api/notifications/ws),
  //   so a periodic GET is redundant. Each GET ran a full-table Scan on the `leads`
  //   table (DynamoNotification.getNotificationsForUser), so polling every 30s was
  //   pure waste. We now fetch once on load and once whenever the tab regains focus
  //   (an event-driven safety net for pushes missed while backgrounded).
  useEffect(() => {

    // Function to fetch notifications based on current user
    const fetchUserNotifications = (includeRead = true) => {
      if (currentUser?.vendorId) {
        fetchNotifications(currentUser.vendorId, includeRead);
      } else if (currentUser?.id) {
        // Try using id if vendorId is not available
        fetchNotifications(currentUser.id, includeRead);
      } else {
      }
    };

    if (!currentUser) return () => {};

    // Initial fetch - include read notifications to show all notifications
    fetchUserNotifications(true);

    // Event-driven refresh: catch any push missed while the tab was backgrounded.
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchUserNotifications(true);
      }
    };
    document.addEventListener('visibilitychange', onFocusOrVisible);
    window.addEventListener('focus', onFocusOrVisible);

    return () => {
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      window.removeEventListener('focus', onFocusOrVisible);
    };
  }, [currentUser]); // fetchNotifications is intentionally omitted to avoid dependency issues
  
  // Format a lead data object into notification structure
  const formatNotification = (lead) => {
    if (!lead) {
      return null;
    }

    const normalizedType = lead.type || 'new_lead';
    const normalizedLead = {
      ...lead,
      type: normalizedType,
      isRead: lead.isRead || (normalizedType === 'new_lead' && lead.status && lead.status !== 'new' && lead.status !== 'pending') || false,
      isPending: lead.isPending || lead.requiresAction === true || lead.status === 'new' || lead.status === 'pending',
      title: lead.title,
      message: lead.message,
      data: {
        ...lead.data,
        leadId: lead.data?.leadId || lead.relatedId || lead.leadId,
        clientId: lead.data?.clientId || lead.clientId,
      },
    };

    return buildNotificationPresentation(normalizedLead);
  };

  // Fetch notifications from the API
  const fetchNotifications = useCallback(async (userId, includeRead = false) => {
    if (!userId) {
      return;
    }
    
    
    // Only show loading indicator on initial load, not during polling
    if (notificationsRef.current.length === 0) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const url = `${config.VENDOR_BACKEND_URL}/api/notifications/${userId}?userType=vendor&includeRead=${includeRead}`;
      
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Always update notifications to ensure we have the latest data
      // This ensures we don't miss any notifications that might have been created recently
      const currentIds = new Set(notificationsRef.current.filter(n => n).map(n => n.id));
      
      // Check if data.notifications exists and is an array before filtering
      const newNotifications = (data.notifications && Array.isArray(data.notifications)) 
        ? data.notifications.filter(n => !currentIds.has(n.notificationId || n.id))
        : [];
      
      // Always update notifications, even if the array is empty
      
      // Check if we have notifications data
      if (data.notifications && Array.isArray(data.notifications)) {
        if (newNotifications.length > 0) {
          
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
        
        // Filter out invalid notifications (might happen if formatting fails)
        const validNotifications = formattedNotifications.filter(n => n && n.id);
        
        // Merge with existing WebSocket notifications (call invitations, etc.) to avoid overwriting them
        setNotifications(prev => {
          // Keep WebSocket-only notifications (call invitations, call_ended, call_declined)
          const wsOnlyNotifications = prev.filter(n => 
            n && (
              n.type === 'call_invitation' ||
              n.type === 'call_ended' ||
              n.type === 'call_declined' ||
              n.type === 'call_cancelled' ||
              n.type === 'call_participant_joined' ||
              n.type === 'call_participant_left' ||
              n.type === 'comment_mention' ||
              n.type === 'workspace_access' ||
              n.type === 'pm_decision' ||
              n.type === 'updated_lead' ||
              n.type === 'lead_status_update'
            )
          );
          
          // Merge WebSocket notifications with fetched notifications, removing duplicates
          const merged = [...wsOnlyNotifications];
          validNotifications.forEach(notif => {
            if (!merged.some(existing => existing.id === notif.id)) {
              merged.push(notif);
            }
          });
          

          // Return the SAME reference when the payload is byte-for-byte identical,
          // so a no-op poll does not re-render the provider (and every context
          // consumer) every cycle. Content comparison (not just ids) is required
          // so real changes — e.g. isRead flipping — still propagate.
          if (merged.length === prev.length && JSON.stringify(merged) === JSON.stringify(prev)) {
            return prev;
          }
          return merged;
        });
        
        // Update the unread count based on all notifications (including WebSocket ones)
        setNotifications(allNotifs => {
          const validUnreadCount = allNotifs.filter(n => n && !n.isRead).length;
          setUnreadCount(validUnreadCount);
          return allNotifs; // Don't modify, just read
        });
        
        
      } else {
        // Set empty array if no notifications data (same ref when already empty)
        setNotifications(prev => (prev.length === 0 ? prev : []));
        setUnreadCount(0);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId) {
      return;
    }
    
    
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.status}`);
      }
      
      const updatedNotification = await response.json();
      
      // Update local state
      setNotifications(prevNotifications => {
        const updatedNotifications = prevNotifications.map(notification => {
          if (notification.id === notificationId) {
            return { 
              ...notification, 
              isRead: true,
              // If the API returned leadData with updated status, use it
              leadData: updatedNotification.leadData || notification.leadData
            };
          }
          return notification;
        });
        
        return updatedNotifications;
      });
      
      // Update unread count
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (error) {
    }
  }, []);
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
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
    }
  }, [currentUser]);
  
  // Delete a notification
  const deleteNotification = useCallback(async (notificationId) => {
    if (!notificationId) return;
    
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete notification: ${response.status}`);
      }
      
      // Update local state
      const updatedNotifications = notificationsRef.current.filter(notification => notification.id !== notificationId);
      setNotifications(updatedNotifications);
      
      // Update unread count if needed
      const deletedNotification = notificationsRef.current.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
    } catch (error) {
    }
  }, []);
  
  // Toggle notification dropdown
  const checkForNewNotifications = useCallback(() => {
    if (currentUser?.vendorId) {
      fetchNotifications(currentUser.vendorId);
    } else if (currentUser?.id) {
      fetchNotifications(currentUser.id);
    }
  }, [currentUser, fetchNotifications]);
  
  // Show browser notification if permitted
  const showBrowserNotification = useCallback((notification) => {
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
  }, []);

  // Create notifications for quote, PO, and invoice events
  const refreshNotifications = useCallback(() => {
    if (currentUser?.vendorId) {
      fetchNotifications(currentUser.vendorId, true);
    } else if (currentUser?.id) {
      fetchNotifications(currentUser.id, true);
    }
  }, [currentUser, fetchNotifications]);

  // Context value — memoised so consumers only re-render when real state changes.
  const contextValue = useMemo(() => ({
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    checkForNewNotifications,
    refreshNotifications
  }), [
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    checkForNewNotifications,
    refreshNotifications
  ]);
  
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