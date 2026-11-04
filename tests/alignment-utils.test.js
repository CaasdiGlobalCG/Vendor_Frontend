import { describe, it, expect } from 'vitest';
import { alignRects, findGuides } from '../src/pages/WorkspacePage/utils/alignmentUtils.js';

const r = (id, x, y, w, h) => ({ id, x, y, w, h });

describe('alignRects', () => {
  const rects = [r('a', 0, 0, 100, 50), r('b', 200, 40, 60, 80), r('c', 400, 10, 200, 30)];

  it('aligns left / right edges to the selection bounds', () => {
    expect(alignRects(rects, 'left')).toEqual({ b: { x: 0, y: 40 }, c: { x: 0, y: 10 } });
    const right = alignRects(rects, 'right'); // bounds: 0..600
    expect(right.a.x).toBe(500);
    expect(right.b.x).toBe(540);
    expect(right.c).toBeUndefined(); // already flush right
  });

  it('centres on the selection, using each element\'s real size', () => {
    const out = alignRects(rects, 'centerH'); // centre x = 300
    expect(out.a.x).toBe(250);
    expect(out.b.x).toBe(270);
    expect(out.c.x).toBe(200);
  });

  it('aligns top / bottom / middle', () => {
    expect(alignRects(rects, 'top').b).toEqual({ x: 200, y: 0 });
    expect(alignRects(rects, 'bottom').a).toEqual({ x: 0, y: 70 }); // bounds bottom = 120
    expect(alignRects(rects, 'centerV').c.y).toBe(45);
  });

  it('distributes with equal gaps and keeps the outer two in place', () => {
    const out = alignRects(rects, 'distributeH');
    // span 0..600, widths 100+60+200 = 360, gap = 120
    expect(out.a).toBeUndefined();
    expect(out.b).toEqual({ x: 220, y: 40 });
    expect(out.c).toBeUndefined(); // 220 + 60 + 120 = 400, already there
  });

  it('distributes vertically by gaps, not centres', () => {
    const col = [r('a', 0, 0, 10, 100), r('b', 0, 130, 10, 20), r('c', 0, 300, 10, 100)];
    const out = alignRects(col, 'distributeV'); // span 400, heights 220, gap 90
    expect(out.b).toEqual({ x: 0, y: 190 });
  });

  it('needs three elements to distribute and two to align', () => {
    expect(alignRects([r('a', 0, 0, 10, 10), r('b', 50, 0, 10, 10)], 'distributeH')).toEqual({});
    expect(alignRects([r('a', 0, 0, 10, 10)], 'left')).toEqual({});
    expect(alignRects([], 'left')).toEqual({});
  });

  it('ignores unknown modes', () => {
    expect(alignRects(rects, 'sideways')).toEqual({});
  });
});

describe('findGuides', () => {
  const others = [r('x', 100, 100, 200, 100)];

  it('finds a left-edge match and the shift that makes it exact', () => {
    const g = findGuides(r('m', 103, 400, 50, 50), others, 6);
    expect(g.vertical).toBe(100);
    expect(g.dx).toBe(-3);
    expect(g.horizontal).toBeNull();
    expect(g.dy).toBe(0);
  });

  it('matches centres and far edges, on both axes', () => {
    // moving centre x = 200 matches other centre x = 200; bottom 200 matches bottom 200
    const g = findGuides(r('m', 175, 140, 50, 60), others, 6);
    expect(g.vertical).toBe(200);
    expect(g.dx).toBe(0);
    expect(g.horizontal).toBe(200);
    expect(g.dy).toBe(0);
  });

  it('reports nothing outside the threshold and ignores itself', () => {
    expect(findGuides(r('m', 500, 500, 50, 50), others, 6)).toEqual({ vertical: null, horizontal: null, dx: 0, dy: 0 });
    expect(findGuides(r('x', 100, 100, 200, 100), others, 6).vertical).toBeNull();
  });

  it('picks the nearest of several candidates', () => {
    const many = [r('a', 100, 0, 10, 10), r('b', 104, 0, 10, 10)];
    const g = findGuides(r('m', 103, 300, 10, 10), many, 6);
    expect(g.vertical).toBe(104);
    expect(g.dx).toBe(1);
  });
});
