/**
 * Canvas placement: new elements land on the nearest free spot.
 */
import { describe, it, expect } from 'vitest';

import {
  GRID,
  findFreePosition,
  hasCollision,
  getNodeSize,
  estimateElementSize,
  isContainer,
  snapToGrid,
  isRectInViewport,
} from '../src/pages/WorkspacePage/utils/canvasPlacement.js';

const node = (id, x, y, w = 300, h = 200, extra = {}) => ({
  id,
  type: 'elementNode',
  position: { x, y },
  width: w,
  height: h,
  data: {},
  ...extra,
});
const frame = (id, x, y, w = 800, h = 600) => ({
  id,
  type: 'layoutNode',
  position: { x, y },
  width: w,
  height: h,
  data: { type: 'frame' },
});

const GAP = 28;
const rectsOverlap = (a, b, gap = 0) =>
  a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
const asRect = (n) => ({ x: n.position.x, y: n.position.y, w: n.width, h: n.height });

describe('snapToGrid', () => {
  it('rounds to the 22px grid', () => {
    expect(snapToGrid(0)).toBe(0);
    expect(snapToGrid(10)).toBe(0);
    expect(snapToGrid(12)).toBe(GRID);
    expect(snapToGrid(-13)).toBe(-GRID);
    expect(snapToGrid(GRID * 7)).toBe(GRID * 7);
  });
});

describe('findFreePosition on a clear canvas', () => {
  it('returns the requested point, snapped to the grid', () => {
    expect(findFreePosition({ x: 100, y: 100 }, { w: 300, h: 200 }, [])).toEqual({ x: 110, y: 110 });
    expect(findFreePosition({ x: 110, y: 220 }, { w: 300, h: 200 }, [])).toEqual({ x: 110, y: 220 });
  });

  it('is deterministic', () => {
    const nodes = [node('a', 0, 0)];
    const a = findFreePosition({ x: 20, y: 20 }, { w: 300, h: 200 }, nodes);
    const b = findFreePosition({ x: 20, y: 20 }, { w: 300, h: 200 }, nodes);
    expect(a).toEqual(b);
  });

  it('tolerates bad input', () => {
    expect(findFreePosition(undefined, undefined, undefined)).toEqual({ x: 0, y: 0 });
    expect(findFreePosition({ x: 'a', y: null }, { w: 0, h: -5 }, [null, undefined])).toEqual({ x: 0, y: 0 });
  });
});

describe('findFreePosition around existing elements', () => {
  const size = { w: 300, h: 200 };

  it('moves off an element that sits on the target', () => {
    const blocker = node('a', 0, 0);
    const pos = findFreePosition({ x: 20, y: 20 }, size, [blocker]);
    expect(rectsOverlap({ ...pos, ...size }, asRect(blocker), GAP)).toBe(false);
  });

  it('stays close to where the user pointed', () => {
    const blocker = node('a', 0, 0);
    const pos = findFreePosition({ x: 20, y: 20 }, size, [blocker]);
    expect(Math.hypot(pos.x - 20, pos.y - 20)).toBeLessThan(450);
  });

  it('keeps the gap between elements', () => {
    const blocker = node('a', 0, 0);
    const pos = findFreePosition({ x: 0, y: 0 }, size, [blocker]);
    const right = pos.x >= blocker.position.x + blocker.width + GAP;
    const left = pos.x + size.w + GAP <= blocker.position.x;
    const below = pos.y >= blocker.position.y + blocker.height + GAP;
    const above = pos.y + size.h + GAP <= blocker.position.y;
    expect(right || left || below || above).toBe(true);
  });

  it('prefers growing right/down over up/left when equally close', () => {
    const blocker = node('a', 0, 0, 300, 200);
    const pos = findFreePosition({ x: 0, y: 0 }, { w: 300, h: 200 }, [blocker]);
    expect(pos.x >= 0 || pos.y >= 0).toBe(true);
  });

  it('uses the requested size, not a fixed guess', () => {
    const blocker = node('a', 400, 0, 300, 200);
    // a wide element at x=0 would hit the blocker, a narrow one fits beside it
    const wide = findFreePosition({ x: 0, y: 0 }, { w: 600, h: 200 }, [blocker]);
    const narrow = findFreePosition({ x: 0, y: 0 }, { w: 200, h: 200 }, [blocker]);
    expect(narrow).toEqual({ x: 0, y: 0 });
    expect(rectsOverlap({ ...wide, w: 600, h: 200 }, asRect(blocker), GAP)).toBe(false);
  });

  it('never moves or changes the existing nodes', () => {
    const nodes = [node('a', 0, 0), node('b', 340, 0)];
    const snapshot = JSON.stringify(nodes);
    findFreePosition({ x: 10, y: 10 }, size, nodes);
    expect(JSON.stringify(nodes)).toBe(snapshot);
  });

  it('finds a hole in a tightly packed block', () => {
    const nodes = [];
    for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) nodes.push(node(`n${r}${c}`, c * 330, r * 230));
    const pos = findFreePosition({ x: 330, y: 230 }, size, nodes);
    nodes.forEach((n) => expect(rectsOverlap({ ...pos, ...size }, asRect(n), GAP)).toBe(false));
    // and it did not teleport far away
    expect(Math.hypot(pos.x - 330, pos.y - 230)).toBeLessThan(1500);
  });

  it('ignores hidden nodes and ids it is told to ignore', () => {
    const hidden = node('h', 0, 0, 300, 200, { hidden: true });
    expect(findFreePosition({ x: 0, y: 0 }, size, [hidden])).toEqual({ x: 0, y: 0 });
    const moving = node('m', 0, 0);
    expect(findFreePosition({ x: 0, y: 0 }, size, [moving], { ignoreIds: ['m'] })).toEqual({ x: 0, y: 0 });
  });

  it('continues past the right edge when the area is completely full', () => {
    // a solid wall of elements far larger than the search radius
    const nodes = [node('wall', -5000, -5000, 10000, 10000)];
    const pos = findFreePosition({ x: 0, y: 0 }, size, nodes);
    expect(pos.x).toBeGreaterThanOrEqual(5000);
    expect(Number.isFinite(pos.y)).toBe(true);
  });
});

