import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import TodayWindow from '../src/components/Today/TodayWindow';
import { CrossAppButtons } from '../src/components/vendor-header/CrossAppButtons';

afterEach(cleanup);

const data = (over = {}) => ({
  date: '2026-10-10',
  summary: { overdueTasks: 1, tasksToday: 1, tasksUpcoming: 1, overduePayments: 1, overdueAmount: 100000, paymentsSoon: 1, dueSoonAmount: 50000, leadsWaitingOnYou: 1, leadsWaitingOnPm: 1 },
  tasks: {
    overdue: [{ taskId: 't1', name: 'Pour slab', workspaceId: 'W1', workspaceTitle: 'Flat 4B', daysLeft: -2, dueDate: '2026-10-08' }],
    today: [{ taskId: 't2', name: 'Order tiles', workspaceId: 'W1', workspaceTitle: 'Flat 4B', daysLeft: 0, dueDate: '2026-10-10' }],
    upcoming: [{ taskId: 't3', name: 'Snag list', workspaceId: 'W2', workspaceTitle: 'Cafe', daysLeft: 5, dueDate: '2026-10-15' }],
  },
  payments: {
    overdue: [{ invoiceId: 'i1', number: 'INV-1', customer: 'Sharma', total: 100000, dueDate: '2026-10-01', daysLeft: -9, workspaceId: 'W1' }],
    dueSoon: [{ invoiceId: 'i2', number: 'INV-2', customer: 'Acme', total: 50000, dueDate: '2026-10-14', daysLeft: 4, workspaceId: null }],
  },
  waiting: { onYou: [{ leadId: 'L1', title: 'Cafe fit-out', waitingDays: 9 }], onPm: [{ leadId: 'L2', title: 'Flat 4B', waitingDays: 2 }] },
  suggestions: [
    { id: 'overdue-payments', kind: 'payments', title: '1 invoice is overdue (₹1,00,000)', detail: 'Send a reminder.', prompt: 'Draft reminders' },
    { id: 'lead-waiting', kind: 'leads', title: '1 lead is waiting for your answer', detail: '“Cafe fit-out” has been waiting 9 days.', href: '/leads/L1' },
  ],
  meetings: { available: false },
  partial: [],
  ...over,
});

const respond = (body, ok = true, status = 200) => vi.fn(() => Promise.resolve({ ok, status, json: () => Promise.resolve(body) }));

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

const mount = (props = {}) => render(
  <MemoryRouter initialEntries={['/VendorDashboard']}>
    <Routes>
      <Route path="*" element={<><Where /><TodayWindow isOpen onClose={vi.fn()} onAsk={vi.fn()} {...props} /></>} />
    </Routes>
  </MemoryRouter>
);

describe('Today window', () => {
  it('shows what needs attention, grouped, with the numbers up top', async () => {
    global.fetch = respond({ success: true, data: data() });
    mount();
    expect(await screen.findByText('Pour slab')).toBeTruthy();
    expect(screen.getByText('2 days overdue')).toBeTruthy();
    expect(screen.getByText('Order tiles').closest('button').textContent).toMatch(/Today$/); // badge for the task due today
    expect(screen.getByText('In 5 days')).toBeTruthy();
    expect(screen.getByText('INV-1 · ₹1,00,000')).toBeTruthy();
    expect(screen.getByText('Cafe fit-out')).toBeTruthy();
    expect(screen.getByText("Waiting for the PM's decision")).toBeTruthy();
    expect(screen.getByText(/1 invoice is overdue/)).toBeTruthy();
    expect(screen.getByText(/No calendar is connected yet/)).toBeTruthy(); // meetings are honest about not being available
    // asked for the vendor's own date
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/api\/ai\/today\?date=\d{4}-\d{2}-\d{2}$/);
  });

  it('opens the thing a row is about, and closes the window', async () => {
    global.fetch = respond({ success: true, data: data() });
    const onClose = vi.fn();
    mount({ onClose });
    fireEvent.click(await screen.findByText('Pour slab'));
    expect(screen.getByTestId('where').textContent).toBe('/VendorDashboard/workspace/W1');
    expect(onClose).toHaveBeenCalled();
  });

  it('opens a lead from the suggestions', async () => {
    global.fetch = respond({ success: true, data: data() });
    mount();
    const suggestions = await screen.findByLabelText('Suggested next actions');
    fireEvent.click(within(suggestions).getAllByText('Open')[0]);
    expect(screen.getByTestId('where').textContent).toBe('/leads/L1');
  });

  it('hands a ready-made question to the assistant', async () => {
    global.fetch = respond({ success: true, data: data() });
    const onAsk = vi.fn();
    mount({ onAsk });
    fireEvent.click(await screen.findByText('Ask assistant'));
    expect(onAsk).toHaveBeenCalledWith('Draft reminders');
    fireEvent.click(screen.getAllByText('Remind')[0]);
    expect(onAsk.mock.calls[1][0]).toMatch(/payment reminder for invoice INV-1 to Sharma/);
  });

  it('says so when part of it could not be loaded, rather than showing a false "nothing due"', async () => {
    global.fetch = respond({ success: true, data: data({ partial: ['payments'] }) });
    mount();
    expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringMatching(/Couldn't load: payments/));
  });

  it('shows an all-clear when nothing needs attention', async () => {
    const empty = data({
      summary: { overdueTasks: 0, tasksToday: 0, tasksUpcoming: 0, overduePayments: 0, overdueAmount: 0, paymentsSoon: 0, dueSoonAmount: 0, leadsWaitingOnYou: 0, leadsWaitingOnPm: 0 },
      tasks: { overdue: [], today: [], upcoming: [] }, payments: { overdue: [], dueSoon: [] }, waiting: { onYou: [], onPm: [] }, suggestions: [],
    });
    global.fetch = respond({ success: true, data: empty });
    mount();
    expect(await screen.findByText("You're all caught up")).toBeTruthy();
  });

  it('shows an error with a retry, and recovers', async () => {
    let calls = 0;
    global.fetch = vi.fn(() => {
      calls += 1;
      return calls === 1
        ? Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ success: false, message: 'Could not load your day right now' }) })
        : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, data: data() }) });
    });
    mount();
    expect(await screen.findByText(/Could not load your day right now/)).toBeTruthy();
    fireEvent.click(screen.getByText('Try again'));
    expect(await screen.findByText('Pour slab')).toBeTruthy();
  });

  it('Esc closes it', async () => {
    global.fetch = respond({ success: true, data: data() });
    const onClose = vi.fn();
    mount({ onClose });
    await screen.findByText('Pour slab');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('header: Today button beside Prompt', () => {
  it('shows a Today button next to Prompt and calls its handler', () => {
    const onToday = vi.fn();
    const onPrompt = vi.fn();
    render(<CrossAppButtons show canAccessSales onToday={onToday} onPrompt={onPrompt} />);
    const buttons = screen.getAllByRole('button').map((b) => b.getAttribute('title'));
    expect(buttons.indexOf('Today')).toBe(buttons.indexOf('Prompt') - 1); // immediately beside it
    fireEvent.click(screen.getByTitle('Today'));
    expect(onToday).toHaveBeenCalledTimes(1);
    expect(onPrompt).not.toHaveBeenCalled();
  });

  it('shows no Today button when nothing handles it (other headers are unchanged)', () => {
    render(<CrossAppButtons show onPrompt={() => {}} />);
    expect(screen.queryByTitle('Today')).toBeNull();
  });
});
