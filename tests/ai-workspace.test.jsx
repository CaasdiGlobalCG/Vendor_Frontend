import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import AiApprovalCard from '../src/components/Header/AiApprovalCard';
import AiPromptPanel from '../src/components/Header/AiPromptPanel';
import { VendorContext } from '../src/context/VendorContext';
afterEach(cleanup);
Element.prototype.scrollIntoView = () => {};
describe('ai workspace', () => {
  it('opens as full window with sidebar, rail, composer', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, data: [] }), ok: true }));
    const onClose = vi.fn();
    render(<VendorContext.Provider value={{ vendorData: { vendorDetails: { firstName: 'Asha' } } }}><AiPromptPanel isOpen onClose={onClose} /></VendorContext.Provider>);
    expect(screen.getByRole('dialog', { name: /CG Assistant workspace/ })).toBeTruthy();
    expect(screen.getByText('New chat')).toBeTruthy();
    expect(screen.getAllByText('Archie').length).toBeGreaterThan(0);
    expect(screen.getByText(/How can I help/)).toBeTruthy();
    fireEvent.click(screen.getByText('Activity'));
    expect(screen.getByText('This conversation')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});


// ── helpers for the streaming tests ──
const sse = (events, split = 7) => {
  // Cut the byte stream at awkward places so lines arrive in pieces, as real networks do.
  const text = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
  const enc = new TextEncoder();
  const chunks = [];
  for (let i = 0; i < text.length; i += split) chunks.push(enc.encode(text.slice(i, i + split)));
  let i = 0;
  return { ok: true, body: { getReader: () => ({ read: async () => (i < chunks.length ? { done: false, value: chunks[i++] } : { done: true }) }) } };
};
const json = (body, ok = true, status = 200) => Promise.resolve({ ok, status, json: () => Promise.resolve(body) });

const mount = () => render(
  <VendorContext.Provider value={{ vendorData: { vendorDetails: { firstName: 'Asha' } } }}>
    <AiPromptPanel isOpen onClose={() => {}} />
  </VendorContext.Provider>
);
const send = (text) => {
  fireEvent.change(screen.getByPlaceholderText(/Type @ to mention/), { target: { value: text } });
  fireEvent.click(screen.getByLabelText('Send message'));
};

describe('ai workspace: streaming and approvals', () => {
  it('reassembles events split across network chunks and shows tokens as text', async () => {
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/chat/stream')) {
        return Promise.resolve(sse([
          { type: 'token', content: 'You have ' },
          { type: 'token', content: '3 overdue invoices.' },
          { type: 'done', conversationId: 'c1', response: 'You have 3 overdue invoices.', suggestions: [], actions: [] },
        ]));
      }
      return json({ success: true, data: [] });
    });
    mount();
    send('overdue invoices?');
    expect(await screen.findByText('You have 3 overdue invoices.')).toBeTruthy();
  });

  it('shows a draft card, and only calls approve when the vendor presses the button', async () => {
    const draft = { type: 'APPROVAL_REQUIRED', id: 'A1', kind: 'email', summary: 'Send an email to a@b.co', details: { To: 'a@b.co', Subject: 'Hello', Message: 'Hi there' }, expiresAt: Date.now() + 20 * 60000 };
    global.fetch = vi.fn((url, opts) => {
      if (String(url).includes('/chat/stream')) {
        return Promise.resolve(sse([
          { type: 'token', content: 'Draft ready.' },
          { type: 'done', conversationId: 'c1', response: 'Draft ready.', suggestions: [], actions: [draft] },
        ]));
      }
      if (String(url).includes('/actions/A1/approve')) return json({ success: true, data: { actions: [{ type: 'EMAIL_SENT', to: 'a@b.co', subject: 'Hello' }] } });
      return json({ success: true, data: [] });
    });
    mount();
    send('email a@b.co hello');
    const card = await screen.findByRole('group', { name: /Draft awaiting approval/ });
    expect(card.textContent).toContain('a@b.co');
    const approveCalls = () => global.fetch.mock.calls.filter(([u]) => String(u).includes('/approve')).length;
    expect(approveCalls()).toBe(0); // nothing is sent just because the draft exists
    fireEvent.click(screen.getByText('Approve & send'));
    await waitFor(() => expect(screen.getByText('Approved and done')).toBeTruthy());
    expect(approveCalls()).toBe(1);
  });

  it('shows the server message when a limit is hit and keeps no empty bubble', async () => {
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/chat/stream')) return json({ success: false, message: "You've reached today's limit of 300 assistant messages." }, false, 429);
      return json({ success: true, data: [] });
    });
    mount();
    send('hello there friend');
    expect(await screen.findByText(/reached today's limit/)).toBeTruthy();
  });

  it('drops text spoken before a tool call (reset) and shows the final answer', async () => {
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/chat/stream')) {
        return Promise.resolve(sse([
          { type: 'token', content: 'Let me check' },
          { type: 'reset' },
          { type: 'token', content: 'You have 2 leads.' },
          { type: 'done', conversationId: 'c1', response: 'You have 2 leads.', suggestions: [], actions: [] },
        ]));
      }
      return json({ success: true, data: [] });
    });
    mount();
    send('how many leads do i have');
    expect(await screen.findByText('You have 2 leads.')).toBeTruthy();
    expect(screen.queryByText(/Let me check/)).toBeNull();
  });
});

