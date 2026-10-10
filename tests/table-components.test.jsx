/**
 * Table components — EditableGrid / DataTable / PivotTable.
 * Covers: rendering, formula display, cell editing, save persistence,
 * sorting/filtering/pagination, and pivot grouping.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, screen, cleanup, waitFor } from '@testing-library/react';

import EditableGrid from '../src/pages/WorkspacePage/components/tables/EditableGrid.jsx';
import DataTable from '../src/pages/WorkspacePage/components/tables/DataTable.jsx';
import PivotTable from '../src/pages/WorkspacePage/components/tables/PivotTable.jsx';
import TableRenderer from '../src/pages/WorkspacePage/components/forms/TableRenderer.jsx';

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

/* ═══════════════ EditableGrid ═══════════════ */
describe('EditableGrid — Excel-style table', () => {
  it('renders evaluated formula values, not raw formulas', () => {
    render(<EditableGrid columns={cols} rows={rows} />);
    expect(screen.getByText('3500')).toBeTruthy(); // 10*350
    expect(screen.getByText('3000')).toBeTruthy(); // 5*600
    expect(screen.queryByText('=B1*C1')).toBeNull();
  });

  it('shows column letters and row numbers', () => {
    const { container } = render(<EditableGrid columns={cols} rows={rows} />);
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('D')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('click-to-edit commits a new cell value', () => {
    render(<EditableGrid columns={cols} rows={rows} />);
    fireEvent.click(screen.getByText('Cement'));
    const input = screen.getByDisplayValue('Cement');
    fireEvent.change(input, { target: { value: 'Sand' } });
    fireEvent.blur(input);
    expect(screen.getByText('Sand')).toBeTruthy();
  });

  it('Add Row appends a row and marks dirty', () => {
    render(<EditableGrid columns={cols} rows={rows} />);
    fireEvent.click(screen.getByText('Row'));
    expect(screen.getByText('3')).toBeTruthy(); // new row number
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('Save calls onSave with columns and rows', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditableGrid columns={cols} rows={rows} onSave={onSave} />);
    fireEvent.click(screen.getByText('Row')); // make dirty
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const [savedCols, savedRows] = onSave.mock.calls[0];
    expect(savedCols).toHaveLength(4);
    expect(savedRows).toHaveLength(3);
  });

  it('locked mode hides editing controls', () => {
    render(<EditableGrid columns={cols} rows={rows} locked />);
    expect(screen.queryByText('Save')).toBeNull();
    expect(screen.queryByText('Row')).toBeNull();
  });

  it('menu Edit (editSignal) opens cell A1 for editing', () => {
    render(<EditableGrid columns={cols} rows={rows} editSignal={1} />);
    expect(screen.getByDisplayValue('Cement')).toBeTruthy(); // cell 0,0 raw value
  });
});

/* ═══════════════ DataTable ═══════════════ */
describe('DataTable — sort/filter/paginate', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({
    id: `r${i}`, item: `Item${i}`, qty: i + 1, price: (i + 1) * 10, total: `=B${i + 1}*C${i + 1}`
  }));

  it('filters rows by text', () => {
    render(<DataTable columns={cols} rows={many} />);
    fireEvent.change(screen.getByPlaceholderText(/filter rows/i), { target: { value: 'Item11' } });
    expect(screen.getByText('Item11')).toBeTruthy();
    expect(screen.queryByText('Item0')).toBeNull();
  });

  it('sorts numerically on header click', () => {
    render(<DataTable columns={cols} rows={many} />);
    fireEvent.click(screen.getByText('Qty'));
    const cells = screen.getAllByText(/^Item\d+$/).map(el => el.textContent);
    // asc by qty → Item0 (qty1) first
    expect(cells[0]).toBe('Item0');
    // click again → desc → Item11 (qty12) first
    fireEvent.click(screen.getByText('Qty'));
    const cellsDesc = screen.getAllByText(/^Item\d+$/).map(el => el.textContent);
    expect(cellsDesc[0]).toBe('Item11');
  });

  it('paginates beyond page size', () => {
    render(<DataTable columns={cols} rows={many} />);
    expect(screen.getByText('1 / 2')).toBeTruthy(); // 12 rows @ 10/page
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('2 / 2')).toBeTruthy();
    expect(screen.getByText('Item10')).toBeTruthy();
  });

  it('cell edit writes back by row id even when sorted', () => {
    render(<DataTable columns={cols} rows={many} />);
    fireEvent.click(screen.getByText('Qty')); // sort asc
    fireEvent.click(screen.getByText('Item0'));
    const input = screen.getByDisplayValue('Item0');
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.blur(input);
    expect(screen.getByText('Renamed')).toBeTruthy();
  });
});

