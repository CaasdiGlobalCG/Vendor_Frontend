import axios from 'axios';

/** A vendor's own saved templates (the server only ever returns the signed-in vendor's). */

export const listMyTemplates = async () => {
  const res = await axios.get('/api/workspace-templates');
  return Array.isArray(res.data?.templates) ? res.data.templates : [];
};

export const saveTemplate = async ({ name, description, industry, nodes, edges }) => {
  const res = await axios.post('/api/workspace-templates', { name, description, industry, nodes, edges });
  return res.data; // { template, skipped }
};

export const updateTemplate = async (templateId, { name, description, industry }) => {
  const res = await axios.put(`/api/workspace-templates/${encodeURIComponent(templateId)}`, { name, description, industry });
  return res.data.template;
};

export const deleteTemplate = async (templateId) => {
  await axios.delete(`/api/workspace-templates/${encodeURIComponent(templateId)}`);
};

/** Add a template's tasks (with steps and their working canvases) to a workspace in one request. */
export const createTasksFromTemplate = async (workspaceId, tasks) => {
  const res = await axios.post(`/api/workspaces/${encodeURIComponent(workspaceId)}/tasks/bulk`, { tasks });
  return res.data; // { tasks, workspace }
};

/** A message safe to show a person. */
export const templateErrorMessage = (error) =>
  error?.response?.data?.message || 'Something went wrong. Please try again.';
