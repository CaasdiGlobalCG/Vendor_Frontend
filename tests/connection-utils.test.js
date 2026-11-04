/**
 * connectionUtils — handle picking, edge building and auto-connect anchor logic.
 */
import { describe, it, expect } from 'vitest';

import {
  pickHandles,
  toSourceHandleId,
  edgeExistsBetween,
  createEdge,
  resolveAnchorNode,
  buildAutoEdge,
  canConnect,
  isContainerNode,
  isConnectableNode,
  isContainerLayoutData,
  targetHandleFor,
  quickAddPosition,
} from '../src/pages/WorkspacePage/utils/connectionUtils.js';

const node = (id, x, y, extra = {}) => ({
  id,
  position: { x, y },
  width: 200,
  height: 100,
  ...extra,
});

describe('pickHandles', () => {
  const a = node('a', 0, 0);

  it('connects right -> left when the target is to the right', () => {
    expect(pickHandles(a, node('b', 500, 0))).toEqual({
      sourceHandle: 'right-out',
      targetHandle: 'left-in',
    });
  });

  it('connects left -> right when the target is to the left', () => {
    expect(pickHandles(a, node('b', -500, 0))).toEqual({
      sourceHandle: 'left-out',
      targetHandle: 'right-in',
    });
  });

  it('connects bottom -> top when the target is below', () => {
    expect(pickHandles(a, node('b', 0, 400))).toEqual({
      sourceHandle: 'bottom-out',
      targetHandle: 'top-in',
    });
  });

  it('connects top -> bottom when the target is above', () => {
    expect(pickHandles(a, node('b', 0, -400))).toEqual({
      sourceHandle: 'top-out',
      targetHandle: 'bottom-in',
    });
  });

  it('judges direction relative to node size, not raw distance', () => {
    const wide = node('w', 0, 0, { width: 1000, height: 100 });
    // 400px right but 300px down: far more "below" than "beside" for a wide node
    const t = node('t', 400, 300, { width: 200, height: 100 });
    expect(pickHandles(wide, t).sourceHandle).toBe('bottom-out');
  });

  it('falls back to default sizes when a node has not been measured', () => {
    const bare = { id: 'x', position: { x: 0, y: 0 } };
    const other = { id: 'y', position: { x: 1000, y: 0 } };
    expect(pickHandles(bare, other).sourceHandle).toBe('right-out');
  });
});

describe('toSourceHandleId', () => {
  it('normalises in/out ids to the source id', () => {
    expect(toSourceHandleId('right-in')).toBe('right-out');
    expect(toSourceHandleId('top-out')).toBe('top-out');
  });
  it('rejects unknown ids', () => {
    expect(toSourceHandleId('bogus')).toBeNull();
    expect(toSourceHandleId(undefined)).toBeNull();
    expect(toSourceHandleId(null)).toBeNull();
  });
});

describe('createEdge', () => {
  it('builds a standard custom edge with an empty optional label', () => {
    const e = createEdge({
      source: 'a',
      target: 'b',
      sourceHandle: 'right-out',
      targetHandle: 'left-in',
    });
    expect(e).toMatchObject({
      source: 'a',
      target: 'b',
      sourceHandle: 'right-out',
      targetHandle: 'left-in',
      type: 'custom',
      data: { label: '' },
    });
    expect(e.id).toMatch(/^edge_\d+_/);
  });

  it('flags auto-created edges', () => {
    const e = createEdge({ source: 'a', target: 'b', auto: true });
    expect(e.id).toMatch(/^edge_auto_/);
    expect(e.data.isAutoConnected).toBe(true);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createEdge({ source: 'a', target: 'b' }).id));
    expect(ids.size).toBe(50);
  });
});

describe('edgeExistsBetween', () => {
  const edges = [{ source: 'a', target: 'b' }];
  it('matches in either direction', () => {
    expect(edgeExistsBetween(edges, 'a', 'b')).toBe(true);
    expect(edgeExistsBetween(edges, 'b', 'a')).toBe(true);
  });
  it('is false for unconnected pairs', () => {
    expect(edgeExistsBetween(edges, 'a', 'c')).toBe(false);
    expect(edgeExistsBetween([], 'a', 'b')).toBe(false);
  });
});

