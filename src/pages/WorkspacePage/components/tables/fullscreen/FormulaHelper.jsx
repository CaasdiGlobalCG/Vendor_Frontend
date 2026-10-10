import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { CATEGORIES, searchFunctions } from '../../../utils/formulaCatalog';

/**
 * FormulaHelper — the "fx" insert-function panel.
 * Searchable, categorized list of every function the engine supports; clicking
 * inserts '=NAME(' into the active cell and hands control to the cell editor.
 * Portaled so it floats above the fullscreen overlay.
 */
const FormulaHelper = ({ anchorX, anchorY, onInsert, onClose }) => {
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.type === 'mousedown' && ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', close, true);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close, true);
      document.removeEventListener('keydown', close);
    };
  }, [onClose]);

  const results = useMemo(() => (query ? searchFunctions(query) : null), [query]);
  const totalCount = CATEGORIES.reduce((a, c) => a + c.fns.length, 0);

  const pick = (name) => { onInsert?.(name); onClose(); };

  const fnButton = (name, key) => (
    <button
      key={key}
      onClick={() => pick(name)}
      className="px-1.5 py-0.5 text-[10px] font-mono text-left text-ink rounded hover:bg-info/10 hover:text-info truncate"
      title={`=${name}()`}
    >
      {name}
    </button>
  );

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Insert function"
      style={{ left: Math.min(anchorX, window.innerWidth - 300), top: Math.min(anchorY, window.innerHeight - 380) }}
      className="fixed z-[10001] w-72 max-h-[360px] flex flex-col bg-surface border border-line rounded-lg shadow-xl"
    >
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-line flex-shrink-0">
        <Search className="w-3.5 h-3.5 text-dim" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder={`Search ${totalCount} functions…`}
          className="flex-1 text-xs bg-transparent focus:outline-none text-ink"
        />
        <button onClick={onClose} className="p-0.5 rounded hover:bg-surface-hover">
          <X className="w-3.5 h-3.5 text-dim" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {results ? (
          results.length ? (
            <div className="flex flex-col">
              {results.slice(0, 60).map(r => (
                <button
                  key={r.name}
                  onClick={() => pick(r.name)}
                  className="flex items-center justify-between px-2 py-1 text-xs rounded hover:bg-info/10"
                >
                  <span className="font-mono text-ink">{r.name}</span>
                  <span className="text-[9px] text-dim">{r.category}</span>
                </button>
              ))}
              {results.length > 60 && (
                <p className="px-2 py-1 text-[10px] text-dim">+{results.length - 60} more — keep typing…</p>
              )}
            </div>
          ) : (
            <p className="px-2 py-3 text-xs text-dim text-center">No function matches "{query}"</p>
          )
        ) : (
          CATEGORIES.map(cat => (
            <div key={cat.name} className="mb-1.5">
              <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-dim">
                {cat.name} <span className="font-normal">({cat.fns.length})</span>
              </p>
              <div className="grid grid-cols-3 gap-0.5">
                {cat.fns.map(fn => fnButton(fn, fn))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  );
};

export default FormulaHelper;
