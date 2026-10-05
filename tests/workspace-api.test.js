/**
 * workspaceApi — mocked-integration suite (T4: mocked live services).
 *
 * Verifies the frontend↔backend contract for the workspace API layer:
 * exact URLs, HTTP methods, payload shapes, and the fire-and-forget behaviour
 * of notifyWorkspaceEvent — without any real network calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

import axios from 'axios';
import {
  getWorkspaceById,
  updateWorkspace,
  saveWorkspaceCanvas,
  notifyWorkspaceEvent,
} from '../src/pages/WorkspacePage/utils/workspaceApi.js';

describe('workspaceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getWorkspaceById GETs /api/workspaces/:id and returns data', async () => {
    axios.get.mockResolvedValue({ data: { workspaceId: 'ws-1', nodes: [] } });
    const result = await getWorkspaceById('ws-1');
    expect(axios.get).toHaveBeenCalledWith('/api/workspaces/ws-1');
    expect(result).toEqual({ workspaceId: 'ws-1', nodes: [] });
  });

  it('updateWorkspace PUTs the payload to /api/workspaces/:id', async () => {
    axios.put.mockResolvedValue({ data: { success: true } });
    const payload = { nodes: [{ id: 'n1' }], edges: [] };
    const result = await updateWorkspace('ws-9', payload);
    expect(axios.put).toHaveBeenCalledWith('/api/workspaces/ws-9', payload);
    expect(result).toEqual({ success: true });
  });

  it('saveWorkspaceCanvas PUTs canvas data to the dedicated /canvas endpoint', async () => {
    axios.put.mockResolvedValue({ data: { saved: true } });
    const canvas = { nodes: [{ id: 'calc-1', type: 'cost-calculator' }], edges: [] };
    const result = await saveWorkspaceCanvas('ws-9', canvas);
    expect(axios.put).toHaveBeenCalledWith('/api/workspaces/ws-9/canvas', canvas);
    expect(result).toEqual({ saved: true });
  });

  it('notifyWorkspaceEvent POSTs the notification envelope', async () => {
    axios.post.mockResolvedValue({ data: { ok: true } });
    await notifyWorkspaceEvent({
      workspaceId: 'ws-1',
      roles: ['pm'],
      excludeUserId: 'u-1',
      type: 'share_joined',
      title: 'Shared link opened',
      message: 'Someone opened the workspace',
      data: { invitee: 'x' },
      priority: 'high',
      actionRequired: true,
    });
    expect(axios.post).toHaveBeenCalledWith('/api/workspaces/ws-1/notify', {
      roles: ['pm'],
      excludeUserId: 'u-1',
      notification: {
        type: 'share_joined',
        title: 'Shared link opened',
        message: 'Someone opened the workspace',
        data: { invitee: 'x' },
        priority: 'high',
        actionRequired: true,
      },
    });
  });

  it('notifyWorkspaceEvent is a no-op without workspaceId or type', async () => {
    await notifyWorkspaceEvent({ workspaceId: '', type: 'x' });
    await notifyWorkspaceEvent({ workspaceId: 'ws-1', type: '' });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('notifyWorkspaceEvent swallows network failures (fire-and-forget)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    axios.post.mockRejectedValue(new Error('network down'));
    await expect(
      notifyWorkspaceEvent({ workspaceId: 'ws-1', type: 'progress_updated', title: 't', message: 'm' })
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
