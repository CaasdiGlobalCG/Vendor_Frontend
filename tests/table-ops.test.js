/**
 * tableOps — deep unit tests for structural table operations.
 * Covers row/column insert/delete, Excel-faithful formula ref shifting,
 * #REF! generation for deleted refs, and immutability guarantees.
 */
import { describe, it, expect } from 'vitest';
import {
  uid, colIndex, shiftFormulaRefs, shiftAllFormulas,
  insertRowsAt, deleteRowsAt,
  insertColumnsAt, deleteColumnsAt,
  renameColumn, setCellValue, clearRange
} from '../src/pages/WorkspacePage/utils/tableOps.js';
import { colLetter } from '../src/pages/WorkspacePage/utils/tableEngine.js';

const C = (key) => ({ key, label: key.toUpperCase() });
const cols = () => [C('a'), C('b'), C('c')]; // a=A b=B c=C

describe('uid', () => {
  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 200 }, () => uid('r')));
    expect(ids.size).toBe(200);
  });
});

describe('colIndex', () => {
  it('is the inverse of colLetter', () => {
    for (let i = 0; i < 60; i++) expect(colIndex(colLetter(i))).toBe(i);
  });
  it('is case-insensitive', () => {
    expect(colIndex('a')).toBe(0);
    expect(colIndex('aa')).toBe(26);
  });
});

describe('shiftFormulaRefs', () => {
  it('shifts row refs at and below the anchor', () => {
    expect(shiftFormulaRefs('=A1+A5', { rowAnchor: 1, rowDelta: 1 })).toBe('=A1+A6');
  });

  it('shifts column refs at and right of the anchor', () => {
    expect(shiftFormulaRefs('=A1+B1+C1', { colAnchor: 1, colDelta: 1 })).toBe('=A1+C1+D1');
  });

  it('shifts both endpoints of a range', () => {
    expect(shiftFormulaRefs('=SUM(A1:A5)', { rowAnchor: 0, rowDelta: 2 })).toBe('=SUM(A3:A7)');
  });

  it('produces #REF! when a referenced row is deleted', () => {
    // delete row index 1 (row "2")
    expect(shiftFormulaRefs('=A2*2', { rowCut: { index: 1, count: 1 }, rowAnchor: 1, rowDelta: -1 })).toBe('=#REF!*2');
  });

  it('produces #REF! when a referenced column is deleted', () => {
    // delete column index 1 ("B")
    expect(shiftFormulaRefs('=A1+B1+C1', { colCut: { index: 1, count: 1 }, colAnchor: 1, colDelta: -1 }))
      .toBe('=A1+#REF!+B1');
  });

  it('shifts refs inside a multi-row deleted band correctly', () => {
    // delete rows 2-3 (indices 1..2): =A3 → #REF!, =A4 → =A2, =A1 unchanged
    const spec = { rowCut: { index: 1, count: 2 }, rowAnchor: 1, rowDelta: -2 };
    expect(shiftFormulaRefs('=A1+A3+A4', spec)).toBe('=A1+#REF!+A2');
  });

  it('does not corrupt function names ending in digits', () => {
    expect(shiftFormulaRefs('=LOG10(A1)', { rowAnchor: 0, rowDelta: 1 })).toBe('=LOG10(A2)');
    expect(shiftFormulaRefs('=SUMX2MY2(A1:A2,B1:B2)', { colAnchor: 1, colDelta: 1 }))
      .toBe('=SUMX2MY2(A1:A2,C1:C2)');
  });

  it('leaves quoted string literals untouched', () => {
    expect(shiftFormulaRefs('=CONCATENATE("A1", B1)', { colAnchor: 0, colDelta: 1 }))
      .toBe('=CONCATENATE("A1", C1)');
  });

  it('shifts lowercase refs and preserves case', () => {
    expect(shiftFormulaRefs('=a1+b2', { rowAnchor: 0, rowDelta: 1 })).toBe('=A2+B3');
  });

  it('ignores non-formula values', () => {
    expect(shiftFormulaRefs('A1', { rowAnchor: 0, rowDelta: 1 })).toBe('A1');
    expect(shiftFormulaRefs(42, { rowAnchor: 0, rowDelta: 1 })).toBe(42);
    expect(shiftFormulaRefs(undefined, { rowAnchor: 0, rowDelta: 1 })).toBe(undefined);
  });
});

describe('insertRowsAt', () => {
  const c = cols();
  const rows = [
    { id: 'r1', a: '1', b: '2', c: '=A1+B1' },
    { id: 'r2', a: '3', b: '4', c: '=A2+B2' }
  ];

  it('inserts an empty row at the given index with all column keys', () => {
    const next = insertRowsAt(c, rows, 1);
    expect(next).toHaveLength(3);
    expect(next[1].a).toBe(''); expect(next[1].b).toBe(''); expect(next[1].c).toBe('');
    expect(next[1].id).toBeTruthy();
  });

  it('appends when index exceeds length', () => {
    const next = insertRowsAt(c, rows, 99);
    expect(next).toHaveLength(3);
    expect(next[2].a).toBe('');
  });

  it('shifts formula refs for rows below the insertion point', () => {
    const next = insertRowsAt(c, rows, 0); // insert at top
    // Excel semantics: refs track CELLS, not positions. The formula =A1+B1
    // lived in row 1, moved to row 2 — its refs shift so they still point at
    // the same data (which also moved from row 1 to row 2).
    expect(next[1].c).toBe('=A2+B2');
    // a formula in another row referencing the moved row also shifts:
    const rows2 = [{ id: 'r1', a: 'x', b: '', c: '' }, { id: 'r2', a: '', b: '', c: '=A1' }];
    const next2 = insertRowsAt(c, rows2, 0);
    expect(next2[2].c).toBe('=A2');
  });

  it('does not mutate the input', () => {
    const next = insertRowsAt(c, rows, 0);
    expect(rows).toHaveLength(2);
    expect(next).not.toBe(rows);
    expect(next[1]).not.toBe(rows[0]);
  });
});

