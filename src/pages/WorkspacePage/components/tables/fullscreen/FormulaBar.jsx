import React, { useEffect, useState } from 'react';

/**
 * FormulaBar — the fx bar above the grid, like Excel.
 * Shows the active cell's ref and its RAW contents (formula text, not the
 * evaluated value). Typing here commits to the cell on Enter/blur.
 */
const FormulaBar = ({ cellRef: ref, rawValue = '', locked = false, onCommit }) => {
  const [text, setText] = useState(String(rawValue ?? ''));
  const [focused, setFocused] = useState(false);

  // Mirror the selected cell's raw value whenever the selection changes
  useEffect(() => {
    if (!focused) setText(String(rawValue ?? ''));
  }, [rawValue, ref, focused]);

  const commit = () => {
    setFocused(false);
    if (text !== String(rawValue ?? '')) onCommit?.(text);
  };

  return (
    <div className="flex items-center gap-0 border border-line rounded bg-surface mb-2 flex-shrink-0 overflow-hidden">
      <span className="px-2 py-1 text-[11px] font-semibold text-dim border-r border-line select-none">fx</span>
      <span className="px-2 py-1 text-[11px] font-mono text-info border-r border-line min-w-[52px] select-none">
        {ref || '—'}
      </span>
      <input
        value={text}
        disabled={locked || !ref}
        onFocus={() => setFocused(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setText(String(rawValue ?? '')); setFocused(false); e.target.blur(); }
        }}
        onClick={(e) => e.stopPropagation()}
        placeholder={locked ? '' : 'Type a value or =FORMULA(...)'}
        className="flex-1 px-2 py-1 text-xs font-mono bg-transparent focus:outline-none text-ink disabled:cursor-not-allowed"
        aria-label="Formula bar"
      />
    </div>
  );
};

export default FormulaBar;
