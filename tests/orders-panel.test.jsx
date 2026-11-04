/**
 * The vendor's Orders view: what they see, what they are asked to do, and
 * that nothing they send can be wider than what the screen offered.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

vi.mock('../src/utils/workspaceOrdersApi.js', () => ({
  listOrders: vi.fn(),
  getOrder: vi.fn(),
  postOrderEvent: vi.fn(),
  createOrderPayment: vi.fn(),
  verifyOrderPayment: vi.fn(),
  fetchDocumentFile: vi.fn(),
}));
vi.mock('../src/components/Orders/razorpay.js', () => ({ loadRazorpay: vi.fn(async () => true) }));

import {
  listOrders, getOrder, postOrderEvent, createOrderPayment, verifyOrderPayment, fetchDocumentFile,
} from '../src/utils/workspaceOrdersApi.js';
import OrdersPanel from '../src/components/Orders/OrdersPanel.jsx';
import {
  nextStepText, phaseIndex, stageTone, timelineText, visibleActions, waitingText, needsPayment,
} from '../src/components/Orders/orderUi.js';

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

const row = (over = {}) => ({
  orderId: 'ORD-1', channel: 'rfq', workspaceId: 'ws-1', workspaceTitle: 'Tower A fit-out',
  itemsSummary: 'TMT bar 12mm', itemCount: 1, stage: 'quote_ready', stageLabel: 'Quote ready for you', phase: 'quote',
  waitingOn: 'vendor', needsAction: true, total: 118000, paid: 0, balance: 118000,
  updatedAt: '2026-10-12T10:00:00.000Z', createdAt: '2026-10-12T09:00:00.000Z', ...over,
});
const detail = (over = {}) => ({
  ...row(), items: [{ name: 'TMT bar 12mm', quantity: 40, unit: 'tonne' }], paymentTerms: '50% advance',
  payments: [], documents: [{ kind: 'quotation', id: 'Q-1', at: '2026-10-12T10:00:00.000Z' }], issues: [],
  timeline: [
    { id: 'e1', at: '2026-10-12T09:00:00.000Z', type: 'rfq_submitted', stage: 'requested', by: { role: 'vendor', name: 'Meera Nair' }, note: '', data: {} },
    { id: 'e2', at: '2026-10-12T10:00:00.000Z', type: 'added_to_workspace', stage: 'quote_ready', by: { role: 'pm', name: 'Project manager' }, note: '', data: {} },
  ],
  actions: ['vendor_approved', 'vendor_changes_requested', 'vendor_rejected', 'cancelled'],
  ...over,
});

const open = async (orders = [row()], d = detail()) => {
  listOrders.mockResolvedValue({ orders, counts: { total: orders.length, needsAction: orders.filter((o) => o.needsAction).length } });
  getOrder.mockResolvedValue({ order: d, viewerRole: 'vendor' });
  const utils = render(<OrdersPanel onOpenWorkspace={vi.fn()} />);
  await screen.findByText(orders[0].itemsSummary);
  return utils;
};

describe('the list', () => {
  it('shows each order with its project, kind and where it stands', async () => {
    await open();
    expect(screen.getByText('TMT bar 12mm')).toBeTruthy();
    expect(screen.getByText(/Quote request · Tower A fit-out/)).toBeTruthy();
    expect(screen.getByText('Quote ready for you')).toBeTruthy();
    expect(screen.getByLabelText('Needs your attention')).toBeTruthy();
  });

  it('says so plainly when there are no orders', async () => {
    listOrders.mockResolvedValue({ orders: [], counts: { total: 0, needsAction: 0 } });
    render(<OrdersPanel />);
    expect(await screen.findByText('No orders yet')).toBeTruthy();
  });

  it('shows the failure with a way to try again, not an empty list', async () => {
    listOrders.mockRejectedValueOnce(new Error('Could not reach the server'));
    render(<OrdersPanel />);
    expect(await screen.findByText('Could not reach the server')).toBeTruthy();
    listOrders.mockResolvedValueOnce({ orders: [row()], counts: { total: 1, needsAction: 1 } });
    fireEvent.click(screen.getByText('Try again'));
    expect(await screen.findByText('TMT bar 12mm')).toBeTruthy();
  });

  it('filters to what needs the vendor, and by kind', async () => {
    const orders = [
      row({ orderId: 'A', itemsSummary: 'Cement', channel: 'rfq', needsAction: false, stage: 'ordered', stageLabel: 'Ordered', waitingOn: 'procurement' }),
      row({ orderId: 'B', itemsSummary: 'Tiles', channel: 'direct', needsAction: true }),
    ];
    await open(orders);
    expect(screen.getByText('Cement')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /Needs you/ }));
    expect(screen.queryByText('Cement')).toBeNull();
    expect(screen.getByText('Tiles')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Quote requests' }));
    expect(screen.getByText('Cement')).toBeTruthy();
    expect(screen.queryByText('Tiles')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Direct orders' }));
    expect(screen.getByText('Tiles')).toBeTruthy();
    expect(screen.queryByText('Cement')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('Search orders'), { target: { value: 'zzz' } });
    expect(screen.getByText('No orders match this view.')).toBeTruthy();
  });

  it('searches by item, order number or project', async () => {
    await open([row({ orderId: 'A', itemsSummary: 'Cement' }), row({ orderId: 'B', itemsSummary: 'Tiles', workspaceTitle: 'Villa 9' })]);
    fireEvent.change(screen.getByPlaceholderText('Search orders'), { target: { value: 'villa' } });
    expect(screen.queryByText('Cement')).toBeNull();
    expect(screen.getByText('Tiles')).toBeTruthy();
  });

  it('asks for the project the vendor is in when opened from a workspace', async () => {
    listOrders.mockResolvedValue({ orders: [], counts: { total: 0, needsAction: 0 } });
    render(<OrdersPanel workspaceId="ws-9" />);
    await waitFor(() => expect(listOrders).toHaveBeenCalledWith({ workspaceId: 'ws-9' }));
  });
});

describe('one order', () => {
  const choose = async () => {
    fireEvent.click(screen.getByText('TMT bar 12mm'));
    return screen.findByLabelText('Order ORD-1');
  };

  it('tells the vendor what is needed and shows the money plainly', async () => {
    await open();
    const article = await choose();
    expect(within(article).getByText(/Your quotation is ready/)).toBeTruthy();
    expect(within(article).getAllByText('₹1,18,000').length).toBeGreaterThanOrEqual(2); // total and balance
    expect(within(article).getByText('Payment terms: 50% advance')).toBeTruthy();
  });

  it('never shows commission or supplier cost, because it is never given them', async () => {
    await open();
    const article = await choose();
    expect(article.textContent).not.toMatch(/commission|supplier cost/i);
  });

  it('approving asks for confirmation first, then sends exactly that action', async () => {
    postOrderEvent.mockResolvedValue({ order: detail({ stage: 'payment_due', stageLabel: 'Payment due', needsAction: true, actions: [] }) });
    await open();
    const article = await choose();
    fireEvent.click(within(article).getByRole('button', { name: 'Approve quotation' }));
    expect(postOrderEvent).not.toHaveBeenCalled();
    fireEvent.click(within(article).getByRole('button', { name: 'Yes, continue' }));
    await waitFor(() => expect(postOrderEvent).toHaveBeenCalledWith('ORD-1', { type: 'vendor_approved', note: '', data: undefined }));
    expect(await screen.findByText('Payment due', { selector: 'span' })).toBeTruthy();
  });

  it('asking for changes needs a reason before it can be sent', async () => {
    postOrderEvent.mockResolvedValue({ order: detail({ stage: 'changes_requested', stageLabel: 'Changes requested', needsAction: false, actions: [] }) });
    await open();
    const article = await choose();
    fireEvent.click(within(article).getByRole('button', { name: 'Request changes' }));
    const send = within(article).getByRole('button', { name: 'Send request' });
    expect(send.disabled).toBe(true);
    fireEvent.change(within(article).getByPlaceholderText(/30 tonnes/), { target: { value: 'Need 30 tonnes' } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);
    await waitFor(() => expect(postOrderEvent).toHaveBeenCalledWith('ORD-1', { type: 'vendor_changes_requested', note: 'Need 30 tonnes', data: undefined }));
  });

  it('your own PO needs a number; the system PO needs nothing more', async () => {
    postOrderEvent.mockResolvedValue({ order: detail({ stage: 'po_with_pm', stageLabel: 'Purchase order with PM', needsAction: false, actions: [] }) });
    await open([row({ stage: 'paid' })], detail({ stage: 'paid', stageLabel: 'Paid, purchase order needed', actions: ['po_submitted', 'cancelled'] }));
    const article = await choose();
    fireEvent.click(within(article).getByRole('button', { name: 'Provide purchase order' }));
    fireEvent.click(within(article).getByLabelText(/I have my own purchase order/));
    const send = within(article).getByRole('button', { name: 'Send' });
    expect(send.disabled).toBe(true);
    fireEvent.change(within(article).getByLabelText('PO number'), { target: { value: 'PO-77' } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);
    await waitFor(() => expect(postOrderEvent).toHaveBeenCalledWith('ORD-1', {
      type: 'po_submitted', note: undefined, data: { poType: 'own', poNumber: 'PO-77', poUrl: '' },
    }));
  });

  it('a refused action shows the server\'s reason and keeps the order as it was', async () => {
    postOrderEvent.mockRejectedValue(Object.assign(new Error('That step is not available'), { code: 'STAGE' }));
    await open();
    const article = await choose();
    fireEvent.click(within(article).getByRole('button', { name: 'Decline' }));
    fireEvent.click(within(article).getByRole('button', { name: 'Yes, continue' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('That step is not available')).toBeTruthy();
    expect(within(article).getByRole('button', { name: 'Approve quotation' })).toBeTruthy();
  });

  it('a stale update asks the vendor to try again and reloads the order', async () => {
    postOrderEvent.mockRejectedValue(Object.assign(new Error('x'), { code: 'STALE' }));
    await open();
    const article = await choose();
    fireEvent.click(within(article).getByRole('button', { name: 'Approve quotation' }));
    fireEvent.click(within(article).getByRole('button', { name: 'Yes, continue' }));
    expect(await screen.findByText(/just updated/)).toBeTruthy();
    await waitFor(() => expect(getOrder.mock.calls.length).toBeGreaterThan(1));
  });

  it('a closed order offers nothing to do', async () => {
    await open([row({ stage: 'closed', stageLabel: 'Closed', needsAction: false, waitingOn: null })], detail({ stage: 'closed', stageLabel: 'Closed', needsAction: false, actions: [] }));
    const article = await choose();
    expect(within(article).queryByText('What you can do')).toBeNull();
    expect(within(article).getByText('Completed')).toBeTruthy();
  });

  it('the history reads newest first, in plain words', async () => {
    await open();
    const article = await choose();
    const items = within(within(article).getByLabelText('History')).getAllByRole('listitem');
    expect(items[0].textContent).toMatch(/quotation was shared with you/);
    expect(items[1].textContent).toMatch(/You asked for a quote/);
  });

  it('shows what is due and pays it: the amount and signature come from the server', async () => {
    const dueOrder = detail({ stage: 'payment_due', stageLabel: 'Payment due', actions: [], dueNow: 59000, needsAction: true });
    createOrderPayment.mockResolvedValue({ data: { orderId: 'order_9', keyId: 'rz', amount: 5900000, currency: 'INR', dueNow: 59000, kind: 'advance' } });
    verifyOrderPayment.mockResolvedValue({ order: detail({ stage: 'paid', stageLabel: 'Paid, purchase order needed', paid: 59000, balance: 59000, dueNow: 0, needsAction: true, actions: ['po_submitted'] }) });
    const opened = [];
    window.Razorpay = function Razorpay(opts) {
      this.open = () => { opened.push(opts); opts.handler({ razorpay_order_id: 'order_9', razorpay_payment_id: 'pay_9', razorpay_signature: 'sig' }); };
    };
    await open([row({ stage: 'payment_due', stageLabel: 'Payment due' })], dueOrder);
    const article = await choose();
    fireEvent.click(within(article).getByRole('button', { name: /Pay ₹59,000 now/ }));
    await waitFor(() => expect(verifyOrderPayment).toHaveBeenCalledWith('ORD-1', { razorpay_order_id: 'order_9', razorpay_payment_id: 'pay_9', razorpay_signature: 'sig' }));
    expect(createOrderPayment).toHaveBeenCalledWith('ORD-1');
    expect(opened[0].amount).toBe(5900000);
    expect(opened[0].order_id).toBe('order_9');
    expect(await screen.findByText('Paid, purchase order needed', { selector: 'span' })).toBeTruthy();
    delete window.Razorpay;
  });

  it('no pay button when nothing is due', async () => {
    await open();
    const article = await choose();
    expect(within(article).queryByRole('button', { name: /Pay ₹/ })).toBeNull();
  });

  it('a payment that cannot start says why', async () => {
    createOrderPayment.mockRejectedValue(new Error('Online payment is not set up on the server yet'));
    await open([row({ stage: 'payment_due' })], detail({ stage: 'payment_due', stageLabel: 'Payment due', actions: [], dueNow: 100, needsAction: true }));
    const article = await choose();
    fireEvent.click(within(article).getByRole('button', { name: /Pay ₹100 now/ }));
    expect(await screen.findByText(/not set up on the server/)).toBeTruthy();
  });

  it('lists the documents with their figures and opens one', async () => {
    fetchDocumentFile.mockResolvedValue({ kind: 'url', url: 'https://signed.example/q.pdf' });
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
    const d = detail({
      documents: [
        { id: 'Q-1', kind: 'quotation', number: 'BQ-42', total: 118000, status: 'awaiting_decision', hasFile: true, at: '2026-10-12T10:00:00Z', items: [{ name: 'TMT bar 12mm', quantity: 40, unit: 'tonne', amount: 118000 }] },
        { id: 'RV-1', kind: 'receipt', number: 'RV-RFQ-1-1', amount: 59000, hasFile: true, at: '2026-10-12T11:00:00Z' },
      ],
    });
    await open([row()], d);
    const article = await choose();
    const docs = within(article).getByLabelText('Documents');
    expect(within(docs).getByText(/Quotation · BQ-42/)).toBeTruthy();
    expect(within(docs).getByText(/Awaiting your decision/)).toBeTruthy();
    expect(within(docs).getByText(/Receipt voucher · RV-RFQ-1-1/)).toBeTruthy();
    fireEvent.click(within(docs).getByRole('button', { name: 'Open Quotation BQ-42' }));
    await waitFor(() => expect(fetchDocumentFile).toHaveBeenCalledWith('ORD-1', 'Q-1'));
    expect(opened).toHaveBeenCalledWith('https://signed.example/q.pdf', '_blank', 'noopener');
    opened.mockRestore();
  });

  it('shows the goods received and the delivery', async () => {
    const d = detail({
      grn: { number: 'GRN-88', at: '2026-10-14T09:00:00Z', items: [{ name: 'TMT bar 12mm', quantity: 40, unit: 'tonne' }], note: 'All counted' },
      delivery: { at: '2026-10-16T09:00:00Z', receivedBy: 'Site engineer' },
    });
    await open([row()], d);
    const article = await choose();
    const goods = within(article).getByLabelText('Goods received');
    expect(within(goods).getByText(/GRN GRN-88/)).toBeTruthy();
    expect(within(goods).getByText(/All counted/)).toBeTruthy();
    expect(within(goods).getByText(/received by Site engineer/)).toBeTruthy();
  });
});

describe('plain-words helpers', () => {
  it('maps each phase to a place on the progress bar', () => {
    expect(phaseIndex('quote')).toBe(0);
    expect(phaseIndex('close')).toBe(5);
    expect(phaseIndex('nonsense')).toBe(-1);
  });

  it('colours by what matters: needs you, a problem, done', () => {
    expect(stageTone({ stage: 'closed' })).toBe('success');
    expect(stageTone({ stage: 'issue_open' })).toBe('danger');
    expect(stageTone({ stage: 'quote_ready', needsAction: true })).toBe('warning');
    expect(stageTone({ stage: 'ordered', needsAction: false })).toBe('info');
    expect(stageTone({ stage: 'cancelled' })).toBe('neutral');
  });

  it('says who the order is with, without naming staff', () => {
    expect(waitingText({ stage: 'pm_review', waitingOn: 'pm', needsAction: false })).toBe('With your project manager');
    expect(waitingText({ stage: 'quote_ready', waitingOn: 'vendor', needsAction: true })).toBe('Waiting for you');
    expect(waitingText({ stage: 'rejected' })).toBe('You declined this quote');
  });

  it('describes a payment with its amount', () => {
    expect(timelineText({ type: 'payment_recorded', data: { amount: 59000 } })).toBe('Payment of ₹59,000 received');
    expect(timelineText({ type: 'something_new' })).toBe('Update');
  });

  it('offers the note button on open orders only, after the real actions', () => {
    expect(visibleActions({ stage: 'quote_ready', actions: ['vendor_approved', 'cancelled'] })).toEqual(['vendor_approved', 'cancelled', 'note']);
    expect(visibleActions({ stage: 'closed', actions: [] })).toEqual([]);
    expect(visibleActions({ stage: 'quote_ready', actions: ['sent_to_finance'] })).toEqual(['note']);
  });

  it('gives a next step only when it is the vendor\'s turn', () => {
    expect(nextStepText({ needsAction: false, stage: 'sourcing' })).toBe('');
    expect(nextStepText({ needsAction: true, stage: 'delivery_check' })).toMatch(/check them/);
    expect(needsPayment({ stage: 'payment_due' })).toBe(true);
    expect(needsPayment({ stage: 'paid' })).toBe(false);
  });
});
