/**
 * Uploads from the photo grid and the printing elements are stored per subtask,
 * so the task and subtask must travel with the file (the server refuses a file
 * without a subtask: "Subtask ID is required").
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const authFetch = vi.fn();
vi.mock('../src/utils/authFetch', () => ({ default: (...args) => authFetch(...args) }));

import { uploadWorkspaceImage, PhotosBlock } from '../src/pages/WorkspacePage/components/nodes/blockInputViews.jsx';
import { ProofBlock, ArtworkBlock, SwatchBoardBlock } from '../src/pages/WorkspacePage/components/nodes/printingViews.jsx';
import { registerCanvasEmitter, unregisterCanvasEmitter } from '../src/pages/WorkspacePage/utils/nodePersistence.js';

const okResponse = () => ({ ok: true, json: async () => ({ file: { s3Url: 'https://cdn.example.com/a.png' } }) });
const file = () => new File(['x'], 'a.png', { type: 'image/png' });
const sent = () => authFetch.mock.calls[0][1].body;

beforeEach(() => {
  authFetch.mockReset();
  authFetch.mockResolvedValue(okResponse());
});
afterEach(() => {
  unregisterCanvasEmitter();
  cleanup();
});

describe('uploadWorkspaceImage', () => {
  it('sends the task and subtask of the element', async () => {
    const url = await uploadWorkspaceImage(file(), { workspaceId: 'w1', nodeId: 'n1', taskId: 't1', subtaskId: 's1' });
    expect(url).toBe('https://cdn.example.com/a.png');
    expect(authFetch.mock.calls[0][0]).toBe('/api/workspace-files/upload');
    const form = sent();
    expect(form.get('workspaceId')).toBe('w1');
    expect(form.get('nodeId')).toBe('n1');
    expect(form.get('taskId')).toBe('t1');
    expect(form.get('subtaskId')).toBe('s1');
  });

  it('uses the subtask open on the canvas when the element has none', async () => {
    registerCanvasEmitter(() => {}, 'task-open', 'subtask-open');
    await uploadWorkspaceImage(file(), { workspaceId: 'w1', nodeId: 'n1' });
    expect(sent().get('subtaskId')).toBe('subtask-open');
    expect(sent().get('taskId')).toBe('task-open');
  });

  it('uses the subtask on screen over the one a copied element still carries', async () => {
    registerCanvasEmitter(() => {}, 'task-open', 'subtask-open');
    await uploadWorkspaceImage(file(), { workspaceId: 'w1', nodeId: 'n1', taskId: 't-old', subtaskId: 's-old' });
    expect(sent().get('subtaskId')).toBe('subtask-open');
    expect(sent().get('taskId')).toBe('task-open');
  });

  it('explains what to do, without calling the server, when there is no subtask at all', async () => {
    await expect(uploadWorkspaceImage(file(), { workspaceId: 'w1', nodeId: 'n1' })).rejects.toThrow(/open a subtask/i);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('rejects non-images and files over 10 MB before uploading', async () => {
    await expect(
      uploadWorkspaceImage(new File(['x'], 'a.pdf', { type: 'application/pdf' }), { workspaceId: 'w', nodeId: 'n', subtaskId: 's' })
    ).rejects.toThrow(/image/i);
    const big = new File([new ArrayBuffer(11 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    await expect(uploadWorkspaceImage(big, { workspaceId: 'w', nodeId: 'n', subtaskId: 's' })).rejects.toThrow(/10 MB/);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('shows the server\'s reason when the upload is refused', async () => {
    authFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Bucket unavailable' }) });
    await expect(uploadWorkspaceImage(file(), { workspaceId: 'w', nodeId: 'n', subtaskId: 's' })).rejects.toThrow('Bucket unavailable');
  });
});

describe('elements pass their subtask to the upload', () => {
  const pick = (container) => fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file()] } });

  it('Photo Grid', async () => {
    const { container } = render(
      <PhotosBlock id="p1" data={{ label: 'Site photos', mode: 'grid', photos: [] }} editable onChange={() => {}} workspaceId="w1" taskId="t1" subtaskId="s1" />
    );
    fireEvent.click(screen.getByRole('button', { name: /add photo/i }));
    pick(container);
    await waitFor(() => expect(authFetch).toHaveBeenCalled());
    expect(sent().get('subtaskId')).toBe('s1');
    expect(sent().get('taskId')).toBe('t1');
  });

  it('Proof Markup', async () => {
    const { container } = render(
      <ProofBlock id="p2" data={{ label: 'Proof', imageUrl: '', pins: [] }} editable onChange={() => {}} workspaceId="w1" taskId="t1" subtaskId="s1" />
    );
    fireEvent.click(screen.getByRole('button', { name: /upload the artwork/i }));
    pick(container);
    await waitFor(() => expect(authFetch).toHaveBeenCalled());
    expect(sent().get('subtaskId')).toBe('s1');
  });

  it('Artwork Approval Card', async () => {
    const { container } = render(
      <ArtworkBlock id="p3" data={{ label: 'Artwork', versions: [] }} editable onChange={() => {}} workspaceId="w1" taskId="t1" subtaskId="s1" />
    );
    fireEvent.click(screen.getByRole('button', { name: /upload version 1/i }));
    pick(container);
    await waitFor(() => expect(authFetch).toHaveBeenCalled());
    expect(sent().get('subtaskId')).toBe('s1');
  });

  it('Material Swatch Board', async () => {
    const items = [{ id: 'm1', name: 'ACP', type: 'ACP', imageUrl: '', finish: '', thickness: '', supplier: '' }];
    const { container } = render(
      <SwatchBoardBlock id="p4" data={{ label: 'Materials', items }} editable onChange={() => {}} workspaceId="w1" taskId="t1" subtaskId="s1" />
    );
    fireEvent.click(screen.getByRole('button', { name: /add photo/i }));
    pick(container);
    await waitFor(() => expect(authFetch).toHaveBeenCalled());
    expect(sent().get('subtaskId')).toBe('s1');
  });

  it('shows the subtask message in the element instead of the raw server error', async () => {
    const { container } = render(
      <ProofBlock id="p2" data={{ label: 'Proof', imageUrl: '', pins: [] }} editable onChange={() => {}} workspaceId="w1" />
    );
    fireEvent.click(screen.getByRole('button', { name: /upload the artwork/i }));
    pick(container);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/open a subtask/i));
    expect(authFetch).not.toHaveBeenCalled();
  });
});
