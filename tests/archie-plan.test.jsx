import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../src/pages/WorkspacePage/utils/templateApi', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, createTasksFromTemplate: vi.fn() };
});

import ArchieBuilder from '../src/components/Header/ArchieBuilder';
import { createTasksFromTemplate } from '../src/pages/WorkspacePage/utils/templateApi';
import { VendorContext } from '../src/context/VendorContext';
import { planToBulkTasks, planStats, stepCanvas, boqRows, planBoqs, taskDates, templateHints } from '../src/components/Header/archie/archiePlan';
import { evaluateGrid, rowsToGrid } from '../src/pages/WorkspacePage/utils/tableEngine';

afterEach(cleanup);
beforeEach(() => { createTasksFromTemplate.mockReset(); Element.prototype.scrollTo = () => {}; });

const plan = () => ({
  status: 'ready',
  summary: 'Fit-out in two phases.',
  project: { type: 'Interior fit-out', durationDays: 45 },
  tasks: [
    {
      name: 'Design approval', description: 'Freeze the design.', priority: 'high', offsetDays: 0, durationDays: 7,
      subtasks: [{
        name: 'Drawings', description: 'Get drawings signed.',
        elements: [
          { key: 'a', kind: 'checklist', title: 'Approvals', items: ['Layout signed', 'Elevations signed'] },
          { key: 'b', kind: 'table', name: 'Approvals log', columns: ['Drawing', 'Date', 'Status'] },
          { key: 'c', kind: 'note', title: 'Note', text: 'Keep the client informed.' },
        ],
        links: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
      }],
    },
    {
      name: 'Carpentry', description: '', priority: 'medium', offsetDays: 10, durationDays: 30,
      subtasks: [{ name: 'Quantities', description: '', elements: [{ key: 'q', kind: 'boq', name: 'BOQ (draft)', items: [{ item: 'False ceiling', unit: 'sq ft' }, { item: 'Painting', unit: 'sq ft' }] }], links: [] }],
    },
  ],
});

