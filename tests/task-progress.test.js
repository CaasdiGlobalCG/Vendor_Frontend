import { describe, it, expect } from 'vitest';
import {
  cardProgress, taskStats, projectStats, findLinkedTask, resolveLink, statusFromProgress, taskToOpen,
} from '../src/pages/WorkspacePage/utils/taskProgress.js';

const card = (items, status = 'todo') => ({ id: 'c', data: { type: 'task-card', taskCardData: { status, checklists: items.map((c, i) => ({ id: String(i), text: 't', completed: c })) } } });
const sub = (id, nodes) => ({ id, name: id, canvasData: { nodes } });
const task = (id, name, subtasks, extra = {}) => ({ id, name, subtasks, ...extra });

describe('cardProgress', () => {
  it('counts ticked checklist items', () => {
    expect(cardProgress(card([true, false, true, false]))).toEqual({ done: 2, total: 4 });
  });
  it('a card with no checklist is one item, done when completed', () => {
    expect(cardProgress(card([], 'completed'))).toEqual({ done: 1, total: 1 });
    expect(cardProgress(card([], 'todo'))).toEqual({ done: 0, total: 1 });
  });
  it('ignores nodes that are not task cards', () => {
    expect(cardProgress({ data: { kind: 'status' } })).toBeNull();
    expect(cardProgress(null)).toBeNull();
  });
});

describe('taskStats / projectStats', () => {
  const t1 = task('t1', 'Foundation', [sub('s1', [card([true, true]), { data: {} }]), sub('s2', [card([false, false])])]);
  const t2 = task('t2', 'Structure', [sub('s3', [card([true, false, false, false])])]);

  it('adds up every card in every step of a task', () => {
    expect(taskStats(t1)).toEqual({ done: 2, total: 4, steps: 2 });
  });
  it('and across the project', () => {
    expect(projectStats([t1, t2])).toEqual({ done: 3, total: 8, steps: 3 });
    expect(projectStats([])).toEqual({ done: 0, total: 0, steps: 0 });
  });
  it('the open canvas wins over the stored copy for its own step', () => {
    const live = { subtaskId: 's2', nodes: [card([true, true])] }; // ticked since the task was saved
    expect(taskStats(t1, live)).toEqual({ done: 4, total: 4, steps: 2 });
  });
  it('a canvas opened earlier counts at once, newer than the stored copy but older than the open canvas', () => {
    const others = new Map([['s2', [card([true, true])]]]); // s2 was ticked on screen, not reloaded yet
    expect(taskStats(t1, { subtaskId: 'other', nodes: [], others })).toEqual({ done: 4, total: 4, steps: 2 });
    const live = { subtaskId: 's2', nodes: [card([true, false])], others };
    expect(taskStats(t1, live)).toEqual({ done: 3, total: 4, steps: 2 }); // the open canvas wins over the remembered one
  });
  it('survives tasks with no steps or no canvas', () => {
    expect(taskStats({ id: 'x' })).toEqual({ done: 0, total: 0, steps: 0 });
    expect(taskStats(task('x', 'X', [{ id: 's' }]))).toEqual({ done: 0, total: 0, steps: 1 });
  });
});

describe('findLinkedTask', () => {
  const tasks = [task('t1', 'Excavation & Foundation', []), task('t2', 'Structure', [])];
  it('finds by id first, then by name ignoring case and spaces', () => {
    expect(findLinkedTask(tasks, { taskId: 't2' }).name).toBe('Structure');
    expect(findLinkedTask(tasks, { taskName: '  excavation & foundation ' }).id).toBe('t1');
    expect(findLinkedTask(tasks, { taskId: 'gone', taskName: 'Structure' }).id).toBe('t2');
  });
  it('returns null when nothing matches', () => {
    expect(findLinkedTask(tasks, { taskName: 'Nope' })).toBeNull();
    expect(findLinkedTask(tasks, null)).toBeNull();
  });
});

