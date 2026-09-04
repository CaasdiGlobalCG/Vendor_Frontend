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

function ProgressStepper({ currentStatus }) {
  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="w-full max-w-4xl mx-auto mt-10 px-4">
      <div className="flex items-center justify-between relative">
        {STATUS_STEPS.map((step, i) => {
          const done = i <= currentIndex;
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center z-10">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border-2 transition-all ${
                    done
                      ? "bg-[#0F5848] border-[#0F5848] text-white"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {step.icon}
                </div>
                <p
                  className={`text-xs mt-2 text-center max-w-[90px] font-medium ${
                    done ? "text-[#0F5848]" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-1 rounded-full transition-all ${
                    i < currentIndex ? "bg-[#21BE9C]" : "bg-gray-200"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mt-8 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-[#0F5848] mb-4">📅 Scheduled Visit Details</h3>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Date</p>
          <p className="font-semibold mt-1">{formatDate(schedule.scheduledDate)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Time</p>
          <p className="font-semibold mt-1">{schedule.scheduledTime || "—"}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 col-span-2">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Location</p>
          <p className="font-semibold mt-1">{schedule.location || "—"}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Audit Type</p>
          <p className="font-semibold mt-1 capitalize">{schedule.auditType || "—"}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Reschedule Attempts</p>
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
              className="text-sm text-[#0F5848] underline underline-offset-2 hover:text-[#21BE9C] transition"
            >
              Request a reschedule
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#21BE9C]"
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
                  className="px-5 py-2 text-sm rounded-lg bg-[#0F5848] text-white hover:bg-[#0F5848]/90 disabled:opacity-50 transition"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {schedule.rescheduleCount >= 2 && schedule.status === "scheduled" && (
        <p className="mt-4 text-xs text-red-500">
          ⚠️ Maximum reschedule attempts reached. Further reschedule is not possible.
        </p>
      )}

      {message && (
        <p
          className={`mt-3 text-sm p-3 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Checklist preview */}
      {checklist && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">📋 Verification Checklist</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {(checklist.sections || []).map((section) => (
              <div key={section.sectionId} className="border border-gray-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-[#0F5848] uppercase tracking-wide mb-2">
                  {section.sectionName}
                </p>
                <ul className="space-y-1">
                  {(section.items || []).map((item) => (
                    <li key={item.itemId} className="text-xs text-gray-600 flex items-start gap-1">
                      <span className="text-[#21BE9C] mt-0.5">•</span>
                      {item.description}
                      {item.required && (
                        <span className="text-red-400 ml-1">*</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">* Required items</p>
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mt-6 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-[#0F5848] mb-2">📎 Pre-Visit Documents</h3>
      <p className="text-xs text-gray-500 mb-4">
        Upload any required documents before the auditor visit (PDF max 25 MB, Images max 10 MB, Videos max 100 MB).
      </p>

      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-[#21BE9C] rounded-xl cursor-pointer hover:bg-[#f0fdf9] transition">
        <span className="text-2xl mb-1">📁</span>
        <span className="text-sm text-gray-600">Click to select files</span>
        <span className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, HEIC, MP4, MOV</span>
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
            <p key={i} className="text-xs text-gray-600 truncate">📄 {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</p>
          ))}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-2 px-5 py-2 text-sm rounded-lg bg-[#0F5848] text-white hover:bg-[#0F5848]/90 disabled:opacity-50 transition"
          >
            {uploading ? "Uploading..." : `Upload ${files.length} file(s)`}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

      {uploaded.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Uploaded:</p>
          <ul className="space-y-1">
            {uploaded.map((f, i) => (
              <li key={i} className="text-xs text-green-600 flex items-center gap-1">
                ✅ {f.fileName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Status Panels ────────────────────────────────────────────────────────────

function OnlineKYCPendingPanel() {
  return (
    <div className="text-center mt-12 max-w-xl mx-auto">
      <div className="text-5xl mb-4">📋</div>
      <h2 className="text-2xl font-semibold text-gray-800">Online KYC Under Review</h2>
      <p className="text-gray-500 mt-3 text-sm leading-relaxed">
        Our verification team is reviewing your submitted documents. This typically takes up to 24 hours.
        You'll be notified by email once the review is complete and a physical visit is scheduled.
      </p>
    </div>
  );
}

function PhysicalKYCReviewPanel() {
  return (
    <div className="text-center mt-12 max-w-xl mx-auto">
      <div className="text-5xl mb-4">🔍</div>
      <h2 className="text-2xl font-semibold text-gray-800">Compliance Review in Progress</h2>
      <p className="text-gray-500 mt-3 text-sm leading-relaxed">
        The auditor has submitted their findings. Our Compliance Lead is reviewing the physical KYC results.
        Final approval typically takes 1–3 business days.
      </p>
    </div>
  );
}

function ApprovedPanel() {
  return (
    <div className="text-center mt-12 max-w-xl mx-auto">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-2xl font-semibold text-[#0F5848]">Congratulations! You're Approved</h2>
      <p className="text-gray-500 mt-3 text-sm leading-relaxed">
        Your vendor application has been fully approved after successful completion of both online and physical KYC verification.
        You now have full access to the Caasdi platform.
      </p>
    </div>
  );
}

function RejectedPanel({ reason }) {
  return (
    <div className="text-center mt-12 max-w-xl mx-auto">
      <div className="text-5xl mb-4">❌</div>
      <h2 className="text-2xl font-semibold text-red-600">Application Not Approved</h2>
      <p className="text-gray-500 mt-3 text-sm leading-relaxed">
        Unfortunately, your vendor application was not approved at this time.
      </p>
      {reason && (
        <div className="mt-4 bg-red-50 rounded-lg p-4 text-sm text-red-700 text-left">
          <strong>Reason:</strong> {reason}
        </div>
      )}
      <p className="text-gray-400 text-xs mt-4">
        If you believe this is an error, please contact us at{" "}
        <span className="text-[#21BE9C]">corporate@caasdiglobal.com</span>.
      </p>
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
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-[#21BE9C] border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (fetchError) {
      return (
        <div className="text-center mt-12 text-red-500 text-sm">
          Error loading KYC data: {fetchError}
        </div>
      );
    }

    switch (vendorStatus) {
      case "pending":
      case "in_review":
        return <OnlineKYCPendingPanel />;

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
            <div className="text-center mt-6 max-w-xl mx-auto">
              <p className="text-sm text-gray-500">
                🏢 The physical verification visit is currently in progress. The auditor will submit their findings shortly.
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

  return (
    <div className="w-screen min-h-screen bg-gray-50 overflow-x-hidden font-[Poppins]">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-[#0F5848] to-[#21BE9C] px-8 py-8 text-white">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-semibold">
            {vendorStatus === "approved"
              ? "🎉 Application Approved!"
              : vendorStatus === "rejected"
              ? "Application Status"
              : "Verification in Progress"}
          </h1>
          <p className="mt-2 opacity-90 text-sm">
            {currentUser?.name ? `Welcome, ${currentUser.name}` : "Vendor Portal"} —{" "}
            {isPhysicalKYCPhase ? "Physical KYC Phase" : "Online KYC Phase"}
          </p>
        </div>
      </div>

      {/* Progress stepper */}
      {vendorStatus !== "rejected" && (
        <div className="bg-white border-b border-gray-200 py-6">
          <ProgressStepper currentStatus={vendorStatus} />
        </div>
      )}

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        {renderContent()}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white py-8 text-center">
        <p className="text-sm text-gray-500">
          Need help?{" "}
          <span className="text-[#21BE9C] font-medium">corporate@caasdiglobal.com</span>
        </p>
        <button
          onClick={handleBackToLogin}
          className="mt-4 px-6 py-2 text-sm rounded-lg text-gray-600 border border-gray-300 hover:bg-gray-50 transition"
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );
}
