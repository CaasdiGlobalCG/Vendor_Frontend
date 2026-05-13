import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Verification.css";
import config from "../config/env";
import { redirectToClientWithHandoff } from '../utils/handoffToClient';
import { Auth } from "aws-amplify";

function Verification() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || new URLSearchParams(location.search).get("email");
  const role = (location.state?.role || new URLSearchParams(location.search).get("role") || "").toLowerCase();
  const [resendStatus, setResendStatus] = useState(null); // 'sending' | 'sent' | 'error'

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
    try {
      await Auth.resendSignUp(email);
      setResendStatus('sent');
    } catch (err) {
      console.error('Verification: resend failed:', err);
      setResendStatus('error');
    }
  };

  return (
    <div className="verification-page">
      <div className="verification-content">
        <span className="verification-brand">Caasdi Global</span>
        <div className="verification-card">
          <h1>Check Your Email</h1>
          <p>
            Verify your email. We have sent a verification link to{' '}
            <span className="verification-email">{email || "your email"}</span>.
            Please open your inbox and click the link to verify.
          </p>
          <button
            type="button"
            className="verification-button"
            onClick={() => navigate('/login', { replace: true })}
          >
            Go To Login
          </button>
          <button
            type="button"
            className="verification-secondary-action"
            onClick={handleContinue}
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