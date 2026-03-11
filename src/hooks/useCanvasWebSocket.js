import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useCanvasWebSocket — React hook for real-time canvas collaboration.
 *
 * Connects to the Canvas WebSocket server, emits operations,
 * receives remote operations, and manages presence (cursors).
 *
 * Uses refs for user identity to prevent unnecessary WebSocket reconnections
 * when currentUser updates (e.g., role detection, context hydration).
 *
 * @param {string} workspaceId — The workspace being edited
 * @param {object} currentUser — { userId, userName, role }
 * @param {object} options — { enabled: boolean }
 * @returns {object} — { isConnected, connectedUsers, remoteCursors, emitOperation, emitCursor, initSnapshot }
 */
const useCanvasWebSocket = (workspaceId, currentUser, options = {}) => {
  const { enabled = true } = options;

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({}); // { userId: { x, y, userName } }

  // Callback refs that the consumer can set to handle incoming ops
  const onRemoteOperationRef = useRef(null);
  const onFullStateRef = useRef(null);

  // Derive identity values
  const userId = currentUser?.id || currentUser?.userId || currentUser?.vendorId || currentUser?.pmId || 'anonymous';
  const userName = currentUser?.name || currentUser?.userName || 'Anonymous';
  const userRole = currentUser?.role || 'vendor';

  // ---- Refs for identity — prevents WebSocket reconnection on every currentUser change ----
  const userIdRef = useRef(userId);
  const userNameRef = useRef(userName);
  const userRoleRef = useRef(userRole);

  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { userRoleRef.current = userRole; }, [userRole]);

  // ---- Message handler via ref — avoids stale closures in WebSocket onmessage ----
  const handleMessageRef = useRef(null);

  handleMessageRef.current = (data) => {
    // Ignore messages from self (canvas ops have _from, cursors use userId)
    if (data._from === userIdRef.current && data.type !== 'CONNECTED' && data.type !== 'FULL_STATE') {
      return;
    }

    switch (data.type) {
      case 'CONNECTED':
        setConnectedUsers(data.connectedUsers || []);
        break;

      case 'USER_JOINED':
        setConnectedUsers(prev => {
          if (prev.find(u => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, userName: data.userName, userRole: data.userRole }];
        });
        break;

      case 'USER_LEFT':
        setConnectedUsers(prev => prev.filter(u => u.userId !== data.userId));
        setRemoteCursors(prev => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
        break;

      case 'CURSOR_MOVE':
        setRemoteCursors(prev => ({
          ...prev,
          [data.userId]: { x: data.x, y: data.y, userName: data.userName },
        }));
        break;

      case 'FULL_STATE':
        if (onFullStateRef.current) {
          onFullStateRef.current(data);
        }
        break;

      // All canvas operations from remote users
      case 'NODE_ADD':
      case 'NODE_MOVE':
      case 'NODE_RESIZE':
      case 'NODE_UPDATE':
      case 'NODE_DELETE':
      case 'NODES_BATCH_UPDATE':
      case 'EDGE_ADD':
      case 'EDGE_DELETE':
      case 'EDGES_BATCH_UPDATE':
      case 'ZOOM_CHANGE':
      case 'FULL_SYNC':
        if (onRemoteOperationRef.current) {
          onRemoteOperationRef.current(data);
        }
        break;

      case 'pong':
        // keepalive response, ignore
        break;

      default:
        console.log('🎨 Canvas WS: Unknown message type', data.type);
    }
  };

  // ---- Connect (stable — only depends on workspaceId) ----
  const connect = useCallback(() => {
    if (!workspaceId) return;

    // Close existing
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const params = new URLSearchParams({
      userId: userIdRef.current,
      userName: userNameRef.current,
      userRole: userRoleRef.current,
    });
    const wsUrl = `${wsProtocol}//${wsHost}/api/workspace/ws/${workspaceId}?${params.toString()}`;

    console.log('🎨 Canvas WS: Connecting to', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🎨 Canvas WS: Connected to workspace', workspaceId);
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessageRef.current(data);
      } catch (err) {
        console.error('🎨 Canvas WS: Error parsing message', err);
      }
    };

    ws.onclose = (event) => {
      console.log('🎨 Canvas WS: Disconnected', event.code, event.reason);
      setIsConnected(false);

      // Reconnect with exponential backoff (skip for intentional close)
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        console.log(`🎨 Canvas WS: Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current += 1;
          connect();
        }, delay);
      } else if (event.code !== 1000) {
        console.warn('🎨 Canvas WS: Max reconnect attempts reached, status will stay Offline');
      }
    };

    ws.onerror = (err) => {
      console.error('🎨 Canvas WS: Error', err);
    };
  }, [workspaceId]); // Only workspaceId — identity from refs

  // ---- Emit operation ----
  const emitOperation = useCallback((op) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(op));
    }
  }, []);

  // ---- Emit cursor position (throttled externally) ----
  const emitCursor = useCallback((x, y) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CURSOR_MOVE', x, y }));
    }
  }, []);

  // ---- Init snapshot (send current canvas state to server on first join) ----
  const initSnapshot = useCallback((canvasData) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'INIT_SNAPSHOT',
        nodes: canvasData.nodes || [],
        edges: canvasData.edges || [],
        zoomLevel: canvasData.zoomLevel || 100,
        taskId: canvasData.taskId,
        subtaskId: canvasData.subtaskId,
      }));
    }
  }, []);

  // ---- Request full state (on reconnect) ----
  const requestFullState = useCallback((taskId, subtaskId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'REQUEST_FULL_STATE',
        taskId,
        subtaskId,
      }));
    }
  }, []);

  // ---- Set callback for remote operations ----
  const setOnRemoteOperation = useCallback((fn) => {
    onRemoteOperationRef.current = fn;
  }, []);

  const setOnFullState = useCallback((fn) => {
    onFullStateRef.current = fn;
  }, []);

  // ---- Connect on mount / workspace change ----
  useEffect(() => {
    console.log('🎨 Canvas WS effect:', { enabled, workspaceId, hasConnect: !!connect });

    if (enabled && workspaceId) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
        wsRef.current = null;
      }
      setIsConnected(false);
      setConnectedUsers([]);
      setRemoteCursors({});
    };
  }, [workspaceId, enabled, connect]); // connect included for React correctness

  // ---- Keepalive ping every 30s ----
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected]);

  return {
    isConnected,
    connectedUsers,
    remoteCursors,
    emitOperation,
    emitCursor,
    initSnapshot,
    requestFullState,
    setOnRemoteOperation,
    setOnFullState,
  };
};

export default useCanvasWebSocket;
