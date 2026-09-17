// ============================================================
// FILE: rbac/components/LockedNavItem.jsx
// PURPOSE: Disabled nav item with lock icon + tooltip, used as the
//          lockedFallback for PermissionGate in the Vendor header nav.
//          Shows "You don't have permission to access this. Contact your admin."
// CONNECTS TO: PermissionGate (used as lockedFallback prop), Header.jsx
// ============================================================

import React from 'react';

/**
 * LockedNavItem — renders a disabled nav link with lock icon and tooltip.
 *
 * @param {Object} props
 * @param {string} props.label - Nav item label (e.g., "Projects", "Leads")
 * @param {string} [props.className] - Optional className to match original nav styling
 */
export function LockedNavItem({ label, className = '' }) {
  const tooltip = `You don't have permission to access this. Contact your admin.`;

  return (
    <span
      className={`cursor-not-allowed opacity-50 hover:opacity-70 transition-opacity ${className}`}
      title={tooltip}
    >
      <span className="flex items-center gap-1">
        {label}
        <svg
          className="w-3 h-3"
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
      </span>
    </span>
  );
}

export default LockedNavItem;
