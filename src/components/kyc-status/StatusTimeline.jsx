// ============================================================
// FILE: components/kyc-status/StatusTimeline.jsx
// PURPOSE: Presentational vertical timeline for the live KYC-status page. Replaces the
//          horizontal `ProgressStepper` with the approved "Timeline" layout: one node per
//          verification stage (lucide icon + label + Completed / In progress / Pending chip),
//          a connecting rail, and the expanded stage content rendered under the current node.
// CONNECTS TO: components/AuditorWaiting.jsx (consumer), components/kyc-status/status-tone.js.
//
// PRESENTATIONAL ONLY — no hooks, no state, no data fetching. The caller owns the data:
// `steps` (the stage vocabulary), `currentIndex` (from the live page's own `getStepIndex`) and
// the expanded `children` (whatever the live page renders for the current status).
//
// The live page used emoji as its only step marker; here each stage carries a lucide icon AND
// its text label, so a stage is never conveyed by a glyph alone.
// ============================================================

import {
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Search,
} from "lucide-react";
import { cn } from "../ui";

/** The icon for a pipeline stage. */
const STEP_ICONS = {
  in_review: ClipboardList,
  physical_kyc_scheduled: Calendar,
  physical_kyc_in_progress: Building2,
  physical_kyc_review: Search,
  approved: CheckCircle2,
};

/**
 * Vertical status timeline.
 *
 * @param {Object} props
 * @param {Array<{key: string, label: string}>} props.steps - The pipeline stages, in order.
 * @param {number} props.currentIndex - Index of the current stage (from `getStepIndex`).
 * @param {boolean} [props.rejected] - When true, NO stage is marked complete.
 * @param {boolean} [props.completed] - When true, EVERY stage is marked complete
 *        (e.g. final "Approved") and the detail renders below the timeline.
 * @param {React.ReactNode} [props.children] - Expanded content for the current stage.
 */
export function StatusTimeline({
  steps = [],
  currentIndex = 0,
  rejected = false,
  completed = false,
  children,
}) {
  // A rejected application is off-pipeline: `getStepIndex('rejected')` returns 0, which would
  // otherwise attach the rejection detail under the "Online KYC Review" node and read as if the
  // vendor were still at stage one. When rejected, no node is current and the detail renders
  // BELOW the timeline instead. The same applies to a fully completed pipeline — the final
  // "Approved" node should read Completed, not In progress.
  const expandedBelow = (rejected || completed) && children;

  return (
    <div className="min-w-0">
      <ol className="auth-rise min-w-0" style={{ animationDelay: "120ms" }}>
      {steps.map((step, index) => {
        const Icon = STEP_ICONS[step.key] || ClipboardList;
        // A stage is complete only when the vendor has moved past it — and never when rejected.
        const done = !rejected && (completed || index < currentIndex);
        const active = !rejected && !completed && index === currentIndex;
        // The expanded content attaches to the current node, except when it renders below.
        const isCurrent = active;

        return (
          <li key={step.key} className="relative flex gap-4 pb-8 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-180 ease-signal",
                  active
                    ? "border-ink bg-ink text-canvas"
                    : done
                      ? "border-success bg-success/10 text-success"
                      : "border-line bg-surface text-dim"
                )}
              >
                <Icon size={16} aria-hidden="true" />
              </span>
              {index < steps.length - 1 ? (
                <span
                  className={cn(
                    "my-1 w-px flex-1",
                    done ? "bg-success/40" : "bg-line"
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1 pt-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  className={cn(
                    "text-sm font-semibold",
                    active ? "text-ink" : "text-dim"
                  )}
                >
                  {step.label}
                </h2>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    done
                      ? "border-success/25 bg-success/10 text-success"
                      : active
                        ? "border-ink/25 bg-surface-hover text-ink"
                        : "border-line text-dim"
                  )}
                >
                  {done ? "Completed" : active ? "In progress" : "Pending"}
                </span>
              </div>

              {isCurrent && children ? (
                <div className="mt-3">{children}</div>
              ) : null}
            </div>
          </li>
        );
      })}
      </ol>

      {expandedBelow ? (
        <div className="auth-rise mt-6" style={{ animationDelay: "160ms" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default StatusTimeline;