describe('approval card states', () => {
  const base = { id: 'X', kind: 'task', summary: 'Create task "Pour slab"', details: { Task: 'Pour slab' }, expiresAt: Date.now() + 600000 };
  it('offers Approve and Discard while pending', () => {
    const onApprove = vi.fn(); const onDiscard = vi.fn();
    render(<AiApprovalCard approval={base} onApprove={onApprove} onDiscard={onDiscard} />);
    fireEvent.click(screen.getByText('Approve & create'));
    fireEvent.click(screen.getByText('Discard'));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
  it('has no buttons once done, discarded or failed, and shows the failure reason', () => {
    for (const state of ['done', 'discarded']) {
      cleanup();
      render(<AiApprovalCard approval={{ ...base, state }} onApprove={() => {}} onDiscard={() => {}} />);
      expect(screen.queryByText('Discard')).toBeNull();
    }
    cleanup();
    render(<AiApprovalCard approval={{ ...base, state: 'failed', error: 'SES said no' }} onApprove={() => {}} onDiscard={() => {}} />);
    expect(screen.getByText('SES said no')).toBeTruthy();
    expect(screen.queryByText('Approve & create')).toBeNull();
  });
  it('treats a draft past its expiry as expired', () => {
    render(<AiApprovalCard approval={{ ...base, expiresAt: Date.now() - 1000 }} onApprove={() => {}} onDiscard={() => {}} />);
    expect(screen.getByText(/Expired/)).toBeTruthy();
    expect(screen.queryByText('Approve & create')).toBeNull();
  });
});

describe('ai workspace: saved pins and restored drafts', () => {
  const routeFetch = (routes) => vi.fn((url, opts = {}) => {
    const u = String(url);
    for (const [match, handler] of routes) {
      if (u.includes(match)) return handler(u, opts);
    }
    return json({ success: true, data: [] });
  });

  it('shows pins saved on the account', async () => {
    global.fetch = routeFetch([['/api/ai/pins', () => json({ success: true, data: [{ id: 'p1', text: 'Saved answer', timestamp: new Date().toISOString(), conversationId: 'c9' }] })]]);
    mount();
    fireEvent.click(screen.getByText('Activity'));
    await waitFor(() => expect(screen.getByText('Pinned').previousSibling.textContent).toBe('1'));
  });

  it('moves pins that were only in this browser into the account, once', async () => {
    localStorage.setItem('ai_pinned_messages', JSON.stringify([{ id: 5, text: 'Old local pin', timestamp: 't' }]));
    global.fetch = routeFetch([['/api/ai/pins/import', (u, o) => json({ success: true, data: [{ id: 'srv1', text: JSON.parse(o.body).pins[0].text, timestamp: 't' }] })]]);
    mount();
    await waitFor(() => expect(localStorage.getItem('ai_pinned_messages')).toBeNull());
    const importCall = global.fetch.mock.calls.find(([u]) => String(u).includes('/pins/import'));
    expect(JSON.parse(importCall[1].body).pins[0].text).toBe('Old local pin');
  });

  it('reopens a draft that was waiting when the conversation is opened again', async () => {
    const draft = { id: 'D1', kind: 'email', summary: 'Send an email to a@b.co', details: { To: 'a@b.co' }, expiresAt: Date.now() + 15 * 60000, state: 'pending' };
    global.fetch = routeFetch([
      ['/api/ai/conversations/c1', () => json({ success: true, data: { title: 'Mail', messages: [
        { id: 'm1', role: 'user', content: 'email a@b.co', timestamp: 't1' },
        { id: 'm2', role: 'assistant', content: 'Draft ready.', timestamp: 't2', approvalIds: ['D1', 'GONE'] },
      ] } })],
      ['/api/ai/conversations', () => json({ success: true, data: [{ conversationId: 'c1', title: 'Mail', messageCount: 2, metadata: { updatedAt: new Date().toISOString() } }] })],
      ['/api/ai/actions?ids=', () => json({ success: true, data: [draft] })],
    ]);
    mount();
    fireEvent.click(await screen.findByText('Mail'));
    expect(await screen.findByText('Approve & send')).toBeTruthy(); // the live draft is actionable again
    expect(await screen.findAllByText(/Expired/)).toBeTruthy();     // the one that is gone says so, with no buttons
    expect(screen.getAllByText('Discard').length).toBe(1);
  });
});

describe('ai workspace: insights', () => {
  const alerts = [
    { id: 'a1', type: 'overdue_invoice', severity: 'critical', title: 'Invoice INV-204 is 12 days overdue', message: 'Sharma — ₹2,45,000', suggestion: 'Draft a reminder?' },
    { id: 'a2', type: 'stale_lead', severity: 'warning', title: 'Lead "Coffee Shop" pending for 30 days', message: 'Project: coffee', suggestion: 'Help me respond' },
  ];
  const withAlerts = () => { global.fetch = vi.fn((url) => json({ success: true, data: String(url).includes('/api/ai/alerts') && !String(url).includes('dismiss') ? alerts : [] })); };

  it('shows one slim banner with counts instead of a long list', async () => {
    withAlerts();
    mount();
    expect(await screen.findByText('2 insights')).toBeTruthy();
    expect(screen.getByText('1 urgent')).toBeTruthy();
    expect(screen.queryByText('Invoice INV-204 is 12 days overdue')).toBeNull(); // not dumped into the conversation
  });

  it('lists insights grouped by severity in the side panel, and dismisses one', async () => {
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    withAlerts();
    mount();
    fireEvent.click(await screen.findByText('View'));
    expect(await screen.findByText('Invoice INV-204 is 12 days overdue')).toBeTruthy();
    expect(screen.getByText('Urgent', { selector: 'h4' })).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Dismiss: Invoice INV-204/));
    await waitFor(() => expect(screen.queryByText('Invoice INV-204 is 12 days overdue')).toBeNull());
    expect(global.fetch.mock.calls.some(([u]) => String(u).includes('/alerts/dismiss'))).toBe(true);
  });

  it('on narrow screens the list opens under the banner', async () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    withAlerts();
    mount();
    fireEvent.click(await screen.findByText('View'));
    expect(await screen.findByText('Lead "Coffee Shop" pending for 30 days')).toBeTruthy();
    fireEvent.click(screen.getByText('Hide'));
    await waitFor(() => expect(screen.queryByText('Lead "Coffee Shop" pending for 30 days')).toBeNull());
  });
});

