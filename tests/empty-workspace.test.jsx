/**
 * A workspace with no tasks shows one thing to do: create the first task. (The four ways to start
 * belong to an empty canvas, which only exists inside a task.) A template used in such a workspace
 * creates its tasks and opens its Overview.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import EmptyTasksState from '../src/pages/WorkspacePage/components/EmptyTasksState.jsx';
import { planTemplateTasks } from '../src/pages/WorkspacePage/templates/templateEngine.js';
import { getOfficialTemplate } from '../src/pages/WorkspacePage/templates/officialTemplates.js';

afterEach(cleanup);

describe('workspace with no tasks', () => {
  it('offers one thing: create the first task', () => {
    render(<EmptyTasksState onCreateTask={() => {}} />);
    expect(screen.getByText('No Tasks Yet')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Create First Task/ })).toBeTruthy();
    for (const gone of ['Browse elements', 'Start from a template', 'Add a text box', 'Add a heading']) {
      expect(screen.queryByText(gone)).toBeNull();
    }
  });

  it('opens the form and creates the task with its name and description', () => {
    const onCreateTask = vi.fn();
    render(<EmptyTasksState onCreateTask={onCreateTask} />);
    fireEvent.click(screen.getByRole('button', { name: /Create First Task/ }));
    expect(screen.getByText('Create Your First Task')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create Task' }).disabled).toBe(true); // needs a name
    fireEvent.change(screen.getByLabelText(/Task Name/), { target: { value: 'Design Phase' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Drawings' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Task' }));
    expect(onCreateTask).toHaveBeenCalledWith({ title: 'Design Phase', description: 'Drawings' });
  });

  it('cancelling the form goes back to the single button', () => {
    render(<EmptyTasksState onCreateTask={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Create First Task/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('No Tasks Yet')).toBeTruthy();
  });
});

describe('plans for a workspace with no canvas', () => {
  it('with the overview: it is the first task, holds the whole diagram and working elements, and the rest follow', () => {
    const civil = getOfficialTemplate('official-civil-works');
    const plain = planTemplateTasks(civil, { values: { project: 'Sharma Villa' }, workspace: { workspaceId: 'W9' }, suffix: 'abc' });
    const withOverview = planTemplateTasks(civil, { values: { project: 'Sharma Villa', start_date: '2026-03-01' }, workspace: { workspaceId: 'W9' }, suffix: 'abc', includeOverview: true });
    expect(withOverview).toHaveLength(plain.length + 1);
    const [first] = withOverview;
    expect(first.name).toBe('Sharma Villa overview');
    expect(first.dueDate).toBe('2026-03-01');
    expect(first.subtasks).toHaveLength(1);
    expect(first.subtasks[0].name).toBe('Overview');
    const nodes = first.subtasks[0].canvasData.nodes;
    expect(nodes.length).toBe(civil.nodes.length);
    expect(nodes.some((n) => n.data?.type === 'task-card')).toBe(true);
    expect(nodes.some((n) => n.data?.type === 'table')).toBe(true);
    nodes.forEach((n) => {
      expect(n.data.workspaceId).toBe('W9');
      expect(n.data.taskId).toBe(first.id);
      expect(n.data.subtaskId).toBe(first.subtasks[0].id);
    });
    const ids = withOverview.flatMap((t) => [t.id, ...t.subtasks.map((s) => s.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(withOverview.slice(1).map((t) => t.name)).toEqual(plain.map((t) => t.name));
  });

  it('with no project name it is "Project overview"', () => {
    const t = getOfficialTemplate('official-store-launch');
    expect(planTemplateTasks(t, { values: {}, workspace: {}, includeOverview: true })[0].name).toBe('Project overview');
  });
});