describe('resolveLink', () => {
  const tasks = [
    task('t1', 'Foundation', [sub('s1', [card([true, true, false, false])])], { dueDate: '2026-03-10' }),
    task('t2', 'Structure', [sub('s2', [card([false, false])])], { dueDate: '2026-05-01' }),
  ];
  it('whole project: percent over all cards, last due date', () => {
    expect(resolveLink({ scope: 'workspace' }, tasks)).toMatchObject({ done: 2, total: 6, percent: 33, hasData: true, dueDate: '2026-05-01' });
  });
  it('one task by name', () => {
    expect(resolveLink({ scope: 'task', taskName: 'Foundation' }, tasks)).toMatchObject({ label: 'Foundation', done: 2, total: 4, percent: 50, dueDate: '2026-03-10' });
  });
  it('not linked, or linked to a task that is gone', () => {
    expect(resolveLink(null, tasks)).toBeNull();
    expect(resolveLink({}, tasks)).toBeNull();
    expect(resolveLink({ scope: 'task', taskName: 'Renamed away' }, tasks)).toEqual({ missing: true });
  });
  it('a task with nothing to tick has no data, so the typed-in value stays', () => {
    const r = resolveLink({ scope: 'task', taskName: 'Empty' }, [task('e', 'Empty', [sub('s', [])])]);
    expect(r).toMatchObject({ total: 0, percent: 0, hasData: false });
  });
  it('uses the open canvas for fresh numbers', () => {
    const live = { subtaskId: 's1', nodes: [card([true, true, true, true])] };
    expect(resolveLink({ scope: 'task', taskName: 'Foundation' }, tasks, live).percent).toBe(100);
  });
});

describe('statusFromProgress', () => {
  const today = new Date(2026, 2, 15); // 15 Mar 2026
  it('pending, in progress, done', () => {
    expect(statusFromProgress({ done: 0, total: 4, dueDate: '2026-04-01' }, today)).toBe('pending');
    expect(statusFromProgress({ done: 1, total: 4, dueDate: '2026-04-01' }, today)).toBe('in-progress');
    expect(statusFromProgress({ done: 4, total: 4, dueDate: '2026-04-01' }, today)).toBe('done');
  });
  it('delayed once past the due date and not finished; finished work is never delayed', () => {
    expect(statusFromProgress({ done: 1, total: 4, dueDate: '2026-03-10' }, today)).toBe('delayed');
    expect(statusFromProgress({ done: 0, total: 4, dueDate: '2026-03-10' }, today)).toBe('delayed');
    expect(statusFromProgress({ done: 4, total: 4, dueDate: '2026-03-10' }, today)).toBe('done');
    expect(statusFromProgress({ done: 1, total: 4, dueDate: '2026-03-15' }, today)).toBe('in-progress'); // due today is not late
  });
  it('nothing to measure: no opinion', () => {
    expect(statusFromProgress({ done: 0, total: 0, dueDate: '2020-01-01' }, today)).toBeNull();
  });
});

describe('taskToOpen (what a click on a linked block opens)', () => {
  const tasks = [task('t1', 'Go-live', []), task('t2', 'Structure', [])];
  it('opens the task by id, or by name when the id is not known', () => {
    expect(taskToOpen(tasks, { scope: 'task', taskId: 't2' }).name).toBe('Structure');
    expect(taskToOpen(tasks, { scope: 'task', taskName: ' go-live ' }).id).toBe('t1');
  });
  it('"the whole project" opens no single task, and a task that is gone opens nothing', () => {
    expect(taskToOpen(tasks, { scope: 'workspace' })).toBeNull();
    expect(taskToOpen(tasks, { scope: 'task', taskName: 'Renamed away' })).toBeNull();
    expect(taskToOpen(tasks, undefined)).toBeNull();
  });
  it('resolveLink hands the block what it needs to ask for that task', () => {
    expect(resolveLink({ scope: 'task', taskName: 'Go-live' }, tasks)).toMatchObject({ scope: 'task', taskId: 't1', taskName: 'Go-live', label: 'Go-live' });
    expect(resolveLink({ scope: 'workspace' }, tasks)).toMatchObject({ scope: 'workspace', taskId: null });
  });
});
