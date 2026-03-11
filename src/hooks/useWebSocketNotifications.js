import { useEffect, useRef, useState, useCallback } from 'react';
import config from '../config/env';

const useWebSocketNotifications = (userId, userType = 'vendor') => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectTimerRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Refs for identity — prevents reconnection when userId/userType object identity changes
  const userIdRef = useRef(userId);
  const userTypeRef = useRef(userType);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { userTypeRef.current = userType; }, [userType]);

  const connect = useCallback(() => {
    const uid = userIdRef.current;
    if (!uid) return;

    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }

      // Create WebSocket connection using window.location.host
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/api/notifications/ws/${uid}?userType=${userTypeRef.current}`;
      console.log('useWebSocketNotifications - Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (wsRef.current !== ws) { ws.close(); return; }
        console.log('WebSocket connected for user:', uid);
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        if (wsRef.current !== ws) return;
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'notification') {
            const notification = data.notification;
            
            // Format call notifications properly
            let formattedNotification;
            if (notification.type === 'call_invitation' || notification.type === 'call_ended' || notification.type === 'call_declined') {
              formattedNotification = {
                ...notification,
                time: notification.timestamp ? new Date(notification.timestamp).toLocaleTimeString() : 'Just now',
                isRead: false,
                isImportant: notification.priority === 'high',
                isSaved: false
              };
            } else {
              formattedNotification = notification;
            }
            
            setNotifications(prev => [formattedNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            if (Notification.permission === 'granted') {
              new Notification(formattedNotification.title || formattedNotification.message, {
                body: formattedNotification.message,
                icon: '/favicon.ico',
                tag: formattedNotification.id || formattedNotification.notificationId
              });
            }

            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
              audio.volume = 0.3;
              audio.play().catch(() => {});
            } catch (error) {
              // Ignore audio errors
            }
          } else if (data.type === 'connection') {
            console.log('WebSocket connection established:', data);
          } else if (data.type === 'pong') {
            // keepalive response
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        if (wsRef.current !== ws) return;
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        if (wsRef.current !== ws) return;
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, []); // Stable — identity values from refs

  const disconnect = () => {
    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
  };

  const sendPing = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/notifications/${notificationId}/${userId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.notificationId === notificationId 
              ? { ...notification, isRead: true }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/notifications/${userId}/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/notifications/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setNotifications(result.notifications || []);
        setUnreadCount(result.notifications?.filter(n => !n.isRead).length || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Connect when userId is available (debounce to let React settle)
  useEffect(() => {
    if (userId) {
      connectTimerRef.current = setTimeout(() => {
        connect();
      }, 300);
      fetchNotifications();
    }

    return () => {
      disconnect();
    };
  }, [userId, userType, connect]);

  // Send ping every 30 seconds to keep connection alive
  useEffect(() => {
    if (isConnected) {
      const pingInterval = setInterval(sendPing, 30000);
      return () => clearInterval(pingInterval);
    }
  }, [isConnected]);

  return {
    notifications,
    unreadCount,
    isConnected,
    markNotificationAsRead,
    markAllAsRead,
    fetchNotifications,
    sendPing
  };
};

export default useWebSocketNotifications;
