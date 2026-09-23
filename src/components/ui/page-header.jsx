/**
 * FILE: page-header.jsx
 * PURPOSE: Shared PageHeader — consistent page titles + action row everywhere.
 * CONNECTS TO: cn.js, badge.jsx · tokens: ink, dim, line.
 *
 * Replaces the per-page h1+buttons blocks with one pattern.
 */

import * as React from "react";
import { cn } from "./cn";

/**
 * Page header — title, optional description, right-aligned actions.
 * @param {object} props
 * @param {string} props.title - Page title (h1 style).
 * @param {string} [props.description] - Muted subtitle.
 * @param {React.ReactNode} [props.actions] - Right side: Buttons/filters.
 * @param {React.ReactNode} [props.badge] - Status badge next to title.
 * @param {boolean} [props.bordered=true] - Bottom hairline separator.
 */
export function PageHeader({ title, description, actions, badge, bordered = true, className }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 pb-6",
        bordered && "border-b border-line",
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink truncate">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 text-sm text-dim">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
