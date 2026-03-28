// ============================================================
// FILE: pages/UnauthorizedPage.jsx
// PURPOSE: Full-page "Access Denied" screen shown when a team member
//          navigates to a module they don't have permission for.
//          Provides a back button and admin-contact guidance.
// CONNECTS TO: ModuleGuard (redirects here), App.jsx (route)
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * UnauthorizedPage — clean access-denied screen.
 * Shown when ModuleGuard blocks a user from a module they can't access.
 */
export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 px-4 py-8">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-lg sm:p-10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0 0 12 3.714Zm0 10.036h.008v.008H12v-.008Z" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">Restricted Module</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Access Denied</h1>
            <p className="mt-3 text-gray-600">
              You do not currently have permission to open this area.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-700">
              Ask your organization administrator to grant the required module access in Team & Permissions.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Tip: include the module name and why you need access so approval is faster.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate('/VendorDashboard')}
              className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
