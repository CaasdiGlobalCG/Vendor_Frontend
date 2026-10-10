/**
 * Forms & Inputs suite — TextBox/Input split + working FormCard builder.
 *
 * Covers:
 *  1. TextBoxField — static display box, double-click edit, commit, locked state.
 *  2. FormCardNode — builder mode (edit fields) + fill mode (submit persists
 *     responses via persistNodeDataPatch), required-field gating.
 *
 * reactflow is mocked because these nodes normally live inside a canvas.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, screen, cleanup, waitFor } from '@testing-library/react';

const mockSetNodes = vi.fn();
const mockPersist = vi.fn().mockResolvedValue(undefined);

vi.mock('reactflow', () => ({
  Handle: () => null,
  NodeResizer: () => null,
  Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
  useReactFlow: () => ({ setNodes: mockSetNodes, getNodes: () => [] }),
}));

vi.mock('../src/pages/WorkspacePage/utils/nodePersistence', () => ({
  persistNodeDataPatch: (...args) => mockPersist(...args),
  persistIsImportant: vi.fn().mockResolvedValue(undefined),
  persistDeadline: vi.fn().mockResolvedValue(undefined),
  getTimeLeft: () => ({ isExpired: false, days: 0, hours: 2, minutes: 30 }),
  formatTimeLeft: () => '2h 30m'
}));

vi.mock('../src/pages/WorkspacePage/components/comments/CommentThread', () => ({
  default: () => <div data-testid="comment-thread">Comment thread</div>
}));

vi.mock('../src/pages/WorkspacePage/utils/workspaceApi', () => ({
  notifyWorkspaceEvent: vi.fn().mockResolvedValue(undefined)
}));

import TextBoxField from '../src/pages/WorkspacePage/components/forms/TextBoxField.jsx';
import FormCardNode from '../src/pages/WorkspacePage/components/nodes/FormCardNode.jsx';

afterEach(cleanup);
beforeEach(() => {
  mockSetNodes.mockClear();
  mockPersist.mockClear();
});

/* ═══════════════ TextBoxField ═══════════════ */
describe('TextBoxField — static display box', () => {
  it('renders saved text as display text', () => {
    render(<TextBoxField value="Site notes here" locked={false} />);
    expect(screen.getByText('Site notes here')).toBeTruthy();
    // Not an input — no editable control until double-click
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('shows placeholder when empty', () => {
    render(<TextBoxField value="" locked={false} />);
    expect(screen.getByText(/double-click to add text/i)).toBeTruthy();
  });

  it('enters edit mode on double-click and commits on blur', () => {
    const onTextChange = vi.fn();
    const { container } = render(
      <TextBoxField value="old" onTextChange={onTextChange} locked={false} />
    );
    fireEvent.doubleClick(container.firstChild);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'new text' } });
    fireEvent.blur(textarea);
    expect(onTextChange).toHaveBeenCalledWith('new text');
  });

  it('does not enter edit mode when locked', () => {
    const { container } = render(<TextBoxField value="locked text" locked={true} />);
    fireEvent.doubleClick(container.firstChild);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('locked text')).toBeTruthy();
  });

  it('enters edit mode when menu Edit fires editSignal', () => {
    render(<TextBoxField value="menu edit" locked={false} editSignal={1} />);
    expect(screen.getByRole('textbox')).toBeTruthy();
    expect(screen.getByDisplayValue('menu edit')).toBeTruthy();
  });
});

/* ═══════════════ FormCardNode ═══════════════ */
const baseData = {
  workspaceId: 'ws-1',
  title: 'Site Form',
  submitButton: 'Submit',
  status: 'draft',
  fields: [
    { id: 'f1', label: 'Name', type: 'text', required: true },
    { id: 'f2', label: 'Notes', type: 'textarea', required: false }
  ]
};