/* ═══════════════ TableRenderer routing ═══════════════ */
describe('TableRenderer — the three tables must render differently', () => {
  const saved = { columns: cols, data: rows };

  it('basic-table renders the Excel Grid (row/column tools)', () => {
    render(<TableRenderer data={{ id: 'basic-table', customTableData: saved }} />);
    expect(screen.getByText('Row')).toBeTruthy();
    expect(screen.getByText('Column')).toBeTruthy();
    expect(screen.getByText(/click a cell to edit/i)).toBeTruthy();
    expect(screen.queryByPlaceholderText(/filter rows/i)).toBeNull();
  });

  it('data-table renders the Data Table (filter + pagination)', () => {
    render(<TableRenderer data={{ id: 'data-table', customTableData: saved }} />);
    expect(screen.getByPlaceholderText(/filter rows/i)).toBeTruthy();
    expect(screen.getByText(/total/)).toBeTruthy();
    expect(screen.queryByText(/click a cell to edit/i)).toBeNull();
  });

  it('pivot-table renders the Pivot Table (group-by config)', () => {
    render(<TableRenderer data={{ id: 'pivot-table', customTableData: saved }} />);
    expect(screen.getByText('Group by…')).toBeTruthy();
    expect(screen.getByText('Add measure')).toBeTruthy();
    expect(screen.queryByPlaceholderText(/filter rows/i)).toBeNull();
  });

  it('falls back to tableType when data.id is missing (legacy nodes)', () => {
    render(<TableRenderer data={{ tableType: 'data-table', customTableData: saved }} />);
    expect(screen.getByPlaceholderText(/filter rows/i)).toBeTruthy();
  });

  it('legacy ids map to the closest modern renderer', () => {
    const { unmount } = render(<TableRenderer data={{ id: 'editable-table', customTableData: saved }} />);
    expect(screen.getByText(/click a cell to edit/i)).toBeTruthy();
    unmount();
    render(<TableRenderer data={{ id: 'paginated-table', customTableData: saved }} />);
    expect(screen.getByPlaceholderText(/filter rows/i)).toBeTruthy();
  });

  it('unknown id defaults to the Excel Grid (never blank)', () => {
    render(<TableRenderer data={{ id: 'mystery-table', customTableData: saved }} />);
    expect(screen.getByText(/click a cell to edit/i)).toBeTruthy();
  });

  it('infers the table kind from the element name (pre-existing canvases)', () => {
    const { unmount } = render(<TableRenderer data={{ name: 'Pivot Table', customTableData: saved }} />);
    expect(screen.getByText('Group by…')).toBeTruthy();
    unmount();
    render(<TableRenderer data={{ name: 'Data Table', customTableData: saved }} />);
    expect(screen.getByPlaceholderText(/filter rows/i)).toBeTruthy();
  });
});

