/**
 * FILE: input.jsx
 * PURPOSE: Shared Input, Textarea, and Field wrapper — replaces scattered per-form styles.
 * CONNECTS TO: cn.js · tokens: surface, line, ink, dim, danger, brand.
 *
 * Field = label + control + helper/error text in one accessible unit.
 */

import * as React from "react";
import { cn } from "./cn";

// Shared control styling — tokens only, brand focus ring.
const controlClasses = (error) =>
  cn(
    "flex w-full rounded-md border bg-surface px-3 py-2 text-sm text-ink",
    "placeholder:text-dim transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1",
    "disabled:cursor-not-allowed disabled:opacity-40",
    error ? "border-danger" : "border-line"
  );

/**
 * Text input.
 * @param {object} props
 * @param {boolean} [props.error] - Red border + use with Field's error text.
 */
export const Input = React.forwardRef(({ className, type = "text", error = false, ...props }, ref) => (
  <input type={type} ref={ref} className={cn(controlClasses(error), "h-10", className)} {...props} />
));
Input.displayName = "Input";

/** Multi-line text input, same styling as Input. */
export const Textarea = React.forwardRef(({ className, error = false, rows = 3, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn(controlClasses(error), "min-h-[80px]", className)} {...props} />
));
Textarea.displayName = "Textarea";

/** Native select styled to match Input. */
export const Select = React.forwardRef(({ className, error = false, children, ...props }, ref) => (
  <select ref={ref} className={cn(controlClasses(error), "h-10", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

/**
 * Field wrapper — label + control + helper/error text.
 * @param {object} props
 * @param {string} [props.label] - Visible label (never placeholder-only).
 * @param {string} [props.error] - Error message, shown under control + marks it.
 * @param {string} [props.hint] - Persistent helper text.
 * @param {boolean} [props.required] - Shows * after label.
 * @param {string} [props.htmlFor] - Links label to control id.
 */
export function Field({ label, error, hint, required = false, htmlFor, className, children }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-dim">{hint}</p>
      ) : null}
    </div>
  );
}
