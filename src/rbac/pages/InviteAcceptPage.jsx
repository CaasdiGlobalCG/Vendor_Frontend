// ============================================================
// FILE: InviteAcceptPage.jsx
// PURPOSE: Public page where invited team members accept their invitation,
//          set their display name + password, and create their account.
//          Accessed via email link: /invite/accept?token=...
// CONNECTS TO: GET /api/rbac/invite/validate, POST /api/rbac/invite/accept,
//              App.jsx (public route), Login.jsx (redirect after success)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import config from '../../config/env';

const BASE_URL = config.VENDOR_BACKEND_URL || '';

/**
 * InviteAcceptPage
 *
 * Three-state page:
 *   1. Loading — validates the invitation token
 *   2. Form    — displays org/role info + password/name setup form
 *   3. Result  — success (redirect to login) or error (expired/invalid/used)
 */
export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // ── State ──
  const [phase, setPhase] = useState('loading');        // 'loading' | 'form' | 'success' | 'error'
  const [invite, setInvite] = useState(null);            // { email, orgName, roleName, orgType, expiresAt }
  const [error, setError] = useState('');

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Validate token on mount ──
  const validateToken = useCallback(async () => {
    if (!token) {
      setError('No invitation token provided. Please check your email link.');
      setPhase('error');
      return;
    }

    try {
      const res = await fetch(
        `${BASE_URL}/api/rbac/invite/validate?token=${encodeURIComponent(token)}`
      );
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setError(data.error || 'This invitation is invalid.');
        setPhase('error');
        return;
      }

      setInvite(data);
      setPhase('form');
    } catch (err) {
      console.error('[InviteAccept] Validation error:', err);
      setError('Unable to validate invitation. Please try again later.');
      setPhase('error');
    }
  }, [token]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  // ── Password validation helpers ──
  const passwordRules = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
  const allRulesPassed = Object.values(passwordRules).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  // ── Submit handler ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!displayName.trim() || displayName.trim().length < 2) {
      setFormError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!allRulesPassed) {
      setFormError('Please fix the password requirements below.');
      return;
    }
    if (!passwordsMatch) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/rbac/invite/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          displayName: displayName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to accept invitation. Please try again.');
        setSubmitting(false);
        return;
      }

      setPhase('success');
    } catch (err) {
      console.error('[InviteAccept] Submit error:', err);
      setFormError('Network error. Please check your connection and try again.');
      setSubmitting(false);
    }
  };

  // ── Renders ──

  // Loading state
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-200 border-t-teal-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700">Validating your invitation...</h2>
          <p className="text-sm text-gray-500 mt-2">This will only take a moment.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Invitation Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (phase === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to the team!</h2>
          <p className="text-gray-600 mb-2">
            You've been added to <strong className="text-teal-700">{invite?.orgName}</strong> as{' '}
            <strong className="text-teal-700">{invite?.roleName}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Your account is ready. You can now log in with your email and the password you just set.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-lg"
          >
            Log In Now
          </button>
        </div>
      </div>
    );
  }

  // ── Form state (primary) ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-8 py-6 text-white">
          <h1 className="text-2xl font-bold mb-1">Welcome to Caasdi</h1>
          <p className="text-teal-100 text-sm">Set up your account to get started</p>
        </div>

        {/* Invitation info */}
        <div className="px-8 pt-6">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {invite?.roleName?.charAt(0)?.toUpperCase() || 'M'}
              </div>
              <div>
                <p className="text-sm text-teal-600 font-medium">You're joining</p>
                <p className="font-semibold text-gray-800 text-lg">{invite?.orgName}</p>
                <p className="text-sm text-gray-600">
                  as <span className="font-medium text-teal-700">{invite?.roleName}</span>
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-teal-200">
              <p className="text-xs text-gray-500">
                Account email: <span className="font-medium text-gray-700">{invite?.email}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
              required
              autoFocus
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Password strength indicators */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <PasswordRule passed={passwordRules.minLength} text="At least 8 characters" />
                <PasswordRule passed={passwordRules.hasUppercase} text="One uppercase letter" />
                <PasswordRule passed={passwordRules.hasLowercase} text="One lowercase letter" />
                <PasswordRule passed={passwordRules.hasNumber} text="One number" />
                <PasswordRule passed={passwordRules.hasSpecial} text="One special character" />
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all ${
                confirmPassword.length > 0
                  ? passwordsMatch
                    ? 'border-green-400 focus:border-green-500'
                    : 'border-red-400 focus:border-red-500'
                  : 'border-gray-300 focus:border-teal-500'
              }`}
              required
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          {/* Form error */}
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {formError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !allRulesPassed || !passwordsMatch || displayName.trim().length < 2}
            className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold text-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating your account...
              </span>
            ) : (
              'Accept Invitation & Create Account'
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-600 hover:underline">
              Log in instead
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

/**
 * PasswordRule — small pass/fail indicator for password requirements.
 */
function PasswordRule({ passed, text }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${passed ? 'text-green-600' : 'text-gray-400'}`}>
      {passed ? (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
        </svg>
      )}
      <span>{text}</span>
    </div>
  );
}
