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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      {/* Shield icon */}
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-500" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0 0 12 3.714Zm0 10.036h.008v.008H12v-.008Z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
      <p className="text-gray-600 text-center max-w-md mb-2">
        You don't have permission to access this page.
      </p>
      <p className="text-gray-500 text-sm text-center max-w-md mb-8">
        Contact your organization administrator to request access to this module.
      </p>

      <div className="flex gap-3">
        <button onClick={() => navigate(-1)}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          Go Back
        </button>
        <button onClick={() => navigate('/VendorDashboard')}
          className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors">
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
