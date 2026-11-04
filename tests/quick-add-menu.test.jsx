/**
 * QuickAddMenu — the "add next element" popover shown when a connection is
 * dropped on empty canvas.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import QuickAddMenu, { QUICK_ADD_ELEMENTS } from '../src/pages/WorkspacePage/components/QuickAddMenu.jsx';

// vitest runs without globals here, so RTL's auto-cleanup is not registered
afterEach(cleanup);

const setup = (props = {}) => {
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(<QuickAddMenu x={100} y={100} onPick={onPick} onClose={onClose} {...props} />);
  return { onPick, onClose, input: screen.getByPlaceholderText('Add next element…') };
};

describe('QuickAddMenu', () => {
  it('lists every quick-add element', () => {
    setup();
    for (const item of QUICK_ADD_ELEMENTS) {
      expect(screen.getByText(item.name)).toBeTruthy();
    }
  });

  it('only offers elements the canvas can create from a plain object', () => {
    const types = QUICK_ADD_ELEMENTS.map((i) => i.element.type);
    expect(types).toEqual(
      expect.arrayContaining(['textbox', 'table', 'chart', 'list', 'task-card', 'smart-note', 'calendar-event'])
    );
    const ids = QUICK_ADD_ELEMENTS.map((i) => i.element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('filters by name and hint', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'calend' } });
    expect(screen.getByText('Calendar Event')).toBeTruthy();
    expect(screen.queryByText('Table')).toBeNull();

    fireEvent.change(input, { target: { value: 'owner' } }); // Task Card hint
    expect(screen.getByText('Task Card')).toBeTruthy();
  });

  it('shows an empty state when nothing matches', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'zzzzzz' } });
    expect(screen.getByText('No matching element')).toBeTruthy();
  });

  it('picks the clicked element', () => {
    const { onPick } = setup();
    fireEvent.click(screen.getByText('Table'));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0]).toMatchObject({ type: 'table' });
  });

  it('supports arrow keys + Enter', () => {
    const { onPick, input } = setup();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPick.mock.calls[0][0]).toBe(QUICK_ADD_ELEMENTS[1].element);
  });

  it('closes on Escape and on an outside mousedown, but not on an inside one', () => {
    const { onClose, input } = setup();
    fireEvent.mouseDown(input);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('keeps itself inside the viewport', () => {
    setup({ x: 99999, y: 99999 });
    const dialog = screen.getByRole('dialog');
    const left = parseFloat(dialog.style.left);
    const top = parseFloat(dialog.style.top);
    expect(left).toBeLessThanOrEqual(window.innerWidth);
    expect(top).toBeLessThanOrEqual(window.innerHeight);
    expect(left).toBeGreaterThanOrEqual(8);
  });
});
