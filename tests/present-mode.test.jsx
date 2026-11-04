/**
 * Present mode: slide ordering and the presentation control bar.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

import {
  getPresentationStops,
  clampPresentIndex,
  nextPresentIndex,
  prevPresentIndex,
} from '../src/pages/WorkspacePage/utils/presentationUtils.js';
import PresentHUD from '../src/pages/WorkspacePage/components/PresentHUD.jsx';

afterEach(cleanup);

const el = (id, x, y, data = {}, extra = {}) => ({ id, type: 'elementNode', position: { x, y }, data, ...extra });
const frame = (id, x, y, data = {}) => ({ id, type: 'layoutNode', position: { x, y }, data: { type: 'frame', ...data } });
const ids = (stops) => stops.map((s) => s.id);

describe('getPresentationStops', () => {
  it('orders numbered elements by their number', () => {
    const nodes = [
      el('c', 0, 0, { sequenceNumber: 3 }),
      el('a', 900, 900, { sequenceNumber: 1 }),
      el('b', 500, 500, { sequenceNumber: 2 }),
    ];
    expect(ids(getPresentationStops(nodes))).toEqual(['a', 'b', 'c']);
  });

  it('puts numbered elements before unnumbered ones', () => {
    const nodes = [el('u', 0, 0), el('n', 900, 900, { sequenceNumber: 5 })];
    expect(ids(getPresentationStops(nodes))).toEqual(['n', 'u']);
  });

  it('reads unnumbered elements top-to-bottom, then left-to-right', () => {
    const nodes = [
      el('bottom-left', 0, 400),
      el('top-right', 600, 10),
      el('top-left', 0, 0),
      el('bottom-right', 600, 410),
    ];
    expect(ids(getPresentationStops(nodes))).toEqual(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
  });

  it('treats elements on roughly the same row as one row', () => {
    const nodes = [el('right', 500, 30), el('left', 0, 0)]; // 30px apart vertically
    expect(ids(getPresentationStops(nodes))).toEqual(['left', 'right']);
  });

  it('uses frames as the slides when there are any', () => {
    const nodes = [
      el('loose', 0, 0),
      frame('f2', 800, 0, { sequenceNumber: 2 }),
      frame('f1', 0, 600, { sequenceNumber: 1 }),
    ];
    expect(ids(getPresentationStops(nodes))).toEqual(['f1', 'f2']);
  });

  it('falls back to elements when there are no frames', () => {
    expect(ids(getPresentationStops([el('x', 0, 0), el('y', 400, 0)]))).toEqual(['x', 'y']);
  });

  it('skips hidden nodes and pure grouping containers', () => {
    const nodes = [
      el('keep', 0, 0),
      el('gone', 400, 0, {}, { hidden: true }),
      { id: 'grp', type: 'docGroup', position: { x: 0, y: 0 }, data: {} },
      { id: 'box', type: 'layoutNode', position: { x: 0, y: 0 }, data: { isGroupContainer: true } },
    ];
    expect(ids(getPresentationStops(nodes))).toEqual(['keep']);
  });

  it('labels a slide from its title, name or label, with a fallback', () => {
    const stops = getPresentationStops([
      el('t', 0, 0, { title: 'Kickoff', name: 'ignored' }),
      el('n', 400, 0, { name: 'Budget' }),
      el('l', 800, 0, { label: 'Notes' }),
      el('d', 1200, 0, { type: 'table' }),
      el('z', 1600, 0, {}),
    ]);
    expect(stops.map((s) => s.label)).toEqual(['Kickoff', 'Budget', 'Notes', 'table', 'Element']);
  });

  it('copes with empty and malformed input', () => {
    expect(getPresentationStops()).toEqual([]);
    expect(getPresentationStops([])).toEqual([]);
    expect(getPresentationStops([null, undefined, el('ok', 0, 0)])).toHaveLength(1);
    expect(getPresentationStops([{ id: 'nopos', data: {} }])).toHaveLength(1);
  });
});

describe('slide navigation', () => {
  it('clamps between the overview (-1) and the last slide', () => {
    expect(clampPresentIndex(-5, 4)).toBe(-1);
    expect(clampPresentIndex(9, 4)).toBe(3);
    expect(clampPresentIndex(2, 4)).toBe(2);
    expect(clampPresentIndex(0, 0)).toBe(-1);
  });

  it('next stops at the last slide; previous goes back to the overview', () => {
    expect(nextPresentIndex(-1, 3)).toBe(0);
    expect(nextPresentIndex(2, 3)).toBe(2);
    expect(prevPresentIndex(1, 3)).toBe(0);
    expect(prevPresentIndex(0, 3)).toBe(-1);
    expect(prevPresentIndex(-1, 3)).toBe(-1);
  });

  it('with no slides, next stays on the overview', () => {
    expect(nextPresentIndex(-1, 0)).toBe(-1);
  });
});

describe('PresentHUD', () => {
  const setup = (over = {}) => {
    const handlers = {
      onNext: vi.fn(), onPrev: vi.fn(), onFirst: vi.fn(), onLast: vi.fn(), onOverview: vi.fn(), onExit: vi.fn(),
    };
    render(<PresentHUD index={1} total={4} label="Budget" {...handlers} {...over} />);
    return handlers;
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the position and the slide name', () => {
    setup();
    expect(screen.getByText('2 / 4')).toBeTruthy();
    expect(screen.getByText('Budget')).toBeTruthy();
  });

  it('shows "Overview" on the overview and "Nothing to present" when empty', () => {
    setup({ index: -1 });
    expect(screen.getByText('Overview')).toBeTruthy();
    cleanup();
    render(<PresentHUD index={-1} total={0} onNext={() => {}} onPrev={() => {}} onFirst={() => {}} onLast={() => {}} onOverview={() => {}} onExit={() => {}} />);
    expect(screen.getByText('Nothing to present')).toBeTruthy();
  });

  it.each([
    ['ArrowRight', 'onNext'],
    ['ArrowDown', 'onNext'],
    ['PageDown', 'onNext'],
    [' ', 'onNext'],
    ['ArrowLeft', 'onPrev'],
    ['ArrowUp', 'onPrev'],
    ['PageUp', 'onPrev'],
    ['Home', 'onFirst'],
    ['End', 'onLast'],
    ['o', 'onOverview'],
    ['Escape', 'onExit'],
  ])('%j triggers %s', (key, handler) => {
    const h = setup();
    fireEvent.keyDown(window, { key });
    expect(h[handler]).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated keys and modified shortcuts', () => {
    const h = setup();
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'ArrowRight', metaKey: true });
    Object.values(h).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });

  it('does not steal keys from a field being typed in', () => {
    const h = setup();
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'ArrowRight' });
    fireEvent.keyDown(input, { key: ' ' });
    expect(h.onNext).not.toHaveBeenCalled();
    input.remove();
  });

  it('keeps handled keys away from the rest of the canvas', () => {
    setup();
    const reachedCanvas = vi.fn();
    document.addEventListener('keydown', reachedCanvas); // a bubbling canvas-level listener
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(reachedCanvas).not.toHaveBeenCalled();
    document.removeEventListener('keydown', reachedCanvas);
  });

  it('buttons call the same handlers', () => {
    const h = setup();
    fireEvent.click(screen.getByLabelText('Next slide'));
    fireEvent.click(screen.getByLabelText('Previous slide'));
    fireEvent.click(screen.getByLabelText('Overview'));
    fireEvent.click(screen.getByLabelText('Exit presentation'));
    expect(h.onNext).toHaveBeenCalledTimes(1);
    expect(h.onPrev).toHaveBeenCalledTimes(1);
    expect(h.onOverview).toHaveBeenCalledTimes(1);
    expect(h.onExit).toHaveBeenCalledTimes(1);
  });

  it('disables previous/overview on the overview and next on the last slide', () => {
    setup({ index: -1 });
    expect(screen.getByLabelText('Previous slide').disabled).toBe(true);
    expect(screen.getByLabelText('Overview').disabled).toBe(true);
    cleanup();
    setup({ index: 3, total: 4 });
    expect(screen.getByLabelText('Next slide').disabled).toBe(true);
    expect(screen.getByLabelText('Previous slide').disabled).toBe(false);
  });

  it('fades out when idle and comes back on mouse movement', () => {
    setup();
    const bar = screen.getByRole('toolbar');
    expect(bar.className).toContain('opacity-100');
    act(() => { vi.advanceTimersByTime(2600); });
    expect(bar.className).toContain('opacity-0');
    expect(bar.className).toContain('pointer-events-none');
    act(() => { fireEvent.mouseMove(window); });
    expect(bar.className).toContain('opacity-100');
  });

  it('shows the shortcut hint briefly, then removes it', () => {
    setup();
    expect(screen.getByText(/Esc to exit/)).toBeTruthy();
    act(() => { vi.advanceTimersByTime(4100); });
    expect(screen.queryByText(/Esc to exit/)).toBeNull();
  });

  it('stops listening for keys when it unmounts', () => {
    const h = setup();
    cleanup();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(h.onNext).not.toHaveBeenCalled();
  });
});
