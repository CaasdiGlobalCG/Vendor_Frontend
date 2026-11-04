/**
 * The Templates tab: browsing official templates, using one, and saving / managing your own.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

const api = {
  listMyTemplates: vi.fn(),
  saveTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  createTasksFromTemplate: vi.fn(),
};
vi.mock('../src/pages/WorkspacePage/utils/templateApi', () => ({
  listMyTemplates: (...a) => api.listMyTemplates(...a),
  saveTemplate: (...a) => api.saveTemplate(...a),
  updateTemplate: (...a) => api.updateTemplate(...a),
  deleteTemplate: (...a) => api.deleteTemplate(...a),
  createTasksFromTemplate: (...a) => api.createTasksFromTemplate(...a),
  templateErrorMessage: (e) => e?.response?.data?.message || 'Something went wrong. Please try again.',
}));

import { ToastProvider } from '../src/pages/WorkspacePage/components/ToastProvider.jsx';
import TemplateLibrary from '../src/pages/WorkspacePage/components/templates/TemplateLibrary.jsx';
import { OFFICIAL_TEMPLATES } from '../src/pages/WorkspacePage/templates/officialTemplates.js';

const mine = (extra = {}) => ({
  templateId: 'tpl_1',
  name: 'My fit-out plan',
  description: 'Reusable',
  industry: 'interiors',
  nodes: [{ id: 'a', type: 'blockNode', position: { x: 0, y: 0 }, data: { kind: 'status', label: 'x', status: 'pending' } }],
  edges: [],
  ...extra,
});

const mount = (props = {}) =>
  render(
    <ToastProvider>
      <TemplateLibrary canEdit isVendor workspaceId="W1" onClose={() => {}} {...props} />
    </ToastProvider>
  );

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.listMyTemplates.mockResolvedValue([]);
});
afterEach(cleanup);

describe('official templates', () => {
  // These run with a canvas open, which answers the "is anyone there?" request
  const answer = (e) => e.detail.respond({ all: [], selected: [], edges: [] });
  beforeEach(() => window.addEventListener('workspace-collect-canvas', answer));
  afterEach(() => window.removeEventListener('workspace-collect-canvas', answer));

  it('lists every official template', () => {
    mount();
    OFFICIAL_TEMPLATES.forEach((t) => expect(screen.getByText(t.name)).toBeTruthy());
  });

  it('filters by industry and by search', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Retail' }));
    expect(screen.getByText('Retail Store Launch Plan')).toBeTruthy();
    expect(screen.queryByText('Civil Works Project Plan')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    fireEvent.change(screen.getByLabelText('Search templates'), { target: { value: 'procurement' } });
    expect(screen.getByText(/Procurement Cycle/)).toBeTruthy();
    expect(screen.queryByText('Retail Store Launch Plan')).toBeNull();
  });

  it('says so when nothing matches', () => {
    mount();
    fireEvent.change(screen.getByLabelText('Search templates'), { target: { value: 'zzzz' } });
    expect(screen.getByText('No templates match')).toBeTruthy();
  });

  it('opens a preview and adds it to the canvas with the answers typed in', () => {
    const heard = vi.fn();
    window.addEventListener('workspace-apply-template', heard);
    mount();
    fireEvent.click(screen.getByText('Civil Works Project Plan'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/elements/)).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText('Client'), { target: { value: 'Mr. Sharma' } });
    fireEvent.change(within(dialog).getByLabelText('Project name'), { target: { value: 'Sharma residence' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to canvas' }));

    expect(heard).toHaveBeenCalledTimes(1);
    const { template, values } = heard.mock.calls[0][0].detail;
    expect(template.id).toBe('official-civil-works');
    expect(values).toEqual({ client: 'Mr. Sharma', project: 'Sharma residence' });
    expect(screen.queryByRole('dialog')).toBeNull(); // closes after adding
    window.removeEventListener('workspace-apply-template', heard);
  });

  it('view-only people can look but not add', () => {
    const heard = vi.fn();
    window.addEventListener('workspace-apply-template', heard);
    mount({ canEdit: false });
    fireEvent.click(screen.getByText('Civil Works Project Plan'));
    const add = within(screen.getByRole('dialog')).getByRole('button', { name: 'Add to canvas' });
    expect(add.disabled).toBe(true);
    fireEvent.submit(add.closest('form'));
    expect(heard).not.toHaveBeenCalled();
    window.removeEventListener('workspace-apply-template', heard);
  });

  it('Esc closes the preview without reaching the page-level handler', () => {
    const page = vi.fn();
    window.addEventListener('keydown', page);
    mount();
    fireEvent.click(screen.getByText('Civil Works Project Plan'));
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(page).not.toHaveBeenCalled();
    window.removeEventListener('keydown', page);
  });
});

describe('my templates', () => {
  it('only vendors get the My templates tab', () => {
    mount({ isVendor: false });
    expect(screen.queryByRole('tab', { name: 'My templates' })).toBeNull();
    cleanup();
    mount();
    expect(screen.getByRole('tab', { name: 'My templates' })).toBeTruthy();
  });

  it('loads and lists the vendor\'s own templates, and explains an empty list', async () => {
    api.listMyTemplates.mockResolvedValueOnce([mine()]);
    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'My templates' }));
    expect(await screen.findByText('My fit-out plan')).toBeTruthy();
    expect(screen.queryByText('Civil Works Project Plan')).toBeNull(); // official ones are on the other tab

    cleanup();
    api.listMyTemplates.mockResolvedValueOnce([]);
    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'My templates' }));
    expect(await screen.findByText('You have not saved any templates yet')).toBeTruthy();
  });

  it('shows a retry when loading fails', async () => {
    api.listMyTemplates.mockRejectedValueOnce({ response: { data: { message: 'Could not load your templates.' } } });
    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'My templates' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    api.listMyTemplates.mockResolvedValueOnce([mine()]);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('My fit-out plan')).toBeTruthy();
  });

  it('saves the selected elements as a template', async () => {
    const canvasNodes = [
      { id: 'a', type: 'blockNode', position: { x: 0, y: 0 }, selected: true, data: {} },
      { id: 'b', type: 'blockNode', position: { x: 200, y: 0 }, selected: false, data: {} },
      { id: 'c', type: 'blockNode', position: { x: 400, y: 0 }, selected: true, data: {} },
    ];
    const canvasEdges = [{ id: 'e1', source: 'a', target: 'c' }, { id: 'e2', source: 'a', target: 'b' }];
    const respond = (e) => e.detail.respond({ all: canvasNodes, selected: canvasNodes.filter((n) => n.selected), edges: canvasEdges });
    window.addEventListener('workspace-collect-canvas', respond);
    api.saveTemplate.mockResolvedValue({ template: mine({ name: 'Two things' }), skipped: 1 });

    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'My templates' }));
    await screen.findByText(/You have not saved/);
    fireEvent.click(screen.getByRole('button', { name: /Save this canvas as a template/ }));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByLabelText(/Selected elements \(2\)/)).toBeTruthy();
    expect(within(dialog).getByLabelText(/Selected elements/).checked).toBe(true); // defaults to the selection
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Two things' } });
    fireEvent.change(within(dialog).getByLabelText('Industry'), { target: { value: 'retail' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save template' }));

    await waitFor(() => expect(api.saveTemplate).toHaveBeenCalledTimes(1));
    const sent = api.saveTemplate.mock.calls[0][0];
    expect(sent.name).toBe('Two things');
    expect(sent.industry).toBe('retail');
    expect(sent.nodes.map((n) => n.id)).toEqual(['a', 'c']);
    expect(sent.edges.map((e) => e.id)).toEqual(['e1']); // only the connection between chosen elements
    expect(await screen.findByText('Two things')).toBeTruthy();
    window.removeEventListener('workspace-collect-canvas', respond);
  });

  it('will not save without a name, and shows the server\'s reason when it refuses', async () => {
    const nodes = [{ id: 'a', type: 'blockNode', position: { x: 0, y: 0 }, data: {} }];
    const respond = (e) => e.detail.respond({ all: nodes, selected: [], edges: [] });
    window.addEventListener('workspace-collect-canvas', respond);
    api.saveTemplate.mockRejectedValue({ response: { data: { message: 'You can keep up to 50 templates. Delete one to save another.' } } });

    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'My templates' }));
    await screen.findByText(/You have not saved/);
    fireEvent.click(screen.getByRole('button', { name: /Save this canvas as a template/ }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByLabelText(/Whole canvas/);

    const save = within(dialog).getByRole('button', { name: 'Save template' });
    expect(save.disabled).toBe(true); // no name yet
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Plan' } });
    fireEvent.click(save);
    expect((await within(dialog).findByRole('alert')).textContent).toMatch(/up to 50 templates/);
    expect(within(dialog).getByRole('button', { name: 'Save template' }).disabled).toBe(false); // can try again
    window.removeEventListener('workspace-collect-canvas', respond);
  });

  it('says so when the canvas is empty', async () => {
    const respond = (e) => e.detail.respond({ all: [], selected: [], edges: [] });
    window.addEventListener('workspace-collect-canvas', respond);
    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'My templates' }));
    await screen.findByText(/You have not saved/);
    fireEvent.click(screen.getByRole('button', { name: /Save this canvas as a template/ }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(/nothing on this canvas to save/i)).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Save template' }).disabled).toBe(true);
    window.removeEventListener('workspace-collect-canvas', respond);
  });

  it('deletes one after confirming, and removes it from the list', async () => {
    api.listMyTemplates.mockResolvedValue([mine()]);
    api.deleteTemplate.mockResolvedValue();
    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'My templates' }));
    fireEvent.click(await screen.findByText('My fit-out plan'));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Delete$/ }));
    expect(api.deleteTemplate).not.toHaveBeenCalled(); // asks first
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete for good' }));
    await waitFor(() => expect(api.deleteTemplate).toHaveBeenCalledWith('tpl_1'));
    await waitFor(() => expect(screen.queryByText('My fit-out plan')).toBeNull());
  });

  it('edits the name and description of a saved template', async () => {
    api.listMyTemplates.mockResolvedValue([mine()]);
    api.updateTemplate.mockResolvedValue(mine({ name: 'Renamed' }));
    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'My templates' }));
    fireEvent.click(await screen.findByText('My fit-out plan'));
    fireEvent.click(screen.getByRole('button', { name: /Edit details/ }));
    const dialogs = screen.getAllByRole('dialog');
    const edit = dialogs[dialogs.length - 1];
    fireEvent.change(within(edit).getByLabelText('Name'), { target: { value: 'Renamed' } });
    fireEvent.click(within(edit).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.updateTemplate).toHaveBeenCalledWith('tpl_1', { name: 'Renamed', description: 'Reusable', industry: 'interiors' }));
    expect(await screen.findByText('Renamed')).toBeTruthy();
  });
});

describe('templates that bring tasks', () => {
  const openCivil = () => {
    fireEvent.click(screen.getByText('Civil Works Project Plan'));
    return screen.getByRole('dialog');
  };
  const reply = { workspace: { tasks: [{ id: 't' }] } };
  const layoutBox = (d) => within(d).getByLabelText(/The layout, on this canvas/);
  const tasksBox = (d) => within(d).getByLabelText(/The task list and steps/);
  const press = (dialog, name) => fireEvent.click(within(dialog).getByRole('button', { name }));
  const settle = () => new Promise((r) => setTimeout(r, 30));
  // The canvas answers "is anyone there?" the moment it is asked
  let canvasListener;
  const canvasOpen = () => {
    canvasListener = (e) => e.detail.respond({ all: [], selected: [], edges: [] });
    window.addEventListener('workspace-collect-canvas', canvasListener);
  };
  afterEach(() => { if (canvasListener) window.removeEventListener('workspace-collect-canvas', canvasListener); canvasListener = null; });

  it('offers the layout (on) and the task list (off) as two separate choices, and says what the tasks are', () => {
    canvasOpen();
    mount();
    const dialog = openCivil();
    expect(layoutBox(dialog).checked).toBe(true);
    expect(tasksBox(dialog).checked).toBe(false);
    expect(dialog.textContent).toMatch(/6 tasks and \d+ steps/);
    expect(dialog.textContent).toMatch(/135 days/);
    expect(dialog.textContent).toMatch(/Nothing is created unless you tick this and confirm/);
  });

  it('layout only: places it and never touches the task list', async () => {
    canvasOpen();
    const heard = vi.fn();
    window.addEventListener('workspace-apply-template', heard);
    mount();
    press(openCivil(), 'Add to canvas');
    expect(heard).toHaveBeenCalledTimes(1);
    await settle();
    expect(api.createTasksFromTemplate).not.toHaveBeenCalled();
    window.removeEventListener('workspace-apply-template', heard);
  });

  it('tasks only: untick the layout, tick the tasks, confirm: no layout is placed', async () => {
    canvasOpen();
    api.createTasksFromTemplate.mockResolvedValue(reply);
    const heard = vi.fn();
    window.addEventListener('workspace-apply-template', heard);
    mount();
    const dialog = openCivil();
    fireEvent.click(layoutBox(dialog));
    fireEvent.click(tasksBox(dialog));
    press(dialog, 'Continue');
    expect(within(dialog).queryByRole('button', { name: 'Add the layout only' })).toBeNull(); // layout is off
    press(dialog, 'Yes, create them');
    await waitFor(() => expect(api.createTasksFromTemplate).toHaveBeenCalledTimes(1));
    expect(heard).not.toHaveBeenCalled();
    window.removeEventListener('workspace-apply-template', heard);
  });

  it('with neither chosen there is nothing to press', () => {
    canvasOpen();
    mount();
    const dialog = openCivil();
    fireEvent.click(layoutBox(dialog));
    const button = within(dialog).getByRole('button', { name: 'Choose what to add' });
    expect(button.disabled).toBe(true);
  });

  it('ticking the tasks asks first, and nothing is created or placed until you confirm', async () => {
    canvasOpen();
    const heard = vi.fn();
    window.addEventListener('workspace-apply-template', heard);
    mount();
    const dialog = openCivil();
    fireEvent.click(tasksBox(dialog));
    press(dialog, 'Continue');
    const ask = within(dialog).getByRole('alertdialog');
    expect(ask.textContent).toMatch(/Create 6 tasks and \d+ steps\?/);
    expect(ask.textContent).toMatch(/everyone with access will see them/);
    await settle();
    expect(api.createTasksFromTemplate).not.toHaveBeenCalled();
    expect(heard).not.toHaveBeenCalled();
    window.removeEventListener('workspace-apply-template', heard);
  });

  it('"Back" returns to the form; "Add the layout only" adds just the layout', async () => {
    canvasOpen();
    const heard = vi.fn();
    window.addEventListener('workspace-apply-template', heard);
    mount();
    const dialog = openCivil();
    fireEvent.click(tasksBox(dialog));
    press(dialog, 'Continue');
    press(dialog, 'Back');
    expect(within(dialog).queryByRole('alertdialog')).toBeNull();
    press(dialog, 'Continue');
    press(dialog, 'Add the layout only');
    expect(heard).toHaveBeenCalledTimes(1);
    await settle();
    expect(api.createTasksFromTemplate).not.toHaveBeenCalled();
    window.removeEventListener('workspace-apply-template', heard);
  });

  it('confirming adds both, creating the tasks in one request with due dates from the start date', async () => {
    canvasOpen();
    api.createTasksFromTemplate.mockResolvedValue(reply);
    const created = vi.fn();
    const heard = vi.fn();
    window.addEventListener('workspace-tasks-created', created);
    window.addEventListener('workspace-apply-template', heard);
    mount();
    const dialog = openCivil();
    fireEvent.change(within(dialog).getByLabelText('Start date'), { target: { value: '2026-03-01' } });
    fireEvent.click(tasksBox(dialog));
    press(dialog, 'Continue');
    press(dialog, 'Yes, create them');

    await waitFor(() => expect(api.createTasksFromTemplate).toHaveBeenCalledTimes(1));
    const [workspaceId, tasks] = api.createTasksFromTemplate.mock.calls[0];
    expect(workspaceId).toBe('W1');
    expect(tasks).toHaveLength(6); // no extra "overview" task: the layout went on the open canvas
    expect(tasks[0].dueDate).toBe('2026-03-08');
    expect(heard).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(created.mock.calls[0][0].detail.select).toBeNull();
    expect(await screen.findByText(/Created 6 tasks and \d+ steps/)).toBeTruthy();
    window.removeEventListener('workspace-tasks-created', created);
    window.removeEventListener('workspace-apply-template', heard);
  });

  it('no canvas open yet: the only way in is the task list, and the layout becomes its first step', async () => {
    api.createTasksFromTemplate.mockResolvedValue(reply);
    const created = vi.fn();
    const heard = vi.fn();
    window.addEventListener('workspace-tasks-created', created);
    window.addEventListener('workspace-apply-template', heard);
    mount(); // nobody answers the canvas request
    const dialog = openCivil();
    expect(within(dialog).queryByLabelText(/The layout, on this canvas/)).toBeNull();
    const box = tasksBox(dialog);
    expect(box.checked).toBe(true);
    expect(box.disabled).toBe(true);
    expect(dialog.textContent).toMatch(/no canvas yet/);
    expect(dialog.textContent).toMatch(/7 tasks and 14 steps/); // the six phases plus the Overview
    fireEvent.change(within(dialog).getByLabelText('Project name'), { target: { value: 'Sharma Villa' } });
    press(dialog, 'Continue');
    expect(within(dialog).queryByRole('button', { name: 'Add the layout only' })).toBeNull();
    press(dialog, 'Yes, create them');

    await waitFor(() => expect(api.createTasksFromTemplate).toHaveBeenCalledTimes(1));
    const tasks = api.createTasksFromTemplate.mock.calls[0][1];
    expect(tasks).toHaveLength(7);
    expect(tasks[0].name).toBe('Sharma Villa overview');
    expect(tasks[0].subtasks[0].canvasData.nodes.length).toBeGreaterThan(10);
    expect(heard).not.toHaveBeenCalled();
    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(created.mock.calls[0][0].detail.select).toEqual({ taskId: tasks[0].id, subtaskId: tasks[0].subtasks[0].id });
    window.removeEventListener('workspace-tasks-created', created);
    window.removeEventListener('workspace-apply-template', heard);
  });

  it('if the tasks cannot be created, the layout stays and the reason is shown', async () => {
    canvasOpen();
    api.createTasksFromTemplate.mockRejectedValue({ response: { data: { message: 'Workspace is locked as project completed; cannot add tasks' } } });
    const heard = vi.fn();
    const created = vi.fn();
    window.addEventListener('workspace-apply-template', heard);
    window.addEventListener('workspace-tasks-created', created);
    mount();
    const dialog = openCivil();
    fireEvent.click(tasksBox(dialog));
    press(dialog, 'Continue');
    press(dialog, 'Yes, create them');
    expect(await screen.findByText(/layout was added, but the tasks could not be created: Workspace is locked/)).toBeTruthy();
    expect(heard).toHaveBeenCalledTimes(1);
    expect(created).not.toHaveBeenCalled();
    window.removeEventListener('workspace-apply-template', heard);
    window.removeEventListener('workspace-tasks-created', created);
  });

  it('your own templates (layout only) cannot be added until there is a canvas, and say why', async () => {
    api.listMyTemplates.mockResolvedValue([mine()]);
    mount(); // no canvas
    fireEvent.click(screen.getByRole('tab', { name: 'My templates' }));
    fireEvent.click(await screen.findByText('My fit-out plan'));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toMatch(/no canvas open yet/);
    expect(within(dialog).getByRole('button', { name: 'Choose what to add' }).disabled).toBe(true);
  });

  it('no options for view-only people, or outside a workspace', () => {
    canvasOpen();
    mount({ canEdit: false });
    expect(within(openCivil()).queryByLabelText(/The task list and steps/)).toBeNull();
    cleanup();
    mount({ workspaceId: undefined });
    expect(within(openCivil()).queryByLabelText(/The task list and steps/)).toBeNull();
  });
});
