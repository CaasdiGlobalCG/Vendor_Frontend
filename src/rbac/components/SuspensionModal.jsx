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
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 pt-5 pb-3 border-b border-line">
          <h3 className="text-lg font-semibold text-ink">
            {isSuspend ? 'Suspend Team Member' : 'Unsuspend Team Member'}
          </h3>
          <p className="text-sm text-dim mt-1">
            {isSuspend ? 'Temporarily block access for ' : 'Restore access for '}
            <span className="font-medium text-ink">{memberEmail}</span>
            .
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Reason {isSuspend ? <span className="text-danger">*</span> : <span className="text-dim">(optional)</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isSuspend ? 'Explain why this member is being suspended...' : 'Optional note for unsuspension...'}
              rows={3}
              maxLength={500}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm
                         focus:ring-2 focus:ring-ink focus:border-line resize-none"
              disabled={submitting}
              autoFocus
            />
            <p className="text-xs text-dim mt-1 text-right">{reason.length}/500</p>
          </div>

          {isSuspend && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Suspension duration in days <span className="text-dim">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="Leave empty for manual unsuspend"
                className="w-full border border-line rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-ink focus:border-line"
                disabled={submitting}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-dim hover:text-ink font-medium rounded-lg
                         hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (isSuspend && !reason.trim())}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed bg-cta hover:bg-cta"
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
