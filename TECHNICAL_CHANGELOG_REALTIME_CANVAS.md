# Technical Changelog: Real-Time Canvas Collaboration via WebSocket

**Date:** March 2, 2026  
**Author:** Engineering Team  
**Scope:** Vendor_Backend, Vendor_Frontend

---

## Summary

Replaced the HTTP-based 2-second debounced full-canvas auto-save mechanism with a WebSocket-based operation streaming architecture. Canvas changes are now broadcast to all connected users in real time (~50ms latency) via granular operations, and persisted to DynamoDB in batched 5-second intervals.

---

## Files Changed

### NEW FILES

#### 1. `Vendor_Backend/websocket/canvasSocket.js`

**Purpose:** Canvas WebSocket server — manages workspace "rooms", processes granular operations, buffers changes, and flushes to DynamoDB periodically.

**Key components:**
- **Room management:** `getOrCreateRoom()`, `removeUserFromRoom()`, `broadcastToRoom()`
- **Operation types:** `NODE_ADD`, `NODE_MOVE`, `NODE_RESIZE`, `NODE_UPDATE`, `NODE_DELETE`, `NODES_BATCH_UPDATE`, `EDGE_ADD`, `EDGE_DELETE`, `EDGES_BATCH_UPDATE`, `ZOOM_CHANGE`, `FULL_SYNC`
- **In-memory snapshots:** Each workspace room maintains a `canvasSnapshots` Map keyed by `taskId::subtaskId`. Operations are applied to the snapshot immediately.
- **Batched DynamoDB flush:** Every 5 seconds (configurable via `FLUSH_INTERVAL_MS`), the buffer is flushed. The in-memory snapshot is written directly to DynamoDB instead of replaying ops.
- **Presence:** `CURSOR_MOVE` messages broadcast cursor positions without buffering.
- **Graceful shutdown:** `flushAll()` exported for SIGINT/SIGTERM handlers.

**Exported functions:**
- `initCanvasWebSocketServer(server)` — mounts on `/api/workspace/ws/:workspaceId`
- `getWorkspaceRoomUsers(workspaceId)` — query connected users
- `forceFlush(workspaceId)` / `flushAll()` — manual flush triggers

---

#### 2. `Vendor_Frontend/src/hooks/useCanvasWebSocket.js`

**Purpose:** React hook encapsulating the canvas WebSocket connection lifecycle.

**API:**
```js
const {
  isConnected,       // boolean — WebSocket connection state
  connectedUsers,    // array of { userId, userName, userRole }
  remoteCursors,     // { [userId]: { x, y, userName } }
  emitOperation,     // (op) => void — send an operation to the server
  emitCursor,        // (x, y) => void — send cursor position
  initSnapshot,      // (canvasData) => void — initialize server snapshot
  requestFullState,  // (taskId, subtaskId) => void — request full state on reconnect
  setOnRemoteOperation, // (fn) => void — register handler for incoming remote ops
  setOnFullState,    // (fn) => void — register handler for full state responses
} = useCanvasWebSocket(workspaceId, currentUser, { enabled });
```

**Behavior:**
- Connects to `ws(s)://host/api/workspace/ws/:workspaceId?userId=...&userName=...&userRole=...`
- Exponential backoff reconnection (up to 10 attempts)
- 30-second keepalive ping
- Filters out self-originated messages to avoid echo

---

#### 3. `Vendor_Frontend/src/pages/WorkspacePage/utils/operationManager.js`

**Purpose:** Converts ReactFlow callbacks into granular WebSocket-compatible operations.

**Exported functions:**
- `nodeChangesToOps(changes, taskId, subtaskId)` — converts `onNodesChange` events to ops
- `edgeChangesToOps(changes, taskId, subtaskId)` — converts `onEdgesChange` events to ops
- `createNodeAddOp(node, taskId, subtaskId)` — create NODE_ADD op
- `createEdgeAddOp(edge, taskId, subtaskId)` — create EDGE_ADD op
- `createNodeUpdateOp(nodeId, patch, taskId, subtaskId)` — create NODE_UPDATE op
- `createNodeMoveOp(nodeId, position, taskId, subtaskId)` — create NODE_MOVE op
- `createZoomChangeOp(zoomLevel, taskId, subtaskId)` — create ZOOM_CHANGE op
- `createFullSyncOp(...)` — create FULL_SYNC op

