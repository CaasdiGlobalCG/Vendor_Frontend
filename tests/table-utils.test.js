import { describe, it, expect } from 'vitest';
import { ensureRowIds, updateCustomCell, addCustomRow, deleteCustomRow } from '../src/pages/WorkspacePage/utils/tableUtils.js';

describe('ensureRowIds', () => {
  it('leaves rows that already have unique ids exactly as they are (same array)', () => {
    const rows = [{ id: 1, a: 'x' }, { id: 2, a: 'y' }];
    expect(ensureRowIds(rows)).toBe(rows);
  });
  it('gives rows without an id the next free numbers, keeping the ones that have one', () => {
    const out = ensureRowIds([{ id: 5, a: 'x' }, { a: 'y' }, { a: 'z' }]);
    expect(out.map((r) => r.id)).toEqual([5, 6, 7]);
    expect(out.map((r) => r.a)).toEqual(['x', 'y', 'z']);
  });
  it('numbers from 1 when none has an id', () => {
    expect(ensureRowIds([{ a: 1 }, { a: 2 }]).map((r) => r.id)).toEqual([1, 2]);
  });
  it('repairs repeated or empty ids so each row can be addressed on its own', () => {
    const ids = ensureRowIds([{ id: 1 }, { id: 1 }, { id: '' }, { id: null }]).map((r) => r.id);
    expect(new Set(ids.map(String)).size).toBe(4);
    expect(ids[0]).toBe(1);
  });
  it('copes with nothing at all', () => {
    expect(ensureRowIds(undefined)).toEqual([]);
    expect(ensureRowIds(null)).toEqual([]);
    expect(ensureRowIds([])).toEqual([]);
  });
});

describe('editing a table that holds its own rows', () => {
  const rows = [{ id: 1, name: 'Lathe', qty: '2' }, { id: 2, name: 'Press', qty: '1' }];

  it('changes one cell and nothing else, without touching the original', () => {
    const out = updateCustomCell(rows, 2, 'qty', '5');
    expect(out).toEqual([{ id: 1, name: 'Lathe', qty: '2' }, { id: 2, name: 'Press', qty: '5' }]);
    expect(rows[1].qty).toBe('1');
    expect(out[0]).toBe(rows[0]);
  });
  it('an unknown row changes nothing', () => {
    expect(updateCustomCell(rows, 99, 'qty', '5')).toEqual(rows);
  });
  it('adds a blank row with the next id and every column present', () => {
    const { rows: out, newId } = addCustomRow(rows, ['name', 'qty']);
    expect(newId).toBe(3);
    expect(out[2]).toEqual({ id: 3, name: '', qty: '' });
    expect(rows).toHaveLength(2);
  });
  it('adding to an empty table starts at 1', () => {
    expect(addCustomRow([], ['a']).newId).toBe(1);
  });
  it('deletes by id', () => {
    expect(deleteCustomRow(rows, 1)).toEqual([rows[1]]);
    expect(deleteCustomRow(rows, 99)).toEqual(rows);
  });
});
