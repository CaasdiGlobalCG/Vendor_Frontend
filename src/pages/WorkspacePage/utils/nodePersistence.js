import axios from 'axios';
import { updateWorkspace, getWorkspaceById } from './workspaceApi';
import { createNodeUpdateOp } from './operationManager';

// ---- WebSocket-aware global emitter ----
// CanvasWorkspace sets this when canvasWebSocket is available.
// nodePersistence functions check it first — if set, they emit a tiny
// NODE_UPDATE op over WebSocket instead of the heavy GET-then-PUT HTTP cycle.
let _globalEmitOp = null;
let _globalTaskId = null;
let _globalSubtaskId = null;

/**
 * Called by CanvasWorkspace to register the current WebSocket emitter.
 * This avoids prop-drilling emitOp into every node component.
 */
export const registerCanvasEmitter = (emitOp, taskId, subtaskId) => {
  _globalEmitOp = emitOp;
  _globalTaskId = taskId;
  _globalSubtaskId = subtaskId;
};

/**
 * Called on unmount / when WebSocket disconnects.
 */
export const unregisterCanvasEmitter = () => {
  _globalEmitOp = null;
  _globalTaskId = null;
  _globalSubtaskId = null;
};

// ---- Pending text-focus registry ----
// Node ids queued here start in edit mode on their next mount. Used instead
// of a data flag so the "please focus me" intent is never broadcast or
// persisted (a remote client receiving isEditing:true would hijack focus).
const pendingTextFocusNodeIds = new Set();

export const markTextNodeForFocus = (nodeId) => {
  if (nodeId) pendingTextFocusNodeIds.add(nodeId);
};

export const consumeTextNodeFocus = (nodeId) => {
  const pending = pendingTextFocusNodeIds.has(nodeId);
  if (pending) pendingTextFocusNodeIds.delete(nodeId);
  return pending;
};

const isApprovalFlowInProgress = () => {
  try {
    return typeof window !== 'undefined' && !!window.__isApprovingInProgress;
  } catch {
    return false;
  }
};

/**
 * Approval/workflow state changes must go through the durable HTTP path.
 * The WebSocket fast path is fire-and-forget: ops are buffered and flushed to
 * DynamoDB on an interval, and the in-memory snapshot can be stale — so an
 * approval could be dropped or reverted before it ever reaches the DB.
 */
const requiresDurableWrite = (dataPatch) =>
  !!dataPatch && (
    'approvalStatus' in dataPatch ||
    'pmApproval' in dataPatch ||
    'clientApproval' in dataPatch ||
    'approval' in dataPatch ||
    'sentForApprovalAt' in dataPatch ||
    'deletionRequested' in dataPatch ||
    'deletionRequestedAt' in dataPatch ||
    'deletionRequestedBy' in dataPatch ||
    'deletionReason' in dataPatch ||
    'deletionApprovedAt' in dataPatch ||
    'deletionRejectedAt' in dataPatch ||
    'deletionRejectedBy' in dataPatch
  );

/**
 * Live-sync text while typing: patches the node's data locally (so autosave
 * and the shared snapshot see it) and emits an ephemeral NODE_UPDATE so
 * collaborators see keystrokes in real time. The durable write still happens
 * on blur via persistTextContent.
 */
export const emitLiveTextPatch = (nodeId, content, contentType, setNodes) => {
  const patch = { [contentType]: content, lastModifiedAt: new Date().toISOString() };
  if (_globalEmitOp) {
    _globalEmitOp({
      ...createNodeUpdateOp(nodeId, patch, _globalTaskId, _globalSubtaskId),
      ephemeral: true
    });
  }
  // Always patch local node data — otherwise content only exists in the
  // component's local state until blur (invisible to collaborators/DB).
  setNodes?.((currentNodes) =>
    currentNodes.map(node =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node
    )
  );
};

