import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PivotResultPanel from '../src/pages/WorkspacePage/components/tables/fullscreen/PivotResultPanel';
import PivotTable from '../src/pages/WorkspacePage/components/tables/PivotTable';

afterEach(cleanup);

const cols = [
  { key: 'region', label: 'Region' },
  { key: 'city', label: 'City' },
  { key: 'qty', label: 'Qty' },
  { key: 'month', label: 'Month' }
];
const rows = [
  { id: 'r1', region: 'North', city: 'Oslo', qty: 10, month: 'Jan' },
  { id: 'r2', region: 'North', city: 'Oslo', qty: 20, month: 'Feb' },
  { id: 'r3', region: 'North', city: 'Bergen', qty: 5, month: 'Jan' },
  { id: 'r4', region: 'South', city: 'Rome', qty: 8, month: 'Jan' }
];

const legacyCfg = { groupKey: 'region', valueKey: 'qty', op: 'sum' };
const nestedCfg = { groupKeys: ['region', 'city'], measures: [{ key: 'qty', op: 'sum' }] };
const matrixCfg = { groupKeys: ['region'], measures: [{ key: 'qty', op: 'sum' }], colKey: 'month' };

describe('PivotResultPanel — backward compat', () => {
  it('legacy config renders identical groups + total', () => {
    render(<PivotResultPanel cols={cols} rows={rows} config={legacyCfg} />);
    expect(screen.getByText('North')).toBeTruthy();
    expect(screen.getByText('South')).toBeTruthy();
    expect(screen.getByText('Total')).toBeTruthy();
    expect(screen.getByText('35')).toBeTruthy(); // North sum
    expect(screen.getByText('43')).toBeTruthy(); // grand total
  });
  it('empty config shows the hint, not a crash', () => {
    render(<PivotResultPanel cols={cols} rows={rows} config={{}} />);
    expect(screen.getByText(/Pick a "Group by"/)).toBeTruthy();
  });
});

describe('PivotResultPanel — config changes propagate', () => {
  it('changing a measure op emits normalized config upward', () => {
    const onCfg = vi.fn();
    render(<PivotResultPanel cols={cols} rows={rows} config={legacyCfg} onConfigChange={onCfg} />);
    const opSel = screen.getAllByTitle('Aggregation')[0];
    fireEvent.change(opSel, { target: { value: 'avg' } });
    const next = onCfg.mock.calls.at(-1)[0];
    expect(next.groupKeys).toEqual(['region']);
    expect(next.measures).toEqual([{ key: 'qty', op: 'avg' }]);
  });
  it('add measure grows the measures list and adds a result column', () => {
    const onCfg = vi.fn();
    const { rerender } = render(<PivotResultPanel cols={cols} rows={rows} config={legacyCfg} onConfigChange={onCfg} />);
    fireEvent.click(screen.getByText('Add measure'));
    const next = onCfg.mock.calls.at(-1)[0];
    expect(next.measures).toHaveLength(2);
    rerender(<PivotResultPanel cols={cols} rows={rows} config={next} onConfigChange={onCfg} />);
    expect(screen.getByText('Sum of Qty')).toBeTruthy();
    expect(screen.getAllByText(/of Qty/)).toHaveLength(2);
  });
});

describe('PivotResultPanel — nested grouping', () => {
  it('renders child rows with counts and collapses on chevron click', () => {
    render(<PivotResultPanel cols={cols} rows={rows} config={nestedCfg} />);
    expect(screen.getByText('Oslo')).toBeTruthy();
    expect(screen.getByText('Bergen')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy(); // Oslo qty sum
    fireEvent.click(screen.getAllByLabelText('Collapse')[0]); // collapse North
    expect(screen.queryByText('Oslo')).toBeNull();
    expect(screen.getByText('North')).toBeTruthy(); // parent stays
  });
});

describe('PivotResultPanel — matrix mode', () => {
  it('renders column headers from the col dimension + row/grand totals', () => {
    render(<PivotResultPanel cols={cols} rows={rows} config={matrixCfg} />);
    expect(screen.getByText('Jan')).toBeTruthy();
    expect(screen.getByText('Feb')).toBeTruthy();
    expect(screen.getByText('Region \\ Month')).toBeTruthy();
    // North: Jan=15 Feb=20 total 35; grand Jan=23 (Feb grand is also 20 — only North has Feb)
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.getAllByText('20').length).toBeGreaterThan(0);
    expect(screen.getByText('23')).toBeTruthy();
  });
});

describe('PivotResultPanel — sorting + ops', () => {
  it('sort by measure desc puts largest group first', () => {
    render(<PivotResultPanel cols={cols} rows={rows}
      config={{ groupKeys: ['region'], measures: [{ key: 'qty', op: 'sum' }], sortBy: 0, sortDir: 'desc' }} />);
    const cells = screen.getAllByRole('row').slice(1).map(r => r.textContent);
    expect(cells[0]).toContain('North');
  });
  it('% of total renders percent values', () => {
    render(<PivotResultPanel cols={cols} rows={rows}
      config={{ groupKeys: ['region'], measures: [{ key: 'qty', op: 'pct' }] }} />);
    expect(screen.getByText(/81\.40%|81\.39%|81\.4%/)).toBeTruthy(); // 35/43
  });
});

describe('PivotResultPanel — drill-down', () => {
  it('clicking a group lists its source rows', () => {
    render(<PivotResultPanel cols={cols} rows={rows} config={legacyCfg} />);
    fireEvent.click(screen.getByText('North'));
    expect(screen.getByText(/Source rows: North \(3\)/)).toBeTruthy();
    expect(screen.getByText('Bergen')).toBeTruthy(); // a source row's city
    fireEvent.click(screen.getByTitle('Close'));
    expect(screen.queryByText(/Source rows/)).toBeNull();
  });
  it('nested child drills to its own subset', () => {
    render(<PivotResultPanel cols={cols} rows={rows} config={nestedCfg} />);
    fireEvent.click(screen.getByText('Oslo'));
    expect(screen.getByText(/Source rows: North › Oslo \(2\)/)).toBeTruthy();
  });
});

describe('PivotTable (compact) — shared panel', () => {
  it('renders the pivot result from config and still saves', async () => {
    const onSave = vi.fn();
    render(<PivotTable columns={cols} rows={rows} config={legacyCfg} onSave={onSave} />);
    expect(screen.getByText('North')).toBeTruthy();
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith(expect.any(Array), expect.any(Array), legacyCfg);
  });
  it('reports config drafts upward for canvas persistence', () => {
    const onDraft = vi.fn();
    render(<PivotTable columns={cols} rows={rows} config={legacyCfg} onDraftChange={onDraft} />);
    const last = onDraft.mock.calls.at(-1);
    expect(last[2]).toEqual(legacyCfg); // (cols, rows, config)
  });
});
