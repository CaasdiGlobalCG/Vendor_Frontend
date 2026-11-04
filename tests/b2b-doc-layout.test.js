/**
 * Marketplace order documents sit beside the RFQ they came from, linked to it and
 * to each other, and are never moved again once placed.
 */
import { describe, it, expect } from 'vitest';
import { DOC_GAP, DOC_WIDTH, docNodeId, findRfqNode, planB2BDocs } from '../src/pages/WorkspacePage/utils/b2bDocLayout.js';

const rfq = { id: 'rfq-node', type: 'elementNode', position: { x: -1541, y: -46 }, style: { width: 809, height: 361 }, data: { type: 'procurement-rfq-request', procurementRFQData: { request: { requestId: 'RFQ-1' } } } };
const other = { id: 'other', type: 'elementNode', position: { x: 0, y: 0 }, data: { type: 'table' } };
const doc = (docId, kind = 'quotation', over = {}) => ({ orderId: 'ORD-RFQ-1', docId, kind, rfqRequestId: 'RFQ-1', ...over });

describe('finding the RFQ element', () => {
  it('matches the request id, wherever the element keeps it', () => {
    expect(findRfqNode([other, rfq], 'RFQ-1').id).toBe('rfq-node');
    expect(findRfqNode([{ id: 'a', type: 'elementNode', data: { requestId: 'RFQ-9' } }], 'RFQ-9').id).toBe('a');
    expect(findRfqNode([other, rfq], 'RFQ-404')).toBeNull();
    expect(findRfqNode([rfq], undefined)).toBeNull();
  });
  it('never mistakes a document node for the request', () => {
    const d = { id: 'd', type: 'b2bOrderDoc', data: { requestId: 'RFQ-1' } };
    expect(findRfqNode([d], 'RFQ-1')).toBeNull();
  });
});

describe('placing a quotation', () => {
  it('puts it to the right of the RFQ element and links the two', () => {
    const plan = planB2BDocs({ nodes: [other, rfq], docs: [doc('Q-1')] });
    expect(plan.addNodes).toHaveLength(1);
    const node = plan.addNodes[0];
    expect(node.id).toBe(docNodeId('ORD-RFQ-1', 'Q-1'));
    expect(node.position).toEqual({ x: -1541 + 809 + DOC_GAP, y: -46 });
    expect(plan.addEdges).toHaveLength(1);
    expect(plan.addEdges[0]).toMatchObject({ source: 'rfq-node', target: node.id, sourceHandle: 'right-out', targetHandle: 'left-in' });
    expect(plan.focusId).toBe(node.id);
  });

  it('lays a whole chain out left to right, each linked to the one before', () => {
    const plan = planB2BDocs({ nodes: [rfq], docs: [doc('Q-1'), doc('RV-1', 'receipt'), doc('PO-1', 'po'), doc('INV-1', 'invoice')] });
    const xs = plan.addNodes.map((n) => n.position.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(xs[1] - xs[0]).toBe(DOC_WIDTH + DOC_GAP);
    const ids = ['Q-1', 'RV-1', 'PO-1', 'INV-1'].map((d) => docNodeId('ORD-RFQ-1', d));
    expect(plan.addEdges.map((e) => [e.source, e.target])).toEqual([
      ['rfq-node', ids[0]], [ids[0], ids[1]], [ids[1], ids[2]], [ids[2], ids[3]],
    ]);
    expect(plan.addEdges).toHaveLength(4);
    expect(plan.addEdges[1].source).toBe(docNodeId('ORD-RFQ-1', 'Q-1'));
    expect(plan.addEdges[3].target).toBe(docNodeId('ORD-RFQ-1', 'INV-1'));
  });

  it('asks for free space so it does not land on another element', () => {
    const plan = planB2BDocs({ nodes: [rfq], docs: [doc('Q-1')], place: (p) => ({ x: p.x, y: p.y + 500 }) });
    expect(plan.addNodes[0].position.y).toBe(-46 + 500);
  });
});

describe('with no RFQ element on this canvas', () => {
  it('still places the document, chained to the one before, without inventing a link to nothing', () => {
    const plan = planB2BDocs({ nodes: [other], docs: [doc('Q-1', 'quotation', { rfqRequestId: 'RFQ-404' }), doc('RV-1', 'receipt', { rfqRequestId: 'RFQ-404' })], fallback: () => ({ x: 10, y: 20 }) });
    expect(plan.addNodes).toHaveLength(2);
    expect(plan.addNodes[0].position).toEqual({ x: 10, y: 20 });
    expect(plan.addEdges).toHaveLength(1);
    expect(plan.addEdges[0].target).toBe(docNodeId('ORD-RFQ-1', 'RV-1'));
  });
});

describe('what is already there', () => {
  const placed = { id: docNodeId('ORD-RFQ-1', 'Q-1'), type: 'b2bOrderDoc', position: { x: 5, y: 5 }, data: { orderId: 'ORD-RFQ-1', docId: 'Q-1', placed: true } };

  it('adds nothing twice, and does not move a document the vendor has placed', () => {
    const link = { source: 'rfq-node', target: placed.id };
    const plan = planB2BDocs({ nodes: [rfq, placed], edges: [link], docs: [doc('Q-1')] });
    expect(plan.addNodes).toHaveLength(0);
    expect(plan.addEdges).toHaveLength(0);
    expect(plan.movedNodes).toEqual({});
  });

  it('brings an old, unplaced document to its RFQ and links it, once', () => {
    const old = { ...placed, data: { orderId: 'ORD-RFQ-1', docId: 'Q-1' } };
    const plan = planB2BDocs({ nodes: [rfq, old], docs: [doc('Q-1')] });
    expect(plan.movedNodes[old.id].position).toEqual({ x: -1541 + 809 + DOC_GAP, y: -46 });
    expect(plan.movedNodes[old.id].placed).toBe(true);
    expect(plan.addEdges).toHaveLength(1);
  });

  it('adds only the new document after the existing one', () => {
    const link = { source: 'rfq-node', target: placed.id };
    const plan = planB2BDocs({ nodes: [rfq, placed], edges: [link], docs: [doc('Q-1'), doc('RV-1', 'receipt')] });
    expect(plan.addNodes).toHaveLength(1);
    expect(plan.addNodes[0].position.x).toBe(5 + DOC_WIDTH + DOC_GAP);
    expect(plan.addEdges).toEqual([expect.objectContaining({ source: placed.id, target: docNodeId('ORD-RFQ-1', 'RV-1') })]);
  });

  it('keeps separate orders in separate chains', () => {
    const rfq2 = { ...rfq, id: 'rfq-2', position: { x: 4000, y: 100 }, data: { type: 'procurement-rfq-request', procurementRFQData: { request: { requestId: 'RFQ-2' } } } };
    const plan = planB2BDocs({ nodes: [rfq, rfq2], docs: [doc('Q-1'), { orderId: 'ORD-RFQ-2', docId: 'Q-2', kind: 'quotation', rfqRequestId: 'RFQ-2' }] });
    const q2 = plan.addNodes.find((n) => n.data.orderId === 'ORD-RFQ-2');
    expect(q2.position.y).toBe(100);
    expect(plan.addEdges.find((e) => e.target === q2.id).source).toBe('rfq-2');
  });

  it('ignores entries with no order or document', () => {
    expect(planB2BDocs({ nodes: [rfq], docs: [{}, { orderId: 'x' }, null] }).addNodes).toHaveLength(0);
  });
});
