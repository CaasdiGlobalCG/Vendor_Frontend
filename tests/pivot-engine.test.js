import { describe, it, expect } from 'vitest';
import { pivot, normalizePivotConfig, drillRowIndices, PIVOT_OPS } from '../src/pages/WorkspacePage/utils/pivotEngine';
import { applyView, matchFilter, uniqueValues, isNumericColumn, normalizeViewState, toggleSort } from '../src/pages/WorkspacePage/utils/dataView';
import { toCSV } from '../src/pages/WorkspacePage/utils/csvExport';

const cols = [
  { key: 'region', label: 'Region' },
  { key: 'city', label: 'City' },
  { key: 'qty', label: 'Qty' },
  { key: 'price', label: 'Price' },
  { key: 'month', label: 'Month' }
];

// evaluated grid (already formula-resolved): region, city, qty, price, month
const grid = [
  ['North', 'Oslo', 10, 100, 'Jan'],
  ['North', 'Oslo', 20, 200, 'Feb'],
  ['North', 'Bergen', 5, 50, 'Jan'],
  ['South', 'Rome', 8, 80, 'Jan'],
  ['South', 'Rome', 12, 120, 'Feb'],
  ['', 'Nowhere', 3, 30, 'Feb']
];

describe('pivotEngine — config normalization', () => {
  it('upgrades legacy {groupKey,valueKey,op} to the new shape', () => {
    const c = normalizePivotConfig({ groupKey: 'region', valueKey: 'qty', op: 'avg' });
    expect(c.groupKeys).toEqual(['region']);
    expect(c.measures).toEqual([{ key: 'qty', op: 'avg' }]);
  });
  it('passes through new-shape config and defaults sort', () => {
    const c = normalizePivotConfig({ groupKeys: ['region', 'city'], measures: [{ key: 'qty', op: 'sum' }], sortDir: 'desc' });
    expect(c.groupKeys).toEqual(['region', 'city']);
    expect(c.sortDir).toBe('desc');
    expect(c.sortBy).toBe('group');
  });
  it('falls back to sum for unknown ops and drops empty entries', () => {
    const c = normalizePivotConfig({ groupKeys: ['region', '', null], measures: [{ key: 'qty', op: 'nonsense' }, { key: '' }] });
    expect(c.groupKeys).toEqual(['region']);   // empties dropped
    expect(c.measures).toEqual([{ key: 'qty', op: 'sum' }]);
  });
  it('empty config → empty groups/measures', () => {
    const c = normalizePivotConfig(null);
    expect(c.groupKeys).toEqual([]);
    expect(c.measures).toEqual([]);
  });
});

