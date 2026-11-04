import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Centered dialog for the template screens. Esc closes it and is kept from the
 * page's own Esc handler (which would close the window); focus moves in on open
 * and returns to where it was on close.
 */
const TemplateModal = ({ title, onClose, children, width = 'max-w-3xl', labelledBy = 'template-modal-title' }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    panelRef.current?.querySelector('input, textarea, select, button:not([data-modal-close])')?.focus();
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`flex max-h-[90vh] w-full ${width} flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-modal`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 id={labelledBy} className="m-0 truncate text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            data-modal-close
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-dim transition-colors hover:bg-surface-hover hover:text-ink focus:outline-none focus:ring-2 focus:ring-info"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default TemplateModal;
