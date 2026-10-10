/**
 * Full-view table editor — deep component tests.
 * Covers: selection model, cell editing, structural ops via toolbar and
 * context menu, keyboard navigation, clipboard (TSV) interop, formula
 * ref-shifting end-to-end, kind routing in FullTableView, and draft reporting.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react';

import FullTableEditor from '../src/pages/WorkspacePage/components/tables/fullscreen/FullTableEditor.jsx';
import FullTableView from '../src/pages/WorkspacePage/components/tables/fullscreen/FullTableView.jsx';
import { parseTSV, selectionToTSV, pasteMatrixAt } from '../src/pages/WorkspacePage/components/tables/fullscreen/clipboard.js';
import { uid } from '../src/pages/WorkspacePage/utils/tableOps.js';

afterEach(cleanup);

const cols = [
  { key: 'item', label: 'Item' },
  { key: 'qty', label: 'Qty' },
  { key: 'price', label: 'Price' },
  { key: 'total', label: 'Total' }
];
const rows = [
  { id: 'r1', item: 'Cement', qty: 10, price: 350, total: '=B1*C1' },
  { id: 'r2', item: 'Steel', qty: 5, price: 600, total: '=B2*C2' }
];

const cellAt = (container, r, c) => container.querySelector(`[data-cell="${r}:${c}"]`);

/* ═══════════════ clipboard.js (pure) ═══════════════ */
describe('clipboard TSV interop', () => {
  it('parseTSV handles tabs, \\n and \\r\\n line endings', () => {
    expect(parseTSV('a\tb\r\nc\td')).toEqual([['a', 'b'], ['c', 'd']]);
    expect(parseTSV('x\ty\nz')).toEqual([['x', 'y'], ['z']]);
    expect(parseTSV('')).toEqual([['']]);
  });

  it('selectionToTSV serializes the evaluated values in the rect', () => {
    const evaluated = [['Cement', 10, 350, 3500], ['Steel', 5, 600, 3000]];
    expect(selectionToTSV(cols, evaluated, { r0: 0, c0: 0, r1: 1, c1: 1 }))
      .toBe('Cement\t10\nSteel\t5');
  });

  it('pasteMatrixAt writes into place without touching other cells', () => {
    const { rows: nr } = pasteMatrixAt(cols, rows, 0, 1, [['99', '1']], uid);
    expect(nr[0].qty).toBe('99');
    expect(nr[0].price).toBe('1');
    expect(nr[0].item).toBe('Cement'); // untouched
    expect(nr[1].qty).toBe(5);         // untouched
  });

  it('pasteMatrixAt expands rows and columns like a sheet', () => {
    const { cols: nc, rows: nr } = pasteMatrixAt(cols, rows, 1, 3, [['x', 'y', 'z']], uid);
    // pasting 3 cols at index 3 (D) needs cols D,E,F → 2 new
    expect(nc).toHaveLength(6);
    expect(nr[1][nc[4].key]).toBe('y');
    const grown = pasteMatrixAt(cols, rows, 3, 0, [['a', 'b']], uid); // row 4 doesn't exist
    expect(grown.rows).toHaveLength(4);
    expect(grown.rows[3].item).toBe('a'); // col key is 'item', not 'a'
  });
});

/* ═══════════════ FullTableEditor ═══════════════ */
describe('FullTableEditor — rendering & selection', () => {
  it('renders evaluated formula values, not raw formulas', () => {
    render(<FullTableEditor columns={cols} rows={rows} />);
    expect(screen.getByText('3500')).toBeTruthy();
    expect(screen.getByText('3000')).toBeTruthy();
  });

  it('single click selects without editing; label shows the cell ref', () => {
    const { container } = render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.mouseDown(cellAt(container, 1, 1), { button: 0 });
    expect(screen.queryByLabelText('Cell editor')).toBeNull(); // not editing
    expect(screen.getAllByText('B2').length).toBeGreaterThan(0); // selection label + fx bar ref
  });

  it('shift-click extends the selection rectangle', () => {
    const { container } = render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.mouseDown(cellAt(container, 0, 0), { button: 0 });
    fireEvent.mouseDown(cellAt(container, 1, 2), { button: 0, shiftKey: true });
    expect(screen.getByText('A1:C2')).toBeTruthy();
  });

  it('row-header click selects the whole row; col-header selects the column', () => {
    const { container } = render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.click(screen.getByText('2'));                 // row 2 header
    expect(screen.getByText('A2:D2')).toBeTruthy();
    fireEvent.click(screen.getByText('Qty', { selector: 'span' })); // col B header
    expect(screen.getByText('B1:B2')).toBeTruthy();
  });
});