describe('FormCardNode — working form builder', () => {
  it('renders all configured fields as fillable inputs', () => {
    render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    expect(screen.getByText('Site Form')).toBeTruthy();
    // Required marker on Name
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter notes')).toBeTruthy();
  });

  it('blocks submit until required fields are filled', () => {
    render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    const submit = screen.getByText('Submit').closest('button');
    expect(submit.disabled).toBe(true);
  });

  it('submit persists responses through persistNodeDataPatch', async () => {
    render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    fireEvent.change(screen.getByPlaceholderText('Enter name'), { target: { value: 'Dhanush' } });
    fireEvent.change(screen.getByPlaceholderText('Enter notes'), { target: { value: 'All good' } });

    const submit = screen.getByText('Submit').closest('button');
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);

    await waitFor(() => expect(mockPersist).toHaveBeenCalledTimes(1));
    const [nodeId, patch] = mockPersist.mock.calls[0];
    expect(nodeId).toBe('node-1');
    expect(patch.formResponses).toEqual({ f1: 'Dhanush', f2: 'All good' });
    expect(patch.status).toBe('submitted');
    expect(patch.submittedAt).toBeTruthy();
  });

  it('Edit Form opens builder mode with field editors', () => {
    render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    fireEvent.click(screen.getByText('Edit Form'));
    expect(screen.getByText('Form Fields')).toBeTruthy();
    expect(screen.getByText('Add Field')).toBeTruthy();
  });

  it('builder Save persists the field structure', async () => {
    render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    fireEvent.click(screen.getByText('Edit Form'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockPersist).toHaveBeenCalledTimes(1));
    const [nodeId, patch] = mockPersist.mock.calls[0];
    expect(nodeId).toBe('node-1');
    expect(patch.fields).toHaveLength(2);
    expect(patch.title).toBe('Site Form');
  });

  it('Add Field appends a new configurable field', () => {
    render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    fireEvent.click(screen.getByText('Edit Form'));
    fireEvent.click(screen.getByText('Add Field'));
    expect(screen.getByDisplayValue('Field 3')).toBeTruthy();
  });
});

/* ═══════════════ Chrome parity with other elements ═══════════════ */
describe('FormCardNode — element chrome parity', () => {
  it('renders Mark Important and Set Deadline buttons', () => {
    render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    expect(screen.getByText('☆ Mark Important')).toBeTruthy();
    expect(screen.getByText('Set Deadline')).toBeTruthy();
  });

  it('Mark Important toggles to ★ Important', () => {
    render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    fireEvent.click(screen.getByText('☆ Mark Important'));
    expect(screen.getByText('★ Important')).toBeTruthy();
  });

  it('reflects an already-important node', () => {
    render(<FormCardNode id="node-1" data={{ ...baseData, isImportant: true }} selected={false} />);
    expect(screen.getByText('★ Important')).toBeTruthy();
  });

  it('Set Deadline opens the datetime input', () => {
    const { container } = render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    fireEvent.click(screen.getByText('Set Deadline'));
    expect(container.querySelector('input[type="datetime-local"]')).toBeTruthy();
  });

  it('shows the countdown when a deadline exists', () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    render(<FormCardNode id="node-1" data={{ ...baseData, deadline: future }} selected={false} />);
    expect(screen.getByText(/time left/i)).toBeTruthy();
  });

  it('shows the Added by badge (vendor and pm variants)', () => {
    const { unmount } = render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    expect(screen.getByText('Added by Vendor')).toBeTruthy();
    unmount();
    render(<FormCardNode id="node-1" data={{ ...baseData, addedByRole: 'pm' }} selected={false} />);
    expect(screen.getByText('Added by PM')).toBeTruthy();
  });

  it('shows a comment count badge when comments are unresolved', () => {
    const withComments = {
      ...baseData,
      comments: [
        { id: 'c1', text: 'first', resolved: false },
        { id: 'c2', text: 'second', resolved: false },
        { id: 'c3', text: 'done', resolved: true }
      ]
    };
    render(<FormCardNode id="node-1" data={withComments} selected={false} />);
    expect(screen.getByTitle('Comments (2)')).toBeTruthy();
  });

  it('opens the comment thread popover', () => {
    render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    fireEvent.click(screen.getByTitle('Comments'));
    expect(screen.getByTestId('comment-thread')).toBeTruthy();
  });

  it('shows the NEW badge for a recently added element', () => {
    render(<FormCardNode id="node-1" data={{ ...baseData, addedAt: new Date().toISOString() }} selected={false} />);
    expect(screen.getByText('✨ NEW')).toBeTruthy();
  });

  it('does not show the NEW badge for an old element', () => {
    const old = new Date(Date.now() - 86400_000).toISOString();
    render(<FormCardNode id="node-1" data={{ ...baseData, addedAt: old }} selected={false} />);
    expect(screen.queryByText('✨ NEW')).toBeNull();
  });
});

