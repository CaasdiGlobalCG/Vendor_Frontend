/**
 * tableEngine — formula engine unit tests.
 * Covers A1-style refs, ranges, aggregates, pivot grouping, and error display.
 */
import { describe, it, expect } from 'vitest';
import {
  colLetter, cellRef, normalizeColumns, rowsToGrid,
  evaluateGrid, evaluateTable, isFormula, aggregateColumn, pivotTable
} from '../src/pages/WorkspacePage/utils/tableEngine.js';

describe('cell addressing', () => {
  it('maps column index to Excel letters', () => {
    expect(colLetter(0)).toBe('A');
    expect(colLetter(25)).toBe('Z');
    expect(colLetter(26)).toBe('AA');
    expect(colLetter(27)).toBe('AB');
  });

  it('builds A1-style cell refs', () => {
    expect(cellRef(0, 0)).toBe('A1');
    expect(cellRef(9, 2)).toBe('C10');
  });
});

describe('rowsToGrid + evaluateGrid', () => {
  const columns = [{ key: 'qty', label: 'Qty' }, { key: 'price', label: 'Price' }, { key: 'total', label: 'Total' }];
  const rows = [
    { id: 'r1', qty: 2, price: 100, total: '=A1*B1' },
    { id: 'r2', qty: 3, price: 50, total: '=A2*B2' },
    { id: 'r3', qty: '', price: '', total: '=SUM(C1:C2)' }
  ];

  it('evaluates cell-reference formulas', () => {
    const grid = evaluateTable(columns, rows);
    expect(grid[0][2]).toBe(200);
    expect(grid[1][2]).toBe(150);
  });

  it('evaluates SUM ranges', () => {
    const grid = evaluateTable(columns, rows);
    expect(grid[2][2]).toBe(350);
  });

  it('evaluates AVG/MIN/MAX/COUNT', () => {
    const g = evaluateGrid([[10], [20], [30], ['=AVERAGE(A1:A3)'], ['=MIN(A1:A3)'], ['=MAX(A1:A3)'], ['=COUNT(A1:A3)']]);
    expect(g[3][0]).toBe(20);
    expect(g[4][0]).toBe(10);
    expect(g[5][0]).toBe(30);
    expect(g[6][0]).toBe(3);
  });

  it('leaves plain values and text untouched', () => {
    const g = evaluateGrid([['hello', 42]]);
    expect(g[0][0]).toBe('hello');
    expect(g[0][1]).toBe(42);
  });

  it('surfaces errors as #ERR style strings (single # prefix)', () => {
    const g = evaluateGrid([['=NOSUCHFN(1)']]);
    expect(String(g[0][0])).toMatch(/^#[A-Z/0-9?]+$/);
    expect(String(g[0][0]).startsWith('##')).toBe(false);
  });

  it('supports the wider Excel function set', () => {
    const cases = [
      ['=IF(A1>5,"big","small")', [10], 'big'],
      ['=AND(A1>0,A2>0)', [5, 3], true],
      ['=ROUNDUP(A1,0)', [3.2], 4],
      ['=SQRT(A1)', [16], 4],
      ['=POWER(A1,2)', [4], 16],
      ['=COUNTIF(A1:A3,">1")', [1, 2, 3], 2],
      ['=COUNTA(A1:A2)', [1, 'text'], 2]
    ];
    for (const [formula, values, expected] of cases) {
      const grid = values.map((v, i) => [v, i === 0 ? formula : '']);
      expect(evaluateGrid(grid)[0][1]).toBe(expected);
    }
  });

  it('normalises legacy string columns', () => {
    expect(normalizeColumns(['name', 'role'])).toEqual([
      { key: 'name', label: 'name' },
      { key: 'role', label: 'role' }
    ]);
  });
});

describe('aggregates + pivot', () => {
  const grid = [['cat', 10], ['cat', 20], ['dog', 5], ['dog', 15]];

  it('sums a column', () => {
    expect(aggregateColumn(grid, 1, 'sum')).toBe(50);
    expect(aggregateColumn(grid, 1, 'avg')).toBe(12.5);
    expect(aggregateColumn(grid, 1, 'count')).toBe(4);
  });

  it('groups + aggregates for pivot', () => {
    const p = pivotTable(grid, ['g', 'v'], 0, 1, 'sum');
    expect(p).toEqual([
      { group: 'cat', value: 30, count: 2 },
      { group: 'dog', value: 20, count: 2 }
    ]);
  });

  it('isFormula detects formula strings', () => {
    expect(isFormula('=SUM(A1:A2)')).toBe(true);
    expect(isFormula('text')).toBe(false);
    expect(isFormula(5)).toBe(false);
  });
});