// ───────── plan → what a workspace stores ─────────
describe('plan conversion', () => {
  it('counts what is in the plan', () => {
    expect(planStats(plan())).toEqual({ tasks: 2, subtasks: 2, elements: 4, connections: 2, boqs: 1, boqItems: 2 });
  });

  it('turns the plan into bulk tasks with ids, due dates and canvases the server accepts', () => {
    const tasks = planToBulkTasks(plan(), { startDate: '2026-11-03', workspaceId: 'W1', author: { name: 'Asha', email: 'a@x.co' } });
    expect(tasks).toHaveLength(2);
    expect(tasks[0].id).toMatch(/^task_[A-Za-z0-9_-]{6,80}$/);
    expect(tasks[0].subtasks[0].id).toMatch(/^subtask_[A-Za-z0-9_-]{6,80}$/);
    expect(tasks[0].dueDate).toBe('2026-11-10'); // start + 0 + 7 days
    expect(tasks[1].dueDate).toBe('2026-12-13'); // start + 10 + 30 days
    const canvas = tasks[0].subtasks[0].canvasData;
    expect(canvas.nodes).toHaveLength(3);
    expect(canvas.nodes.every((n) => n.type === 'elementNode')).toBe(true); // a type the server allows
    expect(canvas.nodes[0].data.workspaceId).toBe('W1');
    expect(canvas.nodes[0].data.addedBy).toBe('Asha');
  });

  it('draws connections only between elements that exist, with handles on the right sides', () => {
    const { nodes, edges } = stepCanvas(plan().tasks[0].subtasks[0], 's0');
    const ids = new Set(nodes.map((n) => n.id));
    expect(edges).toHaveLength(2);
    for (const e of edges) { expect(ids.has(e.source)).toBe(true); expect(ids.has(e.target)).toBe(true); }
    expect(edges[0].sourceHandle).toBe('right-out'); // a → b, side by side
    expect(edges[0].targetHandle).toBe('left-in');
    expect(edges[1].sourceHandle).toBe('bottom-out'); // b → c, next row
    expect(new Set(nodes.map((n) => `${n.position.x},${n.position.y}`)).size).toBe(nodes.length); // nothing stacked
  });

  it('BOQ: item and unit are filled, quantity and rate are blank, and amounts calculate', () => {
    const [{ items }] = planBoqs(plan());
    const rows = boqRows(items);
    expect(rows[0].slice(0, 6)).toEqual([1, 'False ceiling', 'sq ft', '', '', '=SUM(D1)*SUM(E1)']);
    expect(rows.every((r) => r[3] === '' && r[4] === '')).toBe(true); // nothing pre-filled
    const cols = ['Sl', 'Item', 'Unit', 'Qty', 'Rate', 'Amount'];
    const asRows = rows.map((r, i) => ({ id: i + 1, ...Object.fromEntries(cols.map((c, k) => [c, r[k]])) }));
    const blank = evaluateGrid(rowsToGrid(cols, asRows));
    expect(blank[0][5]).toBe(0); // blank qty and rate show 0, never an error
    expect(blank[2][5]).toBe(0);
    asRows[0].Qty = '100'; asRows[0].Rate = '12';
    expect(evaluateGrid(rowsToGrid(cols, asRows))[2][5]).toBe(1200); // total follows
  });

  it('the BOQ table in the bulk payload is an editable table with row ids', () => {
    const tasks = planToBulkTasks(plan(), { startDate: '2026-11-03', workspaceId: 'W1' });
    const boq = tasks[1].subtasks[0].canvasData.nodes[0];
    expect(boq.data.type).toBe('table');
    expect(boq.data.customTableData.columns).toEqual(['Sl', 'Item', 'Unit', 'Qty', 'Rate', 'Amount']);
    expect(boq.data.customTableData.data.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(boq.data.customTableData.data[2].Item).toBe('Total');
  });

  it('task dates come from the start date and the plan offsets', () => {
    const { start, due } = taskDates({ offsetDays: 10, durationDays: 30 }, '2026-11-03');
    expect([start.getMonth(), start.getDate()]).toEqual([10, 13]);
    expect([due.getMonth(), due.getDate()]).toEqual([11, 13]);
  });

  it('shares the structure of official templates with the planner', () => {
    const hints = templateHints();
    expect(hints.length).toBeGreaterThan(0);
    expect(hints[0]).toEqual(expect.objectContaining({ id: expect.any(String), name: expect.any(String), phases: expect.any(Array) }));
  });
});

// ───────── the screens ─────────
const leads = [{ leadId: 'L1', title: 'Flat 4B Interiors', budget: '₹18,00,000', timeline: '45 days', acceptedAt: '2026-09-20T00:00:00Z', workspaceId: 'W1', workspaceTitle: 'Flat 4B – Collaborative' }];
const json = (body, ok = true, status = 200) => Promise.resolve({ ok, status, json: () => Promise.resolve(body) });

const setup = (planHandler, props = {}) => {
  const calls = [];
  global.fetch = vi.fn((url, opts = {}) => {
    const u = String(url);
    calls.push({ url: u, body: opts.body ? JSON.parse(opts.body) : null });
    if (u.includes('/agents/archie/leads')) return json({ success: true, data: leads });
    if (u.includes('/agents/archie/plan')) return planHandler(calls.filter((c) => c.url.includes('/plan')).length, opts);
    return json({ success: true, data: [] });
  });
  const utils = render(
    <VendorContext.Provider value={{ vendorData: { vendorDetails: { firstName: 'Asha', lastName: 'Rao' }, email: 'asha@x.co' } }}>
      <ArchieBuilder onExit={vi.fn()} {...props} />
    </VendorContext.Provider>
  );
  return { calls, ...utils };
};

const chooseAndDescribe = async (text = '3BHK flat in Pune, 1,450 sq ft. Full interior, 45 days, around 18 lakhs.') => {
  fireEvent.click(await screen.findByRole('radio', { name: /Flat 4B Interiors/ }));
  fireEvent.click(screen.getByText('Continue'));
  fireEvent.change(screen.getByLabelText('Describe the project'), { target: { value: text } });
  fireEvent.click(screen.getByLabelText('Send description'));
};

describe('Archie: describe → plan → preview → create → go to workspace', () => {
  it('shows a preview with tasks, canvas and BOQ, and writes nothing until confirmed', async () => {
    const { calls } = setup(() => json({ success: true, data: { status: 'ready', plan: plan(), warnings: ['Skipped “Mobilisation”: a task with that name already exists in the workspace.'], workspace: { workspaceId: 'W1', title: 'Flat 4B – Collaborative', existingTasks: 3 } } }));
    await chooseAndDescribe();

    const preview = await screen.findByTestId('archie-preview');
    expect(within(preview).getByText('Design approval')).toBeTruthy();
    expect(within(preview).getByText('2 tasks')).toBeTruthy();
    expect(within(preview).getByText(/already exists in the workspace/)).toBeTruthy(); // duplicate note is surfaced
    expect(screen.getByText('Fit-out in two phases.')).toBeTruthy(); // Archie's summary in the conversation

    fireEvent.click(within(preview).getByRole('tab', { name: /BOQ/ }));
    expect(within(preview).getByText('False ceiling')).toBeTruthy();
    expect(within(preview).getByText(/left blank for you to fill in/)).toBeTruthy();
    fireEvent.click(within(preview).getByRole('tab', { name: /Canvas/ }));
    expect(within(preview).getByLabelText('Step')).toBeTruthy();

    // the plan request carried the lead, the description and the official templates; nothing was created
    const planCall = calls.find((c) => c.url.includes('/plan'));
    expect(planCall.body.leadId).toBe('L1');
    expect(planCall.body.brief).toMatch(/3BHK flat in Pune/);
    expect(planCall.body.templates.length).toBeGreaterThan(0);
    expect(createTasksFromTemplate).not.toHaveBeenCalled();
  });

  it('asks for confirmation, then creates in one request and offers "Go to workspace now"', async () => {
    createTasksFromTemplate.mockResolvedValue({ tasks: [], workspace: {} });
    const openWorkspace = vi.fn();
    setup(() => json({ success: true, data: { status: 'ready', plan: plan(), warnings: [], workspace: { workspaceId: 'W1', title: 'Flat 4B – Collaborative', existingTasks: 0 } } }), { openWorkspace });
    await chooseAndDescribe();
    await screen.findByTestId('archie-preview');

    fireEvent.click(screen.getByText('Create in workspace'));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/2 tasks/)).toBeTruthy();
    expect(within(dialog).getByText(/Nothing already there is changed or removed/)).toBeTruthy();
    expect(createTasksFromTemplate).not.toHaveBeenCalled(); // still only asking

    fireEvent.click(within(dialog).getByText('Create in workspace'));
    await waitFor(() => expect(screen.getByTestId('archie-created')).toBeTruthy());
    expect(createTasksFromTemplate).toHaveBeenCalledTimes(1);
    const [workspaceId, tasks] = createTasksFromTemplate.mock.calls[0];
    expect(workspaceId).toBe('W1');
    expect(tasks).toHaveLength(2);

    fireEvent.click(screen.getByText('Go to workspace now'));
    expect(openWorkspace).toHaveBeenCalledWith('W1');
  });

  it('keeps the plan and shows the reason when the workspace write fails', async () => {
    createTasksFromTemplate.mockRejectedValue({ response: { data: { message: 'Workspace is locked as project completed; cannot add tasks' } } });
    setup(() => json({ success: true, data: { status: 'ready', plan: plan(), warnings: [], workspace: { workspaceId: 'W1', title: 'WS', existingTasks: 0 } } }));
    await chooseAndDescribe();
    await screen.findByTestId('archie-preview');
    fireEvent.click(screen.getByText('Create in workspace'));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByText('Create in workspace'));
    expect(await within(dialog).findByText(/locked as project completed/)).toBeTruthy();
    expect(screen.queryByTestId('archie-created')).toBeNull();
    fireEvent.click(within(dialog).getByText('Cancel')); // can back out; the plan is still there
    expect(screen.getByTestId('archie-preview')).toBeTruthy();
  });

  it('asks follow-up questions when the description is too vague, then plans with the answers', async () => {
    const { calls } = setup((n) => (n === 1
      ? json({ success: true, data: { status: 'needs_info', questions: ['What kind of work is this?', 'Roughly how big is it?'] } })
      : json({ success: true, data: { status: 'ready', plan: plan(), warnings: [], workspace: { workspaceId: 'W1', title: 'WS', existingTasks: 0 } } })));
    await chooseAndDescribe('We need work done at the site next month.');

    expect(await screen.findByText(/What kind of work is this\?/)).toBeTruthy();
    expect(screen.queryByTestId('archie-preview')).toBeNull();

    fireEvent.change(screen.getByLabelText('Describe the project'), { target: { value: 'Interior fit-out, about 1,200 sq ft.' } });
    fireEvent.click(screen.getByLabelText('Send description'));
    await screen.findByTestId('archie-preview');
    const second = calls.filter((c) => c.url.includes('/plan'))[1];
    expect(second.body.brief).toMatch(/next month/);
    expect(second.body.brief).toMatch(/More details: Interior fit-out/);
  });

  it('revises the plan from a chat instruction, sending the current plan with it', async () => {
    const revised = plan();
    revised.tasks = revised.tasks.slice(0, 1);
    revised.summary = 'Dropped carpentry.';
    const { calls } = setup((n) => json({ success: true, data: { status: 'ready', plan: n === 1 ? plan() : revised, warnings: [], workspace: { workspaceId: 'W1', title: 'WS', existingTasks: 0 } } }));
    await chooseAndDescribe();
    await screen.findByTestId('archie-preview');

    fireEvent.change(screen.getByLabelText('Ask Archie for a change'), { target: { value: 'drop carpentry' } });
    fireEvent.click(screen.getByLabelText('Send change'));
    expect(await screen.findByText('Dropped carpentry.')).toBeTruthy();
    expect(within(screen.getByTestId('archie-preview')).getByText('1 task')).toBeTruthy();
    const second = calls.filter((c) => c.url.includes('/plan'))[1];
    expect(second.body.instruction).toBe('drop carpentry');
    expect(second.body.previousPlan.tasks).toHaveLength(2);
  });

  it('shows the error and lets the vendor try again; the description is not lost', async () => {
    const { calls } = setup((n) => (n === 1
      ? json({ success: false, message: 'Archie could not put a usable plan together. Try adding a little more detail.' }, false, 502)
      : json({ success: true, data: { status: 'ready', plan: plan(), warnings: [], workspace: { workspaceId: 'W1', title: 'WS', existingTasks: 0 } } })));
    await chooseAndDescribe();
    expect(await screen.findByText(/Try adding a little more detail/)).toBeTruthy();
    fireEvent.click(screen.getByText('Try again'));
    await screen.findByTestId('archie-preview');
    expect(calls.filter((c) => c.url.includes('/plan'))[1].body.brief).toMatch(/3BHK flat in Pune/);
  });

  it('too short a description never reaches the server', async () => {
    const { calls } = setup(() => json({ success: true, data: {} }));
    await chooseAndDescribe('too short');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(calls.some((c) => c.url.includes('/plan'))).toBe(false);
  });

  it('files the session in the history: the id comes back, later requests continue it, and "created" is recorded', async () => {
    createTasksFromTemplate.mockResolvedValue({ tasks: [], workspace: {} });
    const onSession = vi.fn();
    const calls = [];
    global.fetch = vi.fn((url, opts = {}) => {
      const u = String(url);
      calls.push({ url: u, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
      if (u.includes('/agents/archie/leads')) return json({ success: true, data: leads });
      if (u.includes('/agents/archie/plan')) return json({ success: true, data: { status: 'ready', plan: plan(), warnings: [], conversationId: 'CONV-1', workspace: { workspaceId: 'W1', title: 'Flat 4B – Collaborative', existingTasks: 0 } } });
      if (u.includes('/sessions/CONV-1/created')) return json({ success: true });
      return json({ success: true, data: [] });
    });
    render(<VendorContext.Provider value={{ vendorData: {} }}><ArchieBuilder onExit={vi.fn()} onSession={onSession} /></VendorContext.Provider>);
    await chooseAndDescribe();
    await screen.findByTestId('archie-preview');
    expect(onSession).toHaveBeenCalledWith('CONV-1');
    expect(calls.find((c) => c.url.includes('/plan')).body.conversationId).toBeUndefined(); // the first request starts a session

    fireEvent.change(screen.getByLabelText('Ask Archie for a change'), { target: { value: 'drop carpentry' } });
    fireEvent.click(screen.getByLabelText('Send change'));
    await waitFor(() => expect(calls.filter((c) => c.url.includes('/plan')).length).toBe(2));
    expect(calls.filter((c) => c.url.includes('/plan'))[1].body.conversationId).toBe('CONV-1'); // same session

    fireEvent.click(screen.getByText('Create in workspace'));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByText('Create in workspace'));
    await screen.findByTestId('archie-created');
    await waitFor(() => expect(calls.some((c) => c.url.includes('/sessions/CONV-1/created'))).toBe(true));
    expect(calls.find((c) => c.url.includes('/sessions/CONV-1/created')).body).toEqual({ tasks: 2, steps: 2 });
  });

  it('a saved session reopens on the plan, with the conversation and the created state', async () => {
    global.fetch = vi.fn((url) => (String(url).includes('/agents/archie/leads') ? json({ success: true, data: leads }) : json({ success: true, data: [] })));
    const session = {
      conversationId: 'CONV-9', title: 'Archie · Flat 4B Interiors', leadId: 'L1', brief: '3BHK in Pune, 45 days', startDate: '2026-11-03',
      plan: plan(), warnings: [], workspace: { workspaceId: 'W1', title: 'Flat 4B – Collaborative', existingTasks: 0 },
      created: { tasks: 2, steps: 2 },
      messages: [{ role: 'user', text: '3BHK in Pune, 45 days' }, { role: 'archie', text: 'Fit-out in two phases.' }],
    };
    render(<VendorContext.Provider value={{ vendorData: {} }}><ArchieBuilder onExit={vi.fn()} session={session} /></VendorContext.Provider>);
    expect(await screen.findByText('3BHK in Pune, 45 days')).toBeTruthy();
    expect(screen.getByText('Fit-out in two phases.')).toBeTruthy();
    expect(screen.getByTestId('archie-created')).toBeTruthy(); // already created: no second "Create" offered
    expect(screen.getByText('Go to workspace now')).toBeTruthy();
  });
});