describe('frames and containers', () => {
  const size = { w: 200, h: 120 };

  it('lets you place an element inside a frame', () => {
    const f = frame('f', 0, 0, 800, 600);
    expect(findFreePosition({ x: 100, y: 100 }, size, [f])).toEqual({ x: 110, y: 110 });
  });

  it('still avoids siblings inside the frame', () => {
    const f = frame('f', 0, 0, 800, 600);
    const sibling = node('s', 100, 100, 300, 200);
    const pos = findFreePosition({ x: 110, y: 110 }, size, [f, sibling]);
    expect(rectsOverlap({ ...pos, ...size }, asRect(sibling), GAP)).toBe(false);
    // and the result is still inside the frame when there is room
    expect(pos.x + size.w / 2).toBeLessThanOrEqual(800);
    expect(pos.y + size.h / 2).toBeLessThanOrEqual(600);
  });

  it('does not straddle the edge of a frame', () => {
    const f = frame('f', 0, 0, 400, 300);
    // wants to sit half in, half out of the frame's right edge
    const pos = findFreePosition({ x: 350, y: 50 }, size, [f]);
    const rect = { ...pos, ...size };
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const centerInside = cx >= 0 && cx <= 400 && cy >= 0 && cy <= 300;
    const touching = rectsOverlap(rect, asRect(f), 0);
    expect(!touching || centerInside).toBe(true);
  });

  it('recognises containers', () => {
    expect(isContainer(frame('f', 0, 0))).toBe(true);
    expect(isContainer({ type: 'docGroup', data: {} })).toBe(true);
    expect(isContainer({ type: 'layoutNode', data: { type: 'image' } })).toBe(false);
    expect(isContainer(node('n', 0, 0))).toBe(false);
    expect(isContainer(undefined)).toBe(false);
  });
});

describe('sizes', () => {
  it('prefers a measured size', () => {
    expect(getNodeSize({ width: 111, height: 222, data: { type: 'table' } })).toEqual({ w: 111, h: 222 });
    expect(getNodeSize({ measured: { width: 150, height: 90 }, data: {} })).toEqual({ w: 150, h: 90 });
  });

  it('falls back to the style, then a per-type estimate', () => {
    expect(getNodeSize({ style: { width: 500, height: 400 }, data: {} })).toEqual({ w: 500, h: 400 });
    expect(getNodeSize({ data: { type: 'chart' } })).toEqual(estimateElementSize({ type: 'chart' }));
    expect(getNodeSize({ data: {} })).toEqual({ w: 320, h: 200 });
  });

  it('estimates bigger elements bigger', () => {
    expect(estimateElementSize({ type: 'table' }).w).toBeGreaterThan(estimateElementSize({ type: 'smart-note' }).w);
    expect(estimateElementSize({ type: 'logistics-shipment' })).toEqual({ w: 500, h: 750 });
    expect(estimateElementSize({ type: 'something-new' })).toEqual({ w: 320, h: 200 });
    expect(estimateElementSize(undefined)).toEqual({ w: 320, h: 200 });
  });
});