describe('pivotEngine — rows mode', () => {
  it('single group + sum — matches legacy pivotTable output', () => {
    const r = pivot(grid, cols, { groupKey: 'region', valueKey: 'qty', op: 'sum' });
    expect(r.mode).toBe('rows');
    const byLabel = Object.fromEntries(r.groups.map(g => [g.label, g]));
    expect(byLabel.North.values[0]).toBe(35);
    expect(byLabel.South.values[0]).toBe(20);
    expect(byLabel['(empty)'].values[0]).toBe(3);
    expect(r.grandTotals[0]).toBe(58);
  });
  it('two-level nesting: children carry their own aggregates and row indices', () => {
    const r = pivot(grid, cols, { groupKeys: ['region', 'city'], measures: [{ key: 'qty', op: 'sum' }] });
    const north = r.groups.find(g => g.label === 'North');
    expect(north.values[0]).toBe(35);
    expect(north.count).toBe(3);
    const cities = Object.fromEntries(north.childList.map(c => [c.label, c]));
    expect(cities.Oslo.values[0]).toBe(30);
    expect(cities.Bergen.values[0]).toBe(5);
    expect(cities.Bergen.rowIndices).toEqual([2]);
  });
  it('multiple measures compute independently per group', () => {
    const r = pivot(grid, cols, {
      groupKeys: ['region'],
      measures: [{ key: 'qty', op: 'sum' }, { key: 'price', op: 'avg' }]
    });
    const north = r.groups.find(g => g.label === 'North');
    expect(north.values[0]).toBe(35);
    expect(north.values[1]).toBeCloseTo(350 / 3); // avg price of north rows
  });
  it('distinct counts unique values; count counts numeric rows', () => {
    const r = pivot(grid, cols, {
      groupKeys: ['region'],
      measures: [{ key: 'month', op: 'distinct' }, { key: 'qty', op: 'count' }]
    });
    const north = r.groups.find(g => g.label === 'North');
    expect(north.values[0]).toBe(2);   // Jan + Feb
    expect(north.values[1]).toBe(3);   // 3 numeric qty values
  });
  it('pct measures total ~100% across groups', () => {
    const r = pivot(grid, cols, {
      groupKeys: ['region'],
      measures: [{ key: 'qty', op: 'pct' }]
    });
    const totalPct = r.groups.reduce((a, g) => a + g.values[0], 0);
    expect(totalPct).toBeCloseTo(100);
    expect(r.groups.find(g => g.label === 'North').values[0]).toBeCloseTo(35 / 58 * 100);
  });
  it('sortBy measure desc orders groups by value; group sort is numeric-aware', () => {
    const r = pivot(grid, cols, { groupKeys: ['region'], measures: [{ key: 'qty', op: 'sum' }], sortBy: 0, sortDir: 'desc' });
    expect(r.groups[0].label).toBe('North'); // 35 largest
    const r2 = pivot(grid, cols, { groupKeys: ['region'], measures: [{ key: 'qty', op: 'sum' }], sortDir: 'desc' });
    expect(r2.groups[0].label).toBe('South'); // group name desc
  });
  it('invalid/missing config → mode empty, no crash', () => {
    expect(pivot(grid, cols, {}).mode).toBe('empty');
    expect(pivot(grid, cols, { groupKey: 'nope', valueKey: 'qty' }).mode).toBe('empty');
  });
});

describe('pivotEngine — matrix mode', () => {
  const cfg = { groupKeys: ['region'], measures: [{ key: 'qty', op: 'sum' }], colKey: 'month' };

  it('produces row × column cells plus grand totals', () => {
    const r = pivot(grid, cols, cfg);
    expect(r.mode).toBe('matrix');
    expect(r.colKeys).toEqual(['Feb', 'Jan']); // alpha sort
    const north = r.groups.find(g => g.label === 'North');
    expect(north.cells.Jan[0]).toBe(15);  // 10 + 5
    expect(north.cells.Feb[0]).toBe(20);  // 20
    expect(north.values[0]).toBe(35);     // row total
    expect(r.grandCells.Jan[0]).toBe(23); // 10+5+8
    expect(r.grandCells.Feb[0]).toBe(35);
    expect(r.grandTotals[0]).toBe(58);
  });
  it('multi-measure matrix: each cell carries per-measure values', () => {
    const r = pivot(grid, cols, { ...cfg, measures: [{ key: 'qty', op: 'sum' }, { key: 'price', op: 'max' }] });
    const north = r.groups.find(g => g.label === 'North');
    expect(north.cells.Jan[0]).toBe(15);
    expect(north.cells.Jan[1]).toBe(100); // max price in Jan/North
  });
});

describe('pivotEngine — drill-down', () => {
  it('returns source row indices for a 1-level path', () => {
    expect(drillRowIndices(grid, cols, ['region'], ['North'])).toEqual([0, 1, 2]);
  });
  it('narrows through a 2-level path', () => {
    expect(drillRowIndices(grid, cols, ['region', 'city'], ['North', 'Bergen'])).toEqual([2]);
  });
  it('empty-string group matches the (empty) bucket', () => {
    expect(drillRowIndices(grid, cols, ['region'], [''])).toEqual([5]);
  });
});

