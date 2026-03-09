/**
 * operationManager.js — Converts ReactFlow callbacks into granular WebSocket operations.
 *
 * Provides:
 *  - Converters from onNodesChange / onEdgesChange / onConnect to op objects
 *  - An OperationBatcher that collects ops for a short window (50ms) and emits them as a batch
 *  - Deduplication: rapid consecutive MOVE ops for the same node keep only the latest
 */

// ---- Operation Creators ----

/**
 * Convert ReactFlow node changes to canvas ops.
 * ReactFlow change types: position, dimensions, remove, select, reset, add
 */
export function nodeChangesToOps(changes, taskId, subtaskId) {
  const ops = [];

  // Collect position changes — these are batched into a single NODES_BATCH_UPDATE
  const positionChanges = [];
  const dimensionChanges = [];

  for (const change of changes) {
    switch (change.type) {
      case 'position': {
        // Only emit when dragging is done (not intermediate)
        if (change.dragging === false && change.position) {
          positionChanges.push({
            type: 'position',
            id: change.id,
            position: change.position,
          });
        }
        break;
      }

      case 'dimensions': {
        if (change.dimensions) {
          dimensionChanges.push({
            type: 'dimensions',
            id: change.id,
            dimensions: change.dimensions,
          });
        }
        break;
      }

      case 'remove': {
        ops.push({
          type: 'NODE_DELETE',
          nodeId: change.id,
          taskId,
          subtaskId,
        });
        break;
      }

      // 'select', 'reset', 'add' don't need persistence
      default:
        break;
    }
  }

  // Batch position changes
  if (positionChanges.length === 1) {
    ops.push({
      type: 'NODE_MOVE',
      nodeId: positionChanges[0].id,
      position: positionChanges[0].position,
      taskId,
      subtaskId,
    });
  } else if (positionChanges.length > 1) {
    ops.push({
      type: 'NODES_BATCH_UPDATE',
      changes: positionChanges,
      taskId,
      subtaskId,
    });
  }

  // Batch dimension changes
  if (dimensionChanges.length > 0) {
    ops.push({
      type: 'NODES_BATCH_UPDATE',
      changes: dimensionChanges,
      taskId,
      subtaskId,
    });
  }

  return ops;
}

/**
 * Convert ReactFlow edge changes to canvas ops.
 */
export function edgeChangesToOps(changes, taskId, subtaskId) {
  const ops = [];

  for (const change of changes) {
    if (change.type === 'remove') {
      ops.push({
        type: 'EDGE_DELETE',
        edgeId: change.id,
        taskId,
        subtaskId,
      });
    }
    // Other edge changes (select, reset) don't need persistence
  }

  return ops;
}

/**
 * Create a NODE_ADD op from a newly created node.
 */
export function createNodeAddOp(node, taskId, subtaskId) {
  return {
    type: 'NODE_ADD',
    node,
    taskId,
    subtaskId,
  };
}

/**
 * Create an EDGE_ADD op from a ReactFlow connection.
 */
export function createEdgeAddOp(edge, taskId, subtaskId) {
  return {
    type: 'EDGE_ADD',
    edge,
    taskId,
    subtaskId,
  };
}

/**
 * Create a NODE_UPDATE op for a partial data patch on a node.
 */
export function createNodeUpdateOp(nodeId, patch, taskId, subtaskId) {
  return {
    type: 'NODE_UPDATE',
    nodeId,
    patch,
    taskId,
    subtaskId,
  };
}

/**
 * Create a NODE_MOVE op.
 */
export function createNodeMoveOp(nodeId, position, taskId, subtaskId) {
  return {
    type: 'NODE_MOVE',
    nodeId,
    position,
    taskId,
    subtaskId,
  };
}

/**
 * Create a ZOOM_CHANGE op.
 */
export function createZoomChangeOp(zoomLevel, taskId, subtaskId) {
  return {
    type: 'ZOOM_CHANGE',
    zoomLevel,
    taskId,
    subtaskId,
  };
}

/**
 * Create a FULL_SYNC op (replaces entire canvas state, used sparingly).
 */
export function createFullSyncOp(nodes, edges, zoomLevel, taskId, subtaskId) {
  return {
    type: 'FULL_SYNC',
    nodes,
    edges,
    zoomLevel,
    taskId,
    subtaskId,
  };
}

// ---- Operation Batcher ----

/**
 * Batches operations over a small time window to reduce WebSocket message frequency.
 * Deduplicates: If multiple MOVE ops for the same node arrive within the window,
 * only the latest position is kept.
 */
export class OperationBatcher {
  constructor(emitFn, windowMs = 50) {
    this.emitFn = emitFn;
    this.windowMs = windowMs;
    this.pending = [];
    this.timer = null;
  }

