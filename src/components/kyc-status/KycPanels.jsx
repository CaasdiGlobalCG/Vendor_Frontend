// ============================================================
// FILE: components/kyc-status/KycPanels.jsx
// PURPOSE: The five pure presentational status panels for the live KYC-status page,
//          moved here from components/AuditorWaiting.jsx (:307-408) so the page file keeps
//          only logic + stateful sub-components. Restyled onto the app tokens.
// CONNECTS TO: components/AuditorWaiting.jsx (consumer), components/kyc-status/status-tone.js.
//
// NO HOOKS, NO STATE, NO DATA FETCHING — every value arrives as a prop. All copy is carried
// over VERBATIM from the live page. The `amber-*` and `#0F5848` colours the live page used are
// replaced by the `warning` / `cta` tokens.
// ============================================================

import { Calendar, CheckCircle2, ClipboardList, Pencil, Search, XCircle } from "lucide-react";

/** Shared panel shell — hairline card, leading icon, headline and body. */
function Panel({ icon: Icon, iconClass = "text-dim", title, titleClass = "text-ink", children }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <Icon size={18} className={iconClass} aria-hidden="true" />
        <h2 className={`text-sm font-semibold ${titleClass}`}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

/** Online KYC is being reviewed. */
export function OnlineKYCPendingPanel() {
  return (
    <Panel icon={ClipboardList} iconClass="text-info" title="Online KYC Under Review">
      <p className="mt-2 text-sm leading-6 text-dim">
        Our verification team is reviewing your submitted documents. This typically takes up to 24 hours.
        You'll be notified by email once the review is complete and a physical visit is scheduled.
      </p>
    </Panel>
  );
}

/** Online KYC approved — the auditor will schedule the physical visit. */
export function VisitSchedulingPanel() {
  return (
    <Panel icon={Calendar} iconClass="text-info" title="Online KYC Approved">
      <p className="mt-2 text-sm leading-6 text-dim">
        Your documents have been verified and approved. Our audit team will now schedule a
        physical verification visit to your premises — the date and location will appear here
        once scheduled.
      </p>
    </Panel>
  );
}

/** Compliance is reviewing the auditor's findings. */
export function PhysicalKYCReviewPanel() {
  return (
    <Panel icon={Search} iconClass="text-warning" title="Compliance Review in Progress">
      <p className="mt-2 text-sm leading-6 text-dim">
        The auditor has submitted their findings. Our Compliance Lead is reviewing the physical KYC results.
        Final approval typically takes 1–3 business days.
      </p>
    </Panel>
  );
}

/** The application was approved. */
export function ApprovedPanel({ onGoToDashboard }) {
  return (
    <Panel icon={CheckCircle2} iconClass="text-success" title="Congratulations! You're Approved" titleClass="text-success">
      <p className="mt-2 text-sm leading-6 text-dim">
        Your vendor application has been fully approved after successful completion of both online and physical KYC verification.
        You now have full access to the Caasdi platform.
      </p>
      {onGoToDashboard && (
        <button
          onClick={onGoToDashboard}
          className="brand-press mt-5 rounded-lg bg-cta px-8 py-3 text-sm font-medium text-cta-foreground transition-colors duration-180 ease-signal hover:bg-cta/90"
        >
          Go to dashboard
        </button>
      )}
    </Panel>
  );
}

/** The auditor requested changes to specific sections. */
export function ResubmitRequestedPanel({ permissions, remarks, onEditSubmission }) {
  const SECTION_LABELS = {
    vendor: "Vendor Details",
    company: "Business Details",
    service: "Product & Service",
    bank: "Bank Details",
    compliance: "Compliance & Certifications",
    additional: "Additional Details",
  };
  const granted = Object.keys(permissions || {}).filter((k) => permissions[k]?.granted);

  return (
    <Panel icon={Pencil} iconClass="text-warning" title="Changes Requested" titleClass="text-warning">
      <p className="mt-2 text-sm leading-6 text-dim">
        The auditor reviewed your KYC submission and requested changes to the sections below.
        Update them and resubmit — all other sections remain read-only.
      </p>
      {granted.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {granted.map((key) => (
            <span
              key={key}
              className="rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-xs font-medium text-warning"
            >
              {SECTION_LABELS[key] || key}
            </span>
          ))}
        </div>
      )}
      {remarks && (
        <div className="mt-3 rounded-lg border border-warning/25 bg-warning/10 p-4 text-left text-sm text-warning">
          <strong>Auditor note:</strong> {remarks}
        </div>
      )}
      <button
        onClick={onEditSubmission}
        className="brand-press mt-5 rounded-lg bg-cta px-8 py-3 text-sm font-medium text-cta-foreground transition-colors duration-180 ease-signal hover:bg-cta/90"
      >
        Update submission
      </button>
    </Panel>
  );
}

/** The application was not approved. */
export function RejectedPanel({ reason }) {
  return (
    <Panel icon={XCircle} iconClass="text-danger" title="Application Not Approved" titleClass="text-danger">
      <p className="mt-2 text-sm leading-6 text-dim">
        Unfortunately, your vendor application was not approved at this time.
      </p>
      {reason && (
        <div className="mt-3 rounded-lg border border-danger/25 bg-danger/10 p-4 text-left text-sm text-danger">
          <strong>Reason:</strong> {reason}
        </div>
      )}
      <p className="mt-3 text-xs text-dim">
        If you believe this is an error, please contact us at{" "}
        <span className="font-medium text-ink">corporate@caasdiglobal.com</span>.
      </p>
    </Panel>
  );
}
