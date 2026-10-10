/**
 * tableOps — pure structural operations for the table data model.
 *
 * The model is { columns: [{key,label}], rows: [rowObj] }; every function
 * returns NEW arrays/objects (no mutation) so callers can setState directly
 * and push the previous state onto an undo stack.
 *
 * Formula-aware: inserting or deleting rows/columns rewrites A1-style cell
 * references inside formulas, exactly like Excel:
 *   insert column at index 1  →  '=B1'  becomes '=C1'
 *   delete column B           →  '=B1'  becomes '#REF!' (referenced cell is gone)
 * Quoted string literals and function names (LOG10(, SUM()…) are untouched.
 */
import { colLetter } from './tableEngine';

let seq = 0;
export const uid = (p) => `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

/** 'A' → 0, 'Z' → 25, 'AA' → 26 … (inverse of tableEngine.colLetter) */
export const colIndex = (letters) => {
  let n = 0;
  for (const ch of String(letters).toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

// 1-3 letters + digits forming a complete cell ref:
//   lookbehind — not preceded by a letter/digit (kills 'G10' inside 'LOG10')
//   lookahead  — not followed by '(' or another digit (kills 'LOG10(' as a
//                function name and partial matches like 'LOG1' + leftover '0')
// Case-insensitive: users may type '=sum(a1)' — refs still shift.
const CELL_REF = /(?<![A-Za-z0-9_])([A-Za-z]{1,3})(\d{1,7})(?![\d(])/g;

/**
 * Rewrite every cell reference inside a formula.
 *   anchors — refs at/after colAnchor/rowAnchor shift by colDelta/rowDelta
 *   cuts    — refs inside a deleted band {index, count} become '#REF!'
 * Segments inside "…" quotes are left alone.
 */
export const shiftFormulaRefs = (formula, {
  colAnchor = null, colDelta = 0,
  rowAnchor = null, rowDelta = 0,
  colCut = null, rowCut = null
} = {}) => {
  if (typeof formula !== 'string' || !formula.startsWith('=')) return formula;
  return formula.split('"').map((seg, i) => {
    if (i % 2 === 1) return seg;
    return seg.replace(CELL_REF, (m, letters, digits) => {
      let c = colIndex(letters);
      let r = parseInt(digits, 10) - 1;
      if (colCut && c >= colCut.index && c < colCut.index + colCut.count) return '#REF!';
      if (rowCut && r >= rowCut.index && r < rowCut.index + rowCut.count) return '#REF!';
      if (colAnchor != null && c >= colAnchor) c += colDelta;
      if (rowAnchor != null && r >= rowAnchor) r += rowDelta;
      if (c < 0 || r < 0) return '#REF!';
      return colLetter(c) + (r + 1);
    });
  }).join('"');
};

/** Apply a ref-shift to every cell of every row (non-formula values pass through). */
export const shiftAllFormulas = (rows, spec) =>
  rows.map(row => {
    const next = { ...row };
    for (const k of Object.keys(next)) next[k] = shiftFormulaRefs(next[k], spec);
    return next;
  });

// ─── Rows ────────────────────────────────────────────────────────────────────

/** Insert `count` empty rows before `index` (clamped); refs at/after shift down. */
export const insertRowsAt = (cols, rows, index, count = 1) => {
  const at = Math.max(0, Math.min(index, rows.length));
  const added = Array.from({ length: count }, () => {
    const row = { id: uid('r') };
    cols.forEach(c => { row[c.key] = ''; });
    return row;
  });
  const shifted = shiftAllFormulas(rows, { rowAnchor: at, rowDelta: count });
  return [...shifted.slice(0, at), ...added, ...shifted.slice(at)];
};

/** Delete `count` rows starting at `index`; refs into the band → '#REF!', refs below shift up. */
export const deleteRowsAt = (cols, rows, index, count = 1) => {
  const at = Math.max(0, Math.min(index, rows.length));
  const n = Math.min(count, rows.length - at);
  if (n <= 0) return rows;
  const rest = [...rows.slice(0, at), ...rows.slice(at + n)];
  return shiftAllFormulas(rest, {
    rowCut: { index: at, count: n },
    rowAnchor: at, rowDelta: -n
  });
};

// ─── Columns ────────────────────────────────────────────────────────────────

/** Insert `count` columns before `index`; refs at/after shift right. Returns {cols, rows}. */
export const insertColumnsAt = (cols, rows, index, count = 1, label = 'Column') => {
  const at = Math.max(0, Math.min(index, cols.length));
  const added = Array.from({ length: count }, (_, i) => ({
    key: uid('c'),
    label: `${label} ${cols.length + i + 1}`
  }));
  const nextCols = [...cols.slice(0, at), ...added, ...cols.slice(at)];
  const nextRows = shiftAllFormulas(rows, { colAnchor: at, colDelta: count })
    .map(row => {
      const nr = { ...row };
      added.forEach(c => { nr[c.key] = ''; });
      return nr;
    });
  return { cols: nextCols, rows: nextRows };
};

/** Delete `count` columns starting at `index`; refs into the band → '#REF!', refs right shift left. */
export const deleteColumnsAt = (cols, rows, index, count = 1) => {
  const at = Math.max(0, Math.min(index, cols.length));
  const n = Math.min(count, cols.length - at);
  if (n <= 0) return { cols, rows };
  const removedKeys = new Set(cols.slice(at, at + n).map(c => c.key));
  const nextCols = cols.filter(c => !removedKeys.has(c.key));
  const nextRows = shiftAllFormulas(rows, {
    colCut: { index: at, count: n },
    colAnchor: at, colDelta: -n
  }).map(row => {
    const nr = { ...row };
    removedKeys.forEach(k => delete nr[k]);
    return nr;
  });
  return { cols: nextCols, rows: nextRows };
};

export const renameColumn = (cols, index, label) =>
  cols.map((c, i) => (i === index ? { ...c, label } : c));

// ─── Cells ──────────────────────────────────────────────────────────────────

export const setCellValue = (rows, rowIdx, colKey, value) =>
  rows.map((r, i) => (i === rowIdx ? { ...r, [colKey]: value } : r));

/** Clear a rectangular band of cells (used by context-menu "Clear contents" and Delete). */
export const clearRange = (cols, rows, r0, c0, r1, c1) =>
  rows.map((row, ri) => {
    if (ri < r0 || ri > r1) return row;
    const next = { ...row };
    for (let ci = c0; ci <= c1; ci++) next[cols[ci].key] = '';
    return next;
  });
