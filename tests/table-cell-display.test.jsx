import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import EditableGrid from '../src/pages/WorkspacePage/components/tables/EditableGrid';
import DataTable from '../src/pages/WorkspacePage/components/tables/DataTable';
import { isNumericValue, numericColumns } from '../src/pages/WorkspacePage/components/tables/cellDisplay';

afterEach(cleanup);

const columns = [{ key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }, { key: 'qty', label: 'Qty' }];
const rows = [
  { id: 'r1', name: 'Lathe 1', status: 'Active', qty: '12' },
  { id: 'r2', name: 'Press 2', status: 'Pending', qty: '1,250' },
];

describe('table cell display (UI polish on the Excel-grade tables)', () => {
  it('recognises numbers, currency and percentages, but not names', () => {
    expect(isNumericValue('12')).toBe(true);
    expect(isNumericValue('₹1,250.50')).toBe(true);
    expect(isNumericValue('45%')).toBe(true);
    expect(isNumericValue(7)).toBe(true);
    expect(isNumericValue('Lathe 1')).toBe(false);
    expect(numericColumns([['a', '1'], ['b', '2']], 2)).toEqual([false, true]);
    expect(numericColumns([['a', '']], 2)).toEqual([false, false]); // empty column is not "numeric"
  });

  it('EditableGrid shows status values as pills and right-aligns number columns', () => {
    render(<EditableGrid columns={columns} rows={rows} onSave={() => {}} />);
    const pill = screen.getByText('Active');
    expect(pill.className).toContain('rounded-full');
    expect(screen.getByText('Pending').className).toContain('rounded-full');
    expect(screen.getByText('Lathe 1').className).not.toContain('rounded-full'); // names are never pills
    expect(screen.getByText('1,250').closest('div').className).toContain('text-right');
    expect(screen.getByText('Lathe 1').closest('div').className).not.toContain('text-right');
  });

  it('DataTable gets the same treatment', () => {
    render(<DataTable columns={columns} rows={rows} onSave={() => {}} />);
    expect(screen.getByText('Active').className).toContain('rounded-full');
    expect(screen.getByText('12').closest('div').className).toContain('text-right');
  });
});
