import React, { useEffect, useState } from 'react';

/**
 * Loading placeholders. They keep the shape of what is loading so the page does
 * not jump when it arrives, and stand still for people who prefer reduced motion.
 */

export const Skeleton = ({ className = '', ...props }) => (
  <div
    aria-hidden="true"
    className={`rounded-md bg-surface-hover motion-safe:animate-pulse ${className}`}
    {...props}
  />
);

/** True only after `flag` has been true for `delay` ms: fast loads never flash a skeleton. */
export const useDelayedFlag = (flag, delay = 150) => {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!flag) {
      setShown(false);
      return undefined;
    }
    const timer = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(timer);
  }, [flag, delay]);
  return shown;
};

// Ghost cards that hint at a canvas: [left %, top %, width, height]
const GHOST_CARDS = [
  [12, 14, 260, 150],
  [46, 10, 220, 96],
  [60, 42, 300, 190],
  [20, 52, 240, 130],
];

/** Fills the canvas area while a canvas is loading. Covers the pane, so no stale or empty state shows through. */
export const CanvasSkeleton = () => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading canvas"
    data-testid="canvas-skeleton"
    className="absolute inset-0 z-30 overflow-hidden bg-canvas/90"
  >
    {GHOST_CARDS.map(([left, top, w, h]) => (
      <div
        key={`${left}-${top}`}
        className="absolute rounded-xl border border-line bg-surface p-4 shadow-node"
        style={{ left: `${left}%`, top: `${top}%`, width: w, height: h }}
      >
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-5/6" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </div>
    ))}
    <span className="sr-only">Loading canvas…</span>
  </div>
);

/** Whole-page placeholder for the workspace: dock rail, side panel, top bar, canvas. */
export const WorkspaceSkeleton = ({ message = 'Loading workspace' }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label={message}
    data-testid="workspace-skeleton"
    className="flex h-screen w-full bg-canvas"
  >
    <div className="flex w-14 shrink-0 flex-col items-center gap-3 border-r border-line bg-surface py-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-8 rounded-lg" />
      ))}
    </div>
    <div className="hidden w-72 shrink-0 flex-col gap-3 border-r border-line bg-surface p-4 md:flex">
      <Skeleton className="h-5 w-1/2" />
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
    <div className="relative flex min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-9 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="relative flex-1">
        {GHOST_CARDS.map(([left, top, w, h]) => (
          <div
            key={`${left}-${top}`}
            className="absolute rounded-xl border border-line bg-surface p-4"
            style={{ left: `${left}%`, top: `${top}%`, width: w, height: h }}
          >
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-5/6" />
          </div>
        ))}
      </div>
    </div>
    <span className="sr-only">{message}…</span>
  </div>
);

export default Skeleton;
