// ============================================================
// FILE: rbac/components/LockedButton.jsx
// PURPOSE: Disabled button with lock icon + tooltip, used as the
//          lockedFallback for action-level PermissionGate wrapping.
//          Shows "Contact your admin to request {action} access for {module}."
// CONNECTS TO: PermissionGate (used as lockedFallback prop)
// ============================================================

import React from 'react';

/**
 * LockedButton — renders a disabled button with lock icon and tooltip.
 *
 * @param {Object} props
 * @param {string} props.label - Original button label (e.g., "Create Order")
 * @param {string} props.module - RBAC module code (e.g., 'orders')
 * @param {string} props.action - Action code (e.g., 'create', 'edit', 'delete')
 * @param {string} [props.className] - Optional className to match original button styling
 */
export function LockedButton({ label, module, action, className = '' }) {
  const tooltip = `Contact your admin to request ${action} access for ${module}.`;

  return (
    <button
      disabled
      title={tooltip}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed ${className}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 0h10.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75v-7.5a.75.75 0 0 1 .75-.75Z"
        />
      </svg>
      {label}
    </button>
  );
}

export default LockedButton;
