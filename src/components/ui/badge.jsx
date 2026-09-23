/**
 * FILE: badge.jsx
 * PURPOSE: Status pills / badges — the ONLY place status colors are used.
 * CONNECTS TO: cn.js · status tokens (success/danger/warning/info/brand).
 *
 * Rule: status color = meaning. Everything else uses `neutral`.
 */

import * as React from "react";
import { cn } from "./cn";

// Soft tinted pills — token color at low alpha + full-strength text.
const TONES = {
  neutral: "bg-surface-hover text-dim",
  brand: "bg-surface-hover text-ink",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

// Matching dot colors for the `dot` affordance.
const DOTS = {
  neutral: "bg-dim",
  brand: "bg-cta",
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};

/**
 * Status badge / pill.
 * @param {object} props
 * @param {'neutral'|'brand'|'success'|'danger'|'warning'|'info'} [props.tone='neutral']
 * @param {boolean} [props.dot=false] - Shows a small status dot before the label.
 */
export const Badge = React.forwardRef(({ tone = "neutral", dot = false, className, children, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5",
      "text-xs font-medium whitespace-nowrap",
      TONES[tone],
      className
    )}
    {...props}
  >
    {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[tone])} aria-hidden="true" />}
    {children}
  </span>
));
Badge.displayName = "Badge";