describe('dataView — filters', () => {
  it('uniqueValues dedupes and sorts', () => {
    expect(uniqueValues(grid, 0)).toEqual(['', 'North', 'South']);
    expect(uniqueValues(grid, 2)).toEqual(['3', '5', '8', '10', '12', '20']); // numeric-aware sort
  });
  it('isNumericColumn true for qty, false for region', () => {
    expect(isNumericColumn(grid, 2)).toBe(true);
    expect(isNumericColumn(grid, 0)).toBe(false);
  });
  it('matchFilter handles each spec type', () => {
    expect(matchFilter('Delivered', { values: ['Delivered', 'Pending'] })).toBe(true);
    expect(matchFilter('Shipped', { values: ['Delivered'] })).toBe(false);
    expect(matchFilter('Cement Bag', { text: 'cem' })).toBe(true);
    expect(matchFilter('Cement', { text: 'xyz' })).toBe(false);
    expect(matchFilter(10, { op: '>', value: 5 })).toBe(true);
    expect(matchFilter(10, { op: '<=', value: 5 })).toBe(false);
    expect(matchFilter('abc', { op: '>', value: 5 })).toBe(false);   // text can't compare
    expect(matchFilter('Delivered', { op: '=', value: 'Delivered' })).toBe(true); // string eq fallback
    expect(matchFilter(10, { op: '!=', value: 10 })).toBe(false);
    expect(matchFilter(10, null)).toBe(true);
  });
});

describe('dataView — applyView + toggleSort', () => {
  const items = grid.map((ev, i) => ({ row: { id: 'r' + i }, eval: ev }));

  it('combines a values-filter and a numeric filter', () => {
    const out = applyView(items, cols, { filters: { region: { values: ['North'] }, qty: { op: '>', value: 9 } } });
    expect(out.map(o => o.row.id)).toEqual(['r0', 'r1']); // Bergen qty=5 excluded
  });
  it('ignores filters on unknown columns', () => {
    const out = applyView(items, cols, { filters: { ghost: { values: ['x'] } } });
    expect(out).toHaveLength(6);
  });
  it('multi-sort: region asc then qty desc breaks ties correctly', () => {
    const out = applyView(items, cols, { sorts: [{ key: 'region', dir: 'asc' }, { key: 'qty', dir: 'desc' }] });
    // '' sorts first, then North (20,10,5), then South (12,8)
    expect(out.map(o => o.eval[2])).toEqual([3, 20, 10, 5, 12, 8]);
  });
  it('numeric sort beats lexicographic (12 > 8 numerically)', () => {
    const out = applyView(items, cols, { sorts: [{ key: 'qty', dir: 'desc' }] });
    expect(out[0].eval[2]).toBe(20);
    expect(out.at(-1).eval[2]).toBe(3);
  });
  it('toggleSort: click cycles primary, shift adds secondary', () => {
    let s = toggleSort([], 'qty', false);
    expect(s).toEqual([{ key: 'qty', dir: 'asc' }]);
    s = toggleSort(s, 'qty', false);
    expect(s).toEqual([{ key: 'qty', dir: 'desc' }]);
    s = toggleSort(s, 'region', true);
    expect(s).toEqual([{ key: 'qty', dir: 'desc' }, { key: 'region', dir: 'asc' }]);
    s = toggleSort(s, 'region', true);
    expect(s[1].dir).toBe('desc');
    s = toggleSort(s, 'region', false); // plain click → new primary
    expect(s).toEqual([{ key: 'region', dir: 'asc' }]);
  });
  it('normalizeViewState fills defaults and survives garbage', () => {
    expect(normalizeViewState(null)).toEqual({ sorts: [], filters: {}, hidden: [], perPage: 10 });
    const v = normalizeViewState({ view: { sorts: [{ key: 'a', dir: 'desc' }, {}], hidden: ['x'], perPage: 25 } });
    expect(v.sorts).toEqual([{ key: 'a', dir: 'desc' }]);
    expect(v.hidden).toEqual(['x']);
    expect(v.perPage).toBe(25);
    expect(normalizeViewState({ view: { perPage: 999 } }).perPage).toBe(10);
  });
});

describe('csvExport — toCSV', () => {
  const c2 = [{ key: 'a', label: 'Name' }, { key: 'b', label: 'Note' }];
  it('escapes commas, quotes, and newlines', () => {
    const csv = toCSV(c2, [['Doe, John', 'say "hi"'], ['x', 'line1\nline2']]);
    expect(csv).toBe('Name,Note\r\n"Doe, John","say ""hi"""\r\nx,"line1\nline2"');
  });
  it('empty cells become empty fields; null/undefined safe', () => {
    const csv = toCSV(c2, [[null, undefined]]);
    expect(csv).toBe('Name,Note\r\n,');
  });
});
