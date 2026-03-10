// ============================================================
// FILE: rbac/components/AccessDeniedScreen.jsx
// PURPOSE: Full-page interceptor shown when a member's access has been
//          revoked (status = 'removed' or 'suspended'). Renders instead
//          of the normal app content so the user cannot navigate anywhere.
// CONNECTS TO: RBACContext (accessDenied state),
//              VendorContext (logout)
// ============================================================

import React, { useContext } from 'react';
import { useRBAC } from '../context/RBACContext';
import { VendorContext } from '../../context/VendorContext';

/**
 * AccessDeniedGuard — wraps app content and blocks rendering if accessDenied is set.
 * Place this as the first child inside <RBACProvider>.
 */
export function AccessDeniedGuard({ children }) {
  const { accessDenied } = useRBAC();

  if (!accessDenied) return children;

  return <AccessDeniedScreen code={accessDenied.code} message={accessDenied.message} />;
}

/** Full-page access-revoked screen */
function AccessDeniedScreen({ code, message }) {
  const { logout } = useContext(VendorContext);

  const handleReturnToLogin = () => {
    if (logout) logout();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  const isSuspended = code === 'RBAC_002';
  const title = isSuspended ? 'Account Suspended' : 'Access Revoked';
  const description = message || (isSuspended
    ? 'Your account has been temporarily suspended by an administrator.'
    : 'Your access to this organization has been revoked.');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-8">{description}</p>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-gray-500">
            If you believe this is a mistake, please contact your organization administrator for assistance.
          </p>
        </div>

        <button
          onClick={handleReturnToLogin}
          className="w-full px-4 py-2.5 bg-teal-600 text-white font-medium rounded-lg
                     hover:bg-teal-700 transition-colors"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}