**`OperationBatcher` class:**
- Batches operations within a 50ms window before emitting
- Deduplicates: rapid consecutive `NODE_MOVE` ops for the same node keep only the latest position

**`applyRemoteOperation(op, setNodes, setEdges, setZoomLevel)`:**
- Applies a remote operation to local ReactFlow state
- Used by CanvasWorkspace to process incoming ops from other users

---

#### 4. `Vendor_Frontend/src/pages/WorkspacePage/components/RemoteCursor.jsx`

**Purpose:** Renders a remote user's cursor on the canvas with a colored pointer and name label.

**Props:** `userId`, `userName`, `x`, `y`

**Behavior:**
- Generates a consistent color per userId using a hash function
- CSS `transition` for smooth cursor movement (100ms linear)
- `position: fixed` with `pointerEvents: none` overlay
- `React.memo` for performance

---

### MODIFIED FILES

#### 5. `Vendor_Backend/server.js`

**Before:**
```js
import { initWebSocketServer } from './websocket/notificationSocket.js';
// ...
const wss = initWebSocketServer(server);
console.log('✅ WebSocket server initialized');
```

**After:**
```js
import { initWebSocketServer } from './websocket/notificationSocket.js';
import { initCanvasWebSocketServer, flushAll as flushAllCanvasBuffers } from './websocket/canvasSocket.js';
// ...
// Canvas WS registered BEFORE notification WS to ensure correct upgrade handling
const canvasWss = initCanvasWebSocketServer(server);
console.log('✅ Canvas WebSocket server initialized');

const wss = initWebSocketServer(server);
console.log('✅ Notification WebSocket server initialized');

// Graceful shutdown: flush canvas buffers before exit
const gracefulShutdown = async (signal) => { ... };
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
```

---

#### 6. `Vendor_Backend/websocket/notificationSocket.js`

**Before:**
```js
if (pathname.startsWith('/api/notifications/ws')) {
    wss.handleUpgrade(request, socket, head, (ws) => { ... });
} else {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
}
```

**After:**
```js
if (pathname.startsWith('/api/notifications/ws')) {
    wss.handleUpgrade(request, socket, head, (ws) => { ... });
}
// Do NOT destroy unmatched sockets — other WS servers (canvas) may handle them
```

**Reason:** The notification WS previously destroyed any WebSocket upgrade request that didn't match `/api/notifications/ws/*`. This would kill canvas WebSocket connections before they could be handled by the canvas WS server.

---

#### 7. `Vendor_Frontend/src/pages/WorkspacePage/components/CanvasWorkspace.jsx`

**Before (lines ~718-769):**
```jsx
// Auto-save workspace data when nodes or edges change
useEffect(() => {
    if (onSaveWorkspace && workspace?.workspaceId) {
      const saveData = { nodes, edges, zoomLevel, canvasSettings: {} };
      setSaveStatus('saving');
      const timeoutId = setTimeout(async () => {
        skipNextSyncRef.current = true;
        await onSaveWorkspace(saveData);  // HTTP PUT with full canvas
        setSaveStatus('saved');
        // ...
      }, 2000); // 2-second debounce
      return () => clearTimeout(timeoutId);
    }
}, [nodes, edges, zoomLevel, ...]);
```

**After:**
```jsx
// WebSocket-based real-time sync (replaces the old 2-second HTTP auto-save)
// 1. Operation batcher — batches rapid ops into 50ms windows
// 2. emitOp() — sends ops through batcher or directly via WS
// 3. registerCanvasEmitter() — allows nodePersistence.js to use WS
// 4. Remote operation handler — applies incoming ops from other users
// 5. Remote cursor tracking — throttled to 10fps
// 6. Fallback HTTP auto-save — only triggers every 30s IF WebSocket is disconnected
```

**Additional changes in ReactFlow JSX:**
- `onNodesChange` now also calls `nodeChangesToOps()` and emits ops
- `onEdgesChange` now also calls `edgeChangesToOps()` and emits ops
- `onConnect` now also emits `createEdgeAddOp()`
- Canvas div has `onMouseMove={handleCanvasMouseMove}` for cursor tracking
- Remote cursors rendered as `<RemoteCursor>` overlay components
- Real-time sync indicator (green/red dot + "Live"/"Offline" label + user count) added to toolbar

