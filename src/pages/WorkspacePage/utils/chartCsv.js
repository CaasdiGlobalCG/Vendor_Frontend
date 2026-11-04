// ============================================================
// FILE: utils/chartCsv.js
// PURPOSE: Read a CSV into chart data points without guessing.
//          Handles what real exports contain: quoted cells with commas,
//          CRLF, BOM, ; / tab delimiters, currency and % signs,
//          thousands separators, (negative) and trailing-minus numbers.
//          A cell that is not a number is never turned into 0: the row is
//          skipped and reported so the chart matches the file.
// ============================================================

const CURRENCY = /[₹$€£¥]|Rs\.?|INR|USD|EUR/gi;

/** Split CSV text into rows of cells (RFC 4180 quoting, any of , ; tab | delimiters). */
export function parseCsvText(input) {
  let text = String(input ?? '').replace(/^﻿/, '');
  if (!text.trim()) return [];

  // Pick the delimiter from the first non-empty line, ignoring anything inside quotes.
  const firstLine = text.split(/\r\n|\n|\r/).find((l) => l.trim()) || '';
  const counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  let inQ = false;
  for (const ch of firstLine) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch] += 1;
  }
  const delimiter = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ',';

  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);

  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ''));
}

/**
 * Number from a spreadsheet cell, or null when it is not a number.
 *   "₹1,20,000.50" → 120000.5   "(450)" → -450   "12%" → 12   "1.234,56" → 1234.56
 */
export function parseNumberCell(raw, { decimalComma = false } = {}) {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  s = s.replace(/[−–]/g, '-').replace(CURRENCY, '').replace(/[%\s ]/g, '');
  if (s.endsWith('-')) { negative = true; s = s.slice(0, -1); }
  if (s.startsWith('-')) { negative = !negative || negative; s = s.slice(1); negative = true; }
  if (s.startsWith('+')) s = s.slice(1);
  if (!s || !/^[0-9.,]+$/.test(s)) return null;

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    // Both present: whichever comes last is the decimal mark.
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    const groups = s.split(',');
    const looksGrouped = groups.slice(1).every((g) => g.length === 3 || g.length === 2) && groups.length > 1 && !decimalComma;
    s = looksGrouped ? s.replace(/,/g, '') : s.replace(',', '.');
  }
  if ((s.match(/\./g) || []).length > 1) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/**
 * Turn CSV text into chart points.
 * @returns {{ points: Array, headers: string[], labelColumn: number, valueColumn: number,
 *             xColumn: number|null, imported: number, skipped: Array<{row:number, reason:string}> }}
 */
export function csvToChartPoints(text, { scatter = false } = {}) {
  const rows = parseCsvText(text);
  if (rows.length === 0) return { points: [], headers: [], labelColumn: 0, valueColumn: 1, xColumn: null, imported: 0, skipped: [], error: 'The file is empty.' };

  const width = Math.max(...rows.map((r) => r.length));
  const decimalComma = false;

  // A header row is one where no cell after the first parses as a number.
  const first = rows[0];
  const hasHeader = rows.length > 1 && first.slice(1).every((c) => c === '' || parseNumberCell(c, { decimalComma }) === null);
  const headers = hasHeader ? first : first.map((_, i) => `Column ${i + 1}`);
  const body = hasHeader ? rows.slice(1) : rows;
  if (body.length === 0) return { points: [], headers, labelColumn: 0, valueColumn: 1, xColumn: null, imported: 0, skipped: [], error: 'The file has a header but no data rows.' };

  // Which columns are mostly numbers?
  const numericShare = Array.from({ length: width }, (_, c) => {
    const filled = body.filter((r) => (r[c] ?? '') !== '');
    if (filled.length === 0) return 0;
    return filled.filter((r) => parseNumberCell(r[c], { decimalComma }) !== null).length / filled.length;
  });
  const isNumeric = (c) => numericShare[c] >= 0.6;

  // Label = first text column (falls back to column 0); value = first numeric column after it.
  let labelColumn = [...Array(width).keys()].find((c) => !isNumeric(c));
  if (labelColumn === undefined) labelColumn = 0;
  const order = [...Array(width).keys()];
  // numbers after the label first (an id column in front is not the value)
  let valueColumn = [...order.slice(labelColumn + 1), ...order.slice(0, labelColumn)].find((c) => isNumeric(c));
  if (valueColumn === undefined) {
    return { points: [], headers, labelColumn, valueColumn: -1, xColumn: null, imported: 0, skipped: [], error: 'No column with numbers was found. The value column must contain numbers.' };
  }
  const xColumn = scatter
    ? [...Array(width).keys()].find((c) => c !== labelColumn && c !== valueColumn && isNumeric(c)) ?? null
    : null;

  const points = [];
  const skipped = [];
  body.forEach((r, idx) => {
    const rowNo = idx + (hasHeader ? 2 : 1); // as the user sees it in a spreadsheet
    const value = parseNumberCell(r[valueColumn], { decimalComma });
    if (value === null) {
      const shown = (r[valueColumn] ?? '').toString();
      skipped.push({ row: rowNo, reason: shown ? `"${shown.slice(0, 24)}" is not a number` : 'no value' });
      return;
    }
    const point = { label: (r[labelColumn] || '').trim() || `Row ${rowNo}`, value };
    if (scatter) {
      const x = xColumn === null ? null : parseNumberCell(r[xColumn], { decimalComma });
      if (x === null) {
        skipped.push({ row: rowNo, reason: 'no X value' });
        return;
      }
      point.x = x;
    }
    points.push(point);
  });

  return { points, headers, labelColumn, valueColumn, xColumn, imported: points.length, skipped };
}
