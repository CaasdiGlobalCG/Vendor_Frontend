import React, { useState } from 'react';
import { Columns3 } from 'lucide-react';

/**
 * ColumnVisibilityMenu — show/hide columns checklist for the DataTable toolbar.
 */
const ColumnVisibilityMenu = ({ cols, hidden, onToggle }) => {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded border ${hidden.length ? 'bg-info/10 text-info border-info/30' : 'bg-surface-hover text-dim border-line'}`}
        title="Show / hide columns"
      >
        <Columns3 className="w-3 h-3" /> Columns{hidden.length ? ` (${cols.length - hidden.length}/${cols.length})` : ''}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div
            className="absolute top-full right-0 z-50 mt-1 w-48 bg-surface border border-line rounded-lg shadow-xl p-1.5 max-h-48 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {cols.map(c => (
              <label key={c.key} className="flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-canvas rounded cursor-pointer">
                <input type="checkbox" checked={!hidden.includes(c.key)} onChange={() => onToggle(c.key)} />
                <span className="truncate">{c.label}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </span>
  );
};

export default ColumnVisibilityMenu;