export const findSubtaskContainingNode = (workspace, nodeId) => {
  const tasks = workspace?.tasks || [];
  for (const task of tasks) {
    const subtasks = task?.subtasks || [];
    for (const subtask of subtasks) {
      const nodes = subtask?.canvasData?.nodes || [];
      if (nodes.some((n) => n?.id === nodeId)) {
        return {
          taskId: task.id,
          subtaskId: subtask.id,
          canvasData: {
            nodes: nodes || [],
            edges: subtask?.canvasData?.edges || [],
            zoomLevel: subtask?.canvasData?.zoomLevel || 100
          }
        };
      }
    }
  }
  return null;
};

const saveSubtaskCanvas = async (workspaceId, taskId, subtaskId, canvasData) => {
  const res = await axios.put(
    `/api/workspaces/${workspaceId}/tasks/${taskId}/subtasks/${subtaskId}/canvas`,
    {
      nodes: canvasData.nodes || [],
      edges: canvasData.edges || [],
      zoomLevel: canvasData.zoomLevel || 100
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  return res.data;
};

/**
 * Persist a partial update to node.data, saving into subtask canvas when the node belongs to a subtask.
 * @param {string} nodeId
 * @param {object} dataPatch - partial node.data patch
 * @param {Function} [setNodes] - optional React Flow setNodes
 * @param {string} workspaceId
 * @param {object} [options]
 */
export const persistNodeDataPatch = async (nodeId, dataPatch, setNodes, workspaceId, options = {}) => {
  if (!workspaceId || !nodeId) return;

  const bypassApprovalFlow = !!options?.bypassApprovalFlow;

  if (!bypassApprovalFlow && isApprovalFlowInProgress()) {
    console.log('⏸️ Skipping persistNodeDataPatch - approval submission in progress');
    return;
  }

  // ---- Always emit via WebSocket when available ----
  // The op broadcasts the change to collaborators in real time (e.g. the PM's
  // canvas must see approvalStatus: 'sent_to_pm' for approve/reject buttons to
  // appear). For workflow-state patches we then CONTINUE to the durable HTTP
  // write below — the op alone is not enough since flush is buffered and the
  // subsequent refresh must read the committed value.
  if (_globalEmitOp) {
    const op = createNodeUpdateOp(nodeId, dataPatch, _globalTaskId, _globalSubtaskId);
    _globalEmitOp(op);

    // Update local React state immediately (optimistic)
    if (typeof setNodes === 'function') {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...(node.data || {}), ...(dataPatch || {}) } }
            : node
        )
      );
    }

    // Non-durable patches are done — WS op + optimistic update suffice.
    if (!requiresDurableWrite(dataPatch)) return;
  }

  // ---- Durable path: HTTP read-then-write ----

  const workspace = await getWorkspaceById(workspaceId);
  const subtaskLocation = findSubtaskContainingNode(workspace, nodeId);

  if (subtaskLocation?.taskId && subtaskLocation?.subtaskId) {
    const updatedNodes = (subtaskLocation.canvasData.nodes || []).map((node) => {
      if (node.id !== nodeId) return node;
      return {
        ...node,
        data: {
          ...(node.data || {}),
          ...(dataPatch || {})
        }
      };
    });

    await saveSubtaskCanvas(workspaceId, subtaskLocation.taskId, subtaskLocation.subtaskId, {
      ...subtaskLocation.canvasData,
      nodes: updatedNodes
    });

    if (typeof setNodes === 'function') {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...(node.data || {}),
                  ...(dataPatch || {})
                }
              }
            : node
        )
      );
    }

    return;
  }

  const updatedNodes = (workspace.nodes || []).map((node) => {
    if (node.id !== nodeId) return node;
    return {
      ...node,
      data: {
        ...(node.data || {}),
        ...(dataPatch || {})
      }
    };
  });

  await updateWorkspace(workspaceId, {
    nodes: updatedNodes,
    edges: workspace.edges || [],
    zoomLevel: workspace.zoomLevel || 100
  });

  if (typeof setNodes === 'function') {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...(node.data || {}),
                ...(dataPatch || {})
              }
            }
          : node
      )
    );
  }
};