describe('FullTableEditor — cell editing', () => {
  it('double-click opens the editor; Enter commits and moves down', () => {
    const { container } = render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.doubleClick(cellAt(container, 0, 0));
    const input = screen.getByLabelText('Cell editor');
    expect(input.value).toBe('Cement');
    fireEvent.change(input, { target: { value: 'Sand' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Sand')).toBeTruthy();
    expect(screen.getAllByText('A2').length).toBeGreaterThan(0); // selection moved down
  });

  it('typing a character replaces the cell (Excel style)', () => {
    const { container } = render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.mouseDown(cellAt(container, 0, 0), { button: 0 });
    fireEvent.keyDown(document, { key: 'z' });
    const input = screen.getByLabelText('Cell editor');
    expect(input.value).toBe('z');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('z')).toBeTruthy();
    expect(screen.queryByText('Cement')).toBeNull();
  });

  it('Escape cancels without committing', () => {
    const { container } = render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.doubleClick(cellAt(container, 0, 0));
    const input = screen.getByLabelText('Cell editor');
    expect(input.value).toBe('Cement');
    fireEvent.change(input, { target: { value: 'NOPE' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByText('Cement')).toBeTruthy();
    expect(screen.queryByText('NOPE')).toBeNull();
  });
});

describe('FullTableEditor — structural ops', () => {
  it('toolbar +Row appends a row', () => {
    render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.click(screen.getByText('+ Row'));
    expect(screen.getByText('3')).toBeTruthy(); // row 3 header exists
  });

  it('↑ Row inserts above the selection', () => {
    const onDraft = vi.fn();
    const { container } = render(<FullTableEditor columns={cols} rows={rows} onDraftChange={onDraft} />);
    fireEvent.mouseDown(cellAt(container, 1, 0), { button: 0 }); // select row 2 cell
    fireEvent.click(screen.getByText('↑ Row'));
    const latest = onDraft.mock.calls.at(-1)[1];
    expect(latest).toHaveLength(3);
    expect(latest[1].item).toBe('');            // new blank row inserted at index 1
    expect(latest[2].item).toBe('Steel');       // old row pushed down
  });

  it('✕ Row deletes the selected row', () => {
    const onDraft = vi.fn();
    const { container } = render(<FullTableEditor columns={cols} rows={rows} onDraftChange={onDraft} />);
    fireEvent.mouseDown(cellAt(container, 0, 0), { button: 0 });
    fireEvent.click(screen.getByText('✕ Row'));
    const latest = onDraft.mock.calls.at(-1)[1];
    expect(latest).toHaveLength(1);
    expect(latest[0].item).toBe('Steel');
  });

  it('inserting a column left shifts formula refs (end-to-end)', () => {
    const onDraft = vi.fn();
    const { container } = render(<FullTableEditor columns={cols} rows={rows} onDraftChange={onDraft} />);
    fireEvent.mouseDown(cellAt(container, 0, 1), { button: 0 }); // select B1
    fireEvent.click(screen.getByText('← Col'));
    const latest = onDraft.mock.calls.at(-1)[1];
    expect(latest[0].total).toBe('=C1*D1'); // B*C became C*D
  });

  it('deleting a referenced column produces #REF!', () => {
    const onDraft = vi.fn();
    const { container } = render(<FullTableEditor columns={cols} rows={rows} onDraftChange={onDraft} />);
    fireEvent.mouseDown(cellAt(container, 0, 1), { button: 0 }); // select qty col (B)
    fireEvent.click(screen.getByText('✕ Col'));
    const latest = onDraft.mock.calls.at(-1)[1];
    // B deleted → B1 ref dies as #REF!; old C1 shifts left → becomes B1
    expect(latest[0].total).toBe('=#REF!*B1');
  });

  it('Clear empties the selected cells', () => {
    const onDraft = vi.fn();
    const { container } = render(<FullTableEditor columns={cols} rows={rows} onDraftChange={onDraft} />);
    fireEvent.mouseDown(cellAt(container, 0, 0), { button: 0 });
    fireEvent.mouseDown(cellAt(container, 0, 1), { button: 0, shiftKey: true });
    fireEvent.click(screen.getByText('Clear'));
    const latest = onDraft.mock.calls.at(-1)[1];
    expect(latest[0].item).toBe('');
    expect(latest[0].qty).toBe('');
    expect(latest[0].price).toBe(350); // outside selection untouched
  });
});

describe('FullTableEditor — context menu', () => {
  it('right-click opens the menu and Insert row above works', () => {
    const onDraft = vi.fn();
    const { container } = render(<FullTableEditor columns={cols} rows={rows} onDraftChange={onDraft} />);
    fireEvent.contextMenu(screen.getByText('1')); // row 1 header
    const menuItem = screen.getByRole('menuitem', { name: 'Insert row above' });
    fireEvent.click(menuItem);
    const latest = onDraft.mock.calls.at(-1)[1];
    expect(latest).toHaveLength(3);
    expect(latest[0].item).toBe('');
    expect(latest[1].item).toBe('Cement');
  });

  it('menu closes on outside click', () => {
    const { container } = render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.contextMenu(screen.getByText('1'));
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('FullTableEditor — keyboard', () => {
  it('arrow keys move the selection', () => {
    const { container } = render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.mouseDown(cellAt(container, 0, 0), { button: 0 });
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(screen.getAllByText('B2').length).toBeGreaterThan(0);
  });

  it('Delete key clears the selection', () => {
    const onDraft = vi.fn();
    const { container } = render(<FullTableEditor columns={cols} rows={rows} onDraftChange={onDraft} />);
    fireEvent.mouseDown(cellAt(container, 0, 0), { button: 0 });
    fireEvent.keyDown(document, { key: 'Delete' });
    expect(onDraft.mock.calls.at(-1)[1][0].item).toBe('');
  });

  it('Ctrl+C writes TSV to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { container } = render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.mouseDown(cellAt(container, 0, 0), { button: 0 });
    await act(async () => { fireEvent.keyDown(document, { key: 'c', ctrlKey: true }); });
    expect(writeText).toHaveBeenCalledWith('Cement');
  });
});

describe('FullTableEditor — locked mode', () => {
  it('hides all editing affordances', () => {
    render(<FullTableEditor columns={cols} rows={rows} locked />);
    expect(screen.queryByText('+ Row')).toBeNull();
    expect(screen.queryByText('Save')).toBeNull();
  });
});

/* ═══════════════ FullTableView kind routing ═══════════════ */
describe('FullTableView — kind routing', () => {
  it('basic-table renders just the spreadsheet grid', () => {
    render(<FullTableView kind="basic-table" columns={cols} rows={rows} />);
    expect(screen.getByText('3500')).toBeTruthy();
    expect(screen.queryByText('Paged view')).toBeNull();
    expect(screen.queryByText('Group by…')).toBeNull();
  });

  it('data-table offers a Paged view toggle that swaps to the classic table', () => {
    render(<FullTableView kind="data-table" columns={cols} rows={rows} />);
    expect(screen.getByText('3500')).toBeTruthy();
    fireEvent.click(screen.getByText('Paged view'));
    expect(screen.getByPlaceholderText('Filter rows…')).toBeTruthy(); // DataTable chrome
    expect(screen.getByText('Spreadsheet view')).toBeTruthy();       // toggle flipped
  });

  it('pivot-table shows the source grid and the pivot side panel', () => {
    render(<FullTableView kind="pivot-table" columns={cols} rows={rows} config={{}} />);
    expect(screen.getByText('3500')).toBeTruthy();      // grid
    expect(screen.getByText('Group by…')).toBeTruthy(); // side panel
    expect(screen.getByText('Add measure')).toBeTruthy();
  });

  it('pivot config changes flow into the upward draft', () => {
    const onDraft = vi.fn();
    render(<FullTableView kind="pivot-table" columns={cols} rows={rows} config={{}} onDraftChange={onDraft} />);
    fireEvent.change(screen.getByTitle('Group by'), { target: { value: 'item' } });
    fireEvent.click(screen.getByText('Add measure'));
    fireEvent.change(screen.getByTitle('Measure column'), { target: { value: 'price' } });
    const lastCall = onDraft.mock.calls.at(-1);
    expect(lastCall[2].groupKeys).toEqual(['item']);
    expect(lastCall[2].measures[0].key).toBe('price');
    // and the live pivot result renders
    expect(screen.getByText('Sum of Price')).toBeTruthy();
    expect(screen.getByText('950')).toBeTruthy(); // total row
  });
});
