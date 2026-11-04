import { MarkerType } from 'reactflow';
import { isDecorativeBlockNode } from './blockElements';

/**
 * Shared helpers for creating canvas connections: picking the sides of two
 * nodes to join, building edges in the canvas's standard style, and choosing
 * what a newly added node should auto-connect to.
 *
 * Handle ids are `<side>-out` (source) and `<side>-in` (target); see
 * nodes/NodeHandles.jsx.
 */

const DEFAULT_NODE_WIDTH = 300;
const DEFAULT_NODE_HEIGHT = 180;

const nodeSize = (node) => ({
  w: Number(node?.width ?? node?.measured?.width ?? node?.style?.width) || DEFAULT_NODE_WIDTH,
  h: Number(node?.height ?? node?.measured?.height ?? node?.style?.height) || DEFAULT_NODE_HEIGHT,
});

/**
 * Container nodes only hold or group other nodes; they are never the end of a
 * connection (frames, row/column/grid layouts, group boxes).
 */
const CONTAINER_LAYOUT_TYPES = new Set(['frame', 'rows', 'columns', 'grid', 'group-container']);

export const isContainerNode = (node) =>
  !!node &&
  (node.type === 'docGroup' ||
    (node.type === 'layoutNode' &&
      (!!node.data?.isGroupContainer || CONTAINER_LAYOUT_TYPES.has(node.data?.type))));

// Headings and dividers only decorate the canvas, so they are not connection endpoints either
export const isConnectableNode = (node) =>
  !!node && !isContainerNode(node) && !isDecorativeBlockNode(node) && !node.hidden;

/** Same check from a layout node's own `data` (used by LayoutNode to hide handles). */
export const isContainerLayoutData = (data) =>
  !!data && (!!data.isGroupContainer || CONTAINER_LAYOUT_TYPES.has(data.type));

/**
 * Can `connection` ({source, target}) be added?
 * Rules: both nodes exist and are connectable, no self-loops, and the same
 * source -> target pair is not already connected (any sides). When re-attaching
 * an existing edge, pass its id as `ignoreEdgeId` so it does not block itself,
 * and its current endpoints as `keepEndpointIds` so an edge that already
 * touches a container (created before containers were disallowed) can still
 * have its OTHER end moved.
 * Returns `{ ok: true }` or `{ ok: false, reason }`.
 */
export const canConnect = (nodes, edges, connection, ignoreEdgeId = null, keepEndpointIds = []) => {
  const { source, target } = connection || {};
  if (!source || !target) return { ok: false, reason: 'missing-endpoint' };
  if (source === target) return { ok: false, reason: 'self-connection' };

  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);
  if (!sourceNode || !targetNode) return { ok: false, reason: 'unknown-node' };
  const endpointOk = (node) => isConnectableNode(node) || (keepEndpointIds.includes(node.id) && !node.hidden);
  if (!endpointOk(sourceNode) || !endpointOk(targetNode)) {
    return { ok: false, reason: 'container-endpoint' };
  }

  const duplicate = edges.some(
    (e) => e.id !== ignoreEdgeId && e.source === source && e.target === target
  );
  if (duplicate) return { ok: false, reason: 'duplicate' };

  return { ok: true };
};

const OPPOSITE_SIDE = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' };

/** The target handle that faces a given source handle: "right-out" -> "left-in". */
export const targetHandleFor = (sourceHandleId) => {
  const match = /^(top|right|bottom|left)-(in|out)$/.exec(sourceHandleId || '');
  return match ? `${OPPOSITE_SIDE[match[1]]}-in` : 'top-in';
};

/**
 * Where to put a node created by dropping a connection at `point` (flow
 * coordinates) so its facing side sits on the drop point.
 */
export const quickAddPosition = (sourceHandleId, point, size = { w: 300, h: 160 }) => {
  const side = (/^(top|right|bottom|left)/.exec(sourceHandleId || '') || [])[1] || 'bottom';
  switch (side) {
    case 'right':
      return { x: point.x, y: point.y - size.h / 2 };
    case 'left':
      return { x: point.x - size.w, y: point.y - size.h / 2 };
    case 'top':
      return { x: point.x - size.w / 2, y: point.y - size.h };
    default:
      return { x: point.x - size.w / 2, y: point.y };
  }
};

/**
 * Pick the facing sides of two nodes from their relative position.
 * Horizontal vs vertical is decided on distances normalised by node size so a
 * wide node does not always win the "horizontal" test.
 */
export const pickHandles = (sourceNode, targetNode) => {
  const s = nodeSize(sourceNode);
  const t = nodeSize(targetNode);
  const dx = (targetNode.position?.x || 0) + t.w / 2 - ((sourceNode.position?.x || 0) + s.w / 2);
  const dy = (targetNode.position?.y || 0) + t.h / 2 - ((sourceNode.position?.y || 0) + s.h / 2);

  const horizontal = Math.abs(dx) / (s.w + t.w) >= Math.abs(dy) / (s.h + t.h);
  if (horizontal) {
    return dx >= 0
      ? { sourceHandle: 'right-out', targetHandle: 'left-in' }
      : { sourceHandle: 'left-out', targetHandle: 'right-in' };
  }
  return dy >= 0
    ? { sourceHandle: 'bottom-out', targetHandle: 'top-in' }
    : { sourceHandle: 'top-out', targetHandle: 'bottom-in' };
};

/** "right-in" / "right-out" -> "right-out"; anything unrecognised -> null. */
export const toSourceHandleId = (handleId) => {
  const match = /^(top|right|bottom|left)-(in|out)$/.exec(handleId || '');
  return match ? `${match[1]}-out` : null;
};

/** Is there already any edge between these two nodes (either direction)? */
export const edgeExistsBetween = (edges, a, b) =>
  edges.some(
    (e) => (e.source === a && e.target === b) || (e.source === b && e.target === a)
  );

/** An edge in the canvas's standard look. `auto` marks system-created edges. */
export const createEdge = ({ source, target, sourceHandle, targetHandle, auto = false }) => ({
  id: `edge_${auto ? 'auto_' : ''}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  source,
  target,
  sourceHandle,
  targetHandle,
  type: 'custom',
  animated: false,
  style: { strokeWidth: 2, stroke: '#6b7280' },
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#6b7280' },
  data: auto ? { label: '', isAutoConnected: true } : { label: '' },
});

/**
 * What should `newNode` auto-connect to? The single selected node if there is
 * exactly one (n8n-style "chain from what I'm working on"), otherwise the
 * most recently added node.
 */
export const resolveAnchorNode = (nodes, newNodeId, lastAddedNodeId) => {
  const selected = nodes.filter((n) => n.selected && n.id !== newNodeId && isConnectableNode(n));
  if (selected.length === 1) return selected[0];
  if (lastAddedNodeId && lastAddedNodeId !== newNodeId) {
    const last = nodes.find((n) => n.id === lastAddedNodeId);
    return isConnectableNode(last) ? last : null;
  }
  return null;
};

/**
 * Build the auto-connect edge anchor -> newNode, or null when the two are
 * already connected. The arrow always runs from the existing node to the new
 * one; only the sides are chosen from geometry.
 */
export const buildAutoEdge = (anchorNode, newNode, existingEdges) => {
  if (!anchorNode || !newNode || anchorNode.id === newNode.id) return null;
  if (!isConnectableNode(anchorNode) || !isConnectableNode(newNode)) return null;
  if (edgeExistsBetween(existingEdges, anchorNode.id, newNode.id)) return null;
  const handles = pickHandles(anchorNode, newNode);
  return createEdge({ source: anchorNode.id, target: newNode.id, ...handles, auto: true });
};