/**
 * Durably delete a node from the persisted canvas.
 * Elements live inside subtask canvasData — filtering workspace.nodes (the
 * root canvas) removes nothing. This removes the node and its connected edges
 * from the owning subtask via HTTP, emits NODE_DELETE so the shared WS
 * snapshot/collaborators drop it too, and updates local React Flow state.
 */
export const persistNodeDeletion = async (nodeId, setNodes, setEdges, workspaceId) => {
  if (!workspaceId || !nodeId) return;

  // Emit NODE_DELETE so the shared WS snapshot drops the node, the deletion is
  // marked (stale snapshots can't resurrect it on flush), and collaborators
  // see it disappear in real time.
  if (_globalEmitOp) {
    _globalEmitOp({
      type: 'NODE_DELETE',
      nodeId,
      taskId: _globalTaskId,
      subtaskId: _globalSubtaskId
    });
  }

  const workspace = await getWorkspaceById(workspaceId);
  const subtaskLocation = findSubtaskContainingNode(workspace, nodeId);

  if (subtaskLocation?.taskId && subtaskLocation?.subtaskId) {
    const nodes = (subtaskLocation.canvasData.nodes || []).filter(n => n?.id !== nodeId);
    const edges = (subtaskLocation.canvasData.edges || []).filter(
      e => e?.source !== nodeId && e?.target !== nodeId
    );

    await saveSubtaskCanvas(workspaceId, subtaskLocation.taskId, subtaskLocation.subtaskId, {
      ...subtaskLocation.canvasData,
      nodes,
      edges
    });
  } else {
    const nodes = (workspace.nodes || []).filter(n => n?.id !== nodeId);
    const edges = (workspace.edges || []).filter(
      e => e?.source !== nodeId && e?.target !== nodeId
    );

    await updateWorkspace(workspaceId, {
      nodes,
      edges,
      zoomLevel: workspace.zoomLevel || 100
    });
  }

  if (typeof setNodes === 'function') {
    setNodes((currentNodes) => currentNodes.filter(n => n.id !== nodeId));
  }
  if (typeof setEdges === 'function') {
    setEdges((currentEdges) =>
      currentEdges.filter(e => e.source !== nodeId && e.target !== nodeId)
    );
  }
};

/**
 * Persist the isImportant flag to backend for a node
 * @param {string} nodeId - The node ID
 * @param {boolean} isImportant - Whether the node is marked as important
 * @param {object} setNodes - React Flow setNodes function
 * @param {string} workspaceId - The workspace ID
 */
export const persistIsImportant = async (nodeId, isImportant, setNodes, workspaceId) => {
  try {
    if (isApprovalFlowInProgress()) {
      console.log('⏸️ Skipping persistIsImportant - approval submission in progress');
      return;
    }

    console.log('💾 Persisting isImportant:', { nodeId, isImportant });

    // ---- Fast path: WebSocket ----
    if (_globalEmitOp) {
      const op = createNodeUpdateOp(nodeId, { isImportant }, _globalTaskId, _globalSubtaskId);
      _globalEmitOp(op);
      setNodes((currentNodes) =>
        currentNodes.map(node =>
          node.id === nodeId ? { ...node, data: { ...node.data, isImportant } } : node
        )
      );
      console.log('✅ isImportant persisted via WebSocket');
      return;
    }

    // ---- Fallback: HTTP ----
    
    // Fetch the latest workspace data
    const workspace = await getWorkspaceById(workspaceId);

    // Prefer saving into subtask canvas if the node lives there
    const subtaskLocation = findSubtaskContainingNode(workspace, nodeId);
    if (subtaskLocation?.taskId && subtaskLocation?.subtaskId) {
      const updatedNodes = (subtaskLocation.canvasData.nodes || []).map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              isImportant: isImportant
            }
          };
        }
        return node;
      });

      await saveSubtaskCanvas(workspaceId, subtaskLocation.taskId, subtaskLocation.subtaskId, {
        ...subtaskLocation.canvasData,
        nodes: updatedNodes
      });

      setNodes((currentNodes) =>
        currentNodes.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                isImportant: isImportant
              }
            };
          }
          return node;
        })
      );

      console.log('✅ isImportant persisted successfully (subtask canvas)');
      return;
    }
    
    // Update the specific node with isImportant flag
    const updatedNodes = (workspace.nodes || []).map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            isImportant: isImportant
          }
        };
      }
      return node;
    });
    
    // Call updateWorkspace API with safe fields only
    const saveData = {
      nodes: updatedNodes,
      edges: workspace.edges || [],
      zoomLevel: workspace.zoomLevel || 100
    };
    
    await updateWorkspace(workspaceId, saveData);
    
    // Update React Flow nodes to reflect the change
    setNodes((currentNodes) =>
      currentNodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              isImportant: isImportant
            }
          };
        }
        return node;
      })
    );
    
    console.log('✅ isImportant persisted successfully');
  } catch (error) {
    console.error('❌ Error persisting isImportant:', error);
    throw error;
  }
};

