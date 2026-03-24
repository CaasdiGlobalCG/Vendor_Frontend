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
import AuthSkeletonScreen from '../../components/loading/AuthSkeletonScreen';

/**
 * AccessDeniedGuard — wraps app content and blocks rendering if accessDenied is set.
 * Place this as the first child inside <RBACProvider>.
 */
export function AccessDeniedGuard({ children }) {
  const { accessDenied, isLoading } = useRBAC();

  // Block rendering until RBAC has resolved — prevents flash of protected content
  if (isLoading) {
    return <AuthSkeletonScreen message="Checking your access permissions..." />;
  }

  if (accessDenied) {
    return <AccessDeniedScreen code={accessDenied.code} message={accessDenied.message} />;
  }

  return children;
}

/** Full-page access-denied screen */
function AccessDeniedScreen({ code, message }) {
  const { logout } = useContext(VendorContext);

  const handleReturnToLogin = () => {
    if (logout) logout();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  const isNoOrg = code === 'NO_ORG';
  const isSuspended = code === 'RBAC_002';
  const isError = code === 'RBAC_ERROR';

  let title, description, iconBg, iconColor;
  if (isError) {
    title = 'Access Verification Failed';
    description = message || 'We could not verify your access at this time. Please try again later.';
    iconBg = 'bg-amber-100';
    iconColor = 'text-amber-600';
  } else if (isNoOrg) {
    title = 'No Organization Access';
    description = message || 'You are not currently a member of any organization. You may have been removed, or your invitation may have expired.';
    iconBg = 'bg-amber-100';
    iconColor = 'text-amber-600';
  } else if (isSuspended) {
    title = 'Account Suspended';
    description = message || 'Your account has been temporarily suspended by an administrator.';
    iconBg = 'bg-red-100';
    iconColor = 'text-red-600';
  } else {
    title = 'Access Revoked';
    description = message || 'Your access to this organization has been revoked.';
    iconBg = 'bg-red-100';
    iconColor = 'text-red-600';
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className={`mx-auto w-16 h-16 rounded-full ${iconBg} flex items-center justify-center mb-6`}>
          {isNoOrg || isError ? (
            <svg className={`w-8 h-8 ${iconColor}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          ) : (
            <svg className={`w-8 h-8 ${iconColor}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-8">{description}</p>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-gray-500">
            {isError
              ? 'This is usually temporary. Please try refreshing the page or logging in again. If the problem persists, contact your administrator.'
              : isNoOrg
              ? 'If you were recently removed, please contact your organization administrator. If you need access to a new organization, ask an admin to send you an invitation.'
              : 'If you believe this is a mistake, please contact your organization administrator for assistance.'}
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
