// ============================================================
// FILE: utils/b2bDocLayout.js
// PURPOSE: Where a marketplace order's documents go on the canvas. They sit
//          beside the RFQ element the order was raised from and are linked to it
//          and to each other, left to right: RFQ -> quotation -> receipt -> PO ->
//          invoice. Pure, so the layout can be tested without a canvas.
// CONNECTS TO: components/CanvasWorkspace.jsx (addB2BOrderDocs)
// ============================================================

export const DOC_WIDTH = 340;
export const DOC_HEIGHT = 260;
export const DOC_GAP = 80;

export const docNodeId = (orderId, docId) => `b2b-doc-${orderId}-${docId}`;

const rfqRequestIdOf = (node) => node?.data?.procurementRFQData?.request?.requestId
  || node?.data?.procurementRFQData?.requestId
  || node?.data?.requestId
  || null;

/** The canvas element for the request an order was raised from, or null. */
export const findRfqNode = (nodes = [], rfqRequestId) => {
  if (!rfqRequestId) return null;
  return nodes.find((n) => n.type !== 'b2bOrderDoc' && rfqRequestIdOf(n) === rfqRequestId) || null;
};

const widthOf = (node, fallback) => Number(node?.style?.width) || Number(node?.width) || fallback;

/** The arrow used for document chains elsewhere on the canvas. */
export const linkEdge = (source, target) => ({
  id: `edge_b2b_${source}_${target}`,
  source,
  target,
  sourceHandle: 'right-out',
  targetHandle: 'left-in',
  type: 'custom',
  animated: true,
  style: { strokeWidth: 2, stroke: '#6b7280' },
  markerEnd: { type: 'arrowclosed', width: 18, height: 18, color: '#6b7280' },
  data: { label: '', isAutoConnected: true },
});

/**
 * Works out what to change on the canvas for these documents.
 *
 * @param {object[]} nodes  every node on the canvas
 * @param {object[]} edges  every edge on the canvas
 * @param {{orderId:string, docId:string, kind?:string, rfqRequestId?:string}[]} docs  in chain order
 * @param {(position:{x:number,y:number}, size:{width:number,height:number}) => {x:number,y:number}} [place]
 *        moves a position to free space (defaults to leaving it)
 * @param {(size) => {x:number,y:number}} [fallback] where to put a document with no RFQ element to sit beside
 * @returns {{ addNodes: object[], movedNodes: Record<string,{position:object}>, addEdges: object[], focusId: string|null }}
 */
export const planB2BDocs = ({ nodes = [], edges = [], docs = [], place = (p) => p, fallback = () => ({ x: 120, y: 120 }) }) => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edgeKeys = new Set(edges.map((e) => `${e.source}>${e.target}`));
  const plan = { addNodes: [], movedNodes: {}, addEdges: [], focusId: null };
  const size = { width: DOC_WIDTH, height: DOC_HEIGHT };

  const addEdge = (source, target) => {
    const key = `${source}>${target}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    plan.addEdges.push(linkEdge(source, target));
  };

  // one chain per order, in the order the documents were given
  const groups = new Map();
  docs.filter((d) => d?.orderId && d?.docId).forEach((d) => {
    if (!groups.has(d.orderId)) groups.set(d.orderId, []);
    groups.get(d.orderId).push(d);
  });

  for (const [, group] of groups) {
    const rfqNode = findRfqNode(nodes, group.find((d) => d.rfqRequestId)?.rfqRequestId);
    let previousId = rfqNode ? rfqNode.id : null;
    let cursor = rfqNode
      ? { x: rfqNode.position.x + widthOf(rfqNode, 809) + DOC_GAP, y: rfqNode.position.y }
      : null;

    for (const d of group) {
      const id = docNodeId(d.orderId, d.docId);
      const existing = byId.get(id);

      if (existing) {
        // A document placed by an earlier version has no home. Bring it to the chain once,
        // then never touch its position again, so the vendor can still move it.
        if (rfqNode && !existing.data?.placed) {
          const position = place({ ...cursor }, size);
          plan.movedNodes[id] = { position, placed: true };
          cursor = { x: position.x + DOC_WIDTH + DOC_GAP, y: position.y };
          addEdge(previousId, id);
        } else if (cursor) {
          cursor = { x: existing.position.x + DOC_WIDTH + DOC_GAP, y: existing.position.y };
        }
        previousId = id;
        continue;
      }

      const wanted = cursor || fallback(size);
      const position = place({ ...wanted }, size);
      plan.addNodes.push({
        id,
        type: 'b2bOrderDoc',
        position,
        data: { orderId: d.orderId, docId: d.docId, kind: d.kind || null, label: d.label || null, placed: true },
        style: { width: DOC_WIDTH },
      });
      if (previousId) addEdge(previousId, id);
      cursor = { x: position.x + DOC_WIDTH + DOC_GAP, y: position.y };
      previousId = id;
      if (!plan.focusId) plan.focusId = id;
    }
  }
  return plan;
};
