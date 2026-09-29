import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import config from "../config/env";
import { redirectToClientWithHandoff } from '../utils/handoffToClient';
import { Auth } from "aws-amplify";
import { OtpCells } from "./otp-verification/OtpCells";
import { OtpStatusBanner } from "./otp-verification/OtpStatusBanner";

function Verification() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const email = location.state?.email || searchParams.get("email") || searchParams.get("username");
  const role = (location.state?.role || searchParams.get("role") || "").toLowerCase();
  const [verificationCode, setVerificationCode] = useState(searchParams.get("code") || "");
  const [verificationStatus, setVerificationStatus] = useState(
    searchParams.get("verified") === "true" ? "verified" : null
  );
  const [verificationError, setVerificationError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendStatus, setResendStatus] = useState(null); // 'sending' | 'sent' | 'error'

  useEffect(() => {
    const currentSearchParams = new URLSearchParams(location.search);
    const confirmationCode = currentSearchParams.get("confirmation_code");
    const confirmationUsername = currentSearchParams.get("username") || email;

    if (!confirmationCode || !confirmationUsername || verificationStatus === "verified") {
      return;
    }

    const confirmFromLink = async () => {
      setIsVerifying(true);
      setVerificationError("");
      try {
        await Auth.confirmSignUp(confirmationUsername, confirmationCode);
        setVerificationStatus("verified");
      } catch (error) {
        if (error.code === "NotAuthorizedException" || error.code === "AliasExistsException") {
          setVerificationStatus("verified");
        } else {
          setVerificationError(error.message || "This verification link is invalid or expired.");
          setVerificationStatus("error");
        }
      } finally {
        setIsVerifying(false);
      }
    };

    confirmFromLink();
  }, [email, location.search, verificationStatus]);

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    const normalizedCode = verificationCode.trim();
    if (!email || !/^\d{6}$/.test(normalizedCode)) {
      setVerificationError("Enter the six-digit code from the Cognito email.");
      return;
    }

    setIsVerifying(true);
    setVerificationError("");
    try {
      await Auth.confirmSignUp(email, normalizedCode);
      setVerificationStatus("verified");
    } catch (error) {
      setVerificationStatus("error");
      setVerificationError(error.message || "The verification code could not be accepted.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleContinue = () => {
    // If they already chose role=client, send to client app; otherwise guide to role selection
    if (role === "client") {
      const clientBase = config.CLIENT_URL || '';
      (async () => {
        try {
          await redirectToClientWithHandoff();
        } catch (e) {
          console.error('Verification: handoff redirect failed:', e);
          alert('Unable to switch to client right now. Please try again.');
        }
      })();
      return;
    }
    // Default: go to role selection so user can choose Vendor or Client
    if (email) {
      navigate('/role-selection', { state: { email }, replace: true });
    } else {
      navigate('/role-selection', { replace: true });
    }
  };

  const handleResendEmail = async () => {
    if (!email) return;
    setResendStatus('sending');
    setVerificationError("");
    try {
      await Auth.resendSignUp(email);
      setResendStatus('sent');
    } catch (err) {
      console.error('Verification: resend failed:', err);
      setResendStatus('error');
    }
  };

  if (isVerifying) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4 py-12 text-ink">
        <div className="auth-rise w-full max-w-[30rem] text-center" role="status" aria-live="polite">
          <span
            className="mx-auto mb-4 block h-9 w-9 animate-spin rounded-full border-[3px] border-line border-t-ink"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-ink">Confirming your email</p>
          <p className="mt-1 text-xs text-dim">Please wait while Cognito completes verification.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[30rem] text-center">
          <div className="auth-rise">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
              Email verification
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
              Check Your Email
            </h1>
            <p className="mx-auto mt-3 max-w-[38ch] text-sm leading-6 text-dim">
              Verify your email. Cognito sent a six-digit verification code to{' '}
              <span className="font-medium text-ink">{email || "your email"}</span>.
              Enter it below to activate your account.
            </p>
          </div>

          <div className="auth-rise mt-8" style={{ animationDelay: '140ms' }}>
            {verificationStatus === "verified" ? (
              <>
                <OtpStatusBanner tone="success">
                  Your email has been verified successfully.
                </OtpStatusBanner>
                <button
                  type="button"
                  className="brand-press mt-6 h-12 w-full rounded-xl bg-cta text-sm font-semibold text-cta-foreground transition-opacity duration-180 ease-signal hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  onClick={() => navigate('/login', { replace: true })}
                >
                  Go To Login
                </button>
              </>
            ) : (
              <form onSubmit={handleVerifyCode} className="text-left">
                <OtpCells
                  id="verification-code"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isVerifying}
                  label="Verification code"
                />
                {verificationError && (
                  <div className="mt-3">
                    <OtpStatusBanner tone="danger">{verificationError}</OtpStatusBanner>
                  </div>
                )}
                <button
                  type="submit"
                  className="brand-press mt-6 h-12 w-full rounded-xl bg-cta text-sm font-semibold text-cta-foreground transition-opacity duration-180 ease-signal hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  disabled={isVerifying}
                >
                  Verify Email
                </button>
              </form>
            )}
          </div>

          <div className="auth-rise mt-8 space-y-3" style={{ animationDelay: '200ms' }}>
            <button
              type="button"
              className="w-full text-xs font-medium text-dim underline decoration-line underline-offset-4 transition-colors duration-180 ease-signal hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleContinue}
              disabled={verificationStatus !== "verified"}
            >
              I've verified my email — Continue
            </button>
            {email && (
              <button
                type="button"
                className="w-full text-xs font-medium text-dim underline decoration-line underline-offset-4 transition-colors duration-180 ease-signal hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleResendEmail}
                disabled={resendStatus === 'sending' || resendStatus === 'sent'}
              >
                {resendStatus === 'sending' && 'Sending…'}
                {resendStatus === 'sent' && 'Email resent — check your inbox'}
                {resendStatus === 'error' && 'Resend failed — try again'}
                {!resendStatus && 'Resend verification email'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Verification;