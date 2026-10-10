/**
 * Phase 4 — full-view polish: formula bar, selection stats, formula helper,
 * totals row, column resize. Plus formulaCatalog integrity tests.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react';

import FullTableEditor from '../src/pages/WorkspacePage/components/tables/fullscreen/FullTableEditor.jsx';
import FullTableView from '../src/pages/WorkspacePage/components/tables/fullscreen/FullTableView.jsx';
import { CATEGORIES, searchFunctions, ALL_FUNCTIONS } from '../src/pages/WorkspacePage/utils/formulaCatalog.js';
import { SUPPORTED_FORMULAS } from 'hot-formula-parser';

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

/* ═══════════════ formulaCatalog ═══════════════ */
describe('formulaCatalog', () => {
  it('every cataloged function is genuinely supported by the engine', () => {
    const supported = new Set(SUPPORTED_FORMULAS.map(String));
    for (const cat of CATEGORIES) {
      for (const fn of cat.fns) expect(supported.has(fn), `${fn} should be supported`).toBe(true);
    }
  });

  it('covers all supported functions across categories + More', () => {
    // SUPPORTED_FORMULAS has a few duplicate entries — compare unique names
    const cataloged = new Set(CATEGORIES.flatMap(c => c.fns));
    expect(cataloged.size).toBe(new Set(SUPPORTED_FORMULAS.map(String)).size);
  });

  it('search finds by partial name', () => {
    const hits = searchFunctions('sum');
    expect(hits.some(h => h.name === 'SUM')).toBe(true);
    expect(hits.some(h => h.name === 'SUMIF')).toBe(true);
    expect(searchFunctions('zzzz')).toEqual([]);
  });
});

/* ═══════════════ FormulaBar ═══════════════ */
describe('FullTableEditor — formula bar', () => {
  it('shows the active cell ref and its raw formula', () => {
    const { container } = render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.mouseDown(cellAt(container, 0, 3), { button: 0 }); // D1 = '=B1*C1'
    expect(screen.getAllByText('D1').length).toBeGreaterThan(0); // bar ref + toolbar label
    expect(screen.getByDisplayValue('=B1*C1')).toBeTruthy();
  });

  it('editing in the bar commits to the cell', () => {
    const onDraft = vi.fn();
    const { container } = render(<FullTableEditor columns={cols} rows={rows} onDraftChange={onDraft} />);
    fireEvent.mouseDown(cellAt(container, 0, 0), { button: 0 });
    const bar = screen.getByLabelText('Formula bar');
    fireEvent.focus(bar);
    fireEvent.change(bar, { target: { value: 'Sand' } });
    fireEvent.keyDown(bar, { key: 'Enter' });
    expect(screen.getByText('Sand')).toBeTruthy();
    expect(onDraft.mock.calls.at(-1)[1][0].item).toBe('Sand');
  });
});

/* ═══════════════ SelectionStatusBar ═══════════════ */
describe('FullTableEditor — selection stats', () => {
  it('shows Sum/Avg/Count over the selected range', () => {
    const { container } = render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.mouseDown(cellAt(container, 0, 1), { button: 0 });
    fireEvent.mouseDown(cellAt(container, 1, 1), { button: 0, shiftKey: true }); // qty column both rows
    expect(screen.getByText('Count:')).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();  // sum 10+5
    expect(screen.getByText('7.50')).toBeTruthy(); // avg
  });

  it('shows only Count for a text-only selection', () => {
    const { container } = render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.mouseDown(cellAt(container, 0, 0), { button: 0 });
    fireEvent.mouseDown(cellAt(container, 1, 0), { button: 0, shiftKey: true });
    expect(screen.getByText('Count:')).toBeTruthy();
    expect(screen.queryByText('Sum:')).toBeNull();
  });
});

/* ═══════════════ FormulaHelper ═══════════════ */
describe('FullTableEditor — formula helper', () => {
  it('fx button opens a searchable categorized function panel', () => {
    render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.click(screen.getByTitle('Insert function'));
    expect(screen.getByRole('dialog', { name: 'Insert function' })).toBeTruthy();
    expect(screen.getByText('Math & aggregation')).toBeTruthy();
    expect(screen.getByText('SUMIF')).toBeTruthy();
  });

  it('search filters and clicking inserts =FN( into the cell editor', () => {
    const onDraft = vi.fn();
    const { container } = render(<FullTableEditor columns={cols} rows={rows} onDraftChange={onDraft} />);
    fireEvent.mouseDown(cellAt(container, 1, 2), { button: 0 }); // select C2
    fireEvent.click(screen.getByTitle('Insert function'));
    fireEvent.change(screen.getByPlaceholderText(/Search/), { target: { value: 'sumif' } });
    fireEvent.click(screen.getByText('SUMIFS'));
    const input = screen.getByDisplayValue('=SUMIFS(');
    expect(input).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' }); // commit
    expect(onDraft.mock.calls.at(-1)[1][1].price).toBe('=SUMIFS(');
  });
});

/* ═══════════════ totals row + column resize ═══════════════ */
describe('FullTableEditor — totals row', () => {
  it('Σ toggle shows a pinned totals row with column sums', () => {
    render(<FullTableEditor columns={cols} rows={rows} />);
    fireEvent.click(screen.getByTitle('Toggle totals row'));
    const foot = screen.getByTestId('totals-row');
    expect(foot).toBeTruthy();
    // qty col sum = 15, price sum = 950, total col = 6500 (evaluated formulas)
    expect(foot.textContent).toContain('15');
    expect(foot.textContent).toContain('950');
    expect(foot.textContent).toContain('6500');
  });
});

describe('FullTableEditor — column resize', () => {
  it('dragging a header edge resizes and reports widths', () => {
    const onWidths = vi.fn();
    const { container } = render(
      <FullTableEditor columns={cols} rows={rows} onWidthsChange={onWidths} />
    );
    const handle = screen.getByTestId('col-resize-1'); // qty column edge
    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 160 });
    fireEvent.mouseUp(document);
    expect(onWidths).toHaveBeenCalled();
    expect(onWidths.mock.calls.at(-1)[0].qty).toBe(150); // 90 + 60 drag
  });
});

/* ═══════════════ width persistence round-trip ═══════════════ */
describe('FullTableView — colWidths persistence', () => {
  it('widths stored in config flow back to the editor', () => {
    const config = { colWidths: { qty: 200 } };
    const { container } = render(
      <FullTableView kind="basic-table" columns={cols} rows={rows} config={config} />
    );
    const qtyHeader = container.querySelectorAll('th')[2]; // #, Item, Qty
    expect(qtyHeader.style.width).toBe('200px');
  });
});