/* ═══════════════ PivotTable ═══════════════ */
describe('PivotTable — group-by summary', () => {
  const pivotRows = [
    { id: 'r1', region: 'North', sales: 100 },
    { id: 'r2', region: 'North', sales: 200 },
    { id: 'r3', region: 'South', sales: 50 }
  ];
  const pivotCols = [{ key: 'region', label: 'Region' }, { key: 'sales', label: 'Sales' }];

  it('shows config prompt until group+value selected', () => {
    render(<PivotTable columns={pivotCols} rows={pivotRows} />);
    expect(screen.getByText(/pick a "group by" column/i)).toBeTruthy();
  });

  it('computes grouped sums once configured', () => {
    render(<PivotTable columns={pivotCols} rows={pivotRows}
      config={{ groupKey: 'region', valueKey: 'sales', op: 'sum' }} />);
    expect(screen.getByText('North')).toBeTruthy();
    expect(screen.getByText('300')).toBeTruthy(); // 100+200
    expect(screen.getByText('50')).toBeTruthy();
    // Total row
    expect(screen.getByText('Total')).toBeTruthy();
    expect(screen.getByText('350')).toBeTruthy();
  });

  it('menu Edit (editSignal) opens the source-data editor', () => {
    render(<PivotTable columns={pivotCols} rows={pivotRows}
      config={{ groupKey: 'region', valueKey: 'sales', op: 'sum' }} editSignal={1} />);
    expect(screen.getByText('Hide source data')).toBeTruthy();
  });

  it('Save passes config through to onSave', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<PivotTable columns={pivotCols} rows={pivotRows}
      config={{ groupKey: 'region', valueKey: 'sales', op: 'sum' }} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const [, , savedConfig] = onSave.mock.calls[0];
    expect(savedConfig).toEqual({ groupKey: 'region', valueKey: 'sales', op: 'sum' });
  });
});

/* ═══════════════ Full view (expand to fullscreen) ═══════════════ */
describe('TableRenderer — full view', () => {
  const saved = { columns: cols, data: rows };

  it.each(['basic-table', 'data-table', 'pivot-table'])('%s offers a Full view button', (kind) => {
    render(<TableRenderer data={{ id: kind, customTableData: saved, name: 'T' }} />);
    expect(screen.getByText('Full view')).toBeTruthy();
  });

  it('opens a fullscreen dialog with the table name and row count', () => {
    render(<TableRenderer data={{ id: 'basic-table', customTableData: saved, name: 'BOQ Sheet' }} />);
    fireEvent.click(screen.getByText('Full view'));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(screen.getByText('BOQ Sheet')).toBeTruthy();
    expect(screen.getByText(/rows · esc/i)).toBeTruthy();
    expect(screen.getByTitle('Close full view')).toBeTruthy();
  });

  it('edits still work inside full view — the same mounted table', () => {
    render(<TableRenderer data={{ id: 'basic-table', customTableData: saved, name: 'T' }} />);
    fireEvent.click(screen.getByText('Full view'));
    // Editing controls remain available inside the dialog
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('+ Row')).toBeTruthy();
    expect(screen.getByText('+ Col')).toBeTruthy();
  });

  it('closes via the header X', () => {
    render(<TableRenderer data={{ id: 'data-table', customTableData: saved, name: 'T' }} />);
    fireEvent.click(screen.getByText('Full view'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Close full view'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes via Escape', () => {
    render(<TableRenderer data={{ id: 'data-table', customTableData: saved, name: 'T' }} />);
    fireEvent.click(screen.getByText('Full view'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('portals the overlay to document.body (escapes the transformed node)', () => {
    const { container } = render(
      <TableRenderer data={{ id: 'basic-table', customTableData: saved, name: 'T' }} />
    );
    fireEvent.click(screen.getByText('Full view'));
    const dialog = screen.getByRole('dialog');
    // The overlay's outer wrapper must attach under <body>, not inside the
    // render container — React Flow's node transform would otherwise clip it.
    let el = dialog;
    while (el.parentElement && el.parentElement !== document.body) el = el.parentElement;
    expect(el.parentElement).toBe(document.body);
    expect(container.contains(dialog)).toBe(false);
  });

  it('keeps unsaved cell edits when toggling to full view and back', () => {
    render(<TableRenderer data={{ id: 'basic-table', customTableData: saved, name: 'T' }} />);
    // Edit the Cement cell without saving
    fireEvent.click(screen.getByText('Cement'));
    const input = screen.getByDisplayValue('Cement');
    fireEvent.change(input, { target: { value: 'EditedItem' } });
    fireEvent.blur(input);

    // Expand → the remounted table inside the portal must show the draft
    fireEvent.click(screen.getByText('Full view'));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('EditedItem');

    // Collapse → inline table restored with the draft still intact
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('EditedItem')).toBeTruthy();
  });
});