/* ═══════════════ FormCardNode — who should answer ═══════════════ */
const assignedAccess = {
  assignees: [{ vendorId: 'V-9', name: 'Ravi', email: 'ravi@x.com', role: 'vendor' }],
  answerMode: 'single',
  reason: 'Need your site measurements',
  relatedNodeId: null,
  visibility: 'restricted'
};

const setSearch = (s) => window.history.replaceState({}, '', s ? `/?${s}` : '/');
afterEach(() => setSearch(''));

describe('FormCardNode — who should answer', () => {
  const creatorData = {
    ...baseData,
    addedBy: 'Me', addedByEmail: 'me@x.com', addedByRole: 'vendor'
  };
  const asCreator = () => setSearch('userEmail=me%40x.com&userName=Me&userRole=vendor');

  it('offers "Assign to someone" to the element creator and inputs stay open', () => {
    asCreator();
    render(<FormCardNode id="node-1" data={creatorData} selected={false} />);
    expect(screen.getByText('Assign to someone')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter name').disabled).toBe(false);
  });

  it('opens the assignment popover with the workspace pop styling', () => {
    asCreator();
    render(<FormCardNode id="node-1" data={creatorData} selected={false} />);
    fireEvent.click(screen.getByText('Assign to someone'));
    expect(screen.getByText('Who should answer?')).toBeTruthy();
  });

  it('hides the assign control from viewers who are not creator or PM', () => {
    setSearch('vendorId=V-OTHER&userName=Outsider&userEmail=out%40x.com&userRole=vendor');
    render(<FormCardNode id="node-1" data={creatorData} selected={false} />);
    expect(screen.queryByText('Assign to someone')).toBeNull();
    expect(screen.queryByText('Who should answer?')).toBeNull();
  });

  it('lets a PM configure access even on a vendor-created card', () => {
    setSearch('userRole=pm&pmId=PM-1&userName=Nisha&userEmail=nisha%40x.com');
    render(<FormCardNode id="node-1" data={creatorData} selected={false} />);
    fireEvent.click(screen.getByText('Assign to someone'));
    expect(screen.getByText('Who should answer?')).toBeTruthy();
  });

  it('locks the form for non-assignees and shows who is expected', () => {
    setSearch('vendorId=V-OTHER&userRole=vendor');
    render(<FormCardNode id="node-1" data={{ ...baseData, fieldAccess: assignedAccess }} selected={false} />);
    expect(screen.getByText(/to answer/i)).toBeTruthy();
    screen.getAllByPlaceholderText('Waiting for Ravi').forEach(el => expect(el.disabled).toBe(true));
    expect(screen.getByRole('button', { name: /waiting for ravi/i })).toBeTruthy();
  });

  it('lets the assignee fill and records an attributed answer on submit', async () => {
    setSearch('vendorId=V-9&userName=Ravi&userEmail=ravi%40x.com&userRole=vendor');
    render(<FormCardNode id="node-1" data={{ ...baseData, fieldAccess: assignedAccess }} selected={false} />);
    fireEvent.change(screen.getByPlaceholderText('Enter name'), { target: { value: 'Site A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(mockPersist).toHaveBeenCalled());
    const patch = mockPersist.mock.calls[0][1];
    expect(patch.fieldAnswers).toHaveLength(1);
    expect(patch.fieldAnswers[0].by).toBe('Ravi');
    expect(patch.fieldAnswers[0].value).toMatch(/of 2 fields/);
  });

  it('hides answers from unrelated viewers with restricted visibility', () => {
    setSearch('vendorId=V-OTHER&userRole=vendor');
    const answered = [{
      by: 'Ravi', byEmail: 'ravi@x.com', byRole: 'vendor',
      at: new Date().toISOString(), value: '2 of 2 fields'
    }];
    render(<FormCardNode id="node-1" data={{ ...baseData, fieldAccess: assignedAccess, fieldAnswers: answered, formResponses: { f1: 'secret' } }} selected={false} />);
    expect(screen.getByText('Answer restricted')).toBeTruthy();
    expect(screen.queryByDisplayValue('secret')).toBeNull();
  });

  it('lets PM see the answer attribution', () => {
    setSearch('userRole=pm&pmId=PM-1&userName=Nisha');
    const answered = [{
      by: 'Ravi', byEmail: 'ravi@x.com', byRole: 'vendor',
      at: new Date().toISOString(), value: '2 of 2 fields'
    }];
    render(<FormCardNode id="node-1" data={{ ...baseData, fieldAccess: assignedAccess, fieldAnswers: answered }} selected={false} />);
    expect(screen.getByText('2 of 2 fields')).toBeTruthy();
    expect(screen.getByText(/by Ravi/)).toBeTruthy();
    expect(screen.queryByText('Answer restricted')).toBeNull();
  });
});

/* ═══════════════ FormCardNode — standard element chrome ═══════════════ */
describe('FormCardNode — standard element chrome', () => {
  it('renders the sequence number badge like other elements', () => {
    render(<FormCardNode id="node-1" data={{ ...baseData, sequenceNumber: 15 }} selected={false} />);
    expect(screen.getByText('15')).toBeTruthy();
  });

  it('omits the badge when no sequence number is set', () => {
    const { container } = render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    expect(container.querySelector('.-top-4.-left-4')).toBeNull();
  });

  it('shows the E selection indicator when selected', () => {
    render(<FormCardNode id="node-1" data={baseData} selected />);
    expect(screen.getByText('E')).toBeTruthy();
  });

  it('renders the hover-revealed element type label', () => {
    render(<FormCardNode id="node-1" data={{ ...baseData, type: 'form-card' }} selected={false} />);
    expect(screen.getByText('FORM-CARD')).toBeTruthy();
  });

  it('shows an element-info button that opens the details tooltip', () => {
    render(<FormCardNode id="node-1" data={{ ...baseData, addedBy: 'Dhanush' }} selected={false} />);
    fireEvent.click(screen.getByTitle('Element Info'));
    expect(screen.getByText('Element Details')).toBeTruthy();
    expect(screen.getByText('Dhanush')).toBeTruthy();
  });

  it('menu exposes Duplicate, Edit, Comments and Delete like other elements', () => {
    render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    fireEvent.click(screen.getByTitle('More options'));
    expect(screen.getByText('Duplicate')).toBeTruthy();
    expect(screen.getByText('Duplicate to all subtasks')).toBeTruthy();
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('Comments')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('menu Duplicate emits the element-duplicate event', () => {
    const handler = vi.fn();
    window.addEventListener('element-duplicate', handler);
    render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    fireEvent.click(screen.getByTitle('More options'));
    fireEvent.click(screen.getByText('Duplicate'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.nodeId).toBe('node-1');
    window.removeEventListener('element-duplicate', handler);
  });

  it('PM delete confirms then dispatches deleteElement', async () => {
    setSearch('userRole=pm&pmId=PM-1&userName=Nisha');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const handler = vi.fn();
    document.addEventListener('deleteElement', handler);
    render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    fireEvent.click(screen.getByTitle('More options'));
    fireEvent.click(screen.getByText('Delete'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.elementId).toBe('node-1');
    document.removeEventListener('deleteElement', handler);
    confirmSpy.mockRestore();
  });

  it('vendor delete files a deletion request instead of deleting', async () => {
    setSearch('vendorId=V-9&userName=Ravi&userEmail=ravi%40x.com&userRole=vendor');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const handler = vi.fn();
    document.addEventListener('deleteElement', handler);
    render(<FormCardNode id="node-1" data={baseData} selected={false} />);
    fireEvent.click(screen.getByTitle('More options'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(mockPersist).toHaveBeenCalled());
    const patch = mockPersist.mock.calls[0][1];
    expect(patch.deletionRequested).toBe(true);
    expect(patch.deletionRequestedBy).toBe('Ravi');
    expect(handler).not.toHaveBeenCalled();
    document.removeEventListener('deleteElement', handler);
    confirmSpy.mockRestore();
  });

  it('shows the pending-deletion notice when a request is awaiting PM approval', () => {
    render(<FormCardNode id="node-1" data={{ ...baseData, deletionRequested: true }} selected={false} />);
    expect(screen.getByText(/deletion requested/i)).toBeTruthy();
  });

  it('locks inputs, submit and shows the lock badge when the element is locked', () => {
    render(<FormCardNode id="node-1" data={{ ...baseData, locked: true }} selected={false} />);
    expect(screen.getByTitle('Element is locked')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter name').disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Submit' }).disabled).toBe(true);
  });

  it('marks a filled field card with a completion check', () => {
    render(<FormCardNode id="node-1" data={{ ...baseData, formResponses: { f1: 'Dhanush' } }} selected={false} />);
    // Field 1 filled → its card shows a success check icon
    const filledCard = screen.getByLabelText(/name/i).closest('div.rounded-xl');
    expect(filledCard.className).toMatch(/border-success/);
  });
});
