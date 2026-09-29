// FILE: components/AuditorWaiting.jsx
// PURPOSE: Vendor portal for the /Auditorapprove route.
//          Shows status-based content: online KYC pending review → physical KYC
//          scheduled → visit in progress → compliance review → approved/rejected.
// CONNECTS TO: context/VendorContext.jsx, services/physicalKYCApi.js

import React, { useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { VendorContext } from "../context/VendorContext";
import {
  getPhysicalKYCStatus,
  requestReschedule,
  uploadEvidence,
} from "../services/physicalKYCApi";
import {
  getAdditionalDocRequest,
  uploadAdditionalDocument,
} from "../services/additionalDocsApi";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  HelpCircle,
  Mail,
  Paperclip,
  Upload,
} from "lucide-react";
import { StatusTimeline } from "./kyc-status/StatusTimeline";
import {
  OnlineKYCPendingPanel,
  PhysicalKYCReviewPanel,
  ApprovedPanel,
  ResubmitRequestedPanel,
  RejectedPanel,
} from "./kyc-status/KycPanels";
import { statusTone } from "./kyc-status/status-tone";
import { cn } from "./ui";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_STEPS = [
  { key: "in_review", label: "Online KYC Review", icon: "📋" },
  { key: "physical_kyc_scheduled", label: "Physical Visit Scheduled", icon: "📅" },
  { key: "physical_kyc_in_progress", label: "Visit In Progress", icon: "🏢" },
  { key: "physical_kyc_review", label: "Compliance Review", icon: "🔍" },
  { key: "approved", label: "Approved", icon: "✅" },
];

