/**
 * clipboard — TSV interop for the full-view grid.
 *
 * Excel and Google Sheets exchange tab-separated values on the clipboard:
 * columns separated by \t, rows by \n. Copying a selection writes TSV so it
 * pastes back into Excel; pasting accepts TSV from Excel and expands the
 * table (new rows/columns) when the pasted block exceeds current bounds.
 */

/** Serialize a selection rectangle {r0,c0,r1,c1} of DISPLAY values to TSV. */
export const selectionToTSV = (cols, evaluated, sel) => {
  const lines = [];
  for (let r = sel.r0; r <= sel.r1; r++) {
    const cells = [];
    for (let c = sel.c0; c <= sel.c1; c++) {
      const v = evaluated?.[r]?.[c];
      cells.push(v === undefined || v === null ? '' : String(v));
    }
    lines.push(cells.join('\t'));
  }
  return lines.join('\n');
};

/** Parse clipboard text into a 2D matrix of strings. Handles \r\n and \r. */
export const parseTSV = (text) =>
  String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.split('\t'));

/**
 * Paste a parsed matrix at (r0, c0).
 * Returns { cols, rows } — the table EXPANDS like a sheet: missing columns get
 * fresh keys ("Column N") and missing rows are appended.
 */
export const pasteMatrixAt = (cols, rows, r0, c0, matrix, makeId, colLabel = 'Column') => {
  if (!matrix?.length) return { cols, rows };
  const needCols = c0 + Math.max(...matrix.map(m => m.length)) - cols.length;
  const needRows = r0 + matrix.length - rows.length;

  let nextCols = cols;
  if (needCols > 0) {
    const added = Array.from({ length: needCols }, (_, i) => ({
      key: makeId('c'), label: `${colLabel} ${cols.length + i + 1}`
    }));
    nextCols = [...cols, ...added];
  }

  let nextRows = rows.map(r => ({ ...r }));
  for (let i = 0; i < needRows; i++) {
    const row = { id: makeId('r') };
    nextCols.forEach(c => { row[c.key] = ''; });
    nextRows.push(row);
  }
  // new columns need keys present on pre-existing rows
  if (needCols > 0) {
    nextRows = nextRows.map(row => {
      const nr = { ...row };
      nextCols.forEach(c => { if (!(c.key in nr)) nr[c.key] = ''; });
      return nr;
    });
  }

  matrix.forEach((line, di) => {
    const row = nextRows[r0 + di];
    if (!row) return;
    line.forEach((val, dj) => {
      const col = nextCols[c0 + dj];
      if (col) row[col.key] = val;
    });
  });
  return { cols: nextCols, rows: nextRows };
};
