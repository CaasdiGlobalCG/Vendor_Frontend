import { authFetchJSON } from '../../../utils/authFetch';

export const workflowClient = {
  listByWorkspace: (workspaceId) => authFetchJSON(`/api/workflows?workspaceId=${encodeURIComponent(workspaceId)}`),

  getById: (workflowId) => authFetchJSON(`/api/workflows/${encodeURIComponent(workflowId)}`),

  create: (payload) =>
    authFetchJSON('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),

  update: (workflowId, payload) =>
    authFetchJSON(`/api/workflows/${encodeURIComponent(workflowId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),

  remove: (workflowId) =>
    authFetchJSON(`/api/workflows/${encodeURIComponent(workflowId)}`, {
      method: 'DELETE'
    }),

  enable: (workflowId) =>
    authFetchJSON(`/api/workflows/${encodeURIComponent(workflowId)}/enable`, {
      method: 'POST'
    }),

  disable: (workflowId) =>
    authFetchJSON(`/api/workflows/${encodeURIComponent(workflowId)}/disable`, {
      method: 'POST'
    }),

  getExecutionLog: (workflowId, limit = 100) =>
    authFetchJSON(`/api/workflows/${encodeURIComponent(workflowId)}/execution-log?limit=${encodeURIComponent(limit)}`),

  getStats: (workflowId) => authFetchJSON(`/api/workflows/${encodeURIComponent(workflowId)}/stats`),

  test: (workflowId, eventData) =>
    authFetchJSON(`/api/workflows/${encodeURIComponent(workflowId)}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventData })
    }),

  getWebhookConfig: (workflowId) =>
    authFetchJSON(`/api/webhooks/workflows/${encodeURIComponent(workflowId)}/config`),

  rotateWebhookSecret: (workflowId) =>
    authFetchJSON(`/api/webhooks/workflows/${encodeURIComponent(workflowId)}/rotate-secret`, {
      method: 'POST'
    }),

  testWebhookTrigger: (workflowId, payload) =>
    authFetchJSON(`/api/webhooks/workflows/${encodeURIComponent(workflowId)}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    }),

  listWorkspaceWebhookConfigs: (workspaceId) =>
    authFetchJSON(`/api/webhooks/workspace/${encodeURIComponent(workspaceId)}`),

  listWorkspaceOutboundWebhooks: (workspaceId) =>
    authFetchJSON(`/api/webhooks/workspace/${encodeURIComponent(workspaceId)}/outbound`)
};
