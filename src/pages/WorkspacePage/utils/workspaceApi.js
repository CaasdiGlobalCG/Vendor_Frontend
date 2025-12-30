import axios from 'axios';

// Get workspace by ID
export const getWorkspaceById = async (id) => {
  const res = await axios.get(`/api/dynamo/workspaces/${id}`);
  return res.data;
};

// Update workspace (nodes, edges, etc.)
export const updateWorkspace = async (id, data) => {
  const res = await axios.put(`/api/dynamo/workspaces/${id}`, data);
  return res.data;
};

// Save workspace canvas (specialized endpoint)
export const saveWorkspaceCanvas = async (id, canvasData) => {
  const res = await axios.put(`/api/dynamo/workspaces/${id}/canvas`, canvasData);
  return res.data;
};
