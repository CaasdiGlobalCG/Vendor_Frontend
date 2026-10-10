/**
 * csvExport — RFC-4180-ish CSV from evaluated grid rows + download helper.
 */
const escapeCell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** cols: normalized [{key,label}]; gridRows: evaluated 2D arrays. */
export const toCSV = (cols, gridRows) => {
  const head = cols.map(c => escapeCell(c.label)).join(',');
  const body = gridRows.map(r =>
    cols.map((_, ci) => escapeCell(r[ci])).join(',')
  );
  return [head, ...body].join('\r\n');
};

/** Array-of-arrays variant — [headers, ...rows] straight from an AOA payload. */
export const aoaToCSV = (aoa) =>
  (aoa || []).map(r => (r || []).map(escapeCell).join(',')).join('\r\n');

export const downloadCSV = (filename, csv) => {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
};
