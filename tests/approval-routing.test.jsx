/**
 * Who each person can ask for approval, and what they see at each step.
 *
 *   vendor -> PM or CAS ; CAS -> PM -> client ; client -> PM -> vendor ; PM -> anyone
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

import ApprovalPanel from '../src/pages/WorkspacePage/components/nodes/ApprovalPanel.jsx';
import {
  approverOptions, viewerRole, forwardCandidates, isCurrentApprover, isOrigin, chainFor, describeChain, pendingStep,
} from '../src/pages/WorkspacePage/utils/approvalRouting.js';

afterEach(() => cleanup());

const collaborators = [
  { vendorId: 'PM-9', name: 'Priya PM', email: 'priya@pm.com', isPM: true },
  { vendorId: 'C-3', name: 'Acme Client', email: 'client@acme.com', isClient: true },
  { vendorId: 'V-1', name: 'Meera Nair', email: 'meera@vendor.com', specialization: 'Civil' },
  { vendorId: 'V-2', name: 'Suresh Kumar', email: 'suresh@vendor.com', specialization: 'Electrical' },
  { vendorId: 'V-5', name: 'Ravi Iyer', email: 'ravi@vendor.com' },
  { vendorId: 'CAS-4', name: 'Safety Unit', email: 'cas@x.com', isCAS: true },
  { vendorId: 'X-0', name: 'Unknown User', email: 'N/A' },
];
const viewers = {
  vendor: { ids: ['V-1'], email: 'meera@vendor.com', name: 'Meera Nair', role: 'vendor' },
  pm: { ids: ['PM-9'], email: null, name: 'Priya PM', role: 'pm' },
  client: { ids: ['C-3'], email: 'client@acme.com', name: 'Acme Client', role: 'client' },
  cas: { ids: ['CAS-4'], email: 'cas@x.com', name: 'Safety Unit', role: 'cas' },
  suresh: { ids: ['V-2'], email: 'suresh@vendor.com', name: 'Suresh Kumar', role: 'vendor' },
};
const names = (opts) => opts.map((o) => o.person.name);

describe('who can be asked', () => {
  const asRole = (who) => approverOptions({ collaborators, viewer: viewers[who], role: viewerRole(viewers[who], collaborators) });

  it('a vendor: the PM or a CAS member only. Never the client, never another vendor', () => {
    expect(names(asRole('vendor'))).toEqual(['Priya PM', 'Safety Unit']);
  });
  it('a CAS member: the PM only', () => {
    expect(names(asRole('cas'))).toEqual(['Priya PM']);
  });
  it('a client: the PM only. Never a vendor', () => {
    expect(names(asRole('client'))).toEqual(['Priya PM']);
  });
  it('a PM: anyone but themselves, and nobody who cannot be identified', () => {
    expect(names(asRole('pm'))).toEqual(['Acme Client', 'Meera Nair', 'Ravi Iyer', 'Suresh Kumar', 'Safety Unit']);
  });
  it('the role comes from the workspace list, not from what the session claims', () => {
    // a session that says "pm" but is the vendor Meera in the collaborator list is a vendor
    expect(viewerRole({ ids: ['V-1'], email: 'meera@vendor.com', role: 'pm' }, collaborators)).toBe('vendor');
    expect(viewerRole({ ids: ['C-3'], email: 'x', role: 'vendor' }, collaborators)).toBe('client');
    expect(viewerRole({ ids: ['nobody'], role: 'client' }, collaborators)).toBe('client'); // fallback
    expect(viewerRole({ ids: ['nobody'] }, collaborators)).toBe('vendor');
  });
});

describe('forwarding', () => {
  const chain = (originRole, steps, state = 'pending') => ({
    state, originRole, origin: { vendorId: originRole === 'client' ? 'C-3' : 'V-1', name: 'Origin' },
    steps: steps.map((s, i) => ({ id: `s${i}`, decision: 'pending', ...s })),
  });

  it('after the PM, a vendor\'s element goes to the client', () => {
    const c = chain('vendor', [{ role: 'pm', person: { vendorId: 'PM-9' } }]);
    const f = forwardCandidates({ chain: c, collaborators, kind: 'permit' });
    expect(f.role).toBe('client');
    expect(f.options.map((o) => o.person.name)).toEqual(['Acme Client']);
  });

  it('after the PM, a client\'s element goes to a vendor; the origin is not offered', () => {
    const c = chain('client', [{ role: 'pm', person: { vendorId: 'PM-9' } }]);
    const f = forwardCandidates({ chain: c, collaborators, kind: 'siteinspect' });
    expect(f.role).toBe('vendor');
    expect(f.options.map((o) => o.person.name).sort()).toEqual(['Meera Nair', 'Ravi Iyer', 'Suresh Kumar']);
  });

  it('nothing to forward when the workspace has no client, or for a batch record, or at a CAS step', () => {
    const c = chain('vendor', [{ role: 'pm', person: { vendorId: 'PM-9' } }]);
    const noClient = collaborators.filter((x) => !x.isClient);
    expect(forwardCandidates({ chain: c, collaborators: noClient, kind: 'permit' }).options).toEqual([]);
    expect(forwardCandidates({ chain: c, collaborators, kind: 'batch' }).options).toEqual([]);
    const atCas = chain('vendor', [{ role: 'cas', person: { vendorId: 'CAS-4' } }]);
    expect(forwardCandidates({ chain: atCas, collaborators, kind: 'permit' }).options).toEqual([]);
  });

  it('a PM\'s own element is never forwarded', () => {
    const c = chain('pm', [{ role: 'vendor', person: { vendorId: 'V-1' } }]);
    expect(forwardCandidates({ chain: c, collaborators, kind: 'permit' }).options).toEqual([]);
  });
});

describe('reading a chain', () => {
  const c = {
    state: 'pending', originRole: 'vendor', origin: { vendorId: 'V-1', name: 'Meera', email: 'meera@vendor.com' }, subject: 'v2',
    steps: [
      { id: 's1', role: 'pm', person: { vendorId: 'PM-9', name: 'Priya PM' }, decision: 'approved', by: { name: 'Priya PM' } },
      { id: 's2', role: 'client', person: { vendorId: 'C-3', name: 'Acme Client' }, decision: 'pending' },
    ],
  };
  it('finds the step that is waiting, and who it is waiting for', () => {
    expect(pendingStep(c).role).toBe('client');
    expect(isCurrentApprover(c, viewers.client)).toBe(true);
    expect(isCurrentApprover(c, viewers.pm)).toBe(false);
    expect(isOrigin(c, viewers.vendor)).toBe(true);
    expect(describeChain(c).text).toBe('Waiting for Client (Client)');
    expect(describeChain({ ...c, state: 'approved' }).text).toBe('Approved by Priya PM');
  });
  it('an approval for an older version is ignored', () => {
    expect(chainFor({ approvalChain: c }, 'v2')).toBe(c);
    expect(chainFor({ approvalChain: c }, 'v3')).toBeNull();
    expect(chainFor({}, 'v1')).toBeNull();
  });
});

describe('ApprovalPanel', () => {
  const base = { workspaceId: 'w1', taskId: 't1', subtaskId: 's1', workspaceCollaborators: collaborators };
  const render_ = (props) => {
    const decide = props.decide || vi.fn(async () => ({ patch: { approvalChain: { state: 'pending', steps: [], origin: { vendorId: 'V-1' } } } }));
    const notify = vi.fn();
    const onServerPatch = vi.fn();
    const view = render(
      <ApprovalPanel kind="permit" id="n1" editable what="the permit" place="Structure › Level 3"
        decide={decide} notify={notify} onServerPatch={onServerPatch} {...props} />
    );
    return { decide, notify, onServerPatch, ...view };
  };

  it('a vendor sends to the PM (the only real choice for a CAS-less list) and the client is not in the list', async () => {
    const { decide, notify } = render_({ data: base, viewer: viewers.vendor, getContent: () => ({ location: 'Terrace' }) });
    const select = screen.getByLabelText('Ask for approval from');
    const labels = [...select.querySelectorAll('option')].map((o) => o.textContent);
    expect(labels).toEqual(['Choose who approves…', 'Priya PM · Project manager', 'Safety Unit · CAS member']);
    fireEvent.change(select, { target: { value: 'CAS-4' } });
    fireEvent.click(screen.getByRole('button', { name: /send for approval/i }));
    await waitFor(() => expect(notify).toHaveBeenCalled());
    expect(decide.mock.calls[0][0]).toMatchObject({
      action: 'submit', approver: { vendorId: 'CAS-4', role: 'cas' }, content: { location: 'Terrace' }, pmName: 'Priya PM',
    });
    expect(notify.mock.calls[0][0]).toMatchObject({ targetUserIds: ['CAS-4'], roles: [] });
  });

  it('a client has only the PM, so the PM is chosen for them', async () => {
    const { decide } = render_({ data: base, viewer: viewers.client });
    expect(screen.getByLabelText('Ask for approval from').value).toBe('PM-9');
    fireEvent.click(screen.getByRole('button', { name: /send for approval/i }));
    await waitFor(() => expect(decide).toHaveBeenCalled());
    expect(decide.mock.calls[0][0].approver).toMatchObject({ vendorId: 'PM-9', role: 'pm' });
  });

  it('a PM is offered vendors, the client and CAS', () => {
    render_({ data: base, viewer: viewers.pm });
    const labels = [...screen.getByLabelText('Ask for approval from').querySelectorAll('option')].map((o) => o.textContent);
    expect(labels.join('|')).toContain('Client');
    expect(labels.join('|')).toContain('Meera Nair · Vendor, Civil');
    expect(labels.join('|')).toContain('Safety Unit · CAS member');
    expect(labels.join('|')).not.toContain('Priya PM');
  });

  it('says so when there is nobody the viewer can ask', () => {
    render_({ data: { ...base, workspaceCollaborators: collaborators.filter((c) => c.isClient || c.vendorId === 'V-1') }, viewer: viewers.vendor });
    expect(screen.getByText(/nobody in this workspace you can ask/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /send for approval/i }).disabled).toBe(true);
  });

  const pending = (originRole, step, extra = {}) => ({
    ...base,
    approvalChain: {
      state: 'pending', kind: 'permit', rev: 1, originRole,
      origin: originRole === 'client' ? { vendorId: 'C-3', name: 'Acme Client' } : { vendorId: 'V-1', name: 'Meera Nair', email: 'meera@vendor.com' },
      submittedAt: '2026-10-10T08:00:00.000Z',
      steps: [{ id: 's1', decision: 'pending', ...step }],
    },
    ...extra,
  });

  it('the PM approves a vendor\'s element and it goes on to the one client', async () => {
    const { decide, notify } = render_({ data: pending('vendor', { role: 'pm', person: { vendorId: 'PM-9', name: 'Priya PM' } }), viewer: viewers.pm, kind: 'permit' });
    expect(screen.getByText(/It will go on to/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /approve and forward/i }));
    await waitFor(() => expect(decide).toHaveBeenCalled());
    expect(decide.mock.calls[0][0]).toMatchObject({ action: 'approve', forwardTo: { vendorId: 'C-3', role: 'client' } });
    // the next person in the chain is told
    await waitFor(() => expect(notify).toHaveBeenCalled());
  });

  it('for a client\'s element the PM must choose which vendor, and cannot skip it', async () => {
    const { decide } = render_({ data: pending('client', { role: 'pm', person: { vendorId: 'PM-9', name: 'Priya PM' } }), viewer: viewers.pm });
    const forward = screen.getByLabelText('Forward to');
    const labels = [...forward.querySelectorAll('option')].map((o) => o.textContent);
    expect(labels).toEqual(['Choose…', 'Meera Nair · Vendor, Civil', 'Ravi Iyer · Vendor', 'Suresh Kumar · Vendor, Electrical']);
    fireEvent.click(screen.getByRole('button', { name: /approve and forward/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/choose which vendor/i);
    expect(decide).not.toHaveBeenCalled();
    fireEvent.change(forward, { target: { value: 'V-2' } });
    fireEvent.click(screen.getByRole('button', { name: /approve and forward/i }));
    await waitFor(() => expect(decide).toHaveBeenCalled());
    expect(decide.mock.calls[0][0].forwardTo).toMatchObject({ vendorId: 'V-2', role: 'vendor' });
  });

  it('with no client in the workspace the PM simply approves', () => {
    render_({
      data: pending('vendor', { role: 'pm', person: { vendorId: 'PM-9', name: 'Priya PM' } }, { workspaceCollaborators: collaborators.filter((c) => !c.isClient) }),
      viewer: viewers.pm,
    });
    expect(screen.getByRole('button', { name: /^approve$/i })).toBeTruthy();
  });

  it('a batch record closes with the PM: nothing is forwarded', () => {
    render_({ kind: 'batch', data: pending('vendor', { role: 'pm', person: { vendorId: 'PM-9', name: 'Priya PM' } }), viewer: viewers.pm });
    expect(screen.getByRole('button', { name: /^approve$/i })).toBeTruthy();
    expect(screen.queryByText(/It will go on to/)).toBeNull();
  });

  it('anyone else, including the client, sees who it is waiting for and has no way to approve', () => {
    const { container } = render_({ data: pending('vendor', { role: 'pm', person: { vendorId: 'PM-9', name: 'Priya PM' } }), viewer: viewers.client });
    expect(container.querySelector('[data-approval-waiting]').textContent).toMatch(/Only Priya PM can approve this step/);
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
  });

  it('sending it back needs a reason and tells the person who sent it', async () => {
    const { decide, notify } = render_({ data: pending('vendor', { role: 'pm', person: { vendorId: 'PM-9', name: 'Priya PM' } }), viewer: viewers.pm });
    fireEvent.click(screen.getByRole('button', { name: /send back/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm send back/i }));
    expect(screen.getByRole('alert').textContent).toMatch(/say why/i);
    expect(decide).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/why is it being sent back/i), { target: { value: 'Harness not checked' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm send back/i }));
    await waitFor(() => expect(decide).toHaveBeenCalled());
    expect(decide.mock.calls[0][0]).toMatchObject({ action: 'reject', note: 'Harness not checked' });
    await waitFor(() => expect(notify).toHaveBeenCalled());
    expect(notify.mock.calls[0][0].targetUserIds).toEqual(['V-1']);
  });

  it('the person who sent it can withdraw it', async () => {
    const { decide } = render_({ data: pending('vendor', { role: 'pm', person: { vendorId: 'PM-9', name: 'Priya PM' } }), viewer: viewers.vendor });
    fireEvent.click(screen.getByRole('button', { name: /withdraw/i }));
    await waitFor(() => expect(decide).toHaveBeenCalled());
    expect(decide.mock.calls[0][0].action).toBe('withdraw');
  });

  it('every stamp is on the element for everyone: the vendor sees the PM\'s and the client\'s', () => {
    const data = {
      ...base,
      approvalChain: {
        state: 'approved', kind: 'permit', rev: 3, originRole: 'vendor', origin: { vendorId: 'V-1', name: 'Meera Nair' }, submittedAt: '2026-10-10T08:00:00.000Z',
        steps: [
          { id: 's1', role: 'pm', person: { vendorId: 'PM-9', name: 'Priya PM' }, decision: 'approved', at: '2026-10-10T08:30:00.000Z', by: { name: 'Priya PM' } },
          { id: 's2', role: 'client', person: { vendorId: 'C-3', name: 'Acme Client' }, decision: 'approved', at: '2026-10-10T09:30:00.000Z', by: { name: 'Acme Client' } },
        ],
      },
    };
    const { container } = render_({ data, viewer: viewers.suresh, editable: false });
    expect(container.querySelectorAll('[data-step-decision="approved"]')).toHaveLength(2);
    expect(screen.getByText('Approved by Client')).toBeTruthy();
    expect(container.querySelector('[data-approval-trail]').textContent).toMatch(/Client \(Client\)/);
    // the client is never named on a stamp everyone can see
    expect(container.querySelector('[data-approval-trail]').textContent).not.toMatch(/Acme/);
  });

  it('only the sender or the PM can reopen an approved element', () => {
    const approved = { ...base, approvalChain: { state: 'approved', kind: 'permit', rev: 2, originRole: 'vendor', origin: { vendorId: 'V-1', name: 'Meera Nair' }, steps: [] } };
    const a = render_({ data: approved, viewer: viewers.vendor });
    expect(screen.getByRole('button', { name: /reopen/i })).toBeTruthy();
    a.unmount();
    const b = render_({ data: approved, viewer: viewers.suresh });
    expect(screen.queryByRole('button', { name: /reopen/i })).toBeNull();
    b.unmount();
    render_({ data: approved, viewer: viewers.pm });
    expect(screen.getByRole('button', { name: /reopen/i })).toBeTruthy();
  });

  it('shows the server\'s refusal and does not change the element', async () => {
    const decide = vi.fn().mockRejectedValue(new Error('A vendor cannot ask a client to approve this directly'));
    const { onServerPatch, notify } = render_({ data: base, viewer: viewers.vendor, decide });
    fireEvent.change(screen.getByLabelText('Ask for approval from'), { target: { value: 'PM-9' } });
    fireEvent.click(screen.getByRole('button', { name: /send for approval/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/cannot ask a client/));
    expect(onServerPatch).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('an artwork approval belongs to its version: a newer version starts afresh', () => {
    const data = {
      ...base,
      approvalChain: { state: 'approved', kind: 'artwork', rev: 2, subject: 'v1', originRole: 'vendor', origin: { vendorId: 'V-1', name: 'Meera' }, steps: [] },
    };
    render_({ kind: 'artwork', data, viewer: viewers.vendor, subject: 'v2' });
    expect(screen.getByText('Not sent for approval')).toBeTruthy();
    expect(screen.getByRole('button', { name: /send for approval/i })).toBeTruthy();
  });
});