function getStepIndex(status) {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScheduleCard({ schedule, checklist, onRescheduleRequest }) {
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const canReschedule =
    schedule.status === "scheduled" && (schedule.rescheduleCount || 0) < 2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleReason.trim()) return;
    setSubmitting(true);
    try {
      await onRescheduleRequest(rescheduleReason);
      setMessage({ type: "success", text: "Reschedule request submitted. Our team will contact you." });
      setShowForm(false);
      setRescheduleReason("");
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Calendar size={16} className="text-dim" aria-hidden="true" />
        Scheduled Visit Details
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-canvas p-3">
          <p className="text-dim text-xs uppercase tracking-wide">Date</p>
          <p className="font-semibold mt-1">{formatDate(schedule.scheduledDate)}</p>
        </div>
        <div className="rounded-xl bg-canvas p-3">
          <p className="text-dim text-xs uppercase tracking-wide">Time</p>
          <p className="font-semibold mt-1">{schedule.scheduledTime || "—"}</p>
        </div>
        <div className="rounded-xl bg-canvas p-3 col-span-2">
          <p className="text-dim text-xs uppercase tracking-wide">Location</p>
          <p className="font-semibold mt-1">{schedule.location || "—"}</p>
        </div>
        <div className="rounded-xl bg-canvas p-3">
          <p className="text-dim text-xs uppercase tracking-wide">Audit Type</p>
          <p className="font-semibold mt-1 capitalize">{schedule.auditType || "—"}</p>
        </div>
        <div className="rounded-xl bg-canvas p-3">
          <p className="text-dim text-xs uppercase tracking-wide">Reschedule Attempts</p>
          <p className="font-semibold mt-1">
            {schedule.rescheduleCount || 0} / 2
          </p>
        </div>
      </div>

      {/* Reschedule block */}
      {canReschedule && (
        <div className="mt-5">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm text-ink underline underline-offset-2 transition-colors duration-180 ease-signal hover:text-dim"
            >
              Request a reschedule
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <textarea
                className="w-full resize-none rounded-lg border border-line bg-canvas p-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink"
                rows={3}
                placeholder="Please explain why you need to reschedule..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                required
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="brand-press rounded-lg bg-cta px-5 py-2 text-sm text-cta-foreground transition-colors duration-180 ease-signal hover:bg-cta/90 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-line px-5 py-2 text-sm transition-colors duration-180 ease-signal hover:bg-canvas"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {schedule.rescheduleCount >= 2 && schedule.status === "scheduled" && (
        <p className="mt-4 text-xs text-warning">
          Maximum reschedule attempts reached. Further reschedule is not possible.
        </p>
      )}

      {message && (
        <p
          className={`mt-3 text-sm p-3 rounded-lg ${
            message.type === "success"
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Checklist preview */}
      {checklist && (
        <div className="mt-6">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <ClipboardList size={14} className="text-dim" aria-hidden="true" />
            Verification Checklist
          </h4>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {(checklist.sections || []).map((section) => (
              <div key={section.sectionId} className="border border-line rounded-lg p-3">
                <p className="text-xs font-semibold text-ink uppercase tracking-wide mb-2">
                  {section.sectionName}
                </p>
                <ul className="space-y-1">
                  {(section.items || []).map((item) => (
                    <li key={item.itemId} className="text-xs text-dim flex items-start gap-1">
                      <span className="text-dim mt-0.5">•</span>
                      {item.description}
                      {item.required && (
                        <span className="text-danger ml-1">*</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-dim mt-2">* Required items</p>
        </div>
      )}
    </div>
  );
}

function EvidenceUploadPanel({ vendorId, scheduleId }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState([]);
  const [error, setError] = useState(null);

  const ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic,.mp4,.mov";

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadEvidence(vendorId, scheduleId, files);
      setUploaded((prev) => [...prev, ...result]);
      setFiles([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Paperclip size={16} className="text-dim" aria-hidden="true" />
        Pre-Visit Documents
      </h3>
      <p className="mt-1 text-xs text-dim">
        Upload any required documents before the auditor visit (PDF max 25 MB, Images max 10 MB, Videos max 100 MB).
      </p>

      <label className="mt-4 flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line transition-colors duration-180 ease-signal hover:bg-surface-hover">
        <Upload size={22} className="mb-1 text-dim" aria-hidden="true" />
        <span className="text-sm text-dim">Click to select files</span>
        <span className="mt-1 text-xs text-dim">PDF, JPG, PNG, HEIC, MP4, MOV</span>
        <input
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files))}
        />
      </label>

      {files.length > 0 && (
        <div className="mt-3 space-y-1">
          {files.map((f, i) => (
            <p key={i} className="text-xs text-dim truncate">{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</p>
          ))}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="brand-press mt-2 rounded-lg bg-cta px-5 py-2 text-sm text-cta-foreground transition-colors duration-180 ease-signal hover:bg-cta/90 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : `Upload ${files.length} file(s)`}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      {uploaded.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-dim mb-2">Uploaded:</p>
          <ul className="space-y-1">
            {uploaded.map((f, i) => (
              <li key={i} className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 size={12} className="shrink-0" aria-hidden="true" />
                {f.fileName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Additional documents requested by the auditor ────────────────────────────

const ADDITIONAL_DOC_ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

export function AdditionalDocsPanel() {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getAdditionalDocRequest();
      setRequest(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (docId, file) => {
    if (!file) return;
    setUploadingId(docId);
    setError(null);
    try {
      const result = await uploadAdditionalDocument(docId, file);
      setRequest(result.additionalDocRequest || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingId(null);
    }
  };

  if (loading || !request) return null;

  const items = Array.isArray(request.documents) ? request.documents : [];
  const pendingItems = items.filter((d) => d.status !== 'submitted');
  const isSubmitted = request.status === 'submitted' || pendingItems.length === 0;

  return (
    <div className="bg-surface rounded-2xl border border-line p-6 mt-8 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-ink mb-1">📄 Additional Documents Requested</h3>
      <p className="text-xs text-dim mb-4">
        The auditor needs the following documents to continue your verification. Upload each document below.
      </p>

      {request.remarks && (
        <div className="bg-canvas rounded-lg p-3 mb-4 text-sm text-ink">
          <span className="text-xs text-dim block mb-1">Auditor note</span>
          {request.remarks}
        </div>
      )}

      <div className="space-y-3">
        {items.map((doc) => {
          const submitted = doc.status === 'submitted' && doc.file;
          const inputId = `addl-doc-${doc.id}`;
          return (
            <div
              key={doc.id}
              className={`border rounded-lg p-3 flex items-center justify-between gap-3 ${
                submitted ? 'border-success/30 bg-success/10' : 'border-line'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{doc.name}</p>
                {doc.description && (
                  <p className="text-xs text-dim mt-0.5">{doc.description}</p>
                )}
                {submitted && (
                  <p className="text-xs text-success mt-1 truncate">✓ {doc.file.name}</p>
                )}
              </div>
              {!isSubmitted && (
                <div className="flex-shrink-0">
                  <input
                    type="file"
                    id={inputId}
                    accept={ADDITIONAL_DOC_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) handleUpload(doc.id, f);
                    }}
                  />
                  <label
                    htmlFor={inputId}
                    className={`text-xs px-3 py-2 rounded-lg cursor-pointer transition inline-block ${
                      uploadingId === doc.id
                        ? 'bg-surface-hover text-dim pointer-events-none'
                        : submitted
                        ? 'border border-line text-dim hover:bg-canvas'
                        : 'bg-success text-white hover:bg-success/90'
                    }`}
                  >
                    {uploadingId === doc.id ? 'Uploading…' : submitted ? 'Replace' : 'Upload'}
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      {isSubmitted && (
        <p className="mt-4 text-sm p-3 rounded-lg bg-success/10 text-success">
          ✅ All requested documents submitted. The auditor will continue your verification.
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditorWaiting() {
  const navigate = useNavigate();
  const { currentUser } = useContext(VendorContext);

  const [kycData, setKycData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const vendorStatus = currentUser?.status || "pending";
  const vendorId = currentUser?.vendorId;

  const PHYSICAL_KYC_STATUSES = [
    "physical_kyc_scheduled",
    "physical_kyc_in_progress",
    "physical_kyc_review",
    "approved",
    "rejected",
  ];

  const isPhysicalKYCPhase = PHYSICAL_KYC_STATUSES.includes(vendorStatus);

  const loadKYCData = useCallback(async () => {
    if (!isPhysicalKYCPhase || !vendorId) {
      setLoading(false);
      return;
    }
    try {
      const data = await getPhysicalKYCStatus(vendorId);
      setKycData(data);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vendorId, isPhysicalKYCPhase]);

  useEffect(() => {
    loadKYCData();
  }, [loadKYCData]);

  const handleReschedule = async (reason) => {
    if (!kycData?.schedule) throw new Error("No active schedule found");
    await requestReschedule(vendorId, kycData.schedule.scheduleId, reason);
    await loadKYCData();
  };

  const handleBackToLogin = () => {
    localStorage.clear();
    navigate("/");
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-success border-t-transparent" />
        </div>
      );
    }

    if (fetchError) {
      return (
        <div className="rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm text-danger">
          Error loading KYC data: {fetchError}
        </div>
      );
    }

    switch (vendorStatus) {
      case "pending":
      case "in_review":
        return <OnlineKYCPendingPanel />;

      case "resubmit_requested":
        return (
          <ResubmitRequestedPanel
            permissions={currentUser?.resubmitPermissions}
            remarks={currentUser?.resubmitRemarks}
            onEditSubmission={() => navigate("/Form1")}
          />
        );

      case "physical_kyc_scheduled":
        return (
          <>
            <ScheduleCard
              schedule={kycData?.schedule || {}}
              checklist={kycData?.checklist}
              onRescheduleRequest={handleReschedule}
            />
            {vendorId && kycData?.schedule && (
              <EvidenceUploadPanel
                vendorId={vendorId}
                scheduleId={kycData.schedule.scheduleId}
              />
            )}
          </>
        );

      case "physical_kyc_in_progress":
        return (
          <>
            {kycData?.schedule && (
              <ScheduleCard
                schedule={kycData.schedule}
                checklist={kycData?.checklist}
                onRescheduleRequest={handleReschedule}
              />
            )}
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface p-5 text-sm text-dim">
              <Building2 size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
              <p>
                The physical verification visit is currently in progress. The auditor will submit their findings shortly.
              </p>
            </div>
          </>
        );

      case "physical_kyc_review":
        return <PhysicalKYCReviewPanel />;

      case "approved":
        return <ApprovedPanel />;

      case "rejected":
        return <RejectedPanel reason={currentUser?.rejectionReason} />;

      default:
        return <OnlineKYCPendingPanel />;
    }
  };

  const tone = statusTone(vendorStatus);

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Page header */}
        <header className="auth-rise flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
              Caasdi Global · Vendor Portal
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
              Verification timeline
            </h1>
            <p className="mt-2 text-sm text-dim">
              {currentUser?.name ? `Welcome, ${currentUser.name}` : "Vendor Portal"} —{" "}
              {isPhysicalKYCPhase ? "Physical KYC Phase" : "Online KYC Phase"}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold",
              tone.chip
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} aria-hidden="true" />
            {tone.label}
          </span>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
          {/* Timeline with the current stage expanded */}
          <div className="min-w-0">
            <StatusTimeline
              steps={STATUS_STEPS}
              currentIndex={getStepIndex(vendorStatus)}
              rejected={vendorStatus === "rejected"}
            >
              {renderContent()}
            </StatusTimeline>

            {/* Auditor-requested extra documents — shown on top of any status panel */}
            <AdditionalDocsPanel />
          </div>

          {/* Meta rail */}
          <aside
            className="auth-rise-left min-w-0 lg:sticky lg:top-10 lg:self-start"
            style={{ animationDelay: "160ms" }}
          >
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">Vendor</p>
              <p className="mt-1.5 text-sm font-semibold text-ink">{currentUser?.name || "—"}</p>
              <p className="mt-0.5 text-xs text-dim">
                <span className="font-mono">{currentUser?.vendorId || "—"}</span>
              </p>
              <p className="mt-3 inline-flex rounded-full border border-line px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dim">
                {isPhysicalKYCPhase ? "Physical KYC Phase" : "Online KYC Phase"}
              </p>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-line bg-surface p-5 text-xs text-dim">
              <Mail size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p>
                Need help? <span className="font-medium text-ink">corporate@caasdiglobal.com</span>
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-line py-8 text-center">
        <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-dim">
          <HelpCircle size={14} aria-hidden="true" />
          Need help?{" "}
          <span className="font-medium text-ink">corporate@caasdiglobal.com</span>
        </p>
        <button
          onClick={handleBackToLogin}
          className="brand-press mt-4 rounded-lg border border-line px-6 py-2 text-sm text-dim transition-colors duration-180 ease-signal hover:bg-surface-hover hover:text-ink"
        >
          ← Back to Login
        </button>
      </footer>
    </div>
  );
}
