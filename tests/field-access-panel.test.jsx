/**
 * FieldAccessPanel — the "who should answer" configuration UI.
 * Verifies single vs poll assignment, reason/related/visibility payloads,
 * and the explicit "Assignee, Creator & PM" visibility wording.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react';

import FieldAccessPanel from '../src/pages/WorkspacePage/components/forms/FieldAccessPanel.jsx';

afterEach(cleanup);

const collaborators = [
  { vendorId: 'V-1', name: 'Ravi', email: 'ravi@x.com', role: 'vendor' },
  { userId: 'U-2', name: 'Priya', email: 'priya@x.com', role: 'vendor' },
  { pmId: 'PM-9', name: 'Nisha', email: 'nisha@x.com', role: 'pm' }
];

const elements = [
  { id: 'n1', name: 'BOQ Table' },
  { id: 'n2', name: 'Material Card' }
];

const setup = (props = {}) => {
  const onSave = vi.fn();
  const onClear = vi.fn();
  const onClose = vi.fn();
  render(
    <FieldAccessPanel
      collaborators={collaborators}
      elements={elements}
      onSave={onSave}
      onClear={onClear}
      onClose={onClose}
      {...props}
    />
  );
  return { onSave, onClear, onClose };
};

describe('FieldAccessPanel — assignment', () => {
  it('asks who should answer and defaults to anyone', () => {
    setup();
    expect(screen.getByText('Who should answer?')).toBeTruthy();
    expect(screen.getByText('Anyone can answer')).toBeTruthy();
  });

  it('saves a single assignee with reason, related element and visibility', () => {
    const { onSave } = setup({ sourceNodeId: 'src-1', sourceLabel: 'Rate field' });

    fireEvent.change(screen.getByDisplayValue('Anyone can answer'), { target: { value: 'V-1' } });
    fireEvent.change(screen.getByPlaceholderText(/need your material rate/i), { target: { value: 'Need your rate' } });

    // Pick-on-canvas flow: arm mode, then simulate the canvas click event
    fireEvent.click(screen.getByText('Pick element on canvas'));
    act(() => {
      document.dispatchEvent(new CustomEvent('elementLinkPicked', {
        detail: { sourceNodeId: 'src-1', targetId: 'n1', targetName: 'BOQ Table' }
      }));
    });

    fireEvent.click(screen.getByText('Save assignment'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0];
    expect(payload.assignees).toHaveLength(1);
    expect(payload.assignees[0].name).toBe('Ravi');
    expect(payload.answerMode).toBe('single');
    expect(payload.reason).toBe('Need your rate');
    expect(payload.relatedNodeId).toBe('n1');
    expect(payload.visibility).toBe('restricted');
  });

  it('clears the assignment when nobody is selected', () => {
    const { onClear, onSave } = setup();
    fireEvent.click(screen.getByText('Save assignment'));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClear).toHaveBeenCalled();
  });
});

describe('FieldAccessPanel — poll mode (Checkbox Group)', () => {
  it('hides the poll toggle unless the field allows it', () => {
    setup();
    expect(screen.queryByText(/multiple people/i)).toBeNull();
  });

  it('offers one-person vs multi-person when allowed', () => {
    setup({ allowPoll: true });
    expect(screen.getByText('One person answers')).toBeTruthy();
    expect(screen.getByText(/multiple people/i)).toBeTruthy();
  });

  it('collects several assignees in poll mode', () => {
    const { onSave } = setup({ allowPoll: true });
    fireEvent.click(screen.getByText(/multiple people/i));

    // checkboxes for each collaborator
    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[0]); // Ravi
    fireEvent.click(boxes[1]); // Priya
    fireEvent.click(screen.getByText('Save assignment'));

    const payload = onSave.mock.calls[0][0];
    expect(payload.answerMode).toBe('poll');
    expect(payload.assignees.map(a => a.name)).toEqual(['Ravi', 'Priya']);
  });

  it('pre-selects existing assignees when reopened', () => {
    setup({
      allowPoll: true,
      access: {
        assignees: [collaborators[0]],
        answerMode: 'poll',
        reason: 'Pick materials',
        visibility: 'restricted'
      }
    });
    expect(screen.getByDisplayValue('Pick materials')).toBeTruthy();
    const checked = screen.getAllByRole('checkbox').filter(c => c.checked);
    expect(checked).toHaveLength(1);
  });
});

describe('FieldAccessPanel — visibility wording', () => {
  it('names every role that can see a restricted answer', () => {
    setup();
    expect(screen.getByText('Restricted — Assignee, Creator & PM')).toBeTruthy();
  });

  it('explains what restricted means to outside viewers', () => {
    setup();
    expect(screen.getByText(/answer restricted/i)).toBeTruthy();
  });

  it('switches to everyone visibility', () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByDisplayValue('Anyone can answer'), { target: { value: 'V-1' } });
    fireEvent.change(screen.getByDisplayValue('Restricted — Assignee, Creator & PM'), { target: { value: 'everyone' } });
    fireEvent.click(screen.getByText('Save assignment'));
    expect(onSave.mock.calls[0][0].visibility).toBe('everyone');
  });

  it('offers the clear button only when an assignment exists', () => {
    const { unmount } = render(
      <FieldAccessPanel collaborators={collaborators} elements={elements} onSave={vi.fn()} onClear={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.queryByTitle('Remove assignment')).toBeNull();
    unmount();

    render(
      <FieldAccessPanel
        collaborators={collaborators}
        elements={elements}
        access={{ assignees: [collaborators[0]], visibility: 'restricted' }}
        onSave={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTitle('Remove assignment')).toBeTruthy();
  });
});

describe('FieldAccessPanel — pick element on canvas', () => {
  it('arms canvas pick-mode instead of a dropdown', () => {
    let detail;
    const capture = (e) => { detail = e.detail; };
    document.addEventListener('activateElementLinkMode', capture);

    setup({ sourceNodeId: 'src-1', sourceLabel: 'Rate field' });
    expect(screen.queryByDisplayValue('Nothing linked')).toBeNull(); // no dropdown
    fireEvent.click(screen.getByText('Pick element on canvas'));

    expect(detail).toEqual({ active: true, sourceNodeId: 'src-1', sourceLabel: 'Rate field' });
    expect(screen.getByText(/click an element on the canvas/i)).toBeTruthy();
    document.removeEventListener('activateElementLinkMode', capture);
  });

  it('shows the picked element chip and ignores picks for other nodes', () => {
    setup({ sourceNodeId: 'src-1' });
    fireEvent.click(screen.getByText('Pick element on canvas'));

    // A pick meant for a different node must not be claimed
    act(() => {
      document.dispatchEvent(new CustomEvent('elementLinkPicked', {
        detail: { sourceNodeId: 'other-node', targetId: 'n9', targetName: 'Wrong' }
      }));
    });
    expect(screen.queryByText('Wrong')).toBeNull();

    act(() => {
      document.dispatchEvent(new CustomEvent('elementLinkPicked', {
        detail: { sourceNodeId: 'src-1', targetId: 'n1', targetName: 'BOQ Table' }
      }));
    });
    expect(screen.getByText('BOQ Table')).toBeTruthy();
  });

  it('removes the link via the chip close button', () => {
    const { onSave } = setup({
      sourceNodeId: 'src-1',
      access: { assignees: [collaborators[0]], relatedNodeId: 'n1', visibility: 'restricted' }
    });
    expect(screen.getByText('BOQ Table')).toBeTruthy();

    fireEvent.click(screen.getByTitle('Remove link'));
    expect(screen.getByText('Pick element on canvas')).toBeTruthy();

    fireEvent.click(screen.getByText('Save assignment'));
    expect(onSave.mock.calls[0][0].relatedNodeId).toBeNull();
  });
});