/**
 * Persist the deadline to backend for a node
 * @param {string} nodeId - The node ID
 * @param {string|Date} deadline - The deadline (will be converted to ISO string)
 * @param {object} setNodes - React Flow setNodes function
 * @param {string} workspaceId - The workspace ID
 */
export const persistDeadline = async (nodeId, deadline, setNodes, workspaceId) => {
  try {
    if (isApprovalFlowInProgress()) {
      console.log('⏸️ Skipping persistDeadline - approval submission in progress');
      return;
    }

    console.log('💾 Persisting deadline:', { nodeId, deadline });
    
    // Convert to ISO string if it's a date
    const isoDeadline = deadline instanceof Date ? deadline.toISOString() : 
                       (typeof deadline === 'string' && deadline.includes('T')) ? deadline :
                       (deadline ? new Date(deadline).toISOString() : null);
    
    console.log('📅 Converted deadline to ISO:', isoDeadline);

    // ---- Fast path: WebSocket ----
    if (_globalEmitOp) {
      const op = createNodeUpdateOp(nodeId, { deadline: isoDeadline }, _globalTaskId, _globalSubtaskId);
      _globalEmitOp(op);
      setNodes((currentNodes) =>
        currentNodes.map(node =>
          node.id === nodeId ? { ...node, data: { ...node.data, deadline: isoDeadline } } : node
        )
      );
      console.log('✅ Deadline persisted via WebSocket');
      return;
    }

    // ---- Fallback: HTTP ----
    
    // Fetch the latest workspace data
    const workspace = await getWorkspaceById(workspaceId);

    // Prefer saving into subtask canvas if the node lives there
    const subtaskLocation = findSubtaskContainingNode(workspace, nodeId);
    if (subtaskLocation?.taskId && subtaskLocation?.subtaskId) {
      const updatedNodes = (subtaskLocation.canvasData.nodes || []).map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              deadline: isoDeadline
            }
          };
        }
        return node;
      });

      await saveSubtaskCanvas(workspaceId, subtaskLocation.taskId, subtaskLocation.subtaskId, {
        ...subtaskLocation.canvasData,
        nodes: updatedNodes
      });

      setNodes((currentNodes) =>
        currentNodes.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                deadline: isoDeadline
              }
            };
          }
          return node;
        })
      );

      console.log('✅ Deadline persisted successfully (subtask canvas)');
      return;
    }
    
    // Update the specific node with deadline
    const updatedNodes = (workspace.nodes || []).map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            deadline: isoDeadline
          }
        };
      }
      return node;
    });
    
    // Call updateWorkspace API with safe fields only
    const saveData = {
      nodes: updatedNodes,
      edges: workspace.edges || [],
      zoomLevel: workspace.zoomLevel || 100
    };
    
    await updateWorkspace(workspaceId, saveData);
    
    // Update React Flow nodes to reflect the change
    setNodes((currentNodes) =>
      currentNodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              deadline: isoDeadline
            }
          };
        }
        return node;
      })
    );
    
    console.log('✅ Deadline persisted successfully');
  } catch (error) {
    console.error('❌ Error persisting deadline:', error);
    throw error;
  }
};

