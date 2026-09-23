/**
 * FILE: table.jsx
 * PURPOSE: Shared Table primitives — Stripe-style data tables, borders not shadows.
 * CONNECTS TO: cn.js, empty-state.jsx · tokens: surface, line, ink, dim.
 *
 * Usage:
 *   <Table>
 *     <TableHead><TableRow><TableHeaderCell>Name</TableHeaderCell></TableRow></TableHead>
 *     <TableBody>{rows.map(...)}</TableBody>
 *   </Table>
 */

import * as React from "react";
import { cn } from "./cn";

/** Bordered scroll container — overflow-x safe on small screens. */
export function Table({ className, children }) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-lg border border-line bg-surface", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

/** Table head — muted labels, bottom border. */
export function TableHead({ className, children }) {
  return <thead className={cn("border-b border-line", className)}>{children}</thead>;
}

/** Table body — rows separated by hairlines. */
export function TableBody({ className, children }) {
  return <tbody className={cn("divide-y divide-line", className)}>{children}</tbody>;
}

/**
 * Table row.
 * @param {boolean} [props.clickable] - Hover tint + pointer for navigable rows.
 */
export function TableRow({ className, clickable = false, ...props }) {
  return (
    <tr
      className={cn(
        "transition-colors duration-150",
        clickable && "cursor-pointer hover:bg-surface-hover",
        className
      )}
      {...props}
    />
  );
}

/** Header cell — caption style, muted, tabular numbers. */
export function TableHeaderCell({ className, ...props }) {
  return (
    <th
      className={cn("px-4 py-3 text-left text-xs font-medium text-dim uppercase tracking-wider", className)}
      {...props}
    />
  );
}

/**
 * Data cell.
 * @param {boolean} [props.muted] - Renders text in dim tone (secondary data).
 * @param {boolean} [props.numeric] - Right-aligned + tabular nums (amounts, counts).
 */
export function TableCell({ className, muted = false, numeric = false, ...props }) {
  return (
    <td
      className={cn(
        "px-4 py-3",
        muted ? "text-dim" : "text-ink",
        numeric && "text-right tnum",
        className
      )}
      {...props}
    />
  );
}
