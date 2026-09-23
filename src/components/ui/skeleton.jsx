/**
 * FILE: skeleton.jsx
 * PURPOSE: Shared Skeleton loaders — replaces blocking spinners on async content.
 * CONNECTS TO: cn.js, tailwind `animate-shimmer` keyframe · token: surface-hover.
 *
 * Shimmer slides a light band across a surface-hover block.
 */

import * as React from "react";
import { cn } from "./cn";

/**
 * Base skeleton block.
 * @param {object} props
 * @param {string} [props.className] - Set width/height/shape via Tailwind (e.g. "h-4 w-32 rounded").
 */
export function Skeleton({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md bg-surface-hover relative overflow-hidden",
        // Shimmer band — subtle white/dark sweep at low alpha
        "after:absolute after:inset-0 after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-black after:to-transparent",
        "after:bg-[length:200%_100%]",
        className
      )}
    />
  );
}

/** Skeleton for multi-line text (title + 2 lines). */
export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        // Last line is shorter — mimics real text raggedness.
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Skeleton shaped like a Card with header + body. */
export function SkeletonCard({ className }) {
  return (
    <div className={cn("rounded-lg border border-line bg-surface p-6", className)}>
      <Skeleton className="h-4 w-1/3 mb-4" />
      <SkeletonText lines={3} />
    </div>
  );
}

/** Skeleton for table rows while data loads. */
export function SkeletonTableRow({ cols = 4, className }) {
  return (
    <div className={cn("flex gap-4 px-4 py-3 border-b border-line", className)}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
  );
}
