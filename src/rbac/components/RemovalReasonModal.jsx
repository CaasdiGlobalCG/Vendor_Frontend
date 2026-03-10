// ============================================================
// FILE: rbac/components/RemovalReasonModal.jsx
// PURPOSE: Modal that collects a reason before removing a team member.
//          The reason is required and sent to the backend, which emails
//          the removed member a notification with the reason.
// CONNECTS TO: TeamPage (opens this modal on "Remove" click)
// ============================================================

import React, { useState } from 'react';

/**
 * RemovalReasonModal — collects removal reason before confirming member removal.
 * @param {Object}   props
 * @param {string}   props.memberEmail — email of the member being removed
 * @param {Function} props.onConfirm   — callback(reason) to execute the removal
 * @param {Function} props.onClose     — close the modal without removing
 */
export function RemovalReasonModal({ memberEmail, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please provide a reason for removal.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await onConfirm(trimmed);
    } catch (err) {
      setError(err.message || 'Failed to remove member');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Remove Team Member</h3>
          <p className="text-sm text-gray-500 mt-1">
            You are about to remove <span className="font-medium text-gray-700">{memberEmail}</span> from this organization.
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="removal-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason for removal <span className="text-red-500">*</span>
            </label>
            <textarea
              id="removal-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this member is being removed..."
              rows={3}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
              disabled={submitting}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/500</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700">
              The member will receive an email notification with this reason. Their access will be revoked immediately.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-lg
                         hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700
                         rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Removing…' : 'Remove Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
