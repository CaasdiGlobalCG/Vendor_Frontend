import React, { useEffect } from 'react';
import { Eye, X } from 'lucide-react';

/**
 * Banner shown in client view: the canvas exactly as a client sees it, with
 * every editing tool hidden. Esc leaves (and is kept from reaching the page's
 * own Esc handler, which would close the window).
 */
const ClientViewBar = ({ title, onExit }) => {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return;
      event.preventDefault();
      event.stopPropagation();
      onExit();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onExit]);

  return (
    <div
      role="region"
      aria-label="Client view"
      data-testid="client-view-bar"
      className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-5 py-2.5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-info/20 bg-info/10 px-2.5 py-1 text-xs font-medium text-info">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          Client view
        </span>
        <h2 className="m-0 truncate text-sm font-semibold text-ink">{title}</h2>
        <span className="hidden truncate text-xs text-dim md:inline">
          This is what your client sees. Editing tools are hidden.
        </span>
      </div>
      <button
        type="button"
        onClick={onExit}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-info"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Exit client view
        <kbd className="ml-1 rounded border border-line px-1 text-[10px] text-dim">Esc</kbd>
      </button>
    </div>
  );
};

export default ClientViewBar;