/**
 * Calculate time remaining from now until deadline
 * @param {string} deadline - ISO format deadline string
 * @returns {object} Object with days, hours, minutes, seconds
 */
export const getTimeLeft = (deadline) => {
  if (!deadline) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false };
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate - now;
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, isExpired: false };
};

/**
 * Format time remaining as human readable string
 * @param {object} timeLeft - Object from getTimeLeft()
 * @returns {string} Formatted time string
 */
export const formatTimeLeft = (timeLeft) => {
  if (!timeLeft || timeLeft.isExpired) return 'Expired';
  if (timeLeft.days > 0) return `${timeLeft.days}d ${timeLeft.hours}h`;
  if (timeLeft.hours > 0) return `${timeLeft.hours}h ${timeLeft.minutes}m`;
  if (timeLeft.minutes > 0) return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
  return `${timeLeft.seconds}s`;
};
/**
 * Persist text content (textarea, textbox) to backend
 * @param {string} nodeId - The node ID
 * @param {string} content - The text content
 * @param {string} contentType - Type of content ('textareaValue' or 'inputValue')
 * @param {object} setNodes - React Flow setNodes function
 * @param {string} workspaceId - The workspace ID
 */
export const persistTextContent = async (nodeId, content, contentType, setNodes, workspaceId) => {
  try {
    if (isApprovalFlowInProgress()) {
      console.log('⏸️ Skipping persistTextContent - approval submission in progress');
      return;
    }

    console.log('💾 Persisting text content:', { nodeId, contentType, length: content.length });

    // ---- Fast path: WebSocket ----
    if (_globalEmitOp) {
      const patch = { [contentType]: content, lastModifiedAt: new Date().toISOString() };
      const op = createNodeUpdateOp(nodeId, patch, _globalTaskId, _globalSubtaskId);
      _globalEmitOp(op);
      setNodes((currentNodes) =>
        currentNodes.map(node =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node
        )
      );
      console.log('✅ Text content persisted via WebSocket');
      return;
    }

    // ---- Fallback: HTTP ----
    
    // Fetch the latest workspace data
    const workspace = await getWorkspaceById(workspaceId);

    // Prefer saving into subtask canvas if the node lives there
    const subtaskLocation = findSubtaskContainingNode(workspace, nodeId);
    if (subtaskLocation?.taskId && subtaskLocation?.subtaskId) {
      const updatedNodes = (subtaskLocation.canvasData.nodes || []).map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              [contentType]: content,
              lastModifiedAt: new Date().toISOString()
            }
          };
        }
        return node;
      });

      await saveSubtaskCanvas(workspaceId, subtaskLocation.taskId, subtaskLocation.subtaskId, {
        ...subtaskLocation.canvasData,
        nodes: updatedNodes
      });

      setNodes((currentNodes) =>
        currentNodes.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                [contentType]: content,
                lastModifiedAt: new Date().toISOString()
              }
            };
          }
          return node;
        })
      );

      console.log('✅ Text content persisted successfully (subtask canvas)');
      return;
    }
    
    // Update the specific node with text content
    const updatedNodes = (workspace.nodes || []).map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            [contentType]: content,
            lastModifiedAt: new Date().toISOString()
          }
        };
      }
      return node;
    });
    
    // Call updateWorkspace API with safe fields only
    const saveData = {
      nodes: updatedNodes,
      edges: workspace.edges || [],
      zoomLevel: workspace.zoomLevel || 100
    };
    
    await updateWorkspace(workspaceId, saveData);
    
    // Update React Flow nodes to reflect the change
    setNodes((currentNodes) =>
      currentNodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              [contentType]: content,
              lastModifiedAt: new Date().toISOString()
            }
          };
        }
        return node;
      })
    );
    
    console.log('✅ Text content persisted successfully');
  } catch (error) {
    console.error('❌ Error persisting text content:', error);
    throw error;
  }
};