/**
 * Phase 3 — fillSeries (drag-fill + relative ref shifting) and table history
 * (undo/redo) deep tests, plus FullTableEditor integration.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup, renderHook, act } from '@testing-library/react';

import { fillFormula, fillRange } from '../src/pages/WorkspacePage/utils/fillSeries.js';
import useTableHistory from '../src/pages/WorkspacePage/components/tables/fullscreen/useTableHistory.js';
import FullTableEditor from '../src/pages/WorkspacePage/components/tables/fullscreen/FullTableEditor.jsx';

afterEach(cleanup);

const C = (key) => ({ key, label: key.toUpperCase() });
const cols = () => [C('a'), C('b'), C('c'), C('d')];

/* ═══════════════ fillFormula ═══════════════ */
describe('fillFormula — relative/absolute ref shifting', () => {
  it('shifts refs by the cell offset when filling down', () => {
    expect(fillFormula('=B1*C1', 2, 0)).toBe('=B3*C3');
  });

  it('shifts column refs when filling right', () => {
    expect(fillFormula('=A1+B1', 0, 1)).toBe('=B1+C1');
  });

  it('respects $-pinned axes', () => {
    expect(fillFormula('=$A$1', 5, 5)).toBe('=$A$1');          // fully absolute
    expect(fillFormula('=A$1', 0, 2)).toBe('=C$1');           // row pinned
    expect(fillFormula('=$A1', 3, 0)).toBe('=$A4');           // col pinned
    expect(fillFormula('=A$1+$B2', 1, 1)).toBe('=B$1+$B3');   // mixed
  });

  it('produces #REF! when a shift would leave the grid', () => {
    expect(fillFormula('=A1', -1, 0)).toBe('=#REF!');   // filling up past row 1
    expect(fillFormula('=A1', 0, -1)).toBe('=#REF!');   // filling left past col A
  });

  it('does not corrupt function names or quoted strings', () => {
    expect(fillFormula('=LOG10(A1)', 1, 0)).toBe('=LOG10(A2)');
    expect(fillFormula('=CONCATENATE("B5", A1)', 1, 0)).toBe('=CONCATENATE("B5", A2)');
  });

  it('ignores non-formula values', () => {
    expect(fillFormula('42', 1, 0)).toBe('42');
    expect(fillFormula(42, 1, 0)).toBe(42);
  });
});

/* ═══════════════ fillRange ═══════════════ */
describe('fillRange — drag fill', () => {
  const c = cols();

  it('fills values down from a single-cell source', () => {
    const rows = [{ id: 'r1', a: 'X', b: '' }, { id: 'r2', a: '', b: '' }, { id: 'r3', a: '', b: '' }];
    const out = fillRange(c, rows, { r0: 0, c0: 0, r1: 0, c1: 0 }, { r0: 0, c0: 0, r1: 2, c1: 0 });
    expect(out[1].a).toBe('X');
    expect(out[2].a).toBe('X');
    expect(rows[1].a).toBe(''); // immutable
  });

  it('shifts formulas per-row when filling down', () => {
    const rows = [
      { id: 'r1', a: 1, b: 2, c: '=A1*B1' },
      { id: 'r2', a: 3, b: 4, c: '' },
      { id: 'r3', a: 5, b: 6, c: '' }
    ];
    const out = fillRange(c, rows, { r0: 0, c0: 2, r1: 0, c1: 2 }, { r0: 0, c0: 2, r1: 2, c1: 2 });
    expect(out[1].c).toBe('=A2*B2');
    expect(out[2].c).toBe('=A3*B3');
    expect(out[0].c).toBe('=A1*B1'); // source untouched
  });

  it('fills right across columns', () => {
    const rows = [{ id: 'r1', a: 7, b: '=A1*2', c: '', d: '' }];
    const out = fillRange(c, rows, { r0: 0, c0: 1, r1: 0, c1: 1 }, { r0: 0, c0: 1, r1: 0, c1: 3 });
    expect(out[0].c).toBe('=B1*2');
    expect(out[0].d).toBe('=C1*2');
  });

  it('tiles a multi-cell source pattern (Excel repeat)', () => {
    const rows = [
      { id: 'r1', a: 'X', b: '' },
      { id: 'r2', a: 'Y', b: '' },
      { id: 'r3', a: '', b: '' },
      { id: 'r4', a: '', b: '' }
    ];
    const out = fillRange(c, rows, { r0: 0, c0: 0, r1: 1, c1: 0 }, { r0: 0, c0: 0, r1: 3, c1: 0 });
    expect(out[2].a).toBe('X'); // pattern repeats
    expect(out[3].a).toBe('Y');
  });

  it('fills upward', () => {
    const rows = [
      { id: 'r1', a: '', b: '' },
      { id: 'r2', a: '', b: '' },
      { id: 'r3', a: '=B3*2', b: '' }
    ];
    const out = fillRange(c, rows, { r0: 2, c0: 0, r1: 2, c1: 0 }, { r0: 0, c0: 0, r1: 2, c1: 0 });
    expect(out[1].a).toBe('=B2*2');
    expect(out[0].a).toBe('=B1*2');
  });
});

