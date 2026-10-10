import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * TableContextMenu — right-click menu for the full-view grid.
 * Rendered via portal so it floats above the modal overlay; closes on any
 * outside click or Escape.
 */
const TableContextMenu = ({ x, y, kind, locked, onClose, onAction }) => {
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

  const items = [];
  if (!locked) {
    if (kind === 'cell' || kind === 'row') {
      items.push(
        { id: 'insertRowAbove', label: 'Insert row above' },
        { id: 'insertRowBelow', label: 'Insert row below' },
        { id: 'deleteRows', label: 'Delete row(s)', danger: true },
        { sep: true }
      );
    }
    if (kind === 'cell' || kind === 'col') {
      items.push(
        { id: 'insertColLeft', label: 'Insert column left' },
        { id: 'insertColRight', label: 'Insert column right' },
        { id: 'deleteCols', label: 'Delete column(s)', danger: true },
        { sep: true }
      );
    }
    items.push({ id: 'clear', label: 'Clear contents' });
  }
  if (!items.length) items.push({ id: 'noop', label: 'No actions (locked)', disabled: true });

  // Keep the menu on-screen near the bottom/right edges
  const style = {
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - items.length * 32 - 16)
  };

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={style}
      className="fixed z-[10001] w-48 py-1 bg-surface border border-line rounded-lg shadow-xl"
    >
      {items.map((item, i) => item.sep ? (
        <div key={i} className="my-1 border-t border-line" />
      ) : (
        <button
          key={item.id}
          role="menuitem"
          disabled={item.disabled}
          onClick={() => onAction(item.id)}
          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed ${
            item.danger ? 'text-danger' : 'text-ink'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  );
};

export default TableContextMenu;