describe('resolveAnchorNode', () => {
  const a = node('a', 0, 0);
  const b = node('b', 300, 0);
  const c = node('c', 600, 0);

  it('prefers the single selected node over the last added one', () => {
    const nodes = [a, { ...b, selected: true }, c];
    expect(resolveAnchorNode(nodes, 'new', 'c').id).toBe('b');
  });

  it('falls back to the last added node when nothing is selected', () => {
    expect(resolveAnchorNode([a, b, c], 'new', 'c').id).toBe('c');
  });

  it('falls back to the last added node when several are selected', () => {
    const nodes = [{ ...a, selected: true }, { ...b, selected: true }, c];
    expect(resolveAnchorNode(nodes, 'new', 'c').id).toBe('c');
  });

  it('never anchors on the new node itself', () => {
    const nodes = [{ ...a, selected: true, id: 'new' }, b];
    expect(resolveAnchorNode(nodes, 'new', 'new')).toBeNull();
  });

  it('ignores hidden selected nodes', () => {
    const nodes = [{ ...a, selected: true, hidden: true }, b];
    expect(resolveAnchorNode(nodes, 'new', 'b').id).toBe('b');
  });

  it('returns null when there is nothing to anchor to', () => {
    expect(resolveAnchorNode([a, b], 'new', null)).toBeNull();
    expect(resolveAnchorNode([a, b], 'new', 'missing')).toBeNull();
    expect(resolveAnchorNode([], 'new', null)).toBeNull();
  });
});

describe('buildAutoEdge', () => {
  const anchor = node('a', 0, 0);

  it('always runs anchor -> new node, with sides from geometry', () => {
    const toLeft = node('n', -500, 0);
    const e = buildAutoEdge(anchor, toLeft, []);
    expect(e.source).toBe('a');
    expect(e.target).toBe('n');
    expect(e.sourceHandle).toBe('left-out');
    expect(e.targetHandle).toBe('right-in');
  });

  it('does not duplicate an existing connection', () => {
    const n = node('n', 500, 0);
    expect(buildAutoEdge(anchor, n, [{ source: 'n', target: 'a' }])).toBeNull();
    expect(buildAutoEdge(anchor, n, [{ source: 'a', target: 'n' }])).toBeNull();
  });

  it('refuses degenerate input', () => {
    expect(buildAutoEdge(null, node('n', 0, 0), [])).toBeNull();
    expect(buildAutoEdge(anchor, null, [])).toBeNull();
    expect(buildAutoEdge(anchor, anchor, [])).toBeNull();
  });

  it('only ever references the eight canonical handle ids', () => {
    const valid = new Set([
      'top-in', 'right-in', 'bottom-in', 'left-in',
      'top-out', 'right-out', 'bottom-out', 'left-out',
    ]);
    for (const [x, y] of [[500, 0], [-500, 0], [0, 400], [0, -400], [300, 300], [-300, -300]]) {
      const e = buildAutoEdge(anchor, node('n', x, y), []);
      expect(valid.has(e.sourceHandle)).toBe(true);
      expect(valid.has(e.targetHandle)).toBe(true);
    }
  });
});

const frame = (id) => ({ id, type: 'layoutNode', position: { x: 0, y: 0 }, data: { type: 'frame' } });

describe('container nodes', () => {
  it.each(['frame', 'rows', 'columns', 'grid', 'group-container'])('treats a %s layout as a container', (type) => {
    expect(isContainerNode({ id: 'x', type: 'layoutNode', data: { type } })).toBe(true);
  });

  it('treats docGroup and flagged group containers as containers', () => {
    expect(isContainerNode({ id: 'g', type: 'docGroup', data: {} })).toBe(true);
    expect(isContainerNode({ id: 'g', type: 'layoutNode', data: { isGroupContainer: true } })).toBe(true);
  });

  it('keeps image layouts and normal elements connectable', () => {
    expect(isContainerNode({ id: 'i', type: 'layoutNode', data: { type: 'image' } })).toBe(false);
    expect(isConnectableNode({ id: 'e', type: 'elementNode', data: { type: 'table' } })).toBe(true);
  });

  it('is not connectable when hidden or missing', () => {
    expect(isConnectableNode({ id: 'h', type: 'elementNode', hidden: true, data: {} })).toBe(false);
    expect(isConnectableNode(undefined)).toBe(false);
  });

  it('isContainerLayoutData mirrors the node check for LayoutNode', () => {
    expect(isContainerLayoutData({ type: 'frame' })).toBe(true);
    expect(isContainerLayoutData({ type: 'image' })).toBe(false);
    expect(isContainerLayoutData({ isGroupContainer: true })).toBe(true);
    expect(isContainerLayoutData(undefined)).toBe(false);
  });

  it('never auto-connects to or from a container', () => {
    const el = node('n', 500, 0, { type: 'elementNode', data: {} });
    expect(buildAutoEdge(frame('f'), el, [])).toBeNull();
    expect(buildAutoEdge(node('a', 0, 0), frame('f'), [])).toBeNull();
  });

  it('skips a selected / last-added container when choosing an anchor', () => {
    const f = { ...frame('f'), selected: true };
    const a = node('a', 0, 0);
    expect(resolveAnchorNode([f, a], 'new', 'a').id).toBe('a');
    expect(resolveAnchorNode([f, a], 'new', 'f')).toBeNull();
  });
});

