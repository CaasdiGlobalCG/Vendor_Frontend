// ============================================================
// FILE: components/kyc-status/status-tone.js
// PURPOSE: The ONE status → tone contract for the live vendor KYC-status page
//          (components/AuditorWaiting.jsx). Replaces the page's three previous
//          colour systems — `text-success` on the stepper, raw `amber-*` on the
//          resubmit panel and the hard-coded `#0F5848` button — with a single map.
// CONNECTS TO: components/kyc-status/StatusTimeline.jsx, components/kyc-status/KycPanels.jsx,
//              components/AuditorWaiting.jsx.
//
// COLOUR = MEANING. Only the KYC status is coloured; everything else is hairline + type scale.
// Every class below is a Tailwind token read from tailwind.config.js:19-40 — no raw hex,
// no `amber-*`. The `brand` (teal) token is nav-only and is deliberately NOT used here.
// ============================================================

/**
 * Status → tone. One entry per status the live page can render
 * (AuditorWaiting.jsx:480-540 plus `PHYSICAL_KYC_STATUSES` :423-429).
 *
 * Each entry carries:
 *   label    — short chip label
 *   headline — the panel heading for that status
 *   chip     — classes for a tinted hairline chip/pill
 *   dot      — classes for the leading status dot
 *   text     — classes for status-coloured text
 */
export const STATUS_TONE = {
  pending: {
    label: "Online KYC review",
    headline: "Online KYC Under Review",
    chip: "border-info/25 bg-info/10 text-info",
    dot: "bg-info",
    text: "text-info",
  },
  in_review: {
    label: "Online KYC review",
    headline: "Online KYC Under Review",
    chip: "border-info/25 bg-info/10 text-info",
    dot: "bg-info",
    text: "text-info",
  },
  initial_approved: {
    label: "Visit pending",
    headline: "Online KYC Approved",
    chip: "border-info/25 bg-info/10 text-info",
    dot: "bg-info",
    text: "text-info",
  },
  onsite_pending: {
    label: "Visit scheduled",
    headline: "Physical Visit Scheduled",
    chip: "border-info/25 bg-info/10 text-info",
    dot: "bg-info",
    text: "text-info",
  },
  onsite_verified: {
    label: "Compliance review",
    headline: "Compliance Review in Progress",
    chip: "border-warning/25 bg-warning/10 text-warning",
    dot: "bg-warning",
    text: "text-warning",
  },
  physical_kyc_scheduled: {
    label: "Visit scheduled",
    headline: "Physical Visit Scheduled",
    chip: "border-info/25 bg-info/10 text-info",
    dot: "bg-info",
    text: "text-info",
  },
  physical_kyc_in_progress: {
    label: "Visit in progress",
    headline: "Visit In Progress",
    chip: "border-warning/25 bg-warning/10 text-warning",
    dot: "bg-warning",
    text: "text-warning",
  },
  physical_kyc_review: {
    label: "Compliance review",
    headline: "Compliance Review in Progress",
    chip: "border-warning/25 bg-warning/10 text-warning",
    dot: "bg-warning",
    text: "text-warning",
  },
  resubmit_requested: {
    label: "Changes requested",
    headline: "Changes Requested",
    chip: "border-warning/25 bg-warning/10 text-warning",
    dot: "bg-warning",
    text: "text-warning",
  },
  approved: {
    label: "Approved",
    headline: "Congratulations! You're Approved",
    chip: "border-success/25 bg-success/10 text-success",
    dot: "bg-success",
    text: "text-success",
  },
  rejected: {
    label: "Not approved",
    headline: "Application Not Approved",
    chip: "border-danger/25 bg-danger/10 text-danger",
    dot: "bg-danger",
    text: "text-danger",
  },
};

/** Tone for a status, falling back to the online-review tone. */
export function statusTone(status) {
  return STATUS_TONE[status] || STATUS_TONE.pending;
}
