import React, { useMemo } from 'react';

/**
 * SelectionStatusBar — Excel's bottom-right quick stats.
 * Computes Count / Sum / Average / Min / Max over the evaluated values of the
 * current selection rectangle; renders nothing without a selection.
 */
const SelectionStatusBar = ({ evaluated = [], sel = null }) => {
  const stats = useMemo(() => {
    if (!sel) return null;
    let count = 0, numeric = 0, sum = 0, min = Infinity, max = -Infinity;
    for (let r = sel.r0; r <= sel.r1; r++) {
      for (let c = sel.c0; c <= sel.c1; c++) {
        const v = evaluated[r]?.[c];
        if (v === undefined || v === null || v === '') continue;
        count++;
        const n = typeof v === 'number' ? v : parseFloat(v);
        if (!Number.isNaN(n)) {
          numeric++;
          sum += n;
          if (n < min) min = n;
          if (n > max) max = n;
        }
      }
    }
    if (!count) return null;
    return {
      count,
      numeric,
      sum,
      avg: numeric ? sum / numeric : null,
      min: numeric ? min : null,
      max: numeric ? max : null
    };
  }, [evaluated, sel]);

  if (!stats) return null;
  const fmt = (n) => Number.isInteger(n) ? String(n) : n.toFixed(2);

  return (
    <div className="flex items-center gap-3 text-[10px] text-dim" data-testid="selection-stats">
      <span>Count: <b className="text-ink">{stats.count}</b></span>
      {stats.numeric > 0 && (
        <>
          <span>Sum: <b className="text-ink">{fmt(stats.sum)}</b></span>
          <span>Avg: <b className="text-ink">{fmt(stats.avg)}</b></span>
          <span>Min: <b className="text-ink">{fmt(stats.min)}</b></span>
          <span>Max: <b className="text-ink">{fmt(stats.max)}</b></span>
        </>
      )}
    </div>
  );
};

export default SelectionStatusBar;
