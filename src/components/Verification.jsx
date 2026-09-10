import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Verification.css";
import config from "../config/env";
import { redirectToClientWithHandoff } from '../utils/handoffToClient';
import { Auth } from "aws-amplify";

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
      <div className="verification-page">
        <div className="verification-content">
          <span className="verification-brand">Caasdi Global</span>
          <div className="verification-card">
            <h1>Confirming your email</h1>
            <p>Please wait while Cognito completes verification.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-page">
      <div className="verification-content">
        <span className="verification-brand">Caasdi Global</span>
        <div className="verification-card">
          <h1>Check Your Email</h1>
          <p>
            Verify your email. Cognito sent a six-digit verification code to{' '}
            <span className="verification-email">{email || "your email"}</span>.
            Enter it below to activate your account.
          </p>
          {verificationStatus === "verified" ? (
            <>
              <div className="verification-success" role="status">
                Your email has been verified successfully.
              </div>
              <button
                type="button"
                className="verification-button"
                onClick={() => navigate('/login', { replace: true })}
              >
                Go To Login
              </button>
            </>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <label className="verification-code-label" htmlFor="verification-code">
                Verification code
              </label>
              <input
                id="verification-code"
                className="verification-code-input"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                disabled={isVerifying}
              />
              {verificationError && (
                <p className="verification-error" role="alert">{verificationError}</p>
              )}
              <button type="submit" className="verification-button" disabled={isVerifying}>
                Verify Email
              </button>
            </form>
          )}
          <button
            type="button"
            className="verification-secondary-action"
            onClick={handleContinue}
            disabled={verificationStatus !== "verified"}
          >
            I've verified my email — Continue
          </button>
          {email && (
            <button
              type="button"
              className="verification-secondary-action"
              onClick={handleResendEmail}
              disabled={resendStatus === 'sending' || resendStatus === 'sent'}
              style={{ marginTop: '0.75rem', opacity: resendStatus === 'sent' ? 0.7 : 1 }}
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
  );
}

export default Verification;