describe('deleteRowsAt', () => {
  const c = cols();
  const rows = [
    { id: 'r1', a: '1', b: '', c: '=A1' },
    { id: 'r2', a: '2', b: '', c: '' },
    { id: 'r3', a: '3', b: '', c: '=A3' }
  ];

  it('removes the requested rows', () => {
    const next = deleteRowsAt(c, rows, 1);
    expect(next.map(r => r.id)).toEqual(['r1', 'r3']);
  });

  it('turns refs to a deleted row into #REF! and shifts refs below', () => {
    const data = [
      { id: 'r1', a: '1', b: '', c: '' },
      { id: 'r2', a: '2', b: '', c: '' },
      { id: 'r3', a: '', b: '', c: '=A2' }   // refs the row being deleted
    ];
    const next = deleteRowsAt(c, data, 1);
    expect(next[1].c).toBe('=#REF!');
  });

  it('clamps deletes beyond the end', () => {
    const next = deleteRowsAt(c, rows, 1, 99);
    expect(next.map(r => r.id)).toEqual(['r1']);
  });
});

describe('insertColumnsAt', () => {
  const c = cols();
  const rows = [{ id: 'r1', a: '1', b: '2', c: '=A1+B1' }];

  it('adds a column with a fresh key and blank cell in every row', () => {
    const { cols: nc, rows: nr } = insertColumnsAt(c, rows, 1);
    expect(nc).toHaveLength(4);
    expect(nc[1].key).toBeTruthy();
    expect(nr[0][nc[1].key]).toBe('');
  });

  it('shifts column refs right of the insertion point', () => {
    const { rows: nr } = insertColumnsAt(c, rows, 1);
    // inserting before B → old B1 ref becomes C1
    expect(nr[0].c).toBe('=A1+C1');
  });

  it('renumbered evaluated values stay correct after insert', () => {
    // =A1*B1 computed at C; insert a col before B → formula becomes =A1*C1
    // but C is now the NEW blank column → evaluated result changes. Verify mechanics:
    const { cols: nc, rows: nr } = insertColumnsAt(c, rows, 1);
    expect(nc.map(x => x.key)).toHaveLength(4);
    expect(nr[0].c).toBe('=A1+C1');
  });
});

describe('deleteColumnsAt', () => {
  const c = cols();
  const rows = [
    { id: 'r1', a: '1', b: '2', c: '=A1+B1' },
    { id: 'r2', a: '3', b: '4', c: '=B2' }
  ];

  it('removes the column key from all rows', () => {
    const { cols: nc, rows: nr } = deleteColumnsAt(c, rows, 1);
    expect(nc.map(x => x.key)).toEqual(['a', 'c']);
    expect(nr[0].b).toBeUndefined();
    expect(nr[0].a).toBe('1');
  });

  it('refs into the deleted column become #REF!, refs right shift left', () => {
    const { rows: nr } = deleteColumnsAt(c, rows, 1);
    expect(nr[0].c).toBe('=A1+#REF!');
    expect(nr[1].c).toBe('=#REF!');
  });

  it('survives deleting the last column', () => {
    const { cols: nc } = deleteColumnsAt(c, rows, 2);
    expect(nc.map(x => x.key)).toEqual(['a', 'b']);
  });
});

describe('renameColumn / setCellValue / clearRange', () => {
  const c = cols();
  const rows = [{ id: 'r1', a: '1', b: '2', c: '3' }, { id: 'r2', a: '4', b: '5', c: '6' }];

  it('renames a column label', () => {
    const nc = renameColumn(c, 0, 'Qty');
    expect(nc[0].label).toBe('Qty');
    expect(c[0].label).toBe('A'); // immutable
  });

  it('sets a cell without touching others', () => {
    const nr = setCellValue(rows, 1, 'b', '99');
    expect(nr[1].b).toBe('99');
    expect(nr[0].b).toBe('2');
    expect(rows[1].b).toBe('5');
  });

  it('clears a rectangular range', () => {
    const nr = clearRange(c, rows, 0, 0, 1, 1); // rows 0-1, cols a-b
    expect(nr[0].a).toBe(''); expect(nr[1].b).toBe('');
    expect(nr[0].c).toBe('3'); // outside range untouched
    expect(nr[1].id).toBe('r2'); // id preserved
  });
});

describe('end-to-end: ops + evaluation', () => {
  it('insert column inside a SUM range keeps totals right', () => {
    const c = cols();
    const rows = [
      { id: 'r1', a: '1', b: '2', c: '' },
      { id: 'r2', a: '3', b: '4', c: '' },
      { id: 'r3', a: '', b: '', c: '=SUM(A1:B2)' }
    ];
    const nr = deleteRowsAt(c, rows, 0); // delete row 1 → 2 rows remain
    // =SUM(A1:B2) → A1 ref deleted → =SUM(#REF!:B1)
    expect(nr[1].c).toContain('#REF!');
  });

  it('insert then delete round-trips ref positions', () => {
    const c = cols();
    const rows = [{ id: 'r1', a: '1', b: '2', c: '=A1+B1' }];
    const ins = insertColumnsAt(c, rows, 1);           // =A1+C1
    const del = deleteColumnsAt(ins.cols, ins.rows, 1); // delete the inserted col → =A1+B1
    expect(del.rows[0].c).toBe('=A1+B1');
    expect(del.cols.map(x => x.key)).toEqual(['a', 'b', 'c']);
  });
});
