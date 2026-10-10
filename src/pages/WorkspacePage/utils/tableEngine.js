/**
 * tableEngine — Excel-style formula evaluation for workspace tables.
 *
 * Wraps hot-formula-parser (MIT) behind a small API so the engine can be
 * swapped (e.g. HyperFormula) without touching the grid components.
 *
 * Data model: tables store { columns: [{key,label}] | string[], data: [rowObj] }.
 * A1-style addressing maps columns array order → A,B,C… and data array
 * order → 1,2,3… so cell A1 is data[0][columns[0]].
 */
import { Parser } from 'hot-formula-parser';

/** 0 → 'A', 25 → 'Z', 26 → 'AA', 27 → 'AB' … */
export const colLetter = (idx) => {
  let s = '';
  let n = idx;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};

/** (rowIdx 0-based, colIdx 0-based) → 'A1' style reference */
export const cellRef = (rowIdx, colIdx) => `${colLetter(colIdx)}${rowIdx + 1}`;

/** Normalise a column entry to {key, label} — supports legacy string columns */
export const normalizeColumn = (col, idx) =>
  typeof col === 'string'
    ? { key: col || `col${idx + 1}`, label: col || `Column ${idx + 1}` }
    : { key: col.key || col.id || `col${idx + 1}`, label: col.label || col.key || `Column ${idx + 1}` };

export const normalizeColumns = (columns) =>
  (Array.isArray(columns) ? columns : []).map(normalizeColumn);

/** Flatten the row-object model into a 2D grid of raw cell values (formulas kept as '=…' strings) */
export const rowsToGrid = (columns, rows) => {
  const cols = normalizeColumns(columns);
  return (rows || []).map(row => cols.map(c => {
    const v = row?.[c.key];
    return v === null || v === undefined ? '' : v;
  }));
};

/**
 * Evaluate a 2D grid where formula cells are strings starting with '='.
 * Returns a new grid of the same shape with formulas replaced by computed values.
 * Errors surface as '#NAME?', '#REF!' etc. like Excel.
 */
export const evaluateGrid = (grid) => {
  // resolved[] holds computed values; source grid keeps formulas.
  // Multi-pass: formula cells re-evaluate against resolved deps until stable
  // (handles formulas referencing formula cells, including inside ranges).
  const resolved = grid.map(r => [...r]);
  const parser = new Parser();

  parser.on('callCellValue', ({ row, column }, done) => {
    const v = resolved[row.index]?.[column.index];
    done(v === undefined || v === null ? '' : v);
  });

  parser.on('callRangeValue', ({ row: sRow, column: sCol }, { row: eRow, column: eCol }, done) => {
    const fragment = [];
    for (let r = sRow.index; r <= eRow.index; r++) {
      const fragRow = [];
      for (let c = sCol.index; c <= eCol.index; c++) {
        const v = resolved[r]?.[c];
        fragRow.push(v === undefined || v === null ? '' : v);
      }
      fragment.push(fragRow);
    }
    done(fragment);
  });

  const MAX_PASSES = 12;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let changed = false;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < (grid[r]?.length || 0); c++) {
        const raw = grid[r][c];
        if (typeof raw === 'string' && raw.startsWith('=')) {
          const { error, result } = parser.parse(raw.slice(1));
          // Parser errors already carry the '#' prefix (e.g. '#NAME?') — don't double it
          const next = error
            ? (String(error).startsWith('#') ? String(error) : `#${error}`)
            : result;
          if (resolved[r][c] !== next) {
            resolved[r][c] = next;
            changed = true;
          }
        }
      }
    }
    if (!changed) break;
  }
  return resolved;
};

/** Evaluate the table model directly — returns 2D display grid */
export const evaluateTable = (columns, rows) => evaluateGrid(rowsToGrid(columns, rows));

/** True if a cell string contains a formula */
export const isFormula = (v) => typeof v === 'string' && v.startsWith('=');

/** Column totals — sum/average/min/max/count for a column over evaluated values */
export const aggregateColumn = (evaluatedGrid, colIdx, op = 'sum') => {
  const nums = evaluatedGrid
    .map(r => r[colIdx])
    .map(v => (typeof v === 'number' ? v : parseFloat(v)))
    .filter(n => !Number.isNaN(n));
  if (!nums.length) return '';
  switch (op) {
    case 'avg': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    case 'count': return nums.length;
    default: return nums.reduce((a, b) => a + b, 0);
  }
};

/** Group rows by a column value and aggregate a value column — powers the Pivot table */
export const pivotTable = (evaluatedGrid, columns, groupColIdx, valueColIdx, op = 'sum') => {
  const groups = new Map();
  evaluatedGrid.forEach(row => {
    const key = row[groupColIdx] ?? '';
    const val = row[valueColIdx];
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (!groups.has(key)) groups.set(key, []);
    if (!Number.isNaN(num)) groups.get(key).push(num);
  });
  return [...groups.entries()].map(([key, nums]) => ({
    group: key === '' ? '(empty)' : String(key),
    value: nums.length ? aggregateColumn(nums.map(n => [n]), 0, op) : 0,
    count: nums.length
  }));
};