  /**
   * Add an operation to the batch queue.
   */
  add(op) {
    // Dedup: if this is a MOVE for a node already in pending, replace it
    if (op.type === 'NODE_MOVE') {
      const existingIdx = this.pending.findIndex(
        p => p.type === 'NODE_MOVE' && p.nodeId === op.nodeId
      );
      if (existingIdx !== -1) {
        this.pending[existingIdx] = op;
        return;
      }
    }

    // Dedup: CURSOR_MOVE always replaces previous
    if (op.type === 'CURSOR_MOVE') {
      const existingIdx = this.pending.findIndex(p => p.type === 'CURSOR_MOVE');
      if (existingIdx !== -1) {
        this.pending[existingIdx] = op;
        return;
      }
    }

    this.pending.push(op);

    // Start flush timer if not already running
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.windowMs);
    }
  }

  /**
   * Immediately emit all pending ops.
   */
  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const ops = this.pending;
    this.pending = [];

    for (const op of ops) {
      this.emitFn(op);
    }
  }

  /**
   * Clean up timers.
   */
  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending = [];
  }
}

// ---- Remote Operation Applier ----

/**
 * Apply a remote canvas operation to local ReactFlow state.
 * This function does NOT trigger the auto-save — it modifies state directly
 * using the setNodes/setEdges functions.
 *
 * @param {object} op — The incoming operation
 * @param {Function} setNodes — ReactFlow setNodes
 * @param {Function} setEdges — ReactFlow setEdges
 * @param {Function} [setZoomLevel] — Optional zoom setter
 */
export function applyRemoteOperation(op, setNodes, setEdges, setZoomLevel) {
  switch (op.type) {
    case 'NODE_ADD': {
      if (op.node) {
        setNodes(prev => {
          if (prev.find(n => n.id === op.node.id)) return prev; // Already exists
          return [...prev, op.node];
        });
      }
      break;
    }

    case 'NODE_MOVE': {
      setNodes(prev =>
        prev.map(n => n.id === op.nodeId ? { ...n, position: op.position } : n)
      );
      break;
    }

    case 'NODE_RESIZE': {
      setNodes(prev =>
        prev.map(n => {
          if (n.id !== op.nodeId) return n;
          const updated = { ...n };
          if (op.dimensions) {
            updated.style = { ...(n.style || {}), ...op.dimensions };
          }
          if (op.position) {
            updated.position = op.position;
          }
          return updated;
        })
      );
      break;
    }

    case 'NODE_UPDATE': {
      setNodes(prev =>
        prev.map(n => {
          if (n.id !== op.nodeId) return n;
          return { ...n, data: { ...(n.data || {}), ...(op.patch || {}) } };
        })
      );
      break;
    }

    case 'NODE_DELETE': {
      setNodes(prev => prev.filter(n => n.id !== op.nodeId));
      setEdges(prev => prev.filter(e => e.source !== op.nodeId && e.target !== op.nodeId));
      break;
    }

    case 'NODES_BATCH_UPDATE': {
      if (Array.isArray(op.changes)) {
        setNodes(prev => {
          let updated = [...prev];
          for (const change of op.changes) {
            if (change.type === 'position' && change.id && change.position) {
              updated = updated.map(n => n.id === change.id ? { ...n, position: change.position } : n);
            } else if (change.type === 'dimensions' && change.id && change.dimensions) {
              updated = updated.map(n => n.id === change.id ? {
                ...n,
                style: { ...(n.style || {}), width: change.dimensions.width, height: change.dimensions.height }
              } : n);
            } else if (change.type === 'remove' && change.id) {
              updated = updated.filter(n => n.id !== change.id);
            }
          }
          return updated;
        });
      }
      break;
    }

    case 'EDGE_ADD': {
      if (op.edge) {
        setEdges(prev => {
          if (prev.find(e => e.id === op.edge.id)) return prev; // Already exists
          return [...prev, op.edge];
        });
      }
      break;
    }

    case 'EDGE_DELETE': {
      setEdges(prev => prev.filter(e => e.id !== op.edgeId));
      break;
    }

    case 'EDGES_BATCH_UPDATE': {
      if (Array.isArray(op.changes)) {
        setEdges(prev => {
          let updated = [...prev];
          for (const change of op.changes) {
            if (change.type === 'remove' && change.id) {
              updated = updated.filter(e => e.id !== change.id);
            }
          }
          return updated;
        });
      }
      break;
    }

    case 'ZOOM_CHANGE': {
      if (setZoomLevel && op.zoomLevel != null) {
        setZoomLevel(op.zoomLevel);
      }
      break;
    }

    case 'FULL_SYNC': {
      if (op.nodes) setNodes(op.nodes);
      if (op.edges) setEdges(op.edges);
      if (setZoomLevel && op.zoomLevel != null) setZoomLevel(op.zoomLevel);
      break;
    }

    default:
      break;
  }
}