describe('ai workspace: Archie (workspace builder) intake', () => {
  const leads = [
    { leadId: 'L1', title: 'Flat 4B Interiors', projectName: 'Flat 4B', clientName: 'Sharma', budget: '₹18,00,000', timeline: '45 days', specialization: 'Interiors', acceptedAt: '2026-09-20T00:00:00Z', workspaceId: 'W1', workspaceTitle: 'Flat 4B – Collaborative' },
    { leadId: 'L2', title: 'Cafe Build', budget: '5-10 Lakhs', acceptedAt: '2026-09-10T00:00:00Z' },
  ];
  const routes = (leadResponse) => vi.fn((url) => (String(url).includes('/agents/archie/leads') ? leadResponse() : json({ success: true, data: [] })));
  const openArchie = async () => {
    mount();
    fireEvent.click(screen.getAllByRole('button', { name: /Archie/ })[0]);
    return screen.findByTestId('archie-builder');
  };

  it('lights the window up in Archie\'s colour and shows the accepted leads', async () => {
    global.fetch = routes(() => json({ success: true, data: leads }));
    await openArchie();
    expect(screen.getByRole('dialog').className).toContain('agent-archie');
    expect(await screen.findByText('Flat 4B Interiors')).toBeTruthy();
    expect(screen.getAllByText(/Accepted by PM/).length).toBe(2);
    expect(screen.getAllByText(/Collaborative access granted/).length).toBe(2);
    expect(screen.getByText('5-10 Lakhs')).toBeTruthy(); // free-text budget shown as written
    expect(screen.getByText('Continue').closest('button').disabled).toBe(true); // choose a lead first
  });

  it('asks for the project in the same message box as the assistant prompt, and only asks the server once the description is long enough', async () => {
    global.fetch = routes(() => json({ success: true, data: leads }));
    await openArchie();
    fireEvent.click(await screen.findByRole('radio', { name: /Flat 4B Interiors/ }));
    fireEvent.click(screen.getByText('Continue'));

    // a chat-style message box (not a form): one textarea, send button, voice, Enter hint
    const box = screen.getByLabelText('Describe the project');
    expect(box.tagName).toBe('TEXTAREA');
    expect(box.rows).toBe(2);
    expect(screen.getByLabelText('Send description')).toBeTruthy();
    expect(screen.getByText(/Enter to send/)).toBeTruthy();
    expect(screen.queryByLabelText(/Project type/)).toBeNull();
    expect(screen.queryByLabelText(/Budget/)).toBeNull();
    expect(screen.getAllByText('Flat 4B Interiors').length).toBeGreaterThan(0); // the chosen lead stays in view

    fireEvent.change(box, { target: { value: 'too short' } });
    fireEvent.click(screen.getByLabelText('Send description'));
    expect(screen.getByRole('alert').textContent).toMatch(/couple of sentences/); // blocked, nothing sent
    const planCalls = () => global.fetch.mock.calls.filter(([u]) => String(u).includes('/agents/archie/plan'));
    expect(planCalls().length).toBe(0);

    fireEvent.change(box, { target: { value: "3BHK in Pune, about 1,450 sq ft. Full interior with modular kitchen, wardrobes and false ceiling. 45 days, around 18 lakhs." } });
    fireEvent.keyDown(box, { key: 'Enter' }); // Enter sends, like the main prompt
    await waitFor(() => expect(planCalls().length).toBe(1));
    expect(JSON.parse(planCalls()[0][1].body).brief).toMatch(/3BHK in Pune/);
    // nothing else was written
    const writes = global.fetch.mock.calls.filter(([u, o]) => o && o.method && o.method !== 'GET' && !String(u).includes('/agents/archie/plan'));
    expect(writes).toEqual([]);
  });

  it('Shift+Enter does not send, and what was typed is kept when changing the lead', async () => {
    global.fetch = routes(() => json({ success: true, data: leads }));
    await openArchie();
    fireEvent.click(await screen.findByRole('radio', { name: /Cafe Build/ }));
    fireEvent.click(screen.getByText('Continue'));
    const box = screen.getByLabelText('Describe the project');
    fireEvent.change(box, { target: { value: 'A small cafe fit-out, about 600 sq ft, 30 days.' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(screen.queryByText("Here's what I have")).toBeNull();
    fireEvent.click(screen.getByText('Change lead'));
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByLabelText('Describe the project').value).toBe('A small cafe fit-out, about 600 sq ft, 30 days.');
  });

  it('explains when no lead is ready, and can retry after an error', async () => {
    let call = 0;
    global.fetch = routes(() => (++call === 1 ? json({ success: false, message: 'Boom' }, false, 500) : json({ success: true, data: [] })));
    await openArchie();
    expect(await screen.findByText("Couldn't load your leads")).toBeTruthy();
    fireEvent.click(screen.getByText('Try again'));
    expect(await screen.findByText('No leads are ready yet')).toBeTruthy();
  });

  it('Esc leaves Archie first and only the next Esc closes the window', async () => {
    global.fetch = routes(() => json({ success: true, data: leads }));
    const onClose = vi.fn();
    render(<VendorContext.Provider value={{ vendorData: {} }}><AiPromptPanel isOpen onClose={onClose} /></VendorContext.Provider>);
    fireEvent.click(screen.getAllByRole('button', { name: /Archie/ })[0]);
    await screen.findByTestId('archie-builder');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('archie-builder')).toBeNull();
    expect(screen.getByRole('dialog').className).not.toContain('agent-archie');
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ai workspace: chat history', () => {
  const when = new Date().toISOString();

  it('a new chat shows up in the history straight away, without reopening the window', async () => {
    let saved = false;
    global.fetch = vi.fn((url, opts = {}) => {
      const u = String(url);
      if (u.includes('/chat/stream')) {
        saved = true;
        return Promise.resolve(sse([{ type: 'token', content: 'You have 3 tasks.' }, { type: 'done', conversationId: 'c-new', response: 'You have 3 tasks.', suggestions: [], actions: [] }]));
      }
      if (u.endsWith('/api/ai/conversations')) {
        return json({ success: true, data: saved ? [{ conversationId: 'c-new', title: 'Pending tasks overview', messageCount: 2, agent: null, metadata: { updatedAt: when } }] : [] });
      }
      return json({ success: true, data: [] });
    });
    mount();
    await waitFor(() => expect(screen.getByText('No conversations yet')).toBeTruthy());
    send('How many pending tasks do I have?');
    expect(await screen.findByText('You have 3 tasks.')).toBeTruthy();
    // appears at once (optimistic), then with the server's title
    await waitFor(() => expect(screen.getAllByText(/pending tasks/i).length).toBeGreaterThan(0));
    expect(screen.queryByText('No conversations yet')).toBeNull();
  });

  it('says so when the history cannot be loaded, instead of pretending there are no chats', async () => {
    global.fetch = vi.fn((url) => (String(url).endsWith('/api/ai/conversations') ? json({ success: false, message: 'boom' }, false, 500) : json({ success: true, data: [] })));
    mount();
    expect(await screen.findByText("Couldn't load your chats")).toBeTruthy();
    expect(screen.queryByText('No conversations yet')).toBeNull();
  });

  it('lists Archie sessions with the other chats and reopens one on its plan', async () => {
    const plan = { status: 'ready', summary: 'Two phases.', project: { durationDays: 30 }, tasks: [{ name: 'Design approval', description: '', priority: 'high', offsetDays: 0, durationDays: 7, subtasks: [{ name: 'Drawings', description: '', elements: [], links: [] }] }] };
    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/api/ai/conversations/ARCH-1')) {
        return json({ success: true, data: { conversationId: 'ARCH-1', title: 'Archie · Flat 4B Interiors', agent: 'archie', archieLeadId: 'L1', archiePlan: plan, archieWarnings: [], archieWorkspace: { workspaceId: 'W1', title: 'WS', existingTasks: 0 }, archieStartDate: '2026-11-03', archieBrief: '3BHK flat', messages: [{ role: 'user', content: '3BHK flat' }, { role: 'assistant', content: 'Two phases.' }] } });
      }
      if (u.endsWith('/api/ai/conversations')) {
        return json({ success: true, data: [
          { conversationId: 'ARCH-1', title: 'Archie · Flat 4B Interiors', agent: 'archie', messageCount: 2, metadata: { updatedAt: when } },
          { conversationId: 'c1', title: 'Finance summary', agent: null, messageCount: 4, metadata: { updatedAt: when } },
        ] });
      }
      if (u.includes('/agents/archie/leads')) return json({ success: true, data: [{ leadId: 'L1', title: 'Flat 4B Interiors', workspaceId: 'W1', workspaceTitle: 'WS', acceptedAt: when }] });
      return json({ success: true, data: [] });
    });
    mount();
    expect(await screen.findByText('Finance summary')).toBeTruthy();
    fireEvent.click(await screen.findByText('Archie · Flat 4B Interiors'));
    const preview = await screen.findByTestId('archie-preview');
    expect(within(preview).getByText('Design approval')).toBeTruthy();
    expect(screen.getByRole('dialog').className).toContain('agent-archie');
  });
});

