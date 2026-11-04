import axios from 'axios';

// Get workspace by ID
export const getWorkspaceById = async (id) => {
  const res = await axios.get(`/api/workspaces/${id}`);
  return res.data;
};

// Update workspace (nodes, edges, etc.)
export const updateWorkspace = async (id, data) => {
  const res = await axios.put(`/api/workspaces/${id}`, data);
  return res.data;
};

// Save workspace canvas (specialized endpoint)
export const saveWorkspaceCanvas = async (id, canvasData) => {
  const res = await axios.put(`/api/workspaces/${id}/canvas`, canvasData);
  return res.data;
};

// Notify workspace collaborators by role (pm / vendor / client).
// Fire-and-forget — failures are logged, never thrown.
export const notifyWorkspaceEvent = async ({
  workspaceId,
  roles = ['pm', 'vendor', 'client'],
  excludeUserId,
  type,
  title,
  message,
  data,
  priority = 'medium',
  actionRequired = false,
  // Named people to notify, in addition to any `roles` (pass `roles: []` to reach only these)
  targetUserIds,
  // Optional action buttons; the server falls back to "Open Workspace"
  actions,
}) => {
  if (!workspaceId || !type) return;
  try {
    await axios.post(`/api/workspaces/${workspaceId}/notify`, {
      roles,
      excludeUserId,
      ...(Array.isArray(targetUserIds) && targetUserIds.length ? { targetUserIds } : {}),
      notification: {
        type, title, message, data, priority, actionRequired,
        ...(Array.isArray(actions) && actions.length ? { actions } : {}),
      }
    });
  } catch (error) {
    console.error('❌ Failed to send workspace notification:', error);
  }
};

// Approvals: send an element for approval, approve it, send it back, withdraw it or reopen it.
// The server works out who is asking, and what role they play in this workspace, from the
// session and the workspace (never from what is sent), applies the routing rules, stamps the
// time itself and signs the result. Throws an Error with the server's reason when refused.
export const decideApproval = async ({
  workspaceId, nodeId, taskId = null, subtaskId = null, action, approver, forwardTo, note = '', content, pmName,
}) => {
  try {
    const res = await axios.post(
      `/api/workspaces/${workspaceId}/elements/${encodeURIComponent(nodeId)}/approval`,
      { action, approver, forwardTo, note, content, pmName, taskId, subtaskId }
    );
    return res.data;
  } catch (error) {
    throw new Error(error?.response?.data?.message || 'Could not record the decision. Please try again.');
  }
};
