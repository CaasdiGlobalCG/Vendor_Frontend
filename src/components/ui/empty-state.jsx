/**
 * FILE: empty-state.jsx
 * PURPOSE: Shared EmptyState — replaces ~10 bespoke "no data" blocks.
 * CONNECTS TO: cn.js, button.jsx (via action prop) · tokens: ink, dim.
 *
 * Pattern: icon → title → description → optional CTA. Linear/Stripe style.
 */

import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "./cn";

/**
 * Empty state for lists, tables, dashboards.
 * @param {object} props
 * @param {React.ComponentType} [props.icon] - Lucide icon component (default: Inbox).
 * @param {string} props.title - What is missing ("No quotations yet").
 * @param {string} [props.description] - Why + what to do next.
 * @param {React.ReactNode} [props.action] - CTA, usually a <Button>.
 * @param {boolean} [props.compact] - Smaller padding for panels/sidebars.
 */
export function EmptyState({ icon: Icon = Inbox, title, description, action, compact = false, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-16 px-6",
        className
      )}
    >
      {/* Icon chip — neutral surface, no color */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-hover">
        <Icon size={22} className="text-dim" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] text-dim">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