/* ═══════════════ useTableHistory ═══════════════ */
describe('useTableHistory', () => {
  it('undo returns the pushed snapshot; redo replays it', () => {
    const { result } = renderHook(() => useTableHistory());
    const s0 = { cols: ['a'], rows: [1] };
    const s1 = { cols: ['a'], rows: [2] };

    expect(result.current.canUndo).toBe(false);
    act(() => result.current.push(s0));
    expect(result.current.canUndo).toBe(true);

    let snap;
    act(() => { snap = result.current.undo(s1); });
    expect(snap).toBe(s0);
    expect(result.current.canRedo).toBe(true);

    act(() => { snap = result.current.redo(s0); });
    expect(snap).toBe(s1);
    expect(result.current.canRedo).toBe(false);
  });

  it('a new mutation clears the redo stack', () => {
    const { result } = renderHook(() => useTableHistory());
    const s0 = { rows: [1] }, s1 = { rows: [2] }, s2 = { rows: [3] };
    act(() => { result.current.push(s0); result.current.push(s1); });
    act(() => { result.current.undo(s2); });
    expect(result.current.canRedo).toBe(true);
    act(() => { result.current.push({ rows: [99] }); });
    expect(result.current.canRedo).toBe(false);
  });

  it('caps history at 50 entries', () => {
    const { result } = renderHook(() => useTableHistory());
    act(() => {
      for (let i = 0; i < 60; i++) result.current.push({ i });
    });
    let count = 0;
    act(() => { while (result.current.undo({ i: 999 })) count++; });
    expect(count).toBe(50);
  });
});

/* ═══════════════ FullTableEditor integration ═══════════════ */
describe('FullTableEditor — undo/redo + fill handle', () => {
  const tcols = [
    { key: 'item', label: 'Item' }, { key: 'qty', label: 'Qty' }, { key: 'total', label: 'Total' }
  ];
  const trows = [
    { id: 'r1', item: 'Cement', qty: 10, total: '=B1*2' },
    { id: 'r2', item: 'Steel', qty: 5, total: '' }
  ];
  const cellAt = (container, r, c) => container.querySelector(`[data-cell="${r}:${c}"]`);

  it('Ctrl+Z undoes a cell edit; Ctrl+Y redoes it', () => {
    const { container } = render(<FullTableEditor columns={tcols} rows={trows} />);
    fireEvent.doubleClick(cellAt(container, 0, 0));
    const input = screen.getByLabelText('Cell editor');
    expect(input.value).toBe('Cement');
    fireEvent.change(input, { target: { value: 'Sand' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Sand')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
    expect(screen.getByText('Cement')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'y', ctrlKey: true });
    expect(screen.getByText('Sand')).toBeTruthy();
  });

  it('Ctrl+Z undoes a structural op (row delete restores data)', () => {
    const onDraft = vi.fn();
    const { container } = render(<FullTableEditor columns={tcols} rows={trows} onDraftChange={onDraft} />);
    fireEvent.mouseDown(cellAt(container, 0, 0), { button: 0 });
    fireEvent.click(screen.getByText('✕ Row'));
    expect(onDraft.mock.calls.at(-1)[1]).toHaveLength(1);

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
    expect(onDraft.mock.calls.at(-1)[1]).toHaveLength(2);
    expect(onDraft.mock.calls.at(-1)[1][0].item).toBe('Cement');
  });

  it('fill handle renders at the selection bottom-right and drag-fills', () => {
    const onDraft = vi.fn();
    const { container } = render(<FullTableEditor columns={tcols} rows={trows} onDraftChange={onDraft} />);
    fireEvent.mouseDown(cellAt(container, 0, 2), { button: 0 }); // select C1 (=B1*2)
    const handle = screen.getByTestId('fill-handle');
    expect(handle).toBeTruthy();

    // drag down one row then release
    fireEvent.mouseDown(handle);
    fireEvent.mouseEnter(cellAt(container, 1, 2), { buttons: 1 });
    fireEvent.mouseUp(document);

    const latest = onDraft.mock.calls.at(-1)[1];
    expect(latest[1].total).toBe('=B2*2'); // formula shifted down
  });
});
