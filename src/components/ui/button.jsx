/**
 * FILE: button.jsx
 * PURPOSE: Single Button component for the whole app — replaces ~20 bespoke buttons.
 * CONNECTS TO: cn.js · design tokens via Tailwind vars (cta, brand, danger, surface, line).
 *
 * Variants map to design-system tokens only — no raw hex.
 */

import * as React from "react";
import { cn } from "./cn";

// Variant → token classes. `cta` flips black/white automatically in dark mode.
const VARIANTS = {
  primary: "bg-cta text-cta-foreground hover:opacity-85",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-hover",
  ghost: "text-ink hover:bg-surface-hover",
  brand: "bg-cta text-cta-foreground hover:opacity-90",
  danger: "bg-danger text-cta-foreground hover:opacity-90",
  outline: "border border-line text-ink hover:bg-surface-hover bg-transparent",
};

const SIZES = {
  sm: "h-8 px-3 text-[13px] rounded-md",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-11 px-6 text-sm rounded-md",
  icon: "h-9 w-9 rounded-md",
};

/**
 * App-wide button.
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'brand'|'danger'|'outline'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'|'icon'} [props.size='md']
 * @param {boolean} [props.loading=false] - Shows spinner, disables clicks.
 * @param {string} [props.className] - Extra Tailwind classes.
 */
export const Button = React.forwardRef(
  ({ variant = "primary", size = "md", loading = false, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        // Base: layout, focus ring (brand teal), press feedback, disabled state
        "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
        "active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  )
);

Button.displayName = "Button";
