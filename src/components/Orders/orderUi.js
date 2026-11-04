// ============================================================
// FILE: components/Orders/orderUi.js
// PURPOSE: How an order is described to the vendor in plain words: the progress
//          steps, what each timeline entry says, and what each button asks for.
//          Pure functions, so they are easy to test.
// CONNECTS TO: OrdersPanel.jsx, OrderDetail.jsx
// ============================================================

export const PHASES = [
  { id: 'quote', label: 'Quote' },
  { id: 'pay', label: 'Pay' },
  { id: 'order', label: 'Order' },
  { id: 'ship', label: 'Ship' },
  { id: 'deliver', label: 'Deliver' },
  { id: 'close', label: 'Close' },
];

export const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const formatWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** Index of the phase an order is in, for the progress bar. -1 when it never started. */
export const phaseIndex = (phase) => PHASES.findIndex((p) => p.id === phase);

const END_STAGES = { closed: 'done', rejected: 'stopped', cancelled: 'stopped' };

/** 'done' | 'stopped' | 'open' */
export const endState = (stage) => END_STAGES[stage] || 'open';

/** Colour family for a stage chip. */
export const stageTone = (order) => {
  if (!order) return 'neutral';
  if (order.stage === 'closed') return 'success';
  if (order.stage === 'rejected' || order.stage === 'cancelled') return 'neutral';
  if (order.stage === 'issue_open') return 'danger';
  if (order.needsAction) return 'warning';
  return 'info';
};

export const TONE_CLASS = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  neutral: 'bg-surface-hover text-dim',
};

/** Who we are waiting on, in a sentence. */
export const waitingText = (order) => {
  if (!order) return '';
  if (order.stage === 'closed') return 'Completed';
  if (order.stage === 'rejected') return 'You declined this quote';
  if (order.stage === 'cancelled') return 'This order was cancelled';
  if (order.needsAction) return 'Waiting for you';
  const who = { pm: 'your project manager', procurement: 'procurement', finance: 'finance', logistics: 'logistics', system: 'the marketplace' }[order.waitingOn];
  return who ? `With ${who}` : 'In progress';
};

/** What each timeline entry says. */
export const timelineText = (e) => {
  const amount = e?.data?.amount;
  const map = {
    rfq_submitted: 'You asked for a quote',
    order_placed: 'You placed this order',
    procurement_accepted: 'Procurement picked up your request',
    quotes_merged: 'Quotes gathered and sent for review',
    sent_to_finance: 'Your project manager reviewed the quotes',
    finance_returned: 'Price and payment terms prepared',
    added_to_workspace: 'The quotation was shared with you',
    vendor_approved: 'You approved the quotation',
    vendor_rejected: 'You declined the quotation',
    vendor_changes_requested: 'You asked for changes',
    routed_to_procurement: 'Your changes were sent back for new quotes',
    payment_recorded: amount ? `Payment of ${rupees(amount)} received` : 'Payment received',
    po_submitted: e?.data?.poType === 'own' ? 'You provided your own purchase order' : 'You chose the system purchase order',
    pm_forwarded_po: 'Purchase order sent for ordering',
    po_raised: 'Ordered from the supplier',
    grn_verified: 'Goods received and checked',
    pm_forwarded_grn: 'Approved for dispatch to you',
    delivered: 'Delivered to you',
    delivery_confirmed: 'You confirmed the goods are fine',
    issue_raised: 'You reported a problem',
    issue_resolved: 'The problem was marked resolved',
    invoice_added_to_workspace: 'The invoice was added to your workspace',
    shipped: 'Shipped',
    direct_delivered: 'Delivered',
    direct_closed: 'You confirmed receipt',
    cancelled: 'Order cancelled',
    note: 'Note',
  };
  return map[e?.type] || 'Update';
};

/**
 * What each action button looks like and whether it needs the vendor to write
 * something first. `kind` decides the small form that opens.
 */
export const ACTIONS = {
  vendor_approved: { label: 'Approve quotation', tone: 'primary', kind: 'confirm', confirm: 'Approve this quotation? You will then be asked to pay as per its terms.' },
  vendor_changes_requested: { label: 'Request changes', tone: 'secondary', kind: 'note', title: 'What should change?', placeholder: 'For example: 30 tonnes instead of 40, delivery by 20 Oct', required: true, submit: 'Send request' },
  vendor_rejected: { label: 'Decline', tone: 'danger', kind: 'confirm', confirm: 'Decline this quotation? The order will close.' },
  po_submitted: { label: 'Provide purchase order', tone: 'primary', kind: 'po' },
  delivery_confirmed: { label: 'Goods are fine', tone: 'primary', kind: 'confirm', confirm: 'Confirm that the goods arrived complete and in good condition?' },
  issue_raised: { label: 'Report a problem', tone: 'danger', kind: 'note', title: 'What is wrong?', placeholder: 'For example: 5 bars bent, 2 bags torn', required: true, submit: 'Send to project manager' },
  direct_closed: { label: 'Confirm received', tone: 'primary', kind: 'confirm', confirm: 'Confirm that you received this order?' },
  cancelled: { label: 'Cancel order', tone: 'danger', kind: 'note', title: 'Why are you cancelling?', placeholder: 'A short reason', required: true, submit: 'Cancel order' },
  note: { label: 'Add a note', tone: 'secondary', kind: 'note', title: 'Note for your project manager', placeholder: 'Write a note', required: true, submit: 'Add note' },
};

/** Buttons shown, in the order we want people to see them. */
export const ACTION_ORDER = ['vendor_approved', 'delivery_confirmed', 'po_submitted', 'direct_closed', 'vendor_changes_requested', 'issue_raised', 'vendor_rejected', 'cancelled'];

export const visibleActions = (order) => {
  if (!order || ['closed', 'rejected', 'cancelled'].includes(order.stage)) return [];
  const offered = new Set(order.actions || []);
  return [...ACTION_ORDER.filter((a) => offered.has(a)), 'note'];
};

/** The one thing to do next, as a plain headline. */
export const nextStepText = (order) => {
  if (!order?.needsAction) return '';
  switch (order.stage) {
    case 'quote_ready': return 'Your quotation is ready. Review it and approve, ask for changes, or decline.';
    case 'payment_due': return `Payment is due${order.paymentTerms ? ` (${order.paymentTerms})` : ''}. You can pay it here.`;
    case 'paid': return 'Payment received. Provide your purchase order so we can order the goods.';
    case 'delivery_check': return 'Your goods have been delivered. Please check them and confirm, or report a problem.';
    case 'balance_due': return 'The invoice is ready. You can pay the balance here.';
    default: return 'This order is waiting for you.';
  }
};

/** Does this order need the vendor to open a document in the workspace (to pay)? */
export const needsPayment = (order) => ['payment_due', 'balance_due'].includes(order?.stage);
