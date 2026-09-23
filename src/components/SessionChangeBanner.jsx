// ============================================================
// FILE: SessionChangeBanner.jsx
// PURPOSE: Shows a warning banner when another browser tab changed
//          the logged-in user. Does NOT auto-refresh — user clicks
//          "Reload" to acknowledge and load the new session.
// CONNECTS TO: VendorContext (sessionChanged, dismissSessionChange)
// ============================================================

import React, { useContext } from 'react';
import { VendorContext } from '../context/VendorContext';

/**
 * SessionChangeBanner — fixed-position warning at the top of the page.
 * Visible only when VendorContext.sessionChanged is true.
 * Click "Reload" to window.location.reload() and load the new user's data.
 * Click "Dismiss" to hide the banner (keeps stale data until manual refresh).
 */
export function SessionChangeBanner() {
  const { sessionChanged, dismissSessionChange } = useContext(VendorContext);

  if (!sessionChanged) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-warning text-white px-4 py-2.5 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2 text-sm font-medium">
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <span>
          Session changed — another user logged in from a different tab.
          Your data may be stale. Reload to see the current user's data.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 bg-surface text-warning rounded-md text-sm font-semibold hover:bg-warning/10 transition-colors"
        >
          Reload
        </button>
        <button
          onClick={dismissSessionChange}
          className="px-3 py-1 text-white/80 hover:text-white text-sm transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
