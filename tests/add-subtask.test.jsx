import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import AddSubtaskModal from '../src/pages/WorkspacePage/components/AddSubtaskModal.jsx';

afterEach(cleanup);

const existing = [{ id: 'S1', name: 'Design' }, { id: 'S2', name: 'Build' }];
const open = (onAddSubtask = vi.fn()) => {
  render(<AddSubtaskModal isOpen onClose={() => {}} onAddSubtask={onAddSubtask} parentTaskName="Phase" existingSubtasks={existing} />);
  return onAddSubtask;
};
const create = (name = 'New step') => {
  fireEvent.change(screen.getByPlaceholderText('Enter subtask name'), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Subtask' }));
};

describe('adding a subtask', () => {
  it('is independent by default: it does not depend on the previous subtask', async () => {
    const add = open();
    create();
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect(add.mock.calls[0][0].dependsOnSubtaskId).toBe('none');
  });

  it('the dependency choice starts on "None: independent" and says so', () => {
    open();
    fireEvent.click(screen.getByText('Advanced flow options'));
    const select = screen.getByDisplayValue('None: independent');
    expect([...select.options].map((o) => o.textContent)).toEqual(['None: independent', 'After the previous subtask', 'Design', 'Build']);
    expect(screen.getByText(/independent unless you choose something here/)).toBeTruthy();
  });

  it('only depends on something when the user chooses it', async () => {
    const add = open();
    fireEvent.click(screen.getByText('Advanced flow options'));
    fireEvent.change(screen.getByDisplayValue('None: independent'), { target: { value: 'S1' } });
    create();
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect(add.mock.calls[0][0].dependsOnSubtaskId).toBe('S1');
  });

  it('"After the previous subtask" is still there for people who want it', async () => {
    const add = open();
    fireEvent.click(screen.getByText('Advanced flow options'));
    fireEvent.change(screen.getByDisplayValue('None: independent'), { target: { value: 'auto-previous' } });
    create();
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect(add.mock.calls[0][0].dependsOnSubtaskId).toBe('auto-previous');
  });

  it('after "create and add another", the next one is independent again', async () => {
    const add = open();
    fireEvent.click(screen.getByText('Advanced flow options'));
    fireEvent.change(screen.getByDisplayValue('None: independent'), { target: { value: 'S2' } });
    create('First');
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByDisplayValue('None: independent')).toBeTruthy());
  });
});
