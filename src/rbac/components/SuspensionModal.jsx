// ============================================================
// FILE: rbac/components/SuspensionModal.jsx
// PURPOSE: Collects suspension/unsuspension details with validation.
// CONNECTS TO: TeamPage (member suspension lifecycle actions)
// ============================================================

import React, { useState } from 'react';

/**
 * SuspensionModal
 * @param {Object} props
 * @param {'suspend'|'unsuspend'} props.mode
 * @param {string} props.memberEmail
 * @param {(payload: { reason: string, durationDays?: number }) => Promise<void>} props.onConfirm
 * @param {() => void} props.onClose
 */
export function SuspensionModal({ mode, memberEmail, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isSuspend = mode === 'suspend';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedReason = reason.trim();

    if (isSuspend && !trimmedReason) {
      setError('Please provide a suspension reason.');
      return;
    }

    let parsedDays;
    if (isSuspend) {
      const daysRaw = durationDays.trim();
      if (daysRaw) {
        const value = Number(daysRaw);
        if (!Number.isInteger(value) || value <= 0) {
          setError('Duration must be a whole number of days greater than 0.');
          return;
        }
        parsedDays = value;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      await onConfirm({ reason: trimmedReason, durationDays: parsedDays });
    } catch (err) {
      setError(err.message || `Failed to ${isSuspend ? 'suspend' : 'unsuspend'} member`);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 pt-5 pb-3 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {isSuspend ? 'Suspend Team Member' : 'Unsuspend Team Member'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {isSuspend ? 'Temporarily block access for ' : 'Restore access for '}
            <span className="font-medium text-gray-700">{memberEmail}</span>
            .
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason {isSuspend ? <span className="text-red-500">*</span> : <span className="text-gray-400">(optional)</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isSuspend ? 'Explain why this member is being suspended...' : 'Optional note for unsuspension...'}
              rows={3}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
              disabled={submitting}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/500</p>
          </div>

          {isSuspend && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Suspension duration in days <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="Leave empty for manual unsuspend"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                disabled={submitting}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

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
              disabled={submitting || (isSuspend && !reason.trim())}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed bg-teal-600 hover:bg-teal-700"
            >
              {submitting
                ? (isSuspend ? 'Suspending...' : 'Unsuspending...')
                : (isSuspend ? 'Suspend Member' : 'Unsuspend Member')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