describe('isRectInViewport', () => {
  const container = { width: 1000, height: 600 };
  it('is true for a rect inside the visible area', () => {
    expect(isRectInViewport({ x: 100, y: 100, w: 200, h: 100 }, { x: 0, y: 0, zoom: 1 }, container)).toBe(true);
  });
  it('is false when off to the right or below', () => {
    expect(isRectInViewport({ x: 950, y: 100, w: 200, h: 100 }, { x: 0, y: 0, zoom: 1 }, container)).toBe(false);
    expect(isRectInViewport({ x: 100, y: 580, w: 200, h: 100 }, { x: 0, y: 0, zoom: 1 }, container)).toBe(false);
  });
  it('accounts for pan and zoom', () => {
    // panned so flow x=500 is at the screen's left edge, zoomed out to 0.5 (shows 2000 flow px)
    const viewport = { x: -250, y: 0, zoom: 0.5 };
    expect(isRectInViewport({ x: 600, y: 100, w: 200, h: 100 }, viewport, container)).toBe(true);
    expect(isRectInViewport({ x: 100, y: 100, w: 200, h: 100 }, viewport, container)).toBe(false);
  });
  it('assumes visible when it cannot tell', () => {
    expect(isRectInViewport({ x: 0, y: 0, w: 1, h: 1 }, null, container)).toBe(true);
    expect(isRectInViewport({ x: 0, y: 0, w: 1, h: 1 }, { x: 0, y: 0, zoom: 1 }, null)).toBe(true);
  });
});

describe('property: the result never overlaps anything', () => {
  // small seeded PRNG so failures are reproducible
  const rng = (seed) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  it('holds across 300 random canvases', () => {
    const rand = rng(42);
    for (let run = 0; run < 300; run += 1) {
      const count = Math.floor(rand() * 25);
      const nodes = Array.from({ length: count }, (_, i) =>
        node(`n${i}`, Math.round(rand() * 2000 - 500), Math.round(rand() * 1500 - 300), 150 + Math.round(rand() * 400), 100 + Math.round(rand() * 300))
      );
      const size = { w: 150 + Math.round(rand() * 400), h: 100 + Math.round(rand() * 300) };
      const desired = { x: Math.round(rand() * 1500), y: Math.round(rand() * 1000) };
      const pos = findFreePosition(desired, size, nodes);
      const rect = { ...pos, ...size };
      nodes.forEach((n) => {
        expect(rectsOverlap(rect, asRect(n), GAP), `run ${run} overlaps ${n.id}`).toBe(false);
      });
      // (abs: in JavaScript -22 % 22 is -0)
      expect(Math.abs(pos.x % GRID)).toBe(0);
      expect(Math.abs(pos.y % GRID)).toBe(0);
    }
  });

  it('adding many elements to the same spot never stacks them', () => {
    const nodes = [];
    const size = { w: 300, h: 200 };
    for (let i = 0; i < 40; i += 1) {
      const pos = findFreePosition({ x: 100, y: 100 }, size, nodes);
      const rect = { ...pos, ...size };
      nodes.forEach((n) => expect(rectsOverlap(rect, asRect(n), GAP)).toBe(false));
      nodes.push(node(`n${i}`, pos.x, pos.y, size.w, size.h));
    }
    expect(nodes).toHaveLength(40);
  });
});

describe('hasCollision', () => {
  const size = { w: 300, h: 200 };
  it('is true for a real overlap and false when clear', () => {
    const blocker = node('a', 0, 0, 300, 200);
    expect(hasCollision({ x: 100, y: 100 }, size, [blocker])).toBe(true);
    expect(hasCollision({ x: 400, y: 0 }, size, [blocker])).toBe(false);
  });

  it('with gap 0 only counts actual overlap; touching-with-room is fine', () => {
    const blocker = node('a', 0, 0, 300, 200);
    expect(hasCollision({ x: 310, y: 0 }, size, [blocker])).toBe(false); // 10px apart, gap 0
    expect(hasCollision({ x: 310, y: 0 }, size, [blocker], { gap: 28 })).toBe(true);
  });

  it('ignores the node being checked', () => {
    const me = node('me', 0, 0);
    expect(hasCollision({ x: 0, y: 0 }, size, [me], { ignoreIds: ['me'] })).toBe(false);
  });

  it('is false on an empty canvas and for bad input', () => {
    expect(hasCollision({ x: 0, y: 0 }, size, [])).toBe(false);
    expect(hasCollision(undefined, undefined, undefined)).toBe(false);
  });
});

describe('elements inside a frame', () => {
  it('compares children in canvas coordinates, not frame-relative ones', () => {
    const f = frame('f', 1000, 1000, 800, 600);
    // child's stored position is relative to the frame: canvas position is (1100, 1100)
    const child = { ...node('c', 100, 100, 300, 200), parentNode: 'f' };
    const size = { w: 300, h: 200 };
    // placing at the child's canvas position collides...
    expect(hasCollision({ x: 1100, y: 1100 }, size, [f, child])).toBe(true);
    // ...but placing at the child's *relative* position (100,100) does not
    expect(hasCollision({ x: 100, y: 100 }, size, [f, child])).toBe(false);
  });

  it('avoids a child when searching for a free spot', () => {
    const f = frame('f', 1000, 1000, 800, 600);
    const child = { ...node('c', 100, 100, 300, 200), parentNode: 'f' };
    const size = { w: 300, h: 200 };
    const pos = findFreePosition({ x: 1100, y: 1100 }, size, [f, child]);
    expect(hasCollision(pos, size, [f, child], { gap: 28 })).toBe(false);
  });
});
