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
}) => {
  if (!workspaceId || !type) return;
  try {
    await axios.post(`/api/workspaces/${workspaceId}/notify`, {
      roles,
      excludeUserId,
      notification: { type, title, message, data, priority, actionRequired }
    });
  } catch (error) {
    console.error('❌ Failed to send workspace notification:', error);
  }
};