**New props:** `canvasWebSocket` (passed from WorkspacePage → WorkspaceMain → CanvasWorkspace)

---

#### 8. `Vendor_Frontend/src/pages/WorkspacePage/WorkspacePage.jsx`

**Before:**
```jsx
import useWebSocketNotifications from '../../hooks/useWebSocketNotifications';
```

**After:**
```jsx
import useWebSocketNotifications from '../../hooks/useWebSocketNotifications';
import useCanvasWebSocket from '../../hooks/useCanvasWebSocket';

// ...
const canvasWebSocket = useCanvasWebSocket(workspaceId, currentUser, {
  enabled: !!workspaceId && !!currentUser,
});

// Passed down:
<WorkspaceMain ... canvasWebSocket={canvasWebSocket} />
```

---

#### 9. `Vendor_Frontend/src/pages/WorkspacePage/components/WorkspaceMain.jsx`

**Before:**
```jsx
const WorkspaceMain = ({ ..., onZoomChange }) => {
  // ...
  <CanvasWorkspace ... onZoomChange={onZoomChange} />
```

**After:**
```jsx
const WorkspaceMain = ({ ..., onZoomChange, canvasWebSocket }) => {
  // ...
  <CanvasWorkspace ... onZoomChange={onZoomChange} canvasWebSocket={canvasWebSocket} />
```

---

#### 10. `Vendor_Frontend/src/pages/WorkspacePage/utils/nodePersistence.js`

**Before:** Every function (persistNodeDataPatch, persistIsImportant, persistDeadline, persistTextContent) did:
```
1. GET /api/workspaces/:id          → full workspace JSON
2. Find node in subtask canvas
3. Patch the one field
4. PUT entire canvas back           → HTTP round trip
```

**After:** Each function now checks for a global WebSocket emitter first:
```
1. If _globalEmitOp is set:
   → Emit a single NODE_UPDATE op (~100 bytes) via WebSocket
   → Update local React state immediately (optimistic)
   → Return (no HTTP calls)

2. Else (fallback):
   → Original GET-then-PUT HTTP flow
```

**New exports:**
- `registerCanvasEmitter(emitOp, taskId, subtaskId)` — called by CanvasWorkspace when WS connects
- `unregisterCanvasEmitter()` — called when WS disconnects or component unmounts

---

## Data Flow Comparison

### Before
```
User action → 2s debounce → HTTP PUT (full {nodes[], edges[], zoomLevel})
  → Backend receives entire canvas → DynamoDB write (full item) → HTTP response
  → Other users: must refresh page to see changes
```

### After
```
User action → instant local state update → 50ms batch → WebSocket emit {type: NODE_MOVE, nodeId, position}
  → Server receives tiny op → applies to in-memory snapshot → broadcasts to room
  → Other users receive op in ~50ms → apply to their local state (no page refresh)
  → Server flushes snapshot to DynamoDB every 5 seconds (batched)
```

---

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Payload per local change | Full canvas (~10-100KB) | Single operation (~100 bytes) |
| Network round trips per change | 1 HTTP request + response | 1 WebSocket message (no response wait) |
| DynamoDB writes per minute (1 user editing) | ~30 writes/min | ~12 writes/min |
| Time for other users to see changes | Manual refresh required | ~50-100ms |
| Conflict risk | High (last-write-wins on full canvas) | Low (per-node granular ops) |

---

## Backward Compatibility

- **HTTP endpoints preserved:** `PUT /api/workspaces/:id/canvas` and `PUT /api/workspaces/:id/tasks/:taskId/subtasks/:subtaskId/canvas` remain functional for manual saves and fallback.
- **Graceful degradation:** If WebSocket connection fails, the system falls back to HTTP auto-save (30-second interval instead of 2-second) — no data loss.
- **No database schema changes:** The DynamoDB table structure is unchanged. The WebSocket server writes to the same `workspaces_table` using the same model.
- **nodePersistence fallback:** If the WS emitter is not registered, all persistence functions use the original HTTP flow.
