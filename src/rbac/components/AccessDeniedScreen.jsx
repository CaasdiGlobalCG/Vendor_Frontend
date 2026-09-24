// ============================================================
// FILE: rbac/components/AccessDeniedScreen.jsx
// PURPOSE: Full-page interceptor shown when a member's access has been
//          revoked (status = 'removed' or 'suspended'). Renders instead
//          of the normal app content so the user cannot navigate anywhere.
// CONNECTS TO: RBACContext (accessDenied state),
//              VendorContext (logout)
// ============================================================

import React, { useContext, useRef } from 'react';
import { useRBAC } from '../context/RBACContext';
import { VendorContext } from '../../context/VendorContext';
import AuthSkeletonScreen from '../../components/loading/AuthSkeletonScreen';

/**
 * AccessDeniedGuard — wraps app content and blocks rendering if accessDenied is set.
 * Place this as the first child inside <RBACProvider>.
 *
 * Pre-auth routes (/signup, /verification) are excluded from RBACProvider entirely
 * via App.jsx's PreAuthContent branch, so no path-bypass is needed here.
 */
export function AccessDeniedGuard({ children }) {
  const { accessDenied, isLoading } = useRBAC();
  const resolvedOnceRef = useRef(false);

  if (!isLoading) {
    resolvedOnceRef.current = true;
  }

  // Block rendering only until RBAC resolves the FIRST time — a refetch must not
  // unmount children, or mounted pages refetch on every remount and any writer
  // that produces a new currentUser object spins an infinite skeleton loop.
  if (isLoading && !resolvedOnceRef.current) {
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
    iconBg = 'bg-warning/10';
    iconColor = 'text-warning';
  } else if (isNoOrg) {
    title = 'No Organization Access';
    description = message || 'You are not currently a member of any organization. You may have been removed, or your invitation may have expired.';
    iconBg = 'bg-warning/10';
    iconColor = 'text-warning';
  } else if (isSuspended) {
    title = 'Account Suspended';
    description = message || 'Your account has been temporarily suspended by an administrator.';
    iconBg = 'bg-danger/10';
    iconColor = 'text-danger';
  } else {
    title = 'Access Revoked';
    description = message || 'Your access to this organization has been revoked.';
    iconBg = 'bg-danger/10';
    iconColor = 'text-danger';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-hover via-surface to-black flex items-center justify-center px-4 py-8">
      <div className="max-w-xl w-full rounded-2xl border border-line bg-surface p-8 shadow-lg text-center">
        {/* Icon */}
        <div className={`mx-auto w-16 h-16 rounded-full ${iconBg} flex items-center justify-center mb-4`}>
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

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dim">Account Access</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-3 text-dim">{description}</p>

        <div className="mt-6 bg-canvas border border-line rounded-xl p-4 text-left">
          <p className="text-sm text-dim leading-relaxed">
            {isError
              ? 'This is usually temporary. Please try refreshing the page or signing in again. If the issue persists, contact your administrator.'
              : isNoOrg
              ? 'If you were recently removed, contact your organization administrator. If you need access to a new organization, request a fresh invitation.'
              : 'If you believe this is incorrect, contact your organization administrator to review your role and access status.'}
          </p>
        </div>

        <button
          onClick={handleReturnToLogin}
          className="mt-7 w-full px-4 py-2.5 bg-cta text-cta-foreground font-medium rounded-lg hover:bg-cta transition-colors"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}
