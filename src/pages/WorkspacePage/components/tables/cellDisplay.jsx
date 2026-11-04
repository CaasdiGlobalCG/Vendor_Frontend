import React from 'react';
import Badge, { statusTone } from '../ui/Badge';

/**
 * Shared look for table cells in view mode (EditableGrid, DataTable):
 *  - status-like values ("Active", "Pending", "Overdue"…) show as a small pill
 *  - columns that are all numbers are right-aligned with tabular figures
 * Editing is untouched: the editor always shows the raw value.
 */
const NUMERIC = /^[-+]?[₹$€£]?\s?[\d,]+(\.\d+)?%?$/;

export const isNumericValue = (value) =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && NUMERIC.test(value.trim()));

/** For each column index: true when every non-empty evaluated value is a number. */
export const numericColumns = (evaluatedRows, columnCount) =>
  Array.from({ length: columnCount }, (_, ci) => {
    const values = evaluatedRows
      .map((r) => r?.[ci])
      .filter((v) => v !== '' && v !== null && v !== undefined);
    return values.length > 0 && values.every(isNumericValue);
  });

export const CellValue = ({ value }) => {
  const text = String(value ?? '');
  const tone = statusTone(text);
  return tone ? <Badge tone={tone}>{text}</Badge> : text;
};
