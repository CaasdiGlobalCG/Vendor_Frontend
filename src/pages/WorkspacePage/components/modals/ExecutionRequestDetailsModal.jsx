import React from 'react';
import { X, ClipboardCheck } from 'lucide-react';

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-dim font-medium">{label}</p>
    <p className="mt-1 text-sm text-ink break-words">{value || '-'}</p>
  </div>
);

const ExecutionRequestDetailsModal = ({ isOpen, onClose, nodeData }) => {
  if (!isOpen || !nodeData) return null;

  const request = nodeData.executionRequestData?.executionRequest || {};

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl bg-surface border border-line shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-line bg-canvas px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-info" />
              Execution Request Details
            </h3>
            <p className="text-xs text-dim mt-1">{request.requestId || '-'} • {request.templateType || 'execution-work-order'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-dim hover:bg-surface-hover">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section className="rounded-xl border border-line p-4">
            <h4 className="text-sm font-semibold text-ink mb-3">Core Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Title" value={request.title} />
              <Field label="Status" value={request.status} />
              <Field label="Priority" value={request.priority} />
              <Field label="Trade / Discipline" value={request.trade} />
              <Field label="Location" value={request.location} />
              <Field label="Assignee" value={request.assignee} />
              <Field label="Due Date" value={request.dueDate} />
              <Field label="Raised By" value={request.raisedBy} />
              <Field label="Quantity" value={request.quantity ? `${request.quantity} ${request.unit || ''}`.trim() : ''} />
              <Field label="Dependencies" value={request.dependencies} />
            </div>
            <div className="mt-4">
              <Field label="Description" value={request.description} />
            </div>
          </section>

          {request.templateType === 'execution-rfi' && (
            <section className="rounded-xl border border-info/20 bg-info/10 p-4">
              <h4 className="text-sm font-semibold text-info mb-3">RFI Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Technical Question" value={request.question} />
                <Field label="Drawing Reference" value={request.drawingReference} />
                <Field label="Required Response By" value={request.requiredResponseBy} />
              </div>
            </section>
          )}

          {request.templateType === 'execution-inspection' && (
            <section className="rounded-xl border border-line bg-surface-hover p-4">
              <h4 className="text-sm font-semibold text-ink mb-3">Inspection Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Checklist Type" value={request.checklistType} />
                <Field label="Inspection Date" value={request.inspectionDate} />
              </div>
            </section>
          )}

          {request.templateType === 'execution-daily-site-log' && (
            <section className="rounded-xl border border-warning/20 bg-warning/10 p-4">
              <h4 className="text-sm font-semibold text-warning mb-3">Daily Site Log Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Work Completed Today" value={request.workCompletedToday} />
                <Field label="Weather Conditions" value={request.weatherConditions} />
                <Field label="Skilled Labor Count" value={request.laborSkilled} />
                <Field label="Unskilled Labor Count" value={request.laborUnskilled} />
                <Field label="Equipment Used" value={request.equipmentUsed} />
                <Field label="Issues / Blockers" value={request.blockers} />
              </div>
            </section>
          )}

          <section className="rounded-xl border border-line p-4">
            <Field label="Notes" value={request.notes} />
          </section>
        </div>
      </div>
    </div>
  );
};

export default ExecutionRequestDetailsModal;
