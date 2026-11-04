/**
 * A marketplace order document on the canvas: always read from the order, shown
 * only to the buyer and PM, with Pay on the document it is for.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('../src/utils/workspaceOrdersApi.js', () => ({
  getOrder: vi.fn(),
  fetchDocumentFile: vi.fn(),
  createOrderPayment: vi.fn(),
  verifyOrderPayment: vi.fn(),
  listOrders: vi.fn(),
  postOrderEvent: vi.fn(),
}));
vi.mock('../src/components/Orders/razorpay.js', () => ({ loadRazorpay: vi.fn(async () => true) }));
vi.mock('../src/pages/WorkspacePage/components/nodes/NodeHandles.jsx', () => ({ default: () => null }));

import { getOrder, fetchDocumentFile, createOrderPayment } from '../src/utils/workspaceOrdersApi.js';
import B2BOrderDocNode from '../src/pages/WorkspacePage/components/nodes/B2BOrderDocNode.jsx';

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

const order = (over = {}) => ({
  orderId: 'ORD-1', stage: 'payment_due', dueNow: 59000, total: 118000, paid: 0,
  documents: [
    { id: 'Q-1', kind: 'quotation', number: 'BQ-42', total: 118000, status: 'approved', hasFile: true, at: '2026-10-12T10:00:00Z', items: [{ name: 'TMT bar 12mm', quantity: 40, unit: 'tonne' }, { name: 'a', quantity: 1 }, { name: 'b', quantity: 1 }, { name: 'c', quantity: 1 }] },
    { id: 'RV-1', kind: 'receipt', number: 'RV-1', amount: 59000, hasFile: true, at: '2026-10-12T11:00:00Z', reference: 'pay_1' },
    { id: 'INV-1', kind: 'invoice', number: 'INV-9', total: 120000, status: 'payable', hasFile: false, at: '2026-10-20T10:00:00Z' },
  ],
  ...over,
});
const node = (docId, kind = 'quotation') => <B2BOrderDocNode data={{ orderId: 'ORD-1', docId, kind }} />;

describe('a document on the canvas', () => {
  it('shows the number, amount, status and the first lines, read from the order', async () => {
    getOrder.mockResolvedValue({ order: order() });
    render(node('Q-1'));
    expect(await screen.findByText('Quotation · BQ-42')).toBeTruthy();
    expect(screen.getByText('₹1,18,000')).toBeTruthy();
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(screen.getByText('TMT bar 12mm')).toBeTruthy();
    expect(screen.getByText('+ 1 more')).toBeTruthy();
  });

  it('offers Pay on the quotation while the advance is due, and not on the receipt or invoice', async () => {
    getOrder.mockResolvedValue({ order: order() });
    render(node('Q-1'));
    expect(await screen.findByRole('button', { name: /Pay ₹59,000/ })).toBeTruthy();
    cleanup();
    render(node('RV-1', 'receipt'));
    await screen.findByText('Receipt voucher · RV-1');
    expect(screen.queryByRole('button', { name: /Pay ₹/ })).toBeNull();
  });

  it('offers Pay on the invoice at the balance step, not on the quotation', async () => {
    getOrder.mockResolvedValue({ order: order({ stage: 'balance_due', dueNow: 61000 }) });
    render(node('INV-1', 'invoice'));
    expect(await screen.findByRole('button', { name: /Pay ₹61,000/ })).toBeTruthy();
    cleanup();
    render(node('Q-1'));
    await screen.findByText('Quotation · BQ-42');
    expect(screen.queryByRole('button', { name: /Pay ₹/ })).toBeNull();
  });

  it('a receipt shows its amount and reference, and downloads', async () => {
    getOrder.mockResolvedValue({ order: order() });
    fetchDocumentFile.mockResolvedValue({ kind: 'url', url: 'https://signed.example/x' });
    const spy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(node('RV-1', 'receipt'));
    expect(await screen.findByText(/pay_1/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Download/ }));
    await waitFor(() => expect(fetchDocumentFile).toHaveBeenCalledWith('ORD-1', 'RV-1'));
    spy.mockRestore();
  });

  it('anyone else on the canvas sees that it is private, and nothing of the order', async () => {
    getOrder.mockRejectedValue(Object.assign(new Error('Order not found'), { status: 404 }));
    render(node('Q-1'));
    expect(await screen.findByText(/buyer and the project manager only/)).toBeTruthy();
    expect(screen.queryByText('₹1,18,000')).toBeNull();
  });

  it('a payment that cannot start is explained on the document', async () => {
    getOrder.mockResolvedValue({ order: order() });
    createOrderPayment.mockRejectedValue(new Error('Online payment is not set up on the server yet'));
    render(node('Q-1'));
    fireEvent.click(await screen.findByRole('button', { name: /Pay ₹59,000/ }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText(/not set up on the server/)).toBeTruthy();
  });

  it('a document removed from the order says so', async () => {
    getOrder.mockResolvedValue({ order: order({ documents: [] }) });
    render(node('Q-1'));
    expect(await screen.findByText(/no longer part of the order/)).toBeTruthy();
  });

  it('asks the workspace to open the order', async () => {
    getOrder.mockResolvedValue({ order: order() });
    const heard = vi.fn();
    window.addEventListener('b2b-orders:open', heard);
    render(node('Q-1'));
    fireEvent.click(await screen.findByRole('button', { name: /Order details/ }));
    expect(heard).toHaveBeenCalled();
    expect(heard.mock.calls[0][0].detail.orderId).toBe('ORD-1');
    window.removeEventListener('b2b-orders:open', heard);
  });
});
