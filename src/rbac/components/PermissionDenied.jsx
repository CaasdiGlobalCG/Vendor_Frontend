// ============================================================
// FILE: rbac/components/PermissionDenied.jsx
// PURPOSE: Full-page "permission denied" screen shown when a user
//          navigates to a route for a module they lack permission for.
//          Does NOT fetch any data — pure static render.
// CONNECTS TO: ModuleGuard (wraps routes with module guard)
// ============================================================

import React from 'react';

/**
 * PermissionDenied — static page shown when user lacks module access.
 *
 * @param {Object} props
 * @param {string} [props.moduleName] - Human-readable module name for display
 * @param {string} [props.moduleCode] - RBAC module code (for debugging)
 */
export function PermissionDenied({ moduleName = 'this module', moduleCode = '' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
      <div className="max-w-md w-full text-center">
        {/* Lock icon */}
        <div className="mx-auto w-16 h-16 bg-surface-hover  rounded-full flex items-center justify-center mb-5">
          <svg
            className="w-8 h-8 text-dim "
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 0h10.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75v-7.5a.75.75 0 0 1 .75-.75Z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-ink dark:text-white mb-2">
          Access Denied
        </h2>
        <p className="text-sm text-dim  mb-1">
          You don't have permission to access{' '}
          <span className="font-medium text-ink ">{moduleName}</span>.
        </p>
        <p className="text-sm text-dim  mb-6">
          Contact your admin to request access to this module.
        </p>

        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-info text-white text-sm font-medium hover:bg-info transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Go Back
        </button>

        {moduleCode && (
          <p className="mt-6 text-xs text-dim ">
            Module: {moduleCode}
          </p>
        )}
      </div>
    </div>
  );
}

export default PermissionDenied;
