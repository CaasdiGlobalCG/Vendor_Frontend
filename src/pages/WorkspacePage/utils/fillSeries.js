/**
 * fillSeries — Excel drag-fill semantics.
 *
 * Dragging a cell's fill handle copies the source rectangle across the target
 * rectangle, tiling (the source pattern repeats). Values copy verbatim;
 * formula refs shift by the offset between source and target cells — exactly
 * Excel's relative-reference behavior:
 *
 *   source C1 '=B1*C1'  filled down to C3  →  '=B3*C3'
 *
 * Absolute refs pinned with $ do not shift on that axis:
 *   '=$A$1' stays '=$A$1',  '=A$1' shifts column only,  '=$A1' shifts row only.
 */
import { colLetter } from './tableEngine';
import { colIndex } from './tableOps';

// ($?)(letters)($?)(digits) — with the same boundaries as tableOps CELL_REF:
// no alnum/$/underscore before, no digit or '(' after.
const FILL_REF = /(?<![A-Za-z0-9_$])(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})(?![\d(])/g;

/** Shift a formula by (dr rows, dc cols), honoring $-pinned axes. */
export const fillFormula = (formula, dr, dc) => {
  if (typeof formula !== 'string' || !formula.startsWith('=')) return formula;
  return formula.split('"').map((seg, i) => {
    if (i % 2 === 1) return seg; // quoted literal
    return seg.replace(FILL_REF, (m, colAbs, letters, rowAbs, digits) => {
      let c = colIndex(letters);
      let r = parseInt(digits, 10) - 1;
      if (!colAbs) c += dc;
      if (!rowAbs) r += dr;
      if (c < 0 || r < 0) return '#REF!';
      return `${colAbs}${colLetter(c)}${rowAbs}${r + 1}`;
    });
  }).join('"');
};

/**
 * Fill `target` {r0,c0,r1,c1} by tiling `source` {r0,c0,r1,c1}.
 * Cells inside the source rect are untouched. Returns a NEW rows array.
 */
export const fillRange = (cols, rows, source, target) => {
  const sh = source.r1 - source.r0 + 1;
  const sw = source.c1 - source.c0 + 1;
  return rows.map((row, ri) => {
    if (ri < target.r0 || ri > target.r1) return row;
    let touched = false;
    const next = { ...row };
    for (let c = target.c0; c <= target.c1; c++) {
      const inSource = ri >= source.r0 && ri <= source.r1 && c >= source.c0 && c <= source.c1;
      if (inSource) continue;
      const sr = source.r0 + (((ri - source.r0) % sh) + sh) % sh;
      const sc = source.c0 + (((c - source.c0) % sw) + sw) % sw;
      const raw = rows[sr]?.[cols[sc]?.key];
      next[cols[c].key] = (typeof raw === 'string' && raw.startsWith('='))
        ? fillFormula(raw, ri - sr, c - sc)
        : (raw ?? '');
      touched = true;
    }
    return touched ? next : row;
  });
};
