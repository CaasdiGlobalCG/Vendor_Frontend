import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import DataTable from '../src/pages/WorkspacePage/components/tables/DataTable';

afterEach(cleanup);

vi.mock('../src/pages/WorkspacePage/utils/csvExport', async (orig) => {
  const mod = await orig();
  return { ...mod, downloadCSV: vi.fn(() => true) };
});
import { downloadCSV } from '../src/pages/WorkspacePage/utils/csvExport';

const cols = [
  { key: 'item', label: 'Item' },
  { key: 'qty', label: 'Qty' },
  { key: 'status', label: 'Status' }
];
const rows = [
  { id: 'r1', item: 'Cement', qty: 10, status: 'Delivered' },
  { id: 'r2', item: 'Steel', qty: 5, status: 'Pending' },
  { id: 'r3', item: 'Bricks', qty: 20, status: 'Delivered' },
  { id: 'r4', item: 'Sand', qty: 3, status: 'Pending' }
];

const bodyText = () => screen.getAllByRole('row').slice(1).map(r => r.textContent);

describe('DataTable — per-column filters', () => {
  it('unchecking a unique value hides those rows', () => {
    render(<DataTable columns={cols} rows={rows} />);
    fireEvent.click(screen.getByLabelText('Filter Status'));
    fireEvent.click(screen.getAllByRole('checkbox').find(c =>
      c.closest('label').textContent === 'Pending'));
    const text = bodyText().join('|');
    expect(text).toContain('Cement');
    expect(text).toContain('Bricks');
    expect(text).not.toContain('Steel');
    expect(text).not.toContain('Sand');
  });

  it('numeric operator filter: qty > 9 keeps Cement + Bricks', () => {
    render(<DataTable columns={cols} rows={rows} />);
    fireEvent.click(screen.getByLabelText('Filter Qty'));
    fireEvent.change(screen.getByPlaceholderText('value'), { target: { value: '9' } });
    fireEvent.click(screen.getByText('Set'));
    const text = bodyText().join('|');
    expect(text).toContain('Cement');
    expect(text).toContain('Bricks');
    expect(text).not.toContain('Steel');
  });

  it('"contains" text filter narrows one column only', () => {
    render(<DataTable columns={cols} rows={rows} />);
    fireEvent.click(screen.getByLabelText('Filter Item'));
    fireEvent.change(screen.getByPlaceholderText('Contains…'), { target: { value: 'cem' } });
    expect(bodyText().join('|')).toContain('Cement');
    expect(bodyText().join('|')).not.toContain('Steel');
  });

  it('clearing a filter restores all rows', () => {
    render(<DataTable columns={cols} rows={rows} />);
    fireEvent.click(screen.getByLabelText('Filter Status'));
    fireEvent.click(screen.getAllByRole('checkbox').find(c => c.closest('label').textContent === 'Pending'));
    expect(bodyText().join('|')).not.toContain('Steel');
    fireEvent.click(screen.getByText('Clear'));
    expect(bodyText().join('|')).toContain('Steel');
  });
});

describe('DataTable — multi-sort', () => {
  it('shift-click adds a secondary sort with an order badge', () => {
    render(<DataTable columns={cols} rows={rows} />);
    fireEvent.click(screen.getByText('Status'));                 // primary: Delivered < Pending asc
    fireEvent.click(screen.getByText('Qty'), { shiftKey: true }); // secondary
    const text = bodyText().join('|');
    // Delivered first (asc); qty asc within each group → Cement(10) then Bricks(20), Sand(3) then Steel(5)
    expect(text.indexOf('Cement')).toBeLessThan(text.indexOf('Bricks'));
    expect(text.indexOf('Sand')).toBeLessThan(text.indexOf('Steel'));
    expect(screen.getByText('2')).toBeTruthy(); // secondary badge superscript
  });
});

describe('DataTable — column visibility', () => {
  it('hides a column and reports it inside config.view', () => {
    const onDraft = vi.fn();
    render(<DataTable columns={cols} rows={rows} onDraftChange={onDraft} />);
    fireEvent.click(screen.getByText('Columns'));
    fireEvent.click(screen.getAllByRole('checkbox').find(c => c.closest('label').textContent === 'Status'));
    expect(screen.queryByText('Status', { selector: 'button' })).toBeNull();
    const cfg = onDraft.mock.calls.at(-1)[2];
    expect(cfg.view.hidden).toEqual(['status']);
  });
});

describe('DataTable — CSV export + persistence', () => {
  it('CSV exports the filtered view with headers', () => {
    render(<DataTable columns={cols} rows={rows} />);
    fireEvent.click(screen.getByLabelText('Filter Status'));
    fireEvent.click(screen.getAllByRole('checkbox').find(c => c.closest('label').textContent === 'Pending'));
    fireEvent.click(screen.getByText('CSV'));
    expect(downloadCSV).toHaveBeenCalled();
    const csv = downloadCSV.mock.calls.at(-1)[1];
    expect(csv).toContain('Item,Qty,Status');
    expect(csv).toContain('Cement');
    expect(csv).not.toContain('Steel');
  });

  it('view state persists via onDraftChange config.view.filters', () => {
    const onDraft = vi.fn();
    render(<DataTable columns={cols} rows={rows} onDraftChange={onDraft} />);
    fireEvent.click(screen.getByLabelText('Filter Status'));
    fireEvent.click(screen.getAllByRole('checkbox').find(c => c.closest('label').textContent === 'Pending'));
    const cfg = onDraft.mock.calls.at(-1)[2];
    expect(cfg.view.filters.status).toEqual({ values: ['Delivered'] });
  });

  it('rehydrates a saved view from config', () => {
    render(<DataTable columns={cols} rows={rows}
      config={{ view: { filters: { status: { values: ['Delivered'] } }, sorts: [], hidden: ['qty'], perPage: 10 } }} />);
    const text = bodyText().join('|');
    expect(text).not.toContain('Steel');
    expect(screen.queryByText('Qty', { selector: 'button' })).toBeNull(); // hidden col
  });
});

describe('DataTable — composition + pagination regression', () => {
  it('global search composes with a column filter', () => {
    render(<DataTable columns={cols} rows={rows} />);
    fireEvent.click(screen.getByLabelText('Filter Status'));
    fireEvent.click(screen.getAllByRole('checkbox').find(c => c.closest('label').textContent === 'Delivered'));
    fireEvent.change(screen.getByPlaceholderText('Filter rows…'), { target: { value: 'sand' } });
    const text = bodyText().join('|');
    expect(text).toContain('Sand');       // pending + matches search
    expect(text).not.toContain('Steel');  // pending but filtered by text
    expect(text).not.toContain('Cement'); // delivered excluded by column filter
  });

  it('pagination still pages the filtered set', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ id: 'r' + i, item: 'Item' + i, qty: i, status: 'x' }));
    render(<DataTable columns={cols} rows={many} />);
    expect(screen.getByText('1 / 2')).toBeTruthy(); // 15 rows / 10 per page
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('2 / 2')).toBeTruthy();
    expect(bodyText().join('|')).toContain('Item14');
  });
});
