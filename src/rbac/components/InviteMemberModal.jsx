// ============================================================
// FILE: rbac/components/InviteMemberModal.jsx
// PURPOSE: Modal dialog for inviting team members to the org.
//          Phase 2 ready — connects to inviteMember API.
// CONNECTS TO: rbacApi.inviteMember (Phase 2),
//              rbacApi.listRoles (for role dropdown)
// ============================================================

import React, { useState } from 'react';

/**
 * InviteMemberModal — form modal for sending member invitations.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Called when modal should close
 * @param {Function} props.onInvite - async callback({ email, roleId }) on submit
 * @param {Array} [props.roles] - Available roles for the dropdown
 * @param {boolean} [props.isLoading] - Disable form while submitting
 */
export function InviteMemberModal({
  isOpen,
  onClose,
  onInvite,
  roles = [],
  isLoading = false,
}) {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  /** Reset form state */
  const resetForm = () => {
    setEmail('');
    setSelectedRole('');
    setError('');
  };

  /** Handle form submission */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) return setError('Email is required');
    if (!selectedRole) return setError('Please select a role');

    try {
      await onInvite({ email: email.trim(), roleId: selectedRole });
      resetForm();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send invitation');
    }
  };

  /** Close and reset */
  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">
            Invite Team Member
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                         text-sm disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                         text-sm disabled:bg-gray-50"
            >
              <option value="">Select a role...</option>
              {roles
                .filter(r => r.roleId !== 'super_admin')
                .map(r => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.roleName}
                  </option>
                ))}
            </select>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg
                         hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg
                         hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
