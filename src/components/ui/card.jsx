/**
 * FILE: card.jsx
 * PURPOSE: Shared Card primitives — replaces ~15 bespoke card implementations.
 * CONNECTS TO: cn.js · tokens: surface, line, ink, dim.
 *
 * Depth comes from the 1px border (Vercel pattern) — no shadows on cards.
 */

import * as React from "react";
import { cn } from "./cn";

/**
 * Card container.
 * @param {object} props
 * @param {boolean} [props.hoverable] - Adds hover tint + pointer cursor.
 */
export const Card = React.forwardRef(({ className, hoverable = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-surface border border-line rounded-lg",
      hoverable && "cursor-pointer transition-colors duration-150 hover:bg-surface-hover",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

/** Card header — title row with bottom spacing. */
export const CardHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col gap-1 p-6 pb-0", className)} {...props} />
);

/** Card title — h3 token style. */
export const CardTitle = ({ className, ...props }) => (
  <h3 className={cn("text-base font-semibold text-ink tracking-tight", className)} {...props} />
);

/** Muted description under the title. */
export const CardDescription = ({ className, ...props }) => (
  <p className={cn("text-[13px] text-dim", className)} {...props} />
);

/** Card body — default 24px padding. */
export const CardContent = ({ className, ...props }) => (
  <div className={cn("p-6", className)} {...props} />
);

/** Card footer — actions row, top border separator. */
export const CardFooter = ({ className, ...props }) => (
  <div className={cn("flex items-center gap-3 p-6 pt-0", className)} {...props} />
);
