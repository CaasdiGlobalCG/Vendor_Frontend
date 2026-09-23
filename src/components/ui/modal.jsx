/**
 * FILE: modal.jsx
 * PURPOSE: Shared Modal + ConfirmModal — replaces ~30 bespoke modal implementations.
 * CONNECTS TO: cn.js, button.jsx · tokens: surface, line, ink, dim.
 *
 * Renders via portal to document.body. Closes on Escape + backdrop click.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "./cn";
import { Button } from "./button";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/**
 * App-wide modal dialog.
 * @param {object} props
 * @param {boolean} props.open - Controls visibility.
 * @param {() => void} props.onClose - Called on Escape/backdrop/X click.
 * @param {string} [props.title] - Header title.
 * @param {string} [props.description] - Muted text under title.
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md']
 * @param {React.ReactNode} [props.footer] - Footer actions (usually Buttons).
 */
export function Modal({ open, onClose, title, description, size = "md", footer, className, children }) {
  // Escape key closes the modal.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop — dims page, click closes */}
      <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={onClose} aria-hidden="true" />

      {/* Panel — scale-in entrance, borders not shadows */}
      <div
        className={cn(
          "relative w-full bg-surface border border-line rounded-xl shadow-modal",
          "animate-scale-in max-h-[90vh] flex flex-col",
          SIZES[size],
          className
        )}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 p-6 pb-0">
            <div>
              {title && <h2 className="text-lg font-semibold text-ink tracking-tight">{title}</h2>}
              {description && <p className="mt-1 text-[13px] text-dim">{description}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-dim hover:bg-surface-hover hover:text-ink transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto">{children}</div>

        {footer && <div className="flex items-center justify-end gap-3 p-6 pt-0">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/**
 * Confirmation dialog for destructive/important actions.
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} props.onConfirm
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {string} [props.confirmLabel='Confirm']
 * @param {boolean} [props.danger=false] - Red confirm button for destructive actions.
 * @param {boolean} [props.loading=false] - Spinner on confirm while async runs.
 */
export function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", danger = false, loading = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
