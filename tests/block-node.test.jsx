/**
 * BlockNode (heading / divider / status / progress / KPI) and the frame name
 * tag, rendered inside a real React Flow.
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import ReactFlow, { ReactFlowProvider } from 'reactflow';

const persist = vi.fn();
vi.mock('../src/pages/WorkspacePage/utils/nodePersistence', async (orig) => ({
  ...(await orig()),
  persistNodeDataPatch: (...args) => persist(...args),
}));

import { VendorContext } from '../src/context/VendorContext';
import { WorkspaceProgressContext } from '../src/pages/WorkspacePage/utils/WorkspaceProgressContext.js';
import BlockNode from '../src/pages/WorkspacePage/components/nodes/BlockNode.jsx';
import LayoutNode from '../src/pages/WorkspacePage/components/nodes/LayoutNode.jsx';
import { defaultBlockData, getBasicsElements } from '../src/pages/WorkspacePage/utils/blockElements.js';

beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  global.DOMMatrixReadOnly = class { constructor() { this.m22 = 1; } };
  Element.prototype.scrollIntoView = () => {}; // jsdom lacks it; the comment thread scrolls to the newest reply
});
afterEach(() => { cleanup(); persist.mockReset(); progress = { tasks: [], live: null }; });

let progress = { tasks: [], live: null };
const mount = (...list) =>
  render(
    <VendorContext.Provider value={{ currentUser: { vendorId: 'v1', name: 'Test User', email: 't@example.com' } }}>
      <WorkspaceProgressContext.Provider value={progress}>
      <ReactFlowProvider>
        <div style={{ width: 800, height: 600 }}>
          <ReactFlow
            nodes={list.map((node, i) => ({ position: { x: i * 400, y: 0 }, ...node }))}
            edges={[]}
            nodeTypes={{ blockNode: BlockNode, layoutNode: LayoutNode }}
          />
        </div>
      </ReactFlowProvider>
      </WorkspaceProgressContext.Provider>
    </VendorContext.Provider>
  );

const block = (kind, extra = {}, node = {}) => ({
  id: `b-${kind}`,
  type: 'blockNode',
  data: { ...defaultBlockData(kind), workspaceId: 'w1', ...extra },
  ...node,
});

describe('BlockNode', () => {
  it('heading shows its text and has no connection handles', () => {
    const { container } = mount(block('heading', { text: 'Phase 1: Civil' }));
    expect(screen.getByText('Phase 1: Civil')).toBeTruthy();
    expect(container.querySelectorAll('.react-flow__handle')).toHaveLength(0);
  });

  it('divider is a separator with its orientation', () => {
    mount(block('divider', { orientation: 'vertical' }));
    expect(screen.getByRole('separator', { hidden: true }).getAttribute('aria-orientation')).toBe('vertical');
  });

  it('status badge shows the chosen status', () => {
    const { container } = mount(block('status', { status: 'delayed', label: 'Site A' }));
    expect(screen.getByText('Delayed')).toBeTruthy();
    expect(screen.getByText('Site A')).toBeTruthy();
    expect(container.querySelectorAll('.react-flow__handle').length).toBe(8);
  });

  it('progress bar exposes its value to assistive tech', () => {
    mount(block('progress', { label: 'BOQ done', value: 72, target: 100 }));
    const bar = screen.getByLabelText('BOQ done');
    expect(bar.getAttribute('aria-valuenow')).toBe('72');
    expect(screen.getByText('72%')).toBeTruthy();
  });

  it('progress clamps over-100 values', () => {
    mount(block('progress', { value: 250, target: 100 }));
    expect(screen.getByRole('progressbar', { hidden: true }).getAttribute('aria-valuenow')).toBe('100');
  });

  it('KPI card shows value, prefix and change', () => {
    mount(block('kpi', { label: 'Invoiced', prefix: '₹', value: '4,20,000', delta: -8, deltaLabel: 'vs last month', trend: [3, 5, 4] }));
    expect(screen.getByText('₹4,20,000')).toBeTruthy();
    expect(screen.getByText('-8%')).toBeTruthy();
    expect(screen.getByText('vs last month')).toBeTruthy();
  });

  it('settings appear only when selected, and a change is saved as one patch', () => {
    mount(block('status', { status: 'in-progress' }, { selected: true }));
    const settings = screen.getByTestId('block-settings');
    fireEvent.change(within(settings).getByLabelText('Status'), { target: { value: 'at-risk' } });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0][0]).toBe('b-status');
    expect(persist.mock.calls[0][1]).toEqual({ status: 'at-risk' });
    expect(persist.mock.calls[0][3]).toBe('w1');
  });

  it('typing is saved once, on blur, not per keystroke', () => {
    mount(block('progress', { label: 'Old' }, { selected: true }));
    const label = within(screen.getByTestId('block-settings')).getAllByRole('textbox', { hidden: true })[0];
    fireEvent.focus(label);
    fireEvent.change(label, { target: { value: 'N' } });
    fireEvent.change(label, { target: { value: 'New label' } });
    expect(persist).not.toHaveBeenCalled();
    fireEvent.blur(label);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0][1]).toEqual({ label: 'New label' });
  });

  it('shows no settings while several blocks are selected together', () => {
    mount(block('status', {}, { selected: true }), block('kpi', {}, { selected: true }));
    expect(screen.queryByTestId('block-settings')).toBeNull();
  });

  it('has no settings when unselected or read-only', () => {
    mount(block('kpi'));
    expect(screen.queryByTestId('block-settings')).toBeNull();
    cleanup();
    mount(block('kpi', { readOnly: true }, { selected: true }));
    expect(screen.queryByTestId('block-settings')).toBeNull();
  });

  it('heading text edits inline on double-click', () => {
    mount(block('heading', { text: 'Old' }));
    fireEvent.doubleClick(screen.getByText('Old'));
    const input = screen.getByDisplayValue('Old');
    fireEvent.change(input, { target: { value: 'Brand new' } });
    fireEvent.blur(input);
    expect(persist.mock.calls.at(-1)[1]).toEqual({ text: 'Brand new' });
  });

  it('read-only headings cannot be edited', () => {
    mount(block('heading', { text: 'Fixed', readOnly: true }));
    fireEvent.doubleClick(screen.getByText('Fixed'));
    expect(screen.queryByDisplayValue('Fixed')).toBeNull();
  });
});

describe('Frame name tag', () => {
  const frame = (extra = {}) => ({
    id: 'f1',
    type: 'layoutNode',
    data: { type: 'frame', name: 'Ground floor', width: 300, height: 200, workspaceId: 'w1', ...extra },
  });

  it('shows the frame name above the frame', () => {
    mount(frame());
    expect(within(screen.getByTestId('frame-label')).getByText('Ground floor')).toBeTruthy();
  });

  it('renames on double-click and saves once', () => {
    mount(frame());
    fireEvent.doubleClick(screen.getByText('Ground floor'));
    const input = screen.getByLabelText('Frame name');
    fireEvent.change(input, { target: { value: 'First floor' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0][1]).toEqual({ name: 'First floor' });
  });

  it('Escape cancels and an empty name is not saved', () => {
    mount(frame());
    fireEvent.doubleClick(screen.getByText('Ground floor'));
    fireEvent.change(screen.getByLabelText('Frame name'), { target: { value: '   ' } });
    fireEvent.blur(screen.getByLabelText('Frame name'));
    expect(persist).not.toHaveBeenCalled();
    expect(screen.getByText('Ground floor')).toBeTruthy();
  });

  it('read-only frames cannot be renamed; flowchart shapes get no tag', () => {
    mount(frame({ readOnly: true }));
    fireEvent.doubleClick(screen.getByText('Ground floor'));
    expect(screen.queryByLabelText('Frame name')).toBeNull();
    cleanup();
    mount(frame({ flowchartGroup: 'g1', name: 'Process' }));
    expect(screen.queryByTestId('frame-label')).toBeNull();
  });
});

describe('shapes, embeds, links, comments and countdowns', () => {
  it('draws each shape, with its label inside (arrows have no label)', () => {
    const { container } = mount(block('shape', { shape: 'diamond', text: 'Approved?' }));
    expect(container.querySelector('polygon')).toBeTruthy();
    expect(screen.getByText('Approved?')).toBeTruthy();
    cleanup();
    const ellipse = mount(block('shape', { shape: 'ellipse' }));
    expect(ellipse.container.querySelector('ellipse')).toBeTruthy();
    cleanup();
    const rect = mount(block('shape', { shape: 'rectangle' }));
    expect(rect.container.querySelector('rect')).toBeTruthy();
    cleanup();
    const arrow = mount(block('shape', { shape: 'arrow', text: 'ignored' }));
    expect(arrow.container.querySelectorAll('.react-flow__handle')).toHaveLength(0);
    expect(screen.queryByText('ignored')).toBeNull();
  });

  it('rectangles and diamonds connect; arrows do not', () => {
    const rect = mount(block('shape', { shape: 'rectangle' }));
    expect(rect.container.querySelectorAll('.react-flow__handle').length).toBe(8);
  });

  it('embeds a YouTube video in a sandboxed frame', () => {
    const { container } = mount(block('embed', { url: 'https://youtu.be/abc123' }));
    const frame = container.querySelector('iframe');
    expect(frame.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc123');
    expect(frame.getAttribute('sandbox')).toContain('allow-scripts');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-top-navigation');
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin'); // YouTube refuses embeds that send no referrer
  });

  it('never frames a site that is not on the list; offers a plain link instead', () => {
    const { container } = mount(block('embed', { url: 'https://evil.example.com/watch' }));
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText(/cannot be shown here/i)).toBeTruthy();
    const link = container.querySelector('[data-block-kind="embed"] a');
    expect(link.getAttribute('href')).toBe('https://evil.example.com/watch');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('an embed with no address asks for one', () => {
    const { container } = mount(block('embed', { url: '', embedType: 'video' }));
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText('Add a video')).toBeTruthy();
  });

  it('link card shows the site and opens safely; a script address gets no link', () => {
    const ok = mount(block('link', { url: 'https://www.example.com/report', title: 'Q3 report' }));
    expect(screen.getByText('Q3 report')).toBeTruthy();
    expect(screen.getByText('example.com')).toBeTruthy();
    const a = ok.container.querySelector('[data-block-kind="link"] a');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer nofollow');
    cleanup();
    const bad = mount(block('link', { url: 'javascript:alert(1)' }));
    expect(bad.container.querySelector('[data-block-kind="link"] a')).toBeNull();
  });

  it('a bad address typed into the settings is rejected and not saved', () => {
    mount(block('link', { url: '' }, { selected: true }));
    const field = within(screen.getByTestId('block-settings')).getAllByRole('textbox', { hidden: true })[0];
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'javascript:alert(1)' } });
    fireEvent.blur(field);
    expect(persist).not.toHaveBeenCalled();
    expect(screen.getByText(/valid web address/i)).toBeTruthy();
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'example.com' } });
    fireEvent.blur(field);
    expect(persist.mock.calls.at(-1)[1]).toEqual({ url: 'https://example.com/' });
  });

  it('countdown shows days, hours and minutes, and "Time is up" after the date', () => {
    const soon = new Date(Date.now() + (2 * 86400 + 3 * 3600 + 30 * 60 + 20) * 1000).toISOString();
    mount(block('countdown', { label: 'Handover', target: soon }));
    expect(screen.getByText('Handover')).toBeTruthy();
    const timer = screen.getByRole('timer', { hidden: true });
    expect(timer.getAttribute('aria-label')).toMatch(/^2 days 3 hours (29|30) minutes left$/);
    cleanup();
    mount(block('countdown', { target: new Date(Date.now() - 1000).toISOString() }));
    expect(screen.getByText('Time is up')).toBeTruthy();
  });

  it('comment pin counts open comments and opens the thread', () => {
    const comments = [
      { id: 'c1', text: 'Check the slab level', authorName: 'Asha', createdAt: new Date().toISOString(), resolved: false },
      { id: 'c2', text: 'Done', authorName: 'Ravi', createdAt: new Date().toISOString(), resolved: true },
    ];
    mount(block('comment', { comments }, { selected: true }));
    const pin = screen.getByLabelText(/comment pin, 1 open/i);
    expect(pin.textContent).toContain('1');
    fireEvent.click(pin);
    expect(screen.getByText('Check the slab level')).toBeTruthy();
  });

  it('every Basics block element renders without crashing', () => {
    getBasicsElements()
      .filter((e) => e.nodeType === 'blockNode')
      .forEach((e) => {
        const { container } = mount({ id: e.id, type: 'blockNode', data: { ...e.data, workspaceId: 'w1' } });
        expect(container.querySelector(`[data-block-kind="${e.data.kind}"]`), e.name).toBeTruthy();
        cleanup();
      });
  });
});

describe('blocks linked to the tasks', () => {
  const card = (items) => ({ id: 'c', data: { type: 'task-card', taskCardData: { status: 'todo', checklists: items.map((c, i) => ({ id: String(i), text: 't', completed: c })) } } });
  const tasks = (dueDate = '2999-01-01') => [
    { id: 't1', name: 'Foundation', dueDate, subtasks: [{ id: 's1', canvasData: { nodes: [card([true, true, false, false])] } }] },
    { id: 't2', name: 'Structure', dueDate, subtasks: [{ id: 's2', canvasData: { nodes: [card([false, false])] } }] },
  ];

  it('a progress bar takes its number from the ticked items, and says so', () => {
    progress = { tasks: tasks(), live: null };
    mount(block('progress', { label: 'Foundation', value: 5, target: 100, link: { scope: 'task', taskName: 'Foundation' } }));
    expect(screen.getByLabelText('Foundation').getAttribute('aria-valuenow')).toBe('50'); // 2 of 4, not the typed 5
    expect(screen.getByText('2 items of 4 items')).toBeTruthy();
    expect(screen.getByText(/From Foundation/)).toBeTruthy();
  });

  it('the whole-project link adds up every task', () => {
    progress = { tasks: tasks(), live: null };
    mount(block('progress', { label: 'All', link: { scope: 'workspace' } }));
    expect(screen.getByLabelText('All').getAttribute('aria-valuenow')).toBe('33'); // 2 of 6
  });

  it('a status badge follows the work: pending, in progress, done, delayed', () => {
    const show = (done, dueDate) => {
      const items = [done >= 1, done >= 2];
      progress = { tasks: [{ id: 't', name: 'Phase', dueDate, subtasks: [{ id: 's', canvasData: { nodes: [card(items)] } }] }], live: null };
      const view = mount(block('status', { label: 'Phase', status: 'on-hold', link: { scope: 'task', taskName: 'Phase' } }));
      const text = view.container.querySelector('[data-block-kind="status"]').textContent;
      cleanup();
      return text;
    };
    expect(show(0, '2999-01-01')).toContain('Pending');
    expect(show(1, '2999-01-01')).toContain('In progress');
    expect(show(2, '2999-01-01')).toContain('Done');
    expect(show(1, '2000-01-01')).toContain('Delayed');
    expect(show(2, '2000-01-01')).toContain('Done'); // finished work is never late
  });

  it('the open canvas is fresher than the stored copy', () => {
    progress = { tasks: tasks(), live: { subtaskId: 's2', nodes: [card([true, true])] } };
    mount(block('progress', { label: 'Structure', link: { scope: 'task', taskName: 'Structure' } }));
    expect(screen.getByLabelText('Structure').getAttribute('aria-valuenow')).toBe('100');
  });

  it('a task that is gone or has nothing to tick keeps the typed-in value and says why', () => {
    progress = { tasks: tasks(), live: null };
    mount(block('progress', { label: 'Gone', value: 30, target: 100, link: { scope: 'task', taskName: 'Renamed away' } }));
    expect(screen.getByLabelText('Gone').getAttribute('aria-valuenow')).toBe('30');
    expect(screen.getByText('Task not found')).toBeTruthy();
    cleanup();
    progress = { tasks: [{ id: 'e', name: 'Empty', subtasks: [{ id: 's', canvasData: { nodes: [] } }] }], live: null };
    mount(block('status', { label: 'Empty', status: 'at-risk', link: { scope: 'task', taskName: 'Empty' } }));
    expect(screen.getByText('At risk')).toBeTruthy();
    expect(screen.getByText(/nothing to tick yet/)).toBeTruthy();
  });

  it('unlinked blocks are exactly as before', () => {
    progress = { tasks: tasks(), live: null };
    mount(block('progress', { label: 'Typed', value: 72, target: 100 }));
    expect(screen.getByLabelText('Typed').getAttribute('aria-valuenow')).toBe('72');
    expect(screen.queryByText(/^From /)).toBeNull();
  });

  it('settings offer the project and each task, and linking hides the typed-in fields', () => {
    progress = { tasks: tasks(), live: null };
    mount(block('progress', { label: 'P', value: 10 }, { selected: true }));
    const settings = within(screen.getByTestId('block-settings'));
    const select = settings.getByLabelText(/Take it from your tasks/);
    expect([...select.options].map((o) => o.textContent)).toEqual(['No: I will type it in', 'Yes: the whole project', 'Yes: Foundation', 'Yes: Structure']);
    expect(settings.getByText('Done')).toBeTruthy(); // typed-in fields while unlinked
    fireEvent.change(select, { target: { value: 'task:Structure' } });
    expect(persist.mock.calls.at(-1)[1]).toEqual({ link: { scope: 'task', taskName: 'Structure' } });
    fireEvent.change(select, { target: { value: 'workspace' } });
    expect(persist.mock.calls.at(-1)[1]).toEqual({ link: { scope: 'workspace' } });
    fireEvent.change(select, { target: { value: '' } });
    expect(persist.mock.calls.at(-1)[1]).toEqual({ link: null });
  });

  it('when linked, the settings do not ask for numbers that would be ignored', () => {
    progress = { tasks: tasks(), live: null };
    mount(block('progress', { label: 'P', link: { scope: 'workspace' } }, { selected: true }));
    const settings = within(screen.getByTestId('block-settings'));
    expect(settings.queryByText('Done')).toBeNull();
    expect(settings.getByText(/Worked out from the ticked items/)).toBeTruthy();
    cleanup();
    mount(block('status', { label: 'S', status: 'delayed', link: { scope: 'workspace' } }, { selected: true }));
    expect(within(screen.getByTestId('block-settings')).queryByLabelText('Status')).toBeNull();
  });

  describe('clicking a linked block goes to its task', () => {
    const listen = () => {
      const heard = vi.fn();
      window.addEventListener('workspace-open-task', heard);
      return { heard, stop: () => window.removeEventListener('workspace-open-task', heard) };
    };
    const linkedStatus = (extra = {}, node = {}) =>
      block('status', { label: 'Foundation', link: { scope: 'task', taskName: 'Foundation' }, ...extra }, node);

    it('the "From <task>" line is a button that asks to open that task', () => {
      progress = { tasks: tasks(), live: null };
      const { heard, stop } = listen();
      mount(linkedStatus());
      const button = screen.getByTitle(/Open the task "Foundation"/);
      expect(button.tagName).toBe('BUTTON');
      expect(button.textContent).toBe('From Foundation');
      fireEvent.click(button);
      expect(heard).toHaveBeenCalledTimes(1);
      expect(heard.mock.calls[0][0].detail).toEqual({ scope: 'task', taskId: 't1', taskName: 'Foundation' });
      stop();
    });

    it('the whole-project bar opens the Tasks list', () => {
      progress = { tasks: tasks(), live: null };
      const { heard, stop } = listen();
      mount(block('progress', { label: 'All', link: { scope: 'workspace' } }));
      const button = screen.getByTitle('Open the Tasks list');
      expect(button.textContent).toBe('From the whole project');
      fireEvent.click(button);
      expect(heard.mock.calls[0][0].detail.scope).toBe('workspace');
      stop();
    });

    it('when you can edit, clicking the card itself selects it and does not leave the canvas', () => {
      progress = { tasks: tasks(), live: null };
      const { heard, stop } = listen();
      const view = mount(linkedStatus());
      fireEvent.click(view.container.querySelector('[data-block-kind="status"] .rounded-xl'));
      expect(heard).not.toHaveBeenCalled();
      stop();
    });

    it('when you cannot edit (view-only, client view), clicking anywhere on the card goes to the task', () => {
      progress = { tasks: tasks(), live: null };
      const { heard, stop } = listen();
      const view = mount(linkedStatus({ readOnly: true }));
      const card = view.container.querySelector('[data-block-kind="status"] [role="link"]');
      expect(card).toBeTruthy();
      fireEvent.click(card);
      expect(heard).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(heard).toHaveBeenCalledTimes(2);
      stop();
    });

    it('a task that cannot be found gives nothing to click', () => {
      progress = { tasks: tasks(), live: null };
      const { heard, stop } = listen();
      const view = mount(linkedStatus({ link: { scope: 'task', taskName: 'Renamed away' }, readOnly: true }));
      expect(screen.queryByRole('button', { name: /Task not found/, hidden: true })).toBeNull();
      expect(view.container.querySelector('[role="link"]')).toBeNull();
      stop();
      expect(heard).not.toHaveBeenCalled();
    });

    it('an unlinked block is never clickable', () => {
      const view = mount(block('status', { label: 'Typed', readOnly: true }));
      expect(view.container.querySelector('[role="link"]')).toBeNull();
      expect(screen.queryByRole('button')).toBeNull();
    });
  });
});
