import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getWorkspaceById = vi.fn();
const updateWorkspace = vi.fn();
vi.mock('../src/pages/WorkspacePage/utils/workspaceApi', () => ({
  getWorkspaceById: (...a) => getWorkspaceById(...a),
  updateWorkspace: (...a) => updateWorkspace(...a),
}));
const put = vi.fn();
vi.mock('axios', () => ({ default: { put: (...a) => put(...a) } }));

import {
  persistNodeDataPatch,
  registerCanvasEmitter,
  unregisterCanvasEmitter,
} from '../src/pages/WorkspacePage/utils/nodePersistence.js';

/** Tiny stand-in for React state: setNodes(updater) over a mutable array. */
const makeStore = (nodes) => {
  const store = { nodes };
  store.setNodes = (fn) => { store.nodes = fn(store.nodes); };
  store.data = (id) => store.nodes.find((n) => n.id === id).data;
  return store;
};

const workspaceWith = (nodeId) => ({
  tasks: [{ id: 't1', subtasks: [{ id: 's1', canvasData: { nodes: [{ id: nodeId, data: {} }], edges: [] } }] }],
});

beforeEach(() => { getWorkspaceById.mockReset(); updateWorkspace.mockReset(); put.mockReset(); unregisterCanvasEmitter(); });
afterEach(() => unregisterCanvasEmitter());

describe('persistNodeDataPatch is optimistic', () => {
  it('shows the change before the save finishes (offline path)', async () => {
    const store = makeStore([{ id: 'n1', data: { label: 'old' } }]);
    let finish;
    getWorkspaceById.mockReturnValue(new Promise((r) => { finish = r; }));
    put.mockResolvedValue({ data: {} });

    const saving = persistNodeDataPatch('n1', { label: 'new' }, store.setNodes, 'w1');
    expect(store.data('n1').label).toBe('new'); // already visible, save still pending

    finish(workspaceWith('n1'));
    await saving;
    expect(store.data('n1').label).toBe('new');
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('takes the change back and reports it when the save fails', async () => {
    const store = makeStore([{ id: 'n1', data: { label: 'old' } }]);
    getWorkspaceById.mockRejectedValue(new Error('network down'));
    const failed = vi.fn();
    window.addEventListener('workspace-save-failed', failed);

    await expect(persistNodeDataPatch('n1', { label: 'new', extra: 1 }, store.setNodes, 'w1')).rejects.toThrow('network down');

    expect(store.data('n1')).toEqual({ label: 'old' }); // label restored, new key removed
    expect(failed).toHaveBeenCalledTimes(1);
    window.removeEventListener('workspace-save-failed', failed);
  });

  it('does not undo a newer edit made while the save was in flight', async () => {
    const store = makeStore([{ id: 'n1', data: { label: 'old' } }]);
    let fail;
    getWorkspaceById.mockReturnValue(new Promise((_, rej) => { fail = rej; }));

    const saving = persistNodeDataPatch('n1', { label: 'first' }, store.setNodes, 'w1');
    store.setNodes((nodes) => nodes.map((n) => ({ ...n, data: { ...n.data, label: 'second' } }))); // user types again
    fail(new Error('boom'));
    await expect(saving).rejects.toThrow();

    expect(store.data('n1').label).toBe('second');
  });

  it('with a live connection: one update, one op, no HTTP for ordinary edits', async () => {
    const emit = vi.fn();
    registerCanvasEmitter(emit, 't1', 's1');
    const store = makeStore([{ id: 'n1', data: { label: 'old' } }]);

    await persistNodeDataPatch('n1', { label: 'new' }, store.setNodes, 'w1');

    expect(store.data('n1').label).toBe('new');
    expect(emit).toHaveBeenCalledTimes(1);
    expect(getWorkspaceById).not.toHaveBeenCalled();
  });

  it('workflow changes are shown at once but still saved durably, and rolled back on failure', async () => {
    registerCanvasEmitter(vi.fn(), 't1', 's1');
    const store = makeStore([{ id: 'n1', data: { approvalStatus: 'pending' } }]);
    getWorkspaceById.mockRejectedValue(new Error('500'));

    const saving = persistNodeDataPatch('n1', { approvalStatus: 'sent_to_pm' }, store.setNodes, 'w1');
    expect(store.data('n1').approvalStatus).toBe('sent_to_pm');
    await expect(saving).rejects.toThrow('500');
    expect(store.data('n1').approvalStatus).toBe('pending');
  });

  it('does nothing without a workspace or node id', async () => {
    const store = makeStore([{ id: 'n1', data: { a: 1 } }]);
    await persistNodeDataPatch('n1', { a: 2 }, store.setNodes, null);
    expect(store.data('n1').a).toBe(1);
  });
});
