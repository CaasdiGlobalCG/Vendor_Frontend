import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Verification.css";
import config from "../config/env";
import { redirectToClientWithHandoff } from '../utils/handoffToClient';

function Verification() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || new URLSearchParams(location.search).get("email");
  const role = (location.state?.role || new URLSearchParams(location.search).get("role") || "").toLowerCase();

  const handleContinue = () => {
    // If they already chose role=client, send to client app; otherwise guide to role selection
    if (role === "client") {
      const clientBase = config.CLIENT_URL || '';
      (async () => {
        try {
          await redirectToClientWithHandoff();
        } catch (e) {
          console.error('Verification: handoff redirect failed:', e);
          window.location.assign(`${clientBase}/`);
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
        </div>
      </div>
    </div>
  );
}

export default Verification;