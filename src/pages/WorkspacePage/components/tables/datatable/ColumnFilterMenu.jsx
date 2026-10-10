import React, { useMemo, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { uniqueValues, isNumericColumn } from '../../../utils/dataView';

/**
 * ColumnFilterMenu — Excel-style header filter dropdown.
 * Text contains → unique-value checklist → numeric operator, whichever fits.
 * Spec shapes match utils/dataView.matchFilter.
 */
const OPS = ['=', '!=', '>', '>=', '<', '<='];

const ColumnFilterMenu = ({ col, grid, spec, onApply, onClear, disabled }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [op, setOp] = useState('>');
  const [opVal, setOpVal] = useState('');
  const ci = useMemo(() => col._idx, [col]); // caller attaches grid index
  const values = useMemo(() => uniqueValues(grid, ci), [grid, ci]);
  const numeric = useMemo(() => isNumericColumn(grid, ci), [grid, ci]);
  const checked = spec?.values; // undefined → all checked (no values filter)

  const active = !!spec;
  const toggleValue = (v) => {
    const base = checked ? [...checked] : values.slice();
    const next = base.includes(v) ? base.filter(x => x !== v) : [...base, v];
    onApply(next.length === values.length ? null : { values: next });
  };
  const allOn = () => onApply(null);
  const applyOp = () => {
    if (opVal === '') return;
    onApply({ op, value: opVal });
  };
  const applyText = (q) => {
    setText(q);
    onApply(q ? { text: q } : null);
  };

  return (
    <span className="relative inline-flex">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className={`p-0.5 rounded ${active ? 'text-info' : 'text-dim/40 hover:text-dim'}`}
        title={active ? 'Filter active — click to edit' : 'Filter this column'}
        aria-label={`Filter ${col.label}`}
        disabled={disabled}
      >
        <Filter className="w-3 h-3" fill={active ? 'currentColor' : 'none'} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div
            className="absolute top-full left-0 z-50 mt-1 w-56 bg-surface border border-line rounded-lg shadow-xl p-2 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-dim">Filter: {col.label}</span>
              {active && (
                <button onClick={() => { onClear(); }} className="flex items-center gap-0.5 text-[10px] text-danger hover:underline">
                  <X className="w-2.5 h-2.5" /> Clear
                </button>
              )}
            </div>

            <input
              value={spec?.text ?? text}
              onChange={(e) => applyText(e.target.value)}
              placeholder="Contains…"
              className="w-full px-1.5 py-1 text-xs border border-line rounded bg-surface focus:outline-none focus:ring-1 focus:ring-info"
            />

            {numeric && (
              <div className="flex gap-1">
                <select value={op} onChange={(e) => setOp(e.target.value)} className="border border-line rounded px-1 py-0.5 text-xs bg-surface">
                  {OPS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <input
                  value={opVal}
                  onChange={(e) => setOpVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyOp()}
                  placeholder="value"
                  className="w-16 flex-1 px-1.5 py-0.5 text-xs border border-line rounded bg-surface"
                />
                <button onClick={applyOp} className="px-1.5 text-[10px] bg-surface-hover rounded border border-line">Set</button>
              </div>
            )}

            <div className="max-h-36 overflow-auto border border-line rounded">
              <button onClick={allOn} className="w-full text-left px-2 py-1 text-[10px] text-info hover:bg-canvas">
                ✓ Select all
              </button>
              {values.map(v => {
                const isChecked = !checked || checked.includes(v);
                return (
                  <label key={v || '(empty)'} className="flex items-center gap-1.5 px-2 py-0.5 text-xs hover:bg-canvas cursor-pointer">
                    <input type="checkbox" checked={isChecked} onChange={() => toggleValue(v)} />
                    <span className="truncate">{v === '' ? '(empty)' : v}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}
    </span>
  );
};

export default ColumnFilterMenu;