describe('canConnect', () => {
  const a = node('a', 0, 0, { type: 'elementNode', data: {} });
  const b = node('b', 500, 0, { type: 'elementNode', data: {} });
  const nodes = [a, b, frame('f')];

  it('allows a normal connection', () => {
    expect(canConnect(nodes, [], { source: 'a', target: 'b' })).toEqual({ ok: true });
  });

  it('rejects missing endpoints, self-loops and unknown nodes', () => {
    expect(canConnect(nodes, [], { source: 'a' }).reason).toBe('missing-endpoint');
    expect(canConnect(nodes, [], { source: 'a', target: 'a' }).reason).toBe('self-connection');
    expect(canConnect(nodes, [], { source: 'a', target: 'zzz' }).reason).toBe('unknown-node');
  });

  it('rejects containers as either endpoint', () => {
    expect(canConnect(nodes, [], { source: 'a', target: 'f' }).reason).toBe('container-endpoint');
    expect(canConnect(nodes, [], { source: 'f', target: 'b' }).reason).toBe('container-endpoint');
  });

  it('rejects a second arrow in the same direction, any sides, but allows the reverse', () => {
    const edges = [{ id: 'e1', source: 'a', target: 'b', sourceHandle: 'right-out', targetHandle: 'left-in' }];
    expect(canConnect(nodes, edges, { source: 'a', target: 'b', sourceHandle: 'bottom-out' }).reason).toBe('duplicate');
    expect(canConnect(nodes, edges, { source: 'b', target: 'a' }).ok).toBe(true);
  });

  it('lets an edge be re-attached to the same pair without blocking itself', () => {
    const edges = [{ id: 'e1', source: 'a', target: 'b' }];
    expect(canConnect(nodes, edges, { source: 'a', target: 'b' }, 'e1').ok).toBe(true);
  });

  it('lets a legacy edge touching a frame keep that endpoint when its other end moves', () => {
    const c = node('c', 900, 0, { type: 'elementNode', data: {} });
    const legacy = { id: 'e1', source: 'f', target: 'b' };
    const all = [a, b, c, frame('f')];
    // dragging the target end from b to c; the frame source is unchanged
    expect(canConnect(all, [legacy], { source: 'f', target: 'c' }, 'e1', ['f', 'b']).ok).toBe(true);
    // but a brand-new frame endpoint is still refused
    expect(canConnect(all, [legacy], { source: 'a', target: 'f' }, 'e1', ['f', 'b']).ok).toBe(true); // f was already an endpoint
    expect(canConnect(all, [], { source: 'a', target: 'f' }).ok).toBe(false);
  });
});

describe('targetHandleFor', () => {
  it('returns the facing target handle', () => {
    expect(targetHandleFor('right-out')).toBe('left-in');
    expect(targetHandleFor('left-out')).toBe('right-in');
    expect(targetHandleFor('bottom-out')).toBe('top-in');
    expect(targetHandleFor('top-out')).toBe('bottom-in');
    expect(targetHandleFor('right-in')).toBe('left-in');
  });
  it('falls back to top-in for unknown ids', () => {
    expect(targetHandleFor('nope')).toBe('top-in');
    expect(targetHandleFor(undefined)).toBe('top-in');
  });
});

describe('quickAddPosition', () => {
  const p = { x: 1000, y: 500 };
  const size = { w: 300, h: 160 };
  it('puts the new node on the far side of the drop point for each handle', () => {
    expect(quickAddPosition('right-out', p, size)).toEqual({ x: 1000, y: 420 });
    expect(quickAddPosition('left-out', p, size)).toEqual({ x: 700, y: 420 });
    expect(quickAddPosition('bottom-out', p, size)).toEqual({ x: 850, y: 500 });
    expect(quickAddPosition('top-out', p, size)).toEqual({ x: 850, y: 340 });
  });
  it('defaults to below the drop point', () => {
    expect(quickAddPosition(undefined, p, size)).toEqual({ x: 850, y: 500 });
  });
});
